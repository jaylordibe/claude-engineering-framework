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
| Project settings merge | `node tests/validate-install-settings.mjs` |
| Lint | `shellcheck plugins/engineering-framework/scripts/*.sh plugins/engineering-framework/bin/*` |
| Official validator | `claude plugin validate ./plugins/engineering-framework --strict` |

There is no build, no type check and no end-to-end suite. `jq` is required by
`ef-doctor` and by `ef-install-settings`; without it the audit reports that it
could not inspect rather than passing silently, and the installer refuses to
merge rather than guessing at JSON with a text tool.

## High-risk paths

A change touching one of these is at least High risk, whatever the diff looks
like. Everything here ships to other people's repositories, where its failures
are silent from this side.

| Path pattern | Why a change here is High risk |
|---|---|
| `plugins/engineering-framework/scripts/session-charter.sh` | The always-on charter, paid on every request in every installed repository |
| `plugins/engineering-framework/bin/ef-install-settings` | The only component that writes to a file a consuming repository owns |
| `plugins/engineering-framework/bin/ef-doctor` | The audit consumers trust to tell them their contract is intact |
| `plugins/engineering-framework/hooks/hooks.json` | Decides what runs in every session |
| `plugins/engineering-framework/.claude-plugin/plugin.json` | `version` here is the only brake between a changed standard and every auto-updating consumer |
| `plugins/engineering-framework/reference/marketplace-declaration.json` | Wrong values here point every installing repository at the wrong marketplace |
| `.claude-plugin/marketplace.json` | The catalogue; a break here stops the marketplace loading for everyone |

This repository ships methodology that runs in other people's repositories, and
it ships no permission rules and no hooks that gate a command — nothing here
can block a consumer's work, and no document may describe it as
though it can. What can still go wrong is invisible from here: a wrong standard
makes an agent describe an architecture that does not exist, and a wrong charter
line is paid on every request in every installed repository.

## Architecture

