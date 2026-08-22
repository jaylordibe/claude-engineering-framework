# Validation report: [change title]

> The shape of what `gate-validate` returns. Produced in the conversation and
> in the pull request body — never committed as a file. It could not be written
> until after validation ran, which is exactly what makes a committed version a
> guaranteed source of churn.

## Verdict

**PASS** | **FAIL** | **BLOCKED**

Exactly one. Skipped, partial, filtered, unavailable or flaky is never `PASS` —
see `standards/evidence.md`.

## Scope

| | |
|---|---|
| **Worktree or commit** | |
| **Changed files and contracts** | |
| **Risk tier** | |
| **Required checks for this tier** | |
| **Prerequisites unavailable** | each one is a `BLOCKED` row, not an omission |

## Evidence

| Gate | Command or check | Exact scope | When it ran | Result | Notes |
|---|---|---|---|---|---|
| Build / type check | | | this run | | |
| Lint | | | this run | | |
| Unit tests | | filtered to … | this run | | |
| Integration / end-to-end | | filtered to … | this run | | |
| Runtime exercise | | | this run | | |
| Security checks | | | this run | | |
| Data / migration inspection | | read-only | this run | | |

Include a row for every check that was expected and did **not** run. A missing
row and a passing row look identical to a reader in a hurry, which is precisely
when this table gets read.

`When it ran` is `this run` unless the row genuinely re-uses an earlier result,
in which case name where it came from and say what has changed since —
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §7. A result that predates any edit
it is offered as evidence for is a false `PASS`, not a saved command.

Use `N/A` for a gate this repository does not have, with the evidence that it
is genuinely absent, and `BLOCKED` for one that exists and could not run. Only
`BLOCKED` prevents an overall `PASS` — see
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §1.

### What goes in `Notes`

A passing row's note is one line, drawn from what the command actually printed:

```text
PASS — unit tests
Command: <the exact command that ran>
Exit: 0
Tests: <only if the runner printed a count>
Duration: <only if the runner printed one>
```

**Every field is optional except the command and the result.** A count, a
duration or an exit status the runner did not print is left out — never
estimated, never carried over from an earlier run, never reconstructed from
memory. This row is shorter and more confident-looking than the log it replaces,
so a number invented to complete it reads as measured evidence and is not:
that is a false `PASS` in a tidier format, and
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §5 already names what that
destroys.

A failing row's note keeps what diagnoses the failure and nothing around it: the
exit status, the test or check that failed, the error text, and the `path:line`
it points at. Not the whole log, and not a one-word summary of it either — the
next stage has to be able to act on this row without re-running the command.

## Coverage

- **Acceptance criteria covered by evidence:** which, and by which check.
- **Plan risks with no evidence:** each one, explicitly.
- **Review fixes covered by a regression test:** which.

## Data and migration readiness

| | |
|---|---|
| **Migration prepared** | file(s), **not applied** |
| **Shape verified by** | the repository's build or type check |
| **Backfill** | bounded · idempotent · resumable · observable |
| **Deployment order** | |
| **Rollback or roll-forward** | |

## Security evidence

What was actually verified, not what was intended: negative authorization
tests, disclosure behaviour, sensitive-field exclusion, rate limiting, audit
records, log redaction.

State explicitly what a static pass cannot prove.

## Residual risk and blockers

| Risk or blocker | Owner | What resolves it |
|---|---|---|

## Handoff

The work exists **only in the working tree**. The commit, the pull request, the
migration application and the deployment are the human's.

On `FAIL` or `BLOCKED`: name what failed or could not run, and point back to
the review gate or to the missing prerequisite.
