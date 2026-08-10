# Architecture standard

Generic architectural expectations. The consuming repository's own `CLAUDE.md`
and source-owned contract documents are authoritative; where they conflict with
this file, they win. This standard says how to reason, not what this system is.

Read `standards/repository-evidence.md` first. Nothing here licenses an
assumption about how this repository is built.

## 1. Priorities, in order

1. correctness and data integrity
2. security and privacy
3. compatibility and operability
4. maintainability and testability
5. performance and cost
6. delivery speed

When two priorities conflict, the higher one wins and the trade-off is stated
rather than absorbed silently.

## 2. Boundaries

- **Every business rule has exactly one authoritative owner.** Two places
  deciding the same thing is a defect waiting for the day they disagree.
- **Transport concerns and domain rules are separated.** The layer that parses
  a request is not the layer that decides what is allowed.
- **Persistence shapes are not contract shapes.** Returning a storage record
  directly to a consumer couples your schema to their release cycle and leaks
  every field you later add.
- **Dependency direction is declared and enforced.** If the repository declares
  a layering rule, respect it and cite it; if it enforces it mechanically,
  never work around the enforcement. If it declares none, say so rather than
  inventing one.
- **Shared/common code is a leaf.** Anything shared by many modules must not
  depend back on them, or the graph has a cycle nobody can reason about.
- **Configuration has one typed source.** Reading environment or settings
  directly from scattered call sites makes the configuration surface
  undiscoverable.

## 3. Coherent scope

Prefer the **smallest coherent and complete** change: not the smallest patch,
and not an opportunistic rewrite.

Do not:

- leave in-scope call sites half-migrated — if four call sites share the
  pattern being changed, migrate all four, or state explicitly why not;
- create a parallel new path beside the old one and leave both alive;
- add an abstraction for a second case that does not exist yet;
- hide an unrelated refactor inside a feature change.

Delete what you replace. No "legacy" directories, no commented-out former
implementations, no `// removed` markers.

## 4. Contracts

Treat as **externally observable**, whatever the transport:

- request and response shapes, and every field's required / optional / nullable
  status;
- enumerated value sets;
- stable machine-readable error identifiers;
- status or result codes;
- pagination, filtering, sorting and ordering behaviour;
- event, message and webhook payloads;
- idempotency and retry semantics;
- published schemas and generated client artefacts.

Every change to one of these must identify:

1. **who consumes it** — from the repository's declared consumer list, or an
   explicit "none, and here is why";
2. **mixed-version behaviour** — what happens while old and new run together;
3. **deployment order** — which side must ship first;
4. **rollback or roll-forward path**.

**Type compatibility is not runtime compatibility.** A field that compiles
everywhere can still be absent at runtime in a consumer that has not deployed.
A cross-repository dependency remains a blocker until its owning change ships.

## 5. State and distributed behaviour

Model explicitly, and only claim what a mechanism actually provides:

- lifecycle states and which transitions are legal;
- what happens on an illegal transition;
- transaction boundaries, and what is *not* inside them;
- concurrency: lost updates, read-modify-write races, and how they are
  prevented;
- delivery semantics, and duplicate handling;
- idempotency of anything that can be retried;
- retryable versus terminal failures;
- timeouts, cancellation and backpressure;
- correlation identifiers across process boundaries;
- reconciliation when the two sides disagree.

Never claim exactly-once delivery, gapless business sequencing, or ordering
guarantees without naming the bounded mechanism that provides them.

## 6. Data evolution

For a system that is already deployed, evolve in the expand / migrate /
contract order: add the new shape, move the data and the readers, then remove
the old shape — with a deploy boundary between each.

Every schema or data change addresses:

- existing rows and any backfill, bounded, idempotent, resumable and
  observable;
- index and constraint changes, and the lock they take;
- mixed-version reads and writes during rollout;
- an abort threshold and what happens when it is hit;
- recovery: surgical repair or roll-forward, never an automatic reset.

## 7. Design records

A material decision records: context, instruction-versus-code reconciliation,
alternatives considered and why they lost, security implications, the
file-by-file plan, tests, verification, migration, rollout, deliberate
non-goals, and the human approval.

Where a decision must outlive the session — a non-obvious invariant, a line
that looks deletable but is not — put the explanation in a **code comment
beside the thing it protects**. That is where the person about to delete it is
looking.
