# Consuming repository guide

What a repository has to provide, and what it gets in return.

## The short version

**One file is mandatory: `CLAUDE.md`.** Everything else has a working default.

Two things have to be in place, and they arrive by different routes. The plugin
lives on your machine and you install it; the repository contract lives in the
repository and arrives with `git pull`.

**Bringing the framework to a repository for the first time** — the plugin, then
the contract:

```text
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

```text
/engineering-framework:framework-install
/engineering-framework:framework-doctor
```

Commit what `framework-install` writes. That is the last time anyone in this
repository runs it.

**Joining a repository a colleague already set up** — you need the plugin only.
**Do not run `framework-install`**: the declaration is already in the commit you
pulled, and re-running it only reports that everything is already correct.

Because the repository declares the marketplace (see [what the declaration looks
like](#what-the-declaration-looks-like)), trusting the folder registers it with
no further prompt, so you skip `/plugin marketplace add`. **You still run the
install yourself:**

```text
/plugin install engineering-framework@jaylordibe
```

Two commands become one, not none — a project declaration enables a plugin, it
never installs one.

Either way, then work:

```text
/engineering-framework:work-item add rate limiting to the password reset endpoint
```

---

## The repository contract

| Artefact | Required | What it buys you |
|---|---|---|
| `CLAUDE.md` | **Yes** | Everything. Without it, every agent infers your stack. |
| A canonical-commands table in `CLAUDE.md` | Recommended | The validation gate runs your commands rather than inferring them |
| A `High-risk paths` section in `CLAUDE.md` | Optional | Changes touching those paths get the higher review tier and a deeper map |
| A `Consumers` table in `CLAUDE.md` | Recommended | Contract changes that name who breaks |
| `.claude/settings.json` | Recommended | Declares the marketplace and enables the plugin, so colleagues do not configure it by hand. Written by `framework-install` |
| `.claude/skills/` playbooks | Optional | Where your stack-specific knowledge lives |

Nothing else. No `tasks/` directory, no plan files, no decision-record
directory, no mandated test framework or language, and **no framework version
anywhere in your repository** — Claude Code owns the installed version.

**The framework still ships no permission rules.** `framework-install` merges
`extraKnownMarketplaces` and `enabledPlugins` into `.claude/settings.json` and
nothing else; it never writes `permissions`, `hooks` or `env`, and never writes
outside your repository. Versions before 1.0.0 installed a permissions floor; if
you have one, it is still there because a merge only ever adds, and nothing here
reads it any more. See the 1.0.0 entry in `CHANGELOG.md` for what is worth
deleting.

### What the declaration looks like

`framework-install` writes this for you. It is shown here so you can review what
lands in the commit:

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

That is the whole declaration: **which marketplace, that the plugin is enabled
here, and that releases arrive on their own.** No framework version — that is
Claude Code's to track, not yours.

Anything already in the file is preserved — permissions, hooks, environment,
other marketplaces, other plugins. The installer refuses to write at all if the
file will not parse, if the marketplace name already points somewhere else, or
if someone deliberately set this plugin to `false`.

**This removes one of two setup commands, not both.** Once a colleague trusts
the repository folder, Claude Code registers the marketplace without a further
prompt, so they never run `/plugin marketplace add`.

**They still install the plugin themselves.** From Claude Code v2.1.195, a
plugin that only a project's `.claude/settings.json` enables, and that comes
from an external source such as a git repository, does not load until that
person installs it — Claude Code reports it as not installed and prints the
command to run. `enabledPlugins` makes the plugin active for this repository
once installed; `extraKnownMarketplaces` makes that install resolvable. Neither
performs the install, so onboarding goes from two commands to one rather than to
none.

### Auto-update: on, so nobody on your team chases plugin updates

`autoUpdate` refreshes the marketplace catalogue **and updates the installed
plugin on disk**, in the background after a session starts, so a released
version arrives without anyone running an update command. Third-party
marketplaces default to **off**, which is why the installer writes the key
explicitly.

It is on by default for a specific reason: your repository records **no
framework version**, so nothing in it would ever ask to be updated. Without the
key, your team installs once and runs on that version indefinitely — and a
corrected standard would never arrive, silently.

The trade, so you can decide it rather than inherit it: the framework's version
bump becomes the only thing between a changed standard and this repository, and
Claude Code keeps marketplace state per user, so the value reaches each machine
that opens the repository. See [constraints C20](constraints.md).

**To adopt releases deliberately instead**, run the installer with
`--no-auto-update`, or set `"autoUpdate": false` on the entry. The cost is
`/plugin marketplace update jaylordibe` **and**
`/plugin update engineering-framework@jaylordibe` per release.

**Whatever you decide stays decided.** An entry that states `autoUpdate` either
way is never rewritten by a later install.

---

## 1. `CLAUDE.md`

Start from `${CLAUDE_PLUGIN_ROOT}/reference/CLAUDE.md.template`, or let
`framework-install` scaffold it.

**Do not restate the framework's methodology in it.** The gate sequence, risk
tiers, evidence language and human-owned operations arrive from the plugin. A
second copy drifts, and nothing can detect that it has.

What belongs there is what the framework cannot know:

### Project

One dense paragraph: language, runtime, frameworks, data stores,
authentication model, deployment target, package manager. Agents treat this as
evidence, so **delete anything that is not true** rather than leaving it
aspirational.

### Canonical commands

The validation gate runs these. Every one must work from a clean checkout.

| Purpose | Command |
|---|---|
| Build | |
| Lint | |
| Type check | |
| Unit tests | |
| Integration / end-to-end tests | |

If a command needs a running service first, say so on its row.

**If a command does not exist, omit the row.** The validation gate reports that
gate as `N/A` — not `BLOCKED` — with the evidence that it is genuinely absent.
A repository with no linter is a normal repository, and an absent gate must
never make `PASS` unreachable. Guessing at a command that happens to exit zero
is the one outcome that is actually harmful, because it reads as a pass.

### Architecture

A directory map with one line of purpose per entry. Name the entry points
explicitly; the context mapper starts there.

### Cross-cutting conventions

The rules that apply to almost every change here, **each with the reason it
exists**. A convention without its reason gets "cleaned up" by the next
contributor. Where a rule is enforced by a linter, a type or a test, say so — a
self-enforcing convention is worth more than a documented one.

### Non-obvious invariants

The highest-value section, and the one most often left empty: the things that
look wrong, look deletable, or look simplifiable, and must not be. Each with
the failure it prevents.

### Consumers

Every client that programs against your contracts. This is load-bearing: the
design, implement and review gates all ask "which consumers does this change
force a matching change in?", and an empty table makes the honest answer always
"none".

If there truly are none, write `_(none — internal only)_` **and say why**. An
unfilled table and a deliberately empty one are indistinguishable to every
later reader, and `ef-doctor` fails while the placeholder is still there.

---

## 2. High-risk paths (optional, and in `CLAUDE.md`)

A section in your `CLAUDE.md`, not a separate file:

```markdown
## High-risk paths

