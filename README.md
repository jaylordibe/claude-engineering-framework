# claude-engineering-framework

A Claude Code plugin that installs a disciplined engineering workflow into any
repository, on any stack.

```text
Understand → Design → Human approval → Implement → Review → Validate → Present
```

One principle holds the whole thing together:

> **The framework owns methodology. The repository owns truth.**

The plugin knows how to design, review and validate a change. It knows nothing
about *your* system — not its language, its database, its authorization model,
or whether it has any of those. Every architectural claim its agents make is
either cited to a line of your code or labelled as an unknown.

That is the entire design. Everything below is a consequence of it.

---

## Start here — which situation are you in?

Two separate things have to be in place, and confusing them is the most common
setup problem:

| | What it is | Where it lives | How it gets there |
|---|---|---|---|
| **The plugin** | The methodology: gates, agents, standards, charter | `~/.claude/` on **your machine** | You install it. `git pull` never brings it. |
| **The repository contract** | `CLAUDE.md` and `.claude/engineering-framework.json` — what *your* system is | Committed in the **repository** | `git pull`. Someone ran `framework-install` once; nobody else has to. |

Now pick your row:

| Situation | Go to |
|---|---|
| I have never installed this on this machine, and nobody has set up my repository yet | [1. Install the plugin](#1-install-the-plugin) → [2. Set up the repository](#2-set-up-the-repository-once-per-repository) |
| A teammate already set up the repository; I just pulled it | [3. Joining a repository someone else set up](#3-joining-a-repository-someone-else-set-up) |
| I already use it, and a new version has been released | [4. Updating to a new version](#4-updating-to-a-new-version) |

There is a [full command reference](#command-reference--required-vs-optional)
below saying exactly which commands are required, which are optional, and how
often each is run.

---

## 1. Install the plugin

**Once per machine.** Not per repository, and not per version.

```text
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

Then restart Claude Code. Confirm it worked:

```bash
claude plugin list
```

You should see `engineering-framework@jaylordibe` with a version and
`Status: ✔ enabled`. The plugin unpacks to
`~/.claude/plugins/cache/jaylordibe/engineering-framework/<version>/`; each
version gets its own directory, so nothing is overwritten in place.

That is the whole machine-level setup. It applies to every repository you open
from now on.

---

## 2. Set up the repository (once per repository)

**Once per repository, by whoever introduces the framework to it.** The result
is committed, so no teammate ever repeats this step.

```text
/engineering-framework:framework-install
```

It scaffolds the two things a plugin cannot ship, showing you every change
before writing it and never overwriting existing content:

| File | Required? | What it does |
|---|---|---|
| `CLAUDE.md` | **Yes** | States what your system actually is — stack, canonical commands, consumers. Without it every agent infers your architecture, which is the failure this framework exists to prevent. |
| `.claude/engineering-framework.json` | Optional | Names your canonical commands, so `gate-validate` runs them rather than guessing, and your high-risk paths, so `gate-review` raises the ceremony for a change that touches one. |

**It writes no permission rules and never touches your `.claude/settings.json`.**
See [What this framework does not do](#what-this-framework-does-not-do).

Commit both files. Then verify:

```text
/engineering-framework:framework-doctor
```

### Make it one step for your team

`framework-install` deliberately does not edit `.claude/settings.json`. If you
want teammates to get the plugin without typing anything, add this to the
repository's committed `.claude/settings.json` **yourself**:

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

**Both keys are needed.** `enabledPlugins` on its own names a plugin without
saying where it comes from — a teammate whose machine has never heard of the
`jaylordibe` marketplace cannot resolve it, and has to run
`/plugin marketplace add` by hand. `extraKnownMarketplaces` is what removes
that step. `autoUpdate` keeps the marketplace catalogue fresh so new releases
arrive without anyone running an update command.

This pins the framework in a commit, which is reviewable, rather than in eleven
developers' heads.

---

## 3. Joining a repository someone else set up

You pulled a repository that already contains `CLAUDE.md` and
`.claude/engineering-framework.json`. **Do not run `framework-install`** — the
repository contract is already there, in the commit you just pulled. Running it
again only prints "already correct" and skips.

What you actually need is the plugin on your machine:

- **If the repository pins the marketplace** (both keys above, committed):
  nothing. Open the repository, accept the trust prompt for the marketplace,
  restart. Done.
- **If it does not**: run the two commands from
  [Install the plugin](#1-install-the-plugin) once.

Then confirm the repository and your installed version agree:

```text
/engineering-framework:framework-doctor
```

If your installed major version differs from the `frameworkVersion` declared in
`.claude/engineering-framework.json`, the doctor **fails on purpose** and names
both versions. That is the signal to update, not a broken repository.

---

## 4. Updating to a new version

You receive a new version only when `version` in `plugin.json` is bumped.
Commits pushed without a bump change nothing for anyone — that is deliberate, so
a framework that changes how a team works changes on a release rather than on a
push. See [Versioning](docs/versioning.md).

```text
/plugin marketplace update jaylordibe
/plugin update engineering-framework@jaylordibe
```

Then **restart Claude Code** — an update does not apply to a running session.
Confirm with `claude plugin list`.

The first command refreshes the cached copy of the marketplace catalogue; the
second pulls the new plugin version. If the repository sets `"autoUpdate": true`
on the marketplace entry, the first is done for you and a restart may be all you
need.

Equivalent commands outside a session:

```bash
claude plugin marketplace update jaylordibe
claude plugin update engineering-framework@jaylordibe
```

### What an update does *not* require

- **Not `framework-install`.** Your repository contract is unchanged by a plugin
  update, and is already committed.
- **Not `/plugin marketplace add`.** The marketplace stays configured.
- **Not a re-install.** `update` is the operation; `install` is for a machine
  that has never had it.
- **Nothing from teammates who have not pulled yet.** The plugin version and the
  repository contract are independent until `framework-doctor` compares them.

### If a repository bumped `frameworkVersion` before you updated

Read the [CHANGELOG](CHANGELOG.md) entry for that version first if the **major**
number changed — a major bump means the workflow contract changed and may ask
something of you. Minor and patch bumps never do.

---

## Command reference — required vs optional

| Command | How often | Required? |
|---|---|---|
| `/plugin marketplace add jaylordibe/claude-engineering-framework` | Once per machine | **Required**, unless the repository pins `extraKnownMarketplaces` |
| `/plugin install engineering-framework@jaylordibe` | Once per machine | **Required**, unless the repository pins `enabledPlugins` *and* the marketplace |
| `/engineering-framework:framework-install` | Once per repository, by one person | **Required** for the person introducing it. **Never** for anyone who pulls afterwards |
| `/plugin marketplace update jaylordibe` | Per release | Required to receive a release, unless `autoUpdate` is set |
| `/plugin update engineering-framework@jaylordibe` | Per release | **Required** to receive a release |
| `/engineering-framework:framework-doctor` | Any time | Optional, and the fastest way to prove everything is wired |
| `/engineering-framework:work-item <requirement>` | Per change | The everyday command |
| `/engineering-framework:gate-*` | Per stage | Optional alternative to `work-item` — same pipeline, you drive it |

Every command that starts with `/engineering-framework:` must be typed by a
human. Claude cannot invoke any of them: each sets
`disable-model-invocation: true` in its own frontmatter. That is a structural
property, not a prompt asking nicely.

---

## Use

```text
/engineering-framework:work-item <requirement, issue key, or issue URL>
```

One command drives the whole pipeline and stops **exactly twice**: once for you
to approve the plan, once for you to review the diff and commit. Everything in
between runs without asking, at full rigor.

Or run the stages yourself, deciding at every boundary:

```text
/engineering-framework:gate-design <requirement>
/engineering-framework:gate-approve
/engineering-framework:gate-implement
/engineering-framework:gate-review
/engineering-framework:gate-validate
```

Both paths reach the same place. The difference is who decides when to move on.

If you implemented something ad hoc, without a gate, you can still pick up the
back half: ask for `gate-review`, then `gate-validate`.

### The two human gates

| Gate | Why it cannot be automated |
|---|---|
| **Plan approval** | `gate-approve` sets `disable-model-invocation: true`, so Claude *cannot* invoke it. A design cannot approve itself. |
| **Commit and push** | The charter names committing, pushing, merging, releasing, deploying and applying migrations as human-owned. The gates prepare the diff, the tests and the evidence, then stop and hand off. The commit is your act of record. |

The framework does not *block* the second one — from 1.0.0 it ships no
permission rules at all. It reserves the operation and hands off. If you want it
blocked outright, that is a rule you add to your own settings; see
[What this framework does not do](#what-this-framework-does-not-do).

Ambiguous praise is never an approval. Neither is silence.

---

## What ships

### Skills

| Skill | Role |
|---|---|
| `work-item` | The conductor. Runs all seven stages in one session. |
| `gate-design` | Map reality, reconcile the request, classify risk, compare alternatives, threat-model, plan. |
| `gate-approve` | Read the design back and take an explicit human decision. |
| `gate-implement` | Build only what was approved. Preserve unrelated work. |
| `gate-review` | Independent multi-lens review, with adversarial refutation of serious findings. |
| `gate-validate` | Read-only evidence gate. Returns `PASS`, `FAIL` or `BLOCKED`. |
| `framework-install` | Write the repository side of the contract. |
| `framework-doctor` | Audit that contract, including whether your docs still match your code. |

Three more load themselves when the task calls for them, and never appear in
the menu: `domain-auth`, `domain-authorization`, `domain-background-work`.
They carry the decisions and failure modes for those areas — and none of the
answers, because the answers are yours.

### Agents

Eight read-only lenses: `context-mapper`, `architect`, `reviewer`, `security`,
`tester`, `contract`, `data`, `performance`.

Read-only is enforced by their tool pool and asserted in CI, not promised in
prose. They find; the main conversation verifies and fixes.

`gate-review` picks the panel by risk tier, and within a tier by what the diff
actually touches. Reviewing a copy fix with seven agents and an authorization
change with one are the same mistake in opposite directions.

Where applicability is genuinely uncertain on a High or Critical change, the
lens runs. One agent that finds nothing is cheaper than the finding nobody
made.

### One hook

A `SessionStart` hook prints the charter — the workflow, the risk tiers, the
evidence language and the human-owned operations. It is the framework's entire
always-on context cost, and it gates nothing.

---

## What this framework does not do

**It ships no permission rules, and it never edits your `.claude/settings.json`.**

Until 1.0.0 it did both: a 172-rule permissions floor merged into your
settings, plus two hooks that inspected every Bash and Edit call. That was
roughly a third of the code and half the test burden, and it was removed
deliberately.

Two reasons. The first is that **a text parser cannot out-guess a shell** — a
multi-lens review of the last attempt to extend it found two Critical and ten
High defects in one pass, including a hostname check that only matched the
spaced spelling of `-h` and a `git checkout --ours` exemption resting on a
false premise about how git behaves. Every hole patched suggested another.

The second matters more: **a plugin that rewrites your permission rules is
confusing.** If you turn on a permission mode, you should get that mode — not
one a plugin quietly changed underneath you. Permissions belong to the
repository and the person who owns it.

The methodology is unchanged. The charter states which operations are
human-owned, the gates stop and hand off rather than blocking, and the review
lenses read your diff. Where enforcement is genuinely wanted, your own settings
and your chosen permission mode do it — `framework-doctor` will name the rule
it would suggest, and will not write it.

### Upgrading from a version before 1.0.0

Whatever the old `framework-install` merged into your `.claude/settings.json` is
still there, because a merge only ever adds. Nothing removes it for you, and
nothing in the framework reads it any more. Two things to do by hand:

- **Delete `permissions.defaultMode`.** A project settings file *overrides* your
  own `~/.claude/settings.json` for this key, so a floor-installed `acceptEdits`
  silently cancels the permission mode each developer chose. In a shared
  repository this affects everyone who pulls.
- **Keep or delete the `allow`, `ask` and `deny` rules as you see fit.** They are
  yours now. The framework has no opinion and no longer reads them.

The `.claude/engineering-framework.json` keys `protectedCommands`,
`protectedPaths`, `useDefaultCommandRules`, `useDefaultProtectedPaths` and the
`policy` switches configured the removed guards and now do nothing;
`framework-doctor` names them if they are still present. `commands` and `risk`
are still read by the gates.

---

## Risk decides ceremony — and depth

| Tier | Examples | You get |
|---|---|---|
| **Low** | Copy, isolated rename, test-only cleanup | **No plan document.** Review and validation still run. |
| **Medium** | Ordinary business logic, endpoint behaviour | A plan |
| **High** | Auth, tenancy, personal data, money, uploads, webhooks, migrations, public contracts, concurrency | Full plan, threat model, negative tests, multi-lens review |
| **Critical** | Identity infrastructure, cryptography, privileged access, destructive data work | All of High, plus human security review that the report names explicitly |

On a boundary between two tiers, you are in the higher one.

Uniform ceremony is ceremony that gets skipped — and a skipped step reads
exactly like a completed one. Refusing to write a plan for a copy fix is what
keeps the plan meaningful for a schema change.

The tier is raised automatically when a change touches a path listed in
`risk.highRiskPaths`. That declaration shapes review; it blocks nothing.

### Adaptive rigor, fixed quality floor

Risk also decides how much *investigation* a change gets. Mapping runs in one of
three depth bands, review lenses are launched because the diff actually touches
their concern, and a comment fix stops paying for a system-wide audit.

**This is not a cheap mode**, and the distinction is the whole design:

> Efficiency may never reduce the evidence, validation, testing, review
> independence or review depth that the classified risk level requires.

Three properties keep that honest. Standard depth is the **default** and a
shallower band has to be earned from evidence, because a change misclassified
downward produces a shorter and *more* confident report than the correct one. No
band drops a category — a cheap map still answers whether access control,
tenancy and persistence are affected, it is just allowed to answer cheaply, and
never by not looking. And depth moves one way: evidence widens a band and raises
a tier, and nothing afterwards lowers either.

So "keep this cheap" is a legitimate instruction about method — fewer
speculative searches, a shorter report, no lens your diff does not touch. It is
not an instruction about whether the work happens. The full policy is
`standards/execution-efficiency.md`.

---

## Evidence language

`PASS` means the check ran and passed for the stated scope. `FAIL` means it ran
and failed. `BLOCKED` means it could not run.

Skipped, partial, filtered or flaky is **never** `PASS`. A gate that only ever
reports `PASS` records nothing.

A check your repository simply does not have is `N/A`, not `BLOCKED` — and
`N/A` does not stand in the way of an overall `PASS`. A repository with no
linter is a normal repository; a framework that treats it as broken is a
framework people route around.

---

## What the repository has to provide

Exactly one file is mandatory: **`CLAUDE.md`**, describing what your system is
and how to verify it. Without it there is no statement of truth, and every
agent is left inferring your stack — the failure this framework exists to
prevent.

Everything else is optional and has a working default. See the
[Consuming repository guide](docs/consuming-repository-guide.md).

---

## Documentation

| Document | For |
|---|---|
| [Consuming repository guide](docs/consuming-repository-guide.md) | Setting up a repository, minimally |
| [Architecture](docs/architecture.md) | Why the framework and the repository own different things |
| [Migration guide](docs/migration-from-dot-claude.md) | Moving from a copied `.claude/` directory |
| [Versioning](docs/versioning.md) | What a major, minor and patch bump mean here |
| [Changelog](CHANGELOG.md) | What each release asks of you, if anything |
| [Development guide](docs/development-guide.md) | Changing, validating and releasing the framework |
| [Claude Code constraints](docs/constraints.md) | The platform limits that shaped this design, with citations and dates |

---

## Troubleshooting

**Skills do not appear.** The plugin is not installed, not enabled, or the
session predates the install. Run `claude plugin list`; if it is missing, you
are in [situation 1](#1-install-the-plugin). If it is listed and enabled, run
`/reload-plugins` or restart.

**`/engineering-framework:...` is not recognised on a teammate's machine but
works on mine.** The repository contract travels with `git pull`; the plugin
does not. They need [the install](#1-install-the-plugin), not
`framework-install`.

**`framework-doctor` reports a major version mismatch.** Your installed plugin
and the repository's declared `frameworkVersion` disagree on the major number.
[Update](#4-updating-to-a-new-version), then read the
[CHANGELOG](CHANGELOG.md) entry for that major.

**An update does not seem to have taken effect.** Restart. A plugin update does
not apply to a running session, and hooks in particular keep using the previous
version's path until `/reload-plugins`.

**Everything prompts for permission.** From 1.0.0 this is not the framework —
it ships no permission rules and no hooks that gate a command. Prompting is
governed entirely by your own settings and your chosen permission mode. If you
installed a version before 1.0.0, see
[Upgrading from a version before 1.0.0](#upgrading-from-a-version-before-100).

**A legitimate command is blocked.** Not by this plugin — check your own
`.claude/settings.json` and your permission mode. Before 1.0.0 the framework
shipped guard hooks that could block a command outright; they are gone, along
with the policy switches that relaxed them.

**An agent describes architecture the repository does not have.** That is a
bug, and it is the most serious kind this project has. Check `CLAUDE.md` first
— agents treat it as evidence, so a stale one produces exactly this. Run
`framework-doctor`, which verifies documentation claims against source. If the
documentation is accurate and the agent still invented the architecture,
[open an issue](https://github.com/jaylordibe/claude-engineering-framework/issues)
with the transcript.

**A gate was skipped.** Gates cannot be model-invoked. If Claude claims a gate
ran, it did not — that claim is itself the bug.

---

## Status

Stable, and past `1.0.0`. The framework ships methodology only: no permission
rules, no hooks that gate a command. Its workflow is derived from a
battle-tested implementation, and `1.0.0` marked the point at which real
repositories were running on it.

[CHANGELOG.md](CHANGELOG.md) is authoritative for the current release — this
section deliberately does not name a version, because a README that does is a
README that is wrong one release later.

MIT licensed. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
