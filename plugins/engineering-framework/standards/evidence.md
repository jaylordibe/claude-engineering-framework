# Evidence standard

How the framework talks about whether something was proven. The vocabulary is
small on purpose: a report that can only say three things cannot blur the
difference between them.

## 1. The three verdicts

| Verdict | Means |
|---|---|
| **PASS** | The required check actually ran, for the stated scope, and succeeded |
| **FAIL** | It ran and failed |
| **BLOCKED** | It could not run, or required evidence could not be obtained |

Everything else — not run, skipped, filtered, partial, flaky, "should be fine",
"unchanged so unaffected" — is **not PASS**. There is no fourth verdict and no
qualified PASS.

A run that only ever reports PASS records nothing. `FAIL` and `BLOCKED` are
results to report, not omissions to tidy away.

### A gate that does not exist here is `N/A`, not `BLOCKED`

`BLOCKED` means a required check *could not run*: the service was down, the
credential was missing, the command failed to start. It is a problem.

A check this repository **does not have** is not a problem. A repository with
no linter, no type checker or no end-to-end suite is a normal repository, and
marking its absent gates `BLOCKED` means the overall verdict can never be
`PASS` — so the gate stops being a signal and starts being an obstacle, and the
first thing anyone does with an obstacle is route around it.

Mark those rows **`N/A`**, with the evidence that they are genuinely absent
rather than undiscovered:

```text
N/A — no lint step: no linter in the dependency manifest, no lint script,
      and no lint job in CI.
```

`N/A` rows do not prevent an overall `PASS`. `BLOCKED` rows do. Getting this
distinction wrong in either direction is a real error: an absent gate reported
as `BLOCKED` devalues the verdict, and a *broken* gate reported as `N/A` hides
a failure.

The overall verdict is `PASS` only when every check that this repository
actually has ran and passed.

## 2. Scope is part of the verdict

A verdict without its scope is unusable. Always state what actually ran:

```text
PASS — <command>, filtered to <scope>
PASS — <command>, full suite
BLOCKED — <command>: <the specific reason it could not run>
```

A filtered or partial run is labelled partial *in the verdict line*, not in a
footnote. "Tests pass" when three of forty specs ran is a false statement, even
when all three passed.

## 3. What each kind of evidence does and does not prove

| Evidence | Proves | Does not prove |
|---|---|---|
| Compiles / type-checks | The shapes agree | Any runtime behaviour |
| Unit tests pass | The tested units behave as asserted | That the assertions are sufficient |
| Integration / end-to-end tests pass | The exercised paths work together | Unexercised paths, or behaviour under concurrency and failure |
| Linter passes | The configured rules are satisfied | Correctness, security, or design |
| Static review | Nobody spotted a defect | The absence of a defect |
| Manual runtime exercise | That path worked once, in that environment | Reproducibility, load behaviour, or other paths |
| A dependency scanner is quiet | No *known* advisory matched | That the code is not vulnerable |

Never claim **secure**, **battle-tested**, **production-ready**, **works** or
**done** more broadly than the row above supports.

## 4. The fixing form of a command is not evidence

Many toolchains ship a checking form and a fixing form of the same tool. The
fixing form exits successfully *after silently rewriting whatever it repaired*,
so it structurally cannot fail and therefore proves nothing.

**Evidence always uses the checking form.** The fixing form is what you run
while writing; the checking form is the gate.

The same applies to any command that regenerates the thing it is checking: if
running it can change the working tree, it is not a gate.

## 5. Never manufacture a pass

During validation, do not modify source, tests, snapshots, fixtures, lockfiles,
generated output, schema, migrations, configuration or documentation in order
to make a check succeed. That converts a FAIL into a false PASS and destroys
the only signal the gate exists to produce.

If a check fails because the change is wrong, the change is what gets fixed —
in the implementation or review stage, then re-reviewed and re-validated.

## 6. Evidence table

Report evidence as a table, one row per check, in the presentation and in the
pull request body:

| Gate | Command or check | Exact scope | When it ran | Result | Notes |
|---|---|---|---|---|---|

Include the checks that were **not** run and why, as `BLOCKED` rows or an
explicit "not applicable" line. A missing row and a passing row look identical
to a reader in a hurry, which is precisely when this table gets read.

**`When it ran` is a column rather than a note**, because §7 makes age part of
whether a row is evidence at all, and anything optional in this table is the
thing that gets left out. Write `this run` for a check executed here, or name
the earlier point it ran from — `before review fixes`, `Stage 3 slice 2` — which
immediately raises the question §7 answers: has anything it covers changed
since? A row that cannot answer that is not evidence, whatever its result says.

## 7. Evidence has an age as well as a scope

A result is evidence about **the working tree as it stood when the command
ran**. Nothing else.

- **A result stays valid while nothing it covers has changed.** Re-running an
  expensive check that nothing has invalidated produces the same row twice and
  proves nothing new. Not re-running it is efficiency, not a gap.
- **Any modification to code the check covers invalidates it, including a fix
  made during review.** A remediation that changed behaviour and reported the
  test run from before the remediation is a false `PASS` — the check ran, it
  passed, and it did not run against this code.
- **Re-use is stated, not assumed.** When a row reports a run from earlier in
  the session, say so, and say what has changed since. A row whose age is
  invisible reads as fresh.

This is the one place efficiency and evidence meet directly, and the direction
is fixed: skipping a re-run because the evidence still holds is correct;
skipping one because re-running is expensive is a fabricated result.
