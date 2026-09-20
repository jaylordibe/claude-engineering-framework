#!/usr/bin/env node
//
// Exercises the Codex and Cursor installers and repository bootstrap against an
// ISOLATED fake HOME and fake repositories — never the real environment.
//
// The installers write into $HOME (skills at ~/.agents/skills, the reference
// home at ~/.agents/himoa, reviewer agents at ~/.codex/agents or ~/.cursor/
// agents). Their safety is asserted, not trusted: only Himoa-owned paths,
// idempotent, no dangling references, uninstall removes only what it owns and
// keeps shared files a co-installed host still needs, and a user-authored
// AGENTS.md is never destroyed. HOME/CODEX_HOME are overridden per run.
//
// Also asserts the structural guarantees the projection must carry onto each
// host: human-only skills cannot be model-invoked, and reviewer agents run
// read-only.
//
// No dependencies. Run: node tests/validate-adapter-install.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repoRoot, 'plugins', 'himoa');
const adapters = join(pluginRoot, 'adapters');
const bin = (host) => join(pluginRoot, 'bin', `himoa-${host}-install`);

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failures += 1;
  console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
};

const run = (host, args, { home, codexHome, cwd }) => spawnSync(bin(host), args, {
  cwd: cwd || repoRoot, env: { ...process.env, HOME: home, CODEX_HOME: codexHome }, encoding: 'utf8',
});
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
const snapshot = (dir) => new Map(walk(dir).map((p) => [p, readFileSync(p, 'utf8')]));
const tmpRoots = [];
const freshHome = () => { const d = mkdtempSync(join(tmpdir(), 'himoa-home-')); tmpRoots.push(d); return d; };
const agentsDir = (host, home, codexHome) => host === 'codex' ? join(codexHome, 'agents') : join(home, '.cursor/agents');

const expectedSkills = readdirSync(join(adapters, 'skills')).filter((n) => n.startsWith('himoa-')).length;
const expectedAgents = readdirSync(join(adapters, 'codex/agents')).filter((n) => n.endsWith('.toml')).length;

function installAndAssert(host) {
  const home = freshHome();
  const codexHome = join(home, '.codex');
  const r = run(host, [], { home, codexHome });
  check(`${host}: install exits 0`, r.status === 0, r.stderr);

  const skillsRoot = join(home, '.agents/skills');
  const skills = existsSync(skillsRoot) ? readdirSync(skillsRoot).filter((n) => n.startsWith('himoa-')) : [];
  const agents = existsSync(agentsDir(host, home, codexHome)) ? readdirSync(agentsDir(host, home, codexHome)).filter((n) => n.startsWith('himoa-')) : [];
  check(`${host}: all skills installed (shared)`, skills.length === expectedSkills, `${skills.length}/${expectedSkills}`);
  check(`${host}: all reviewer agents installed`, agents.length === expectedAgents, `${agents.length}/${expectedAgents}`);
  check(`${host}: reference home present`, existsSync(join(home, '.agents/himoa/standards')) && existsSync(join(home, '.agents/himoa/VERSION')));

  const installed = snapshot(home);
  check(`${host}: @HIMOA_HOME@ fully resolved`, ![...installed.values()].some((c) => c.includes('@HIMOA_HOME@')));
  check(`${host}: installed version matches canonical`,
    readFileSync(join(home, '.agents/himoa/VERSION'), 'utf8').trim() === readFileSync(join(adapters, 'VERSION'), 'utf8').trim());

  // End-to-end coherence: every referenced standards/template path and every
  // himoa-<skill> invocation resolves to an installed file.
  const himoaHome = join(home, '.agents/himoa');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const refRe = new RegExp(`${esc(himoaHome)}/(standards|templates)/([A-Za-z0-9._-]+\\.md)`, 'g');
  const dangling = [];
  for (const [file, content] of installed) {
    for (const m of content.matchAll(refRe)) if (!existsSync(join(himoaHome, m[1], m[2]))) dangling.push(`${file} -> ${m[1]}/${m[2]}`);
  }
  check(`${host}: no dangling references in installed methodology`, dangling.length === 0, dangling.slice(0, 6).join('; '));

  const unexpected = readdirSync(home).filter((n) => n !== '.agents' && n !== '.codex' && n !== '.cursor');
  check(`${host}: writes nothing outside .agents/.codex/.cursor`, unexpected.length === 0, unexpected.join(', '));

  const before = snapshot(home);
  run(host, [], { home, codexHome });
  const after = snapshot(home);
  check(`${host}: second install is byte-identical (idempotent)`, before.size === after.size && [...before].every(([p, c]) => after.get(p) === c));

  const home2 = freshHome();
  const rc = run(host, ['--check'], { home: home2, codexHome: join(home2, '.codex') });
  check(`${host}: --check writes nothing`, rc.status === 0 && walk(home2).length === 0);
}

installAndAssert('codex');
installAndAssert('cursor');

