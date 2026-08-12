#!/usr/bin/env node
//
// Asserts what `ef-doctor` actually reports, per repository shape.
//
// WHY THIS EXISTS
// ---------------
// CI ran ef-doctor across every fixture and discarded the result with `|| true`,
// printing output nobody asserted. That is a smoke test at best: it proves the
// script does not crash. It cannot tell a doctor that reports a real problem
// from one that reports nothing at all, and "reports nothing" is the failure
// mode that matters — a doctor whose checks silently stopped firing looks
// exactly like a healthy repository.
//
// Two kinds of case run here:
//
//   1. **Fixture repositories** — the same ones the agents are evaluated
//      against, so the doctor's view of them stays pinned alongside.
//   2. **Synthetic repositories** built in a temp directory — the broken
//      configurations that matter most and that no fixture should contain,
//      because a fixture exists to be read by an agent and these exist to be
//      diagnosed. A permissions file that is valid JSON of the wrong shape is
//      not something to leave lying in fixtures/.
//
// Every case asserts the exit code AND a substring of the report, because an
// exit code alone cannot distinguish "found the problem I planted" from "found
// a different problem and missed mine".
//
// No dependencies. Run with `node tests/run-doctor-fixtures.mjs`.

import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const doctor = join(repositoryRoot, 'plugins', 'engineering-framework', 'bin', 'ef-doctor');

if (!existsSync(doctor)) {
  console.error(`FAIL  ef-doctor not found at ${doctor}`);
  process.exit(1);
}

// A minimal valid floor, so a synthetic case that is not about permissions does
// not fail for a reason it was not written to test.
const MINIMAL_FLOOR = {
  permissions: {
    deny: ['Bash(git commit *)', 'PowerShell(git commit *)', 'Bash(git push *)', 'PowerShell(git push *)', 'Bash(gh pr create *)', 'PowerShell(gh pr create *)'],
    ask: [],
    allow: [],
  },
};

// Read from the shipped floor rather than invented, so the threshold in
// ef-doctor is asserted against the tier a real install actually produces.
const GENEROUS_ALLOW_TIER = JSON.parse(
  readFileSync(join(repositoryRoot, 'plugins', 'engineering-framework', 'reference', 'permissions-floor.json'), 'utf8'),
).permissions.allow;