| Path pattern | Why a change here is High risk |
|---|---|
| `src/auth/*` | Session issuance; a mistake here is silent until it is exploited |
| `src/pricing/*` | Money, and no staging environment that reproduces real plans |
```

A change touching one of these is classified **at least High** whatever the diff
looks like — a full plan, a threat model, negative tests, a wider review panel,
and a deeper repository map before any of it. It is advisory guidance to an
agent: it shapes ceremony, and it blocks no edit and stops no command.

**Keep it short, or delete it.** A list naming half the repository raises the
tier for everything, which is the same as raising it for nothing. Most
repositories are classified correctly from the diff alone.

Add a paragraph after the table for anything that makes the system risky in a
way a reader could not infer from the code — a shared store whose isolation
lives in query builders, a migration tool that keys by filename.

## 3. Repository-specific playbooks (optional)

Your stack knowledge belongs in your repository, in `.claude/skills/`:

```text
.claude/skills/
└── our-resource-pattern/
    └── SKILL.md      # user-invocable: false, with a when_to_use
```

These load alongside the framework's own and are authoritative where they
overlap. The framework's `domain-*` playbooks carry the **questions** for auth,
authorization and background work; yours carry **this repository's answers**.

---

## Working day to day

```text
/engineering-framework:work-item <requirement>       whole pipeline, two stops
/engineering-framework:gate-design <requirement>     one stage at a time
/engineering-framework:framework-doctor              audit the contract
```

Expect to be stopped for plan approval, and expect the run to end with a diff
in your working tree and nothing committed. Both are the design.

## Updating the framework

```text
/plugin marketplace update jaylordibe
/plugin update engineering-framework@jaylordibe
```

Then restart — an update does not apply to a running session, and hooks in
particular keep using the previous version's path until `/reload-plugins`.

With `autoUpdate` on the marketplace entry, which is what the installer writes,
**both commands are done for you**: Claude Code refreshes the catalogue and updates the installed plugin in
the background after a session starts, up to about ten minutes in. The new
version loads on your next launch, or after `/reload-plugins`. So the only thing
left is the restart.

An update **never** requires re-running `framework-install`, re-adding the
marketplace, or any action from colleagues who have not pulled yet. Your
repository contract is unaffected by a plugin update; it is already committed.

You receive a new version only when `version` in the plugin's manifest is
bumped. If the bump is **major**, read that entry in `CHANGELOG.md` before
updating — a major bump is defined as one where a consuming repository may have
to act. Minor and patch bumps never ask anything of you.

**Your repository records no framework version.** There is nothing to keep in
sync, and nothing that can go stale. Claude Code owns the installed version, the
cache and the update lifecycle; on a major bump, the CHANGELOG entry says
exactly what to do.

## When to run `framework-doctor`

- after `framework-install`;
- after any change to `CLAUDE.md`, especially its commands or high-risk paths;
- after a framework major version bump;
- when a review says something about your architecture that surprises you —
  the doctor verifies documentation claims against source, and a stale
  `CLAUDE.md` is the most common cause.

## Turning things off

There is nothing to turn off. The framework ships no permission rules and no
hooks that gate a command, so it cannot block anything you were going to do.
The gates are human-invoked, so a stage you do not want simply is not run.

If something is blocking a command, it is your own `.claude/settings.json` or
your permission mode — not this plugin. See **The repository contract** above,
and the 1.0.0 entry in `CHANGELOG.md`.
