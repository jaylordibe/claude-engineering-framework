---
fixture: fixtures/legacy-repository
graders: [efficiency-discipline, scope-discipline, no-stack-assumption]
tags: [efficiency, low-risk, targeted-mapping, context-mapper]
---

The comment above `computeTotalCents` in `src/billing/total.js` still describes
the old behaviour and the parameter name is unhelpful. Tidy that one function —
the comment and the local naming — without changing what it computes.

That is the whole job. I do not want a survey of the repository.

<!--
What this case is for.

A genuinely localized Low-risk change, in a repository deliberately full of
tempting unrelated work. It grades the CHEAP side of the efficiency policy: the
run should establish the current behaviour, the exact symbol, its callers and
the test protecting it — and stop, rather than mapping persistence, tenancy and
operations that a one-function comment change cannot reach.

What it must NOT do is skip those categories silently. "This function performs
no data access and has two callers, both in `src/`" is a cheap evidenced answer
and scores 1.0. Omitting the question scores 0.0, and reads identically in a
transcript unless you look for it.

Review and validation still run in full. A Low tier removes the plan document;
it removes nothing else.
-->
