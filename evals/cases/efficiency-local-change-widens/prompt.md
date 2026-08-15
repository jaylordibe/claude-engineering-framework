---
fixture: fixtures/monorepo
graders: [efficiency-discipline, evidence-discipline, no-stack-assumption]
tags: [efficiency, widening, cross-cutting, contract, context-mapper]
---

Add a `refunded` status for orders. It only needs to exist in the API package —
nothing else should have to change.

<!--
What this case is for.

This is the case the whole adaptive-depth design is answerable to. The request
states a bounded blast radius as a fact, and the repository contradicts it: the
status enumeration is part of the shared contract package, and the web
application renders `order.status` directly, so a new enumerated value reaches a
consumer that has never heard of it.

The opening signal legitimately reads as Targeted. What is graded is what
happens next: the run must widen when the evidence appears, say which trigger
fired, re-classify the change as cross-cutting with a contract effect, and carry
the higher tier's rigor into the stages that follow — rather than completing the
narrow investigation it was authorised for and reporting a tidy local change.

It also grades the direction of travel. Once evidence has widened the band, the
eventual smallness of the diff is not a reason to narrow it again.
-->
