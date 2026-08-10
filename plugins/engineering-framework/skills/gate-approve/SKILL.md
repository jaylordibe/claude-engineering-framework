---
name: gate-approve
description: Reads a presented design back to the human — recommendation, rejected alternatives, contract and data impact, residual risk, deliberate non-goals and every unresolved blocker — then takes an explicit approve or reject decision and stops without implementing. Only a human can start this gate.
argument-hint: "[design under discussion]"
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
model: inherit
effort: high
---

# Approve or reject a design

Input:

```text
$ARGUMENTS
```

## What this gate is

`disable-model-invocation: true` is the control that makes this skill safe:
**Claude can never invoke it.** Only a human typing the command starts it, so a
design cannot approve itself no matter what the surrounding context concludes.

That control lives in this frontmatter. It does not depend on any file, any
status line, or anything a summary could claim.

**Never infer approval.** "Looks good", "nice", "ok" said while discussing
something else is not an approval. If this skill was invoked the user intends
to decide now; if their instruction is ambiguous about *which* decision, ask.

## 1. Establish what is being decided

There must be a design on the table — one `gate-design` presented in this
session, or one the user has just described. If there is not, say so and stop:
there is nothing to approve.

If the design is more than a few days old, or the worktree has moved under it,
**re-verify it against the repository before reading it back.** Approving a
design whose evidence has gone stale is approving a decision about a codebase
that no longer exists. Say plainly what no longer holds, and recommend
`gate-design` instead.

## 2. Read it back before they decide

An approval nobody re-read is a rubber stamp, and the whole value of this gate
is that it is the last moment before source changes.

Present, concisely and in your own words rather than quoted:

- the **recommendation**, and the trade-off accepted by rejecting the
  alternatives;
- **contract and data impact**, naming affected consumers;
- **residual security and privacy risk**;
- the **rollback or roll-forward path**;
- **what this deliberately does NOT do** — scope disappointment surfaces here
  far more often than technical objection;
- **every unresolved blocker, individually.**

## 3. Unresolved blockers

If anything is unresolved, the user must either resolve it or **explicitly
accept it as a condition**. Name each one and ask which. Do not let an open
blocker pass silently into an approval, and record exactly what they said they
were accepting — **verbatim, never paraphrased**.

If a blocker questions whether the change should happen at all, say so directly
and offer rejection as the live option it is.

## 4. Take the decision

Only after an explicit, unambiguous decision this turn.

**On approval**, state back in one line what was approved and any conditions in
the user's own words. Those conditions bind the implementation exactly as the
design does: if one adds scope, the implementation covers it; if one removes
scope, the implementation stops there.

**On rejection**, say what would have to change for a new design to supersede
this one, and stop.

There is no status line and no file to write. The approval is the decision
itself, and it authorises implementation **in this session only** — it does not
carry to a later one, where the design would have to be presented again.

## 5. Stop

Do not implement, commit, push, or apply a migration. The user owns the commit
that makes this approval real.

## 6. Handoff

Follow `${CLAUDE_PLUGIN_ROOT}/standards/gate-handoff.md`, starting with its §0
mode table.

On approval, offer to continue into `gate-implement` in this session, or to
stop so they run it themselves. **Recommend stopping when the change is High or
Critical risk.**

On rejection there is no next gate.

### This gate is not part of a conductor run

A live `work-item` pipeline takes its approval inline, from a plan-mode
decision. It does not route through this command, and it must not ask a second
time after the user has already approved — that is one decision presented
twice.

This skill is for a design decided **outside** that flow: presented in an
earlier session, resumed after compaction, or produced by `gate-design`
standalone.