// --- Cross-host uninstall: shared files survive while another host needs them
{
  const home = freshHome();
  const codexHome = join(home, '.codex');
  run('codex', [], { home, codexHome });
  run('cursor', [], { home, codexHome });
  const skillsRoot = join(home, '.agents/skills');
  const nSkills = readdirSync(skillsRoot).filter((n) => n.startsWith('himoa-')).length;
  check('cross: both hosts installed, shared skills present once', nSkills === expectedSkills);

  run('codex', ['--uninstall'], { home, codexHome });
  const codexAgentsLeft = existsSync(join(codexHome, 'agents')) ? readdirSync(join(codexHome, 'agents')).filter((n) => n.startsWith('himoa-')).length : 0;
  check('cross: uninstall codex removes codex agents', codexAgentsLeft === 0);
  check('cross: uninstall codex KEEPS shared skills (cursor still installed)',
    existsSync(skillsRoot) && readdirSync(skillsRoot).filter((n) => n.startsWith('himoa-')).length === expectedSkills);
  check('cross: uninstall codex keeps cursor agents',
    readdirSync(join(home, '.cursor/agents')).filter((n) => n.startsWith('himoa-')).length === expectedAgents);

  run('cursor', ['--uninstall'], { home, codexHome });
  const skillsGone = !existsSync(skillsRoot) || readdirSync(skillsRoot).filter((n) => n.startsWith('himoa-')).length === 0;
  check('cross: uninstalling the last host removes shared skills + home', skillsGone && !existsSync(join(home, '.agents/himoa')));
}

// --- Uninstall preserves foreign files -------------------------------------
{
  const home = freshHome();
  const codexHome = join(home, '.codex');
  run('codex', [], { home, codexHome });
  const foreign = join(codexHome, 'agents', 'my-own.toml');
  writeFileSync(foreign, 'name = "mine"\n');
  run('codex', ['--uninstall'], { home, codexHome });
  check('uninstall preserves a foreign agent file', existsSync(foreign));
}

// --- Repository bootstrap (host-agnostic) ----------------------------------
{
  const home = freshHome();
  const env = { home, codexHome: join(home, '.codex') };
  const repo = mkdtempSync(join(tmpdir(), 'himoa-repo-')); tmpRoots.push(repo);
  run('cursor', ['--repo'], { ...env, cwd: repo });
  const content = existsSync(join(repo, 'AGENTS.md')) ? readFileSync(join(repo, 'AGENTS.md'), 'utf8') : '';
  check('repo: AGENTS.md created with bootstrap + truth scaffold', content.includes('himoa:bootstrap') && /Canonical commands/.test(content));
  const before = content;
  run('cursor', ['--repo'], { ...env, cwd: repo });
  check('repo: --repo is idempotent', readFileSync(join(repo, 'AGENTS.md'), 'utf8') === before);

  const repo2 = mkdtempSync(join(tmpdir(), 'himoa-repo2-')); tmpRoots.push(repo2);
  writeFileSync(join(repo2, 'AGENTS.md'), '# Mine\n\nSENTINEL-DO-NOT-LOSE\n');
  run('codex', ['--repo'], { ...env, cwd: repo2 });
  const merged = readFileSync(join(repo2, 'AGENTS.md'), 'utf8');
  check('repo: prepend preserves user content and adds bootstrap', merged.includes('SENTINEL-DO-NOT-LOSE') && merged.includes('himoa:bootstrap'));
}

// --- Structural guarantees the projection carries onto each host -----------
{
  const humanOnly = ['gate-design', 'gate-approve', 'gate-implement', 'gate-review', 'gate-validate', 'work-item', 'write-ticket'];
  for (const s of humanOnly) {
    const skill = readFileSync(join(adapters, 'skills', `himoa-${s}`, 'SKILL.md'), 'utf8');
    check(`shape: ${s} SKILL.md forbids model invocation (Cursor/Claude)`, /^disable-model-invocation: true$/m.test(skill));
    const yaml = readFileSync(join(adapters, 'skills', `himoa-${s}`, 'agents', 'openai.yaml'), 'utf8');
    check(`shape: ${s} forbids implicit invocation (Codex)`, /allow_implicit_invocation:\s*false/.test(yaml));
  }
  for (const s of ['domain-auth', 'domain-debugging']) {
    const skill = readFileSync(join(adapters, 'skills', `himoa-${s}`, 'SKILL.md'), 'utf8');
    check(`shape: ${s} is model-invocable (no disable flag)`, !/disable-model-invocation/.test(skill));
  }
  for (const f of readdirSync(join(adapters, 'codex/agents'))) {
    check(`shape: codex ${f} is read-only`, /sandbox_mode\s*=\s*"read-only"/.test(readFileSync(join(adapters, 'codex/agents', f), 'utf8')));
  }
  for (const f of readdirSync(join(adapters, 'cursor/agents'))) {
    check(`shape: cursor ${f} is readonly`, /^readonly: true$/m.test(readFileSync(join(adapters, 'cursor/agents', f), 'utf8')));
  }
}

for (const d of tmpRoots) rmSync(d, { recursive: true, force: true });
console.log('');
if (failures > 0) { console.error(`FAIL — ${failures} check(s) failed.`); process.exit(1); }
console.log('PASS — Codex and Cursor installers, bootstrap and projection guarantees hold.');
