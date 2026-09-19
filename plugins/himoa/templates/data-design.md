# Data design worksheet: [model or table]

> A thinking aid, not a deliverable. Use it when a change adds or alters a
> persisted shape. Fold the conclusions into the plan and commit neither.
>
> Storage-agnostic on purpose. "Model" means whatever this system calls a
> persisted shape; "field" means whatever it calls a column or attribute.
> **Discover this repository's own conventions before filling anything in** —
> naming, casing, mapping, identifier strategy — and follow those, not these.

## 1. Shape

| | |
|---|---|
| **Model** | |
| **Physical name** | and whether the repository's convention requires an explicit mapping |
| **New or changed** | |
| **Owned by** | which module or service owns writes to it |
| **Row volume, now and in a year** | order of magnitude is enough |

## 2. Fields

| Field | Type | Nullable | Default | Indexed | Naming convention followed | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

For each new nullable field, say what null *means*. "Not set yet" and "known to
be absent" are different states and they should not share a representation.

## 3. Relationships

| Related model | Cardinality | On delete | Enforced by | Notes |
|---|---|---|---|---|
| | | cascade / restrict / set null / application-level | database constraint / application code / nothing | |

A relationship enforced only in application code is enforced only on the paths
that go through that code. Say which paths do not.

## 4. Uniqueness

| Fields | Scope | Enforced by | Conditional? |
|---|---|---|---|
| | global / per tenant / per parent | | e.g. only among non-deleted rows |

**Conditional uniqueness has a consequence most tools do not surface.** If
uniqueness only holds for a subset of rows, the field is *not* a unique
selector: a lookup that assumes uniqueness may match a row outside the
condition, or fail to compile against a schema that does not declare the field
unique. Establish how this repository looks such a field up, and use that.

The tempting fix of adding the discriminator into the unique key is usually
wrong: in most engines two null discriminators do not collide, so the
constraint permits exactly the duplicate it was added to prevent.

## 5. Lifecycle

| | |
|---|---|
| **Delete semantics** | hard delete / soft delete / archive / append-only / anonymise |
| **How the repository marks it** | field name and convention |
| **Is deleted state filtered automatically?** | where, and on which access paths |
| **Nested reads** | do related records get filtered too, or only top-level ones? |
| **Restoration** | supported? by whom? |
| **Retention and erasure obligations** | |

**Soft deletion is a convenience, never a security boundary.** If a filter is
what stands between a caller and a record they may not see, the boundary is in
the wrong place — see `standards/security.md` §2.

Establish explicitly whether this system's automatic filtering covers nested or
related reads. Many mechanisms only intercept top-level access, so an included
relation returns deleted rows unless it is filtered by hand. Verify; do not
assume either way.

## 6. Access and tenancy

| | |
|---|---|
| **Tenant or owner field** | |
| **Where scope is enforced** | in the query / in a pre-check / nowhere |
| **Can a caller supply this identifier?** | if yes, what re-derives or re-checks it |
| **Actor attribution** | which fields record who created and changed the row, and whether they populate automatically or must be passed |

## 7. Indexes

| Index | Fields | Serves which query | Verified how |
|---|---|---|---|
| | | list / filter / sort / authorization scope / uniqueness | |

Every list, filter, sort and authorization-scoping query the change introduces
should map to an index here, or to an explicit statement that the table is
small enough not to need one.

## 8. Transactions and concurrency

| | |
|---|---|
| **What must be atomic** | |
| **Transaction boundary** | and what is deliberately outside it |
| **Read-modify-write hazards** | and how a lost update is prevented |
| **Counters or sequences** | and whether gaplessness is claimed (usually it must not be) |
| **Idempotency of the write** | |

## 9. Migration

Only if this repository manages its schema through migrations. If it does not —
the schema is applied by hand, by a tool outside the repository, or the store is
schemaless — write `ABSENT` and describe instead what the human has to run, and
in what order.

| | |
|---|---|
| **Consolidated into one migration?** | |
| **Reversible?** | and if not, what the recovery is |
| **Locks taken, and for how long** | on the largest realistic table size |
| **Backfill** | bounded · idempotent · resumable · observable |
| **Mixed-version safety** | can the previous release run against the new shape? |
| **Deployment order** | |
| **Abort threshold** | |

**Prepared, not applied.** The migration file is part of the diff; running it
is the human's. Verify the shape with the repository's build or type check
instead.

If the repository has already deployed this migration history, do not edit an
applied migration — its checksum is recorded and editing it breaks deployment
everywhere it has run. Add a new one.

## 10. Tests

| Assertion | Test | Risk covered |
|---|---|---|
| | | |

At minimum: the uniqueness rule under its real condition, the lifecycle
visibility rule, the tenancy boundary, and one concurrency case if the write
can race.
