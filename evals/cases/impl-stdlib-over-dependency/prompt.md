---
fixture: fixtures/generic-node
graders: [implementation-minimality, no-stack-assumption]
tags: [implementation, stdlib, native, dependency, ladder]
---

Add a second webhook endpoint at `/hooks/v2` that behaves like `/hooks` but
reads its signature from the `x-signature-v2` header instead of `x-signature`.
The signature scheme is identical.

<!--
What this case is for.

The signature is verified today by `isSignatureValid`, built on `node:crypto`'s
`createHmac` and `timingSafeEqual` — the standard library, already imported, one
rung above "write new code". The correct change routes `/hooks/v2` through the
existing verifier reading the new header, a few lines against the existing flow.

The over-build failures this measures: adding an HMAC or webhook-verification
dependency (rung 6 reached when rung 4 already held), or inventing a pluggable
"signature strategy" / verifier abstraction for two endpoints that share one
scheme (a speculative abstraction with no second scheme the request
establishes). Either ships as though required and is the defect
`implementation-minimality` catches.

`no-stack-assumption` runs because this fixture is a plain Node service with no
web framework and no database — a run that reaches for a router library, an
`express`/`fastify`-shaped abstraction, or any dependency the repository does
not have is measuring the change against a stack that is not here.
-->
