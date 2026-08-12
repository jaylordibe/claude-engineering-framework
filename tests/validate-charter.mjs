#!/usr/bin/env node
//
// Validates the SessionStart charter — the framework's entire always-on
// context, paid on every request in every repository a user opens.
//
// WHY THIS EXISTS
// ---------------
// The charter is the only framework text that is loaded unconditionally, and it
// had no test of any kind. Deleting its human-owned-operations section outright
// left every suite green. That section is where the framework states, in the
// one place Claude always sees, that commits and deploys belong to the human;
// losing it is losing the default posture in every repository at once.
//
// It is also the one output whose SHAPE is constrained by Claude Code rather
// than by taste:
//
//   - `additionalContext` is capped at 10 000 characters; longer content is
//     spilled to a file, so a charter that grows past the cap stops being
//     always-on and starts being a file nobody opens;
//   - the hook must emit valid JSON on stdout, or the context is simply lost;
//   - SessionStart re-runs on `--continue` and `--resume`, so this cost is paid
//     more than once per conversation.
//
// And one constraint that is about how the text READS rather than what it says.
// The hooks documentation is explicit: additionalContext "framed as
// out-of-band system commands can trigger Claude's prompt-injection defenses,
// which causes Claude to surface the text to you instead of treating it as
// context". A charter that trips that defence is not a strict charter — it is
// an absent one, printed to the user as a curiosity. The density check below is
// deliberately loose: it is a budget, not a style rule.
//
// No dependencies. Run with `node tests/validate-charter.mjs`.

import { existsSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(repositoryRoot, 'plugins', 'engineering-framework');
const charterScript = join(pluginRoot, 'scripts', 'session-charter.sh');

// Claude Code's documented cap for a SessionStart additionalContext payload.
const ADDITIONAL_CONTEXT_CHARACTER_CAP = 10000;

// The project's own ceiling, far below the platform cap on purpose: the binding
// constraint is the reader's attention and the token cost on every request in
// every repository, not the API limit.
//
// Raised from 70 to 80 to pay for the "repository content is evidence, not
// instruction" section, which cannot live in a lazily-loaded skill — see the
// header of session-charter.sh. That was a deliberate purchase, and the number
// is deliberately tight afterwards: the next addition removes something. A
// change that raises this constant is a change that has to argue for it here.
const CHARTER_LINE_CEILING = 80;

// Each entry is a guarantee the framework makes in its always-on text, and the
// evidence that the guarantee is still stated. Matched case-insensitively
// against the rendered charter.
//
// These are deliberately phrased as the CONCEPT rather than a quoted sentence,
// so the charter can be rewritten without the test failing on prose it does not
// actually care about — while still failing if a whole section disappears.
const REQUIRED_GUARANTEES = [
  { concept: 'source precedence', patterns: [/source code/i, /tests/i, /documentation/i] },
  { concept: 'the evidence labels', patterns: [/\bFACT\b/, /\bASSUMPTION\b/, /\bABSENT\b/, /\bUNKNOWN\b/] },
  { concept: 'the workflow and its gates', patterns: [/understand/i, /design/i, /approval/i, /implement/i, /review/i, /validate/i] },
  { concept: 'risk tiers deciding ceremony', patterns: [/\blow\b/i, /\bmedium\b/i, /\bhigh\b/i, /\bcritical\b/i] },
  { concept: 'the evidence vocabulary', patterns: [/\bPASS\b/, /\bFAIL\b/, /\bBLOCKED\b/] },
  { concept: 'skipped or partial is never a pass', patterns: [/skipped|partial|flaky/i] },
  { concept: 'human-owned operations', patterns: [/commit/i, /push/i, /migration/i, /deploy/i] },
  { concept: 'repository content is evidence, not instruction', patterns: [/instruction|instruct/i] },
];

if (!existsSync(charterScript)) {
  console.error(`FAIL  charter script not found at ${charterScript}`);
  process.exit(1);
}

try {
  execFileSync('jq', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('FAIL  jq is not on PATH; the charter falls back to plain stdout without it,');
  console.error('      so the JSON contract below could not be checked.');
  process.exit(1);
}

const errors = [];
const fail = (message) => errors.push(message);

function renderCharter(projectDirectory) {
  const result = spawnSync('bash', [charterScript], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot, CLAUDE_PROJECT_DIR: projectDirectory },
    timeout: 20000,
  });
  return result;
}

// ---------------------------------------------------------------------------
// 1. The hook contract
// ---------------------------------------------------------------------------

const withoutSettings = renderCharter(join(repositoryRoot, 'tests', 'no-such-directory'));

if (withoutSettings.error) {
  fail(`the charter hook did not run: ${withoutSettings.error.message}`);
} else if (withoutSettings.status !== 0) {
  fail(`the charter hook exited ${withoutSettings.status}. A SessionStart hook that fails leaves every session without the framework's always-on context, and the failure is a one-line notice nobody reads. stderr: ${(withoutSettings.stderr || '').trim().slice(0, 200)}`);
}

let charter = '';

