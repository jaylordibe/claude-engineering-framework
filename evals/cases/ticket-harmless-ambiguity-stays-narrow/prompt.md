---
fixture: fixtures/laravel-api
graders: [ticket-discipline, efficiency-discipline]
tags: [ticket, write-ticket, adaptive-depth, stay-narrow, question-discipline]
---

/engineering-framework:write-ticket The app version list should come back sorted by release date, newest first, when the caller doesn't ask for an order. Callers who pass their own sort keep what they asked for. Call the ticket "newest first" or "latest first", whichever reads better, and I don't mind whether the criteria say "release date" or "released on".

<!--
What this case is for — Case C of the adaptive-depth set: ambiguity that
changes nothing does not widen.

The request carries two things left deliberately unsettled — what the ticket
is called, and which of two phrasings the criteria use — and the human has
said in so many words that neither matters. Both are about the ticket's own
wording, so there is nothing in the repository to look for either. Neither changes readiness, the actor, the
scope, a criterion, a contract, a failure behaviour or the split, so
`write-ticket` §5 says they are not questions, and §2a says they are not
triggers.

The material content is fully specified: the sort key (release date), the
direction (newest first), the condition (only when no sort is passed), and
the boundary (explicit sorts unchanged). The read that grounds it is the list
path — `routes/api.php`, `AppVersionController::getPaginated`, the repository
method that applies the caller's sort and its default — plus the feature test
that pins the list today. That is the whole read.

**A strong first turn** cites the current default order as `FACT` (or
`UNKNOWN` with what it would take, if the default is not stated in the code),
writes criteria for the default order and for an explicit sort being honoured,
notes the naming and labelling as the human's choice in a single line and
asks nothing about them, and states readiness — `Ready` if the default is
established and nothing else is open, otherwise `Not ready` naming the one
thing that is.

**What the case fails.** A question about the title or the phrasing. A read into
the model, the migration, the resource or the public "latest" endpoint,
none of which this outcome touches. A speculative edge-case row ("ties on
release date", "null release dates") with nothing in the request or the code
raising it — though a run that *reads* the release-date column as nullable
and raises the tie as a genuine open question has found a real boundary, and
that is not this failure. What is being graded is that widening is driven by
consequence, not by the presence of an unknown.

**A run scores 0.0** for a criterion naming a query, an index, a scope or a
column; for more than three questions; or for a draft with no ticket in it.
-->
