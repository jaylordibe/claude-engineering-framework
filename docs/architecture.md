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
framework: the repository's own `CLAUDE.md` and its own `.claude/skills/`.

The framework never competes with those. It cites them.

The extension points that remain are the ones the *gates* read, and from 2.0.0
both are sections of `CLAUDE.md` rather than keys in a file of the framework's
own design: the **canonical commands** table tells the validation gate what to
run instead of inferring, and the **High-risk paths** section tells the design
and review gates which changes deserve more ceremony. Both are advisory guidance
to an agent. Neither blocks anything, and no document may describe them as
though they do.

Until 2.0.0 these lived in `.claude/engineering-framework.json`, alongside a
`frameworkVersion` the repository declared and `ef-doctor` compared against the
installed plugin. That file is gone, for three reasons that are worth keeping
because each one generalises:

- **`commands` was a second copy of the `CLAUDE.md` command table**, which the
  template told you to write in both places. Stating a contract twice is the
  drift this project's own conventions forbid everywhere else.
- **`frameworkVersion` was a synchronisation problem the framework invented for
  itself.** Claude Code already owns the installed version. A number in the
  consuming repository can only agree with it or go quietly stale, and the check
  that compared them made the second case look like a fourth kind of failure.
- **`risk.highRiskPaths` was the only key with a real job**, and its job is to
  state something true about *this repository* — which is the definition of what
  `CLAUDE.md` is for.

Until 1.0.0 the same file also carried `protectedPaths` and `protectedCommands`,
which configured two hooks that gated tool calls. Those hooks are gone; see
*What was deliberately left behind*.

### 4a. The one thing the framework writes into a repository

`framework-install` merges three things into the project's own
`.claude/settings.json` — `extraKnownMarketplaces`, `enabledPlugins`, and the
single `env` member `CLAUDE_CODE_ENABLE_TODO_TOOLS` that makes a run's stages
visible in the task panel — so the repository declares its dependency on this
framework the way it declares any other, and Claude Code owns everything downstream of that: trust, installation,
the installed version, the cache, updates.

The boundary is narrow on purpose, and it is the same boundary 1.0.0 drew:

| The framework writes | The framework never writes |
|---|---|
| `extraKnownMarketplaces.<marketplace>` | `permissions`, in any scope |
| `enabledPlugins["<plugin>@<marketplace>"]` | `hooks`, `env`, or any other key |
| — in the project's own settings only | `~/.claude/settings.json`, or anything under `~/.claude/plugins/` |
| `autoUpdate: true`, on a new entry only | an existing entry's stated `autoUpdate` |

**Declaring a dependency is not the same act as rewriting a permission
posture.** The first is what a package manifest does; the second is what the
pre-1.0.0 permissions floor did, and it is what remains banned. That distinction
is the whole justification for the exception, so it is asserted mechanically in
`tests/validate-install-settings.mjs` — including a case proving a run writes
nothing into `$HOME` — rather than promised in this document.

### 4b. Why `autoUpdate` is part of the declaration

A new marketplace entry is written with `"autoUpdate": true`. This is the
authoritative explanation; everywhere else refers here rather than restating it,
and [constraints C20](constraints.md) carries the platform citations.

**The principle: this is development tooling, not an application runtime
dependency.** A framework release changes the instructions, skills, review
discipline, validation behaviour and efficiency policy Claude brings to *future*
engineering work. It does not modify deployed application code, update
application dependencies, change a production runtime, deploy anything, or
bypass repository review, tests or CI. The blast radius of a bad framework
release is "the next change is designed or reviewed differently", not "production
moved" — and that is a categorically smaller risk than the one people are
imagining when they reach for a version pin.

Auto-update is therefore on by default, so developers spend their attention on
shipping product value rather than tracking framework releases. Teams that need
controlled adoption opt out; see *What holds the line* below.

