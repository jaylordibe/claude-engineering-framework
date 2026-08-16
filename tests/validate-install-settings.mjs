#!/usr/bin/env node
//
// Asserts what `ef-install-settings` actually does to a repository's own
// .claude/settings.json, per starting shape.
//
// WHY THIS EXISTS
// ---------------
// This is the one component of the framework that WRITES to a file the
// repository owns, and the file it writes to may hold permission rules, hooks
// and environment that the repository depends on. Every failure mode here is
// silent from the framework's side and expensive on the consumer's:
//
//   - a merge that drops an unrelated key removes a control someone relies on;
//   - a merge that is not idempotent produces a diff on every run, so the
//     signal that something actually changed is lost in the noise;
//   - a merge that repairs an unparseable file destroys the only copy;
//   - a merge that resolves a conflicting marketplace declaration silently
//     repoints every plugin the other source serves.
//
// None of those are visible to the person who runs the installer, which is
// exactly why they are asserted rather than reviewed.
//
// Each case states a starting repository, runs the script, and asserts the exit
// code, a substring of the report, and the resulting file - including, where it
// matters, that the file was NOT rewritten at all.
//
// No dependencies. Run with `node tests/validate-install-settings.mjs`.

import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repositoryRoot, 'plugins', 'engineering-framework');
const installer = join(pluginRoot, 'bin', 'ef-install-settings');
const declarationPath = join(pluginRoot, 'reference', 'marketplace-declaration.json');

for (const required of [installer, declarationPath]) {
  if (!existsSync(required)) {
    console.error(`FAIL  not found: ${required}`);
    process.exit(1);
  }
}

const declaration = JSON.parse(readFileSync(declarationPath, 'utf8'));
const MARKETPLACE = declaration.marketplace;
const PLUGIN_ID = `${declaration.plugin}@${declaration.marketplace}`;

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function buildRepository(files) {
  const directory = mkdtempSync(join(tmpdir(), 'ef-install-'));
  for (const [relativePath, content] of Object.entries(files ?? {})) {
    const fullPath = join(directory, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return directory;
}

// A throwaway HOME for every run. Nothing this script does may reach the user's
// own settings or Claude Code's plugin state, and the only way to assert that
// is to give it a home directory and prove it stayed empty.
function runInstaller(repositoryPath, extraArguments = []) {
  const fakeHome = mkdtempSync(join(tmpdir(), 'ef-home-'));
  const result = spawnSync('bash', [installer, '--path', repositoryPath, ...extraArguments], {
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env,
      HOME: fakeHome,
      CLAUDE_PROJECT_DIR: '',
      CLAUDE_PLUGIN_ROOT: pluginRoot,
    },
  });
  return {
    exit: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    error: result.error,
    fakeHome,
  };
}

function listFilesRecursively(directory) {
  const found = [];
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...listFilesRecursively(full));
    else found.push(full);
  }
  return found;
}

function settingsPath(repositoryPath) {
  return join(repositoryPath, '.claude', 'settings.json');
}

function readSettings(repositoryPath) {
  const path = settingsPath(repositoryPath);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function snapshot(repositoryPath) {
  const path = settingsPath(repositoryPath);
  if (!existsSync(path)) return null;
  return { bytes: readFileSync(path, 'utf8'), mtimeMs: statSync(path).mtimeMs };
}

const failures = [];
let caseCount = 0;

function check(caseName, condition, why, context) {
  if (!condition) failures.push({ name: caseName, why, context });
}

function runCase(name, body) {
  caseCount += 1;
  try {
    body(name);
  } catch (error) {
    failures.push({ name, why: `the case itself threw: ${error.message}` });
  }
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

runCase('fresh project — no .claude/settings.json at all', (name) => {
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n' });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);
  check(name, existsSync(settingsPath(repository)), '.claude/settings.json was not created', run.output);

  const settings = readSettings(repository);
  check(
    name,
    settings?.extraKnownMarketplaces?.[MARKETPLACE]?.source?.repo === declaration.entry.source.repo,
    'the marketplace declaration is missing or points at the wrong repository',
    JSON.stringify(settings, null, 2),
  );
  check(
    name,
    settings?.enabledPlugins?.[PLUGIN_ID] === true,
    `enabledPlugins["${PLUGIN_ID}"] is not true`,
    JSON.stringify(settings, null, 2),
  );

  // The architecture this replaced put a version and an install marker in the
  // consuming repository. Neither may come back, in any spelling.
  const written = readFileSync(settingsPath(repository), 'utf8');
  check(name, !/version/i.test(written), 'the written settings mention a version; consumer repositories carry no framework version', written);
  check(
    name,
    !existsSync(join(repository, '.claude', 'engineering-framework.json')),
    'a fresh install created .claude/engineering-framework.json',
  );
  check(
    name,
    !written.includes('autoUpdate'),
    'the installer wrote autoUpdate; that preference belongs to the user, not to a project declaration',
    written,
  );
});

runCase('existing unrelated settings survive the merge', (name) => {
  const original = {
    permissions: { allow: ['Bash(npm test)'], deny: ['Read(./.env)'], defaultMode: 'acceptEdits' },
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: './scripts/hello.sh' }] }] },
    env: { MY_FLAG: '1' },
    someFutureKeyThisTestDoesNotUnderstand: { nested: [1, 2, 3] },
  };
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': original });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const settings = readSettings(repository);
  for (const key of Object.keys(original)) {
    check(
      name,
      JSON.stringify(settings?.[key]) === JSON.stringify(original[key]),
      `the unrelated key "${key}" was changed or dropped`,
      JSON.stringify(settings, null, 2),
    );
  }
  check(name, settings?.enabledPlugins?.[PLUGIN_ID] === true, 'the plugin was not enabled', JSON.stringify(settings, null, 2));
});

