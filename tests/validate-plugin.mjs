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
  'typeorm', 'sequelize', 'mongoose', 'knex', 'drizzle',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite',
  'django', 'flask', 'rails', 'laravel', 'symfony', 'spring boot',
  'express.js', 'fastify', 'react', 'vue', 'angular', 'svelte', 'flutter',
  'kubernetes', 'terraform', 'jest', 'vitest', 'pytest', 'rspec', 'junit',
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

  const pluginRootPrefix = manifest.metadata?.pluginRoot ?? '.';

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

    const resolvedSource = resolve(repositoryRoot, pluginRootPrefix, entry.source);
    if (!existsSync(resolvedSource)) {
      fail(marketplaceManifestPath, `plugin "${entry.name}" source does not resolve to a directory: ${resolvedSource}`);
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
// 6. Reference permissions floor
// ---------------------------------------------------------------------------

function validatePermissionsFloor() {
  const floorPath = join(pluginRoot, 'reference', 'permissions-floor.json');
  if (!existsSync(floorPath)) {
    fail(floorPath, 'reference permissions floor is missing; framework-install has nothing to copy.');
    return;
  }

  const floor = readJson(floorPath);
  if (!floor?.permissions) {
    fail(floorPath, 'no `permissions` object.');
    return;
  }

  const allRules = [
    ...(floor.permissions.deny ?? []),
    ...(floor.permissions.ask ?? []),
    ...(floor.permissions.allow ?? []),
  ];

  // File permissions are only consulted for Read and Edit. Any other tool in a
  // path rule is accepted, never enforced, and warns at startup - the worst
  // failure shape available, because the path reads as protected.
  const inert = allRules.filter((rule) => /^(Write|Glob|MultiEdit|NotebookEdit)\(/.test(rule));
  if (inert.length > 0) {
    fail(floorPath, `inert file rules that are accepted but never enforced: ${inert.join(', ')}. Use Read(...) and Edit(...).`);
  }

  // The PowerShell tool is enabled by default on Windows without Git Bash and
  // Bash(...) rules do not govern it, so an unmirrored floor disappears there.
  for (const tier of ['deny', 'ask']) {
    const rules = floor.permissions[tier] ?? [];
    const bashRules = rules.filter((rule) => rule.startsWith('Bash(')).map((rule) => rule.slice(5));
    const powershellRules = new Set(
      rules.filter((rule) => rule.startsWith('PowerShell(')).map((rule) => rule.slice(11)),
    );
    const unmirrored = bashRules.filter((rule) => !powershellRules.has(rule));
    if (unmirrored.length > 0) {
      fail(floorPath, `${tier} rules not mirrored for PowerShell: ${unmirrored.slice(0, 5).join(', ')}${unmirrored.length > 5 ? ` (+${unmirrored.length - 5} more)` : ''}`);
    }
  }

  for (const required of ['git commit', 'git push', 'gh pr create']) {
    if (!(floor.permissions.deny ?? []).some((rule) => rule.includes(required))) {
      fail(floorPath, `deny floor does not cover "${required}", which the framework's documentation promises.`);
    }
  }

  // This repository installs its own reference floor, which is the only way the
  // framework is exercised the way a consuming repository exercises it. That
  // copy is unavoidable — a settings file has no include mechanism and a plugin
  // cannot ship permission rules — but nothing else would notice it going
  // stale, so assert it here where the floor is already loaded.
  const ownSettingsPath = join(repositoryRoot, '.claude', 'settings.json');
  if (existsSync(ownSettingsPath)) {
    const ownSettings = readJson(ownSettingsPath);
    if (ownSettings) {
      const canonical = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
      if (canonical(ownSettings.permissions) !== canonical(floor.permissions)) {
        fail(ownSettingsPath, 'this repository\'s permissions no longer match the reference floor it dogfoods. Re-copy the floor, or the framework is shipping a floor its own maintainers do not run.');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Cross-references and path portability
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
validatePermissionsFloor();
validateCrossReferences();
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
