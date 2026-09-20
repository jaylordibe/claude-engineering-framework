#!/usr/bin/env node
//
// Projects Himoa's canonical methodology into the native representations of
// every non-Claude adapter, and verifies the committed projection has NOT
// drifted from canonical.
//
// WHY THIS EXISTS
// ---------------
// One canonical methodology, thin native adapters. The Claude plugin under
// plugins/himoa/{skills,agents,standards,templates} plus the SessionStart
// charter is the single source. This script transforms it once and emits:
//
//   adapters/skills/himoa-*/         SHARED — Codex and Cursor both read
//                                    SKILL.md from ~/.agents/skills (Cursor also
//                                    honours disable-model-invocation; Codex
//                                    reads the agents/openai.yaml sidecar).
//   adapters/standards, templates/   SHARED — referenced by the skills at the
//                                    neutral install home ~/.agents/himoa.
//   adapters/AGENTS.himoa.md         SHARED — the always-on bootstrap, projected
//                                    from the SAME charter the hook injects.
//   adapters/VERSION                 SHARED — the staleness stamp.
//   adapters/codex/agents/*.toml     Codex read-only reviewer subagents.
//   adapters/cursor/agents/*.md      Cursor read-only reviewer subagents.
//
// Only the reviewer-agent format is per-host; everything a second adapter
// demonstrably shares with the first is shared, per "two implementations before
// abstraction". The committed output is GENERATED and drift-checked here.
//
//   node tests/validate-adapter-projection.mjs --write   # regenerate
//   node tests/validate-adapter-projection.mjs           # fail on drift
//
// No dependencies.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repoRoot, 'plugins', 'himoa');
const outRoot = join(pluginRoot, 'adapters');
const version = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')).version;
const write = process.argv.includes('--write');

// Claude administration, not portable methodology: each adapter gets a native
// install/doctor bin instead of a projected skill.
const SKIP_SKILLS = new Set(['framework-install', 'framework-doctor']);

// context-mapper is a design-stage mapping agent, not a review lens, and
// Copilot's single cloud-agent model has no separate mapping-subagent stage, so
// it is not projected as a Copilot custom agent. It also exceeds Copilot's
// 30000-char custom-agent limit — the same conclusion by another route. It is
// still projected for Codex and Cursor, which map with a read-only subagent.
const COPILOT_SKIP_AGENTS = new Set(['context-mapper']);

// @HIMOA_HOME@ is resolved by each installer to the neutral shared home
// (~/.agents/himoa). $himoa-<name> and himoa-<name> both name a skill; the
// bootstrap and skill bodies use the prefix-free form so neither host's
// invocation syntax is baked in.
function transformBody(text) {
  return text
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/standards\//g, '@HIMOA_HOME@/standards/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/templates\//g, '@HIMOA_HOME@/templates/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/reference\//g, '@HIMOA_HOME@/reference/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/([a-z0-9-]+)\/SKILL\.md/g, 'himoa-$1')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/([a-z0-9-]+)\//g, 'himoa-$1 ')
    .replace(/\/himoa:([a-z0-9-]+)/g, 'himoa-$1')
    .replace(/\bCLAUDE\.md\b/g, 'AGENTS.md');
}

const genMd = (src) => `<!-- GENERATED from plugins/himoa/${src} by tests/validate-adapter-projection.mjs (himoa ${version}). DO NOT EDIT. Edit the canonical source and run: node tests/validate-adapter-projection.mjs --write -->\n\n`;
const genHash = (src) => `# GENERATED from plugins/himoa/${src} by tests/validate-adapter-projection.mjs (himoa ${version}).\n# DO NOT EDIT. Edit the canonical source and run: node tests/validate-adapter-projection.mjs --write\n`;

function splitFrontmatter(content, filePath) {
  if (!content.startsWith('---\n')) throw new Error(`no frontmatter in ${filePath}`);
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) throw new Error(`unterminated frontmatter in ${filePath}`);
  const raw = content.slice(4, end);
  const body = content.slice(end + 5);
  const fm = {};
  for (const line of raw.split('\n')) {
    if (line.trim() === '' || /^\s/.test(line)) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    fm[line.slice(0, i).trim()] = v;
  }
  return { fm, body };
}

