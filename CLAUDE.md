# CLAUDE.md

## Project

The `engineering-framework` plugin for Claude Code, plus the marketplace that
serves it. Markdown, JSON and POSIX shell — no build step, no runtime
dependencies, no published artifact. The marketplace serves this repository
directly.

Node is used only to run the validators in `tests/`. There is no package
manifest and nothing to install.

**What this repository ships runs in other people's repositories.** A wrong
standard makes an agent describe an architecture that does not exist; a wrong
gate lets a change through unreviewed. Both failures are silent from here,
which is why almost everything in `tests/` exists.

## Canonical commands

| Purpose | Command |
|---|---|
| Static plugin validation | `node tests/validate-plugin.mjs --strict` |
| Fixture corpus validation | `node tests/validate-fixtures.mjs` |
| Charter budget and guarantees | `node tests/validate-charter.mjs` |
| Repository contract audit | `node tests/run-doctor-fixtures.mjs` |
| Lint | `shellcheck plugins/engineering-framework/scripts/*.sh plugins/engineering-framework/bin/*` |
| Official validator | `claude plugin validate ./plugins/engineering-framework --strict` |

There is no build, no type check and no end-to-end suite. `jq` is used by
`ef-doctor` to read the repository policy file; without it the audit reports
that it could not inspect, rather than passing silently.

## Architecture

```
.claude-plugin/marketplace.json     the catalogue
plugins/engineering-framework/
  agents/                           eight read-only review lenses
  skills/                           five gates, a conductor, playbooks, install/doctor
  standards/                        the normative texts agents read
  templates/                        thinking aids, never committed by a run
  scripts/session-charter.sh        the SessionStart charter — the only hook
  bin/ef-doctor                     repository contract audit
  reference/                        config schema, CLAUDE.md template
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
- The session charter is the framework's entire always-on context budget, paid
  on every request in every repository. It has a hard line ceiling.

## Non-obvious invariants

- **The framework ships methodology and never writes permission rules.** This
  is the 1.0.0 line, and it is the one that most constrains what may be added
  here. Nothing in this plugin may create or edit `.claude/settings.json`, ship
  a permissions floor, or register a hook that gates a tool call. Permissions
  belong to the repository and the person who owns it: a developer who turns on
  a permission mode is entitled to get that mode, not one a plugin rewrote
  underneath them. The methodology is carried by the charter, which states the
  human-owned operations, and by the gates, which stop and hand off.
- **Why the enforcement layer was removed rather than fixed.** Until 1.0.0 this
  plugin shipped a 172-rule permissions floor and two PreToolUse guards — about
  a third of the code and nearly half the test burden, to enforce one clause of
  a charter with seven. A multi-lens review of the last attempt to extend it
  found two Critical and ten High defects in a single pass: a `SELECT`-shaped
  statement reaching `sqlite3`'s `writefile()`, `-hprod` bypassing a hostname
  check that only matched the separated spelling, `git checkout --ours` silently
  discarding uncommitted work because the premise that it only applies to
  conflicts is false. **A text parser cannot out-guess a shell.** The host
  application's own permission modes do this work, and a plugin second-guessing
  them adds confusion rather than safety.
- **A false denial is worse than a false prompt.** A prompt costs a keystroke;
  a denial cannot be clicked through and blocks the work outright. This is why
  the framework now prefers stating a boundary to enforcing one: a wrong
  standard is argued with, a wrong rule is a wall. The guard that shipped
  `*.key` — matching the empty string, so jq's `.key` accessor was denied in
  every installed repository — is the case that made this concrete.
- **These scripts must run under bash 3.2**, the version macOS ships. No
  `${var,,}`, no associative arrays. Only `session-charter.sh` and `ef-doctor`
  remain, and both are read-only.
- **`ef-doctor` reports, and changes nothing.** It audits whether this
  repository supplies what the framework needs — `CLAUDE.md`, resolvable
  commands, declared risk paths. Everything it finds is advisory. If a
  repository wants an operation blocked, the doctor names the rule its owner
  would add; it does not add it.
- **Everything the framework declares about risk is advisory guidance to an
  agent.** `risk.highRiskPaths` shapes which review lenses run and how much
  ceremony a change gets. It does not block an edit, and no document may
  describe it as though it does.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Any repository that installs the plugin | External — not visible from here | Public | Unknown |
| `jaylordibe/laravel-api` | `jaylordibe/laravel-api` | Internal | Jay Lord Ibe |
| `jaylordibe/nestjs-api` | `jaylordibe/nestjs-api` | Internal | Jay Lord Ibe |

A change to a standard, an agent, a gate or the charter reaches every one of
them on their next `/plugin update`, and only when `version` in `plugin.json`
changes.
