# [Title — an actor and an outcome, one line]

- **Type:** Feature | Defect | Change | Operational
- **Suggested risk tier:** Low | Medium | High | Critical — [the one sentence that decides it]
- **Source:** [request, conversation, incident, existing issue key, or "direct instruction"]

> Structure, not a form. Use the sections the ticket earns and **leave the
> rest out** — an empty heading reads exactly like a completed one, and a
> heading over "none" or "N/A" is a line the reader has to check that tells
> them nothing. Sections 1, 3, 4 and 5 are always present; 2 is present
> whenever the read found something to cite or to mark `ABSENT`; 8 whenever
> a question is still open. Sections 6, 7, 9, 10 and 11 appear when there is
> something in them. Section numbers are stable identifiers — an omitted
> section leaves a gap in the numbering, so "§8" means the same thing in
> every turn. Write "none" only where the absence is itself a boundary the
> reader needs: *no existing caller may see a difference* is a requirement;
> *Dependencies: none* is a line.
>
> This is a **ticket**. It states a goal, the evidence that frames it and the
> outcomes that would prove it delivered. It does not contain a design: no
> steps, no file list, no schema, no chosen mechanism. A mechanism anyone
> proposed lives in §9, labelled non-binding, and the design stage grades it
> like any other candidate. It does not contain an estimate either — how long
> the work takes is something only a design can say.
>
> Labels are the framework's — `FACT` with `path:line`, `INFERENCE`,
> `ASSUMPTION`, `ABSENT`, `UNKNOWN`. A gap stays visible as `UNKNOWN` until it
> is answered or deferred. It is never filled with the plausible option.
>
> The **suggested risk tier** is advisory. It tells the pipeline how much
> ceremony to expect. It blocks nothing, and the design stage may overrule it.

## 1. Story

**As a** [the actor — one of exactly two kinds, and the draft says which:
a role, caller, operator or system the repository distinguishes, cited as
`FACT` with `path:line`; or an actor the human introduced as part of the
product behaviour they asked for, marked *human-supplied* and `ABSENT` from
the code today. Any other actor is invented; write `UNKNOWN` and ask],
**I want** [the capability, as the actor would say it],
**so that** [the benefit — real, stated, and not a mechanism].

## 2. Current behaviour

What happens today, from the actor's side, each claim labelled.

- `FACT` [what the code does] — `path:line`
- `ABSENT` [what does not exist today, and where you looked]
- `UNKNOWN` [what could not be determined, and what it would take]

For a **defect**: the observation kept whole — the failing output, the trace,
the reproduction steps, how often. The reporter's cause, if any, written as a
hypothesis and labelled as one. A cause the read suggests is an `INFERENCE`
with its `path:line`, not a root cause: proving it is the design stage's job,
in the order `${CLAUDE_PLUGIN_ROOT}/skills/domain-debugging/SKILL.md` owns.

## 3. Problem

Why the current behaviour is not enough, in the actor's terms. No solution
words. One paragraph.

## 4. Scope

**In scope**

- [the outcomes this ticket delivers]

**Out of scope**

- [the adjacent thing a reader might assume is included, and is not]
- [the adjacent gap the read found, which is real and was not asked for]

## 5. Acceptance criteria

`Given <state>, when <actor acts>, then <observable outcome>`. One
independently verifiable outcome per criterion — "and" is a reason to look,
not a reason to split; two outcomes that could pass or fail apart are two
criteria, one invariant stated in two halves is one. Checkable from outside
the system. No mechanism.

1. Given [state], when [actor does X], then [what the actor can observe].
2. Given [the same], when [the caller the outcome excludes does X], then [what they observe instead].
3. Given [the same], when [the input is unsupported | X is repeated | the state is invalid], then [the outcome].

> Lines 2 and 3 are the shape of a negative, not a quota. A boundary the
> request or the repository makes real — the caller who is not permitted, the
> input that is not supported, the invalid state, the repeat, the excluded
> scope, the failure the actor would notice — gets its criterion. A boundary
> nothing supports is not invented to give a positive line a partner. Where it
> is unclear whether a boundary exists, that is a question for §8.
>
> The test for the set: two competent engineers build two different designs
> and both pass every criterion. Would the human accept either? If not, a
> requirement is missing.

## 6. Edge cases and failure behaviour

Only when the outcome has boundaries the criteria do not already settle. Rows
for the situations this outcome actually has — not one per template
suggestion. Where a row is unknown, it is an open question, not a blank.

| Situation | Expected behaviour | Status |
|---|---|---|
| [invalid input, caller not permitted, empty set, partial failure mid-way, repeated or concurrent attempt — whichever of these the outcome can meet] | | decided / open question §8 |
| [the situation specific to this outcome] | | |

## 7. Contract and data touchpoints

Only when a consumer or a stored record could **observe** something changing.
State it as an outcome. A schema, a field name or a payload shape is an idea
and goes in §9.

- **Consumers:** [who could see a difference — a client, an integration, a
  report]
- **Persisted:** [what must survive and for how long, as a requirement]
- **Compatibility:** [what must keep working for existing callers during and
  after the change]

## 8. Open questions

Only while a question is open. Each with an owner and what depends on the
answer. **Blocking** means a criterion changes with the answer; **deferred**
means the human has chosen to let the design stage decide, and that choice is
recorded here. A question the human answered becomes the criterion, scope
line or fact it was asking about, and leaves this table.

| # | Question | Owner | Depends on it | Blocking / deferred |
|---|---|---|---|---|
| 1 | | | | |

## 9. Ideas from discussion — non-binding

Only when someone proposed a mechanism. Every one, kept so it is not lost and
so it is visibly not a requirement. The design stage grades each one. A
mechanism the human declared contractual in so many words is not an idea — it
is a criterion, with the sentence in which they said so.

- [the flag, the table, the module, the library someone named — attributed]

## 10. Dependencies and sequencing

Only when one exists.

- [another ticket, an external party, data that must exist first, a rollout
  order the product needs, a feature flag]

## 11. Evidence

The `path:line` pointers the ticket rests on, so an implementer can verify it
in a minute. Locations, not a map. Present whenever §2 cites anything.

- `path:line` — [what it shows]
