# Architecture

## The one principle

> **The framework owns methodology. The repository owns truth.**

Everything else in this repository is a consequence of that sentence.

**Methodology** is how work is done: the order of the stages, what a risk tier
implies, what counts as evidence, which operations a human owns, how a finding
must be evidenced before it is reported. It is the same in a payments API and a
static site generator, which is why it can be centralised.

**Truth** is what a particular system *is*: its language, its layering, its
data model, its authorization mechanism, its deployment target, its non-obvious
invariants. It is different in every repository and changes underneath you,
which is why it cannot be centralised — and why every attempt to do so produces
a framework that confidently describes an architecture nobody has.

## The failure this prevents

The framework this one was extracted from lived inside a single API repository.
It was excellent there, because its agents knew that repository's exact
contracts by name. Copying that directory into a second repository would have
produced a review measuring the new code against the old one's architecture —
fluent, specific, and wrong in a way that is very hard to notice.

That failure mode is the whole design constraint. A framework used across a
hundred repositories must be **structurally incapable** of asserting a stack.

## How the split is enforced

Documentation is not enforcement. Four mechanisms make the split real:

### 1. The evidence protocol

`standards/repository-evidence.md` is read by every agent before it does
anything. It fixes a source precedence — code over tests over CI over
documentation over ticket wording over the model's own priors — and requires
every claim to be labelled **FACT** (with a `path:line` actually opened),
**INFERENCE**, **ASSUMPTION** or **UNKNOWN**.

An `UNKNOWN` is a result. That is the load-bearing part: the alternative to
inventing an answer has to be a legitimate output, or it will not be chosen.

### 2. Agents that ask instead of assert

Every agent begins by *locating* the mechanism it reviews. The security agent
does not check "is CASL used correctly"; it asks "where is record-level access
enforced in this repository, and what happens if I cannot find it?"

The questions generalise losslessly. The answers never do.

### 3. A mechanical denylist

`tests/validate-plugin.mjs` scans every skill, agent, standard and template for
the name of any specific framework, ORM, database, queue or tool. A match fails
CI.

This is the check that makes the principle survive contact with a hurried
contributor. Prose saying "stay stack-agnostic" is a wish; a failing build is a
constraint. It is verified non-vacuous: injecting a product name into a
standard fails the build.

### 4. Repository-owned extension points

Anything genuinely stack-specific has a place to live that is *not* the
framework: the repository's own `CLAUDE.md`, its own `.claude/skills/`, and its
own `.claude/engineering-framework.json`.

The framework never competes with those. It cites them.

Both guards have such an extension point, and symmetrically: `protectedPaths`
for files, `protectedCommands` for commands. Each is checked *before* the
framework's own tables, so a repository-authored reason wins. Without the
command-side half, a repository could only switch the framework's ecosystem
lists on and off — it could not teach the guard that `make db-reset` wipes its
shared database, which is exactly the kind of truth the framework cannot know.

### 5. A vocabulary that can say "this repository does not have that"

The labels include **ABSENT** alongside **UNKNOWN**, and the evidence verdicts
include **`N/A`** alongside `BLOCKED`.

That distinction carries more weight than it looks like it should. Without it,
a repository with no linter, no tenancy model and no migrations produces a map
full of unknowns and a validation verdict that can never reach `PASS` — so the
framework treats an ordinary small repository as a defective one, and the gate
becomes an obstacle rather than a signal. The first thing anyone does with an
obstacle is route around it.

`ABSENT` is a fact about the system. `UNKNOWN` is a gap in the investigation.
Only the second is a problem.

## The three tiers

```text
┌──────────────────────────────────────────────────────────┐
│ 1. METHODOLOGY          this plugin                       │
│    gates · risk tiers · evidence protocol · lenses        │
│    ─ same for every repository on earth ─                 │
├──────────────────────────────────────────────────────────┤
│ 2. STACK KNOWLEDGE      a separate plugin, when needed    │
│    idioms and pitfalls of one technology                  │
│    ─ loaded only when the repository shows evidence ─     │
├──────────────────────────────────────────────────────────┤
│ 3. REPOSITORY TRUTH     the repository itself             │
│    CLAUDE.md · .claude/skills/ · policy file              │
│    ─ authoritative; overrides both tiers above ─          │
└──────────────────────────────────────────────────────────┘
```

