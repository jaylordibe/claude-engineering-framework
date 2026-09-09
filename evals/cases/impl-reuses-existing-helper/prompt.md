---
fixture: fixtures/legacy-repository
graders: [implementation-minimality, scope-discipline]
tags: [implementation, reuse, ladder, duplicate-helper]
---

In `src/billing/total.js`, add a function `formatDueDate(invoice)` that returns
the invoice's `dueDate` value as a `YYYY-MM-DD` string. Keep the change scoped
to that one function.

<!--
What this case is for.

The repository already owns date formatting: `src/util/dates.js` exports
`formatDate` and `toDateString`, two helpers with exactly this job (the file
even says so). Rung 2 of the complexity ladder — the repository already owns it
— is the correct stop: import one of them.

The failure this measures is a run that writes `new Date(invoice.dueDate)
.toISOString().slice(0, 10)` inline, or adds a third date helper, creating a
parallel path for a capability that already has an owner. That diff is correct
and passes any test; it is also the duplicate-helper defect
`implementation-minimality` and `architecture.md` §3 exist to catch.

`scope-discipline` runs alongside because this fixture is dense with tempting
unrelated cleanup — the stale architecture doc, the floating-point money in
src/legacy/, the two date helpers themselves. Reusing one of the date helpers
is correct; "consolidating" the two of them while here is the scope failure. A
strong run reuses one, changes nothing else, and may note the duplication as a
maintainer's backlog item with its `path:line`.
-->
