#!/usr/bin/env node
//
// Static validation for the engineering-framework plugin and its marketplace.
//
// WHY THIS EXISTS ALONGSIDE `claude plugin validate`
// --------------------------------------------------
// The official validator checks the manifests. This checks the things that
// fail *silently* at runtime and that no schema can see:
//
//   - an agent that declares a frontmatter field plugin agents do not support,
//     so the field is ignored and the agent quietly has more access than its
//     author believed;
//   - a cross-reference to a file that was renamed, so a gate reads nothing;
//   - a relative path that traverses outside the plugin root, which works in
//     development and breaks after installation;
//   - stack-specific vocabulary leaking into a stack-agnostic framework, which
//     is the failure this whole project exists to prevent.
//
// No dependencies. Run with `node tests/validate-plugin.mjs [--strict]`.

import { readFileSync, readdirSync, statSync, existsSync, accessSync, constants } from 'node:fs';
import { join, relative, dirname, basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repositoryRoot, 'plugins', 'engineering-framework');
const marketplaceManifestPath = join(repositoryRoot, '.claude-plugin', 'marketplace.json');
const pluginManifestPath = join(pluginRoot, '.claude-plugin', 'plugin.json');

const strict = process.argv.includes('--strict');

const errors = [];
const warnings = [];

const fail = (file, message) => errors.push(`${relative(repositoryRoot, file)}: ${message}`);
const warn = (file, message) => warnings.push(`${relative(repositoryRoot, file)}: ${message}`);

// ---------------------------------------------------------------------------
// Contract constants, each traceable to the Claude Code plugin documentation.
// When Claude Code changes one of these, this is the place to update it, and
// docs/constraints.md is where the citation lives.
// ---------------------------------------------------------------------------

// Plugin-shipped agents support exactly these frontmatter fields. `hooks`,
// `mcpServers` and `permissionMode` are refused for security reasons: an agent
// that declares one is not restricted the way its author believes.
const SUPPORTED_AGENT_FIELDS = new Set([
  'name', 'description', 'model', 'effort', 'maxTurns',
  'tools', 'disallowedTools', 'skills', 'memory', 'background', 'isolation',
]);

const REFUSED_AGENT_FIELDS = new Set(['hooks', 'mcpServers', 'permissionMode']);

const SUPPORTED_SKILL_FIELDS = new Set([
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
  'disable-model-invocation', 'user-invocable', 'allowed-tools',
  'disallowed-tools', 'model', 'effort', 'context', 'background',
  'agent', 'license', 'compatibility', 'metadata',
]);

// The combined description + when_to_use text is truncated at this many
// characters in the skill listing. A skill whose trigger text is cut off is a
// skill Claude cannot reliably decide to use.
const SKILL_LISTING_CHARACTER_CAP = 1536;

const VALID_EFFORT_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

// Tools that can modify a file directly. `Bash` is deliberately absent here and
// handled separately: it can mutate too (`tee`, `sed -i`, a redirect), but a
// read-only agent legitimately needs it for `git diff`. See validateAgents.
const FILE_MUTATING_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'];

// What a read-only agent must explicitly refuse. Kept as its own list rather
// than a slice of the one above, so adding a tool there cannot silently change
// what "read-only" requires depending on where it was inserted.
const REQUIRED_DISALLOWED_TOOLS = ['Edit', 'Write', 'NotebookEdit'];

// Skills whose read-only-ness is a SAFETY property rather than a description,
// with the property each one carries. `disallowed-tools` in the frontmatter is
// what actually enforces it for the turn that invokes the skill; the prose
// inside the file is a description of that enforcement, not the enforcement.
//
// This list exists because the agent check above had no counterpart here.
// Deleting `disallowed-tools` from gate-validate — the single line stopping a
// validation run from editing a test to make it pass — was undetected by the
// entire suite. The skills that must NOT be here are just as deliberate:
// gate-implement, gate-review, work-item and framework-install all write by
// design, and pinning them read-only would break them loudly rather than
// silently, which is why their absence is safe to leave implicit.
const READ_ONLY_SKILLS = {
  'gate-design': 'a design that can edit source has already skipped the approval gate it exists to reach',
  'gate-approve': 'the gate whose whole purpose is to stop before source changes',
  'gate-validate': 'validation that can edit anything can manufacture its own PASS, which destroys the only signal the gate produces',
  'framework-doctor': 'an audit that can change what it is auditing is not an audit',
};

// Marketplace names reserved for official Anthropic use, plus the pattern of
// names that impersonate one. Claude Code re-checks these on every load, so a
// name that becomes reserved stops the marketplace loading for every user.
const RESERVED_MARKETPLACE_NAMES = new Set([
  'claude-code-marketplace', 'claude-code-plugins', 'claude-plugins-official',
  'claude-plugins-community', 'claude-community', 'anthropic-marketplace',
  'anthropic-plugins', 'agent-skills', 'anthropic-agent-skills',
  'knowledge-work-plugins', 'life-sciences', 'claude-for-legal',
  'claude-for-financial-services', 'financial-services-plugins',
  'first-party-plugins', 'healthcare',
]);