runCase('another marketplace and another plugin are preserved', (name) => {
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': {
      extraKnownMarketplaces: {
        'another-marketplace': { source: { source: 'github', repo: 'someone/else' }, autoUpdate: true },
      },
      enabledPlugins: { 'another-plugin@another-marketplace': true, 'a-disabled-one@another-marketplace': false },
    },
  });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const settings = readSettings(repository);
  check(
    name,
    settings?.extraKnownMarketplaces?.['another-marketplace']?.source?.repo === 'someone/else',
    'the other marketplace was changed or dropped',
    JSON.stringify(settings, null, 2),
  );
  check(
    name,
    settings?.extraKnownMarketplaces?.['another-marketplace']?.autoUpdate === true,
    "the other marketplace's autoUpdate choice was discarded",
    JSON.stringify(settings, null, 2),
  );
  check(
    name,
    settings?.enabledPlugins?.['another-plugin@another-marketplace'] === true &&
      settings?.enabledPlugins?.['a-disabled-one@another-marketplace'] === false,
    "another plugin's enablement state was changed",
    JSON.stringify(settings, null, 2),
  );
  check(name, settings?.enabledPlugins?.[PLUGIN_ID] === true, 'the framework plugin was not enabled', JSON.stringify(settings, null, 2));
});

runCase("an existing entry's own autoUpdate and Claude-written fields are left alone", (name) => {
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': {
      extraKnownMarketplaces: {
        [MARKETPLACE]: {
          source: declaration.entry.source,
          autoUpdate: true,
          lastUpdated: '2026-08-01T00:00:00.000Z',
        },
      },
    },
  });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const settings = readSettings(repository);
  const entry = settings?.extraKnownMarketplaces?.[MARKETPLACE];
  check(name, entry?.autoUpdate === true, 'the user\'s own autoUpdate choice was discarded by the merge', JSON.stringify(settings, null, 2));
  check(name, entry?.lastUpdated === '2026-08-01T00:00:00.000Z', 'a field Claude Code maintains was discarded', JSON.stringify(settings, null, 2));
  check(name, settings?.enabledPlugins?.[PLUGIN_ID] === true, 'the plugin was not enabled', JSON.stringify(settings, null, 2));
});

runCase('already configured — idempotent, and the file is not rewritten', (name) => {
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': {
      extraKnownMarketplaces: { [MARKETPLACE]: declaration.entry },
      enabledPlugins: { [PLUGIN_ID]: true },
    },
  });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);
  check(name, /Already correct/.test(run.output), 'the report does not say the configuration was already correct', run.output);
  check(name, before.bytes === after.bytes, 'a correct file was rewritten', run.output);
  check(name, before.mtimeMs === after.mtimeMs, 'a correct file was touched even though its contents did not change', run.output);
});

runCase('a correct file formatted differently is still not rewritten', (name) => {
  const body = JSON.stringify(
    {
      extraKnownMarketplaces: { [MARKETPLACE]: declaration.entry },
      enabledPlugins: { [PLUGIN_ID]: true },
    },
    null,
    4,
  );
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': body });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);
  check(name, before.bytes === after.bytes, 'a semantically correct file was reformatted, producing a diff nobody asked for', run.output);
});

