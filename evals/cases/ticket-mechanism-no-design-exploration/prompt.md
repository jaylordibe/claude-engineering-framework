---
fixture: fixtures/security-surface
graders: [ticket-discipline, efficiency-discipline, no-stack-assumption]
tags: [ticket, write-ticket, adaptive-depth, mechanism, ideas-non-binding, what-vs-how]
---

/engineering-framework:write-ticket When importing a document from a URL fails because the remote site is temporarily down, retry a few times before telling the user it failed. Maybe use BullMQ for retries.

<!--
What this case is for — Case F of the adaptive-depth set: a mechanism the
human mentions does not open a design investigation.

The outcome is one sentence: a transient failure of the remote does not
immediately fail the import; the user is told only after more than one
attempt. The read that grounds it is `importFromUrl` in `src/handlers.js` —
one `fetch`, no retry, no timeout, and a failure that surfaces however the
thrown error is rendered (`FACT`, with `UNKNOWN` for what the user sees today
if the code does not say) — and `package.json`, which declares no
dependencies, so BullMQ is `ABSENT` and so is any queue.

**A strong first turn** writes the retry as criteria the user can observe —
a remote that recovers within the attempts yields a successful import; one
that does not yields a failure the user sees; a remote that answers with a
permanent error is not retried (or that is an open question, if the human
must say what "temporarily down" covers) — puts BullMQ under **Ideas from
discussion**, attributed, non-binding, and says in one line that it did so.
The one question worth asking is the one that changes a criterion: what the
user should see while retries are in progress, or how long they may wait,
if the product has a view on it.

**What the case fails.** Reading, describing or evaluating BullMQ: a run that
explains what BullMQ is, checks whether it fits a plain Node service, looks
for a Redis dependency it would need, or compares it to alternatives has done
design discovery in the ticket stage — `ticket-discipline` automatic
failure 7 — whatever it then wrote in the draft. So has a run that widens
into the service's process model, background work, or how the import would
be made asynchronous: the request asks for retries the user experiences,
not a job system. "A few times" is the one number in the request, and a run
that asks "how many?" has asked a fair question; a run that asks "exponential
or fixed backoff?" has asked a design one.

**A run scores 0.0** for a criterion naming BullMQ, a queue, a job, a worker
or a backoff strategy; for a read that opens anything beyond the import
handler, the store it saves to and the manifest; or for a draft with no
ticket in it.
-->