const expected = new Map();

// --- Shared skills ---------------------------------------------------------
for (const name of readdirSync(join(pluginRoot, 'skills')).sort()) {
  if (SKIP_SKILLS.has(name)) continue;
  const srcPath = join(pluginRoot, 'skills', name, 'SKILL.md');
  if (!existsSync(srcPath)) continue;
  const { fm, body } = splitFrontmatter(readFileSync(srcPath, 'utf8'), srcPath);
  const humanOnly = fm['disable-model-invocation'] === 'true' || fm['disable-model-invocation'] === true;
  // Human-only skills keep disable-model-invocation in the SKILL.md frontmatter
  // (Cursor's native human-approval control) AND get the openai.yaml sidecar
  // (Codex's). Both hosts therefore refuse to let the model self-start a gate.
  const skillMd =
    `---\n` +
    `name: himoa-${name}\n` +
    `description: ${fm.description}\n` +
    (humanOnly ? `disable-model-invocation: true\n` : ``) +
    `---\n\n` +
    genMd(`skills/${name}/SKILL.md`) +
    transformBody(body).replace(/^\n+/, '');
  expected.set(`skills/himoa-${name}/SKILL.md`, skillMd);
  expected.set(`skills/himoa-${name}/agents/openai.yaml`,
    genHash(`skills/${name}/SKILL.md`) + `policy:\n  allow_implicit_invocation: ${humanOnly ? 'false' : 'true'}\n`);

  // Gemini CLI has no skills primitive, so the workflow is delivered as native
  // TOML slash commands (/himoa:<name>). A gate command is human-typed, so the
  // model cannot self-start a gate — the human-approval boundary holds through
  // the invocation model, not despite it. Literal ''' strings avoid backslash
  // escaping in method bodies.
  const cmd = transformBody(body).trim();
  if (cmd.includes("'''")) throw new Error(`skill ${name}: body contains ''' which breaks a TOML literal string`);
  expected.set(`gemini/commands/himoa/${name}.toml`,
    genHash(`skills/${name}/SKILL.md`) +
    `description = ${JSON.stringify(fm.description)}\n` +
    `prompt = '''\n${cmd}\n'''\n`);
}

// --- Reviewer agents: per host ---------------------------------------------
for (const file of readdirSync(join(pluginRoot, 'agents')).sort()) {
  if (!file.endsWith('.md')) continue;
  const name = file.slice(0, -3);
  const { fm, body } = splitFrontmatter(readFileSync(join(pluginRoot, 'agents', file), 'utf8'), file);
  const instructions = transformBody(body).trim();
  if (instructions.includes('"""')) throw new Error(`${file}: body contains """ which breaks TOML`);

  // Codex: standalone TOML, read-only.
  expected.set(`codex/agents/himoa-${name}.toml`,
    genHash(`agents/${file}`) + '\n' +
    `name = "himoa-${name}"\n` +
    `description = ${JSON.stringify(fm.description)}\n` +
    `model_reasoning_effort = ${JSON.stringify(String(fm.effort || 'high'))}\n` +
    `sandbox_mode = "read-only"\n` +
    `developer_instructions = """\n${instructions}\n"""\n`);

  // Cursor: markdown + YAML frontmatter, readonly (no edits, no state-changing
  // shell) — Cursor's native read-only reviewer.
  expected.set(`cursor/agents/himoa-${name}.md`,
    `---\n` +
    `name: himoa-${name}\n` +
    `description: ${fm.description}\n` +
    `model: inherit\n` +
    `readonly: true\n` +
    `---\n\n` +
    genMd(`agents/${file}`) +
    instructions + '\n');

  // Copilot: a custom agent (.github/agents/*.agent.md, md + YAML). Copilot has
  // no spawnable read-only reviewer subagent, so this is an ADVISORY reviewer
  // lens a human selects — the read-only discipline lives in the embedded
  // contract, not in an enforced sandbox. Recorded truthfully in
  // docs/platform-capabilities.md.
  if (!COPILOT_SKIP_AGENTS.has(name)) {
    expected.set(`copilot/agents/himoa-${name}.agent.md`,
      `---\n` +
      `name: himoa-${name}\n` +
      `description: ${fm.description}\n` +
      `---\n\n` +
      genMd(`agents/${file}`) +
      instructions + '\n');
  }

  // Gemini CLI: markdown + YAML subagent, restricted to read-only tools (no
  // write_file / run_shell_command) — Gemini's native read-only reviewer, with
  // an isolated context window.
  expected.set(`gemini/agents/himoa-${name}.md`,
    `---\n` +
    `name: himoa-${name}\n` +
    `description: ${fm.description}\n` +
    `tools:\n  - read_file\n  - read_many_files\n  - glob\n  - search_file_content\n` +
    `---\n\n` +
    genMd(`agents/${file}`) +
    instructions + '\n');
}

