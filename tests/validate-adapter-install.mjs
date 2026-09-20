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

// --- Copilot: repo-only bootstrap, no $HOME footprint ----------------------
{
  const copilotBin = join(pluginRoot, 'bin', 'himoa-copilot-install');
  const home = freshHome();
  const repo = mkdtempSync(join(tmpdir(), 'himoa-copilot-repo-')); tmpRoots.push(repo);
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, '.codex') };
  const r = spawnSync(copilotBin, [], { cwd: repo, env, encoding: 'utf8' });
  check('copilot: install exits 0', r.status === 0, r.stderr);
  const agentsMd = existsSync(join(repo, 'AGENTS.md')) ? readFileSync(join(repo, 'AGENTS.md'), 'utf8') : '';
  check('copilot: AGENTS.md created with bootstrap + truth scaffold', /himoa:bootstrap/.test(agentsMd) && /Canonical commands/.test(agentsMd));

  const ghAgents = join(repo, '.github/agents');
  const copAgents = existsSync(ghAgents) ? readdirSync(ghAgents).filter((n) => n.startsWith('himoa-')) : [];
  const expectedCop = readdirSync(join(adapters, 'copilot/agents')).filter((n) => n.endsWith('.agent.md')).length;
  check('copilot: reviewer agents written to .github/agents', copAgents.length === expectedCop && expectedCop > 0, `${copAgents.length}/${expectedCop}`);
  check('copilot: context-mapper excluded (not a review lens; over 30k limit)', !copAgents.some((n) => n.includes('context-mapper')));
  const ghContent = copAgents.map((n) => readFileSync(join(ghAgents, n), 'utf8')).join('\n');
  check('copilot: @HIMOA_HOME@ resolved to the canonical URL', !ghContent.includes('@HIMOA_HOME@') && ghContent.includes('github.com/jaylordibe/himoa'));
  check('copilot: writes nothing to $HOME (cloud agent)', walk(home).length === 0, `${walk(home).length} files in HOME`);

  spawnSync(copilotBin, ['--uninstall'], { cwd: repo, env, encoding: 'utf8' });
  const leftCop = existsSync(ghAgents) ? readdirSync(ghAgents).filter((n) => n.startsWith('himoa-')).length : 0;
  check('copilot: uninstall removes .github/agents/himoa-*', leftCop === 0);
  check('copilot: uninstall keeps AGENTS.md', existsSync(join(repo, 'AGENTS.md')));

  const repo2 = mkdtempSync(join(tmpdir(), 'himoa-copilot-repo2-')); tmpRoots.push(repo2);
  const rc = spawnSync(copilotBin, ['--check'], { cwd: repo2, env, encoding: 'utf8' });
  check('copilot: --check writes nothing', rc.status === 0 && !existsSync(join(repo2, 'AGENTS.md')) && !existsSync(join(repo2, '.github')));
}