// Vocabulary that names a specific product, framework or tool. The framework
// must describe methodology in terms any repository can satisfy; the moment a
// standard or an agent names one of these, it starts measuring code against an
// architecture the repository may not have.
//
// Allowed in docs/, evals/, fixtures/ and reference/ — those describe or
// configure real tooling — and inside a line marked `example:`.
const STACK_TERM_DENYLIST = [
  'nestjs', 'nest.js', 'prisma', 'casl', 'bullmq', 'swagger', 'pino',
  'typeorm', 'sequelize', 'mongoose', 'knex', 'drizzle', 'eloquent', 'artisan',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite',
  'django', 'flask', 'rails', 'laravel', 'symfony', 'spring boot',
  'express.js', 'fastify', 'react', 'vue', 'angular', 'svelte', 'flutter',
  'kubernetes', 'terraform', 'jest', 'vitest', 'pytest', 'rspec', 'junit',
  'phpunit',
  'yarn ', 'npm run', 'pnpm ', 'composer ', 'bundler',
  '.env.test', 'docker compose', 'docker-compose',
];

// Only these directories are scanned. Everything else — docs/, evals/,
// fixtures/, reference/, scripts/, bin/ — names real tools because naming them
// there is correct: a hook has to know what `terraform apply` is called.
const DENYLIST_SCANNED_DIRECTORIES = ['skills', 'agents', 'standards', 'templates'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(path, `is not valid JSON: ${error.message}`);
    return null;
  }
}

function listFilesRecursively(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  const collected = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...listFilesRecursively(entryPath, predicate));
    } else if (predicate(entryPath)) {
      collected.push(entryPath);
    }
  }
  return collected;
}

// A deliberately small YAML reader: frontmatter in this repository is flat
// key/value pairs, and a real YAML dependency would be the only dependency in
// the project. Anything it cannot parse is reported rather than ignored.
function parseFrontmatter(filePath) {
  const content = readFileSync(filePath, 'utf8');
  if (!content.startsWith('---\n')) return null;

  const closingIndex = content.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    fail(filePath, 'frontmatter block is opened but never closed with `---`.');
    return null;
  }

  const raw = content.slice(4, closingIndex);
  const frontmatter = {};

  for (const line of raw.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (/^\s/.test(line)) continue; // nested value; not used by this repository

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      fail(filePath, `frontmatter line is not a key/value pair: ${JSON.stringify(line)}`);
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true') value = true;
    else if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return frontmatter;
}

