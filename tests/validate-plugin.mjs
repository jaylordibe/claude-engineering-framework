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
//
// Checked against the documented field tables on 2026-08-15 (Claude Code
// v2.1.233). A STALE ALLOWLIST IS NOT A HARMLESS OMISSION: a warning fails the
// build under --strict, so a missing entry rejects valid frontmatter with a
// message asserting a platform fact that is false — and the obvious fix a
// contributor reaches for is to add whatever it complained about, which is
// correct for a merely-missing field and wrong for a deliberately refused one.
// That is why the two lists below are separate and each says which authority it
// answers to.
const SUPPORTED_AGENT_FIELDS = new Set([
  'name', 'description', 'model', 'effort', 'maxTurns',
  'tools', 'disallowedTools', 'skills', 'memory', 'background', 'isolation',
  'color', 'initialPrompt',
]);

// Refused by CLAUDE CODE. A plugin agent declaring one of these is not
// restricted the way its author believes, because the field is ignored at load.
const REFUSED_AGENT_FIELDS = new Set(['hooks', 'mcpServers', 'permissionMode']);

const SUPPORTED_SKILL_FIELDS = new Set([
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
  'disable-model-invocation', 'user-invocable', 'allowed-tools',
  'disallowed-tools', 'model', 'effort', 'context', 'background',
  'agent', 'paths', 'shell', 'license', 'compatibility', 'metadata',
]);