// --- Shared standards & templates ------------------------------------------
for (const sub of ['standards', 'templates']) {
  for (const file of readdirSync(join(pluginRoot, sub)).sort()) {
    if (!file.endsWith('.md')) continue;
    expected.set(`${sub}/${file}`, genMd(`${sub}/${file}`) + transformBody(readFileSync(join(pluginRoot, sub, file), 'utf8')).replace(/^\n+/, ''));
  }
}

// --- Shared always-on bootstrap (projected from the charter) ---------------
{
  const charterSh = readFileSync(join(pluginRoot, 'scripts', 'session-charter.sh'), 'utf8');
  const m = charterSh.match(/<<'CHARTER'[^\n]*\n([\s\S]*?)\nCHARTER/);
  if (!m) throw new Error('cannot extract the charter body from session-charter.sh');
  // The bootstrap is committed to a consuming repository and read by WHICHEVER
  // host opens it, so it must not bake a host-specific standards path
  // (~/.agents/himoa is right for Codex/Cursor, wrong for Copilot's cloud
  // model). Standards references are neutralised to a phrase; the precise paths
  // live in the installed skills and reviewer agents, resolved per host.
  const body = transformBody(m[1])
    .replace(/@HIMOA_HOME@\/standards\/([a-z0-9-]+)\.md/g, 'the Himoa $1 standard')
    .replace(/@HIMOA_HOME@\/[a-z]+\//g, 'the Himoa ')
    .replace(/`:gate-/g, '`himoa-gate-');
  expected.set('AGENTS.himoa.md',
    `<!-- himoa:bootstrap ${version} — GENERATED from plugins/himoa/scripts/session-charter.sh by tests/validate-adapter-projection.mjs. DO NOT EDIT this block; edit the charter and run --write. -->\n\n` +
    `> **Himoa.** This repository uses the Himoa engineering methodology.\n` +
    `> Its skills are installed as agent skills — invoke a workflow by name\n` +
    `> (\`himoa-work-item\`, \`himoa-gate-design\`; Codex \`$himoa-…\`, Cursor\n` +
    `> \`/himoa-…\`); its reviewer roles run read-only. Deeper standards are\n` +
    `> referenced by the installed skills and reviewer agents. The methodology\n` +
    `> below is always-on. The repository's own truth is the sections after it.\n\n` +
    body.replace(/^\n+/, '') +
    `\n\n_Himoa ${version} — methodology only. The sections below are authoritative for what this system is._\n`);
}

expected.set('VERSION', `${version}\n`);

// --- Structural validity ---------------------------------------------------
{
  const shape = [];
  for (const [rel, content] of expected) {
    if (rel.startsWith('skills/') && rel.endsWith('/SKILL.md')) {
      if (!/^---\nname: himoa-[a-z0-9-]+\ndescription: .+/.test(content)) shape.push(`${rel}: needs name+description frontmatter`);
    } else if (rel.endsWith('/openai.yaml')) {
      if (!/policy:\n\s+allow_implicit_invocation: (true|false)\n/.test(content)) shape.push(`${rel}: needs policy.allow_implicit_invocation`);
    } else if (rel.startsWith('codex/agents/') && rel.endsWith('.toml')) {
      if (!/\nname = "himoa-[a-z0-9-]+"\n/.test(content)) shape.push(`${rel}: TOML needs a name`);
      if (!/\nsandbox_mode = "read-only"\n/.test(content)) shape.push(`${rel}: must be sandbox_mode="read-only"`);
      const q = (content.match(/"""/g) || []).length;
      if (q !== 2) shape.push(`${rel}: unbalanced triple-quote (${q})`);
    } else if (rel.startsWith('cursor/agents/') && rel.endsWith('.md')) {
      if (!/^---\nname: himoa-[a-z0-9-]+\ndescription: .+/.test(content)) shape.push(`${rel}: needs name+description frontmatter`);
      if (!/\nreadonly: true\n/.test(content)) shape.push(`${rel}: Cursor reviewer must be readonly: true`);
    } else if (rel.startsWith('copilot/agents/') && rel.endsWith('.agent.md')) {
      if (!/^---\nname: himoa-[a-z0-9-]+\ndescription: .+/.test(content)) shape.push(`${rel}: needs name+description frontmatter`);
      if (content.length > 30000) shape.push(`${rel}: exceeds Copilot's 30000-char custom-agent limit`);
    } else if (rel.startsWith('gemini/agents/') && rel.endsWith('.md')) {
      if (!/^---\nname: himoa-[a-z0-9-]+\ndescription: .+/.test(content)) shape.push(`${rel}: needs name+description frontmatter`);
      if (!/\ntools:\n/.test(content)) shape.push(`${rel}: Gemini reviewer must declare a read-only tools allowlist`);
      if (/write_file|run_shell_command/.test(content.slice(0, content.indexOf('\n---\n', 4)))) shape.push(`${rel}: Gemini reviewer tools must be read-only (no write_file/run_shell_command)`);
    } else if (rel.startsWith('gemini/commands/') && rel.endsWith('.toml')) {
      if (!/\ndescription = /.test(content) || !/\nprompt = '''/.test(content)) shape.push(`${rel}: Gemini command needs description + prompt`);
    }
  }
  // Host-constraint conformance — real limits a live run would fail on:
  //  - Codex reads AGENTS.md up to project_doc_max_bytes (default 32 KiB). The
  //    bootstrap must leave ample room for a repository's own truth below it, so
  //    hold it to half the cap.
  //  - A skill's preview (its name+description frontmatter) must fit the
  //    progressive-disclosure budget (Codex: <=2% of context, or 8000 chars).
  const bootstrap = expected.get('AGENTS.himoa.md') || '';
  if (Buffer.byteLength(bootstrap, 'utf8') > 16 * 1024) shape.push(`AGENTS.himoa.md bootstrap is over 16 KiB — too little of the 32 KiB AGENTS.md cap left for repository truth`);
  for (const [rel, content] of expected) {
    if (rel.startsWith('skills/') && rel.endsWith('/SKILL.md')) {
      const fmEnd = content.indexOf('\n---\n');
      const preview = fmEnd === -1 ? content : content.slice(0, fmEnd);
      if (preview.length > 8000) shape.push(`${rel}: name+description preview exceeds the 8000-char disclosure budget`);
    }
  }

  if (shape.length) { console.error('FAIL — generated adapter config is malformed:'); for (const e of shape) console.error(`  ${e}`); process.exit(1); }
}

// --- Write or verify -------------------------------------------------------
function listCommitted(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listCommitted(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

if (write) {
  if (existsSync(outRoot)) rmSync(outRoot, { recursive: true });
  for (const [rel, content] of expected) {
    const full = join(outRoot, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  console.log(`adapter projection — wrote ${expected.size} files to ${relative(repoRoot, outRoot)}`);
  process.exit(0);
}

const errors = [];
const committed = new Set(listCommitted(outRoot));
for (const [rel, content] of expected) {
  const full = join(outRoot, rel);
  if (!existsSync(full)) { errors.push(`missing: adapters/${rel}`); continue; }
  if (readFileSync(full, 'utf8') !== content) errors.push(`stale: adapters/${rel}`);
  committed.delete(rel);
}
for (const rel of committed) errors.push(`orphan: adapters/${rel} has no canonical source`);

console.log(`adapter projection — ${expected.size} files checked against canonical`);
if (errors.length) {
  console.error('\nFAIL — the committed projection has drifted from canonical:');
  for (const e of errors) console.error(`  ${e}`);
  console.error('\nRegenerate with: node tests/validate-adapter-projection.mjs --write');
  process.exit(1);
}
console.log('PASS — projection is in sync with canonical (no fork, no drift).');
