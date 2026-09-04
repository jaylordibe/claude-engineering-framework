# [Title — an actor and an outcome, one line]

- **Type:** Feature | Defect | Change | Operational
- **Suggested risk tier:** Low | Medium | High | Critical — [the one sentence that decides it]
- **Source:** [request, conversation, incident, existing issue key, or "direct instruction"]

> Structure, not a form. Use the sections the ticket earns and write "none" in
> one line for the rest — an empty heading reads exactly like a completed one.
>
> This is a **ticket**. It states a goal, the evidence that frames it and the
> outcomes that would prove it delivered. It does not contain a design: no
> steps, no file list, no schema, no chosen mechanism. A mechanism anyone
> proposed lives in §9, labelled non-binding, and the design stage grades it
> like any other candidate.
>
> Labels are the framework's — `FACT` with `path:line`, `INFERENCE`,
> `ASSUMPTION`, `ABSENT`, `UNKNOWN`. A gap stays visible as `UNKNOWN` until it
> is answered or deferred. It is never filled with the plausible option.
>
> The **suggested risk tier** is advisory. It tells the pipeline how much
> ceremony to expect. It blocks nothing, and the design stage may overrule it.

## 1. Story

**As a** [actor the repository distinguishes — a role, a caller, an operator,
a downstream system's owner],
**I want** [the capability, as the actor would say it],
**so that** [the benefit — real, stated, and not a mechanism].

## 2. Current behaviour

What happens today, from the actor's side, each claim labelled.

- `FACT` [what the code does] — `path:line`
- `ABSENT` [what does not exist today, and where you looked]
- `UNKNOWN` [what could not be determined, and what it would take]

For a **defect**: the observation kept whole — the failing output, the trace,
the reproduction steps, how often. The reporter's cause, if any, written as a
hypothesis and labelled as one.

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

`Given <state>, when <actor acts>, then <observable outcome>`. One outcome per
criterion. Checkable from outside the system. No mechanism.

1. Given [state], when [actor does X], then [what the actor can observe].
2. Given [the same], when [the wrong caller does X], then [what they observe instead].
3. Given [the same], when [X is repeated | the input is invalid | the set is empty], then [the outcome].

> The test for the set: two competent engineers build two different designs
> and both pass every criterion. Would the human accept either? If not, a
> requirement is missing.

## 6. Edge cases and failure behaviour

| Situation | Expected behaviour | Status |
|---|---|---|
| Invalid input | | decided / open question §8 |
| Caller not permitted | | |
| Empty set, nothing to do | | |
| Partial failure mid-way | | |
| Repeated or concurrent attempt | | |
| [the situation specific to this outcome] | | |

## 7. Contract and data touchpoints

What a consumer or a stored record could **observe** changing, stated as an
outcome. A schema, a field name or a payload shape is an idea and goes in §9.

- **Consumers:** [who could see a difference — a client, an integration, a
  report — or "none"]
- **Persisted:** [what must survive and for how long, as a requirement — or
  "none"]
- **Compatibility:** [what must keep working for existing callers during and
  after the change — or "none"]

## 8. Open questions

Each with an owner and what depends on the answer. **Blocking** means a
criterion changes with the answer; **deferred** means the human has chosen to
let the design stage decide, and that choice is recorded here.

| # | Question | Owner | Depends on it | Blocking / deferred |
|---|---|---|---|---|
| 1 | | | | |

## 9. Ideas from discussion — non-binding

Every mechanism anyone proposed, kept so it is not lost and so it is visibly
not a requirement. The design stage grades each one.

- [the flag, the table, the module, the library someone named — attributed]

## 10. Dependencies and sequencing

- [another ticket, an external party, data that must exist first, a rollout
  order the product needs, a feature flag — or "none"]

## 11. Evidence

The `path:line` pointers the ticket rests on, so an implementer can verify it
in a minute. Locations, not a map.

- `path:line` — [what it shows]
