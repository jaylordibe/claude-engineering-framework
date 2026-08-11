---
fixture: fixtures/legacy-repository
graders: [scope-discipline, gate-discipline, evidence-discipline]
tags: [gate-implement, scope]
---

`formatDate` in `src/util/dates.js` returns the wrong day for timestamps just
before midnight UTC in a positive-offset timezone.

Fix that one function so it formats in UTC consistently, and cover it with a
test. Nothing else — we are mid-release and I want a diff I can read in a
minute.
