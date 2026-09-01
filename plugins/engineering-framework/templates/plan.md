# Plan: [decision title]

- **Risk:** Low | Medium | High | Critical
- **Source:** [ticket, request, incident, or "direct instruction"]

> Structure, not a form. Use the sections the change earns and write
> "not applicable" in one line for the rest — an empty heading reads exactly
> like a completed one. Depth scales with the risk tier.
>
> This is a **plan**, presented through Claude Code's plan flow. It is not
> written into the repository, and nothing downstream edits it: implementation
> divergences, review findings and validation evidence go in the presentation
> and the pull request, not here.
>
> **Low risk gets no plan document at all** — state the tier and the evidence,
> present the approach, and go.

## 1. Recommendation

The outcome, the approach you judge best, and the primary trade-off accepted by
choosing it. Lead with what you recommend, not with what was asked.

## 2. Instruction versus repository reality

What was requested (**WHAT**) versus any method it prescribed (**HOW**). The
second is input to weigh, not a mandate.

| Claim | Grade | Repository reality | Evidence |
|---|---|---|---|
| | Confirmed / Partially confirmed / Stale / Incorrect / Not found / Ambiguous | | `path:line` |

**Prescribed method:** Sound / Sound with constraints / Over-specified /
Suboptimal / Inapplicable / Bad practice / Insufficiently specified — and one
evidence-backed sentence saying why. **Over-specified** is the grade for a
method that would work and asks for more than the outcome requires; acceptance
criteria naming a column, a table or an abstraction are graded here, not
carried into §7 as requirements.

Then the current authoritative flow, end to end, in this repository's own
vocabulary, each step cited.

## 3. Constraints and invariants

What the change must not break: boundaries and layering · error and result
contract · authorization and actor scope · data shape and lifecycle · consumer
compatibility · operational limits · migration constraints.

Mark each as **FACT** with evidence, or **ASSUMPTION** with what would settle
it.

## 4. Options

At least two credible approaches for Medium and above, unless the repository
genuinely leaves one. For each: the approach, what it buys, what it costs,
compatibility, security, migration and operational impact, testability.

**One of them is the smallest thing that fully delivers the outcome** — no new
table, column, abstraction, configuration surface or migration beyond what the
outcome cannot be delivered without. If it lost, name the specific requirement
that defeated it and the evidence for that requirement. A prediction is not a
requirement.

State plainly why the rejected ones lost. An option list where one choice is
obviously correct is decoration.

## 5. Decision

The recommendation, its rationale, and what is given up by rejecting the
alternatives.

**Then list every persisted shape, abstraction and configuration surface this
change introduces, and against each the outcome that cannot be delivered
without it.** A row with no such outcome is scope to cut here, not to review
later.

## 6. Contract impact

Entry point · access control declaration · request and response shape · stable
error identifiers · status or result codes · enumerated values · pagination and
ordering · events and webhooks · generated schemas · mixed-version behaviour ·
deployment order.

**Name every affected consumer from the repository's declared consumer list, or
record explicitly that none are affected.** A contract change is not done when
this system compiles.

Use `templates/contract-change.md` to reach these answers when the change adds
or alters an endpoint, event or payload.

## 7. Data design

Models and fields · lifecycle and delete semantics · ownership and tenancy ·
constraints and indexes · uniqueness, including any conditional uniqueness and
what it implies for lookups · transactions and concurrency · naming and mapping
conventions · the migration, prepared but not applied · existing data and
backfill · deployment ordering · rollback.

Use `templates/data-design.md` when the change adds or alters a persisted
shape.

## 8. Security and privacy

Assets · actors · trust boundaries · authentication · function-level and
record-level authorization · disclosure behaviour · client-supplied value
tampering · replay and races · rate limiting · secrets and log redaction ·
audit · residual risk.

Required for High and Critical. For **Critical**, state plainly that automated
review is not sufficient and name the human review still owed.

Use `templates/threat-model.md`.

## 9. Test plan

| Requirement or risk | Test file / layer | Scenario | Expected evidence |
|---|---|---|---|
| | | | |

Cover the reachable scenarios from `standards/testing.md` §3. A guardrail ships
with a test proving it catches the omission, not only the happy path.

A risk with no row here is an accepted risk — record it in §13.

## 10. Verification

The repository's canonical commands that will actually run, by name, with the
scope each will be filtered to. Plus any runtime exercise, security check or
migration evidence.

State what will **not** be run and why.

## 11. Rollout and recovery

Deployment order · consumer dependencies · migration and backfill · feature
flag or staged exposure · success signals · abort threshold · rollback or
roll-forward · repair procedure.

## 12. Deliberate non-goals

What this explicitly does not do, and why. Scope disappointment surfaces here
more often than any technical objection, which is why it is read back at
approval.

## 13. Open decisions and blockers

| Type | Question or blocker | Why it matters | Owner |
|---|---|---|---|
| Product decision / Technical unknown / Missing evidence / Migration blocker / Cross-repository dependency / Security blocker | | | |

Every unresolved row is read back individually at the approval gate. The human
must resolve each one or accept it as a stated condition, recorded verbatim.
