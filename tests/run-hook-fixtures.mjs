#!/usr/bin/env node
//
// Runs the command guard against tests/guard-hook-fixtures.tsv and asserts
// every decision.
//
// Requires `jq` on PATH, because the guard fails closed to "ask" without it —
// which would make every row pass as `ask` and prove nothing. That is checked
// explicitly rather than left to produce a confusing table of failures.

import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guardScript = join(repositoryRoot, 'plugins', 'engineering-framework', 'scripts', 'guard-dangerous-commands.sh');
const fixturesFile = join(repositoryRoot, 'tests', 'guard-hook-fixtures.tsv');

if (!existsSync(guardScript)) {
  console.error(`FAIL  guard script not found at ${guardScript}`);
  process.exit(1);
}

try {
  execFileSync('jq', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('FAIL  jq is not on PATH. The guard fails closed to "ask" without it,');
  console.error('      so every fixture would pass as "ask" and prove nothing.');
  process.exit(1);
}

// An empty project directory, so the fixtures exercise the framework defaults
// rather than this repository's own policy file.
const emptyProjectDirectory = mkdtempSync(join(tmpdir(), 'ef-fixtures-'));

function decisionFor(command) {
  const result = spawnSync('bash', [guardScript], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: emptyProjectDirectory },
    timeout: 15000,
  });

  if (result.error) return { decision: 'error', detail: result.error.message };
  if (result.status !== 0) {
    return { decision: 'error', detail: `exit ${result.status}: ${(result.stderr || '').trim()}` };
  }

  const output = (result.stdout || '').trim();
  if (output === '') return { decision: 'allow', detail: '' };

  try {
    const parsed = JSON.parse(output);
    const hookOutput = parsed.hookSpecificOutput ?? {};
    return {
      decision: hookOutput.permissionDecision ?? 'malformed',
      detail: hookOutput.permissionDecisionReason ?? '',
    };
  } catch {
    return { decision: 'malformed', detail: output.slice(0, 160) };
  }
}

const rows = readFileSync(fixturesFile, 'utf8')
  .split('\n')
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => line.trim() !== '' && !line.trimStart().startsWith('#'));

const failures = [];

for (const { line, lineNumber } of rows) {
  const [expected, command, note = ''] = line.split('\t');

  if (!expected || !command) {
    failures.push({ lineNumber, command: line, expected: '-', actual: 'malformed row', note: 'expected <decision>\\t<command>\\t<why>' });
    continue;
  }

  const { decision, detail } = decisionFor(command);

  if (decision !== expected.trim()) {
    failures.push({ lineNumber, command, expected: expected.trim(), actual: decision, note, detail });
  }
}

console.log(`command guard — ${rows.length} fixtures\n`);

for (const failure of failures) {
  console.log(`FAIL  line ${failure.lineNumber}: ${failure.command}`);
  console.log(`      expected ${failure.expected}, got ${failure.actual}`);
  if (failure.note) console.log(`      row exists because: ${failure.note}`);
  if (failure.detail) console.log(`      guard said: ${failure.detail}`);
  console.log('');
}

if (failures.length === 0) {
  console.log(`PASS — ${rows.length}/${rows.length} decisions correct.`);
  process.exit(0);
}

console.log(`${failures.length} of ${rows.length} fixtures failed.`);
process.exit(1);
