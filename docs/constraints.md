# Claude Code constraints that shaped this design

Every entry is a real limit of Claude Code, verified against the official
documentation and the CLI on the date shown. They are recorded here because
several of them contradict the obvious design, and a future contributor who
does not know about them will "fix" something that is not broken.

**Verified against:** Claude Code **v2.1.226**, documentation at
`code.claude.com/docs/en/`, on **2026-08-11**.

**C16–C18 verified against:** Claude Code **v2.1.233**, the same documentation,
on **2026-08-15**. Only those three entries were re-checked on that date; the
rest still carry the 2026-08-11 verification above.

**C19–C20 verified against:** the same documentation on **2026-08-16**, plus the
on-disk plugin state of an installed machine. C20 is *measured*: the documented
sentences alone do not settle where a project-scoped `autoUpdate` ends up, and
the answer shaped how loudly the installer writes it.

Where an entry says *measured*, the behaviour was reproduced against the CLI
rather than read from the documentation. C15 is there because the two
disagreed, and believing the documentation broke installation.

When one of these changes, update this file *and* the corresponding check in
`tests/validate-plugin.mjs`. A constraint recorded here but not enforced there
is a comment, not a guardrail.

---

## C1 — A plugin cannot ship permission rules

> Plugins can include a `settings.json` file at the plugin root [...].
> Currently, only the `agent` and `subagentStatusLine` keys are supported.
> — *Create plugins*

**Consequence.** A declarative `permissions.deny` floor — the only layer that
cannot fail open — is not distributable by a plugin.

**What we did until 1.0.0.** Shipped `reference/permissions-floor.json` for
`framework-install` to merge into the consuming repository's own settings, plus
two `PreToolUse` hooks to cover the command forms a prefix rule cannot see.

**What we do now: nothing.** The framework ships no permission rules and no
hooks that gate a tool call. The constraint above is one reason — a merged copy
can never be un-merged, so a rule the floor withdrew stayed in every repository
that had it. The larger reason is that the workaround was worse than the
limitation: a six-lens review of the last attempt to extend the guards found two
Critical and ten High defects in one pass, and shipping `defaultMode` into a
consuming repository silently overrode the permission mode its developers had
chosen, because a project settings file outranks the user's own.

Permissions belong to the repository and its owner. This constraint is no longer
something to route around.

---

## C2 — Plugin agents cannot declare `permissionMode`, `hooks` or `mcpServers`

> For security reasons, `hooks`, `mcpServers`, and `permissionMode` are not
> supported for plugin-shipped agents. — *Plugins reference*

**Consequence.** Read-only cannot be declared with `permissionMode: plan`. It
must come from the effective tool pool: a read-only `tools` list *and*
`disallowedTools: Edit, Write, NotebookEdit`.

**Enforced by.** `validate-plugin.mjs` fails on any refused field, and judges
read-only by the tool pool rather than by prose. Probing for a sentence like
"never edit files" would pass any agent that has neither the sentence nor the
restriction — silence reading as compliance.

---

## C3 — A plugin's `CLAUDE.md` is not loaded

> A `CLAUDE.md` file at the plugin root is not loaded as project context.
> Plugins contribute context through skills, agents, and hooks. — *Plugins reference*

**Consequence.** Always-on framework instructions cannot ship as a file.

**What we do instead.** A `SessionStart` hook emits the charter as
`additionalContext`. It is capped at roughly sixty lines, because it is the
framework's entire always-on budget in every repository the user opens.

Rejected: setting the plugin `settings.json` `agent` key to replace the main
thread's system prompt. It would work, and it would repossess the user's
assistant in every repository. An engineering framework should govern how work
is done, not what Claude is.

---

## C4 — Installed plugins cannot reference files outside their directory

> Paths that traverse outside the plugin root (such as `../shared-utils`) will
> not work after installation because those external files are not copied to
> the cache. — *Plugins reference*

**Consequence.** Every intra-plugin reference must be rooted at
`${CLAUDE_PLUGIN_ROOT}`. A relative path that works in development breaks
silently after installation.

**Enforced by.** `validate-plugin.mjs` resolves every `${CLAUDE_PLUGIN_ROOT}`
reference in every Markdown file and rejects any `../` traversal.

---

## C5 — Plugin skills are namespaced, and the bare name still resolves

> In a plugin skill, the frontmatter `name` replaces the directory name in the
> last segment of the command [...]. The bare `/fancy` also invokes the skill
> unless another command already uses that name. — *Skills*

