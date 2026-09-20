#!/usr/bin/env node
//
// Exercises the Codex installer and repository bootstrap against an ISOLATED
// fake HOME and fake repositories — never the developer's real environment.
//
// WHY THIS EXISTS
// ---------------
// himoa-codex-install writes into $HOME (the Codex skills and agents
// directories). That is a genuine trust boundary, so its safety properties are
// asserted rather than trusted: it writes only Himoa-owned paths, is idempotent,
// resolves @HIMOA_HOME@, removes only what it owns, and never destroys a
// user-authored AGENTS.md. HOME and CODEX_HOME are overridden per run, which is
// exactly what keeps the real machine out of it.
//
// It also asserts the structural guarantees the projection must carry into
// Codex: human-only skills cannot be implicitly invoked, and reviewer agents run
// read-only.
//
// No dependencies. Run: node tests/validate-codex-install.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repoRoot, 'plugins', 'himoa');
const bin = join(pluginRoot, 'bin', 'himoa-codex-install');
const adapters = join(pluginRoot, 'adapters', 'codex');

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failures += 1;
  console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
};

function run(args, { home, codexHome, cwd }) {
  return spawnSync(bin, args, {
    cwd: cwd || repoRoot,
    env: { ...process.env, HOME: home, CODEX_HOME: codexHome },
    encoding: 'utf8',
  });
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const snapshot = (dir) => new Map(walk(dir).map((p) => [p, readFileSync(p, 'utf8')]));

const tmpRoots = [];
const freshHome = () => { const d = mkdtempSync(join(tmpdir(), 'himoa-codex-home-')); tmpRoots.push(d); return d; };
const freshRepo = () => { const d = mkdtempSync(join(tmpdir(), 'himoa-codex-repo-')); tmpRoots.push(d); return d; };

// --- A. clean machine install ----------------------------------------------
{
  const home = freshHome();
  const codexHome = join(home, '.codex');
  const r = run([], { home, codexHome });
  check('A install exits 0', r.status === 0, r.stderr);

  const skills = existsSync(join(home, '.agents/skills')) ? readdirSync(join(home, '.agents/skills')).filter((n) => n.startsWith('himoa-')) : [];
  const agents = existsSync(join(codexHome, 'agents')) ? readdirSync(join(codexHome, 'agents')).filter((n) => n.startsWith('himoa-') && n.endsWith('.toml')) : [];
  const expectedSkills = readdirSync(join(adapters, 'skills')).filter((n) => n.startsWith('himoa-')).length;
  const expectedAgents = readdirSync(join(adapters, 'agents')).filter((n) => n.endsWith('.toml')).length;
  check('A all skills installed', skills.length === expectedSkills, `${skills.length}/${expectedSkills}`);
  check('A all reviewer agents installed', agents.length === expectedAgents, `${agents.length}/${expectedAgents}`);
  check('A reference home has standards + VERSION', existsSync(join(codexHome, 'himoa/standards')) && existsSync(join(codexHome, 'himoa/VERSION')));

  const installed = snapshot(home);
  const leftoverPlaceholder = [...installed.values()].some((c) => c.includes('@HIMOA_HOME@'));
  check('A @HIMOA_HOME@ fully resolved', !leftoverPlaceholder, 'a placeholder survived into installed files');
  const refResolvesToHome = [...installed.values()].some((c) => c.includes(join(codexHome, 'himoa', 'standards')));
  check('A standards references resolve to the install home', refResolvesToHome);

  const versionInstalled = readFileSync(join(codexHome, 'himoa/VERSION'), 'utf8').trim();
  const versionCanonical = readFileSync(join(adapters, 'VERSION'), 'utf8').trim();
  check('A installed version matches canonical', versionInstalled === versionCanonical, `${versionInstalled} vs ${versionCanonical}`);

  // Safety: nothing created outside the two expected top-level dirs.
  const topLevel = readdirSync(home).sort().filter((n) => n !== '.codex' || true);
  const unexpected = readdirSync(home).filter((n) => n !== '.agents' && n !== '.codex');
  check('A writes nothing outside .agents/ and .codex/', unexpected.length === 0, `unexpected: ${unexpected.join(', ')}`);

  // --- B. idempotency ------------------------------------------------------
  const before = snapshot(home);
  const r2 = run([], { home, codexHome });
  const after = snapshot(home);
  const identical = before.size === after.size && [...before].every(([p, c]) => after.get(p) === c);
  check('B second install is byte-identical (idempotent)', r2.status === 0 && identical);

  // --- D. uninstall removes only Himoa-owned files -------------------------
  const foreignAgent = join(codexHome, 'agents', 'my-own.toml');
  const foreignSkillDir = join(home, '.agents/skills', 'my-own');
  mkdirSync(foreignSkillDir, { recursive: true });
  writeFileSync(foreignAgent, 'name = "mine"\n');
  writeFileSync(join(foreignSkillDir, 'SKILL.md'), '# mine\n');
  const ru = run(['--uninstall'], { home, codexHome });
  check('D uninstall exits 0', ru.status === 0, ru.stderr);
  // Owned = skill dirs named himoa-*, agent files named himoa-*.toml, and the
  // himoa/ reference home. Judged by basename/existence, not a path substring
  // (the temp dir name itself contains "himoa-").
  const leftSkills = existsSync(join(home, '.agents/skills')) ? readdirSync(join(home, '.agents/skills')).filter((n) => n.startsWith('himoa-')) : [];
  const leftAgents = existsSync(join(codexHome, 'agents')) ? readdirSync(join(codexHome, 'agents')).filter((n) => n.startsWith('himoa-')) : [];
  const homeGone = !existsSync(join(codexHome, 'himoa'));
  check('D no Himoa-owned files remain after uninstall', leftSkills.length === 0 && leftAgents.length === 0 && homeGone,
    `skills:${leftSkills.join(',')} agents:${leftAgents.join(',')} homeGone:${homeGone}`);
  check('D foreign agent survives uninstall', existsSync(foreignAgent));
  check('D foreign skill survives uninstall', existsSync(join(foreignSkillDir, 'SKILL.md')));
}

// --- C. --check writes nothing ---------------------------------------------
{
  const home = freshHome();
  const codexHome = join(home, '.codex');
  const r = run(['--check'], { home, codexHome });
  check('C --check exits 0', r.status === 0, r.stderr);
  check('C --check writes nothing', walk(home).length === 0, `${walk(home).length} files written`);
}

// --- E/F/G. repository bootstrap -------------------------------------------
{
  const repo = freshRepo();
  const home = freshHome();
  const env = { home, codexHome: join(home, '.codex'), cwd: repo };
  const r = run(['--repo'], env);
  check('E --repo exits 0', r.status === 0, r.stderr);
  const agentsMd = join(repo, 'AGENTS.md');
  check('E AGENTS.md created', existsSync(agentsMd));
  const content = existsSync(agentsMd) ? readFileSync(agentsMd, 'utf8') : '';
  check('E AGENTS.md carries the himoa:bootstrap marker', content.includes('himoa:bootstrap'));
  check('E AGENTS.md carries a repository-truth scaffold', /Canonical commands/.test(content));

  // F idempotent: re-run leaves it unchanged.
  const before = readFileSync(agentsMd, 'utf8');
  run(['--repo'], env);
  check('F --repo is idempotent (no duplicate bootstrap)', readFileSync(agentsMd, 'utf8') === before);

  // G prepend preserves a user-authored AGENTS.md.
  const repo2 = freshRepo();
  const sentinel = '# My own AGENTS.md\n\nSENTINEL-USER-CONTENT-DO-NOT-LOSE\n';
  writeFileSync(join(repo2, 'AGENTS.md'), sentinel);
  const rg = run(['--repo'], { home, codexHome: join(home, '.codex'), cwd: repo2 });
  const merged = readFileSync(join(repo2, 'AGENTS.md'), 'utf8');
  check('G prepend preserves user content', rg.status === 0 && merged.includes('SENTINEL-USER-CONTENT-DO-NOT-LOSE'));
  check('G prepend adds the bootstrap', merged.includes('himoa:bootstrap'));
}

// --- I. structural guarantees the projection must carry --------------------
{
  // Human-only skills (gates, work-item, write-ticket) must NOT be implicitly
  // invocable on Codex; domain playbooks may be. This is how the human-approval
  // boundary survives onto Codex.
  const humanOnly = ['gate-design', 'gate-approve', 'gate-implement', 'gate-review', 'gate-validate', 'work-item', 'write-ticket'];
  for (const s of humanOnly) {
    const yaml = readFileSync(join(adapters, 'skills', `himoa-${s}`, 'agents', 'openai.yaml'), 'utf8');
    check(`I ${s} forbids implicit invocation`, /allow_implicit_invocation:\s*false/.test(yaml), yaml);
  }
  for (const s of ['domain-auth', 'domain-debugging']) {
    const yaml = readFileSync(join(adapters, 'skills', `himoa-${s}`, 'agents', 'openai.yaml'), 'utf8');
    check(`I ${s} allows implicit invocation`, /allow_implicit_invocation:\s*true/.test(yaml), yaml);
  }
  // Every reviewer agent runs read-only.
  for (const f of readdirSync(join(adapters, 'agents')).filter((n) => n.endsWith('.toml'))) {
    const toml = readFileSync(join(adapters, 'agents', f), 'utf8');
    check(`I ${f} is read-only`, /sandbox_mode\s*=\s*"read-only"/.test(toml), toml);
  }
}

for (const d of tmpRoots) rmSync(d, { recursive: true, force: true });

console.log('');
if (failures > 0) { console.error(`FAIL — ${failures} check(s) failed.`); process.exit(1); }
console.log('PASS — Codex installer, repository bootstrap and projection guarantees hold.');
