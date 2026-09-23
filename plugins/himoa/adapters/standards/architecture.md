<!-- GENERATED from plugins/himoa/standards/architecture.md by tests/validate-adapter-projection.mjs (himoa 3.6.0). DO NOT EDIT. Edit the canonical source and run: node tests/validate-adapter-projection.mjs --write -->

# Architecture standard

Generic architectural expectations. The consuming repository's own `AGENTS.md`
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
and not an opportunistic rewrite. This standard owns how much a change
*implements*; `standards/execution-efficiency.md` owns how much it
*investigates*, and the two are independent — deep investigation is the input
to this decision, never a licence to build more.

### 3.1 The complexity ladder

Before introducing new implementation machinery, work down this order and
**stop at the first rung that satisfies the approved behaviour**:

1. **Does this behaviour need to exist at all** to satisfy the approved scope?
   If it is speculative, it is a non-goal — say so in a line and stop.
2. **Does the repository already own it** — a helper, path, abstraction,
   convention or component whose responsibility this is? Reuse it.
3. **Can the existing owner be extended or simplified** rather than a parallel
   path created beside it?
4. **Does the language or runtime standard library** already provide it?
5. **Does the framework, platform, database, browser or operating system the
   repository already runs on** provide it natively?
6. **Does an already-installed dependency** provide it appropriately?
7. **Can the requirement be satisfied directly**, without another abstraction?
8. **Only then** introduce the minimum new code or structure that works.

The first solution that satisfies the approved behaviour **and** the applicable
correctness, security, contract, data, concurrency, maintainability and testing
requirements normally wins. This is a reasoning order, not a mandate to produce
one-liners, and **repository architecture stays authoritative**: do not stop at
a lower rung when doing so violates a declared convention, misplaces a
responsibility (§2), or creates worse ownership or coupling than the rung above.

### 3.2 Unnecessary complexity is a defect

Each of these is scope to cut, not flexibility to keep:

- an abstraction, interface, factory, strategy or provider layer with **one
  implementation** and no second one the approved scope establishes;
- a wrapper that only delegates, unless it protects a real boundary or a
  repository convention;
- a configuration option, flag or parameter **nothing requires** and no
  existing convention asks to be configurable;
- hand-rolled code for what the standard library or the platform already does
  correctly;
- a new dependency for functionality that is trivial and safe to build from
  existing capabilities — a new dependency is justified by capability,
  maintenance and security cost, repository convention, and why native or
  installed capabilities are insufficient, not by convenience;
- a parallel new path left alive beside the old one;
- an abstraction added for a second case that does not exist yet (**YAGNI**);
- an unrelated refactor hidden inside a feature change.

When the approved change makes existing complexity unnecessary, **prefer
deleting it**. Delete what you replace: no "legacy" directories, no
commented-out former implementations, no `// removed` markers, and no in-scope
call site left half-migrated — if four call sites share the pattern being
changed, migrate all four, or state explicitly why not.

### 3.3 Smaller is a signal, larger is sometimes correct

Prefer the **smallest coherent diff, not the fewest lines**. Fewer files, lines
and dependencies are useful signals that the ladder was walked; none of them is
a correctness target, and none may be bought by dropping a test, a validation
step, an access check or an error path — §1 orders correctness and security
above delivery speed, and this section never reorders them.

A larger solution is correct when the evidence, the approved design, the
repository's architecture, the risk tier or a contract requires it. The rule
cuts what the requirement does not need; it never argues a genuinely
cross-cutting requirement down into an unsafe or architecturally wrong
shortcut.

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
