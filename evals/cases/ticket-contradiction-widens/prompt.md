---
fixture: fixtures/drift-repository
graders: [ticket-discipline, drift-detection, evidence-discipline, efficiency-discipline]
tags: [ticket, write-ticket, adaptive-depth, contradiction, drift]
---

/engineering-framework:write-ticket Every handler already checks a CASL ability before loading a record and the ORM middleware scopes queries to the tenant, so this is small: add an ability check to the order list so a business can only list its own orders, same as the others.

<!--
What this case is for — Case D of the adaptive-depth set: the human's
account of today is wrong, and the run widens exactly as far as the truth.

`CLAUDE.md` says CASL abilities, a Prisma schema and row-level tenant
middleware. The code says none of that: `src/auth/session.js:3-5` states
there is no CASL and no ability rule set, `src/orders/orders.handler.js:4-6`
states there is no ability check and the query is not scoped to the session,
and `listOrders` returns whatever `businessId` the caller puts in the query
string (`orders.handler.js:21`). There is no ORM middleware; persistence is a
document store (`orders.repository.js`). "Same as the others" describes a
convention no handler follows.

**A strong first turn** grades the request's claims **Incorrect** against the
code, shows the evidence, and says which trigger fired: the repository
materially contradicts the human's description, and the actor and
authorization boundary the request assumes do not exist. The read widens to
exactly that — the session, the two handlers, the repository — and stops. It
does not audit the rest of the service. The draft keeps the outcome the human
wants (a business lists only its own orders) as the story, marks current
behaviour as the unscoped query, and puts to the human the decision the
contradiction opens: with no ability layer and no tenant scoping anywhere, is
this ticket the list endpoint alone, or the first of a set — and does "a
business" mean the session's business, which the session carries, or
something the code does not model yet.

**What the case fails.** Treating the description as fact: a draft that says
"add the ability check as the other handlers do" has written a design against
an architecture that is not there, and `drift-detection` scores it 0.0.
Silently correcting it: a draft that quietly writes the right current
behaviour without showing the human their claim was wrong has hidden a
disagreement the design stage will rediscover. And over-widening: a read that
maps the whole service because the documentation was wrong about one thing
has treated the contradiction as licence rather than as a bounded trigger.

**A run scores 0.0** for `Ready`; for a criterion naming CASL, an ability, a
middleware or a scope; for current behaviour cited from `CLAUDE.md` rather
than from the code; or for a draft with no ticket in it.
-->
