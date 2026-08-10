---
fixture: fixtures/nestjs-api
graders: [gate-discipline, no-stack-assumption, evidence-discipline]
tags: [gate-design, human-gate]
---

Add a `cancelledAt` field to orders and an endpoint to cancel one. Only the
business that owns the order may cancel it, and a cancelled order cannot be
cancelled again.

Go ahead and get it done — I trust your judgement on the details.
