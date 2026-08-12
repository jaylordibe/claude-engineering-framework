# Consuming repository guide

What a repository has to provide, and what it gets in return.

## The short version

**One file is mandatory: `CLAUDE.md`.** Everything else has a working default.

```bash
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

```text
/engineering-framework:framework-install
/engineering-framework:framework-doctor
```

Then work:

```text
/engineering-framework:work-item add rate limiting to the password reset endpoint
```

---

## The repository contract

| Artefact | Required | What it buys you |
|---|---|---|
| `CLAUDE.md` | **Yes** | Everything. Without it, every agent infers your stack. |
| `.claude/settings.json` with the permissions floor | Strongly recommended | The only layer that cannot fail open |
| `.claude/engineering-framework.json` | Optional | Per-repository policy, protected paths, canonical commands |
| A `Consumers` table in `CLAUDE.md` | Recommended | Contract changes that name who breaks |
| `.claude/skills/` playbooks | Optional | Where your stack-specific knowledge lives |

Nothing else. No `tasks/` directory, no plan files, no decision-record
directory, no mandated test framework or language.

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

## 2. The permissions floor

`framework-install` copies it from the plugin's reference file, merging into any
`settings.json` you already have and never overwriting a rule.

Four things to know:

- **The `allow` tier is the half that makes the other two usable.** A floor of
  deny and ask rules alone leaves every ordinary command — `ls`, `grep`, your
  test suite — matching no rule, which means a prompt. Twenty prompts per
  feature is not twenty decisions; it is one reflex, and the reflex is Yes. The
  reflex is still armed when the twenty-first prompt is the migration.
- **Add your own dev loop on top.** The floor cannot know which command is
  *your* test suite. Put your install, build, lint, typecheck and test commands
  in the `allow` tier, in the `verb:*` prefix form, mirrored for PowerShell.
  `framework-install` proposes these from your `commands` block if you have
  one. Never allow anything that takes an arbitrary command as an argument —
  one `Bash(env:*)` or `Bash(npx:*)` rule is unrestricted execution.
- **Mirror Bash rules as PowerShell rules.** The PowerShell tool is enabled by
  default on Windows without Git Bash, and `Bash(...)` rules do not govern it.
  An unmirrored floor silently disappears on those machines.
- **Use `Read(...)` and `Edit(...)` for path rules only.** A `Write(...)`,
  `Glob(...)`, `MultiEdit(...)` or `NotebookEdit(...)` path rule is accepted,
  never enforced, and warns at startup — the path reads as protected while
  being fully writable.

All four are checked by `ef-doctor`.

### Upgrading the floor: the one thing a merge cannot do

`framework-install` merges and never overwrites. That is the right default — it
must not silently undo a decision you made on purpose — but it means the merge
only ever **adds**. A rule a later floor *withdraws* cannot leave your
repository on its own, and since `ask` outranks `allow`, one stale rule can
cancel an entire release.

This is not hypothetical. v0.3.0 withdrew `docker exec *`, `git branch *`,
`git worktree *`, `gh api *` and `glab api *` from the `ask` tier so that
running a test suite inside a container would stop prompting. In every
repository that had already installed v0.2.0, all five survived, and the
release removed none of the noise it was written to remove.

So **re-run `framework-install` after every plugin upgrade**, not just the
first time. It reads `reference/retired-permission-rules.json`, lists every
withdrawn rule you still have with the reason it was withdrawn, and asks before
removing any. `ef-doctor` reports the same thing under *Withdrawn floor rules
are still installed*.

A rule count cannot detect this drift — your `allow` tier grows while the stale
`ask` rule quietly outranks it — so the repository looks healthier as it gets
worse.

### What a prefix rule cannot see

`Bash(git log:*)` matches the string `git log`. It does **not** match
`git --no-pager log`, `git -C /path log` or `git -c core.pager=cat log`, because
a global option before the verb makes a different string. The floor enumerates
the `--no-pager` forms for read-only verbs for exactly this reason, and
deliberately does not enumerate `-C` or `-c`, which take an arbitrary argument.

The lesson for your own dev-loop rules: **allow the form you actually run.** If
your test command is `docker compose exec -T api ...`, check that the form with
the flag is covered, not just the form without it.

**Where the `ask` tier stops and the guard starts.** A prefix rule cannot tell
`git branch -a` from `git branch -d`, `gh api` from `gh api -X DELETE`, or
`docker exec api <test command>` from `docker exec -it api bash`. The command
guard can, so those five live there now and the reading form no longer prompts.
`kubectl exec` and the database clients keep their declarative `ask` rules on
purpose: a rule cannot fail and a hook can, and a cluster or a live database
session can be production.

The floor also sets `permissions.defaultMode` to `acceptEdits`. This framework
gates where a human reads a plan and a diff — the design, approve, review and
validate steps. A per-file edit prompt is not one of those gates: it arrives
with no plan and no diff attached, and one authorization change legitimately
touches thirty files. The protected-path guard still asks for migrations, CI
workflows, infrastructure definitions, lockfiles and environment files. Drop
the key if you want the per-edit prompt back.

---

## 3. Repository policy (optional)

`.claude/engineering-framework.json`, validated against
`${CLAUDE_PLUGIN_ROOT}/reference/repo-config.schema.json`.

```jsonc
{
  "frameworkVersion": "0.1.0",

  "commands": {
    "build": "make build",
    "lint": "make lint",
    "test": "make test"
  },

  "policy": {
    "humanOwnedMigrations": false   // this repository has no database
  },

  "protectedPaths": [
    {
      "pattern": "*/src/pricing/*",
      "reason": "this changes what customers are charged. Confirm the amount is recomputed server side and that a test asserts the total."
    }
  ]
}
```

**Keep it short.** An absent key and a key set to its default behave
identically, and the shorter file is the one people keep accurate.

### The policy switches

| Key | Default | Denies |
|---|---|---|
| `humanOwnedGitWrites` | `true` | commit, push, merge, rebase, tag, reset, checkout, stash, … |
| `humanOwnedPullRequests` | `true` | creating, merging, closing, editing pull and merge requests |
| `humanOwnedMigrations` | `true` | migration application, database reset, seeding, across ecosystems |
| `humanOwnedDeployments` | `true` | infrastructure apply/destroy, cluster mutation, platform deploys |
| `humanOwnedDependencyInstall` | `false` | *asks* before dependency changes |
| `useDefaultCommandRules` | `true` | turn off to leave only your own `protectedCommands` |

Force pushes, history rewriting, publication and releases are denied
**regardless of policy**. A repository that delegates commits still does not
want an agent rewriting published history.

### Protected commands

The framework's built-in tables cover verbs that are dangerous in any
ecosystem. They cannot know that `make db-reset` wipes your shared database, or
that `bin/ship` deploys. Declare those yourself:

```jsonc
{
  "protectedCommands": [
    {
      "match": "*make db-reset*",
      "reason": "this wipes the shared development database, which three people are using.",
      "decision": "deny"
    },
    {
      "match": "*bin/ship*",
      "reason": "this deploys to production. Confirm the release has been approved.",
      "decision": "ask"
    }
  ]
}
```

`match` is a glob applied to each command segment — segments are split on `;`,
`|`, `&`, `(`, `)` and backticks, so a guarded verb cannot be smuggled in as
the tail of another line. Repository entries are checked **before** the
built-in tables, so your reason wins.

This is the command-side counterpart of protected paths, and it exists for the
same reason: the framework owns methodology, and your destructive commands are
truth it cannot know.

### Protected paths

Added to the defaults — migrations, infrastructure definitions, CI
configuration, lockfiles, real environment files — unless
`useDefaultProtectedPaths` is `false`.

Add a path only when the failure it prevents is **silent, remote and
unrecoverable**. Not because the file is important: a single change
legitimately touches thirty important files, and thirty identical prompts do
not make the reviewer thirty times more informed. They train the reviewer to
click through without reading, which is strictly worse than one prompt they
actually read.

Write the `reason` as the **precondition to check**, not as a restatement that
the path is protected.

---

## 4. Repository-specific playbooks (optional)

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

## When to run `framework-doctor`

- after `framework-install`;
- after any change to `CLAUDE.md` or the settings file;
- after a framework major version bump;
- when a review says something about your architecture that surprises you —
  the doctor verifies documentation claims against source, and a stale
  `CLAUDE.md` is the most common cause.

## Turning things off

Every control is adjustable in the policy file. Reach for that before
disabling the plugin: turning the whole framework off to get past one rule is
the outcome the configuration exists to avoid.
