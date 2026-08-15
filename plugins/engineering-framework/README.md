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
| **The repository contract** — `CLAUDE.md`, `.claude/engineering-framework.json` | the repository, committed | `git pull`; one person ran `framework-install` once |

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

It scaffolds `CLAUDE.md` (mandatory — without it every agent infers your stack)
and an optional `.claude/engineering-framework.json` naming your canonical
commands and high-risk paths. It shows every change before writing it, never
overwrites existing content, and writes no permission rules. Commit the result.

### Removing one of your team's two setup commands — optional, and yours to write

Nothing in this plugin will write this for you. `framework-install` names it and
stops, because `.claude/settings.json` belongs to the repository and the person
who owns it — the same reason the framework stopped shipping permission rules in
1.0.0. If you want it, add it yourself and commit it:

```jsonc
// .claude/settings.json — committed
{
  "extraKnownMarketplaces": {
    "jaylordibe": {
      "source": { "source": "github", "repo": "jaylordibe/claude-engineering-framework" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "engineering-framework@jaylordibe": true }
}
```

**This removes one of two commands, not both.** Once a colleague trusts the
repository folder, Claude Code registers the marketplace from
`extraKnownMarketplaces` without a prompt — so they never run
`/plugin marketplace add`.

**They still have to install the plugin themselves.** From Claude Code v2.1.195,
a plugin that only a project's `.claude/settings.json` enables, and that comes
from an external source such as a git repository, **does not load until that
person installs it**. Claude Code reports it as not installed and prints the
command. So the block above buys your team this:

```text
before:  /plugin marketplace add jaylordibe/claude-engineering-framework
         /plugin install engineering-framework@jaylordibe
after:   /plugin install engineering-framework@jaylordibe
```

Worth committing — and not the zero-setup onboarding it looks like. `enabledPlugins`
is what makes the plugin *active* for this repository once installed, and
`extraKnownMarketplaces` is what lets that install resolve at all; neither
performs the install.

**`autoUpdate` is a real trade, in both directions.** On, Claude Code refreshes
the marketplace **and updates the installed plugin on disk** in the background
after a session starts — the new version loads on the next launch or after
`/reload-plugins` — so a release arrives with nobody typing anything, and the
framework's version bump becomes the only thing standing between a changed
standard and everyone on your team. Off, you adopt releases deliberately, at the
cost of both update commands at the top of this file each time.

Both are defensible. Pick the one your team would defend in a review, and note
that this file is committed, so whichever you pick applies to everyone who
pulls.

(Third-party marketplaces default to auto-update **off**, which is why the key
is written explicitly above.)

### Joining a repository someone else set up

**Do not run `framework-install`** — the contract is already in the commit you
pulled, and re-running it only reports that everything is already correct. You
need the plugin on your machine, and nothing else.

If the repository pins the marketplace as above, trust the folder when prompted
and the marketplace registers itself; then run the install command Claude Code
shows you. If it does not, add the marketplace first — both commands are at the
top of this file.

### Updating

```text
/plugin marketplace update jaylordibe
/plugin update engineering-framework@jaylordibe
```

Then restart — an update does not apply to a running session. You receive a new
version only when `version` in `plugin.json` is bumped; commits pushed without a
bump change nothing for anyone. An update never requires re-running
`framework-install`, and never requires re-adding the marketplace.

If `framework-doctor` reports a **major** version mismatch between the plugin
you have installed and the `frameworkVersion` the repository declares, that is
the designed signal to update and read the changelog entry for that major — not
a broken repository.

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

**This plugin ships no permission rules and never edits your
`.claude/settings.json`.** It cannot block a command, and it will not change
how often you are prompted. Permissions belong to your repository and to you —
if you turn on a permission mode, you get that mode.

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
