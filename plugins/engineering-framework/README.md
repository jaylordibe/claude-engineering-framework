# engineering-framework

A stack-agnostic engineering workflow for Claude Code.

```text
Understand → Design → Human approval → Implement → Review → Validate → Present
```

> **The framework owns methodology. The repository owns truth.**

This plugin knows how to design, review and validate a change. It knows nothing
about your system, and every architectural claim its agents make is either
cited to a line of your code or labelled as an unknown.

Requires `jq` on `PATH`.

## Two halves, installed differently

Confusing these is the usual setup problem:

| | Lives in | Arrives by |
|---|---|---|
| **The plugin** — gates, agents, standards, charter | `~/.claude/` on your machine | you install it; `git pull` never brings it |
| **The repository's declaration** — `.claude/settings.json`, `CLAUDE.md` | the repository, committed | `git pull`; one person ran `framework-install` once |

### Installing the plugin — once per machine

```text
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

Restart, then confirm with `claude plugin list`.

### Setting up a repository — once per repository

Run this only if nobody has done it here yet:

```text
/engineering-framework:framework-install
```

It writes two things and shows you each before writing it:

| File | What goes in it |
|---|---|
| `.claude/settings.json` | The dependency declaration — `extraKnownMarketplaces` and `enabledPlugins`, merged in. Everything already in the file is kept |
| `CLAUDE.md` | What your system is: canonical commands the validation gate runs, high-risk paths that raise the review tier, architecture, consumers. Mandatory — without it every agent infers your stack |

Commit both.

**It writes no permission rules.** It merges exactly three things —
`extraKnownMarketplaces`, `enabledPlugins`, and the single `env` member
`CLAUDE_CODE_ENABLE_TODO_TOOLS` that makes a run's stages visible in the task
panel — and never touches `permissions`, `hooks`, or any other member of `env`.
It writes nothing global — not your
`~/.claude/settings.json`, not Claude Code's plugin state. Trust, installation,
the installed version, the cache and updates are Claude Code's; the repository
just says it depends on this framework.

It also refuses rather than guesses. Unparseable settings are reported and left
alone; a marketplace name already pointing somewhere else is a conflict you
resolve; a plugin someone deliberately disabled is not silently re-enabled.

### What your team gets from the committed declaration

**One command less, not zero.** Once a colleague trusts the repository folder,
Claude Code registers the marketplace with no prompt — so they never run
`/plugin marketplace add`:

```text
before:  /plugin marketplace add jaylordibe/claude-engineering-framework
         /plugin install engineering-framework@jaylordibe
after:   /plugin install engineering-framework@jaylordibe
```

**They still install the plugin themselves.** From Claude Code v2.1.195, a
plugin that only a project's `.claude/settings.json` enables, and that comes
from an external source such as a git repository, **does not load until that
person installs it**. Claude Code reports it as not installed and prints the
command. `enabledPlugins` makes the plugin *active* for this repository once
installed; `extraKnownMarketplaces` makes that install resolvable. Neither
performs it.

### Auto-update is on, so nobody chases plugin updates

The installer writes `"autoUpdate": true` on the marketplace entry, so Claude
Code refreshes the marketplace **and updates the installed plugin on disk** in
the background after a session starts. A release arrives with nobody typing
anything.

That is deliberate: the framework is **development tooling, not an application
runtime dependency**. A release changes how Claude approaches your next piece of
engineering work; it does not modify deployed code, touch production, or bypass
review, tests, CI or this framework's own gates. Teams should be shipping product
value rather than tracking framework releases.

`ef-install-settings --no-auto-update` writes the entry without the key, for a
team that needs controlled adoption. **An entry that already states `autoUpdate`
is never rewritten**, either way — only an entry with no opinion gets one.

### Joining a repository someone else set up

**Do not run `framework-install`** — the declaration is already in the commit you
pulled, and re-running it only reports that everything is already correct. You
need the plugin on your machine, and nothing else.

Trust the folder when prompted, and the marketplace registers itself; then run
the install command Claude Code shows you. If the repository has no declaration,
add the marketplace first — both commands are at the top of this file.

### Updating

```text
/plugin marketplace update jaylordibe
/plugin update engineering-framework@jaylordibe
```

Then restart, or run `/reload-plugins` — an update does not apply to a running
session. With auto-update on, which is what the installer declares, Claude Code
runs both commands for you in the background after a session starts, and only
the reload is left.

You receive a new version only when `version` in `plugin.json` is bumped;
commits pushed without a bump change nothing for anyone. An update never
requires re-running `framework-install`, and never requires re-adding the
marketplace.

Your repository records no framework version, so there is nothing to keep in
sync and nothing that can drift out of it. On a **major** bump, read that entry
in the changelog: a major is defined as one where a consuming repository may
have to act.

## Use

```text
/engineering-framework:work-item <requirement | issue key | issue URL>
```

Runs the whole pipeline in one session and stops exactly twice: for you to
approve the plan, and for you to review the diff and commit.

Or drive it stage by stage:

```text
/engineering-framework:gate-design <requirement>
/engineering-framework:gate-approve
/engineering-framework:gate-implement
/engineering-framework:gate-review
/engineering-framework:gate-validate
```

Diagnostics:

```text
/engineering-framework:framework-doctor
```

Every one of these must be typed by a human — each sets
`disable-model-invocation: true`, so Claude cannot invoke a gate or claim one
ran.

## What it ships

**Skills** — the conductor, five gates, an installer and a doctor. Three
model-invoked domain playbooks (`domain-auth`, `domain-authorization`,
`domain-background-work`) carry the decisions and failure modes for those
areas, and none of the answers.

**Agents** — eight read-only lenses: `context-mapper`, `architect`, `reviewer`,
`security`, `tester`, `contract`, `data`, `performance`. Read-only is enforced
by their tool pool, not promised in prose.

**Standards and templates** — loaded on demand by the gate that needs them,
never all at once.

**One hook** — a `SessionStart` charter carrying the workflow, the risk tiers,
the evidence language and the human-owned operations. That is the framework's
entire always-on cost, and it gates nothing.

## Important

**This plugin ships no permission rules.** It cannot block a command, and it
will not change how often you are prompted. Permissions belong to your
repository and to you — if you turn on a permission mode, you get that mode.

The single exception to "it does not edit your settings" is narrow and
deliberate: when *you* run `framework-install`, it merges the marketplace and
plugin declaration into your project's `.claude/settings.json` and nothing else.
It never writes `permissions`, never writes `hooks`, never touches a member of
`env` other than `CLAUDE_CODE_ENABLE_TODO_TOOLS`, and never writes a file
outside your repository.

What it does instead is methodology: gates you invoke, review lenses that read
your diff, and standards those lenses judge against. The charter states which
operations are human-owned; the gates enforce that by stopping and handing off,
not by blocking.

Versions before 1.0.0 installed a permissions floor and two hooks that gated
tool calls. Both were removed. If you installed one of those versions, what it
merged into your `.claude/settings.json` is still there — a merge only ever
adds — and `permissions.defaultMode` in particular overrides the mode you chose
in your own user settings. See the 1.0.0 entry in the changelog for what is
worth deleting.

## Documentation

Full documentation lives in the
[repository](https://github.com/jaylordibe/claude-engineering-framework):
architecture, consuming-repository guide, migration guide, development guide,
and the Claude Code constraints that shaped the design.

MIT licensed.
