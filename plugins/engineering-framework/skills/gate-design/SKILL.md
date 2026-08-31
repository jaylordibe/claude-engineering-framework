---
name: gate-design
description: Designs a material change by mapping repository reality first, reconciling the request against what the code actually does, classifying risk, comparing credible alternatives, threat-modelling where the tier requires it, and producing an approval-gated plan. Use for features, bugs, refactors, migrations, integrations, authorization changes, background work, and any change whose blast radius is unclear.
argument-hint: "<requirement | ticket | bug report>"
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
model: inherit
effort: high
---

# Design a change

Input:

```text
$ARGUMENTS
```

This gate is **design-only**. Do not edit source, tests, schema, migrations,
configuration, lockfiles, generated output or deployment artefacts. The
`disallowed-tools` frontmatter enforces this for the turn that invokes it.

**This gate writes nothing to the repository.** The design is a plan, presented
through Claude Code's plan flow and structured on
`${CLAUDE_PLUGIN_ROOT}/templates/plan.md`.

## No resume by path

A plan is not a file, so there is nothing to reopen. A session that ends
mid-design is re-designed in the next one — the mapping is cheap to redo and
the repository may have moved anyway.

This is a deliberate trade: resuming happens on roughly one run in ten, which
did not justify a document every other run had to keep in sync.

## Pipeline

1. Establish the requirement
2. Map repository reality
3. Reconcile request and code
4. Classify risk
5. Evaluate alternatives
6. Threat-model
7. Plan exact changes
8. Plan tests and verification
9. Write the plan
10. Stop at approval

---

## 1. Establish the requirement

Extract: desired outcome and acceptance criteria · actors, roles and scopes ·
explicit constraints and non-goals · factual claims · the prescribed method, if
any · ambiguous product behaviour · externally visible contract expectations.

Separate the **WHAT** from the **HOW**. Do not silently decide unresolved
product behaviour.

## 2. Map repository reality

**`engineering-framework:context-mapper` is always required.** Launch it
**first**, before any option is weighed. You cannot judge a change you have not
mapped. Never skip it, and **state that you ran it** — an unexplained skip is
indistinguishable from an oversight to whoever reads the plan.

Name the **depth band** you are asking it for —
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §3. Standard is the
default; Targeted is earned from evidence, not from how small the request
sounds. The mapper may widen the band, and §4 requires it to say so when it
does.

For cross-cutting work, launch additional read-only agents in parallel:
`architect`, `security`, `contract`, `data`, `performance`, `tester`. **On
cross-cutting work, assume each is engaged** — that is what cross-cutting means
— and omit one only where the map has already established that its concern is
not reached, saying which you omitted and on what evidence. An unexplained
omission and an oversight read identically in a plan.

Below cross-cutting, the reverse applies: launch the lens the change actually
turns on, not all six. Six reports on a change that engages one are five the
plan cannot use, and they crowd out the one it needed.

