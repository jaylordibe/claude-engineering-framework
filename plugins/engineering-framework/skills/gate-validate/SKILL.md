---
name: gate-validate
description: Performs read-only evidence validation for a reviewed change using the repository's own canonical commands and test topology, covering static gates, tests, data and migration safety, security and contract evidence, and runtime behaviour; returns exactly PASS, FAIL or BLOCKED with an evidence table. Never modifies anything to manufacture a pass.
argument-hint: "[scope | risk focus]"
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
model: inherit
effort: high
---

# Validate the reviewed change

Input:

```text
$ARGUMENTS
```

**Validation is read-only.** Never modify source, tests, snapshots, fixtures,
lockfiles, generated output, schema, migrations, configuration or documentation
to make a check succeed. The `disallowed-tools` frontmatter enforces this for
the turn that invokes it.

The vocabulary for everything below is
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md`. Read it first.

## 1. Establish scope

Read: the repository's `CLAUDE.md` · the approved plan · the review report ·
the current diff · the dependency manifest and its scripts · the test runner
configuration · the CI workflow · any service or container definitions the
tests depend on.

State: the exact worktree or commit · the changed files and contracts · the
risk tier · **the required checks for that tier** · any prerequisite that is
unavailable.

## 2. Determine the canonical commands

Take them, in this order of authority:

1. the repository's `CLAUDE.md` canonical-commands section — the repository's
   own statement of how it is verified. A row that is absent was deliberately
   not declared: treat it as undiscovered here and fall through, never as a
   gate that does not exist;
2. the dependency manifest's scripts;
3. the CI workflow — the most reliable statement of what actually must pass.

**Do not invent a command.** A guessed command that happens to exit zero is
worse than no evidence, because it reads as a pass.

When a command cannot be established, distinguish the two cases —
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §1:

- **`N/A`** — this repository genuinely has no such step. State what you
  searched: the dependency manifest, the scripts, the CI workflow, the
  `CLAUDE.md` command table. A repository with no linter is a normal
  repository, and an absent gate must not make `PASS` unreachable.
- **`BLOCKED`** — the step exists but could not run here. That is a problem,
  and it prevents an overall `PASS`.

Use the **checking** form, never the fixing form — a fixing form exits
successfully after rewriting whatever it repaired, so it cannot fail and proves
nothing.

## 3. Preflight safety

Verify before running anything:

- no step targets a development or production data store;
- the test configuration this repository declares is the one in effect;
- destructive test setup, if any, owns a store that exists only for tests;
- required services are available;
- the filtered form of each command is actually supported by the repository's
  runner.

If a preflight check fails, that gate is `BLOCKED`. Do not improvise around it.

## 4. Static gates

Run the repository's build or type check, and its lint check.

Then inspect the diff for things a runner will not catch:

- focused, skipped or disabled tests introduced by the change;
- debug output, placeholder values, or commented-out code;
- unintended lockfile, generated-output or formatting churn;
- new suppressions or disabled rules without a reason;
- entry points added without the access declaration this repository requires;
- persistence records returned directly where the repository uses a deliberate
  output shape;
- secrets, tokens or credentials introduced anywhere in the diff.

## 5. Test gates

Run the affected tests, using the repository's supported filtering. **Label
every filtered or partial run as partial, on the verdict line.**

Run the full suite only when the unit of work is complete or the user asks.

**This gate runs the checks; it does not inherit them.** A focused run from the
implementation or review stage is not this gate's evidence, and a result that
predates any edit made since is not evidence at all —
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §7. Where a result genuinely still
holds because nothing it covers has changed, re-use it and **say in the row that
you did, and what has changed since**. A row whose age is invisible reads as
fresh, and this is the table that gets read in a hurry.

If the suite runs in parallel, confirm the new tests respect the isolation the
topology provides.

Ask `engineering-framework:tester` whether the executed evidence actually
covers the plan, the review fixes and the identified risks — a suite that
passed is not evidence that its assertions were sufficient.

## 6. Data and migration gates

When a persisted shape or its data changed, inspect — without applying
anything:

schema and generated-client compatibility, proved through the build · one
consolidated migration · the correctness of its statements · naming and mapping
conventions · constraints, uniqueness including conditional uniqueness,
indexes and foreign keys · lifecycle and delete behaviour · existing-data and
backfill implications · locks at realistic table size · deployment ordering and
mixed-version safety · the rollback or roll-forward path.

**Do not apply a migration to any live database.** If the repository's test
harness exercises migrations against its own isolated store, that is the only
place a migration may run automatically.

Ask `engineering-framework:data` to assess the evidence.

## 7. Security and contract gates

Validate, as relevant: access declarations on every changed entry point ·
negative tests for unauthenticated, wrong permission, another tenant's record
and another actor's record · not-found versus forbidden disclosure behaviour ·
stable error identifiers and result shapes · sensitive fields excluded at
runtime and in generated artefacts · rate limiting on public and
message-sending paths · audit records with the right actor · log redaction ·
any dependency or security scan this repository actually supports · consumer
compatibility.

Ask `engineering-framework:security` and `engineering-framework:contract`
whether the evidence covers the threat model and the contract.

## 8. Runtime and operational gates

Where a runnable, isolated surface exists, exercise the real success **and**
failure paths.

Verify: timeout behaviour · retry, idempotency and duplicate handling ·
correlation identifiers crossing process boundaries · terminal-failure handling
· status and health responses leaking no internal detail · logs useful and
redacted · rollout and rollback prerequisites present.

Ask `engineering-framework:performance` for asynchronous, integration or
load-sensitive changes.

## 9. Verdict

Return exactly one:

- **PASS** — every required gate ran and passed for the stated scope, and no
  release blocker remains.
- **FAIL** — at least one required gate ran and failed.
- **BLOCKED** — required evidence could not be obtained.

Never convert skipped, unavailable, partial, flaky or unrelated failures into
`PASS`.

## 9.1 Evidence economy — what a result carries forward

This gate runs the repository's **full** canonical checks, so it produces more
raw output than any other, and every line of it that survives into §10 is
carried into the presentation and the pull-request body. The policy is
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §10, which this does
not restate; what follows is what it means for a verdict.

**A check that passed needs one row.** The command, its exact scope, when it
ran, `PASS`. Thousands of successful log lines establish nothing the row does
not, and they cost the reader the attention the failing row needed.

**A check that failed keeps what diagnoses it**, and no more: the exact command,
the exit status, which test or check failed, the error itself, and the
`path:line` it points at. A failure summarised down to "tests failed" is not
evidence either — it is the same defect in the other direction, and it sends
the next stage back to re-run the command to find out what happened.

**Report only fields the command actually produced.** A test count, a duration
or an exit status that the runner did not print is **omitted**, not estimated,
not inferred from a previous run, and not rounded from memory. A concise
summary is more authoritative-looking than the log it replaces, which is
exactly why a number invented to fill it is a false `PASS` in a tidier format.

None of this is a limit on evidence. Nothing here permits dropping a row,
softening a verdict, or omitting a check that did not run —
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §6 requires those rows and §9
above requires the verdict they produce. What it removes is log volume that
proves nothing, and only that.

## 10. Evidence report

Use `${CLAUDE_PLUGIN_ROOT}/templates/validation-report.md`. Include a row for
every check that was expected and did **not** run — a missing row and a passing
row look identical to a reader in a hurry, which is precisely when this table
gets read.

The report goes into the presentation and the pull request — **not** into a
document in the repository. It could not be written until after validation ran,
which is exactly what would make a committed version a guaranteed source of
churn.

Report the verdict exactly as produced. `FAIL` and `BLOCKED` are results, not
omissions to tidy away, and a gate that only ever reports `PASS` records
nothing.

## 11. Handoff

Follow `${CLAUDE_PLUGIN_ROOT}/standards/gate-handoff.md`, starting with its §0
mode table.

There is no next gate. Close with the verdict, the evidence table and the
residual risk.

On `PASS`, state plainly that the work exists **only in the working tree**, and
that the commit, the pull request, the migration application and the deployment
are the user's. Never offer to perform them.

On `FAIL` or `BLOCKED`, name what failed or could not run, and point back to
`gate-review` or to the missing prerequisite.

In conductor mode, continue into the presentation stage rather than closing
here.
