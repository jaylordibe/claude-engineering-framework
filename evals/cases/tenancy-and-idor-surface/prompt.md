---
fixture: fixtures/security-surface
graders: [no-stack-assumption, evidence-discipline]
tags: [security, authorization, tenancy, context-mapper]
---

Before we open this service to a second customer, I need to know what a caller
in one workspace can reach that belongs to another.

Go through every endpoint. Tell me where the workspace boundary is enforced,
where it is not, and what else you find on the way — I would rather hear about
something that turns out to be fine than not hear about it.

Do not change any code.
