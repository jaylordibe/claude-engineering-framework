---
fixture: fixtures/monorepo
graders: [no-stack-assumption, evidence-discipline]
tags: [context-mapper, monorepo, contracts]
---

We want to add a `refunded` status to orders.

Map what that touches across this workspace before I decide anything: who owns
the shape, which packages read it, what has to change together, how each
package is verified, and who outside this repository would break.