function buildRepository(files) {
  const directory = mkdtempSync(join(tmpdir(), 'ef-doctor-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(directory, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return directory;
}

const HEALTHY_CLAUDE_MD = `# CLAUDE.md

## Project

A service.

## Canonical commands

| Purpose | Command |
|---|---|
| Tests | \`make test\` |

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| _(none - internal only)_ | | | |
`;

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

const CASES = [
  // ── The fixture corpus ───────────────────────────────────────────────────
  {
    name: 'fixture nestjs-api — a repository that satisfies the contract',
    path: join(repositoryRoot, 'fixtures', 'nestjs-api'),
    exit: 0,
    mustReport: ['PASS  CLAUDE.md exists.', 'PASS  Consumers table is filled in.'],
    mustNotReport: ['FAIL'],
  },
  {
    name: 'fixture laravel-api — an unfilled Consumers table is a failure',
    path: join(repositoryRoot, 'fixtures', 'laravel-api'),
    exit: 1,
    mustReport: ['FAIL  The Consumers table still holds the template placeholder.'],
  },
  {
    name: 'fixture minimal-repository — no contract at all is the headline',
    path: join(repositoryRoot, 'fixtures', 'minimal-repository'),
    exit: 1,
    mustReport: ['FAIL  CLAUDE.md is missing.'],
  },
  {
    name: 'fixture vue-app — a deliberately empty Consumers table passes',
    path: join(repositoryRoot, 'fixtures', 'vue-app'),
    exit: 0,
    mustReport: ['PASS  Consumers table is filled in.'],
    mustNotReport: ['FAIL'],
  },
  {
    name: 'fixture generic-node — no Consumers section is a warning, not a failure',
    path: join(repositoryRoot, 'fixtures', 'generic-node'),
    exit: 0,
    mustReport: ['WARN  CLAUDE.md has no Consumers section.'],
  },

  // ── Synthetic: the configurations that fail dangerously ─────────────────
  {
    name: 'settings.json is not valid JSON — none of the floor is in force',
    build: { 'CLAUDE.md': HEALTHY_CLAUDE_MD, '.claude/settings.json': '{ "permissions": { "deny": [ ,,, ' },
    exit: 1,
    mustReport: ['FAIL', 'not valid JSON'],
  },
  {
    name: 'inert Write() path rules read as protection and are never consulted',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': { permissions: { deny: [...MINIMAL_FLOOR.permissions.deny, 'Write(src/**)'], ask: [], allow: [] } },
    },
    exit: 1,
    mustReport: ['FAIL  Inert file rules present', 'Write(src/**)'],
  },
  {
    name: 'Bash rules unmirrored for PowerShell disappear on Windows',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': { permissions: { deny: ['Bash(git commit *)', 'Bash(git push *)', 'Bash(gh pr create *)'], ask: [], allow: [] } },
    },
    exit: 0,
    mustReport: ['WARN  Bash rules are not mirrored as PowerShell rules.'],
  },
  {
    name: 'an empty deny list is a documented promise with nothing behind it',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': { permissions: { deny: [], ask: [], allow: [] } },
    },
    exit: 0,
    mustReport: ['WARN  permissions.deny is empty.'],
  },
  {
    // The drift a merge can never repair. framework-install adds and never
    // overwrites, so a rule the floor WITHDRAWS survives in every repository
    // that already had it. v0.3.0 withdrew five coarse ask rules and, in an
    // already-installed repository, all five stayed, ask still beat allow,
    // and the release removed none of the noise it existed to remove.
    //
    // A rule count cannot see this: the allow tier grows while the stale ask
    // rule quietly outranks it, so the repository looks healthier as it gets
    // worse.
    name: 'a withdrawn floor rule still installed keeps outranking the allow tier',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        permissions: {
          ...MINIMAL_FLOOR.permissions,
          ask: ['Bash(docker exec *)', 'PowerShell(docker exec *)'],
          allow: GENEROUS_ALLOW_TIER,
        },
      },
    },
    exit: 0,
    mustReport: ['WARN  Withdrawn floor rules are still installed: Bash(docker exec *), PowerShell(docker exec *)'],
  },
  {
    // The neighbouring legitimate case: an ask rule that the floor never
    // withdrew must not be reported as stale.
    name: 'an ask rule the floor still ships is not withdrawal drift',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        permissions: {
          ...MINIMAL_FLOOR.permissions,
          ask: ['Bash(psql *)', 'PowerShell(psql *)'],
          allow: GENEROUS_ALLOW_TIER,
        },
      },
    },
    exit: 0,
    mustReport: ['PASS  No withdrawn floor rules remain installed.'],
  },
  {
    // The floor before v0.3.0 shipped seven allow rules, so every ordinary
    // command prompted. Twenty reflex approvals per feature are worth less
    // than one that is read, and this warning is what tells a repository that
    // installed the old floor to take the new one.
    name: 'a thin allow tier means every ordinary command prompts',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        permissions: {
          ...MINIMAL_FLOOR.permissions,
          allow: ['Bash(git status *)', 'PowerShell(git status *)'],
        },
      },
    },
    exit: 0,
    mustReport: ['WARN  permissions.allow holds only 2 rules.'],
  },
  {
    // The neighbouring legitimate case: a repository that installed the
    // current floor must not be nagged about it.
    name: 'a floor-sized allow tier is not a finding',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        permissions: {
          ...MINIMAL_FLOOR.permissions,
          allow: GENEROUS_ALLOW_TIER,
        },
      },
    },
    exit: 0,
    mustNotReport: ['WARN  permissions.allow holds only'],
  },
  {
    name: 'policy file is valid JSON of the wrong shape',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': '["not", "an", "object"]',
    },
    exit: 1,
    mustReport: ['FAIL', 'not an object'],
  },
  {
    name: 'policy switches written as strings are ignored by the guards',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': { policy: { humanOwnedGitWrites: 'false' } },
    },
    exit: 1,
    mustReport: ['FAIL  Policy switches that are not booleans', 'humanOwnedGitWrites=false'],
  },
  {
    name: 'a delegated policy is reported, with what survives it',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': { policy: { humanOwnedGitWrites: false } },
    },
    exit: 0,
    mustReport: ['WARN  Relaxed policy: humanOwnedGitWrites', 'stay denied regardless'],
  },
  {
    name: 'declared high-risk paths are reported back so they can be trusted',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': { risk: { highRiskPaths: ['*/src/auth/*', '*/src/billing/*'] } },
    },
    exit: 0,
    mustReport: ['PASS  risk.highRiskPaths declares 2 path pattern(s).'],
  },
  {
    name: 'declared canonical commands are reported back',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': { commands: { test: 'make test', lint: 'make lint' } },
    },
    exit: 0,
    mustReport: ['PASS  commands declares: lint, test'],
  },
  {
    name: 'an unfilled template placeholder in a non-Consumers section',
    build: {
      'CLAUDE.md': `# CLAUDE.md\n\n## Project\n\n_(describe the system)_\n\n## Commands\n\n| Tests | \`make test\` |\n\n## Consumers\n\n| _(none - internal only)_ | | | |\n`,
      '.claude/settings.json': MINIMAL_FLOOR,
    },
    exit: 1,
    mustReport: ['FAIL', 'unfilled template placeholder'],
  },
  {
    name: 'a pre-plugin .claude/agents/ directory silently overrides the plugin',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/agents/reviewer.md': '---\nname: reviewer\n---\n',
    },
    exit: 0,
    mustReport: ['WARN  .claude/agents/ still exists alongside the plugin.'],
  },
  {
    name: 'a healthy repository reports no failures at all',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': MINIMAL_FLOOR,
      '.claude/engineering-framework.json': { commands: { test: 'make test' } },
    },
    exit: 0,
    mustNotReport: ['FAIL'],
  },
  {
    name: 'a directory that does not exist fails rather than passing vacuously',
    path: join(tmpdir(), 'ef-doctor-definitely-not-here'),
    exit: 1,
    mustReport: ['FAIL  no such directory'],
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const failures = [];

for (const testCase of CASES) {
  const path = testCase.path ?? buildRepository(testCase.build);
  const result = spawnSync('bash', [doctor, '--path', path], { encoding: 'utf8', timeout: 20000 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.error) {
    failures.push({ name: testCase.name, why: `ef-doctor did not run: ${result.error.message}` });
    continue;
  }

  if (result.status !== testCase.exit) {
    failures.push({
      name: testCase.name,
      why: `expected exit ${testCase.exit}, got ${result.status}`,
      output,
    });
    continue;
  }

  for (const required of testCase.mustReport ?? []) {
    if (!output.includes(required)) {
      failures.push({
        name: testCase.name,
        why: `exit code was right but the report never says ${JSON.stringify(required)} — the check that was supposed to fire did not, and a different one produced the same exit code.`,
        output,
      });
    }
  }

  for (const forbidden of testCase.mustNotReport ?? []) {
    if (output.includes(forbidden)) {
      failures.push({
        name: testCase.name,
        why: `the report contains ${JSON.stringify(forbidden)}, which this repository shape must not produce.`,
        output,
      });
    }
  }
}

console.log(`ef-doctor — ${CASES.length} repository shapes\n`);

for (const failure of failures) {
  console.log(`FAIL  ${failure.name}`);
  console.log(`      ${failure.why}`);
  if (failure.output) {
    console.log(failure.output.split('\n').map((line) => `      | ${line}`).join('\n'));
  }
  console.log('');
}

if (failures.length === 0) {
  console.log(`PASS — ${CASES.length}/${CASES.length} repository shapes diagnosed correctly.`);
  process.exit(0);
}

console.log(`${failures.length} of ${CASES.length} shapes failed.`);
process.exit(1);