runCase('three consecutive runs converge on one stable file', (name) => {
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n' });

  const first = runInstaller(repository);
  check(name, first.exit === 0, `first run: expected exit 0, got ${first.exit}`, first.output);
  const afterFirst = snapshot(repository);

  const second = runInstaller(repository);
  check(name, second.exit === 0, `second run: expected exit 0, got ${second.exit}`, second.output);
  check(name, /Already correct/.test(second.output), 'the second run did not report the configuration as already correct', second.output);
  const afterSecond = snapshot(repository);

  const third = runInstaller(repository);
  check(name, third.exit === 0, `third run: expected exit 0, got ${third.exit}`, third.output);
  const afterThird = snapshot(repository);

  check(name, afterFirst.bytes === afterSecond.bytes, 'the second run changed the file', afterSecond.bytes);
  check(name, afterSecond.bytes === afterThird.bytes, 'the third run changed the file', afterThird.bytes);
  check(name, afterFirst.mtimeMs === afterThird.mtimeMs, 'a converged file was still being touched on every run');

  const settings = readSettings(repository);
  check(
    name,
    Object.keys(settings.extraKnownMarketplaces).length === 1 && Object.keys(settings.enabledPlugins).length === 1,
    'repeated runs produced duplicate entries',
    JSON.stringify(settings, null, 2),
  );
});

runCase('a conflicting marketplace source is surfaced, never replaced', (name) => {
  const original = {
    extraKnownMarketplaces: {
      [MARKETPLACE]: { source: { source: 'github', repo: 'different/repository' } },
    },
  };
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': original });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, /already declared here with a different source/.test(run.output), 'the conflict was not named', run.output);
  check(name, /different\/repository/.test(run.output), 'the report does not show the source already in the file', run.output);
  check(name, before.bytes === after.bytes, 'the conflicting declaration was overwritten', after.bytes);
});

runCase('a marketplace pinned to a ref counts as a different source', (name) => {
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': {
      extraKnownMarketplaces: {
        [MARKETPLACE]: { source: { ...declaration.entry.source, ref: 'v1.1.0' } },
      },
    },
  });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, before.bytes === after.bytes, 'a deliberate version pin was silently unpinned', after.bytes);
});

runCase('an explicitly disabled plugin stops the install rather than flipping silently', (name) => {
  const original = { enabledPlugins: { [PLUGIN_ID]: false } };
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': original });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, /explicitly disabled/.test(run.output), 'the report does not say the plugin is explicitly disabled', run.output);
  check(name, /--enable-disabled/.test(run.output), 'the report does not name the way forward', run.output);
  check(name, before.bytes === after.bytes, 'a committed decision to disable the plugin was overwritten', after.bytes);
});

runCase('--enable-disabled flips it, and says so', (name) => {
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': { enabledPlugins: { [PLUGIN_ID]: false, 'other@elsewhere': false } },
  });
  const run = runInstaller(repository, ['--enable-disabled']);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);
  check(name, /Re-enable/.test(run.output), 'the flip was not reported as a change', run.output);

  const settings = readSettings(repository);
  check(name, settings?.enabledPlugins?.[PLUGIN_ID] === true, 'the plugin was not re-enabled', JSON.stringify(settings, null, 2));
  check(
    name,
    settings?.enabledPlugins?.['other@elsewhere'] === false,
    'another plugin that was deliberately disabled got re-enabled too',
    JSON.stringify(settings, null, 2),
  );
});

runCase('invalid JSON is reported, never repaired and never replaced', (name) => {
  const broken = '{\n  "permissions": { "allow": ["Bash(npm test)"] },\n  // a comment, which JSON does not allow\n}\n';
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': broken });
  const before = snapshot(repository);
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, /not valid JSON/.test(run.output), 'the report does not say the file is unparseable', run.output);
  check(name, /extraKnownMarketplaces/.test(run.output), 'the report does not show what it intended to add', run.output);
  check(name, after.bytes === broken, 'an unparseable settings file was modified', after.bytes);
  check(name, before.mtimeMs === after.mtimeMs, 'an unparseable settings file was touched', after.bytes);
});

