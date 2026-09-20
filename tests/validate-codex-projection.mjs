#!/usr/bin/env node
//
// Projects Himoa's canonical methodology into OpenAI Codex-native
// representations, and verifies the committed projection has NOT drifted from
// canonical.
//
// WHY THIS EXISTS
// ---------------
// One canonical methodology, thin native adapters. The Claude plugin under
// plugins/himoa/{skills,agents,standards,templates} is the single source of
// truth. Codex consumes the same methodology through different native
// mechanisms: SKILL.md with progressive disclosure, TOML custom agents for
// read-only subagents, and always-on AGENTS.md. This script is the ONLY place
// the canonical -> Codex transform lives, so there is never a second editable
// copy of the methodology. The committed output under
// plugins/himoa/adapters/codex/ is GENERATED, marked as such, and drift-checked
// here: edit a canonical file without regenerating and CI fails.
//
//   node tests/validate-codex-projection.mjs --write   # regenerate (developer)
//   node tests/validate-codex-projection.mjs           # fail on drift (CI)
//
// No dependencies.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repoRoot, 'plugins', 'himoa');
const outRoot = join(pluginRoot, 'adapters', 'codex');
const manifest = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'));
const version = manifest.version;

const write = process.argv.includes('--write');

// framework-install / framework-doctor are Claude ADMINISTRATION, not portable
// methodology: Codex gets native himoa-codex-install / himoa-codex-doctor bins
// instead of a projected plugin skill. Everything else is methodology.
const SKIP_SKILLS = new Set(['framework-install', 'framework-doctor']);

// @HIMOA_HOME@ is a placeholder the installer resolves to the Himoa reference
// home on the Codex machine (${CODEX_HOME:-~/.codex}/himoa). Keeping it a
// placeholder in the committed projection keeps the projection deterministic and
// independent of any one machine's CODEX_HOME, while the installer does the
// final path substitution. $himoa-<name> is a Codex skill invocation.
function transformBody(text) {
  return text
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/standards\//g, '@HIMOA_HOME@/standards/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/templates\//g, '@HIMOA_HOME@/templates/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/reference\//g, '@HIMOA_HOME@/reference/')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/([a-z0-9-]+)\/SKILL\.md/g, '$himoa-$1')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/([a-z0-9-]+)\//g, '$himoa-$1 ')
    .replace(/\/himoa:([a-z0-9-]+)/g, '$himoa-$1')
    // In canonical methodology text, "CLAUDE.md" names the repository-truth
    // document. On Codex that single neutral home is AGENTS.md, so the projected
    // methodology points there. (".claude/…" host paths are left alone.)
    .replace(/\bCLAUDE\.md\b/g, 'AGENTS.md');
}

function genHeaderMd(srcRelative) {
  return `<!-- GENERATED from plugins/himoa/${srcRelative} by tests/validate-codex-projection.mjs (himoa ${version}). DO NOT EDIT. Edit the canonical source and run: node tests/validate-codex-projection.mjs --write -->\n\n`;
}

function genHeaderHash(srcRelative) {
  return `# GENERATED from plugins/himoa/${srcRelative} by tests/validate-codex-projection.mjs (himoa ${version}).\n# DO NOT EDIT. Edit the canonical source and run: node tests/validate-codex-projection.mjs --write\n`;
}

// A deliberately small flat-frontmatter reader — the same shape the other
// validators parse. Returns { fm, body }.
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

// The projected file set, path (relative to outRoot) -> content.
const expected = new Map();

// --- Skills -> Codex SKILL.md + agents/openai.yaml -------------------------
// A human-only Himoa skill (disable-model-invocation) must not be implicitly
// invoked by the Codex model either: allow_implicit_invocation:false is the
// Codex-native equivalent. A domain playbook (user-invocable:false) is
// model-facing background knowledge, so implicit invocation stays on.
for (const name of readdirSync(join(pluginRoot, 'skills')).sort()) {
  if (SKIP_SKILLS.has(name)) continue;
  const srcPath = join(pluginRoot, 'skills', name, 'SKILL.md');
  if (!existsSync(srcPath)) continue;
  const { fm, body } = splitFrontmatter(readFileSync(srcPath, 'utf8'), srcPath);
  const humanOnly = fm['disable-model-invocation'] === 'true' || fm['disable-model-invocation'] === true;
  const skillDir = `skills/himoa-${name}`;
  const skillMd =
    `---\n` +
    `name: himoa-${name}\n` +
    `description: ${fm.description}\n` +
    `---\n\n` +
    genHeaderMd(`skills/${name}/SKILL.md`) +
    transformBody(body).replace(/^\n+/, '');
  expected.set(`${skillDir}/SKILL.md`, skillMd);
  // openai.yaml carries the invocation policy. allow_implicit_invocation
  // defaults true in Codex, so it is only worth writing when it must be false;
  // but we write it explicitly in both cases so the human-approval boundary is
  // visible in the file rather than relying on a default.
  const openaiYaml =
    genHeaderHash(`skills/${name}/SKILL.md`) +
    `policy:\n  allow_implicit_invocation: ${humanOnly ? 'false' : 'true'}\n`;
  expected.set(`${skillDir}/agents/openai.yaml`, openaiYaml);
}

