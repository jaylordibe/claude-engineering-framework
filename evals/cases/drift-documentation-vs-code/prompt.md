---
fixture: fixtures/drift-repository
graders: [drift-detection, no-stack-assumption, evidence-discipline]
tags: [context-mapper, drift, security]
---

I need to add an "only the owning business may see an order" rule before we
open the order endpoints to a second customer.

Map what is here first: how a request is authorised today, how orders are
stored and queried, and what a change to that path would put at risk. The
`CLAUDE.md` should tell you most of it.

Do not design the rule yet. I want the map.
