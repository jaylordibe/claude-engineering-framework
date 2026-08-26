# Development guide

How to change, validate and release the framework itself.

## Prerequisites

- Claude Code (development is done against the version in `docs/constraints.md`)
- Node 22 or later — only to run the validators; the plugin has no dependencies
- `jq` — `ef-doctor` reads a repository's settings with it, and
  `ef-install-settings` merges with it
- `shellcheck` — for the shell in `scripts/` and `bin/`

## Loading your working copy

```bash
claude --plugin-dir ./plugins/engineering-framework
```

A `--plugin-dir` plugin takes precedence over the same plugin installed from a
marketplace, so you can test changes without uninstalling.

After editing:

```text
/reload-plugins
```

`SKILL.md` bodies take effect immediately. **Hooks, agents and manifests do
not** — reload, or restart, or you will spend an afternoon debugging a change
that was never loaded.

## Validating

```bash
node tests/validate-plugin.mjs --strict     # structure, contracts, normative anchors
node tests/validate-fixtures.mjs           # the fixture corpus stays disjoint and hostile
node tests/validate-charter.mjs            # the always-on context stays within budget
node tests/run-doctor-fixtures.mjs         # ef-doctor diagnoses 15 repository shapes
node tests/validate-install-settings.mjs   # the settings merge, across 22 repository shapes
claude plugin validate ./plugins/engineering-framework --strict
shellcheck plugins/engineering-framework/scripts/*.sh plugins/engineering-framework/bin/*
```

All of them run in CI. Run them locally before pushing; the whole suite is a
few seconds.

### Why there are so many validators

Each one exists because a mutation proved the others could not see the failure.
That is the standard for adding another: **weaken or delete a guarantee, run
the suite, and if it stays green, the gap is real.** Do not add a check that
cannot fail.

### What `validate-plugin.mjs` actually checks

The official validator checks the manifests. This one checks what fails
*silently*:

- **agent frontmatter against the supported plugin-agent field set** — a
  refused field like `permissionMode` is ignored at load time, so the agent has
  more access than its author believes;
- **read-only judged by the effective tool pool**, never by prose. Probing for
  "never edit files" would pass an agent that has neither the sentence nor the
  restriction — silence reading as compliance;
- **every `${CLAUDE_PLUGIN_ROOT}` reference resolves**, and no path traverses
  outside the plugin root (which works in development and breaks after install);
- **the skill listing budget** — description plus `when_to_use` under 1,536
  characters, or the trigger text is truncated;
- **gates are `disable-model-invocation: true`** and domain playbooks are
  `user-invocable: false`;
- **hook scripts exist, are executable, and are wired to the manifest** — an
  unwired or non-executable script still reads as active, and the charter
  failing to load is silent;
- **the stack-term denylist** (below);
- **the shipped marketplace declaration matches `marketplace.json` and
  `plugin.json`**, and still carries `autoUpdate: true` — a rename or a dropped
  key would point installing repositories at nothing, silently;
- **the installer's source stays inside its boundary** — no write into `$HOME`,
  no reference to Claude Code's internal plugin state, no framework version;
- **no shipped file cites `.claude/engineering-framework.json`**, removed in
  2.0.0; an instruction to read a file no repository has fails silently;
- **the changelog has an entry for the current version.**

## The rule that governs every contribution

> **The framework owns methodology. The repository owns truth.**

Before adding a sentence, ask: *is this true in a repository built on a
completely different stack?*

- **Yes** → it belongs in the framework.
- **No** → it belongs in a consuming repository's `CLAUDE.md`, or in a future
  stack pack.
- **"Yes, but it needs an example"** → write the example as the *question* the
  reader must answer about their own repository.

The denylist enforces the boundary mechanically: any file under `skills/`,
`agents/`, `standards/` or `templates/` naming a specific framework, ORM,
database, queue or tool fails CI. `docs/`, `evals/`, `fixtures/`, `tests/`,
`reference/`, `scripts/` and `bin/` are exempt, because naming real tools there
is correct.

To name a technology as an illustration, put it after `example:` or
`for example,` on the same line. Use that escape hatch sparingly: an example is
the first step towards an assumption.

## Adding a component

### A skill

```text
plugins/engineering-framework/skills/<name>/SKILL.md
```

The frontmatter `name` **must** match the directory name — in a plugin skill it
replaces the last command segment, so a mismatch produces a command nobody
expects.

- A workflow gate: `disable-model-invocation: true`, and a `gate-` prefix.
- A domain playbook: `user-invocable: false`, with a `when_to_use` that
  triggers on **the task**, never on a technology. `"when changing who can
  access which records"`, not `"when touching <library>"`.