**Consequence.** `/engineering-framework:gate-design` is unambiguous, so the
`gate-` prefix is no longer load-bearing against built-in collisions the way it
was in a project-local `.claude/`. It is kept anyway: the bare form still
resolves, so the prefix protects that path, and typing `/gate` groups the five
gates together in the menu.

**Enforced by.** `validate-plugin.mjs` requires the frontmatter `name` to match
the directory name. The two disagreeing produces a command nobody expects.

---

## C6 — `claude plugin eval` exists, and is in early access

The CLI ships `claude plugin eval`, which runs `evals/**/case.yaml` or
`evals/**/prompt.md` with `graders/*.md`, supports a no-plugin **ablation**
baseline, and reports a score delta.

**Consequence.** Behavioural testing has a real harness, better than a
hand-rolled fixture runner. The ablation arm is the part that matters: it
distinguishes guidance from decoration.

**Status on 2026-08-11.** The subcommand reports "`plugin eval` is currently in
early access" and does not run on an account without it. `evals/` therefore
uses the `prompt.md` + `graders/*.md` layout, which is documented and needs no
schema we cannot verify, and every case is written to be runnable by hand.

---

## C7 — Version resolution decides when users get updates

> The version is resolved from the first of these that is set: the `version`
> field in `plugin.json`; the `version` field in the marketplace entry; the git
> commit SHA [...]. — *Plugins reference*

**Consequence.** With an explicit `version`, users update only when it is
bumped. Without one, they update on every commit.

**Choice.** Explicit semantic versioning. A framework that changes how a team
works should change on a release, not on a push. See
[versioning](versioning.md).

---

## C8 — Marketplace names are global, reserved-checked, and effectively permanent

> Each user can register only one marketplace per name: adding a second
> marketplace with the same name replaces the first. — *Plugin marketplaces*

Reserved names are re-checked **every time a marketplace loads**, not only when
it is added, and names that impersonate official ones are blocked by pattern.
There is a `renames` map for plugin renames; there is none for marketplace
names.

**Consequence.** The marketplace name is a one-way decision, and any
`claude-*` or `anthropic-*` name carries a small but real risk of being caught
by a future sweep — which would stop the marketplace loading for every user.

**Choice.** `jaylordibe`. It matches the repository owner, never goes stale as
the catalogue grows, and sits nowhere near the reserved space.

**Enforced by.** `validate-plugin.mjs` fails on a reserved name and warns on an
official-sounding prefix.

---

## C9 — Only `Read` and `Edit` file permission rules are consulted

> Claude Code checks file permissions against `Edit()` and `Read()` only.

**Consequence.** A `Write(...)`, `Glob(...)`, `MultiEdit(...)` or
`NotebookEdit(...)` path rule is accepted, never enforced, and warns at
startup. This is the worst failure shape available: the path reads as protected
in the settings file while being fully writable.

**No longer enforced here.** The framework wrote no path rules from 1.0.0, so
there is nothing of ours to check. Kept because it is the highest-value thing to
say to a repository owner writing their own rules, and because it is exactly the
shape of mistake that reads as protection.

---

## C10 — `${CLAUDE_PLUGIN_ROOT}` changes on every update

> `${CLAUDE_PLUGIN_ROOT}` changes when the plugin updates [...] treat it as
> ephemeral and don't write state there. — *Plugins reference*

**Consequence.** Nothing in the plugin directory may be written to at runtime.
The framework writes no state at all, which sidesteps this entirely and is one
reason it does not use `${CLAUDE_PLUGIN_DATA}`.

Also: when a plugin updates mid-session, hooks keep using the previous
version's path until `/reload-plugins`.

---

## C11 — A `Read` deny covers `Edit`, but never `Write` or `NotebookEdit`

> A `Read` deny rule also blocks the Edit tool on the same path, including
> creating a new file there. Write and NotebookEdit aren't covered, so add an
> `Edit` deny rule for paths no tool may change. Requires Claude Code v2.1.208
> or later. — *Configure permissions*

**Consequence.** A `Read(**/*.p12)` rule alone leaves the file writable, and on
any version before 2.1.208 editable too. The floor this framework used to ship
had four such paths — `*.p12`, `*.pfx`, `.netrc`, `.npmrc` — with a `Read` rule
and no `Edit` rule, so they read as protected while a tool could still write
them.

**No longer enforced here**, for the reason in C9: the framework writes no
rules. Pair every `Read` deny with an `Edit` deny in your own settings — an
`Edit` rule covers all file-editing tools, which is what makes it the one to
write.

---

## C12 — `additionalContext` is capped, and its framing matters

> Capped at 10,000 characters; longer content is saved to a file. — *Hooks*