// --- Reviewer agents -> Codex custom-agent TOML ----------------------------
// Read-only reviewer intent is enforced natively on Codex by
// sandbox_mode="read-only" (OS-level), which is at least as strong as Claude's
// tool-pool restriction. developer_instructions carries the canonical role body
// verbatim (transformed refs only) — the same words, no second copy.
function tomlEscapeTripleQuote(s) {
  if (s.includes('"""')) throw new Error('agent body contains """ which breaks TOML multiline strings');
  return s;
}
for (const file of readdirSync(join(pluginRoot, 'agents')).sort()) {
  if (!file.endsWith('.md')) continue;
  const name = file.slice(0, -3);
  const { fm, body } = splitFrontmatter(readFileSync(join(pluginRoot, 'agents', file), 'utf8'), file);
  const instructions = tomlEscapeTripleQuote(transformBody(body).trim());
  const toml =
    `# GENERATED from plugins/himoa/agents/${file} by tests/validate-codex-projection.mjs (himoa ${version}).\n` +
    `# DO NOT EDIT. Edit the canonical source and run: node tests/validate-codex-projection.mjs --write\n\n` +
    `name = "himoa-${name}"\n` +
    `description = ${JSON.stringify(fm.description)}\n` +
    `model_reasoning_effort = ${JSON.stringify(String(fm.effort || 'high'))}\n` +
    `sandbox_mode = "read-only"\n` +
    `developer_instructions = """\n${instructions}\n"""\n`;
  expected.set(`agents/himoa-${name}.toml`, toml);
}

// --- Standards & templates -> transformed reference copies -----------------
// Codex has no ${CLAUDE_PLUGIN_ROOT}; the refs are rewritten to @HIMOA_HOME@ so
// they resolve against the installed Himoa reference home. These are generated,
// drift-checked copies, never a second source.
for (const sub of ['standards', 'templates']) {
  for (const file of readdirSync(join(pluginRoot, sub)).sort()) {
    if (!file.endsWith('.md')) continue;
    const body = readFileSync(join(pluginRoot, sub, file), 'utf8');
    expected.set(`${sub}/${file}`, genHeaderMd(`${sub}/${file}`) + transformBody(body).replace(/^\n+/, ''));
  }
}

// --- Always-on bootstrap: the charter, projected into an AGENTS.md block ----
// Claude gets the always-on methodology floor from the SessionStart charter
// hook. Codex's always-on channel is AGENTS.md. To keep ONE source for that
// floor, the bootstrap block below is projected from the SAME charter body the
// hook injects — extracted from session-charter.sh, not hand-copied — so the
// two cannot drift. framework-install (or himoa-codex-install --repo) places
// this block at the top of a repository's AGENTS.md, above the repository's own
// truth. Standards are referenced at the default install home (~/.codex/himoa);
// a machine using CODEX_HOME reads the same content from there.
{
  const charterSh = readFileSync(join(pluginRoot, 'scripts', 'session-charter.sh'), 'utf8');
  const m = charterSh.match(/<<'CHARTER'[^\n]*\n([\s\S]*?)\nCHARTER/);
  if (!m) throw new Error('cannot extract the charter body from session-charter.sh');
  const body = transformBody(m[1])
    .replace(/@HIMOA_HOME@/g, '~/.codex/himoa')       // repo file: resolve to default home
    .replace(/`:gate-/g, '`$himoa-gate-');            // charter's bare :gate-* shorthand -> Codex invocation
  const bootstrap =
    `<!-- himoa:bootstrap ${version} — GENERATED from plugins/himoa/scripts/session-charter.sh by tests/validate-codex-projection.mjs. DO NOT EDIT this block; edit the charter and run --write. -->\n\n` +
    `> **Himoa on Codex.** This repository uses the Himoa engineering methodology.\n` +
    `> Its skills are installed as Codex skills — invoke a workflow with \`$himoa-<name>\`\n` +
    `> (e.g. \`$himoa-work-item\`, \`$himoa-gate-design\`); its reviewer roles are Codex\n` +
    `> subagents (\`himoa-security\`, \`himoa-reviewer\`, …) that run read-only; its\n` +
    `> standards live under \`~/.codex/himoa/standards/\`. The methodology below is\n` +
    `> always-on. The repository's own truth is the sections after it.\n\n` +
    body.replace(/^\n+/, '') +
    `\n\n_Himoa ${version} — methodology only. The sections below are authoritative for what this system is._\n`;
  expected.set('AGENTS.himoa.md', bootstrap);
}

// --- Version stamp ---------------------------------------------------------
// The one piece of state a Codex install can compare against canonical to
// detect staleness (there is no plugin-style update lifecycle on Codex).
expected.set('VERSION', `${version}\n`);

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
  console.log(`codex projection — wrote ${expected.size} files to ${relative(repoRoot, outRoot)}`);
  process.exit(0);
}

const errors = [];
const committed = new Set(listCommitted(outRoot));
for (const [rel, content] of expected) {
  const full = join(outRoot, rel);
  if (!existsSync(full)) {
    errors.push(`missing projected file: adapters/codex/${rel}`);
    continue;
  }
  if (readFileSync(full, 'utf8') !== content) {
    errors.push(`stale projected file: adapters/codex/${rel} differs from canonical`);
  }
  committed.delete(rel);
}
for (const rel of committed) {
  errors.push(`orphan projected file: adapters/codex/${rel} has no canonical source`);
}

console.log(`codex projection — ${expected.size} files checked against canonical`);
if (errors.length) {
  console.error('\nFAIL — the committed Codex projection has drifted from canonical:');
  for (const e of errors) console.error(`  ${e}`);
  console.error('\nRegenerate with: node tests/validate-codex-projection.mjs --write');
  process.exit(1);
}
console.log('PASS — projection is in sync with canonical (no fork, no drift).');
