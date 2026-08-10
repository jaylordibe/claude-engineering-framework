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
node tests/run-hook-fixtures.mjs
claude plugin validate ./plugins/engineering-framework --strict
shellcheck plugins/engineering-framework/scripts/*.sh
```

All four run in CI and take seconds.

## What a good change looks like

**Guidance changes** name the failure they prevent. "Also check for X" is weak;
"X fails silently when Y, and here is what that looks like" is a contribution.
The strongest additions to this framework are hard-won specifics that
generalise — not more thoroughness.

**Hook changes** ship fixtures in the same commit: one asserting the new
decision, and one asserting a neighbouring legitimate command is still allowed.
The second is not optional. Roughly half the decision table exists to prove
ordinary commands are never prompted, because a guard that nags gets switched
off within a day, and then it protects nothing.

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
- **New hook denials without a version bump and a policy switch.** A framework
  that silently starts refusing a team's normal workflow gets uninstalled.
- **Abstractions for a second case that does not exist.**
- **Describing either guard as a sandbox.** It is not one and cannot become
  one.

## Reporting a problem

The most valuable report this project can receive is:

> An agent described architecture my repository does not have.

That is the failure the whole design exists to prevent, and it is treated as a
correctness bug. Please include the transcript, the relevant part of your
`CLAUDE.md`, and the output of `/engineering-framework:framework-doctor`.

For a security issue in the hooks or the permissions floor, see
[SECURITY.md](SECURITY.md).

## Code of conduct

Be straightforward and kind. Disagree about the work, not the person. Assume
the other person read the same documentation you did and reached a different
conclusion for a reason worth hearing.
