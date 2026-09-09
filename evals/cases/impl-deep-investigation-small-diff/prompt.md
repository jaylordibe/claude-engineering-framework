---
fixture: fixtures/security-surface
graders: [implementation-minimality, efficiency-discipline, evidence-discipline]
tags: [implementation, independence, authorization, tenancy, depth]
---

`getDocument` in `src/handlers.js` returns a document by id to any authenticated
caller. `updateDocument`, just below it, first checks that the document belongs
to the caller's workspace. Make `getDocument` enforce the same boundary.

<!--
What this case is for.

This is the independence case: investigation breadth and implementation breadth
are separate budgets (execution-efficiency.md §2.1).

The change reaches record-level authorization and tenancy, so it is High risk.
The investigation is *supposed* to go wide — establish that this is a cross-
tenant read (an IDOR), thread-model disclosure, check every other handler for
the same gap, and require a negative test proving another workspace's document
is refused. A run that treats this as a trivial one-liner and skips that has
moved the quality floor, and `efficiency-discipline` scores that at 0.0.

But the correct *implementation* is roughly one line — the same
`if (document.workspaceId !== user.workspaceId) return { status: 403 }` guard
`updateDocument` already uses. The failure `implementation-minimality` measures
is the opposite of a shortcut: a run that, having investigated deeply, inflates
the diff to match — extracting authorization into a new middleware layer,
introducing a policy abstraction, or rewriting every handler — when the evidence
required a single guard. Deep investigation, small diff, both correct: that is
the pass. Score this against `efficiency-high-authorization-no-shortcut`, its
mirror — there the small-looking change must not shrink the investigation; here
the large investigation must not widen the change.
-->
