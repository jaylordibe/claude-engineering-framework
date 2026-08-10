# Testing standard

Generic expectations for tests the framework writes, asks for, or judges. The
consuming repository's test topology is authoritative: discover it before
prescribing anything.

## 1. Discover the topology before writing a test

Establish, from the repository:

- the test runner and how it is invoked, including any filtered form;
- where each kind of test lives, and the naming convention that makes the
  runner find it;
- what a test needs before it can run — services, fixtures, seeded data,
  environment configuration;
- **who owns destructive setup**, and against which store. A suite that
  recreates a database must own a database that exists only for tests;
- whether the suite runs in parallel, and what isolation each worker gets.

If tests run in parallel, **no test may assume exclusive access to anything
outside its own worker's isolated state**. This is the single most common
source of a suite that passes alone and fails in CI.

Never point a test at development or production data, and never reset a store
the developer is using.

## 2. Layers

Choose the cheapest layer that can actually prove the thing:

| Layer | Proves | Use when |
|---|---|---|
| **Unit** | A pure rule, transform or calculation | The logic is decidable without I/O |
| **Integration** | That real components agree — validation, serialisation, persistence, authorization, transactions | The contract *between* layers is what can break |
| **End-to-end / contract** | The externally observable behaviour a consumer depends on | The change touches a public contract |
| **Property or fuzz** | Invariants across generated input | The input space is large and the invariant is crisp |

A rule this framework holds firmly: **do not mock the thing under test.**
Mocking the persistence layer to test a persistence-dependent behaviour proves
only that the mock was configured to agree with the assertion.

## 3. Required scenarios

Cover each of these that the change makes reachable. A risk with no test mapped
to it is an accepted risk, and must be stated as one rather than left implicit.

- the success path;
- validation failure, including the exact error detail a consumer parses;
- the stable error identifier and result shape;
- unauthenticated, insufficient permission, and another actor's or tenant's
  record;
- not-found versus forbidden disclosure behaviour;
- sensitive fields excluded from the response;
- audit or provenance records written with the right actor;
- soft-deletion, archival or other lifecycle visibility rules;
- concurrent updates to the same record;
- duplicate delivery, replay and idempotency;
- retry exhaustion and terminal failure handling;
- dependency timeout and failure;
- pagination boundaries and deterministic ordering;
- time-zone, date boundary and daylight-saving behaviour;
- monetary rounding and currency handling;
- backward compatibility of a changed contract;
- a regression case reproducing any defect that was fixed.

## 4. Quality

Reject, in your own tests and in review:

- assertions weak enough to pass on the wrong value — truthiness on an object,
  "not null", a bare status check where the body is the contract;
- uncontrolled time, randomness, network or ordering;
- arbitrary sleeps standing in for synchronisation;
- a new test added beside a stale one asserting the old behaviour — update the
  existing assertion instead;
- focused or skipped tests committed;
- broad snapshots that absorb a contract change without anyone noticing;
- tests that depend on execution order or on another test's leftovers;
- a coverage percentage presented as proof of anything.

Tests are part of the change, not a follow-up. A behaviour change whose test
was not updated is an unfinished change.

## 5. Evidence

Every reported run states the exact command, the filter or scope, the result,
and the environment. Report results in the vocabulary of
`standards/evidence.md`: `PASS`, `FAIL`, `BLOCKED`, with scope on the verdict
line.

The normal minimum for a change is: the repository's build or type check, its
lint check, the affected unit tests, and the affected integration or end-to-end
tests — **whichever of those this repository actually has.** A repository with
no linter is a normal repository; mark the absent gate `N/A` with the evidence
that it is genuinely absent, not `BLOCKED`. Running the full suite follows the
repository's own cadence, typically when a unit of work is complete or when the
user asks.

Skipped, partial, blocked or flaky is never `PASS`.