> Write the text as factual statements rather than imperative system
> instructions. [...] Text framed as out-of-band system commands can trigger
> Claude's prompt-injection defenses, which causes Claude to surface the text to
> you instead of treating it as context. — *Hooks*

**Consequence.** Two separate limits on the SessionStart charter. Exceed the
character cap and the charter silently stops being always-on context; write it
as a wall of imperatives and it may be shown to the user as suspicious text
rather than used — which is strictly worse than not shipping it.

**Enforced by.** `tests/validate-charter.mjs` renders the hook and asserts the
character cap, a tighter line ceiling, that every guarantee is still stated,
and that imperative openers stay a minority of lines.

---

## C13 — Only exit code 2 blocks; every other failure fails open

> For most hook events, only exit code 2 blocks the action. Claude Code treats
> exit code 1 as a non-blocking error and proceeds with the action. — *Hooks*

**Consequence.** A `PreToolUse` guard that crashes does **not** fail safe. This
was demonstrated twice here: both guards once ran `jq` inside a command
substitution under `set -e`, so a payload that was not valid JSON exited 5 and
the tool call proceeded — while both file headers promised FAIL CLOSED. The
second time was during the 1.0.0 review cycle, when a new classifier returned
non-zero outside a condition context and the whole hook exited 1.

It is recorded because it generalises past the guards that are now gone: **a
hook is a safety layer that can be defeated by an apostrophe.** A framework
whose guarantees rest on one is making a promise it cannot keep, which is a
large part of why 1.0.0 stopped making that kind of promise.

**Still applies to.** `scripts/session-charter.sh`, the only hook the plugin
registers. It runs on `SessionStart`, so a crash costs the charter rather than a
safety decision — but it must still not crash, because a session without the
charter is a session with no methodology and no sign that anything is wrong.

---

## C15 — `metadata.pluginRoot` is documented but inert

> `metadata.pluginRoot` | string | Base directory prepended to relative plugin
> source paths (for example, `"./plugins"` lets you write `"source": "formatter"`
> instead of `"source": "./plugins/formatter"`) — *Plugin marketplaces*

> Relative path [...] Must start with `./`. Resolved relative to the marketplace
> root, not the `.claude-plugin/` directory — *Plugin marketplaces*

Those two rows contradict each other, and the second one is the one that runs.
Measured against v2.1.226 by building a marketplace for each form and running
`claude plugin install`:

| `metadata.pluginRoot` | `source` | Result |
|---|---|---|
| `"./plugins"` | `"engineering-framework"` | **Refused** — `source: Invalid input` |
| `"./plugins"` | `"./engineering-framework"` | **Installs nothing** — resolves to `<root>/engineering-framework`; `pluginRoot` ignored |
| `"./plugins"` | `"./plugins/engineering-framework"` | Installs; `pluginRoot` ignored |
| *absent* | `"./plugins/engineering-framework"` | Installs |

**Consequence.** `pluginRoot` cannot do the one thing it is documented to do: a
bare source is rejected by the schema before any prefix could be applied, and a
`./` source is resolved against the marketplace root regardless. The key is
inert in every combination.

It is worse than merely useless. Its presence is an invitation to write the
short source it claims to support — which is exactly how this repository shipped
a marketplace that passed both validators and could not install: the manifest
said `pluginRoot: "./plugins"` with `source: "./engineering-framework"`, and the
installer looked for `<root>/engineering-framework`.

**Enforced by.** `validate-plugin.mjs` rejects `metadata.pluginRoot` outright,
resolves every relative source against the marketplace root with no prefix, and
requires the resolved directory to contain a `.claude-plugin/plugin.json` whose
`name` matches the catalogue entry.

**If this is ever fixed upstream**, the enforcement is still correct: writing
the full path in each `source` works under both behaviours, and is what the
documentation's own relative-path example does.

---

## C16 — A subagent's model is selectable per launch, and is not knowable afterwards

> When Claude invokes a subagent, it can also pass a `model` parameter for that
> specific invocation. Claude Code resolves the subagent's model in this order:
> 1. The `CLAUDE_CODE_SUBAGENT_MODEL` environment variable [...]
> 2. The per-invocation `model` parameter
> 3. The subagent definition's `model` frontmatter
> 4. The main conversation's model — *Subagents*

> Claude Code checks the environment variable, per-invocation parameter, and
> frontmatter values against your organization's `availableModels` allowlist.
> For a blocked value, it substitutes another model. — *Subagents*

**Consequence, in both directions.**

The useful half: a launching stage *can* choose a model per agent launch, so the
framework's model policy is expressible where it belongs — at the launch site,
where the risk tier is finally known — rather than frozen into a definition
written before the change existed. This is what makes
`standards/execution-efficiency.md` §6 implementable rather than aspirational.

