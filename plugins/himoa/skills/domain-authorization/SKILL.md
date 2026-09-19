---
name: domain-authorization
description: The decisions and failure modes that govern who may do what to which record. Carries the questions a change must answer, and none of the answers.
when_to_use: Use when changing who can access which records — permissions or roles, tenant or organisation boundaries, ownership rules, an access check on an entry point, a query that must be scoped to the caller, administrative operations, or tests for any of those.
user-invocable: false
---

# Authorization

This skill carries the **decisions and the failure modes**. It does not know
how this repository implements any of them.

**Establish the mechanism from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` — then apply the
questions below to what you actually found. Use this repository's own words for
its constructs, and never introduce a term it does not use.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| How does an operation declare what it requires? | |
| Is that declaration mandatory, and what happens if it is missing? | |
| Where are permissions defined, and what is the source of truth? | |
| How is a permission check performed at the operation level? | |
| **How is access to a specific record enforced?** | |
| Is that enforcement in the data query, or in a check before the record loads? | |
| What is the tenancy model, and where is its boundary applied? | |
| How are grants resolved per request, and are they cached? | |
| How is a revoked grant invalidated, and how long does it take? | |

An **`UNKNOWN`** here — you could not tell — is a blocker for the change, not a
detail to work around.

An **`ABSENT`** — you searched and this system genuinely has no such
mechanism — is a finding, and often the most important one on the page. A
single-tenant system has no tenancy boundary, and saying so plainly is the
correct answer; inventing one to fill the row is not. But an *absent
authorization check on an operation that needs one* is a defect, so say which
of the two you found.

## 2. The decisions this change must make

1. **What does this operation require?** Public, authenticated, or a specific
   permission — stated explicitly, never inherited by accident.
2. **Which records may this caller reach?** Expressed as a constraint on the
   query, not as a sentence in a review.
3. **What does the caller see when they may not?** Not-found, or forbidden.
4. **What happens to a caller-supplied identifier** that names something they
   do not own?
5. **What is audited**, and with which actor attribution?
6. **How is each of the above tested negatively?**

## 3. The failure modes, in order of how often they are real

### A rule check is not a record check

A permission check proves a **rule exists**. It cannot prove **this row is
allowed**, because it runs before the row is loaded. Any design where "the
guard handles it" is the answer to "how is this record protected" is wrong by
construction.

**Enforce record-level access in the data query**, so an unauthorised row is
never loaded in the first place. A filter applied after loading is a leak
waiting for the first code path that forgets it.

### Disclosure through the error

Returning *forbidden* for a record the caller may not know exists confirms that
it exists. Use **not-found for invisible records**, and *forbidden* only when
the caller may see the record but may not perform this action.

The same applies to timing, response size, and validation-error specificity.

### Escalation through a foreign key

A caller who may create or update a record can often set a field that points at
another record. If that pointer determines access — owner, tenant, parent,
account, role — then setting it *is* an authorization operation. Validate that
the caller may reference the target, not merely that the target exists.

### Trusting the client for scope

A tenant, organisation, owner or account identifier taken from the request and
used to select data means the caller chooses their own scope. Derive it from
the authenticated principal; if it must be supplied, re-verify it.

### Composing filters incorrectly

When an access constraint is merged into an existing query, the combination can
be wrong in a way that fails **open**: an empty constraint that should mean
"nothing" instead means "no restriction". Establish how this repository
composes constraints, and confirm the empty case denies rather than permits.

Write the test that proves the empty case denies. It is the one that catches
this.

### Stale grants

If grants are cached, a revoked permission stays live until the cache expires.
Establish the invalidation path and its latency, and state it — "revocation
takes effect within N" is an answer; silence is not.

### Administrative operations

An operation that legitimately crosses the tenancy boundary needs its own
scope, its own rate limiting, and its own audit trail. "Admin" is not a
boundary; it is a much larger one that still has edges.

## 4. Tests that must exist

Write every one this system can actually express. Skip a row only when the
boundary it tests is `ABSENT`, and say so — a single-tenant system has no
cross-tenant test to write, and pretending otherwise produces a test that
asserts nothing.

- unauthenticated caller;
- authenticated caller without the permission;
- authenticated caller with the permission, **another tenant's record** (where
  tenancy exists);
- authenticated caller with the permission, **another actor's record**;
- the invisible-record response is not-found, asserted explicitly;
- a caller-supplied identifier naming a record they do not own is rejected;
- the empty-constraint case denies;
- revocation takes effect within the stated window.

A change to authorization with no negative test has not been tested.
