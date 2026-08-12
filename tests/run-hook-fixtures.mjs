#!/usr/bin/env node
//
// Runs both PreToolUse guards against their decision tables and asserts every
// decision:
//
//   tests/guard-hook-fixtures.tsv   -> guard-dangerous-commands.sh, framework defaults
//   tests/guard-path-fixtures.tsv   -> guard-protected-paths.sh, framework defaults
//   tests/guard-policy-matrix.tsv   -> guard-dangerous-commands.sh, under each
//                                      repository policy profile below
//
// Requires `jq` on PATH, because both guards fail closed to "ask" without it —
// which would make every row pass as "ask" and prove nothing. That is checked
// explicitly rather than left to produce a confusing table of failures.
//
// WHY THE POLICY MATRIX IS A SEPARATE TABLE WITH A SEPARATE SHAPE
// ---------------------------------------------------------------
// The first two tables answer "with no repository policy, is the decision
// right?". They cannot answer "is it still right once the repository has
// changed the policy?", and that is where the framework makes its strongest
// promises. The matrix rows carry a profile and an expected REASON substring,
// so a row asserts which rule fired rather than only what it concluded — the
// distinction that lets a policy-independent guarantee be deleted without any
// test noticing.

import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDirectory = join(repositoryRoot, 'plugins', 'engineering-framework', 'scripts');
const commandGuard = join(scriptsDirectory, 'guard-dangerous-commands.sh');
const pathGuard = join(scriptsDirectory, 'guard-protected-paths.sh');

// The protected-path guard asks about a migration only when the file already
// EXISTS: one that does not cannot have been applied anywhere, so the checksum
// argument in its reason does not apply to it. That makes these fixtures depend
// on the filesystem, so the table's paths are materialised under a temp root.
//
//   /repository/…  is created before the guard runs — "a file that exists".
//   /unwritten/…   is deliberately never created — "a file being added".
//
// Anything else (a relative path) is passed through untouched, because that is
// the case the guard must stay conservative about.
const pathFixtureRoot = mkdtempSync(join(tmpdir(), 'ef-paths-'));

function materialisePathFixture(filePath) {
  if (!filePath?.startsWith('/repository/') && !filePath?.startsWith('/unwritten/')) {
    return filePath;
  }
  const real = join(pathFixtureRoot, filePath);
  // The containing directory is created either way. The guard's question is
  // "does this directory exist and this file not", so an /unwritten/ row must
  // model a new file in a directory that is already there — which is what
  // adding a migration to an existing repository actually looks like.
  mkdirSync(dirname(real), { recursive: true });
  if (filePath.startsWith('/repository/')) {
    writeFileSync(real, '');
  }
  return real;
}

try {
  execFileSync('jq', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('FAIL  jq is not on PATH. The guards fail closed to "ask" without it,');
  console.error('      so every fixture would pass as "ask" and prove nothing.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Repository policy profiles
//
// Each is a real `.claude/engineering-framework.json` written into a throwaway
// project directory. `null` means no file at all, which is the framework floor
// and what the two default tables run under.
// ---------------------------------------------------------------------------

const POLICY_PROFILES = {
  defaults: null,

  // Every switch a repository is allowed to turn off, turned off. Supported,
  // documented, and until this table existed, entirely untested.
  delegated: {
    policy: {
      humanOwnedGitWrites: false,
      humanOwnedPullRequests: false,
      humanOwnedMigrations: false,
      humanOwnedDeployments: false,
      humanOwnedDependencyInstall: false,
    },
  },

  // The repository owns the whole command policy. The built-in tables stand
  // down; only its own entries apply.
  'no-default-rules': {
    useDefaultCommandRules: false,
    protectedCommands: [
      { match: '*bin/ship*', reason: 'this deploys. It is listed as human-owned in this repository.', decision: 'deny' },
    ],
  },

  // Not valid JSON. Written as a raw string rather than an object so the
  // runner does not accidentally repair it on the way out.
  'hostile-config': '{ "policy": { "humanOwnedGitWrites": false,,, ] this file is corrupt',

  // The most likely honest mistake in a hand-edited file.
  'string-booleans': {
    policy: {
      humanOwnedGitWrites: 'false',
      humanOwnedMigrations: 'false',
      humanOwnedDeployments: 'false',
    },
  },
};

const projectDirectoryFor = (() => {
  const cache = new Map();
  return (profileName) => {
    if (cache.has(profileName)) return cache.get(profileName);

    const directory = mkdtempSync(join(tmpdir(), `ef-profile-${profileName}-`));
    const profile = POLICY_PROFILES[profileName];

    if (profile !== null && profile !== undefined) {
      mkdirSync(join(directory, '.claude'), { recursive: true });
      writeFileSync(
        join(directory, '.claude', 'engineering-framework.json'),
        typeof profile === 'string' ? profile : JSON.stringify(profile, null, 2),
      );
    }

    cache.set(profileName, directory);
    return directory;
  };
})();

// ---------------------------------------------------------------------------
// Guard invocation
// ---------------------------------------------------------------------------

function decisionFor(guardScript, payload, projectDirectory) {
  const result = spawnSync('bash', [guardScript], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDirectory },
    timeout: 20000,
  });

  if (result.error) return { decision: 'error', reason: result.error.message };
  if (result.status !== 0) {
    return { decision: 'error', reason: `exit ${result.status}: ${(result.stderr || '').trim()}` };
  }

  const output = (result.stdout || '').trim();
  if (output === '') return { decision: 'allow', reason: '' };

  try {
    const parsed = JSON.parse(output);
    const hookOutput = parsed.hookSpecificOutput ?? {};
    return {
      decision: hookOutput.permissionDecision ?? 'malformed',
      reason: hookOutput.permissionDecisionReason ?? '',
    };
  } catch {
    return { decision: 'malformed', reason: output.slice(0, 160) };
  }
}

function readTable(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim() !== '' && !line.trimStart().startsWith('#'));
}