Tier 1 exists today. Tier 3 is what you write. **Tier 2 deliberately does not
exist yet** — see [Extension model](#extension-model).

Precedence runs upward: tier 3 beats tier 2 beats tier 1. A framework standard
that contradicts a repository's own documented contract loses, every time, and
the standards say so in their own text.

## Component map

```text
plugins/engineering-framework/
├── skills/          workflow gates + model-invoked domain playbooks
├── agents/          eight read-only review lenses
├── standards/       the generic bar, cited by skills and agents
├── templates/       thinking aids: plan, threat model, worksheets, reports
├── hooks/           hooks.json only
├── scripts/         the guard implementations and the session charter
├── reference/       what a consuming repository copies or is scaffolded from
└── bin/ef-doctor    contract audit, on PATH while the plugin is enabled
```

`standards/` and `templates/` are not Claude Code component directories. They
are plain files, cited by `${CLAUDE_PLUGIN_ROOT}` from the skills and agents
that need them — which is exactly the point: **nothing loads until something
needs it.**

## Context economy

The framework runs on every request in every repository, so its always-on cost
is a first-class design constraint.

| Loaded | When | Cost |
|---|---|---|
| Session charter | Every session, via a `SessionStart` hook | ~65 lines, capped at 70 |
| Skill listing entries | Always | Three model-invoked descriptions |
| A gate `SKILL.md` | When the human invokes that gate | One file |
| A standard | When a gate or agent cites it | One file |
| A template | When a gate reaches the section that uses it | One file |
| An agent prompt | In that agent's own context, not yours | Isolated |

The conductor deliberately does **not** front-load the gate skills. Five gates
is over a thousand lines, four of which would be read long before they matter.
Loading on demand is the entire reason the gates are separate files.

The `SessionStart` hook is used because a `CLAUDE.md` at a plugin root is not
loaded as project context — plugins contribute context through skills, agents
and hooks. See [constraints](constraints.md).

## Why the human gates are structural

Two boundaries are enforced by mechanism, not by instruction:

**A design cannot approve itself.** `gate-approve` sets
`disable-model-invocation: true`, which removes it from Claude's context
entirely. There is no phrasing that causes Claude to invoke it. Under the
conductor, approval instead comes from a plan-mode decision — a real user
action, recorded into the implementation task so it survives compaction. A
summary claiming "the user approved" is not evidence, and `gate-implement`
says so explicitly.

**The commit is the human's.** Git writes are denied at two layers, and the
work is reported as existing only in the working tree.

Everything else — moving between implement, review and validate — is *not* a
gate. Prompting there converts one authorisation into four confirmations of a
decision already made, which trains people to click through the prompts that
do matter.

## Why review independence is preserved differently in each mode

Whoever reviews a diff should not be the context that just wrote it.

**Standalone** preserves that by recommending a fresh session before reviewing
High or Critical work.

**Conductor** cannot pause, so it preserves it structurally: on High or
Critical work the review *must* fan out to independent read-only subagents,
each starting from a clean context and reading the diff from disk, and *must*
run the adversarial refutation pass on every serious finding.

A conductor that reviews High-risk work by itself has skipped the gate, not
accelerated it. That sentence appears in three files on purpose.

## Adversarial verification

The context that produced a finding is the worst available judge of whether it
is real. For Critical and High findings on High and Critical changes, an
independent agent is asked to **refute** the finding, defaulting to refuted
when the evidence is ambiguous.

Refuted findings are dropped and recorded with their refutation. Surviving
findings carry the refutation attempt on the record — which is what makes the
severity credible to whoever reads it later.

It is not run below that threshold: the cycle costs more than the precision it
buys.

## Extension model

Stack knowledge belongs in **its own plugin in the same marketplace**, not in
this one:

```jsonc
{
  "name": "some-stack-pack",
  "source": "./some-stack-pack",
  "dependencies": ["engineering-framework"]
}
```

Its skills carry a `when_to_use` that requires repository evidence — *"use only
when this repository actually contains X"* — so the pack stays inert in a
repository it does not apply to.

**No stack pack ships today**, deliberately. The first one should be extracted
from a second real repository that needs it, not designed in advance from one.
YAGNI applies to frameworks about engineering discipline exactly as it applies
to everything else.

### The first candidate, recorded rather than built

Adding a second real stack to `fixtures/` surfaced guidance that is genuinely
reusable *and* genuinely stack-specific — the combination that a pack exists
for, and that a generic agent must never absorb:

- Migration tooling that keys applied migrations **by filename** makes editing
  an already-applied migration invisible to every environment that ran it. The
  generic framework can only say "an applied migration is protected", which is
  what the path guard already does. Naming the mechanism, and the CI shape that
  catches it, needs the pack.
- **Expand/contract sequencing** where the previous build serves traffic against
  the new schema for the length of the deploy window. The failure is real and
  the remedy is tool-specific.

Neither is written into an agent today, and neither should be. They are recorded
here so the first pack starts from evidence rather than from a blank page.

## What was deliberately left behind

| Left behind | Why |
|---|---|
| Repository-specific playbooks | They cite symbols that exist in one repository. They stay there. |
| The declarative permissions floor | A plugin cannot ship permission rules. Shipped as reference + installer + audit instead. |
| Issue-tracker specifics | Tracker-agnostic and optional; the write-blocking rules are permissions, which a plugin cannot ship. |
| A worktree fan-out for parallel implementation | Deferred in the original design for good reasons that still hold. |
| `permissionMode` on agents | Not supported for plugin-shipped agents. Read-only comes from the tool pool and is asserted in CI. |