Keep `description` + `when_to_use` well under 1,536 characters. Every
model-invoked skill's text is always-on cost in every repository.

### An agent

```text
plugins/engineering-framework/agents/<name>.md
```

Frontmatter name must match the file name. Read-only agents need **both** a
read-only `tools` list and `disallowedTools: Edit, Write, NotebookEdit`. Do not
use `permissionMode` — plugin agents do not support it.

Start the body by pointing at `standards/repository-evidence.md`, then have the
agent **establish its subject from the repository before judging it**. Every
agent that skips that step will eventually describe an architecture that does
not exist.

Reuse the shared output-contract block verbatim, including the paragraph saying
zero findings is a valid result. That paragraph does real work.

### A rule about how much to spend

It goes in `standards/execution-efficiency.md`, which owns investigation depth,
per-launch model choice, fan-out, output size and the escalation triggers. A
skill or agent that needs one of those **cites the section**; it does not
restate it. `validate-plugin.mjs` fails any file that uses the depth-band
vocabulary without the citation, for the reason the whole repository restates
nothing: a paraphrase drifts from its source silently, and this policy touches
every gate and every agent, so per-file copies would become per-file policy
within two releases.

Three things to know before changing anything there.

**Where a call is close, the defaults fail toward spending more, deliberately.**
Standard depth rather than Targeted, `model: inherit` rather than a cheap
default, an uncertain lens launched rather than skipped, a generous turn ceiling
rather than a tight one. That asymmetry is not timidity: underspending is
invisible, because a change misclassified downward produces a *shorter, tidier,
more confident* output than the correct run, which is the exact shape of the
failure this framework exists to prevent.

**Where a call is not close, that rule does not apply.** Read as a general
principle rather than a tie-breaker it becomes a ratchet: every mechanism turns
the same way, there is no low end anywhere, and a typo gets mapped, planned and
panelled. The `Direct` band and the charter's `Below Low there is no tier` are
the exit, and §13 makes a human's own scoping of a small change decisive rather
than a preference. **A framework routed around protects nothing** — that is the
real cost of overspending.

Both of those are one rule with two ends, and a change to this standard that
strengthens one end usually weakens the other. Check which you are doing. The
bound on the exit — authentication, authorization, tenancy, personal data,
money, migrations, public contracts, concurrency — is what makes it safe, and
widening it is not the same kind of edit as clarifying the prose around it.

**A ceiling is not what makes an agent stop; the convergence contract is.**
§8 owns evidence sufficiency, synthesis reservation, continuation and the brief a
delegated agent is given, and it is the answer to an agent that investigates
until it is cut off. Raising or lowering `maxTurns` is not an alternative to it:
a ceiling gives the agent no warning, so an agent can only converge because it
was told what enough evidence means. `validate-plugin.mjs` fails an agent that
declares a ceiling and cites neither file carrying that contract.

