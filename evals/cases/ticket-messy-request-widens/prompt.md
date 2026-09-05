---
fixture: fixtures/security-surface
graders: [ticket-discipline, efficiency-discipline, diagnosis-discipline]
tags: [ticket, write-ticket, adaptive-depth, widen, defect, actor, split]
---

/engineering-framework:write-ticket Sometimes invoices don't get marked paid after the customer pays. Maybe use Redis retries. Admins should be able to mark them paid by hand, maybe vendors too. We need to know whether the provider's webhook actually reached us, and nothing should ever get paid twice.

<!--
What this case is for — Case B of the adaptive-depth set: a messy request
widens, and widens for the right reasons.

Five things are tangled in four sentences: a **symptom** (invoices not marked
paid), a **mechanism offered as a cause and a fix** (Redis retries), an
**actor boundary that is unresolved** (admins, "maybe vendors too" — the code
has one role, `admin`, and no vendor anywhere), a **requirement that may be two**
("reached us" is receipt; the human may mean processed, and those are
materially different things to observe), and a **behavioural boundary**
(nothing paid twice). It may also be three tickets: fix the missed payments,
give someone a manual mark-paid, expose delivery reporting.

The read that grounds all of that is still small: `billingWebhook` in
`src/handlers.js` (signature check, then `invoices.set(...)` — an overwrite,
so a second delivery is idempotent today, `FACT`), the `invoices` map in
`src/store.js` (no record of receipt, no timestamps, `ABSENT`), the admin
gate at `src/handlers.js:87`, and the absence of any vendor concept. Nothing
about Redis, retries or the provider's delivery semantics is in the
repository, and the run must not go looking for it — the trigger is
requirement ambiguity, and §2a widens for the WHAT only.

**A strong first turn** emits a full draft and, beside it, names what fired:
actor unclear, "reached" against "processed" unclear, a symptom mixed with a
cause, possibly several outcomes. It keeps the symptom whole in **Problem**;
grades the reporter's cause as a hypothesis (and notes as `ABSENT` that there
is no retry or queue in the code, without investigating what one would need);
writes Redis under **Ideas from discussion**; writes "no invoice is paid
twice" as a criterion with the current overwrite behaviour cited beside it;
lists admin-versus-vendor as a blocking open question owned by the human; and
asks three ranked questions — which of the three outcomes this ticket is for,
who may mark by hand, and whether "reached us" means received or processed.
Readiness is `Not ready`, with the split named first.

**What the case fails.** A short, confident draft that picks "admins", treats
"reached us" as "processed", and bundles the three outcomes into one story
has under-widened; `standards/execution-efficiency.md` §13.1 says the close
call spends more, and this is not even close. Equally, a run that reads for
Redis, retries, queue libraries or the provider's API has widened into
design (`ticket-discipline` automatic failure 7). And a run that names the
cause — "the webhook is failing signature verification", say — has proved
nothing (`diagnosis-discipline`; automatic failure 8).

**A run scores 0.0** for `Ready`; for an invented "vendor" role stated as
existing; for a criterion naming Redis, a retry, a queue or a job; for a
root cause stated as fact; or for silently choosing one of the three
outcomes without saying the others exist.
-->
