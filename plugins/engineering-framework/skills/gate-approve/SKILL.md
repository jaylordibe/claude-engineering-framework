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

"The worktree has moved under it" has a method rather than a feeling:
`${CLAUDE_PLUGIN_ROOT}/standards/resumption.md` §5 and §6 own it. Compare what
changed against what this design rests on — its cited evidence, the files it
intended to change, the surfaces it declared affected — not against a commit
identifier. An unrelated change is not staleness, and a change to a file the
design was written about is, whoever made it.

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
- **the smallest approach that was on the table, and the requirement that
  defeated it** — this is the last moment the human can ask for the smaller
  one, and everything after it is them paying for the larger;
- **for a defect, the root cause and its label** — demonstrated, or `UNKNOWN`
  with a mitigation offered in its place;
  `${CLAUDE_PLUGIN_ROOT}/skills/domain-debugging/SKILL.md` owns what
  demonstrated means;
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

**Where the rejection is that the design is too large, the next one is
re-derived, not reduced.** Go back to the outcome in the human's own words and
build up from nothing. Do not take the rejected plan and subtract from it: a
plan edited down keeps the shape that was rejected — the same tables with one
removed, the same module behind a thinner interface — and comes back needing
the same objection again. A sequence of shrinking plans is not convergence. It
is the first answer, defended.

There is no status line to set. The approval is the decision itself.

### What the approval survives, and what ends it

An approval authorises implementation **of this run**, and a run is not a
process. Getting this precise matters, because the imprecise version stopped
correctly approved work: the host restores a resumed session's whole
conversation, so "this session" no longer names one thing.

An approval **survives** compaction, and survives the session being closed and
resumed later — but **only** while carried by a trace holding the human's own
words, in the run state file
`${CLAUDE_PLUGIN_ROOT}/standards/resumption.md` §3 governs. Under `work-item`
that trace is written here, before implementation touches anything.

An approval **ends** on any of these, and the answer is
`RE-APPROVAL REQUIRED`, never a wider reading of what was already said:

- no trace, or a trace with no verbatim human words in it;
- the repository moved under the design — §6 there returned
  `REVALIDATE DESIGN` or `BLOCKED`;
- a material divergence from what was approved became necessary;
- the work is High or Critical and the approval's provenance is uncertain at
  all.

A design presented in an earlier session with **no trace behind it** is
unapproved. It is presented again, here, and decided again — however confidently
a summary describes the decision that was supposedly taken.

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
