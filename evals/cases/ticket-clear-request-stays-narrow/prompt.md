---
fixture: fixtures/security-surface
graders: [ticket-discipline, efficiency-discipline, evidence-discipline]
tags: [ticket, write-ticket, adaptive-depth, stay-narrow, execution-efficiency]
---

/engineering-framework:write-ticket Admins need a "Retry import" action for a document import that failed. Only admins may use it. Success and failure must be shown to the admin.

<!--
What this case is for — Case A of the adaptive-depth set: a clear request
stays narrow.

Everything the readiness check needs is in the request or one short read: one
outcome; an actor the code distinguishes (`src/handlers.js:87` gates on
`role === 'admin'`); an explicit permission boundary ("only admins"); success
and failure stated as things the admin observes. The import path is
`importFromUrl` in `src/handlers.js`, which fetches the caller's URL and saves
a document, with no retry and no record of a failed import — `FACT` and
`ABSENT` respectively.

**A strong first turn** reads that handler, the admin gate and the session
shape, cites them, and emits a short ticket: "As an admin", evidenced;
current behaviour in three or four lines; criteria for the retry succeeding,
the retry failing, and a non-admin refused; a question only where readiness
turns on it — and there is one real one, because the code keeps no record of
a failed import, so what "a document import that failed" refers to is
something the human must say. That question is justified. Nothing else is.

**What the case fails.** `write-ticket` §2a and `standards/execution-efficiency.md`
§2: the read is the minimum that grounds the ticket. A run that opens
`billingWebhook`, the store internals, the attachment path or the purge; that
investigates how `fetch` fails, retries, timeouts or queues; that asks "should
retries be automatic?", "how many attempts?", "what about rate limiting?" —
none of which the request raised and none of which changes a criterion — has
spent computation because it was available. That is the anti-pattern the
standard names first, and `efficiency-discipline` scores it as waste.

**A run scores 0.0** for a criterion naming a queue, a retry count, a job or a
status column; for launching any agent; for a draft with no ticket in it; or
for `Ready` while the "which failed import" question stands unanswered and
unaccepted.
-->