**It also follows from removing the version pin.** Before 2.0.0 a consuming
repository declared `frameworkVersion`, and `ef-doctor` failed on a major gap —
crude, but a stale installation eventually announced itself. Nothing replaced
it: a repository now records **no framework version at all**. Updating is still
entirely possible — `/plugin marketplace update` then `/plugin update`, any
time — but nothing asks for it and nothing reports that a newer version exists.
So a team installs once and stays on that version until somebody deliberately
decides otherwise, and a corrected standard reaches them only then. The gap is
silent from both ends, which is this framework's characteristic failure.

**The alternatives were worse for the people they affect.** The documented
alternatives are a per-machine toggle in `/plugin` and an administrator setting
in *managed* settings. Neither is available to a public marketplace distributing
to strangers, and both amount to asking every developer to maintain a plugin they
did not choose to think about.

**What it explicitly does not relax.** An updated framework still runs the same
pipeline at the same floor: mapping, design, human approval, implementation,
review, validation, presentation, scaled by risk and scope. *Adaptive rigor,
fixed quality floor* is unchanged by how the plugin arrived on disk, and no part
of auto-update touches the gates, the evidence language, or the human-owned
operations. Receiving a release never means the next change gets less scrutiny —
only that the scrutiny is current.

**What it costs, and where that cost is carried.** The version bump in
`plugin.json` becomes the only brake between a changed standard and everyone who
has this key. That is not a footnote — [versioning](versioning.md) is written
around it, and it is why a standard change is a release decision here rather than
a merge decision.

**And it is not purely project-scoped**, which is measured rather than assumed:
Claude Code keeps marketplace state *"once per user in
`~/.claude/plugins/known_marketplaces.json`, not per project"*, and a committed
project value reaches it. So the key is written **loudly** — the installer
reports what it set and what that commits the team to, on every run, rather than
slipping it into a diff.

**What holds the line.** `--no-auto-update` opts out. An entry that already
*states* `autoUpdate`, `true` or `false`, is never rewritten — the installer
completes a declaration that has no opinion and does not reverse one that does,
using `has("autoUpdate")` rather than a truthiness test, because `false` is a
decision and a truthiness test cannot tell it from absent.
`validate-plugin.mjs` fails if the shipped declaration loses the key;
`validate-install-settings.mjs` fails if a fresh install omits it, if
`--no-auto-update` writes it anyway, or if an existing `false` is flipped.

The distinction from a permission rule still holds: this changes *when this
plugin updates itself*, which is a property of the dependency the repository
declared. It grants no tool access and blocks no operation.

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
├── hooks/           hooks.json only — a single SessionStart entry
├── scripts/         session-charter.sh, the only hook the plugin registers
├── reference/       CLAUDE.md template, and the marketplace declaration the
│                    installer merges into a consuming repository
└── bin/             ef-doctor, the read-only contract audit; and
                     ef-install-settings, the project declaration merge.
                     Both on PATH while the plugin is enabled
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
| Session charter | Every session, via a `SessionStart` hook | ~75 lines, capped at 80 |
| Skill listing entries | Always | Three model-invoked descriptions |
| A gate `SKILL.md` | When the human invokes that gate | One file |
| A standard | When a gate or agent cites it | One file |
| A template | When a gate reaches the section that uses it | One file |
| An agent prompt | In that agent's own context, not yours | Isolated |

The conductor deliberately does **not** front-load the gate skills. Five gates
is over a thousand lines, four of which would be read long before they matter.
Loading on demand is the entire reason the gates are separate files.

