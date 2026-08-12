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

## Install

```bash
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

Then, in the repository you want to use it in:

```text
/engineering-framework:framework-install
```

That writes the parts of the contract a plugin cannot ship — see
[The permissions floor](#the-permissions-floor-and-why-you-have-to-install-it).

Requires **jq** on `PATH`. Without it the safety hooks fail closed and prompt
for everything, which is safe but tedious.

### For a team

Pin the framework in the repository so every collaborator gets the same
version, reviewable in a commit:

```jsonc
// .claude/settings.json
{
  "extraKnownMarketplaces": {
    "jaylordibe": {
      "source": { "source": "github", "repo": "jaylordibe/claude-engineering-framework" }
    }
  },
  "enabledPlugins": { "engineering-framework@jaylordibe": true }
}
```

---

## Use

```text
/engineering-framework:work-item <requirement, issue key, or issue URL>
```

One command drives the whole pipeline and stops **exactly twice**: once for you
to approve the plan, once for you to review the diff and push. Everything in
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

### The two human gates

| Gate | Why it cannot be automated |
|---|---|
| **Plan approval** | `gate-approve` sets `disable-model-invocation: true`, so Claude *cannot* invoke it. A design cannot approve itself — that is a structural property, not a prompt. |
| **Commit and push** | Git writes are denied. The commit is your act of record. |

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

`gate-review` picks the panel by risk tier. Reviewing a copy fix with seven
agents and an authorization change with one are the same mistake in opposite
directions.

### Safety hooks

A command guard that resolves the *effective* verb behind wrappers, so
`git -C /elsewhere commit`, `dotenv -e .env -- <migration runner>` and
`sudo npm publish` are all seen for what they are. A protected-path guard for
the edits whose failure is silent, remote and unrecoverable: migrations,
infrastructure, CI configuration, lockfiles.

Its behaviour is pinned by a 281-row decision table that runs on every commit —
**106 of those rows assert that an ordinary command produces no prompt at all**.
A guard that nags gets switched off within a day, and then it protects nothing.

The guard reads a command the way a shell does, not the way a substring search
does. `grep -rn "git push" .` searches for text; `ls; git push` is two
commands and the second is denied. Getting that distinction wrong is not a
lesser failure than missing a dangerous command — a denial cannot be clicked
through, so a false one blocks ordinary work outright.

---

## Risk decides ceremony

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

## The permissions floor, and why you have to install it

A plugin's `settings.json` supports only two keys, so **a plugin cannot ship
permission rules.** This is a real constraint of Claude Code, not a design
choice, and it shapes the framework's honesty about its own guarantees:

| Layer | Ships with the plugin? | Can it fail open? |
|---|---|---|
| `permissions.deny` — declarative floor | **No.** You install it. | No |
| Command guard hook | Yes | Yes — it is executable code, and a crashed hook is a non-blocking error |

They are complementary. The deny rule cannot fail open but only sees the exact
command forms it names; the hook sees far more forms but can fail. Install both.

### The `allow` tier is the half that makes the other two usable

A floor of `deny` and `ask` rules alone leaves every ordinary command — `ls`,
`grep`, your test suite — matching no rule, which means a prompt. So the floor
ships **450 allow rules**, and that is not a relaxation of it. It is the reason
the denials still mean something.

Which rules belong there is decided by **measurement, not intuition**. Replaying
20_498 real Bash invocations showed that `cd` alone caused about a fifth of all
prompts — it cannot write, execute, or take a command as an argument, and had
simply never been added — and that 88.7% of every `sed` call is `sed -n` reading
a range of lines. Guessing at this produces a floor that feels careful and
prompts on one command in five.

Twenty prompts per feature is not twenty decisions. It is one reflex, and the
reflex is Yes — still armed when the twenty-first prompt is the migration.

**A permission prompt is not a gate.** The gates are the two places a human
reads a plan or a diff. A prompt that arrives with neither attached buys no
safety; it only spends the attention the real gate needs.

A rule earns a place in the `allow` tier only if it cannot write outside the
working tree, cannot execute remote code, does not take an arbitrary command as
its argument, and cannot widen a rule above it. That last criterion is why
`docker compose -f` is *not* allowed while `docker compose up` is: the file flag
takes an arbitrary path and then an arbitrary verb, which would leave
`docker compose -f x.yml down -v` matched by nothing but the hook.

`framework-install` writes the floor and never overwrites what you already
have. `framework-doctor` tells you if it goes missing — and, because merging
only ever adds, it also reports any rule the floor has since **withdrawn** that
is still installed. That drift is invisible to a rule count: the allow tier
grows while a stale `ask` rule quietly outranks it, so the repository looks
healthier as it gets worse.

**Neither is a sandbox, and the documentation will never call one that.** A
shell can always express an operation a parser does not model. For a real
boundary, use OS sandboxing or a container.

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
| [Architecture](docs/architecture.md) | Why the framework and the repository own different things |
| [Consuming repository guide](docs/consuming-repository-guide.md) | Setting up a repository, minimally |
| [Migration guide](docs/migration-from-dot-claude.md) | Moving from a copied `.claude/` directory |
| [Development guide](docs/development-guide.md) | Changing, validating and releasing the framework |
| [Claude Code constraints](docs/constraints.md) | The platform limits that shaped this design, with citations and dates |
| [Versioning](docs/versioning.md) | What a major, minor and patch bump mean here |

---

## Troubleshooting

**Skills do not appear.** Run `/reload-plugins`, or restart. Confirm with
`claude plugin list`.

**Everything prompts for permission.** Two causes, in order of likelihood.

*You upgraded the plugin and nothing improved.* `framework-install` merges and
never overwrites, so it only ever **adds** rules — a rule a later floor
*withdraws* stays in your settings forever, and an `ask` rule outranks every
`allow` rule beneath it. Re-run `/engineering-framework:framework-install`; it
lists the withdrawn rules and asks before removing any. `framework-doctor`
reports them under *Withdrawn floor rules are still installed*.

*Every command prompts, including `ls`.* `jq` is missing and the guards fail
closed by design. Install jq.

**One specific ordinary command prompts.** The floor cannot know your dev loop.
Add it to the `allow` tier in the `verb:*` prefix form, mirrored as a
`PowerShell` rule. Note that a prefix rule is blind to a global option before
the verb — `git --no-pager log` and `git log` are different strings to it — so
the form you actually run is the form to allow.

**A legitimate command is blocked.** Relax the specific policy in
`.claude/engineering-framework.json` — `humanOwnedGitWrites`,
`humanOwnedMigrations`, `humanOwnedDeployments`,
`humanOwnedPullRequests`. Turning the whole plugin off to get past one rule is
the outcome the configuration exists to avoid.

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

`0.x`. The workflow is derived from a battle-tested implementation, but its
generalisation across stacks is new. `1.0.0` lands once the first real
repository has been migrated onto it end to end.

MIT licensed. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
