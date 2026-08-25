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

import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repositoryRoot, 'plugins', 'engineering-framework');
const doctor = join(pluginRoot, 'bin', 'ef-doctor');
const declarationPath = join(pluginRoot, 'reference', 'marketplace-declaration.json');

if (!existsSync(doctor)) {
  console.error(`FAIL  ef-doctor not found at ${doctor}`);
  process.exit(1);
}

// Read the identifiers rather than hardcoding them: a test that hardcodes the
// marketplace name passes after a rename while every consuming repository is
// pointed at a name that no longer exists.
const DECLARATION = JSON.parse(readFileSync(declarationPath, 'utf8'));
const MARKETPLACE = DECLARATION.marketplace;
const PLUGIN_ID = `${DECLARATION.plugin}@${DECLARATION.marketplace}`;

// ef-doctor audits the repository contract and nothing else: the
// framework ships no permission rules and no hooks that gate a command, so
// there is no floor to build, no user settings to control, and no permission
// shape left to assert. Everything below describes a repository, and every case
// reads only that repository.
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
    name: 'project settings are valid JSON of the wrong shape',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': '["not", "an", "object"]',
    },
    exit: 1,
    mustReport: ['FAIL  .claude/settings.json is not a JSON object.'],
  },
  {
    name: 'a repository that declares the dependency is reported as declaring it',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        extraKnownMarketplaces: { [MARKETPLACE]: DECLARATION.entry },
        enabledPlugins: { [PLUGIN_ID]: true },
      },
    },
    exit: 0,
    mustReport: [
      `PASS  Declares the ${MARKETPLACE} marketplace.`,
      `PASS  Enables ${PLUGIN_ID} for this project.`,
      'PASS  Auto-update is on, so releases arrive without an update command.',
    ],
    mustNotReport: ['FAIL'],
  },
  {
    // The quiet failure: fully declared, and silently never updated. Nothing
    // else in the repository records a version that could look stale.
    name: 'a declaration with no autoUpdate is warned about, not passed over',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        extraKnownMarketplaces: { [MARKETPLACE]: { source: DECLARATION.entry.source } },
        enabledPlugins: { [PLUGIN_ID]: true },
      },
    },
    exit: 0,
    mustReport: ['WARN  The marketplace entry does not state autoUpdate.'],
    mustNotReport: ['FAIL'],
  },
  {
    name: 'a deliberate autoUpdate: false is reported as a choice, not a problem',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        extraKnownMarketplaces: { [MARKETPLACE]: { source: DECLARATION.entry.source, autoUpdate: false } },
        enabledPlugins: { [PLUGIN_ID]: true },
      },
    },
    exit: 0,
    mustReport: ['PASS  Auto-update is off, as this project set it.'],
    mustNotReport: ['FAIL', 'WARN  The marketplace entry does not state autoUpdate.'],
  },
  {
    // The declaration is optional, so this is a warning. What it must never be
    // is silence: a repository nobody ever ran the installer in looks exactly
    // like a configured one otherwise.
    name: 'a repository with no declaration at all is warned, not failed',
    build: { 'CLAUDE.md': HEALTHY_CLAUDE_MD },
    exit: 0,
    mustReport: ['WARN  This repository does not declare the engineering framework.'],
    mustNotReport: ['FAIL'],
  },
  {
    name: 'settings that declare nothing of ours leave the other keys alone in the report',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': { permissions: { allow: ['Bash(npm test)'] } },
    },
    exit: 0,
    mustReport: [
      `WARN  Does not declare the ${MARKETPLACE} marketplace.`,
      `WARN  Does not enable ${PLUGIN_ID} for this project.`,
    ],
    mustNotReport: ['FAIL'],
  },
  {
    // Obsolete. A repository that still has one is declaring commands
    // and risk paths that nothing reads, and nothing else would ever say so.
    name: 'an obsolete policy file is named, not parsed',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/engineering-framework.json': { commands: { test: 'make test' } },
    },
    exit: 0,
    mustReport: ['WARN  .claude/engineering-framework.json is no longer read by anything.'],
    mustNotReport: ['FAIL'],
  },
  {
    name: 'declared high-risk paths in CLAUDE.md are reported back so they can be trusted',
    build: {
      'CLAUDE.md': `${HEALTHY_CLAUDE_MD}\n## High-risk paths\n\n| Path | Why |\n|---|---|\n| \`src/auth/*\` | Authentication |\n`,
    },
    exit: 0,
    mustReport: ['PASS  CLAUDE.md declares high-risk paths.'],
  },
  {
    name: 'an unfilled template placeholder in a non-Consumers section',
    build: {
      'CLAUDE.md': `# CLAUDE.md\n\n## Project\n\n_(describe the system)_\n\n## Commands\n\n| Tests | \`make test\` |\n\n## Consumers\n\n| _(none - internal only)_ | | | |\n`,
    },
    exit: 1,
    mustReport: ['FAIL', 'unfilled template placeholder'],
  },
  {
    name: 'a pre-plugin .claude/agents/ directory silently overrides the plugin',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/agents/reviewer.md': '---\nname: reviewer\n---\n',
    },
    exit: 0,
    mustReport: ['WARN  .claude/agents/ still exists alongside the plugin.'],
  },
  {
    name: 'a healthy repository reports no failures at all',
    build: {
      'CLAUDE.md': HEALTHY_CLAUDE_MD,
      '.claude/settings.json': {
        permissions: { allow: ['Bash(make test)'] },
        extraKnownMarketplaces: { [MARKETPLACE]: DECLARATION.entry },
        enabledPlugins: { [PLUGIN_ID]: true },
      },
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
  const result = spawnSync('bash', [doctor, '--path', path], {
    encoding: 'utf8',
    timeout: 20000,
  });
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