Brief each on `${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §8.5,
which owns what a brief carries. What this stage supplies to it is the one
decision that lens owns and the map's `path:line` pointers into its area — one
decision per launch, never the list of everything the design has to settle.
**Hand over locations, never conclusions** — a lens given the map's verdict on
its own concern can no longer contradict it, and contradicting it is half of
what the launch is paying for.

**Never tell an agent to read a framework document.** Every one of them already
carries the evidence labels, the stopping rule, the report it owes and its
independence, embedded in its own definition — so an instruction to go and read
those spends the run's opening turns on this framework instead of the
repository, which is the one way a briefed agent reliably reaches its ceiling
with nothing written up.

Read the complete map before deciding anything.

**A map that reports its floor as `Incomplete`, or leaves access control,
tenancy or persistence `UNKNOWN`, is not a map you can classify risk from.**
Close the gap first — re-launch narrowed onto it, or launch the lens that owns
it. The tier below is assigned from evidence, and an unexamined area produces
the cheapest tier and the worst outcome.

**A mapper that returned no map at all is a different case**, and it is not a
map reporting nothing: nothing it established is in your hands.
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §8.4 owns it —
continue it report-first, rather than launching a fresh one over ground it has
already covered.

The map must establish, from evidence, and label anything it cannot as
`UNKNOWN`:

- what this system is built from, and how it is organised;
- the entry points and the end-to-end flow the change touches;
- what persists data, and the shapes, constraints and lifecycle involved;
- how authentication, permission and **record-level** access are enforced,
  and where tenancy is enforced;
- every externally observable contract in the blast radius;
- audit, logging, redaction and correlation behaviour;
- asynchronous and scheduled work, retries, duplicates and failure handling;
- the affected tests and the repository's test topology;
- the consumers, and the handoff each would need.

The governing rule is `${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md`.
**Do not name a construct this repository does not have.**

## 3. Reconcile request and code

State plainly: the requested outcome · the authoritative current behaviour ·
each factual claim graded **Confirmed / Partially confirmed / Stale /
Incorrect / Not found / Ambiguous** · the constraints existing contracts impose
· whether the prescribed method is sound · any recommended divergence with its
trade-off.

A faithful implementation of a wrong premise is not acceptable.

## 4. Classify risk

**The tier decides how much design this change gets, and whether it produces a
plan document at all.**

| Tier | Typical | Design artefact |
|---|---|---|
| **Low** | Copy, isolated internal rename, test-only cleanup with no contract effect | **No plan document.** State the tier and the evidence, present the approach, hand back. Review and validation still run in full. |
| **Medium** | Ordinary business logic, endpoint behaviour, module-level refactor or job | Plan covering §§1–7 and §§9–13 of the template. Threat model and alternatives stay brief unless the change earns them. |
| **High** | Authentication, authorization, tenancy, personal data, money or pricing, uploads, webhooks, external integrations, migrations, public contracts, concurrency | Full plan, explicit threat model, at least two credible alternatives, migration and rollback analysis. |
| **Critical** | Identity infrastructure, cryptography, broad privileged access, destructive data work, production repair, release infrastructure | Everything High requires, plus the plan states plainly that automated review is not sufficient and names the human review still owed. |

Also take the higher tier when the change touches any path the repository's
`CLAUDE.md` lists under **High-risk paths**. **Read that section before
classifying**, and say whether it exists: it is the one place a repository can
tell you something about its own risk that the code cannot, and a tier assigned
without reading it is a tier assigned from the diff alone. Any paragraph
alongside it carries the reasoning and is worth reading with it.

**On a boundary between two tiers, you are in the higher one.**

This tiering exists because ceremony applied uniformly is ceremony that gets
skipped, and a skipped step reads exactly like a completed one. Refusing to
write a plan for a copy fix is what keeps the plan meaningful for a schema
change. Equally, do not use a Low classification to avoid a plan the change
actually needs.

**The tier can still rise, and a rise is never overridden.** It is assigned from
the map, but the map is not the last evidence this change will produce:
implementation reaches somewhere the plan did not anticipate, review finds a
boundary nobody had traced, the diff turns out to touch a declared high-risk
path. Any of those re-classifies the change upward, and the higher tier's
ceremony then applies to what remains — a wider review panel, negative tests,
the human security review a Critical change owes.

It moves in one direction only. Nothing later in the pipeline lowers a tier that
evidence raised, and neither the size of the resulting diff nor how far along
the work is counts as evidence that it should be lower.

**A rise is a material change in risk, so it obliges what the new tier's design
required — not only its review panel.** The distinction matters because the
review panel is the cheap half. A change that becomes High after the plan was
approved owes a threat model, credible alternatives, migration and rollback
analysis and negative tests, and **none of those are review artefacts**: they
were meant to shape what got built.

So, when a tier rises:

- **Before or during implementation** — it is a material divergence. Return to
  the approval gate with the new tier and what the new tier requires. Do not
  carry on under an approval given for a smaller change; the human approved a
  Medium plan, and this is no longer one.
- **During review** — the panel runs at the higher tier immediately. Where the
  higher tier's *design* obligations were never met, that is a blocker to state
  in the report, owned by the human. **Do not backfill a threat model after the
  fact and present it as though it had informed the design.** A document written
  to close a gap it did not prevent records nothing, and reads exactly like one
  that did.

## 5. Evaluate alternatives

For Medium and above, compare at least two credible approaches unless the
repository genuinely leaves one. Compare on: correctness and invariant
enforcement · security and authorization · fit with the boundaries this
repository actually enforces · consumer compatibility · data correctness ·
migration and rollback safety · failure and retry behaviour · testability ·
operational complexity · maintainability.

Prefer the smallest coherent complete end state within scope. Do not
over-engineer, and do not smuggle an unrelated refactor in as an "alternative".

## 6. Threat-model

Use the `security` agent and
`${CLAUDE_PLUGIN_ROOT}/templates/threat-model.md`, in proportion to the tier.

At minimum consider: authentication · function-level and record-level
authorization · ownership and tenancy · enumeration and disclosure behaviour ·
privilege and foreign-key escalation · mass assignment · client-controlled
authoritative values · replay, duplicates and races · rate limiting on public
and message-sending paths · upload, URL and parser risks · log, error and
schema leakage · webhook authenticity · audit gaps.

## 7. Plan exact changes

Produce a file-by-file plan: for each file, what changes and which contract it
must satisfy.

**Name the contracts; do not restate them.** The authoritative text is the
repository's own documentation plus `${CLAUDE_PLUGIN_ROOT}/standards/`. A plan
that paraphrases a convention creates a third copy that outlives the rule it
was copied from; a plan that cites one stays correct for free.

What the plan must decide, because the sources cannot decide it:

- how each new or changed entry point declares its access rule, and why;
- where the ownership and tenancy boundary sits for each data access;
- which error identifiers are new, and whether any existing one changes
  meaning;
- which response fields are sensitive, and what the output shape exposes;
- the exact persisted shape, its lifecycle and its uniqueness rules;
- whether new asynchronous work belongs on a queue or a schedule;
- the migration, consolidated and **prepared but not applied**.

Two worksheets carry the per-field detail those bullets only name:
`${CLAUDE_PLUGIN_ROOT}/templates/contract-change.md` when the change adds or
alters an observable surface, and
`${CLAUDE_PLUGIN_ROOT}/templates/data-design.md` when it adds or alters a
persisted shape.

**Both are thinking aids, not deliverables.** Fill one in to reach the
decision, fold the conclusion into the plan, and commit neither.

## 8. Plan tests and verification

Map each requirement and each identified risk to a specific test. The catalogue
is `${CLAUDE_PLUGIN_ROOT}/standards/testing.md` §3; the design work is deciding
**which of those this change makes reachable**, and naming the file that will
cover each.

A risk with no test mapped to it is an accepted risk. Say so in §13 rather than
leaving the gap implicit.

Verification names the repository's **canonical commands** — from its
`CLAUDE.md` — with the scope each will run at. Do not invent a command. Do not plan to apply a migration to
any live database.

## 9. Write the plan

Structure it on `${CLAUDE_PLUGIN_ROOT}/templates/plan.md`, at the depth §4
requires. Create no file in the repository.

**Write it once.** Nothing after approval edits the plan: implementation
divergences, review findings and validation evidence go in the presentation and
the pull request. A plan kept in sync with the work is a second copy of the
work.

If the session ends before the design is complete, say so plainly and stop.

## 10. Approval gate

Present the plan through `ExitPlanMode` and stop, so the decision is one action
rather than typed prose.

**Do not approve it yourself and do not infer approval.** Read back: the
recommendation and the trade-off accepted by rejecting the alternatives ·
contract and data impact, naming affected consumers · residual security and
privacy risk · the rollback path · **what this deliberately does NOT do** ·
**every unresolved §13 row, individually**.

Scope disappointment surfaces at the non-goals more often than any technical
objection does, which is why they are read back explicitly.

Ambiguous praise is not an approval, in either direction. If `ExitPlanMode` is
unavailable, fall back to `AskUserQuestion`.

## 11. Handoff

Follow `${CLAUDE_PLUGIN_ROOT}/standards/gate-handoff.md`, starting with its §0
mode table. Close with the recommendation and the risk tier.

**Standalone** — then offer: *Approve it now* (read the design back per
`gate-approve` and take their explicit decision) · *Keep refining* (name what is
still unresolved) · *Stop here*.

**Conductor** — do not offer these. The pipeline owns how its first human stop
is presented, and on approval it continues into implementation in the same
turn.

If the design is incomplete, do not offer approval at all, in either mode. Say
what is unresolved and stop.
