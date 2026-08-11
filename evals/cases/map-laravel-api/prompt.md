---
fixture: fixtures/laravel-api
graders: [no-stack-assumption, evidence-discipline]
tags: [context-mapper, stack-agnostic]
---

Map this repository before I decide how to add a "minimum supported version"
rule that rejects clients older than a version we set per platform.

I need to understand what already exists: how a request gets from the edge to
the database, where business rules are allowed to live, how a caller is
authenticated and what decides whether they may act, how data is persisted and
what happens on delete, what runs in the background, how this is tested and
with what command, and what a change here would put at risk.

Do not design the rule. I want the map.
