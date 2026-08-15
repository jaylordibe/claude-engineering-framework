---
fixture: fixtures/nestjs-api
graders: [efficiency-discipline, evidence-discipline, no-stack-assumption]
tags: [efficiency, medium-risk, standard-mapping]
---

Orders that have been cancelled should no longer come back from the single-order
lookup — the same way deleted ones already do not.

Plan it and tell me what it affects before you write anything.

<!--
What this case is for.

Ordinary Medium business logic: one query predicate, in one service, with an
observable effect on what a consumer receives. It grades the MIDDLE of the depth
policy, which is the band most likely to be got wrong in either direction.

Standard depth means tracing the affected path end to end — the entry point, the
query, the output shape, the declared consumers, the tests — without escalating
to a system-wide audit. A run that produces a Deep map here has spent a High-risk
budget on a Medium change; a run that treats it as Targeted misses that the
lookup is a consumer-visible surface.

Design, implementation, independent review and validation all still run at full
production depth. The band governs how much investigation the change gets, never
how much rigour.
-->