runCase('valid JSON of the wrong shape is reported, not merged into', (name) => {
  const wrongShape = '["not", "an", "object"]';
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': wrongShape });
  const run = runInstaller(repository);
  const after = snapshot(repository);

  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, /is not an object/.test(run.output), 'the report does not name the shape problem', run.output);
  check(name, after.bytes === wrongShape, 'a settings file of the wrong shape was overwritten', after.bytes);
});

runCase('a key we merge into that is not an object is diagnosed, not indexed', (name) => {
  for (const owned of ['extraKnownMarketplaces', 'enabledPlugins']) {
    const original = `{"${owned}": "not-an-object", "permissions": {"allow": ["Bash(x)"]}}`;
    const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', '.claude/settings.json': original });
    const run = runInstaller(repository);
    const after = snapshot(repository);

    check(name, run.exit === 1, `${owned}: expected exit 1, got ${run.exit}`, run.output);
    check(
      name,
      run.output.includes(`has a \`${owned}\` that is not an object`),
      `${owned}: the report does not name the malformed key — without this the run ends in raw jq parser noise`,
      run.output,
    );
    check(name, after.bytes === original, `${owned}: the file was modified`, after.bytes);
  }
});

runCase('an existing file keeps its key order when the merge does write', (name) => {
  // jq re-serialises the whole file, so the guarantee worth asserting is that
  // the ORDER of what was already there is preserved and our keys land at the
  // end. Reindentation is unavoidable with a JSON-aware tool and is the price
  // of never text-patching someone's settings; reordering would not be.
  const repository = buildRepository({
    'CLAUDE.md': '# CLAUDE.md\n',
    '.claude/settings.json': JSON.stringify({ zzz: 1, permissions: { allow: [] }, aaa: 2 }, null, 4),
  });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const keys = Object.keys(readSettings(repository));
  check(
    name,
    keys.slice(0, 3).join(',') === 'zzz,permissions,aaa',
    `existing keys were reordered: ${keys.join(', ')}`,
  );
});

runCase('--check reports the pending work and writes nothing', (name) => {
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n' });
  const run = runInstaller(repository, ['--check']);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);
  check(name, /TODO/.test(run.output), 'the report does not name what is missing', run.output);
  check(name, /Nothing was written/.test(run.output), 'the report does not say it wrote nothing', run.output);
  check(name, !existsSync(settingsPath(repository)), '--check created a settings file', run.output);
});

runCase('nothing is ever written outside the repository', (name) => {
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n' });
  const run = runInstaller(repository);

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const homeFiles = listFilesRecursively(run.fakeHome);
  check(
    name,
    homeFiles.length === 0,
    `the installer wrote into the user's home directory: ${homeFiles.join(', ')}`,
    run.output,
  );
});

runCase('the whole repository gains exactly one file', (name) => {
  const repository = buildRepository({ 'CLAUDE.md': '# CLAUDE.md\n', 'src/index.js': '// code\n' });
  const before = listFilesRecursively(repository).sort();
  const run = runInstaller(repository);
  const after = listFilesRecursively(repository).sort();

  check(name, run.exit === 0, `expected exit 0, got ${run.exit}`, run.output);

  const added = after.filter((path) => !before.includes(path));
  check(
    name,
    added.length === 1 && added[0] === settingsPath(repository),
    `expected only .claude/settings.json to appear, got: ${added.join(', ') || '(nothing)'}`,
    run.output,
  );
  // No temporary file may survive the write.
  check(
    name,
    !after.some((path) => path.includes('.ef-install.')),
    'a temporary file was left behind',
    after.join('\n'),
  );
});

runCase('a repository that does not exist fails rather than passing vacuously', (name) => {
  const run = runInstaller(join(tmpdir(), 'ef-install-definitely-not-here'));
  check(name, run.exit === 1, `expected exit 1, got ${run.exit}`, run.output);
  check(name, /no such directory/.test(run.output), 'the report does not name the missing directory', run.output);
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`ef-install-settings — ${caseCount} repository shapes\n`);

for (const failure of failures) {
  console.log(`FAIL  ${failure.name}`);
  console.log(`      ${failure.why}`);
  if (failure.context) {
    console.log(String(failure.context).split('\n').map((line) => `      | ${line}`).join('\n'));
  }
  console.log('');
}

if (failures.length === 0) {
  console.log(`PASS — ${caseCount}/${caseCount} repository shapes handled correctly.`);
  process.exit(0);
}

console.log(`${failures.length} assertion(s) failed across ${caseCount} shapes.`);
process.exit(1);