The half that constrains the design: **two layers outrank the framework
entirely.** An environment variable set by the user or their organisation wins
over every launch parameter, and an allowlist can substitute a different model
for the one requested — silently on non-interactive runs. So the plugin cannot
know which model actually ran.

**What we do about it.** Agent definitions keep `model: inherit`, which fails
toward capability rather than toward cheapness, and no quality guarantee is
stated in terms of which model ran. Guarantees rest on evidence, gates and
independent readers, all of which hold whatever resolved. A framework that
promised "the security lens runs on a strong model" would be making a promise
two other parties can quietly break.

---

## C17 — Reasoning effort cannot be varied per launch

`effort` is a documented frontmatter field for both subagents and skills —
`low`, `medium`, `high`, `xhigh`, `max`, overriding the session level and
otherwise inheriting from it. The documented per-invocation parameter list for a
subagent launch is `model` **only**; no equivalent exists for effort.

**Consequence.** Effort is static per component. The obvious design — *Low risk
gets medium effort, Critical gets maximum* — is not expressible, because a
definition is written once and the tier is not known until the change has been
mapped. Splitting each agent into per-tier duplicates would express it, at the
cost of doubling the surface every lens is maintained on, to buy an effort step
on the lens that only runs when its concern is already engaged.

**What we do instead.** Every reasoning-bearing component stays at `effort:
high`, and the savings are taken where they *are* expressible: which agents run
at all, how much of the repository they investigate, and how much they write.
Stated in `standards/execution-efficiency.md` §7 so that nobody re-derives the
missing feature and works around it in prose.

Prose cannot substitute. "Use less reasoning for this" in an agent body is a
request to the model, not a setting, and a framework that wrote it would be
claiming a control it does not have — the same failure shape as an inert
permission rule.

---

## C18 — `maxTurns` is a hard stop, and therefore not a budget

> `maxTurns` | No | Maximum number of agentic turns before the subagent stops
> — *Subagents*

It stops the subagent. It does not warn it, negotiate with it, or give it a turn
to write up what it has.

**Consequence.** Lowering a ceiling to save tokens saves nothing on any run that
was already finishing early — an agent that needs eight turns costs eight turns
whatever the ceiling says — and truncates the only runs it does affect: the
longest, deepest, highest-risk investigations. That is the worst available place
to economise, and the resulting output is a partial map that looks like a
complete one.

**What we do about it.** Ceilings are treated as runaway backstops rather than
budgets, and `validate-plugin.mjs` asserts every agent declares one while
deliberately asserting nothing about its value. The mitigations that matter are
behavioural: `context-mapper` reserves room to report, and returns an explicitly
`Incomplete` map naming what it could not establish, which the conductor treats
as a stop condition rather than a caveat.

Changing a ceiling downward is a measurement question, not a taste question. The
repository has no transcript corpus to measure against, and guessing at it is
how this project previously got a number wrong by more than an order of
magnitude.

---

## C19 — Committed settings register a marketplace but never install the plugin

> Once a team member trusts the repository folder, Claude Code adds these
> marketplaces without a further prompt. — *Discover and install plugins*

> As of Claude Code v2.1.195, adding the marketplace doesn't install plugins that
> come from an external source, on any path that loads plugins. A plugin that
> only the project's `.claude/settings.json` enables, and that comes from an
> external source such as a GitHub repository or npm package, doesn't load until
> the team member installs it. — *Discover and install plugins*

**Consequence.** A repository that commits `extraKnownMarketplaces` and
`enabledPlugins` takes its team's setup from **two commands to one, not to
zero.** The marketplace registers itself after folder trust; the install is
still per-developer, and Claude Code reports the plugin as not installed until
they run it.

This documentation said otherwise in four places — that a colleague "gets the
plugin without typing anything", and a command-reference row marking the install
"required *unless* the repository pins `enabledPlugins`". Wrong in the direction
that matters: a maintainer commits the block, tells the team onboarding is
automatic, and every one of them hits a plugin that silently is not there.

**Not mechanically checkable.** Nothing in this repository can observe another
person's install, so `validate-plugin.mjs` gets no counterpart check here. It is
recorded because it is the single most likely thing for this project to
over-claim: the block *looks* like zero-setup onboarding, and the half that works
is the half you can see on your own machine.

**Related, and the reason the confusion arose:** auto-update defaults differ by
marketplace. Anthropic's official marketplace is registered automatically on
first interactive start and has auto-update **on** by default; third-party and
local marketplaces default to **off**. A plugin from the official marketplace
therefore appears to need no configuration and to keep itself current, while an
identical third-party plugin needs both the marketplace entry and an explicit
`autoUpdate`. Nothing about the plugins differs — only the defaults.

