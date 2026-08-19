# Gate handoff contract

Every gate ends the same way. A developer must never finish a gate wondering
what happens next, and must never have to reconstruct the sequence from memory.

This file is the single source of that behaviour. Each gate references it
rather than restating it, so the sequence can only be changed in one place.

## 0. Establish the mode first

A gate ends differently depending on **how it was entered**, and getting this
wrong is the difference between a pipeline and an interrogation. Decide before
writing anything.

| Mode | You are in it when | How the gate ends |
|---|---|---|
| **Standalone** | The human typed `/engineering-framework:gate-design`, `:gate-approve`, `:gate-implement`, `:gate-review` or `:gate-validate` directly | §1, §2, §3 — close, name the next command, ask whether to continue |
| **Conductor** | You are executing a `/engineering-framework:work-item` stage, reading this gate's `SKILL.md` as that stage's playbook | §1 and §4 only. Emit the pipeline ledger in §5 and **continue immediately** |

**In conductor mode you must not ask whether to continue.** `work-item` already
carries the human's authorisation for the whole pipeline, and its two real
stops — plan approval and the present/push boundary — are gates in their own
right, enforced elsewhere. Re-asking at every stage boundary adds no safety
property; it converts one authorisation into four confirmations of a decision
already made.

The rigor is identical in both modes. §1 still runs, every subagent panel still
fans out, every check still executes, and every stop condition in §4 still
stops. The only thing conductor mode removes is the prompt.

## 1. Close the gate

State, in this order and nothing more:

1. **Outcome** — one line. What this gate concluded.
2. **What changed on disk** — the files touched, or explicitly "nothing
   changed" for a read-only gate. The design itself is a plan, not a file.
3. **Evidence** — only checks that actually ran, with their real result, in the
   vocabulary of `standards/evidence.md`. A gate that could not run something
   says `BLOCKED`, never nothing.
4. **Anything that blocks the next gate** — unresolved blockers, failing
   checks, Critical or High findings, missing prerequisites.

## 2. Name the next step concretely — standalone only

Print the next command **with its argument already filled in**, so it can be
run without the developer looking anything up.

Never write a placeholder in a handoff. A placeholder is for documentation; a
handoff is for doing.

| Just finished | Next | Skip only when |
|---|---|---|
| `gate-design` | `gate-approve` | the design is incomplete — say so and stop; or the change is **Low risk with no plan document**, in which case the next step is implementation and there is nothing to approve |
| `gate-approve` | `gate-implement` | the decision was Rejected |
| `gate-implement` | `gate-review` | never |
| `gate-review` | `gate-validate` | a Critical or High finding is unresolved |
| `gate-validate` | human commit / pull request | the verdict is `FAIL` or `BLOCKED` |

## 3. Offer to continue — standalone only

Ask with `AskUserQuestion` — a real choice, not a rhetorical one. One question,
with options that are honest about what actually happens:

- **Yes, continue now** — proceed in this session, following the next gate's
  `SKILL.md` as its authoritative contract. This is the same mechanism
  `work-item` uses; it is a continuation of work the user just authorised, not
  Claude deciding to run a gate on its own.
- **Stop here** — the user runs the next gate themselves, in a fresh session.
- A third option only when the state warrants one: *Revise the design*,
  *Reject the design*, *Fix findings first*.

If the user declines, stop cleanly. Do not re-ask, and do not drift into the
next gate's work anyway.

### When to recommend a fresh session instead

Say so plainly, and make **Stop here** the recommended option, when:

- the change is **High or Critical** risk and the next gate is `gate-review` —
  a review carries more weight from a context that did not just write the code;
- the conversation is long enough that compaction has occurred, so the next
  gate would start from a summary rather than the real diff;
- the previous gate ended `FAIL` or `BLOCKED`.

Independence is a property of the review, not a formality. Continuing is a
convenience for ordinary work, not the default for risky work.

**None of this applies in conductor mode**, where independence is supplied by
the review's subagents instead of by a human checkpoint — see §5.

## 4. What continuing never authorises

Continuing carries the user's authorisation for the **next gate only**. It
never authorises:

- skipping a gate in the sequence;
- committing, pushing, opening a pull request, tagging, releasing or deploying;
- applying a migration or mutating a database;
- approving a design the user has not explicitly decided on;
- reporting a check as passed when it did not run.

In standalone mode each gate re-asks at its own end: answering "yes" once does
not run the rest of the pipeline. If the user wants the whole sequence in one
pass, that is `/engineering-framework:work-item`, which needs no issue key.