The same principle governs the *repository*, and that is the larger cost by far.
A gate skill is one file; a repository sweep is unbounded. See
[Adaptive rigor, fixed quality floor](#adaptive-rigor-fixed-quality-floor).

The `SessionStart` hook is used because a `CLAUDE.md` at a plugin root is not
loaded as project context — plugins contribute context through skills, agents
and hooks. See [constraints](constraints.md).

## Why the human gates are structural

Two boundaries are enforced by mechanism, not by instruction:

**A design cannot approve itself.** `gate-approve` sets
`disable-model-invocation: true`, which removes it from Claude's context
entirely. There is no phrasing that causes Claude to invoke it. Under the
conductor, approval instead comes from a plan-mode decision — a real user
action, recorded before the first edit into a run state file kept outside the
consuming repository so it survives compaction, and onto the implementation task
as well when the session has task tools at all. A summary claiming "the user
approved" is not evidence, and `gate-implement` says so explicitly.

That record used to live only on the task, which is the shape of defect
[C21](constraints.md#c21--the-task-list-tools-are-not-provided-by-default-on-current-models)
describes: a host application withdrew the tool by default, the write became a
no-op, and the guarantee was gone with nothing in this repository able to see
it. A boundary that depends on an optional feature of the host is enforced by
instruction after all.

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

## Adaptive rigor, fixed quality floor

`standards/execution-efficiency.md` is the single source for how much
computation a stage spends. It exists because the framework had exactly one
answer to "how deeply should this be investigated?" — *comprehensively* — and
paid it on a comment fix and a tenancy change alike.

**This is not a cheap mode.** The floor does not move:

> Efficiency may never reduce the evidence, validation, testing, review
> independence or review depth required to establish correctness for the
> classified risk level.

What adapts is everything above that line. Mapping runs in one of three depth
bands; review lenses are launched because the diff intersects their concern; a
model may be chosen per launch. What is spent is the **minimum sufficient
computation to establish production-grade confidence for the actual risk and
scope** — which is a different number from the lowest token count, and only one
of the two is safe to optimise for.

### Risk now governs investigation, not only ceremony

Before this, the risk tier decided what a change had to *produce* — a plan, a
threat model, negative tests, a wider review panel. It now also decides what a
change is investigated *with*. Both directions of that are deliberate: a Low
change stops paying for a system-wide map, and a High change cannot buy its way
out of one by having a small diff.

### The three properties that keep it safe

**Standard depth is the default; Targeted is earned.** A band is a conclusion
from evidence, never an opening assumption. The dangerous failure here is not
overspending — it is a change misclassified downward, which produces a shorter,
tidier, more confident output than the correct run.

**No band drops a category.** A Targeted map answers every question a Deep map
answers, and is allowed to answer some of them cheaply — *this path performs no
data access, this symbol has one caller* — rather than by a system-wide audit.
It is never allowed to answer one by not looking, and an `UNKNOWN` on access
control, tenancy or persistence forces the band wider.

**Depth is iterative and moves one way.** Evidence widens a band and raises a
tier; nothing lowers either afterwards, and neither the eventual size of the
diff nor how far along the work is counts as evidence that it should be.

### What is left on the table, and why

Reasoning effort is fixed per component and cannot be varied per launch, so the
obvious *effort scales with tier* design is not expressible — see
[C17](constraints.md#c17--reasoning-effort-cannot-be-varied-per-launch). Turn
ceilings are hard stops rather than budgets, so lowering them truncates the
deepest investigation while saving nothing on the short ones —
[C18](constraints.md#c18--maxturns-is-a-hard-stop-and-therefore-not-a-budget).
Both limitations are recorded rather than papered over with prose that would
claim a control the framework does not have.

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
  generic framework can only say "an applied migration deserves the higher risk
  tier", which a repository's High-risk paths already do. Naming the mechanism,
  and the CI shape that catches it, needs the pack.
- **Expand/contract sequencing** where the previous build serves traffic against
  the new schema for the length of the deploy window. The failure is real and
  the remedy is tool-specific.

Neither is written into an agent today, and neither should be. They are recorded
here so the first pack starts from evidence rather than from a blank page.

## What was deliberately left behind

| Left behind | Why |
|---|---|
| Repository-specific playbooks | They cite symbols that exist in one repository. They stay there. |
| **Enforcement of any kind** | Removed in 1.0.0. The framework shipped a permissions floor and two hooks that gated tool calls; a six-lens review of the last attempt to extend them found two Critical and ten High defects in one pass. A text parser cannot out-guess a shell, and a plugin that rewrites a developer's permission rules confuses advice with authority. Permissions belong to the repository and its owner. |
| Issue-tracker specifics | Tracker-agnostic and optional. |
| A worktree fan-out for parallel implementation | Deferred in the original design for good reasons that still hold. |
| `permissionMode` on agents | Not supported for plugin-shipped agents. Read-only comes from the tool pool and is asserted in CI. |
