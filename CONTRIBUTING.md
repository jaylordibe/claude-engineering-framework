# Contributing

Thanks for considering a contribution. This document covers what makes a change
acceptable here; [`docs/development-guide.md`](docs/development-guide.md)
covers the mechanics.

## The one rule

> **The framework owns methodology. The repository owns truth.**

Before adding a sentence, ask: *is this true in a repository built on a
completely different stack?*

- **Yes** → it belongs here.
- **No** → it belongs in a consuming repository's `CLAUDE.md`.
- **"Yes, but it needs an example"** → write the example as the **question**
  the reader must answer about their own repository, not as the answer from
  yours.

CI enforces this mechanically: any file under `skills/`, `agents/`,
`standards/` or `templates/` naming a specific framework, ORM, database, queue
or tool fails the build.

This will occasionally feel pedantic. It is the constraint that lets one
framework govern a hundred repositories without describing an architecture any
of them lacks.

## Before you open a pull request

```bash
node tests/validate-plugin.mjs --strict
node tests/validate-fixtures.mjs
node tests/validate-charter.mjs
node tests/run-doctor-fixtures.mjs
claude plugin validate ./plugins/engineering-framework --strict
shellcheck plugins/engineering-framework/scripts/*.sh plugins/engineering-framework/bin/*
```

All of them run in CI and take seconds together.

## What a good change looks like

**Guidance changes** name the failure they prevent. "Also check for X" is weak;
"X fails silently when Y, and here is what that looks like" is a contribution.
The strongest additions to this framework are hard-won specifics that
generalise — not more thoroughness.

**Enforcement changes are not accepted.** From 1.0.0 the framework ships no
permission rules and no hooks that gate a tool call, and a pull request adding
either will be declined regardless of how good the rule is. The reasoning is in
`docs/development-guide.md` under *A rule that blocks something*, and the
evidence is in the 1.0.0 changelog entry: the last attempt to extend that layer
went through a six-lens review and came back with two Critical and ten High
defects. If a change genuinely needs an operation stopped, put it in the
charter, give a gate the check, or name the rule a repository owner would add
to their own settings.

**A new fixture** is a stack the framework claims it can discover without
assuming. It needs a row in `fixtures/README.md`, at least one eval case naming
it, and a stack signature in `tests/validate-fixtures.mjs` declaring both what it
must contain and what it must not. Skipping the second half is how a fixture
quietly stops proving anything.

**Constraint discoveries** — something Claude Code does or refuses that shaped
a design decision — go in `docs/constraints.md` with a citation and a date,
*and* get a corresponding check in `tests/validate-plugin.mjs`. A constraint
recorded but not enforced is a comment.

## What will be declined

- **Stack-specific guidance.** However good it is. It belongs in a stack pack,
  and the first stack pack should be extracted from a second real repository
  that needs it — not designed in advance from one.
- **Additions to the session charter**, unless they genuinely apply to almost
  every request. It is the framework's entire always-on context budget in every
  repository a user opens. The first question for a new rule is which skill it
  belongs in instead.
- **A gate that starts refusing something, without a version bump.** The
  framework denies nothing at the tool level any more, but a gate that stops
  where it used to continue still changes a team's workflow, and the version
  number is how that news travels. See [versioning](docs/versioning.md).
- **A second copy of the efficiency policy.** Investigation depth, per-launch
  model choice, fan-out and output size live in
  `standards/execution-efficiency.md`; a skill or agent that needs one cites the
  section. `validate-plugin.mjs` fails a file that restates the depth-band
  vocabulary without the citation.
- **An efficiency saving whose default fails toward spending less.** Every
  default in that standard fails toward spending more, deliberately:
  overspending is visible in a transcript, and underspending produces a
  *shorter, more confident* output than the correct run. A saving that has to be
  argued for is not one worth taking.
- **Abstractions for a second case that does not exist.**
- **Describing anything the framework ships as a sandbox.** Nothing here is one
  and nothing here can become one. It ships no permission rules, and its only
  hook emits the session charter.

## Reporting a problem

The most valuable report this project can receive is:

> An agent described architecture my repository does not have.

That is the failure the whole design exists to prevent, and it is treated as a
correctness bug. Please include the transcript, the relevant part of your
`CLAUDE.md`, and the output of `/engineering-framework:framework-doctor`.

For a security issue — most likely an agent or standard that can be steered by
repository content — see [SECURITY.md](SECURITY.md).

## Code of conduct

Be straightforward and kind. Disagree about the work, not the person. Assume
the other person read the same documentation you did and reached a different
conclusion for a reason worth hearing.
