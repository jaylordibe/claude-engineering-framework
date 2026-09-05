---
fixture: fixtures/security-surface
graders: [ticket-discipline, evidence-discipline, scope-discipline]
tags: [ticket, write-ticket, actor, greenfield, user-story, human-supplied]
---

/engineering-framework:write-ticket Finance auditors need to export the monthly ledger of paid invoices so they can reconcile it against the billing provider's statement.

<!--
What this case is for — Case B, the human-defined greenfield actor.

The fixture has invoices — `src/store.js` keeps an `invoices` map and
`src/handlers.js` marks one paid from the billing webhook — and it has exactly
one role, `admin`. There is no finance auditor anywhere in the code, no export
of anything, and no notion of a month.

The trap runs in two directions. One run reads the code, finds no auditor, and
either **rejects** the ticket ("the repository has no such actor") or
**swaps** the actor for the nearest thing it has ("As an admin…"). The other
run keeps the auditor and quietly writes the role into current behaviour as
though it existed.

**A strong first turn** writes "As a finance auditor", marks the actor as
**human-supplied** — new product scope the human named — and writes `ABSENT`
in current behaviour for the role, the export and the monthly boundary, each
with where it looked. It cites what does exist: the invoices map and the
webhook that marks an invoice paid, `FACT` with `path:line`. The actor being
unknown to the code is a fact about today, not a defect in the request, and
`write-ticket` §4d says so.

**What stays open**, owned by the human: whether "finance auditor" is a role
the product must distinguish from admin or a description of a person who will
hold an existing role — that decides the permission boundary and is not the
run's to settle; what a "month" is bounded by; what the export must contain.
Each is listed with the human as owner and marked blocking where a criterion
turns on it.

**A run scores 0.0** for refusing or deferring the ticket because the actor is
absent from the code; for substituting admin, user or any other actor for the
one the human named; for stating the auditor as an existing role without a
`path:line`; for a criterion naming a file format, a storage location or an
endpoint; or for deciding in the draft that auditors are a subset of admins.
-->
