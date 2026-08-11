# Development guide

How to change, validate and release the framework itself.

## Prerequisites

- Claude Code (development is done against the version in `docs/constraints.md`)
- Node 22 or later — only to run the validators; the plugin has no dependencies
- `jq` — the guard hooks require it
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
node tests/run-hook-fixtures.mjs           # both guards, under five policy profiles
node tests/guard-robustness.mjs            # neither guard can be made to fail open
node tests/run-doctor-fixtures.mjs         # ef-doctor diagnoses 18 repository shapes
claude plugin validate ./plugins/engineering-framework --strict
shellcheck plugins/engineering-framework/scripts/*.sh
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
  unwired or non-executable script still reads as an active guard;
- **the permissions floor** mirrors Bash to PowerShell and contains no inert
  file rules;
- **the stack-term denylist** (below);
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

### A hook rule

1. Add the rule to `scripts/guard-dangerous-commands.sh` (commands) or
   `scripts/guard-protected-paths.sh` (paths).
2. **Add fixtures to the matching decision table in the same commit** —
   `tests/guard-hook-fixtures.tsv` or `tests/guard-path-fixtures.tsv` — at
   least one asserting the new decision, and at least one asserting a
   neighbouring legitimate command or path is still allowed.
3. Run `node tests/run-hook-fixtures.mjs`, which drives both tables.
4. Decide whether it should be policy-governed. A rule that a reasonable
   repository would want off needs a switch in `reference/repo-config.schema.json`.

The "still allowed" fixture is not optional. Roughly half the table exists to
prove ordinary commands are never prompted, because a guard that nags gets
switched off within a day.

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
5. Merge to `main`. Users receive it on their next `/plugin update` — and only
   because the version changed.

There is no build step and no publish step. The marketplace serves the
repository directly.

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

**Do not make the hooks stricter without a version bump.** See
[versioning](versioning.md).

**Do not describe either guard as a sandbox.** It is not one, cannot become
one, and the documentation says so in several places on purpose.

**Do not add an abstraction for a second case that does not exist.** That
includes stack packs. The first one should be extracted from a second real
repository that needs it, not designed in advance from one.