```
.claude-plugin/marketplace.json     the catalogue
plugins/engineering-framework/
  agents/                           eight read-only review lenses
  skills/                           five gates, a conductor, playbooks, install/doctor
  standards/                        the normative texts agents read
  templates/                        thinking aids, never committed by a run
  scripts/session-charter.sh        the SessionStart charter — the only hook
  bin/ef-doctor                     repository contract audit, read-only
  bin/ef-install-settings           the project dependency declaration merge
  reference/                        CLAUDE.md template, marketplace declaration
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
- **An agent holds its execution semantics; it never fetches them.** The
  evidence labels, the stopping rule, the report owed and the independence
  requirement live in `standards/agent-runtime-contract.md` and are embedded
  **verbatim** in every agent under `agents/`. `validate-plugin.mjs` pins every
  copy byte-for-byte, caps the block's length, and asserts the rules it must
  state. Edit the contract there and re-copy it; a paraphrase drifts and nothing
  can see that. The reason is in `docs/architecture.md` — nine agents once spent
  their opening turns reading framework documents to learn a report format and
  hit their ceilings holding findings they never wrote up. **A shipped file may
  name a framework document as available for a question the contract leaves
  open; it may never make reading one an opening step.**
- **How much computation a stage spends is one policy, in
  `standards/execution-efficiency.md`.** Depth bands, per-launch model choice,
  fan-out, output size, the escalation triggers and the §8 convergence contract
  — evidence sufficiency, synthesis reservation, continuation, and the brief a
  delegated agent is given — live there and nowhere else; a skill or agent that
  needs one cites it. `validate-plugin.mjs` fails a file that restates the
  depth-band or convergence vocabulary without the citation, and fails an agent
  that declares a `maxTurns` ceiling while citing nothing that tells it how to
  stop before one.
- The session charter is the framework's entire always-on context budget, paid
  on every request in every repository. It has a hard line ceiling.

## Non-obvious invariants

- **The framework ships methodology and never writes permission rules.** This
  is the 1.0.0 line, and it is the one that most constrains what may be added
  here. Nothing in this plugin may ship a permissions floor, write
  `permissions` or `hooks` into anyone's settings, or register a hook that gates
  a tool call. Permissions belong to the repository and the person who owns it:
  a developer who turns on a permission mode is entitled to get that mode, not
  one a plugin rewrote underneath them. The methodology is carried by the
  charter, which states the human-owned operations, and by the gates, which stop
  and hand off.
- **The one file the framework writes, and the exact width of the exception.**
  `ef-install-settings` merges three keys — `extraKnownMarketplaces`,
  `enabledPlugins` and the single `env` member
  `CLAUDE_CODE_ENABLE_TODO_TOOLS` — into the *project's* own
  `.claude/settings.json`, and only when a human runs `framework-install`.
  Nothing else in the file is read or written, no global file is touched, and
  Claude Code's plugin state under `~/.claude/plugins/` is never opened.
  **Declaring a dependency is not the same act as rewriting a permission
  posture**, and the distinction is what makes this compatible with the line
  above rather than an erosion of it: the first is what `package.json` does, the
  second is what a permissions floor does. The width of the exception
  is asserted in `tests/validate-install-settings.mjs`, including that a run
  writes nothing into `$HOME`. A change that widens it past those three keys is
  the change this note exists to stop.

  **The test that admits the third key is the test to apply to a fourth.**
  `work-item`'s visible progress depends on a host tool current models are not
  given by default (C21), so a framework that declined to set it would ship a
  progress display that usually does not work and call the per-machine step
  neutrality. What makes the key admissible is that it **grants nothing and
  denies nothing** — a wrong value cannot block anyone's work, which is exactly
  what a permissions floor can do. Project settings
  outrank `~/.claude/settings.json`, so the opt-out is a developer's own
  `.claude/settings.local.json`, which is not committed; `--no-task-tools` opts
  out at install time. A fourth key that fails the grants-nothing test is the
  erosion this note is still here to stop.
- **A consuming repository carries no framework version, and no install
  marker.** Claude Code owns the installed version, the cache and the update
  lifecycle. A `frameworkVersion` declared in the consuming repository would be
  a second copy of a number that goes stale in silence — a synchronisation
  problem the framework would be inventing for itself. There is no separate
  policy file either: a `commands` key duplicates the `CLAUDE.md`
  canonical-commands table, which is the one-copy rule below applied to
  configuration, and high-risk paths belong in `CLAUDE.md` where the rest of the
  repository's truth already lives.
- **Why an enforcement layer is not worth building.** A permissions floor plus
  PreToolUse guards costs about a third of the code and nearly half the test
  burden, to enforce one clause of a charter with seven — and it does not work.
  A multi-lens review of one such attempt found two Critical and ten High
  defects in a single pass: a `SELECT`-shaped statement reaching `sqlite3`'s
  `writefile()`, `-hprod` bypassing a hostname check that only matched the
  separated spelling, `git checkout --ours` silently discarding uncommitted work
  because the premise that it only applies to conflicts is false. **A text
  parser cannot out-guess a shell.** The host application's own permission modes
  do this work, and a plugin second-guessing them adds confusion rather than
  safety.
- **A false denial is worse than a false prompt.** A prompt costs a keystroke;
  a denial cannot be clicked through and blocks the work outright. This is why
  the framework states a boundary rather than enforcing one: a wrong standard is
  argued with, a wrong rule is a wall. A guard pattern of `*.key` matches the
  empty string, so jq's `.key` accessor is denied in every repository that has
  it — that is the shape of the failure, and it is silent from here.
- **Efficiency work here has one asymmetry, and it decides the judgement calls
  that are genuinely uncertain — only those.** Underspending is invisible: a
  change misclassified downward produces a *shorter, tidier, more confident*
  output than the correct run, which is the exact shape of the failure this
  framework exists to prevent. So where a call is close, every default fails
  toward spending more: Standard depth rather than Targeted, `model: inherit`
  rather than a cheap default, an uncertain lens launched rather than skipped,
  a generous turn ceiling rather than a tight one.

  **That default settles close calls and nothing else.** Applied to calls that
  are not close it stops being a tie-breaker and becomes a ratchet — the higher
  tier on every boundary, Standard as the only default, a band that must be
  earned, a Low tier that still runs the full panel — and a framework with a
  floor and no ceiling has no low end at all. A one-line fix then gets mapped,
  planned, panelled and reported on, and the person paying for it cannot decline
  it by asking.

  **Overspending is not merely an aesthetic cost.** It is charged to the same
  person every time, on the work least able to absorb it, until they stop
  routing anything through the framework. **A framework routed around protects
  nothing**, so the ceremony a High-risk change gets is only affordable if a
  trivial change does not get it too. The exit is
  `standards/execution-efficiency.md` §3's Direct band and the charter's "Below
  Low there is no tier", both bounded to the same sensitive-area list rather
  than left general. **The bound is what makes the exit safe.** Widening it past
  that list, or restoring the ratchet by making Direct something a map has to
  earn, is the change this note exists to stop — in both directions.
- **A host feature may be used and may never be required.** The framework runs
  inside an application it does not version, and a feature it depends on can
  disappear without warning — Claude Code does not provide the task-list tools
  to current models by default. A pipeline holding its visible progress there is
  merely confusing when they are absent; one holding its approval trace there
  cannot prove an approved design was approved, and no test here catches either,
  because the thing that vanished is not in this repository. So the ledger is
  written into the message, durable state is a file outside the consuming
  repository, and the task list is mirrored into only when it exists. Anything a
  guarantee depends on has to be something this repository ships.
  `validate-plugin.mjs` fails a shipped file that names a task tool without
  saying what happens when there is none; `docs/constraints.md` C21 has the
  citations.
- **These scripts must run under bash 3.2**, the version macOS ships. No
  `${var,,}`, no associative arrays. Only `session-charter.sh` and `ef-doctor`
  remain, and both are read-only.
- **`ef-doctor` reports, and changes nothing.** It audits whether this
  repository supplies what the framework needs — `CLAUDE.md`, resolvable
  commands, declared risk paths. Everything it finds is advisory. If a
  repository wants an operation blocked, the doctor names the rule its owner
  would add; it does not add it.
- **Everything the framework declares about risk is advisory guidance to an
  agent.** The `High-risk paths` section of a repository's `CLAUDE.md` shapes
  which review lenses run and how much ceremony a change gets. It does not block
  an edit, and no document may describe it as though it does.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Any repository that installs the plugin | External — not visible from here | Public | Unknown |
| Private repositories maintained by the author | Not named here — see below | Internal | Maintainer |

**This table is deliberately not a roster, and adding one is a defect.** This
repository is published, so every file in it is published — this one included.
The consumers are private codebases whose names, and whose owners' names, are
not ours to disclose here.

The instinct to fill this table in is a good one everywhere else: the framework
itself insists that a contract change must name who breaks, and `ef-doctor`
fails a consuming repository whose `Consumers` table is still a placeholder.
That rule is for **repositories that own a contract**, where the reader is
already inside the trust boundary. Here the reader is the public. What a release
decision actually needs is the *shape* of the exposure, not the list — and the
shape is below.

A change to a standard, an agent, a gate or the charter reaches every one of
them on their next `/plugin update`, and only when `version` in `plugin.json`
changes.

**`ef-install-settings` writes `"autoUpdate": true`, so this is the default
rather than an opt-in** — `docs/constraints.md` C20 for what that key
scopes to and why. A configured repository receives that release without anyone
typing an update command, on its next session. A team can opt out and which ones
did is not visible from here, so assume none of them did. **The version bump is
then the only brake there is** — a standard changed without one reaches nobody,
and a standard changed with one reaches every such machine at once. Neither
outcome is recoverable by editing this repository afterwards.
