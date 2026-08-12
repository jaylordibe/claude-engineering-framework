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

That scaffolds the two things a plugin cannot ship: a `CLAUDE.md` describing
what your system is, and a policy file naming your canonical commands and
high-risk paths.

**It writes no permission rules and never touches your `.claude/settings.json`.**
See [What this framework does not do](#what-this-framework-does-not-do).

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

**Everything prompts for permission.** From 1.0.0 this is not the framework —
it ships no permission rules and no hooks that gate a command. Prompting is
governed entirely by your own settings and your chosen permission mode.

If you installed a version before 1.0.0, it merged a permissions floor into
your `.claude/settings.json` and that floor is still there, because a merge
only ever adds. Two things to remove by hand:

- **`permissions.defaultMode`** — a project settings file *overrides* your own
  `~/.claude/settings.json` for this key, so a floor-installed `acceptEdits`
  silently cancels a permission mode you chose. Delete it.
- **The `allow`, `ask` and `deny` rules the floor added** — keep whichever ones
  you actually want; they are yours now, and the framework has no opinion.

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

`0.x`. The workflow is derived from a battle-tested implementation, but its
generalisation across stacks is new. `1.0.0` lands once the first real
repository has been migrated onto it end to end.

MIT licensed. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