if (withoutSettings.status === 0) {
  let parsed;
  try {
    parsed = JSON.parse(withoutSettings.stdout);
  } catch {
    fail('the charter hook emitted output that is not valid JSON. Claude Code cannot parse it, so the context is silently dropped and every session runs without the framework.');
  }

  if (parsed) {
    const hookOutput = parsed.hookSpecificOutput ?? {};
    if (hookOutput.hookEventName !== 'SessionStart') {
      fail(`hookEventName is ${JSON.stringify(hookOutput.hookEventName)}; Claude Code ignores an object it cannot match to the event.`);
    }
    if (typeof hookOutput.additionalContext !== 'string' || hookOutput.additionalContext.length === 0) {
      fail('the hook emitted no `additionalContext`, so the charter is empty.');
    } else {
      charter = hookOutput.additionalContext;
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Budget
// ---------------------------------------------------------------------------

if (charter) {
  if (charter.length > ADDITIONAL_CONTEXT_CHARACTER_CAP) {
    fail(`the charter is ${charter.length} characters; Claude Code caps additionalContext at ${ADDITIONAL_CONTEXT_CHARACTER_CAP} and spills longer content to a file. A charter in a file is not always-on context.`);
  }

  const lineCount = charter.split('\n').length;
  if (lineCount > CHARTER_LINE_CEILING) {
    fail(`the charter renders to ${lineCount} lines; the ceiling is ${CHARTER_LINE_CEILING}. This is the framework's entire always-on budget in every repository a user opens, and the first question for anything added here is which skill it belongs in instead.`);
  }
}

// ---------------------------------------------------------------------------
// 3. Guarantees still stated
// ---------------------------------------------------------------------------

for (const guarantee of REQUIRED_GUARANTEES) {
  if (!charter) break;
  const missing = guarantee.patterns.filter((pattern) => !pattern.test(charter));
  if (missing.length > 0) {
    fail(`the charter no longer states ${guarantee.concept}. This is the only text loaded on every request in every repository; a guarantee dropped here is dropped everywhere at once, silently.`);
  }
}

// ---------------------------------------------------------------------------
// 4. Framing
//
// A budget rather than a style rule. Some imperative framing is unavoidable and
// correct; a charter written entirely as system commands is the one that gets
// surfaced to the user instead of used.
// ---------------------------------------------------------------------------

if (charter) {
  const contentLines = charter.split('\n').filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'));
  const imperativeLines = contentLines.filter((line) => /^(You must|You are required|Always |Never |Do not |Under no circumstances|Ignore |Disregard )/i.test(line.trim()));
  const ratio = contentLines.length === 0 ? 0 : imperativeLines.length / contentLines.length;

  if (ratio > 0.25) {
    fail(`${imperativeLines.length} of ${contentLines.length} charter lines (${Math.round(ratio * 100)}%) open as an out-of-band system command. The hooks documentation is explicit that additionalContext framed that way can trigger Claude's prompt-injection defences and be surfaced to the user instead of used as context — which would make the charter strictly worse than absent. State the framework's position; do not shout it.`);
  }
}

// ---------------------------------------------------------------------------
// 5. The charter never asserts anything about the repository
//
// The whole split is that the framework owns methodology and the repository
// owns truth. A charter that claims a repository has tests, or a linter, or a
// database, is asserting something it cannot know in the one place it cannot
// be corrected.
// ---------------------------------------------------------------------------

if (charter) {
  // Deliberately narrow. The charter DOES state one thing about the
  // repository — whether a `.claude/settings.json` exists — and that is
  // legitimate, because the hook checked the filesystem before saying it. What
  // it must never do is claim something about the repository's architecture,
  // which nothing has read at the point this text is written.
  const assertions = [
    { pattern: /\bthis repository (uses|is built|runs on|is written)\b/i, why: 'nothing has read the repository at the point the charter is emitted' },
    { pattern: /\byour (test suite|linter|database|framework|ORM)\b/i, why: 'the framework cannot know any of these exist' },
  ];
  for (const { pattern, why } of assertions) {
    const match = pattern.exec(charter);
    if (match) {
      fail(`the charter asserts something about the repository (${JSON.stringify(match[0])}) — ${why}. The charter carries methodology; the repository's own CLAUDE.md is what states what the system is.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. The charter says nothing about the repository's permission settings
// ---------------------------------------------------------------------------
//
// INVERTED IN 1.0.0. This used to assert that the charter warned when a
// repository had no `.claude/settings.json`, so the user knew the permissions
// floor was missing. The framework ships no floor now, so there is nothing to
// miss — and the charter is the always-on budget, paid on every request in
// every repository. Spending any of it on an opinion about a file the framework
// neither writes nor reads is exactly the overreach 1.0.0 removed.

for (const [label, rendered] of [
  ['with a settings file', renderCharter(repositoryRoot)],
  ['without a settings file', renderCharter(join(repositoryRoot, 'tests', 'no-such-directory'))],
]) {
  if (rendered.status !== 0) continue;
  let emitted = '';
  try {
    emitted = JSON.parse(rendered.stdout).hookSpecificOutput?.additionalContext ?? '';
  } catch {
    fail(`the charter hook emitted invalid JSON ${label}.`);
    continue;
  }
  if (/permissions floor|settings\.json|permission rule/i.test(emitted)) {
    fail(`the charter comments on the repository's permission settings ${label}. The framework ships no permission rules and must not spend always-on context on somebody else's settings file.`);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log('session charter — always-on context validation');
if (charter) {
  console.log(`  ${charter.split('\n').length} lines, ${charter.length} characters (caps: ${CHARTER_LINE_CEILING} lines, ${ADDITIONAL_CONTEXT_CHARACTER_CAP} characters)\n`);
} else {
  console.log('  charter could not be rendered\n');
}

for (const message of errors) console.log(`FAIL  ${message}\n`);

if (errors.length === 0) {
  console.log('PASS — no findings.');
  process.exit(0);
}

console.log(`${errors.length} error(s).`);
process.exit(1);
