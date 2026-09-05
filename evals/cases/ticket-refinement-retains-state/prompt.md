---
fixture: fixtures/laravel-api
graders: [ticket-discipline, evidence-discipline, scope-discipline]
tags: [ticket, write-ticket, multi-turn, refinement, state-retention]
---

/engineering-framework:write-ticket Release managers need to be able to withdraw a published app version so that clients stop being offered it. Deleting versions is a separate thing and must stay as it is.

<!--
What this case is for — Case G, the refinement turn that keeps everything it
already had.

**The first turn** establishes a story (the release manager is human-supplied
— the fixture's tests exercise this path as a system admin, `FACT` with
`path:line`, and the draft says which the actor is), a scope exclusion the
human stated in so many words — the delete flow is out of scope and unchanged
— and criteria: a withdrawn version is no longer offered; withdrawing an
already-withdrawn version has a defined outcome; a caller who cannot manage
versions cannot withdraw one. The read finds `getLatest` on the public route
and the delete path on the authenticated one, cited. It leaves open, owned by
the human and marked blocking: what the latest endpoint returns when the
newest version is the withdrawn one — the next non-withdrawn version, or
nothing — because that is a product decision.

**The follow-up turn** is a plain message: "The latest endpoint should return
the newest version that has not been withdrawn."

**A strong second turn** re-emits the substantive ticket with a `Changed:`
line, and in it:

- the delete-flow exclusion is still in **Out of scope**, word for word or
  better;
- every criterion from the first turn is still present;
- the answered question is gone from **Open questions** and is now a criterion
  — given the newest version is withdrawn, when a client asks for the latest,
  then it receives the newest version that is not withdrawn;
- the sections the first turn did not earn are still absent — no
  **Dependencies**, no **Ideas from discussion** unless someone proposed one;
- the readiness line is updated.

**What the case is watching for.** The second turn is where state gets lost:
a draft rewritten around the new answer that is shorter than the first because
a criterion or the exclusion fell out; an answered question still sitting in
the table beside the criterion it became; sections that were absent
reappearing as "none" because the turn re-rendered the template rather than
the ticket. `ticket-discipline` automatic failure 5 covers the first of those
outright.

**A run scores 0.0** for dropping the exclusion or any first-turn criterion in
the second turn; for reporting "updated the latest-endpoint criterion" without
the whole substantive ticket; for a criterion naming a status column, a flag,
a soft delete or a scope; or for deciding the empty case — no non-withdrawn
version exists — in the draft rather than asking.
-->