**This section binds both modes.** Conductor mode removes the prompt between
stages; it removes nothing from this list.

## 5. Closing a gate in conductor mode

Close with §1, then re-emit the **pipeline ledger** and **keep working**. No
next-command line, no `AskUserQuestion`, no fresh-session recommendation.

### The pipeline ledger

The ledger is the run's position, written out in full. A developer watching a
pipeline that stops twice over a long session must be able to see, in the
message in front of them, which stage is running, which are behind it and what
each one concluded — without scrolling back or asking.

```text
Pipeline — <the work item, one line>
[x] 1 Understand   Standard band · risk High · map complete
[x] 2 Design       GATE 1 · approved 2 conditions, verbatim below
[>] 3 Implement    slice 2 of 3
[ ] 4 Review
[ ] 5 Validate
[ ] 6 Present      HUMAN GIT / RELEASE GATE
[ ] 7 Report to issue tracker
```

`[x]` complete · `[>]` in progress · `[ ]` not started · `[-]` skipped, which
always carries its reason. **Exactly one stage is `[>]`.** A completed stage
keeps a short result clause — the evidence in a few words, never a paragraph,
because the detail is in the §1 close directly above it.

Emit it in full at every one of these, and nowhere else it would be noise:

- the first response of the run, before Stage 1 begins;
- every stage transition;
- immediately after an approval decision;
- the first response after compaction, once the state has been re-read;
- whenever one of the stops below fires, so the stop is read against a position
  rather than in isolation;
- the final response of the run.

### The ledger depends on nothing

**You write the ledger yourself, in the message.** It is not a tool call, and
no host feature has to be present for it to work.

This is deliberate and it is not a preference. A host task-list tool is a
*display* of the run's position, never the record of it: current models are not
given those tools by default, so a conductor that keeps its position only there
shows the developer an empty panel and, after compaction, has lost its own
place. Durable state is covered by the conductor's own rule; the ledger covers
being *visible*, and a run that is silent about where it is has already failed
the developer watching it.

When the host does provide a task list, mirror these seven stages into it so
the panel and the ledger say the same thing, and keep emitting the ledger
anyway. When it does not, nothing about the run changes.

**Provided is not the same as loaded, and the difference is where this failed
silently.** A host may *list* a tool it has not handed over — named in the
session's inventory of what it can load on request, callable only once the run
asks for it by name. A conductor that answers "does this session have a task
list?" from the tools already in front of it reads that as *no*, skips the
mirror, and shows the developer the empty panel this section exists to prevent
— in a session that had the tool the whole time.

So answer from both: what is already callable, **and** what the host says it
can load. If it is only in the second, load it once, at Stage 1, by the
mechanism that session documents for acquiring a listed tool; one attempt, and
the answer then stands for the rest of the run. If it is in neither, or the
attempt fails, this session has none.

**Never retry it, never let a stage wait on it, and never report a mirroring
failure as a stage failure.** The ledger is the guarantee; the panel is the
display, and this rule is about the display.

### Preserving review independence without a human stop

The fresh-session rule in §3 protects a real property: whoever reviews the diff
should not be the context that just wrote it. Conductor mode keeps that
property by structure rather than by pausing. On **High or Critical** work,
the review stage must:

- fan out to the risk tier's full panel of **independent read-only subagents**,
  each starting from a clean context and reading the diff from disk — never
  from the conductor's recollection of what it intended to write;
- run the **adversarial refutation pass** on every Critical and High finding.

A conductor that reviews High or Critical work by itself has skipped the gate,
not accelerated it.

### The only stops in a conductor run

Two are planned, and both are boundaries the pipeline cannot cross on its own:

1. **Plan approval.** Presented through plan mode so the decision is one
   action. `gate-approve` sets `disable-model-invocation: true` precisely so a
   design cannot approve itself; an affirmative decision is the human judgement
   that control exists to require. Ambiguous praise is not one.
2. **Present.** Git writes are denied. The human reviews the diff and pushes.

Everything else runs through. Stop mid-pipeline **only** for:

- a material divergence from the approved plan — needs renewed approval;
- an unresolved product decision that reading the repository cannot settle;
- two complete remediation cycles exhausted with findings still unresolved;
- a validation verdict of `FAIL` or `BLOCKED` that implementation or review
  cannot fix within the approved plan;
- a missing prerequisite — an unavailable service, an absent credential, or a
  check that cannot run.

When one fires, say which, say what it blocks, and stop. Do not ask the human
to confirm a stage that had no such problem.
