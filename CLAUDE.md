# CLAUDE.md

## Project

The `engineering-framework` plugin for Claude Code, plus the marketplace that
serves it. Markdown, JSON and POSIX shell — no build step, no runtime
dependencies, no published artifact. The marketplace serves this repository
directly.

Node is used only to run the validators in `tests/`. There is no package
manifest and nothing to install.

**What this repository ships runs in other people's repositories.** A wrong hook
rule blocks somebody's legitimate work; a wrong standard makes an agent describe
an architecture that does not exist. Both failures are silent from here, which
is why almost everything in `tests/` exists.

## Canonical commands

| Purpose | Command |
|---|---|
| Static plugin validation | `node tests/validate-plugin.mjs --strict` |
| Fixture corpus validation | `node tests/validate-fixtures.mjs` |
| Charter budget and guarantees | `node tests/validate-charter.mjs` |
| Guard decision tables | `node tests/run-hook-fixtures.mjs` |
| Guard robustness | `node tests/guard-robustness.mjs` |
| Repository contract audit | `node tests/run-doctor-fixtures.mjs` |
| Lint | `shellcheck plugins/engineering-framework/scripts/*.sh plugins/engineering-framework/bin/*` |
| Official validator | `claude plugin validate ./plugins/engineering-framework --strict` |

There is no build, no type check and no end-to-end suite. `jq` must be on
`PATH`: both guards fail closed without it, so every fixture would pass as
`ask` and prove nothing.

## Architecture

```
.claude-plugin/marketplace.json     the catalogue
plugins/engineering-framework/
  agents/                           eight read-only review lenses
  skills/                           five gates, a conductor, playbooks, install/doctor
  standards/                        the normative texts agents read
  templates/                        thinking aids, never committed by a run
  scripts/                          the SessionStart charter and two PreToolUse guards
  bin/ef-doctor                     repository contract audit
  reference/                        the permissions floor, config schema, CLAUDE.md template
fixtures/                           eleven tiny repositories of different shapes and situations
evals/                              behavioural cases and grader rubrics
tests/                              everything that runs in CI
docs/                               design rationale and Claude Code constraints
```

## Cross-cutting conventions

- **The framework owns methodology; the repository owns truth.** Nothing in
  `skills/`, `agents/`, `standards/` or `templates/` may name a specific
  framework, ORM, database, queue or tool. `validate-plugin.mjs` enforces this
  mechanically; `docs/development-guide.md` explains the escape hatch.
- **A contract is stated once.** Gates cite `standards/` rather than restating
  it. A paraphrase drifts from its source silently and no tooling can detect it.
- **Every non-obvious decision carries its reason in a comment.** Several
  choices here contradict the obvious design; a contributor who does not know
  why will "fix" something that is not broken.
- **Guard changes ship with their fixtures in the same commit** — one asserting
  the new decision, one asserting a neighbouring legitimate command or path is
  still allowed.
- The session charter is the framework's entire always-on context budget, paid
  on every request in every repository. It has a hard line ceiling.

## Non-obvious invariants

- **A crashed hook fails OPEN.** Claude Code treats every non-zero exit except 2
  as a non-blocking error, so a guard that errors lets the operation through.
  Both guards must exit 0 and emit `ask` for anything they cannot classify.
- **Both guards run on every Bash and every Edit call, forever.** A fork added
  to the hot path is paid by every user on every command.
- **The plugin cannot ship permission rules.** A plugin `settings.json` supports
  only `agent` and `subagentStatusLine`. The floor is a reference file the user
  installs, which is why `framework-doctor` exists.
- **These scripts must run under bash 3.2**, the version macOS ships. No
  `${var,,}`, no associative arrays.
- This repository installs its own reference permissions floor into
  `.claude/settings.json`. `validate-plugin.mjs` fails if the two drift apart.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Any repository that installs the plugin | External — not visible from here | Public | Unknown |
| `jaylordibe/laravel-api` | `jaylordibe/laravel-api` | Internal | Jay Lord Ibe |
| `jaylordibe/nestjs-api` | `jaylordibe/nestjs-api` | Internal | Jay Lord Ibe |

A change to a guard, a standard or the charter reaches every one of them on
their next `/plugin update`, and only when `version` in `plugin.json` changes.
