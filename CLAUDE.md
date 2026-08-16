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
from 1.0.0 it ships no permission rules and no hooks that gate a command —
nothing here can block a consumer's work, and no document may describe it as
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
- **How much computation a stage spends is one policy, in
  `standards/execution-efficiency.md`.** Depth bands, per-launch model choice,
  fan-out, output size and the escalation triggers live there and nowhere else;
  a skill or agent that needs one cites it. `validate-plugin.mjs` fails a file
  that restates the depth-band vocabulary without the citation.
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
  From 2.0.0 `ef-install-settings` merges two keys —
  `extraKnownMarketplaces` and `enabledPlugins` — into the *project's* own
  `.claude/settings.json`, and only when a human runs `framework-install`.
  Nothing else in the file is read or written, no global file is touched, and
  Claude Code's plugin state under `~/.claude/plugins/` is never opened.
  **Declaring a dependency is not the same act as rewriting a permission
  posture**, and the distinction is what makes this compatible with the line
  above rather than an erosion of it: the first is what `package.json` does, the
  second is what the pre-1.0.0 permissions floor did. The width of the exception
  is asserted in `tests/validate-install-settings.mjs`, including that a run
  writes nothing into `$HOME`. A change that widens it past those two keys is
  the change this note exists to stop.
- **A consuming repository carries no framework version, and no install
  marker.** Claude Code owns the installed version, the cache and the update
  lifecycle. Until 2.0.0 the repository also declared `frameworkVersion` in
  `.claude/engineering-framework.json` and `ef-doctor` compared the two — a
  second copy of a number that goes stale in silence, and a synchronisation
  problem the framework invented for itself. The whole file is gone: `commands`
  duplicated the `CLAUDE.md` canonical-commands table, which is the one-copy
  rule below applied to configuration, and `risk.highRiskPaths` moved into
  `CLAUDE.md` where the rest of the repository's truth already lives.
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
- **Efficiency work here has one asymmetry, and it decides every judgement
  call.** Overspending is visible: a system-wide map for a comment fix reads as
  waste to anyone who scrolls the transcript. Underspending is not — a change
  misclassified downward produces a *shorter, tidier, more confident* output
  than the correct run, which is the exact shape of the failure this framework
  exists to prevent. So every default in the efficiency policy fails toward
  spending more: Standard depth rather than Targeted, `model: inherit` rather
  than a cheap default, an uncertain lens launched rather than skipped, a
  generous turn ceiling rather than a tight one. A saving that has to be argued
  for is not a saving worth taking.
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

**From 2.0.0 `ef-install-settings` writes `"autoUpdate": true`, so this is the
default rather than an opt-in** — `docs/constraints.md` C20 for what that key
scopes to and why. A configured repository receives that release without anyone
typing an update command, on its next session. A team can opt out and which ones
did is not visible from here, so assume none of them did. **The version bump is
then the only brake there is** — a standard changed without one reaches nobody,
and a standard changed with one reaches every such machine at once. Neither
outcome is recoverable by editing this repository afterwards.
