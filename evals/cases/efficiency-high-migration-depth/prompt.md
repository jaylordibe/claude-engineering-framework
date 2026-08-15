---
fixture: fixtures/laravel-api
graders: [efficiency-discipline, evidence-discipline, no-stack-assumption]
tags: [efficiency, high-risk, data, migration, deep-mapping]
---

Add a way to mark an app version as deprecated, with the time it happened, and
stop returning deprecated versions from the list endpoint by default.

There is existing data in every environment.

<!--
What this case is for.

A High-risk data change where the depth policy must not economise: a new
persisted column, a backfill decision for rows that already exist, a default
that changes what an existing consumer receives, and a migration that must be
prepared and not applied.

Deep mapping is required, and the `data` lens with it. The last line of the
prompt is the load-bearing one — existing data makes rollout ordering,
mixed-version behaviour and the rollback path part of the design rather than
part of the write-up.

It runs against the PHP fixture on purpose. Every generic sentence about
"add a column and a migration" is true here; every specific one learned from the
other API fixture is wrong. A run that saved investigation by reusing what it
knows about layered APIs produces a fluent plan naming a toolchain this
repository does not have, and that failure is exactly what a cheaper band is
most likely to cause.
-->
