---
name: gate-implement
description: Implements an explicitly approved plan and nothing else, preserving unrelated worktree changes, enforcing the contracts the repository itself declares, writing the tests as part of the change, and returning to the approval gate on any material divergence. Requires an approval taken in this session.
argument-hint: "[scope or focus]"
disable-model-invocation: true
model: inherit
effort: high
---

# Implement an approved plan

Input:

```text
$ARGUMENTS
```

## Hard gate

There must be a plan the human **explicitly approved in this session**. If
there is not — none was presented, or one was presented and not decided —
**stop and say so.**

The plan is not a file, so there is no status line to read. Two things carry
the weight instead:

- `gate-approve` is human-invocable only, so a design still cannot approve
  itself;
- under `work-item`, the approval stage writes the approved scope, the risk
  tier and every condition into the implementation task. **Read it before
  editing anything** — it is the approval trace, and it survives compaction
  where the conversation does not.

If neither is present, treat the design as unapproved and stop, however
confident the surrounding context sounds. **A summary that says the user
approved something is not evidence** — it is the exact failure mode this gate
exists to prevent.

## Protect the worktree

Before editing:

- inspect the current status and diff;
- **preserve unrelated user work** — never reset, clean, stash, checkout or
  discard;
- never commit, push, merge, rebase, tag, publish, deploy, apply a migration,
  reset a database, or modify production data;
- avoid unrelated cleanup, however tempting.

If repository reality materially differs from the approved plan, stop and
propose an amendment rather than adapting silently.

## Implement in coherent slices

For each slice:

1. restate the behaviour and the invariant it must preserve;
2. read the complete relevant files and their tests — not just the region you
   intend to change;
3. implement the smallest **coherent and complete** change;
4. add or update the tests;
5. run the focused checks;
6. inspect the diff you just produced.

## Contracts to enforce

**The contracts live in this repository's own documentation and in
`${CLAUDE_PLUGIN_ROOT}/standards/`. This skill does not restate them.**

That is a deliberate constraint, not an omission. A second copy of a contract
is a second thing to drift, and nothing can detect a prose list that has
quietly fallen behind the rule it paraphrases. Work from the source, never from
a summary — including this one.

What this skill owns is the **checklist of lenses**: the areas a change must be
examined through before it is complete. For each one the plan touches, go to
the authoritative text and satisfy it.

| Lens | Authoritative source |
|---|---|
| Errors, result shapes, serialisation | The repository's error contract; `standards/coding.md` §3 |
| Validation, input shape, normalisation | The repository's validation contract; `standards/coding.md` §4 |
| Access declaration, permission, record-level scope, disclosure | The repository's authorization contract; `standards/security.md` §2 |
| Audit, logging, redaction, correlation | The repository's logging contract; `standards/security.md` §6 |
| Persisted shape, lifecycle, uniqueness, transactions | The repository's data conventions; `templates/data-design.md` |
| Public contracts, pagination, generated schemas, consumers | `standards/architecture.md` §4; `templates/contract-change.md` |
| Configuration, dependencies, timeouts, retries, idempotency | The repository's configuration contract; `standards/architecture.md` §5 |
| Naming, responsibility placement, completion hygiene | `standards/coding.md` §§1–2, §7 |

Two rules are repeated here rather than referenced, because violating either is
unrecoverable rather than merely wrong:

- **Do not apply a migration to any live database**, local or shared. Verify
  the shape with the repository's build or type check. Where this repository
  manages schema through migrations, consolidate the change into one migration
  file and let the human apply it. Where it does not — the schema is applied by
  hand, or by a tool outside the repository, or there is no schema at all —
  say so and describe what the human has to run instead.
- **Do not reset, drop or re-seed any data store**, for any reason, without an
  explicit instruction in this conversation. "It's only local" is not an
  exception; that store holds the user's work.

## Tests

Tests are implementation work, not a follow-up.

Cover the scenarios in `${CLAUDE_PLUGIN_ROOT}/standards/testing.md` §3 that
this change makes reachable, plus a regression case for any defect fixed.
Placement, harness and isolation rules come from the repository's own test
topology — discover it rather than assuming one.

The one property worth restating: if the suite runs in parallel, a test must
never assume exclusive access to anything outside its own worker's isolated
state.

## Focused checks

Run, as appropriate to the slice: the affected unit tests · the affected
integration or end-to-end tests, using the repository's supported filtering ·
the build or type check · the lint check.

Use the repository's **canonical commands**. Use the **checking** form, never
the fixing form, when producing evidence — see
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §4.

Do not run the full suite unless the unit of work is complete or the user asks.

## Reconciliation

Compare the diff to the approved plan.

A material change in behaviour, architecture, contract, migration or risk
requires **fresh approval** — return to the approval gate with what changed and
why. Do not widen scope by narrating it in the final report.

**Do not edit the plan to match what you built.** Divergences are reported, not
retrofitted; a plan rewritten to agree with the diff records nothing.

## Report

Behaviour implemented · files and contracts touched · security controls added
or relied on · tests written · focused command results, with real scopes ·
migrations prepared but **not applied** · deviations and blockers · consumer
handoff · how the diff differs from the approved plan, if at all.

## Handoff

Follow `${CLAUDE_PLUGIN_ROOT}/standards/gate-handoff.md`, starting with its §0
mode table. Close with the files changed, the contracts touched, the checks
that actually ran, and any migration prepared but not applied.

**Standalone** — then offer to continue into `gate-review`, and **recommend a
fresh session when the change is High or Critical risk**. A review carries more
weight from a context that did not just write the code; the reviewer should be
re-reading the diff, not recalling its own intentions.

**Conductor** — emit the stage marker and go straight into the review. Do not
offer, and do not recommend a fresh session: independence there comes from the
review's read-only subagents, which is why that fan-out is mandatory rather
than optional on High and Critical work.