// ---------------------------------------------------------------------------
// The three suites
// ---------------------------------------------------------------------------

const SUITES = [
  {
    title: 'command guard (framework defaults)',
    script: commandGuard,
    table: join(repositoryRoot, 'tests', 'guard-hook-fixtures.tsv'),
    subject: 'command',
    columns: 3,
    parse: ([expected, command, note = '']) => ({
      expected: expected?.trim(),
      subject: command,
      note,
      profile: 'defaults',
      reasonSubstring: null,
      script: commandGuard,
      payload: { tool_name: 'Bash', tool_input: { command } },
    }),
  },
  {
    title: 'protected-path guard (framework defaults)',
    script: pathGuard,
    table: join(repositoryRoot, 'tests', 'guard-path-fixtures.tsv'),
    subject: 'path',
    columns: 3,
    parse: ([expected, filePath, note = '']) => ({
      expected: expected?.trim(),
      subject: filePath,
      note,
      profile: 'defaults',
      reasonSubstring: null,
      script: pathGuard,
      payload: { tool_name: 'Edit', tool_input: { file_path: materialisePathFixture(filePath) } },
    }),
  },
  {
    title: 'command guard (repository policy matrix)',
    script: commandGuard,
    table: join(repositoryRoot, 'tests', 'guard-policy-matrix.tsv'),
    subject: 'command',
    columns: 5,
    parse: ([profile, expected, reasonSubstring, command, note = '']) => ({
      expected: expected?.trim(),
      subject: command,
      note,
      profile: profile?.trim(),
      reasonSubstring: reasonSubstring?.trim() === '-' ? null : reasonSubstring?.trim(),
      script: commandGuard,
      payload: { tool_name: 'Bash', tool_input: { command } },
    }),
  },
];

let totalRows = 0;
let totalFailures = 0;

for (const suite of SUITES) {
  if (!existsSync(suite.script)) {
    console.error(`FAIL  guard script not found at ${suite.script}`);
    process.exit(1);
  }
  if (!existsSync(suite.table)) {
    console.error(`FAIL  decision table not found at ${suite.table}`);
    process.exit(1);
  }

  const rows = readTable(suite.table);
  const failures = [];

  for (const { line, lineNumber } of rows) {
    const fields = line.split('\t');
    const row = suite.parse(fields);

    if (!row.expected || !row.subject || fields.length < suite.columns - 1) {
      failures.push({
        lineNumber,
        subject: line,
        why: `malformed row; expected ${suite.columns} tab-separated fields`,
      });
      continue;
    }

    if (!(row.profile in POLICY_PROFILES)) {
      failures.push({
        lineNumber,
        subject: row.subject,
        why: `unknown policy profile "${row.profile}". Profiles are defined in this runner, not in the table.`,
      });
      continue;
    }

    const { decision, reason } = decisionFor(row.script, row.payload, projectDirectoryFor(row.profile));

    if (decision !== row.expected) {
      failures.push({
        lineNumber,
        subject: row.subject,
        why: `expected ${row.expected}, got ${decision}`,
        note: row.note,
        detail: reason,
        profile: row.profile,
      });
      continue;
    }

    // The reason assertion is what makes a policy-independent rule testable:
    // two different rules can produce the same decision, and only the reason
    // says which one actually fired.
    if (row.reasonSubstring && !reason.toLowerCase().includes(row.reasonSubstring.toLowerCase())) {
      failures.push({
        lineNumber,
        subject: row.subject,
        why: `decision ${decision} was correct, but it came from the wrong rule: the reason does not contain "${row.reasonSubstring}"`,
        note: row.note,
        detail: reason,
        profile: row.profile,
      });
    }
  }

  console.log(`${suite.title} — ${rows.length} fixtures\n`);

  for (const failure of failures) {
    console.log(`FAIL  line ${failure.lineNumber}${failure.profile ? ` [${failure.profile}]` : ''}: ${failure.subject}`);
    console.log(`      ${failure.why}`);
    if (failure.note) console.log(`      row exists because: ${failure.note}`);
    if (failure.detail) console.log(`      guard said: ${failure.detail}`);
    console.log('');
  }

  if (failures.length === 0) {
    console.log(`PASS — ${rows.length}/${rows.length} decisions correct.\n`);
  } else {
    console.log(`${failures.length} of ${rows.length} fixtures failed.\n`);
  }

  totalRows += rows.length;
  totalFailures += failures.length;
}

if (totalFailures === 0) {
  console.log(`PASS — ${totalRows} decisions correct across ${SUITES.length} suites.`);
  process.exit(0);
}

console.log(`${totalFailures} of ${totalRows} fixtures failed.`);
process.exit(1);
