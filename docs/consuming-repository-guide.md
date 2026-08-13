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
The two `/plugin` commands above, then restart. **Do not run
`framework-install`**: the contract is already in the commit you pulled, and
re-running it only reports that everything is already correct. If the repository
pins the marketplace (see [Making it one step for your
team](#making-it-one-step-for-your-team)), even those two commands are
unnecessary — accept the trust prompt and restart.

Either way, then work:

```text
/engineering-framework:work-item add rate limiting to the password reset endpoint
```

---

## The repository contract

| Artefact | Required | What it buys you |
|---|---|---|
| `CLAUDE.md` | **Yes** | Everything. Without it, every agent infers your stack. |
| `.claude/engineering-framework.json` | Optional | Canonical commands the validation gate runs, and high-risk paths that raise the review tier |
| A `Consumers` table in `CLAUDE.md` | Recommended | Contract changes that name who breaks |
| `.claude/skills/` playbooks | Optional | Where your stack-specific knowledge lives |

Nothing else. No `tasks/` directory, no plan files, no decision-record
directory, no mandated test framework or language.

**And nothing in `.claude/settings.json`.** From 1.0.0 the framework ships no
permission rules and never edits your settings — permissions belong to you.
Earlier versions installed a permissions floor; if you have one, it is still
there because a merge only ever adds, and nothing here reads it any more. See
the 1.0.0 entry in `CHANGELOG.md` for what is worth deleting.

### Making it one step for your team

`framework-install` will not write this, because settings are yours. If you want
colleagues to get the plugin without typing anything, add it yourself and commit
it:

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

**Both keys are needed.** `enabledPlugins` names a plugin without saying where
it comes from, so a colleague whose machine has never heard of the marketplace
cannot resolve it and still has to run `/plugin marketplace add` by hand.
`extraKnownMarketplaces` is the half that removes the manual step.

`autoUpdate` keeps the marketplace catalogue fresh, so a released version
arrives without anyone running an update command. That is a real trade: it makes
**the framework's version bump the only thing standing between a changed
standard and everyone on your team.** Leave it off if you would rather adopt
releases deliberately.

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

## 2. Repository policy (optional)

`.claude/engineering-framework.json`, validated against
`${CLAUDE_PLUGIN_ROOT}/reference/repo-config.schema.json`.

```jsonc
{
  "frameworkVersion": "1.0.0",

  "commands": {
    "build": "make build",
    "lint": "make lint",
    "test": "make test"
  },

  "risk": {
    "highRiskPaths": ["*/src/pricing/*", "*/src/auth/*"]
  }
}
```

**Keep it short.** An absent key and a key set to its default behave
identically, and the shorter file is the one people keep accurate.

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
particular keep using the previous version's path until `/reload-plugins`. With
`autoUpdate` set on the marketplace entry, the first command is done for you.

An update **never** requires re-running `framework-install`, re-adding the
marketplace, or any action from colleagues who have not pulled yet. Your
repository contract is unaffected by a plugin update; it is already committed.

You receive a new version only when `version` in the plugin's manifest is
bumped. If the bump is **major**, read that entry in `CHANGELOG.md` before
updating — a major bump is defined as one where a consuming repository may have
to act. Minor and patch bumps never ask anything of you.

`frameworkVersion` in your policy file records which version this repository was
written against. `framework-doctor` compares it with what is installed and fails
on a **major** gap, so the upgrade note gets read rather than discovered.

## When to run `framework-doctor`

- after `framework-install`;
- after any change to `CLAUDE.md` or the policy file;
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