**Two levers that look available are not.** Reasoning effort cannot be varied
per launch, and a turn ceiling is a hard stop rather than a budget — see
[C17](constraints.md#c17--reasoning-effort-cannot-be-varied-per-launch) and
[C18](constraints.md#c18--maxturns-is-a-hard-stop-and-therefore-not-a-budget).
Do not work around either in prose. "Use less reasoning here" in an agent body
is a request to the model, not a setting, and writing it would claim a control
the framework does not have — the same failure shape as an inert permission
rule.

### A rule that blocks something

**You cannot add one, and this is the 1.0.0 constraint that most often catches
a contributor out.** The framework ships no permission rules and no hooks that
gate a tool call. Nothing here may write `permissions` or `hooks` into anyone's
settings, and nothing may register a `PreToolUse` hook.

`ef-install-settings` is not a counter-example, and the difference is worth
holding onto: it writes `extraKnownMarketplaces`, `enabledPlugins` and the one
`env` member `CLAUDE_CODE_ENABLE_TODO_TOOLS` into the *project's* settings, when
a human runs the installer, and nothing else. A dependency declaration is not an
enforcement mechanism. The test that let the third one in is that it **grants
nothing and denies nothing**; a fourth that fails that test, or any write to a
global file, is the change this section exists to stop, and
`tests/validate-install-settings.mjs` fails before the review does.

If a change genuinely needs an operation stopped rather than reserved, the
options in order of preference are:

1. **State it in the charter** as a human-owned operation, if it belongs to
   every repository. That is `scripts/session-charter.sh`, and it is paid for on
   every request in every repository, so the bar is high.
2. **Give a gate the check**, if it belongs to a stage. `gate-review` and
   `gate-validate` already stop on what they find.
3. **Tell the repository owner which rule to add** to their own settings, in
   `ef-doctor` or a skill. Naming a rule is help; writing one is not ours to do.

The history is in `CHANGELOG.md` under 1.0.0: the enforcement layer was a third
of the plugin and half its test burden, and a six-lens review of the last
attempt to extend it found two Critical and ten High defects in one pass. The
conclusion was not "parse more carefully" but "a text parser cannot out-guess a
shell, and a plugin should not rewrite the user's rules."

### A constraint discovered in Claude Code

Add it to `docs/constraints.md` **with its citation and the date**, and add the
corresponding check to `validate-plugin.mjs`. A constraint recorded but not
enforced is a comment, not a guardrail.

## Testing behaviour

Static validation proves the plugin is well formed. It cannot prove the agents
behave. For that:

```bash
claude plugin eval ./plugins/engineering-framework
```

`plugin eval` is in early access; until it is available, `evals/README.md`
describes running each case by hand against the fixture repositories.

**The ablation arm is the real result.** A case the model passes just as well
with the plugin disabled proves nothing about the plugin, however green it
looks.

When changing an agent, run its case against `fixtures/vue-app` or
`fixtures/minimal-repository` — the two where a carried-over assumption is
provably wrong — and against `fixtures/laravel-api`, where an assumption
carried over from the *other* API fixture produces a map that reads perfectly
and is wrong in every specific.

A fixture is not just a directory to add. `tests/validate-fixtures.mjs` requires
each one to be described in `fixtures/README.md`, named by at least one eval
case, and to carry a stack signature declaring what it must and must not
contain. The "must not" half is what keeps the graders meaningful.

## Releasing

1. Decide the bump from [versioning](versioning.md). Ask what a consuming
   repository has to *do*, not how many files changed.
2. Update `version` in `plugins/engineering-framework/.claude-plugin/plugin.json`.
3. Add a `CHANGELOG.md` entry grouped by workflow impact. A MAJOR bump ships an
   upgrade note saying exactly what consuming repositories must do.
4. Run every validator.
5. Merge to `main`. Because `framework-install` writes `"autoUpdate": true`,
   installed machines pick it up in the background after their next session
   starts — **not** when someone chooses to update. It reaches them only because
   the version changed, and there is no staging population in between.
6. Tag the release:

   ```bash
   claude plugin tag ./plugins/engineering-framework
   ```

   This creates `engineering-framework--v<version>` and validates that
   `plugin.json` and the marketplace entry agree before it does. Tagging is a
   human-owned operation; prepare it, then run it yourself.

There is no build step and no publish step. The marketplace serves the
repository directly.

**Why the tag matters even though nothing consumes it.** The marketplace serves
`main`, so a tag delivers nothing and installs nothing. What it buys is the
ability to answer "what exactly does a consumer have?" after the fact. A
consumer records only a version string; without a tag there is no commit that
string resolves to, so a bug report naming a version cannot be reproduced or
diffed against the next one. Releases made before this step existed are
untagged — backfill them from `CHANGELOG.md` dates if that question is ever
asked.

## Repository layout

```text
.claude-plugin/marketplace.json      the catalogue
plugins/engineering-framework/       the plugin
docs/                                these documents
evals/                               behavioural cases and grader rubrics
fixtures/                            eleven tiny repositories: six shapes, five situations
tests/                               validators, decision tables, robustness and doctor suites
.github/workflows/ci.yml             everything above, on every push
```

## Things to be careful about

**Do not add an always-on sentence casually.** The session charter is the
framework's entire always-on budget in every repository a user opens. Adding to
it is a real cost paid by everyone on every request; the first question for any
new rule is which skill it belongs in instead.

**Do not make a gate stop where it used to continue without a version bump.**
No hook gates a tool call any more, so the only thing left that can refuse a
team's normal workflow is a gate, and the version number is how that news
travels. See [versioning](versioning.md).

**Do not describe anything the framework ships as a sandbox.** Nothing here is
one and nothing here can become one. The two `PreToolUse` guards that used to
invite the word are gone; what remains is a `SessionStart` hook that emits text.
The documentation says so in several places on purpose.

**Do not let the quality floor become negotiable.** `standards/execution-efficiency.md`
§1 is the one part of that file that is not a cost control, and every line
around it looks like one. A change that makes an efficiency saving conditional
on nothing, or that adds a way for an instruction to lower a tier, is the
failure the whole standard exists to prevent — and it will read as a
simplification.

**Do not add an abstraction for a second case that does not exist.** That
includes stack packs. The first one should be extracted from a second real
repository that needs it, not designed in advance from one.