// Refused by THIS FRAMEWORK, not by the platform — the distinction matters,
// because the failure message has to say so or the fix looks like "add it to
// the supported list".
//
// Claude Code accepts `hooks` on a skill and keeps the registered hook running
// for the rest of the session. That is exactly what 1.0.0 removed: this plugin
// ships methodology and registers no hook that gates a tool call, and the only
// hook it registers at all is the SessionStart charter. A skill quietly
// bringing one back would reinstate the enforcement layer through the one door
// nothing was watching — the agent check above has covered `hooks` since it was
// written, and its counterpart over here did not exist.
const REFUSED_SKILL_FIELDS = new Map([
  ['hooks', 'this plugin registers no hook that gates a tool call — that is the 1.0.0 line, and a skill-registered hook keeps running for the rest of the session. The single SessionStart charter hook is declared in hooks/hooks.json and is the only one there is.'],
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

// The files that carry the convergence contract to a delegated agent: where
// investigation stops, that synthesis is part of the task, and what a bounded
// report looks like. `execution-efficiency.md` §8 owns the policy;
// `finding-report.md` is the lens-facing form of it and cites the owner.
//
// This check asserts a REFERENCE, and a reference was the problem. Every agent
// satisfied it by opening with "read this file first", which is how the rule
// that tells an agent to converge became the reason it did not: the reads came
// out of the same allowance as the investigation, before any evidence existed
// to say what mattered.
//
// So the reference is now the fallback and not the mechanism. What actually
// carries convergence into a run is the embedded runtime contract, asserted by
// `validateRuntimeContract` below — held, not fetched. This list stays because
// an agent that somehow carries neither has no contract at all, and because a
// named owner is still where an agent goes for a question the compact form
// genuinely leaves open.
const CONVERGENCE_CARRIERS = [
  'standards/execution-efficiency.md',
  'standards/finding-report.md',
  'standards/agent-runtime-contract.md',
];

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
  'write-ticket': 'a ticket that can write into the repository has started implementing the design it exists not to contain',
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
  const lensCeilings = new Map();

  if (agentFiles.length === 0) {
    warn(agentDirectory, 'no agents found.');
  }

  for (const filePath of agentFiles) {
    const frontmatter = parseFrontmatter(filePath);
    if (!frontmatter) {
      fail(filePath, 'agent has no frontmatter block.');
      continue;
    }
    const content = readFileSync(filePath, 'utf8');

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

    // Every agent needs a ceiling, and the ceiling is a RUNAWAY BACKSTOP rather
    // than a budget: an agent that finishes in eight turns costs eight turns
    // whatever the number says. That is why presence is asserted and the value
    // is not. Lowering a ceiling saves nothing on the runs that were already
    // short and truncates the one run that needed the room — the deepest,
    // highest-risk investigation there is. Omitting it entirely is the other
    // failure: an agent with no ceiling has no backstop at all, and nothing
    // else in this suite would notice.
    if (frontmatter.maxTurns === undefined) {
      fail(filePath, 'declares no `maxTurns`, so a runaway investigation has no backstop. Set a ceiling generous enough that the deepest legitimate run fits inside it; see standards/execution-efficiency.md §8 for why it is not a cost lever.');
    } else if (!/^\d+$/.test(String(frontmatter.maxTurns))) {
      fail(filePath, '`maxTurns` must be an integer.');
    }

    // A ceiling with no convergence contract is the defect the ceiling check
    // above cannot see, and it is the one that showed up in real runs: four
    // agents reached their ceilings and returned NOTHING, so everything they
    // had established was lost and the conductor re-established it by hand.
    //
    // `maxTurns` gives an agent no warning (docs/constraints.md C18), so an
    // agent cannot converge by watching the clock — it converges because it was
    // told what "enough evidence" means and that the report is owed. Seven of
    // the eight agents referenced NO efficiency policy at all when this was
    // found, and the eighth was told to read the sections either side of the
    // one that governs it.
    //
    // Structural, not prose-grepping: the frontmatter field is the trigger. An
    // agent that declares a ceiling must name a file that carries the contract
    // for stopping inside it. What those files must SAY is asserted separately,
    // by the normative anchors — so neither check passes on its own if the rule
    // is deleted.
    if (!content.includes(CONTRACT_BEGIN) && !CONVERGENCE_CARRIERS.some((carrier) => content.includes(carrier))) {
      fail(filePath, `declares a \`maxTurns\` ceiling but neither carries the runtime contract nor cites any of ${CONVERGENCE_CARRIERS.join(', ')}, so nothing tells it when it has gathered enough evidence or that a bounded report is owed either way. An agent that reaches its ceiling returns nothing at all, and everything it established is lost. See standards/execution-efficiency.md §8.`);
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

    if (!MAP_SHAPED_AGENTS.has(basename(filePath, '.md'))) {
      lensCeilings.set(filePath, frontmatter.maxTurns);
    }
  }

  // The panel agents share one ceiling, whatever number it is.
  //
  // This deliberately does NOT assert a value — the comment above says why a
  // ceiling is not a cost lever, and that still holds. What it asserts is
  // AGREEMENT, because the failure was neither too high nor too low: a bulk
  // edit raising seven lenses changed six, and `tester` sat a whole tier below
  // its peers through a full validation run. Presence was asserted, the value
  // was not, so nothing looked. The panel runs together on one diff, so a lens
  // that stops earlier than the others is an asymmetry nobody chose; raise or
  // lower them all and this check stays quiet. `context-mapper` is excluded on
  // purpose — it runs alone, at another stage, and has always differed.
  const distinct = new Set(lensCeilings.values());
  if (distinct.size > 1) {
    const spread = [...lensCeilings].map(([p, v]) => `${basename(p, '.md')}=${v}`).sort().join(', ');
    for (const [filePath] of lensCeilings) {
      fail(filePath, `the review lenses do not agree on a turn ceiling: ${spread}. They are launched together on one diff, so a lens that stops before its peers is an asymmetry nobody chose — and the way that happens is a bulk edit that missed a file, which every other check here passes. Set them all to the same number, or move the odd one out of the panel deliberately.`);
    }
  }

  return seenNames;
}

// ---------------------------------------------------------------------------
// 3b. The runtime execution contract
//
// Every reasoning agent used to open with an ordered list of three to six
// framework documents to read BEFORE its first repository read, and
// finding-report.md — first on every one of those lists — sent the reader on to
// a five-hundred-line standard "before your first search". A real run watched
// nine subagents spend their opening turns learning the framework's own report
// format and hit their ceilings holding findings they never wrote up. Every one
// recovered the moment it was told to stop reading format documents and report
// from what it held.
//
// The convergence policy those documents carry was correct. Delivering it as an
// acquisition task was the defect: it spent, before any evidence existed, the
// room convergence exists to protect.
//
// So the semantics an agent needs to execute and report are EMBEDDED in the
// agent, where they cost nothing to reach, and this check is what stops that
// embedding from rotting. Three properties, and none of them is a prose grep:
//
//   1. Byte-identity with the single source. Eight paraphrases of one contract
//      are eight things to drift, and a paraphrase that has quietly fallen
//      behind is exactly what no test can see.
//   2. A hard line ceiling. A runtime contract with no ceiling grows back into
//      a second copy of the standards corpus, and then the acquisition cost is
//      simply paid statically in every agent instead of dynamically in every
//      run. The ceiling is what keeps this a projection rather than a fork.
//   3. The contract must actually state the rules it exists to carry. Byte
//      identity alone is satisfied by eight copies of an empty block.
//
// What this proves is architectural: the semantics are present, single-sourced
// and bounded. It cannot prove an agent obeys them, and no static check can.
// ---------------------------------------------------------------------------

const RUNTIME_CONTRACT_SOURCE = 'standards/agent-runtime-contract.md';
const CONTRACT_BEGIN = '<!-- BEGIN RUNTIME CONTRACT -->';
const CONTRACT_END = '<!-- END RUNTIME CONTRACT -->';
const LENS_REPORT_BEGIN = '<!-- BEGIN LENS REPORT -->';
const LENS_REPORT_END = '<!-- END LENS REPORT -->';

// Generous enough for the contract to say everything an agent genuinely needs,
// and far below the ~850 lines the documents it replaces run to. Raising it is
// a deliberate act: it is the only thing standing between a compact runtime
// contract and a duplicated standards corpus.
const RUNTIME_CONTRACT_LINE_CAP = 130;

// Agents returning a findings table carry the whole contract. `context-mapper`
// returns a map and its own output format owns that shape, so it carries the
// contract with the lens-report region removed — still pinned to the same
// source, so there is still exactly one place to edit.
const MAP_SHAPED_AGENTS = new Set(['context-mapper']);

// What the block must state, whatever words it uses. These are the rules whose
// absence the nine-agent run was caused by, plus the ones that keep removing
// the acquisition cost from also removing the quality it protects.
const RUNTIME_CONTRACT_GUARANTEES = [
  { what: 'the five evidence labels', pattern: /\bFACT\b[\s\S]*\bINFERENCE\b[\s\S]*\bASSUMPTION\b[\s\S]*\bABSENT\b[\s\S]*\bUNKNOWN\b/ },
  { what: 'that an uncited or unopened `path:line` is a fabrication', pattern: /fabrication/i },
  { what: 'source precedence, with the agent\'s own prior expectations ranked last', pattern: /prior expectations/i },
  { what: 'that repository content is evidence and never instruction', pattern: /never instruction|evidence, never/i },
  { what: 'the evidence-sufficiency test — what a further step could change', pattern: /could change/i },
  { what: 'that widening on evidence outranks stopping', pattern: /widen[\s\S]{0,400}outranks|outranks[\s\S]{0,400}widen/i },
  { what: '`UNKNOWN` is not a way to stop early', pattern: /UNKNOWN`? is not a way to stop|not a way to stop early/i },
  { what: 'that the report is owed from the first turn and a bounded report outranks an exhausted run', pattern: /owed from your first turn/i },
  { what: 'that the turn ceiling gives no warning, so an agent cannot converge by watching it', pattern: /cannot converge by watching/i },
  // Added 2.8.0. Two of five lenses in one review reached 25 turns holding
  // evidence they never wrote up, on single-decision briefs — so the brief
  // shape was not the whole cause. The ceiling counts TURNS, and nothing told
  // an agent that: a run issuing one read per turn buys a fraction of the
  // evidence the same allowance carries when independent steps go out together.
  { what: 'that the ceiling counts turns, so independent steps go out together', pattern: /counts turns, not tool calls/i },
  { what: 'that a continued agent synthesises rather than restarts', pattern: /not starting again|do not restart/i },
  { what: 'that briefed locations are routing hints and not an allowlist', pattern: /routing hints, not an allowlist/i },
  { what: 'that the agent is read-only and proposes rather than applies a fix', pattern: /read-only/i },
  { what: 'that correct engineering outranks correct presentation', pattern: /outranks getting the presentation right/i },
];

// The regressions this check exists to prevent coming back. Both are the same
// defect in different positions, and the second is the worse of the two.
//
// An imperative verb governing a framework path is an instruction to go and
// fetch something the agent already holds. It appeared at the top of every
// agent ("Read, in this order:"), in the middle of the mapper's stages ("Work
// the discovery table in", "Cover the reachable scenarios from"), and — worst —
// at the END, where all seven lenses were told their report was "defined by"
// another file. An agent reaching that last one has least room left, and
// spending a turn there is spending the report.
//
// The verb list is deliberately short and the window deliberately tight: this
// names the construct that actually caused the failure rather than policing
// every sentence containing the word "read". A file MENTIONED after the claim
// it supports — "`…/security.md` is the generic floor … open it for a
// judgement the sections below leave open" — does not match, and should not:
// naming a document as available is the behaviour this change is FOR.
const ACQUISITION_DIRECTIVES = [
  {
    pattern: /\b(Read|Work|Follow|Consult|Apply|Cover|See)\b[\s\S]{0,90}?\$\{CLAUDE_PLUGIN_ROOT\}\/(standards|templates)\//,
    why: 'sends the agent to fetch a framework document as a step in its run',
  },
  {
    pattern: /\b(defined|specified|described) (by|in)\b[\s\S]{0,40}?\$\{CLAUDE_PLUGIN_ROOT\}/,
    why: 'describes the agent\'s own output as defined in a file it would have to open, at the point in the run where it has least room left',
  },
  {
    pattern: /^\s*(?:\*\*)?Read,? (?:in this order|the following|these)|^\s*\*\*Read §/m,
    why: 'reinstates an ordered framework reading list before the investigation starts',
  },
];

function extractRuntimeContract() {
  const sourcePath = join(pluginRoot, RUNTIME_CONTRACT_SOURCE);
  if (!existsSync(sourcePath)) {
    fail(sourcePath, 'is the single source of the contract every reasoning agent carries, and it is missing. Without it each agent is back to reading framework documents at runtime to learn how to report.');
    return null;
  }

  const source = readFileSync(sourcePath, 'utf8');
  const begin = source.indexOf(CONTRACT_BEGIN);
  const end = source.indexOf(CONTRACT_END);
  if (begin === -1 || end === -1 || end < begin) {
    fail(sourcePath, `does not contain a ${CONTRACT_BEGIN} … ${CONTRACT_END} block, so there is nothing for the agents to be pinned to.`);
    return null;
  }

  const lens = source.slice(begin, end + CONTRACT_END.length);
  const lineCount = lens.split('\n').length;
  if (lineCount > RUNTIME_CONTRACT_LINE_CAP) {
    fail(sourcePath, `the runtime contract is ${lineCount} lines, over the ${RUNTIME_CONTRACT_LINE_CAP}-line cap. This block is a bounded projection of the standards, not a second copy of them: past this size the acquisition cost it removed from every run is simply paid statically in every agent instead. Move the detail back to the standard that owns it, or raise the cap deliberately and say why here.`);
  }

  for (const { what, pattern } of RUNTIME_CONTRACT_GUARANTEES) {
    if (!pattern.test(lens)) {
      fail(sourcePath, `the runtime contract no longer states ${what}. Every agent carries this block instead of reading the standards, so a rule dropped here is a rule dropped from every delegated run at once — and the agent has nothing else to fall back on.`);
    }
  }

  const lensBegin = lens.indexOf(LENS_REPORT_BEGIN);
  const lensEnd = lens.indexOf(LENS_REPORT_END);
  if (lensBegin === -1 || lensEnd === -1 || lensEnd < lensBegin) {
    fail(sourcePath, `does not contain a ${LENS_REPORT_BEGIN} … ${LENS_REPORT_END} region inside the contract, so the map-shaped agents cannot be given the contract without a findings-table format that does not apply to them.`);
    return null;
  }

  const map = lens.replace(new RegExp(`\\n${LENS_REPORT_BEGIN}[\\s\\S]*?${LENS_REPORT_END}\\n`), '');
  return { lens, map, sourcePath };
}

function validateRuntimeContract(contract, agentNames) {
  if (!contract) return;

  for (const [name, filePath] of agentNames) {
    const content = readFileSync(filePath, 'utf8');
    const expected = MAP_SHAPED_AGENTS.has(name) ? contract.map : contract.lens;

    if (!content.includes(expected)) {
      const shape = MAP_SHAPED_AGENTS.has(name) ? 'contract with the lens-report region removed' : 'full contract';
      fail(filePath, `does not carry the ${shape} from ${RUNTIME_CONTRACT_SOURCE} byte-for-byte. An agent that has to fetch its execution and reporting semantics spends its opening turns on this framework rather than on the repository, and reaches its ceiling holding findings it never wrote up. Re-copy the block; do not paraphrase it, because a paraphrase drifts and nothing here can see that.`);
      continue;
    }

    // Scanned OUTSIDE the pinned block, which legitimately names the owning
    // standards at its end — as available for an open question, not as a step.
    const begin = content.indexOf(CONTRACT_BEGIN);
    const outside = content.slice(0, begin) + content.slice(content.indexOf(CONTRACT_END) + CONTRACT_END.length);

    for (const { pattern, why } of ACQUISITION_DIRECTIVES) {
      const match = pattern.exec(outside);
      if (!match) continue;
      fail(filePath, `${why}: "${match[0].replace(/\s+/g, ' ').trim().slice(0, 80)}…". The agent already carries what it needs, and this directive is the shape that put nine agents into their turn ceilings holding findings they never wrote up. Name a framework document as available for a question the contract genuinely leaves open — never as a step in the run.`);
    }
  }
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
      if (REFUSED_SKILL_FIELDS.has(key)) {
        fail(skillFile, `\`${key}\` is supported by Claude Code but refused by this framework: ${REFUSED_SKILL_FIELDS.get(key)} Adding it to SUPPORTED_SKILL_FIELDS is not the fix.`);
      } else if (!SUPPORTED_SKILL_FIELDS.has(key)) {
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
// 7c. The marketplace declaration matches the marketplace
//
// `ef-install-settings` writes these identifiers into a consuming repository's
// own settings, and it has to ship them: the marketplace NAME is not derivable
// from the plugin payload, because `.claude-plugin/marketplace.json` lives at
// the marketplace repository root and is never copied into a plugin cache.
//
// A shipped copy is a copy that can drift, and this one drifts into the worst
// available failure: a repository that ran the installer gets a marketplace
// entry pointing at a name or a repository that does not serve this plugin.
// Nothing at install time catches it — the entry is syntactically perfect, and
// the plugin simply never resolves. So the copy is pinned to its sources here.
//
// It is also where the deliberate ABSENCE of `autoUpdate` is asserted. Whether
// to accept unreviewed changes to this framework belongs to the person running
// it; a default written by the framework, in its own favour, is exactly the
// risk acceptance the charter calls human-owned.
// ---------------------------------------------------------------------------

function validateMarketplaceDeclaration(marketplace, manifest) {
  const declarationPath = join(pluginRoot, 'reference', 'marketplace-declaration.json');

  if (!existsSync(declarationPath)) {
    fail(declarationPath, 'the marketplace declaration is missing; ef-install-settings cannot configure a repository without it, and framework-install fails at step 2.');
    return;
  }

  const declaration = readJson(declarationPath);
  if (!declaration) return;

  if (declaration.marketplace !== marketplace?.name) {
    fail(declarationPath, `declares marketplace "${declaration.marketplace}" but the catalogue calls itself "${marketplace?.name}". Every repository the installer configures would name a marketplace that does not exist, and the plugin would never resolve.`);
  }

  if (declaration.plugin !== manifest?.name) {
    fail(declarationPath, `declares plugin "${declaration.plugin}" but this plugin is named "${manifest?.name}". The enabledPlugins key written into consuming repositories would enable nothing.`);
  }

  const repo = declaration.entry?.source?.repo;
  const expectedRepo = (manifest?.repository ?? '').replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  if (declaration.entry?.source?.source !== 'github') {
    fail(declarationPath, 'the declared source type is not "github"; the installer writes this verbatim into a consuming repository, and only the shapes Claude Code documents may be written there.');
  }
  if (expectedRepo && repo !== expectedRepo) {
    fail(declarationPath, `declares repo "${repo}" but the plugin manifest's repository is "${expectedRepo}". Installing repositories would be pointed at the wrong marketplace source.`);
  }

  // `autoUpdate: true` is deliberate, and asserted rather than merely allowed,
  // because losing it is silent: a consuming repository records no framework
  // version, so nothing in it would ever ask to be updated, and every
  // repository configured afterwards would quietly run whatever version it
  // first received. See docs/constraints.md C20 for what the key scopes to.
  //
  // The type check is not pedantry. `"true"` is truthy in the settings file and
  // would read as configured while Claude Code ignores it, which is the inert-
  // control failure this project treats as the worst available shape.
  if (declaration.entry?.autoUpdate !== true) {
    fail(declarationPath, `the entry must carry \`"autoUpdate": true\` (found ${JSON.stringify(declaration.entry?.autoUpdate)}). It is written verbatim into every repository the installer configures, and without it a consuming repository — which records no framework version — never receives a corrected standard at all.`);
  }
}

// ---------------------------------------------------------------------------
// 7e. The installer's responsibility boundary, asserted against its source
//
// tests/validate-install-settings.mjs proves what the script DOES by running
// it. This proves what it never even mentions, which is cheaper and catches a
// different mistake: a well-meant edit that starts writing a global path or a
// key that is not ours, in a branch no fixture happens to reach.
//
// Deliberately narrow. It scans for writes and mutations, not for the strings
// appearing at all — the script legitimately READS `$HOME`-adjacent concepts in
// comments and reports on `autoUpdate` without setting it.
// ---------------------------------------------------------------------------

function validateInstallerBoundary() {
  const installerPath = join(pluginRoot, 'bin', 'ef-install-settings');
  if (!existsSync(installerPath)) {
    fail(installerPath, 'the installer is missing; framework-install has nothing to run at its settings step.');
    return;
  }

  const lines = readFileSync(installerPath, 'utf8').split('\n');

  const forbidden = [
    { pattern: /frameworkVersion/, why: 'mentions `frameworkVersion`; consumer repositories carry no framework version' },
    { pattern: /engineering-framework\.json/, why: 'references an obsolete repository policy file' },
    { pattern: /known_marketplaces|installed_plugins/, why: "names Claude Code's internal plugin state, which belongs to the host application" },
    { pattern: /(>|>>|mkdir|rm|mv|cp|touch|tee)\s+["']?(\$HOME|~\/|\$\{HOME)/, why: 'writes into the home directory; the installer is project-scoped' },
  ];

  for (const [index, line] of lines.entries()) {
    if (line.trimStart().startsWith('#')) continue; // comments explain the boundary
    for (const { pattern, why } of forbidden) {
      if (pattern.test(line)) {
        fail(installerPath, `line ${index + 1} ${why}: ${line.trim()}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7d. The removed repository policy file stays removed
//
// `.claude/engineering-framework.json` is not a file any repository has: `frameworkVersion`
// was a version pin the consuming repository had no business carrying,
// `commands` duplicated the CLAUDE.md canonical-commands table, and
// `risk.highRiskPaths` moved into CLAUDE.md.
//
// The risk is not that someone recreates the file deliberately. It is that a
// gate keeps CITING it — costing nothing to write, failing silently forever,
// and sending every agent to read a file that no repository has any more.
// ---------------------------------------------------------------------------

function validateNoLegacyPolicyFileReferences() {
  const shipped = [
    ...listFilesRecursively(join(pluginRoot, 'skills'), (path) => path.endsWith('.md')),
    ...listFilesRecursively(join(pluginRoot, 'agents'), (path) => path.endsWith('.md')),
    ...listFilesRecursively(join(pluginRoot, 'standards'), (path) => path.endsWith('.md')),
    ...listFilesRecursively(join(pluginRoot, 'templates'), (path) => path.endsWith('.md')),
    ...listFilesRecursively(join(pluginRoot, 'reference')),
  ];

  for (const filePath of shipped) {
    const text = readFileSync(filePath, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      if (line.includes('engineering-framework.json') || /\brisk\.highRiskPaths\b/.test(line) || /\bframeworkVersion\b/.test(line)) {
        fail(filePath, `line ${index + 1} references an obsolete repository policy file. Canonical commands and high-risk paths live in the repository's CLAUDE.md now; an instruction to read a file no repository has fails silently, and the gate simply gets no answer.`);
      }
    }
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
  // The ticket writer's whole reason to exist is a default it corrects: asked
  // for a ticket, an agent writes the design it found into the description.
  // The three sentences below are the ones that stop that — no design in the
  // ticket, the human closes the mode, nothing is created in a tracker
  // unasked. Each is a boundary the skill's prose states and nothing else
  // enforces, so each is anchored.
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'a ticket carries no design, the human finalises it, and no issue is created unasked',
    patterns: [/never write a design/i, /never declare the ticket final/i, /never create, edit or transition an issue/i, /ideas from discussion/i],
  },
  // The hardening of the ticket writer, anchored where each rule would
  // otherwise be enforced only by a grader. An actor is grounded by the code
  // or by the human and is never invented; readiness is judged on whether the
  // outcome is bounded, never on an estimate — the estimate is the design
  // decision the skill exists not to make; a criterion is split by what can be
  // verified apart, not by the word "and"; every turn re-emits the substantive
  // ticket and omits the sections with nothing in them. Each of these has a
  // plausible-looking opposite that reads as thoroughness, which is why the
  // sentence stating the rule is what is pinned.
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'an actor is evidenced by the repository or supplied by the human, never invented',
    patterns: [/human-supplied/i, /evidenced/i, /invented/i, /\bUNKNOWN\b/],
  },
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'readiness is a scope judgement, and the writer never estimates duration or difficulty',
    patterns: [/bounded enough to plan/i, /never estimates/i, /independently deliverable/i],
  },
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'a criterion is split by independently verifiable outcomes, and "and" is a signal rather than a verdict',
    patterns: [/independently verifiable/i, /signal\s+to look, not a verdict/i],
  },
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'every turn re-emits the substantive ticket and omits the sections with nothing in them',
    patterns: [/re-emit the whole substantive ticket/i, /omitted section is omitted/i, /survives compaction/i],
  },
  {
    file: 'skills/write-ticket/SKILL.md',
    guarantee: 'a negative criterion is written where a boundary is real, not manufactured for every positive',
    patterns: [/not invented so that every positive/i, /boundary/i],
  },
  {
    file: 'templates/ticket.md',
    guarantee: 'the template is structure and not a form: unearned sections are left out, and the story names how its actor is grounded',
    patterns: [/leave the[\s>]+rest out/i, /human-supplied/i, /independently verifiable outcome/i, /not a quota/i],
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
  // The two halves of the over-engineering defence, anchored separately because
  // they fail separately. Without the grade, a ticket that asks for a table the
  // outcome does not need is graded "Sound" — it would work — and the one
  // mechanism built to push back on a prescribed method is blind to the most
  // common way a method is wrong. Without the acceptance-criteria split, a
  // checklist keeps arriving as a specification no matter how the grades read.
  {
    file: 'standards/repository-evidence.md',
    guarantee: 'Over-specified is a method grade, and acceptance criteria are split into outcome and mechanism',
    patterns: [/Over-specified/i, /acceptance criteria/i, /mechanism/i],
  },
  // The obligation, as opposed to the preference that preceded it. "Prefer the
  // smallest coherent end state" sat here for several releases and nothing ever
  // failed on it, because a preference produces no artefact: the option list
  // simply never contained the small option, and no reader could see that it
  // had not. What is anchored is that the comparison happens and that a
  // prediction cannot win it.
  {
    file: 'skills/gate-design/SKILL.md',
    guarantee: 'the smallest sufficient approach is always among the compared options, and only a sourced requirement may defeat it',
    patterns: [/smallest thing that fully\s+delivers/i, /not requirements|are not\s+requirements/i, /scale|clean|extensible/i],
  },
  // The framework's own fan-out is a scope source if nothing says otherwise.
  // Several lenses over one small request name, between them, every gap the
  // repository has; each is real, each is cited, and the union of them arrives
  // at the design stage looking exactly like requirements. Without this rule the
  // machinery that exists to catch under-building becomes the reason for
  // over-building, and every artefact downstream reads as diligence.
  {
    file: 'standards/repository-evidence.md',
    guarantee: 'a map and a lens state constraints and risks, and do not add scope',
    patterns: [/does not add scope|not a list of work/i, /non-goal/i, /reason to build more|reason to design carefully/i],
  },
  // A rejected design is not a starting point. Editing one down keeps the shape
  // that drew the objection, so the objection returns — which is what a run of
  // three shrinking plans is, and it reads from inside like progress.
  {
    file: 'skills/gate-approve/SKILL.md',
    guarantee: 'a design rejected as too large is re-derived from the goal, never subtracted from',
    patterns: [/re-derived, not reduced|re-derive/i, /subtract/i, /shrinking plans|same objection/i],
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
  // Deliberately not "an approval taken in this session". The host
  // restores a resumed session's entire conversation, so "this session" named
  // two different things at once and the three files that used it disagreed:
  // gate-approve said an approval never carries to a later session, work-item
  // said a resumed run continues from its trace. The guarantee that actually
  // matters was never the process boundary — it is that an approval exists
  // only where a human's own words record one.
  {
    file: 'skills/gate-implement/SKILL.md',
    guarantee: 'implementation requires an approval evidenced by a trace carrying the human\'s own words, never by a summary asserting one',
    patterns: [/approv/i, /verbatim/i, /stop and say so|treat the design as unapproved/i, /not evidence/i],
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
  // The efficiency policy is the newest place a quality guarantee can be
  // deleted by someone acting in good faith, because every line of it looks
  // like a cost control. These four are the ones that are not.
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'the quality floor outranks every efficiency saving',
    patterns: [/quality floor/i, /never reduce|may never/i, /\bUNKNOWN\b/, /\bBLOCKED\b/],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'depth is banded, Standard is the default, and Targeted omits no category',
    patterns: [/targeted/i, /standard/i, /deep/i, /default/i, /floor/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'evidence widens the band and raises the tier, and never lowers either',
    patterns: [/widen/i, /re-?classif/i, /blast radius/i, /does not exist|may not lower|never lower/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'exhausting a budget is never a verdict, and escalation is what replaces it',
    patterns: [/escalat/i, /budget/i, /\bPASS\b/, /\bFAIL\b/],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a request to spend less cannot lower the floor',
    patterns: [/cheap|save tokens|spend less/i, /risk acceptance/i],
  },
  {
    file: 'standards/evidence.md',
    guarantee: 'evidence is invalidated by a later edit to the code it covers',
    patterns: [/age/i, /invalidat/i, /false `?PASS/i],
  },
  {
    file: 'agents/context-mapper.md',
    guarantee: 'the map declares its depth band, any widening, and whether the floor was established',
    patterns: [/depth band/i, /widen/i, /incomplete/i],
  },
  // 2.6.0 — convergence. Every line below is one a later edit removes as
  // hedging, and each is load-bearing for the same observed failure: agents
  // that spent an entire turn ceiling investigating and returned no report at
  // all, so the evidence they had gathered was lost and the delegating stage
  // re-established it by hand.
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a turn ceiling is a backstop, gives no warning, and reaching one without a report is a failed execution',
    patterns: [/backstop/i, /not a warning|no turn (left )?in which/i, /failed execution/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'the sufficiency test decides whether another investigation step is taken, and widening still outranks it',
    // Each pattern is one half of the rule. The last is deliberately not
    // optional: a sufficiency test without the widening carve-out is a licence
    // to stop early on exactly the change that must not, which is the floor
    // moving under an efficiency edit.
    patterns: [/sufficiency test/i, /could change/i, /confirmatory|duplicative/i, /stop expanding/i, /outranks? it|§4'?s widening/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'synthesis is part of the task, and a bounded report with explicit UNKNOWNs outranks an exhausted investigation that returned nothing',
    patterns: [/synthesis/i, /bounded report/i, /\bUNKNOWN\b/, /outranks/i, /never a way to keep a report short|under-?investigated/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a continued agent synthesises what it holds rather than restarting, and the delegating stage continues it rather than relaunching',
    patterns: [/does not restart/i, /continu/i, /same ground|fresh (one|launch)/i],
  },
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a brief names the decision and hands over locations, never conclusions, and the specialist stays free to contradict them',
    patterns: [/brief/i, /pointer/i, /never conclusions|locations, never/i, /contradict/i, /never told what to find|independence/i],
  },
  // 2.8.0 — the brief assigns ONE decision. The release above fixed how an
  // agent learns to work; this one fixes what it is asked to do. A real run
  // lost three subagents to briefs that enumerated six things for one lens:
  // §8.1 decides convergence against *the decision it was given*, so a launch
  // given six is a launch given none, and the run ends at the ceiling holding
  // evidence nobody receives. The rule reads like tidiness and is not.
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a brief assigns one decision, everything else in it is context rather than a further task, and a lens owning two decisions is two launches rather than a longer brief',
    patterns: [/only the first/i, /assignment/i, /allowed to stop\s+on/i, /two launches|never a longer brief/i],
  },
  // The three delegating sites. Each previously cited §8.5 *and* restated its
  // contents, with three different lists — and the citation check below passed
  // the whole time, because it only asks whether the owner's path appears in
  // the file. These anchor each site to the sentence that defers instead, so
  // the drift that shipped for two releases cannot silently return.
  {
    file: 'skills/gate-review/SKILL.md',
    guarantee: 'the review launch site defers to §8.5 for what a brief carries and gives each lens one decision rather than the panel\'s',
    patterns: [/does not restate it/i, /one decision/i],
  },
  {
    file: 'skills/gate-design/SKILL.md',
    guarantee: 'the design launch site defers to §8.5 for what a brief carries and briefs one decision per launch',
    patterns: [/owns what a brief carries/i, /one\s+decision per launch/i],
  },
  {
    file: 'skills/work-item/SKILL.md',
    guarantee: 'the map launch site defers to §8.5 for what a brief carries and gives each launch one decision rather than the stage\'s list of questions',
    patterns: [/does not restate it/i, /one decision rather than the\s+list/i],
  },
  // The owner half of the turn-economy rule. Pinning only the projection in
  // agent-runtime-contract.md would leave eight verbatim copies asserting a
  // rule with no source — and a contributor re-copying the contract with
  // nothing to re-copy from. This is the green-by-construction shape the
  // release above exists to close, so it does not get to reappear here.
  {
    file: 'standards/execution-efficiency.md',
    guarantee: "a delegated agent's ceiling counts turns, so independent steps go out together, and that is not the budget-watching §8 rules out",
    patterns: [/counts\s+turns, not tool calls/i, /batch what does not depend/i, /not the budget-watching/i],
  },
  {
    file: 'standards/finding-report.md',
    guarantee: 'a coverage line separates a lens that examined and found nothing from one that never looked, and makes verification targeted rather than repeated',
    patterns: [/coverage line/i, /not reached/i, /\bUNKNOWN\b/, /never looked|did not look/i, /targeted/i],
  },
  {
    file: 'skills/gate-review/SKILL.md',
    guarantee: 'a lens is selected by what the diff touches, and uncertainty on High or Critical means launch it',
    patterns: [/uncertain/i, /high or critical/i, /launch it/i],
  },
  {
    file: 'skills/gate-design/SKILL.md',
    guarantee: 'the risk tier can rise on later evidence and is never lowered afterwards',
    patterns: [/tier can still rise|re-?classif/i, /one direction/i],
  },
  {
    file: 'skills/work-item/SKILL.md',
    guarantee: 'an incomplete map stops the pipeline rather than starting the design',
    patterns: [/incomplete/i, /stop/i, /re-?launch|resolve it/i],
  },
  // The ledger and the run state file are one defect's two halves, and both
  // are the kind of line a later edit removes as ceremony. C21 is why they
  // exist: the host stopped providing the task tools this pipeline used to
  // keep its position in, and it stopped silently.
  {
    file: 'standards/gate-handoff.md',
    guarantee: 'the conductor emits a full ledger at every stage transition, written in the message rather than through a host tool',
    patterns: [/ledger/i, /stage transition/i, /task-list tool/i, /depends on nothing|no host feature/i],
  },
  {
    file: 'skills/work-item/SKILL.md',
    guarantee: 'durable state survives compaction without depending on a host task-list tool',
    patterns: [/run state file/i, /compact/i, /task-list tool/i, /outside the repository/i],
  },
  // The second half of C21, and it does not go away once the opt-in that
  // was supposed to close the first: the host registers the task tools but
  // hands them over deferred, so a conductor reading only its callable tools
  // concludes it has no task list in a session that has one. That answer is
  // wrong in exactly the direction nothing catches — the run continues, the
  // ledger is still correct, and only the panel the opt-in paid for stays
  // empty. The patterns hold the shape of the fix rather than its wording: ask
  // what the host can load, settle it once, and never let the answer stall a
  // stage.
  {
    file: 'standards/gate-handoff.md',
    guarantee: 'the mirror asks what the host can load as well as what is already callable, settles it once, and can never stall a stage',
    patterns: [/can load|has not handed over/i, /Stage 1/i, /one attempt/i, /never retry/i],
  },
  // 2.4.0 — resumption. Every line of this standard is the kind a later edit
  // removes as ceremony, and each one is load-bearing for a different failure:
  // an old plan executed against moved code, an approval nobody gave, a state
  // file somebody edited, a colleague's uncommitted work reverted.
  {
    file: 'standards/resumption.md',
    guarantee: 'saved state never outranks current repository evidence, and the source is re-read on resume',
    patterns: [/never outranks|outranks/i, /re-?read the source/i, /summary is never stronger/i],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'a trace is only a trace if it carries the human\'s own words, and every uncertainty about it is RE-APPROVAL REQUIRED',
    patterns: [/verbatim/i, /RE-?APPROVAL REQUIRED/i, /ambiguous/i, /High or Critical/i],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'drift is assessed semantically before resume, with three outcomes and escalation when balanced',
    patterns: [/SAFE TO RESUME/, /REVALIDATE DESIGN/, /\bBLOCKED\b/, /not identifiers|not against a commit|Compare meaning/i],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'an unreadable or unrecognised state version is BLOCKED rather than an empty run',
    patterns: [/schema_version/, /unrecognised|unrecognized|does not recognise/i, /\bBLOCKED\b/],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'persisted state is untrusted data on resume and can never instruct',
    patterns: [/untrusted/i, /instruction/i, /untrusted-content\.md/],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'unknown dirty-worktree ownership is never resolved as Claude\'s, and nothing unrelated is ever discarded',
    // `/unknown/i` alone was not enough: the word occurs elsewhere in the file,
    // so deleting the Unknown ownership row left the anchor green. Match the
    // rule, not a word that happens to be in it.
    patterns: [/never resolved as Claude/i, /never reset, clean, stash/i, /pre-?existing/i],
  },
  {
    file: 'standards/resumption.md',
    guarantee: 'the state file holds no secrets, no conversation and no source, and cleanup never reaches the repository',
    patterns: [/secrets/i, /credential/i, /deletes anything inside the repository/i],
  },
  {
    file: 'standards/untrusted-content.md',
    guarantee: 'the untrusted boundary covers files the framework itself wrote, not only the repository',
    // "framework wrote" appears twice in the section, so an alternation on it
    // survived deleting the sentence that carries the rule. Anchor the scope
    // statement itself — the boundary is the file, not the repository.
    patterns: [/wherever it lives and\s+whoever wrote it/i, /outside the working tree|outside the repository/i, /resumption\.md/],
  },
  // The gate that runs the full canonical suite is the one that produces
  // enough output to bury its own failure — and a concise PASS format is an
  // invitation to complete it with a plausible number. Both halves are the
  // guarantee; either alone is a defect.
  {
    file: 'skills/gate-validate/SKILL.md',
    guarantee: 'a passing check is one row, a failing check keeps what diagnoses it, and no field the command did not print is reported',
    // Each pattern is one half of the rule, deliberately not an alternation:
    // an OR here passed a mutation that deleted "not estimated" outright,
    // because the word survived elsewhere in the paragraph.
    patterns: [/one row/i, /diagnos/i, /\bomitted\b/i, /not estimated/i, /false `?PASS/i],
  },
  {
    file: 'templates/validation-report.md',
    guarantee: 'a count or duration the runner did not print is left out rather than estimated',
    patterns: [/only if the runner printed/i, /never\s+estimated/i, /false `?PASS/i],
  },
  // Root-cause-first diagnosis. A fix designed from a plausible cause is the
  // one defect no later stage can catch: it reads as correct, its tests pass,
  // and the review sees a tidy diff — so the proof has to exist before the
  // design does. Three anchors, because the rule fails in three separate ways:
  // the principle deleted; the scaling deleted, so a typo gets a forensic
  // investigation or a race gets a symptom fix; the rejoin deleted, so a
  // "diagnosis" becomes a route around review and validation.
  {
    file: 'skills/domain-debugging/SKILL.md',
    guarantee: 'a plausible fix is not a substitute for a demonstrated root cause, and the cause is labelled before a fix is designed',
    patterns: [/plausible fix is not a substitute/i, /root cause/i, /reproduc/i, /hypothes/i, /\bFACT\b/, /\bUNKNOWN\b/, /mitigation/i],
  },
  {
    file: 'skills/domain-debugging/SKILL.md',
    guarantee: 'proof scales with the shape of the defect — a deterministic on-line cause takes the Direct exit, and an intermittent, concurrent, data or security defect owes a demonstrated mechanism',
    // Both ends are load-bearing, for the reason the efficiency standard gives:
    // without the Direct row a failing typo test gets mapped and planned, and
    // without the demonstrated-mechanism row a race gets the fix that made the
    // symptom stop.
    patterns: [/\bDirect\b/, /deterministic/i, /intermittent/i, /concurren/i, /security/i, /demonstrated mechanism/i, /symptom stop/i],
  },
  {
    file: 'skills/domain-debugging/SKILL.md',
    guarantee: 'a diagnosis rejoins the normal pipeline — the fix is reviewed and validated at the tier of the code it touches, and adds no stage',
    patterns: [/change like any other/i, /reviewed at that tier/i, /validated/i, /canonical commands/i, /changes nothing about\s+what happens to the fix afterwards/i],
  },
  {
    file: 'skills/work-item/SKILL.md',
    guarantee: 'a defect is diagnosed before its fix is designed, and a cause left UNKNOWN is read back at approval rather than designed over',
    patterns: [/domain-debugging/, /root cause/i, /\bUNKNOWN\b[\s\S]{0,200}approval/i, /mitigation/i],
  },
  {
    file: 'skills/gate-design/SKILL.md',
    guarantee: 'the standalone design gate states a defect\'s root cause and its label, and calls a fix for an UNKNOWN cause a mitigation',
    patterns: [/domain-debugging/, /root cause/i, /mitigation/i],
  },
  // Minimum sufficient context. §8.5 said what a brief carries; nothing said
  // what it never carries, so a lens launched by inheriting the conversation —
  // the context that just wrote the diff — violated nothing. Each pattern is
  // one exclusion or the widening carve-out; the carve-out is what keeps a
  // narrow brief from becoming a narrow investigation.
  {
    file: 'standards/execution-efficiency.md',
    guarantee: 'a brief carries minimum sufficient context — a fresh context per launch, never the conversation, the plan document or another agent\'s report — and widening stays the agent\'s',
    patterns: [/minimum sufficient context/i, /not the minimum possible/i, /fresh\s+context/i, /another agent'?s report/i, /refutation/i, /widening is the agent'?s/i],
  },
  // Review semantics. Both questions were always asked — the whole-change
  // checks and the lens panel — and nothing named them, so a partial
  // implementation that was correct in every line it did write passed. And a
  // finding was verified by procedure without anyone saying a finding is a
  // claim, so a "possible race" could be rewritten around without a trigger
  // ever being confirmed. The "no lens is launched to duplicate" pattern is
  // deliberate: the split is of questions, never a second reviewer per ticket.
  {
    file: 'skills/gate-review/SKILL.md',
    guarantee: 'a review answers two questions — the approved thing was built, and it was built correctly — the first owned by the conductor, with an independent second answer only where Critical launches architect',
    patterns: [/build the approved thing/i, /correctly and safely/i, /partial/i, /no lens is launched to duplicate/i, /architect/i],
  },
  {
    file: 'skills/gate-review/SKILL.md',
    guarantee: 'a finding is a claim — each candidate is confirmed, rejected or unresolved, remediation starts only from a confirmed one, and an unresolved one is never fixed to be safe',
    patterns: [/claim, not a fact/i, /confirmed/i, /rejected/i, /unresolved/i, /from nothing else/i, /fixed to be safe/i],
  },
  {
    file: 'templates/review-handoff.md',
    guarantee: 'the report separates the compliance checks the conductor owns from the lens findings, and records rejected and unresolved candidates with their evidence',
    patterns: [/approved thing/i, /in full/i, /verbatim/i, /unresolved/i, /what would settle/i],
  },
];

// Host tools this framework may USE but must never REQUIRE. Claude Code stopped
// providing the task tools by default on current models in v2.1.233
// (docs/constraints.md C21), which broke `work-item` in two ways at once: the
// developer lost every sign of where the run was, and the approval trace — a
// `TaskUpdate` call — silently stopped being written, so a compacted session
// could no longer tell an approved design from a presented one.
//
// Naming these tools is fine. Naming one in a file that does not also state the
// mechanism used when it is absent is the regression, and it is invisible
// until someone runs the pipeline on a model that has no task list.
//
// WIDENED IN 2.4.0, because the tool-name form was not how it came back.
// `gate-implement` told the implementation stage to read the approval trace
// from "the implementation task" — a host task-list record, in prose, naming no
// tool. On a model with no task list that record never exists, so a correctly
// approved run reached Stage 3, found nothing, and applied its own rule that a
// design with no trace is unapproved. It failed safe and it stopped work that
// had been approved, and the check written for exactly this missed it because
// it was looking for an identifier.
//
// So the pattern now covers the prose spelling too: a task the pipeline is told
// to read or write is a dependency on a host feature whether or not the tool
// that backs it is named.
const OPTIONAL_HOST_TOOLS = /\bTodoWrite\b|\bTask(Create|Update|List|Get)\b|\b(the|a|its)\s+(implementation|in-progress|Stage\s*\d+|current)\s+task\b|\bonto the\s+\S+\s+task\b/i;

function validateNoRequiredHostTaskTool() {
  const ledgerOwner = 'standards/gate-handoff.md';

  for (const directoryName of DENYLIST_SCANNED_DIRECTORIES) {
    const directory = join(pluginRoot, directoryName);
    if (!existsSync(directory)) continue;

    for (const filePath of listFilesRecursively(directory, (path) => path.endsWith('.md'))) {
      const content = readFileSync(filePath, 'utf8');
      if (!OPTIONAL_HOST_TOOLS.test(content)) continue;
      // The escape must state the ABSENCE branch specifically. Accepting
      // `when this session ...` / `if the host ...` is not enough, because a
      // purely positive conditional satisfies it: "when this session has a task
      // list, write the record there" passed while saying nothing at all about
      // the session that has none — which is the majority case and the whole
      // reason this check exists. Only phrases that name the absence count.
      if (content.includes(ledgerOwner) && /is absent|has none|there is none|does not have one|when it does not|without one/i.test(content)) continue;

      fail(filePath, `names a host task-list tool without stating what happens when the session does not have one. Those tools are omitted by default on current models, so a step written as though one exists is a step that silently does not run. Make the dependency conditional and cite \${CLAUDE_PLUGIN_ROOT}/${ledgerOwner}, which owns the mechanism that always works.`);
    }
  }
}

// Where a policy is defined, and the vocabulary that gives it away. A second
// file may USE these words freely — it just has to cite the file that owns
// them, so a reader who follows the citation reaches the current rule rather
// than a paraphrase of an older one.
//
// This is the mechanical form of the repository's oldest convention: a contract
// is stated once. The efficiency policy is the case that most needs it, because
// it touches every gate and every agent, and a per-file copy of "how deep to
// investigate" would drift into per-file policy within two releases.
const SINGLE_SOURCE_POLICIES = [
  {
    owner: 'standards/execution-efficiency.md',
    vocabulary: /\bdepth band\b|\bTargeted\b.*\bStandard\b.*\bDeep\b/i,
    what: 'investigation depth banding',
  },
  {
    owner: 'standards/gate-handoff.md',
    vocabulary: /\bpipeline ledger\b/i,
    what: 'the conductor pipeline ledger',
  },
  // Convergence touches every agent and every delegating gate, which is exactly
  // the shape that turns into per-file policy. A second unlinked statement of
  // "when have I gathered enough" is the one that drifts loosest, and the file
  // that drifts loosest is the one a long investigation happens to be reading.
  {
    owner: 'standards/execution-efficiency.md',
    // What this check does NOT do, stated because the gap is invisible from
    // the passing run: the exemption is FILE-level — `content.includes(owner)`.
    // A file that already cites the owner may append a restatement of it and
    // still pass. Verified: appending a turn-economy restatement to
    // gate-review/SKILL.md passes; appending the same line to domain-auth,
    // which cites nothing, fails. So this binds a NEW delegating site and any
    // file that cites nothing; an existing launch site is bound instead by its
    // NORMATIVE_ANCHORS deference sentence. Tightening the exemption to a
    // proximity rule was considered and rejected: the launch sites legitimately
    // use this vocabulary a dozen lines from their citation, and a check that
    // fails legitimate prose is the false-denial failure CLAUDE.md describes.
    // The brief-list vocabulary is here because the binding used to rest
    // entirely on "hand over locations": a launch site could restate what a
    // brief carries, cite nothing, and pass. A reworded sentence would have
    // removed the citation requirement along with it.
    vocabulary: /\bsufficiency test\b|\bbounded report\b|\bhand over locations\b|\bthe decision (it|the lens) owns\b|\bwhat a brief carries\b|\bwhat a brief never carries\b|\bminimum sufficient context\b|\bcounts turns, not tool calls\b|\bindependent steps go out\b/i,
    what: 'the convergence and evidence-sufficiency contract',
  },
  // The diagnosis order and the proof a fix owes are one policy, and it is
  // reached from three places — the conductor, the standalone design gate and
  // the plan template. A per-file copy of "how much proof does this defect
  // need" would drift into three answers, and the one that drifts loosest is
  // the one a bug fix under time pressure happens to load.
  {
    owner: 'skills/domain-debugging/SKILL.md',
    vocabulary: /\broot cause\b|\bplausible fix\b/i,
    what: 'root-cause-first diagnosis',
  },
  // Drift assessment is a three-outcome decision that three
  // separate files reach — work-item on resume, gate-implement before its first
  // edit, gate-approve before a stale read-back. A per-file copy of "when is it
  // safe to continue" would be three different answers within two releases, and
  // the one that drifts loosest is the one a resumed run happens to load.
  {
    owner: 'standards/resumption.md',
    vocabulary: /\bSAFE TO RESUME\b|\bREVALIDATE DESIGN\b|\bRE-APPROVAL REQUIRED\b|\bdrift assessment\b/i,
    what: 'the resume drift assessment and its outcomes',
  },
];

function validateSingleSourcePolicies() {
  const markdownFiles = listFilesRecursively(pluginRoot, (path) => path.endsWith('.md'));

  for (const { owner, vocabulary, what } of SINGLE_SOURCE_POLICIES) {
    const ownerPath = join(pluginRoot, owner);
    if (!existsSync(ownerPath)) {
      fail(ownerPath, `owns the ${what} policy but does not exist.`);
      continue;
    }

    for (const filePath of markdownFiles) {
      if (filePath === ownerPath) continue;

      const content = readFileSync(filePath, 'utf8');
      if (!vocabulary.test(content)) continue;
      if (content.includes(owner)) continue;

      fail(filePath, `uses the vocabulary of ${what} without citing \${CLAUDE_PLUGIN_ROOT}/${owner}, which owns it. A second unlinked statement of a policy is a second thing to drift, and nothing can detect a paraphrase that has quietly fallen behind its source. Cite the owner, or say it in words that are not the policy's.`);
    }
  }
}

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
validateRuntimeContract(extractRuntimeContract(), agentNames);
validateHooksAndScripts();
validateCrossReferences();
validateComponentReferences(agentNames, skillNames);
validateMarketplaceDeclaration(marketplace, manifest);
validateNoLegacyPolicyFileReferences();
validateInstallerBoundary();
validateNormativeAnchors();
validateSingleSourcePolicies();
validateNoRequiredHostTaskTool();
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