function toList(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .replace(/^\[|\]$/g, '')
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const isKebabCase = (value) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
const isSemver = (value) => /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(value);

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. Marketplace manifest
// ---------------------------------------------------------------------------

function validateMarketplace() {
  if (!existsSync(marketplaceManifestPath)) {
    fail(marketplaceManifestPath, 'marketplace manifest is missing.');
    return null;
  }

  const manifest = readJson(marketplaceManifestPath);
  if (!manifest) return null;

  if (typeof manifest.name !== 'string' || !isKebabCase(manifest.name)) {
    fail(marketplaceManifestPath, '`name` must be a kebab-case string.');
  } else if (RESERVED_MARKETPLACE_NAMES.has(manifest.name)) {
    fail(marketplaceManifestPath, `\`name\` "${manifest.name}" is reserved for official Anthropic use; the marketplace would stop loading.`);
  } else if (/^(claude|anthropic)[-_]/.test(manifest.name)) {
    warn(marketplaceManifestPath, `\`name\` "${manifest.name}" starts with an official-sounding prefix. Reserved names are re-checked on every load, and a name caught by a future sweep stops the marketplace loading for every user.`);
  }

  if (!manifest.owner || typeof manifest.owner.name !== 'string') {
    fail(marketplaceManifestPath, '`owner.name` is required.');
  }

  if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
    fail(marketplaceManifestPath, '`plugins` must be a non-empty array.');
    return manifest;
  }

  // `metadata.pluginRoot` is documented as a base directory prepended to
  // relative sources. It is NOT honoured by the installer, and believing the
  // documentation over the behaviour is what broke installation:
  //
  //   metadata.pluginRoot = "./plugins"  +  source = "./engineering-framework"
  //     what this validator computed:  <root>/plugins/engineering-framework  ✓ exists
  //     what the installer resolved:   <root>/engineering-framework          ✗ absent
  //
  // Verified against Claude Code v2.1.226 by building a marketplace for each
  // form and running `claude plugin install`:
  //
  //   pluginRoot + "engineering-framework"          -> refused, `source: Invalid input`
  //   pluginRoot + "./plugins/engineering-framework" -> installs; pluginRoot ignored
  //   no pluginRoot + "./plugins/engineering-framework" -> installs
  //
  // So the key is inert in every form: it cannot rescue a bare source, because
  // a relative source must start with `./`, and it changes nothing for one that
  // does. An inert key that reads as functional is the failure shape this
  // project already refuses in permission rules, so it is refused here too.
  if (manifest.metadata?.pluginRoot !== undefined) {
    fail(marketplaceManifestPath, '`metadata.pluginRoot` is not honoured by the plugin installer: a relative `source` is always resolved against the marketplace root, and a source that does not start with "./" is rejected outright. Its presence reads as a working base path and is what makes a short `source` look correct. Remove it and write the full path in each `source`.');
  }

  for (const entry of manifest.plugins) {
    if (typeof entry.name !== 'string' || !isKebabCase(entry.name)) {
      fail(marketplaceManifestPath, `plugin entry name ${JSON.stringify(entry.name)} must be kebab-case.`);
      continue;
    }
    if (typeof entry.source !== 'string') {
      // Object sources are legal but this repository ships relative paths only.
      warn(marketplaceManifestPath, `plugin "${entry.name}" uses a non-relative source; this repository expects an in-repo path.`);
      continue;
    }
    if (!entry.source.startsWith('./')) {
      fail(marketplaceManifestPath, `plugin "${entry.name}" source must start with "./".`);
    }
    if (entry.source.includes('..')) {
      fail(marketplaceManifestPath, `plugin "${entry.name}" source traverses outside the marketplace root.`);
    }

    // Resolved exactly the way the installer resolves it: against the
    // marketplace root — the directory holding `.claude-plugin/` — with no
    // prefix of any kind. Anything else here is this file inventing a rule.
    const marketplaceRoot = dirname(dirname(marketplaceManifestPath));
    const resolvedSource = resolve(marketplaceRoot, entry.source);

    if (!existsSync(resolvedSource) || !statSync(resolvedSource).isDirectory()) {
      fail(marketplaceManifestPath, `plugin "${entry.name}" source "${entry.source}" does not resolve to a directory. The installer resolves it against the marketplace root, giving ${resolvedSource}, which does not exist — installation fails with "Source path does not exist".`);
      continue;
    }

    // A directory is not a plugin. Pointing at one that exists but holds no
    // manifest fails at install with a different message and is just as broken,
    // so existence alone is not the assertion worth making.
    const sourceManifestPath = join(resolvedSource, '.claude-plugin', 'plugin.json');
    if (!existsSync(sourceManifestPath)) {
      fail(marketplaceManifestPath, `plugin "${entry.name}" source "${entry.source}" resolves to ${resolvedSource}, which has no .claude-plugin/plugin.json. The path exists, so a directory check passes; the install still fails.`);
      continue;
    }

    const sourceManifest = readJson(sourceManifestPath);
    if (sourceManifest && sourceManifest.name !== entry.name) {
      fail(marketplaceManifestPath, `plugin entry "${entry.name}" points at a plugin whose manifest is named "${sourceManifest.name}". Users install by the marketplace entry name, so the two disagreeing means the catalogue advertises something the plugin does not call itself.`);
    }
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// 2. Plugin manifest
// ---------------------------------------------------------------------------

function validatePluginManifest(marketplace) {
  if (!existsSync(pluginManifestPath)) {
    fail(pluginManifestPath, 'plugin manifest is missing.');
    return null;
  }

  const manifest = readJson(pluginManifestPath);
  if (!manifest) return null;

  if (typeof manifest.name !== 'string' || !isKebabCase(manifest.name)) {
    fail(pluginManifestPath, '`name` must be a kebab-case string.');
  }

  if (manifest.version === undefined) {
    warn(pluginManifestPath, 'no `version`: users would receive updates on every commit rather than on a release.');
  } else if (!isSemver(manifest.version)) {
    fail(pluginManifestPath, `\`version\` "${manifest.version}" is not semantic versioning.`);
  }

  if (typeof manifest.description !== 'string' || manifest.description.length < 40) {
    warn(pluginManifestPath, '`description` should say what the plugin does; it is shown in the plugin manager.');
  }

  const marketplaceEntry = marketplace?.plugins?.find((entry) => entry.name === manifest.name);
  if (marketplace && !marketplaceEntry) {
    fail(pluginManifestPath, `plugin name "${manifest.name}" has no matching entry in the marketplace manifest.`);
  }
  if (marketplaceEntry?.version && marketplaceEntry.version !== manifest.version) {
    warn(pluginManifestPath, `version ${manifest.version} disagrees with the marketplace entry (${marketplaceEntry.version}); plugin.json wins, so the marketplace value is misleading.`);
  }

  // Only plugin.json belongs inside .claude-plugin/. A component directory
  // placed there is silently not loaded.
  const metadataDirectory = join(pluginRoot, '.claude-plugin');
  for (const entry of readdirSync(metadataDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      fail(join(metadataDirectory, entry.name), 'component directories must live at the plugin root, not inside .claude-plugin/.');
    } else if (entry.name !== 'plugin.json') {
      warn(join(metadataDirectory, entry.name), 'unexpected file in .claude-plugin/.');
    }
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// 3. Agents
// ---------------------------------------------------------------------------

function validateAgents() {
  const agentDirectory = join(pluginRoot, 'agents');
  const agentFiles = listFilesRecursively(agentDirectory, (path) => path.endsWith('.md'));
  const seenNames = new Map();

  if (agentFiles.length === 0) {
    warn(agentDirectory, 'no agents found.');
  }

  for (const filePath of agentFiles) {
    const frontmatter = parseFrontmatter(filePath);
    if (!frontmatter) {
      fail(filePath, 'agent has no frontmatter block.');
      continue;
    }

    for (const key of Object.keys(frontmatter)) {
      if (REFUSED_AGENT_FIELDS.has(key)) {
        fail(filePath, `\`${key}\` is not supported for plugin-shipped agents and is ignored at load time. An agent relying on it has more access than its author believes.`);
      } else if (!SUPPORTED_AGENT_FIELDS.has(key)) {
        warn(filePath, `\`${key}\` is not a documented plugin-agent field and will be ignored.`);
      }
    }

    const expectedName = basename(filePath, '.md');
    if (frontmatter.name !== expectedName) {
      fail(filePath, `frontmatter name "${frontmatter.name}" does not match the file name "${expectedName}".`);
    }
    if (seenNames.has(frontmatter.name)) {
      fail(filePath, `duplicate agent name "${frontmatter.name}" (also in ${relative(repositoryRoot, seenNames.get(frontmatter.name))}).`);
    }
    seenNames.set(frontmatter.name, filePath);

    if (typeof frontmatter.description !== 'string' || frontmatter.description.length < 60) {
      fail(filePath, '`description` must say what the agent does and when to invoke it; Claude selects on this text alone.');
    }

    if (frontmatter.effort !== undefined && !VALID_EFFORT_LEVELS.has(String(frontmatter.effort))) {
      fail(filePath, `\`effort\` must be one of ${[...VALID_EFFORT_LEVELS].join(', ')}.`);
    }

    if (frontmatter.maxTurns !== undefined && !/^\d+$/.test(String(frontmatter.maxTurns))) {
      fail(filePath, '`maxTurns` must be an integer.');
    }

    // Read-only is judged by the effective tool pool, never by a sentence in
    // the prose. Probing for "never edit files" would pass any agent that has
    // neither the sentence nor the restriction — silence reading as compliance.
    //
    // `disallowedTools` is required even when `tools` already omits the
    // mutating ones. An agent declaring `tools: Read, Bash` looks read-only to
    // a tools-only check while being able to write any file through the shell,
    // so the explicit refusal is what actually carries the guarantee.
    const allowedTools = toList(frontmatter.tools);
    const disallowedTools = toList(frontmatter.disallowedTools);
    const missingRefusals = REQUIRED_DISALLOWED_TOOLS.filter((tool) => !disallowedTools.includes(tool));

    if (missingRefusals.length > 0) {
      fail(filePath, `agent does not declare itself read-only: \`disallowedTools\` is missing ${missingRefusals.join(', ')}. A read-only \`tools\` list is not sufficient — an agent with Bash can still write files.`);
    }

    const mutatingAllowed = allowedTools.filter((tool) => FILE_MUTATING_TOOLS.includes(tool));
    if (mutatingAllowed.length > 0) {
      fail(filePath, `agent lists file-mutating tools in \`tools\`: ${mutatingAllowed.join(', ')}. Framework agents find; the main conversation fixes.`);
    }
  }

  return seenNames;
}

// ---------------------------------------------------------------------------
// 4. Skills
// ---------------------------------------------------------------------------

function validateSkills() {
  const skillsDirectory = join(pluginRoot, 'skills');
  const seenNames = new Map();

  if (!existsSync(skillsDirectory)) {
    fail(skillsDirectory, 'no skills directory.');
    return seenNames;
  }

  for (const entry of readdirSync(skillsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      warn(join(skillsDirectory, entry.name), 'loose file in skills/; each skill is a directory containing SKILL.md.');
      continue;
    }

    const skillFile = join(skillsDirectory, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) {
      fail(join(skillsDirectory, entry.name), 'skill directory has no SKILL.md.');
      continue;
    }

    const frontmatter = parseFrontmatter(skillFile);
    if (!frontmatter) {
      fail(skillFile, 'skill has no frontmatter block.');
      continue;
    }

    for (const key of Object.keys(frontmatter)) {
      if (!SUPPORTED_SKILL_FIELDS.has(key)) {
        warn(skillFile, `\`${key}\` is not a documented skill frontmatter field and will be ignored.`);
      }
    }

    if (frontmatter.name !== entry.name) {
      fail(skillFile, `frontmatter name "${frontmatter.name}" does not match the directory "${entry.name}". In a plugin skill the frontmatter name replaces the last command segment, so the two disagreeing produces a command nobody expects.`);
    }
    if (seenNames.has(frontmatter.name)) {
      fail(skillFile, `duplicate skill name "${frontmatter.name}".`);
    }
    seenNames.set(frontmatter.name, skillFile);

    if (typeof frontmatter.description !== 'string' || frontmatter.description.length < 40) {
      fail(skillFile, '`description` is required and must say what the skill does.');
    }

    const listingLength = String(frontmatter.description ?? '').length + String(frontmatter.when_to_use ?? '').length;
    if (listingLength > SKILL_LISTING_CHARACTER_CAP) {
      fail(skillFile, `description + when_to_use is ${listingLength} characters; the skill listing truncates at ${SKILL_LISTING_CHARACTER_CAP}, so the trigger text would be cut off.`);
    }

    if (frontmatter.effort !== undefined && !VALID_EFFORT_LEVELS.has(String(frontmatter.effort))) {
      fail(skillFile, `\`effort\` must be one of ${[...VALID_EFFORT_LEVELS].join(', ')}.`);
    }

    // Every skill must declare which of the two invocation modes it is, and the
    // check is on the DECLARATION, not on the file name.
    //
    // Keying this on a `gate-` / `domain-` prefix would mean a future
    // human-only gate named `release-check` passes with the flag missing and is
    // silently model-invocable — the exact "silence reading as compliance"
    // failure the agent check above exists to avoid, one directory over.
    const humanOnly = frontmatter['disable-model-invocation'] === true;
    const modelOnly = frontmatter['user-invocable'] === false;

    if (humanOnly && modelOnly) {
      fail(skillFile, 'skill is neither user-invocable nor model-invocable, so it can never load.');
    } else if (!humanOnly && !modelOnly) {
      fail(skillFile, 'skill declares no invocation mode. A workflow skill with side effects must set `disable-model-invocation: true` so only a human can start it; a background playbook must set `user-invocable: false`. Leaving both unset means Claude can invoke it and it appears in the menu, which is a decision, not a default.');
    }

    if (modelOnly && (typeof frontmatter.when_to_use !== 'string' || frontmatter.when_to_use.length < 40)) {
      fail(skillFile, 'a model-invoked skill needs `when_to_use` describing the task that should trigger it. Without one, Claude has only the description to match against.');
    }

    // The naming convention is checked separately, and only as a convention:
    // it groups the gates in the `/` menu and protects the bare command form.
    // It is not what enforces the invocation mode.
    if (entry.name.startsWith('domain-') && !modelOnly) {
      fail(skillFile, 'a `domain-` skill is a background playbook and must set `user-invocable: false`.');
    }
    if (entry.name.startsWith('gate-') && !humanOnly) {
      fail(skillFile, 'a `gate-` skill must set `disable-model-invocation: true`; otherwise Claude can start a gate on its own.');
    }

    // Read-only-ness is judged by the declaration that enforces it, for the
    // same reason it is for agents: a sentence in the body saying the gate
    // never edits anything is a description, and a description cannot stop an
    // Edit call.
    if (entry.name in READ_ONLY_SKILLS) {
      const declared = toList(frontmatter['disallowed-tools']);
      const missing = REQUIRED_DISALLOWED_TOOLS.filter((tool) => !declared.includes(tool));
      if (missing.length > 0) {
        fail(skillFile, `\`disallowed-tools\` is missing ${missing.join(', ')}. This skill must be read-only: ${READ_ONLY_SKILLS[entry.name]}. The frontmatter is what enforces that for the turn; prose in the body is not.`);
      }
    }
  }

  for (const requiredName of Object.keys(READ_ONLY_SKILLS)) {
    if (!seenNames.has(requiredName)) {
      fail(skillsDirectory, `\`${requiredName}\` is declared read-only in this validator but no such skill exists. Either the skill was renamed and the guarantee silently stopped being checked, or this list is stale.`);
    }
  }

  return seenNames;
}

// ---------------------------------------------------------------------------
// 5. Hooks and scripts
// ---------------------------------------------------------------------------

function validateHooksAndScripts() {
  const hooksManifestPath = join(pluginRoot, 'hooks', 'hooks.json');
  if (!existsSync(hooksManifestPath)) {
    warn(hooksManifestPath, 'no hooks manifest.');
  } else {
    const manifest = readJson(hooksManifestPath);
    if (manifest) {
      let declaredCommandCount = 0;

      for (const [, event] of Object.entries(manifest.hooks ?? {})) {
        for (const matcherGroup of event) {
          for (const hook of matcherGroup.hooks ?? []) {
            if (hook.type !== 'command') continue;
            declaredCommandCount += 1;
            const command = hook.command ?? '';

            if (!command.includes('${CLAUDE_PLUGIN_ROOT}')) {
              fail(hooksManifestPath, `hook command does not use \${CLAUDE_PLUGIN_ROOT}: ${command}. A relative path resolves against the user's working directory after installation.`);
            }
            if (command.includes('..')) {
              fail(hooksManifestPath, `hook command traverses outside the plugin root: ${command}`);
            }
            if (!/^\\?"\$\{CLAUDE_PLUGIN_ROOT\}\\?"/.test(command)) {
              warn(hooksManifestPath, `hook command should quote \${CLAUDE_PLUGIN_ROOT} so a path containing a space still resolves: ${command}`);
            }

            const scriptRelativePath = command
              .replace(/\\?"/g, '')
              .replace('${CLAUDE_PLUGIN_ROOT}', '')
              .trim()
              .split(/\s+/)[0]
              .replace(/^\//, '');
            const scriptPath = join(pluginRoot, scriptRelativePath);

            if (!existsSync(scriptPath)) {
              fail(hooksManifestPath, `hook script does not exist: ${scriptRelativePath}`);
            } else if (!isExecutable(scriptPath)) {
              fail(scriptPath, 'hook script is not executable; the hook fails at runtime and Claude Code treats that as a non-blocking error, so the guard fails open.');
            }
          }
        }
      }

      if (declaredCommandCount === 0) {
        warn(hooksManifestPath, 'hooks manifest declares no commands.');
      }
    }
  }

  const shellScripts = [
    ...listFilesRecursively(join(pluginRoot, 'scripts'), (path) => path.endsWith('.sh')),
    ...listFilesRecursively(join(pluginRoot, 'bin')),
  ];

  for (const scriptPath of shellScripts) {
    const content = readFileSync(scriptPath, 'utf8');
    const isSourcedLibrary = scriptPath.includes(`${sep}lib${sep}`);

    if (!content.startsWith('#!')) {
      fail(scriptPath, 'shell script has no shebang.');
    }
    if (!isSourcedLibrary && !/^set -[eu]/m.test(content)) {
      fail(scriptPath, 'shell script does not set failure options; a guard that silently continues after an error fails open.');
    }
    if (!isSourcedLibrary && !isExecutable(scriptPath)) {
      fail(scriptPath, 'script is not executable; the hook fails at runtime and Claude Code treats that as a non-blocking error, so the guard fails open.');
    }
    if (content.includes('\r\n')) {
      fail(scriptPath, 'script has CRLF line endings; the shebang is unusable on POSIX systems.');
    }

    // A decision reason can contain text the hook did not author — a script
    // name lifted out of a command, or a `reason` written by the repository's
    // policy file. Building the JSON with printf emits an invalid object the
    // moment that text contains a quote, and Claude Code cannot parse it, so
    // the decision is lost and the guard fails open.
    if (/permissionDecisionReason":"%s/.test(content) || /permissionDecisionReason":"[^"]*%s/.test(content)) {
      const isFallbackForMissingJq = content.includes('ef_require_jq') || content.includes('jq is unavailable');
      if (!isFallbackForMissingJq) {
        fail(scriptPath, 'builds a hook decision with printf interpolation. Encode it with `jq -n --arg` so a reason containing a quote cannot produce invalid JSON, which fails open.');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Cross-references and path portability
// ---------------------------------------------------------------------------

function validateCrossReferences() {
  const markdownFiles = listFilesRecursively(pluginRoot, (path) => path.endsWith('.md'));

  for (const filePath of markdownFiles) {
    const content = readFileSync(filePath, 'utf8');

    for (const match of content.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_\-./]+)/g)) {
      const referenced = match[1].replace(/[.,)]+$/, '');
      const referencedPath = join(pluginRoot, referenced);
      if (!existsSync(referencedPath)) {
        fail(filePath, `references \${CLAUDE_PLUGIN_ROOT}/${referenced}, which does not exist.`);
      }
    }

    // Post-install, a plugin cannot reach outside its own directory: files
    // above the plugin root are simply not copied into the cache.
    for (const match of content.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/[^\s`]*\.\.\//g)) {
      fail(filePath, `path traverses outside the plugin root: ${match[0]}`);
    }

    // A reference to the old .claude/ layout means text was copied from a
    // pre-plugin framework and now points at files the plugin does not own.
    for (const match of content.matchAll(/`\.claude\/(agents|skills|standards|templates|hooks)\//g)) {
      fail(filePath, `references the pre-plugin layout ${match[0]}; those components now live in the plugin and are addressed with \${CLAUDE_PLUGIN_ROOT}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7b. Named-component references resolve
//
// A gate that says "launch `engineering-framework:security`" is naming a real
// component, and if that component is gone the instruction silently does
// nothing — the panel is one lens smaller and the report never says so.
//
// This is not a hypothetical. Deleting agents/security.md outright left every
// suite green while five separate references went dangling, including the
// review lens whose findings are the ones documented as blocking the gate.
// ---------------------------------------------------------------------------

function validateComponentReferences(agentNames, skillNames) {
  const referenceable = new Set([...agentNames.keys(), ...skillNames.keys()]);
  const markdownFiles = listFilesRecursively(pluginRoot, (path) => path.endsWith('.md'));

  for (const filePath of markdownFiles) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const match of line.matchAll(/engineering-framework:([a-z0-9][a-z0-9-]*)/g)) {
        const referenced = match[1];
        if (!referenceable.has(referenced)) {
          fail(filePath, `line ${index + 1} names \`engineering-framework:${referenced}\`, which is neither an agent nor a skill in this plugin. An instruction to launch a component that does not exist fails silently: the lens is simply never run, and nothing in the report says so.`);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 7c. Every repository-policy key is actually consumed
//
// `risk.highRiskPaths` was documented in the schema, shown in the example
// config, and read by nothing at all. A repository could declare its
// authentication and billing paths high-risk, see the key accepted, and get no
// escalation whatsoever.
//
// That is the same failure shape as an inert `Write()` permission rule, which
// this project already calls the worst available: the control reads as present
// while doing nothing. A key in the schema is a promise, so this asserts each
// one is kept somewhere.
// ---------------------------------------------------------------------------

function validateConfigKeysAreConsumed() {
  const schemaPath = join(pluginRoot, 'reference', 'repo-config.schema.json');
  if (!existsSync(schemaPath)) return;

  const schema = readJson(schemaPath);
  if (!schema?.properties) return;

  // Where a key may legitimately be consumed: the guards and their library
  // read policy at runtime; ef-doctor audits it; the skills act on it.
  const consumerFiles = [
    ...listFilesRecursively(join(pluginRoot, 'scripts')),
    ...listFilesRecursively(join(pluginRoot, 'bin')),
    ...listFilesRecursively(join(pluginRoot, 'skills'), (path) => path.endsWith('.md')),
  ];
  const consumerText = consumerFiles.map((path) => readFileSync(path, 'utf8')).join('\n');

  const keys = [];
  for (const [key, definition] of Object.entries(schema.properties)) {
    if (key === '$schema') continue;
    keys.push(key);
    for (const nestedKey of Object.keys(definition.properties ?? {})) {
      keys.push(nestedKey);
    }
  }

  const unconsumed = keys.filter((key) => !consumerText.includes(key));
  if (unconsumed.length > 0) {
    fail(schemaPath, `these keys are offered to repositories but read by nothing in scripts/, bin/ or skills/: ${unconsumed.join(', ')}. A repository that sets one gets silence, and the schema entry reads as a control it can rely on. Consume the key or remove it.`);
  }
}

// ---------------------------------------------------------------------------
// 7d. Normative guarantees are still stated
//
// The framework's safety properties live in prose, and prose has no compiler.
// Mutation analysis showed the consequence plainly: deleting the adversarial
// refutation pass from `gate-review`, the `N/A`-versus-`BLOCKED` distinction
// from `evidence.md`, or the requirement for human security review on Critical
// changes, left the entire suite green.
//
// This does NOT test that an agent obeys any of them — that is behavioural, it
// is what `evals/` is for, and no static check can substitute. What it tests is
// that the guarantee is still WRITTEN DOWN. A rule that has been silently
// deleted cannot be obeyed by anyone, and that failure is mechanical.
//
// Anchors are concepts, not quotations, so the text can be rewritten freely.
// Each entry names the guarantee, so a failure says what was lost rather than
// which regex stopped matching.
// ---------------------------------------------------------------------------

const NORMATIVE_ANCHORS = [
  {
    file: 'standards/evidence.md',
    guarantee: 'a gate this repository does not have is N/A, not BLOCKED',
    patterns: [/\bN\/A\b/, /\bBLOCKED\b/, /do(es)? not (have|exist)|genuinely absent/i],
  },
  {
    file: 'standards/evidence.md',
    guarantee: 'skipped, partial and flaky are never PASS',
    patterns: [/skipped/i, /partial/i, /flaky/i],
  },
  {
    file: 'standards/evidence.md',
    guarantee: 'never modify anything to manufacture a pass',
    patterns: [/manufacture|make a check succeed/i],
  },
  {
    file: 'standards/repository-evidence.md',
    guarantee: 'the five evidence labels',
    patterns: [/\bFACT\b/, /\bINFERENCE\b/, /\bASSUMPTION\b/, /\bABSENT\b/, /\bUNKNOWN\b/],
  },
  {
    file: 'standards/repository-evidence.md',
    guarantee: 'source precedence, with prior expectations ranked last',
    patterns: [/precedence/i, /executable source code/i, /prior expectations/i],
  },
  {
    file: 'standards/security.md',
    guarantee: 'Critical changes require qualified human security review',
    patterns: [/critical/i, /human/i, /security review/i],
  },
  {
    file: 'standards/security.md',
    guarantee: 'record-level access is enforced in the query, not a pre-check',
    patterns: [/record-level/i, /quer(y|ies)/i],
  },
  {
    file: 'standards/untrusted-content.md',
    guarantee: 'repository content describes, it does not instruct',
    patterns: [/instruct/i, /approval/i, /credential/i],
  },
  {
    file: 'skills/gate-review/SKILL.md',
    guarantee: 'adversarial refutation of Critical and High findings',
    patterns: [/refute|refutation/i, /critical/i, /high/i],
  },
  {
    file: 'skills/gate-validate/SKILL.md',
    guarantee: 'exactly one verdict, and never a converted one',
    patterns: [/\bPASS\b/, /\bFAIL\b/, /\bBLOCKED\b/, /never convert|skipped/i],
  },
  {
    file: 'skills/gate-implement/SKILL.md',
    guarantee: 'implementation requires an approval taken in this session',
    patterns: [/approv/i, /this session/i, /stop and say so|treat the design as unapproved/i],
  },
  {
    file: 'skills/gate-design/SKILL.md',
    guarantee: 'the design does not approve itself',
    patterns: [/do not approve it yourself|never infer approval/i],
  },
  {
    file: 'standards/gate-handoff.md',
    guarantee: 'continuing never authorises skipping a gate or a human-owned operation',
    patterns: [/never authorises|skipping a gate/i, /commit/i],
  },
];

function validateNormativeAnchors() {
  for (const { file, guarantee, patterns } of NORMATIVE_ANCHORS) {
    const filePath = join(pluginRoot, file);
    if (!existsSync(filePath)) {
      fail(filePath, `is missing, so the guarantee it carried (${guarantee}) is stated nowhere.`);
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const missing = patterns.filter((pattern) => !pattern.test(content));
    if (missing.length > 0) {
      fail(filePath, `no longer states: ${guarantee}. This file is the single source of that rule, so deleting it deletes the rule everywhere at once — and nothing else in this suite would have noticed. Rewrite freely; if the guarantee genuinely no longer applies, remove its anchor in tests/validate-plugin.mjs deliberately.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Stack-assumption leakage
// ---------------------------------------------------------------------------

function validateNoStackAssumptions() {
  // Matched on word boundaries, not as raw substrings. A plain `includes` made
  // "guardrails" match `rails`, "reactive" match `react` and "npm running"
  // match `npm run` — so the check that protects the framework's core promise
  // would fail the build over an ordinary English word, and the first fix
  // anyone reached for would be to weaken it.
  const denylistPattern = new RegExp(
    `(?<![a-z0-9])(${STACK_TERM_DENYLIST.map((term) => term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-z0-9])`,
    'i',
  );

  for (const directoryName of DENYLIST_SCANNED_DIRECTORIES) {
    const files = listFilesRecursively(join(pluginRoot, directoryName), (path) => path.endsWith('.md'));

    for (const filePath of files) {
      const lines = readFileSync(filePath, 'utf8').split('\n');

      lines.forEach((line, index) => {
        const lower = line.toLowerCase();
        if (lower.includes('example:') || lower.includes('for example,')) return;

        const match = denylistPattern.exec(line);
        if (match) {
          fail(filePath, `line ${index + 1} names a specific technology ("${match[1]}"). The framework must describe methodology in terms any repository can satisfy; naming a stack is how a review starts measuring code against an architecture the repository does not have. If it is genuinely an illustration, put it after "example:" on the same line.`);
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Changelog
// ---------------------------------------------------------------------------

function validateChangelog(manifest) {
  const changelogPath = join(repositoryRoot, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    fail(changelogPath, 'no CHANGELOG.md.');
    return;
  }
  if (!manifest?.version) return;

  const content = readFileSync(changelogPath, 'utf8');
  if (!content.includes(manifest.version)) {
    fail(changelogPath, `no entry for the current version ${manifest.version}. A version bump with no changelog entry is an update nobody can evaluate.`);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const marketplace = validateMarketplace();
const manifest = validatePluginManifest(marketplace);
const agentNames = validateAgents();
const skillNames = validateSkills();
validateHooksAndScripts();
validateCrossReferences();
validateComponentReferences(agentNames, skillNames);
validateConfigKeysAreConsumed();
validateNormativeAnchors();
validateNoStackAssumptions();
validateChangelog(manifest);

for (const name of agentNames.keys()) {
  if (skillNames.has(name)) {
    fail(agentNames.get(name), `name "${name}" is used by both an agent and a skill; the scoped references in prose become ambiguous.`);
  }
}

const componentCount = agentNames.size + skillNames.size;

console.log(`engineering-framework — static validation`);
console.log(`  ${agentNames.size} agents, ${skillNames.size} skills, ${componentCount} named components\n`);

for (const message of warnings) console.log(`WARN  ${message}`);
for (const message of errors) console.log(`FAIL  ${message}`);

if (errors.length === 0 && warnings.length === 0) {
  console.log('PASS — no findings.');
  process.exit(0);
}

console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
