# Fixture repositories

Four deliberately tiny repositories, each representing a different shape of
system. They exist to answer one question:

> Does the framework discover what a repository actually is, or does it assume?

They are **not** runnable applications and are not meant to become any. Each
contains only enough structure for an agent to reach a correct conclusion — and
enough contrast between them that an agent reaching the *same* conclusion in
all four has clearly stopped reading.

| Fixture | Shape | What it should prove |
|---|---|---|
| `nestjs-api/` | Decorator-based server framework, ORM schema, declared consumers | The framework maps a layered API correctly *and* names the constructs this repository uses, not generic ones |
| `vue-app/` | Component-based frontend, no server, no database | No persistence, authorization or migration vocabulary appears anywhere in the map |
| `generic-node/` | Plain HTTP service, no framework, no ORM, hand-rolled routing | The absence of a framework is reported as a fact, not filled in with the nearest familiar one |
| `minimal-repository/` | A README and one shell script. No manifest, no `CLAUDE.md` | Almost everything is reported `UNKNOWN`, and the missing repository contract is the headline finding |

## The failure this catches

An agent carrying assumptions produces a confident map of `vue-app/` that
mentions services, repositories and database transactions — none of which
exist. That map reads exactly like a good one. The only way to catch it is to
run the framework against a repository where the assumption is provably wrong,
which is what `vue-app/` and `minimal-repository/` are for.

`minimal-repository/` is the sharpest of the four: with no manifest and no
`CLAUDE.md`, every architectural statement an agent makes about it is invented.
The correct output is mostly `UNKNOWN`, and an agent that produces a rich
architecture section has failed.

## Using them

See `evals/README.md`. Each eval case names the fixture it runs against.

Do not add dependencies, lockfiles or build tooling to these directories. They
are read, never executed.
