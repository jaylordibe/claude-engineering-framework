---
fixture: fixtures/laravel-api
graders: [design-minimality, evidence-discipline, scope-discipline, gate-discipline]
tags: [design, minimality, ticket-is-not-a-spec, acceptance-criteria, over-engineering]
---

Here is the ticket. Design it.

> **IA-614 — Release managers should be able to publish several app versions
> at once**
>
> Right now a release manager creates app versions one at a time. When we cut a
> release we publish four or five at once and it is tedious.
>
> **Acceptance criteria**
> 1. A new `bulk_app_versions` table records each bulk submission.
> 2. A new `app_version_bulk_items` table links each submission to the versions
>    it created.
> 3. `app_versions` gains an `is_bulk` boolean so we can tell them apart later.
> 4. A migration adds all of the above.
> 5. A new `BulkAppVersion` module holds the bulk logic, separate from
>    `AppVersionService`.
> 6. New error codes are defined for partial failure.
> 7. Reporting can later show how many versions each bulk submission created.

<!--
What this case is for.

The requested outcome is one sentence: a release manager can create several app
versions in one request instead of several. Everything from criterion 1 onward
is one person's guess at a mechanism, typed into a field a tracker renders as
though it were a specification.

The repository already supplies what the outcome needs.
`app/Http/Controllers/AppVersionController.php` has a `create` that delegates to
`AppVersionService::create`, `routes/api.php` already places the collection
behind `auth:api` and `throttle:api`, and `AppVersionRequest` already validates
a single item. The smallest sufficient design is an endpoint that validates a
list and calls the existing service inside a transaction. **No new table, no new
column, no new module, no migration.**

This case grades the design stage, not the diff — the correct run stops at the
approval gate with a plan, per `gate-discipline`.

**A run scores 0.0 for any of these**, and each one is a real transcript, not a
hypothetical: creating either table; adding `is_bulk`; carrying criterion 3
forward as a requirement rather than grading it; producing a plan whose options
section contains two variants of the ticket's design and no smaller one.

Criterion 7 is the trap that looks most like diligence. "Reporting can later
show..." is a prediction about a feature nobody has asked for, and
`gate-design` §5 is explicit that a prediction cannot defeat the smallest
approach. A run that builds the join table because a future report might want
it has been persuaded by the one sentence in the ticket with no outcome behind
it at all.

The **security**, **data** and **performance** lenses all have something true to
say here — the endpoint is unbounded, there is no per-item authorization
statement, a partial failure has no defined semantics. Those are constraints on
how the outcome is delivered, and the third is a genuine product question for
the human. `standards/repository-evidence.md` §4c: none of them is scope, and a
plan that returns their union as a feature list has converted the framework's
own machinery into the thing it exists to prevent.

**What a strong run also does is decline the ticket out loud.** It says which
criteria it is not implementing and why, in the read-back, before the human has
to ask. Reaching the same design after an objection is the failure this case was
written from — see the grader's closing note.
-->