// --- Gemini: machine install + repo settings.json context.fileName merge --
{
  const gbin = join(pluginRoot, 'bin', 'himoa-gemini-install');
  const home = freshHome();
  const geminiHome = join(home, '.gemini');
  const env = { ...process.env, HOME: home, GEMINI_HOME: geminiHome };
  const r = spawnSync(gbin, [], { cwd: repoRoot, env, encoding: 'utf8' });
  check('gemini: install exits 0', r.status === 0, r.stderr);
  const agents = existsSync(join(geminiHome, 'agents')) ? readdirSync(join(geminiHome, 'agents')).filter((n) => n.startsWith('himoa-')) : [];
  const cmds = existsSync(join(geminiHome, 'commands/himoa')) ? readdirSync(join(geminiHome, 'commands/himoa')).filter((n) => n.endsWith('.toml')) : [];
  const expA = readdirSync(join(adapters, 'gemini/agents')).length;
  const expC = readdirSync(join(adapters, 'gemini/commands/himoa')).length;
  check('gemini: reviewer subagents installed', agents.length === expA, `${agents.length}/${expA}`);
  check('gemini: workflow commands installed', cmds.length === expC, `${cmds.length}/${expC}`);
  check('gemini: standards home present', existsSync(join(geminiHome, 'himoa/standards')));

  const inst = snapshot(home);
  check('gemini: @HIMOA_HOME@ fully resolved', ![...inst.values()].some((c) => c.includes('@HIMOA_HOME@')));
  const gh = join(geminiHome, 'himoa');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc(gh)}/(standards|templates)/([A-Za-z0-9._-]+\\.md)`, 'g');
  const dangling = [];
  for (const [f, c] of inst) for (const m of c.matchAll(re)) if (!existsSync(join(gh, m[1], m[2]))) dangling.push(`${f} -> ${m[1]}/${m[2]}`);
  check('gemini: no dangling references in installed methodology', dangling.length === 0, dangling.slice(0, 5).join('; '));
  const anyWrite = agents.some((n) => /write_file|run_shell_command/.test(readFileSync(join(geminiHome, 'agents', n), 'utf8').split('\n---\n')[0]));
  check('gemini: reviewer subagents are read-only (no write tools)', !anyWrite);

  const repo = mkdtempSync(join(tmpdir(), 'himoa-gemrepo-')); tmpRoots.push(repo);
  spawnSync(gbin, ['--repo'], { cwd: repo, env, encoding: 'utf8' });
  check('gemini: --repo writes AGENTS.md bootstrap', existsSync(join(repo, 'AGENTS.md')) && /himoa:bootstrap/.test(readFileSync(join(repo, 'AGENTS.md'), 'utf8')));
  const settings = join(repo, '.gemini/settings.json');
  check('gemini: settings.json context.fileName includes AGENTS.md', existsSync(settings) && /AGENTS\.md/.test(readFileSync(settings, 'utf8')));

  const repo2 = mkdtempSync(join(tmpdir(), 'himoa-gemrepo2-')); tmpRoots.push(repo2);
  mkdirSync(join(repo2, '.gemini'), { recursive: true });
  writeFileSync(join(repo2, '.gemini/settings.json'), JSON.stringify({ theme: 'keep-me', context: { fileName: 'GEMINI.md' } }));
  spawnSync(gbin, ['--repo'], { cwd: repo2, env, encoding: 'utf8' });
  let merged = {};
  try { merged = JSON.parse(readFileSync(join(repo2, '.gemini/settings.json'), 'utf8')); } catch { /* leave empty */ }
  check('gemini: settings merge preserves existing keys and adds AGENTS.md',
    merged.theme === 'keep-me' && Array.isArray(merged.context?.fileName) && merged.context.fileName.includes('AGENTS.md') && merged.context.fileName.includes('GEMINI.md'));

  spawnSync(gbin, ['--uninstall'], { cwd: repoRoot, env, encoding: 'utf8' });
  const leftA = existsSync(join(geminiHome, 'agents')) ? readdirSync(join(geminiHome, 'agents')).filter((n) => n.startsWith('himoa-')).length : 0;
  check('gemini: uninstall removes subagents, commands and himoa home',
    leftA === 0 && !existsSync(join(geminiHome, 'himoa')) && !existsSync(join(geminiHome, 'commands/himoa')));
}

// --- Adapter doctors assert their own exit codes ---------------------------
// Same standard as run-doctor-fixtures for himoa-doctor: a doctor whose exit
// code nobody asserts is not a check. Each must FAIL when nothing is installed
// and report OK after a correct install.
{
  const doctor = (host, envOverrides, cwd) => spawnSync(join(pluginRoot, 'bin', `himoa-${host}-doctor`), [], { cwd, env: { ...process.env, ...envOverrides }, encoding: 'utf8' });
  const install = (host, envOverrides, cwd) => spawnSync(join(pluginRoot, 'bin', `himoa-${host}-install`), [], { cwd, env: { ...process.env, ...envOverrides }, encoding: 'utf8' });

  for (const host of ['codex', 'cursor', 'gemini']) {
    const home = freshHome();
    const env = { HOME: home, CODEX_HOME: join(home, '.codex'), GEMINI_HOME: join(home, '.gemini') };
    const notRepo = mkdtempSync(join(tmpdir(), 'himoa-doc-')); tmpRoots.push(notRepo);
    const before = doctor(host, env, notRepo);
    check(`doctor: ${host} FAILs (exit 1) when not installed`, before.status === 1, `exit ${before.status}`);
    install(host, env, repoRoot);
    const after = doctor(host, env, notRepo);
    check(`doctor: ${host} reports OK (exit 0) after install`, after.status === 0, `exit ${after.status}`);
  }

  // Copilot is repo-only: FAILs with no AGENTS.md, OK after --repo bootstrap.
  const home = freshHome();
  const env = { HOME: home, CODEX_HOME: join(home, '.codex') };
  const repo = mkdtempSync(join(tmpdir(), 'himoa-copdoc-')); tmpRoots.push(repo);
  const before = doctor('copilot', env, repo);
  check('doctor: copilot FAILs (exit 1) with no AGENTS.md', before.status === 1, `exit ${before.status}`);
  spawnSync(join(pluginRoot, 'bin', 'himoa-copilot-install'), [], { cwd: repo, env: { ...process.env, ...env }, encoding: 'utf8' });
  const after = doctor('copilot', env, repo);
  check('doctor: copilot reports OK (exit 0) after bootstrap', after.status === 0, `exit ${after.status}`);
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
  const copAgents = readdirSync(join(adapters, 'copilot/agents'));
  check('shape: copilot agents exclude context-mapper (not a review lens; 30k limit)', !copAgents.some((n) => n.includes('context-mapper')));
  for (const f of copAgents) {
    check(`shape: copilot ${f} has name+description`, /^---\nname: himoa-[a-z0-9-]+\ndescription: .+/.test(readFileSync(join(adapters, 'copilot/agents', f), 'utf8')));
  }
  for (const f of readdirSync(join(adapters, 'gemini/agents'))) {
    const fm = readFileSync(join(adapters, 'gemini/agents', f), 'utf8').split('\n---\n')[0];
    check(`shape: gemini ${f} declares read-only tools`, /\ntools:\n/.test(fm) && !/write_file|run_shell_command/.test(fm));
  }
  for (const f of readdirSync(join(adapters, 'gemini/commands/himoa'))) {
    const c = readFileSync(join(adapters, 'gemini/commands/himoa', f), 'utf8');
    check(`shape: gemini command ${f} has description + prompt`, /\ndescription = /.test(c) && /\nprompt = '''/.test(c));
  }
}

for (const d of tmpRoots) rmSync(d, { recursive: true, force: true });
console.log('');
if (failures > 0) { console.error(`FAIL — ${failures} check(s) failed.`); process.exit(1); }
console.log('PASS — Codex and Cursor installers, bootstrap and projection guarantees hold.');