**Confirmed by the same page:** with `autoUpdate` on, Claude Code "refreshes the
marketplace data **and updates installed plugins to their latest versions on
disk**", after session start with a delay of up to ten minutes, taking effect on
the next launch or after `/reload-plugins`. So [versioning](versioning.md)'s
claim that an auto-updating consumer receives a release without typing an update
command is correct as written.

---

## C20 — `autoUpdate` is written per project and takes effect per user — *measured*

> Marketplace state is stored once per user in
> `~/.claude/plugins/known_marketplaces.json`, **not per project**.
> — *Create and distribute a plugin marketplace*

> `autoUpdate` — Whether to automatically update this marketplace on Claude Code
> startup. **Written automatically by Claude Code when you toggle auto-update
> for a marketplace.** — *settings schema*

> **Administrators** can also set `"autoUpdate": true` on each
> `extraKnownMarketplaces` entry **in managed settings** to enable auto-update
> for an organization marketplace without requiring each user to toggle it.
> — *Discover and install plugins*

**Measured on 2026-08-16**, on a machine whose only declaration of `autoUpdate`
was in *this repository's committed project settings*:

```text
.claude/settings.json          (project) →  "autoUpdate": true
~/.claude/settings.json        (user)    →  entry present, no autoUpdate
~/.claude/plugins/known_marketplaces.json →  "autoUpdate": true   ← effective
```

**Two consequences, and they pull in opposite directions.**

**It works.** A committed project entry does reach the state Claude Code acts
on. So a repository *can* give its team auto-update without each person toggling
it, which is the only lever a repository has: the documented alternatives are a
per-machine toggle in `/plugin` and an administrator setting it in *managed*
settings, and neither is available to a public marketplace distributing to
strangers.

**And it does not stay in the project.** The value lands in per-user machine
state the documentation says is explicitly *not per project*, so it outlives the
session and is not scoped to the repository that set it. Note also which two
actors the documentation sanctions — Claude Code writing the key when a user
toggles it, and an administrator in managed settings. A project file setting it
for other developers is nowhere *described*, even though it demonstrably works.

**How the design resolves it.** `ef-install-settings` writes
`"autoUpdate": true` on a new entry, deliberately, because of what 2.0.0
removed: a consuming repository records **no framework version**, so nothing in
it ever asks to be updated. Without the key a team installs once and stays on
that version until someone deliberately updates the plugin — always possible,
but never prompted — and this framework's failures are the silent kind, so
neither side can tell how far behind the installed copy is. Weighed against a
preference that leaks one marketplace's update behaviour onto a machine, the
silent-staleness risk is the larger one.

What keeps it honest: `--no-auto-update` opts out; an entry that already states
`autoUpdate` either way is never rewritten, because that is somebody's decision;
and the installer *reports* what it set and what that commits the team to, on
every run, rather than writing it quietly. The cost is recorded in
[versioning](versioning.md): the version bump is then the only brake.

**Mechanically checked**, in two places: `validate-plugin.mjs` fails if the
shipped declaration loses the key or carries a non-boolean, and
`validate-install-settings.mjs` fails if a fresh install omits it, if
`--no-auto-update` writes it anyway, or if an existing `false` is flipped.

---

## Things we checked and chose not to use

| Feature | Why not |
|---|---|
| Bundled MCP server | Nothing the framework does needs a tool the model does not already have. |
| LSP server | Language-specific by definition; belongs in a stack pack, if anywhere. |
| Background monitors | Do not load for project-scope plugins, and the framework has nothing to watch. |
| `userConfig` prompts at enable time | Policy belongs in a reviewable file in the repository, not in per-user answers invisible to the team. |
| `${CLAUDE_PLUGIN_DATA}` | The framework has no state and no dependencies to install. |
| `defaultEnabled: false` | The framework is inert until a gate is invoked; there is nothing to opt into. |
| `color` on agents | **Is** documented (this entry previously said it was not — corrected 2026-08-15). Still omitted: it tints the agent's row in the task list, which is decoration, and eight lenses do not need telling apart by colour. `validate-plugin.mjs` accepts it, so adding one is a choice rather than a fight with CI. |
| `hooks` on skills | Documented and functional — a skill-registered hook keeps running for the rest of the session. Refused here by `validate-plugin.mjs`, because registering a hook that gates a tool call is the thing 1.0.0 removed, and a skill is the one door the agent-level refusal did not cover. |
