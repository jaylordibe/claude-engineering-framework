---
name: domain-background-work
description: The decisions and failure modes that govern work running outside a request. Carries the questions a change must answer, and none of the answers.
when_to_use: Use when adding or changing work that runs outside a request — a background or queued job, a scheduled or recurring task, a retry or reconciliation sweep, a delayed notification or expiry, a webhook retry, a batch import, or tests for any of those.
user-invocable: false
---

# Background and scheduled work

This skill carries the **decisions and the failure modes**. It does not know
what transport this repository uses, or whether it has one.

**Establish that from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md`. If the repository has
no background mechanism at all, that is the finding: introducing one is an
architectural decision for the design gate, not an implementation detail.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What runs work outside a request, and how is it started? | |
| Is it a separate process, or the same one? | |
| How many instances run in production? | |
| What delivery guarantee does the transport give? | |
| What are the existing retry, backoff and failure defaults? | |
| Where does a permanently failed unit of work end up? | |
| How is a job correlated back to the request that created it? | |
| How are these tested, and is time controllable in tests? | |

## 2. The first decision: per-record job, or recurring sweep?

These are different tools and choosing wrong is the most expensive mistake in
this area.

| | **Per-record job** | **Recurring sweep** |
|---|---|---|
| Triggered by | one record becoming ready | the clock |
| Natural fit | delayed action, notification, expiry, retryable external call, anything cancellable or reschedulable | reconciliation, retention, cleanup, catching what the primary path missed |
| Scales with | number of records | frequency, and batch size |
| Cancellation | natural — cancel the job | awkward — the sweep must re-check the condition |
| Failure isolation | per record | one bad record can stall the batch |
| Risk when misused | none particular | a sweep that scans a growing table every minute |

**Default to a per-record job** when the work belongs to one record and needs
timing, retries, cancellation or rescheduling.

**Use a sweep** for reconciliation over many records, and for the safety net
that catches what the primary path dropped. A well-built system often has both:
the job does the work, the sweep catches the misses.

## 3. The failure modes, in order of how often they are real

### Multiple instances doing the same work

A scheduled task in a service running three instances fires three times. Unless
something prevents it, the work happens three times.

Pick one and state it: an **atomic claim** on each record (a conditional update
that only one writer can win), a distributed lock with a lease shorter than the
interval, or a single designated runner. "It only runs on one instance" is an
assumption that survives until the day someone scales up.

An atomic claim is usually the better mechanism: it also gives per-record
failure isolation, which a lock does not.

### Assuming exactly-once delivery

Almost every transport delivers at least once. Handlers must be **idempotent**:
running twice produces the same result as running once. Achieve it by claiming
the record, by a natural uniqueness constraint, or by an idempotency key
recorded before the side effect.

The dangerous case is the side effect that is not in your database — a charge,
an email, an external call. Record the intent, perform the effect, record the
outcome; on a retry, check the record first.

Never claim exactly-once without naming the mechanism that provides it.

### Unbounded batches

A sweep that selects every due row works until the day there are two million.
Bound the batch, order it deterministically, and let the next tick take the
rest. Also bound the *overall* run: a sweep that overruns its own interval and
overlaps with itself is a distinct failure with a distinct fix.

### Retry storms

Retries need a bounded attempt count, exponential backoff and **jitter**.
Without jitter, everything that failed during an outage retries in lockstep
when it ends and takes the dependency down again.

Retry only known-transient failures. Retrying a validation error is just a
slower failure, repeated.

### No terminal state

Every unit of work needs a defined end: succeeded, or permanently failed and
**visible**. Work that fails silently after its attempts are exhausted is work
nobody knows was lost. Name where it goes and who looks at it.

### Payloads that go stale or leak

A payload carrying a full record snapshot is stale by the time it runs. Carry
an identifier and re-read, unless the point is to capture a moment.

A payload is stored, often in a store with different access controls and
retention. Do not put credentials or personal data in one.

### Cancellation and rescheduling that do not compose

If work can be cancelled or rescheduled, decide what happens to an instance
already in flight, and what happens when the same trigger fires twice before
the first runs. Deduplicate on a stable key, or accept and document duplicates.

### Losing the thread

A background failure with no correlation back to the request that caused it is
an hour of someone's afternoon. Carry a correlation identifier from the
originating request into the job payload, and into every log line the handler
emits.

## 4. Tests that must exist

- the handler is idempotent: run it twice, assert one effect;
- a claim is atomic: two concurrent runners, one winner;
- retries stop at the bound, and the exhausted unit reaches its terminal state;
- a non-transient failure is not retried;
- cancellation prevents the effect, including for in-flight work;
- the batch bound is respected, and the remainder is picked up next time;
- time is controlled — no arbitrary sleeps, no dependence on wall-clock
  ordering;
- the correlation identifier survives into the handler's logs.
