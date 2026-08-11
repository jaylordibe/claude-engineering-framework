# Claude Code constraints that shaped this design

Every entry is a real limit of Claude Code, verified against the official
documentation and the CLI on the date shown. They are recorded here because
several of them contradict the obvious design, and a future contributor who
does not know about them will "fix" something that is not broken.

**Verified against:** Claude Code **v2.1.226**, documentation at
`code.claude.com/docs/en/`, on **2026-08-11**.

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

**Consequence.** The declarative `permissions.deny` floor — the only layer that
cannot fail open — is not distributable. This is the single largest constraint
on the framework's guarantees.

**What we do instead.** Ship `reference/permissions-floor.json`, install it
with `framework-install`, audit it with `framework-doctor`, and warn once per
session when it is absent. The command guard hook covers the same operations
and more forms, but a hook is executable code and Claude Code treats a crashed
hook as a non-blocking error — it can fail open. Both layers, and honest
documentation about which is which.

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

**Enforced by.** `validate-plugin.mjs` rejects inert forms in the reference
floor; `ef-doctor` reports them in a consuming repository.

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
any version before 2.1.208 editable too. The reference floor had four such
paths — `*.p12`, `*.pfx`, `.netrc`, `.npmrc` — with a `Read` rule and no `Edit`
rule, so they read as protected while a tool could still write them.

**What we do instead.** Every `Read` deny in the floor has a matching `Edit`
deny. An `Edit` rule covers all file-editing tools, which is what makes it the
one to write.

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

**Consequence.** A `PreToolUse` guard that crashes does **not** fail safe. Both
guards ran `jq` inside a command substitution under `set -e`, so a payload that
was not valid JSON exited 5 and the tool call proceeded — while both file
headers promised FAIL CLOSED.

`PreToolUse` also now accepts a fourth `permissionDecision`, `defer`, which is
what emitting nothing already meant. The guards continue to emit nothing rather
than `defer`: silence is the documented default and needs no jq process.

**Enforced by.** `tests/guard-robustness.mjs` asserts that every malformed,
empty, oversized and hostile payload produces exit 0 and either a valid decision
or deliberate silence.

---

## C14 — Claude Code prompts for some forms the guard does not model

> Exec wrappers such as `watch`, `setsid`, `ionice`, and `flock` always prompt
> and can't be auto-approved by a prefix rule [...] The same applies to `find`
> with `-exec` or `-delete`. — *Configure permissions*

> Development environment runners such as `direnv exec`, `devbox run`,
> `mise exec`, `npx`, and `docker exec` are not in the list. — *Configure permissions*

**Consequence.** The division of labour between the two layers is not a matter
of taste. Claude Code forces a prompt for `find -exec` and the exec wrappers, so
the guard does not need to model them. It does **not** strip environment
runners, which is precisely the gap the command guard exists to close.

Recorded here because a future contributor looking at `find . -exec rm -rf {} \;`
returning no decision from the guard will reasonably think it is a bypass. It is
not: it prompts anyway, one layer up.

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

## Things we checked and chose not to use

| Feature | Why not |
|---|---|
| Bundled MCP server | Nothing the framework does needs a tool the model does not already have. |
| LSP server | Language-specific by definition; belongs in a stack pack, if anywhere. |
| Background monitors | Do not load for project-scope plugins, and the framework has nothing to watch. |
| `userConfig` prompts at enable time | Policy belongs in a reviewable file in the repository, not in per-user answers invisible to the team. |
| `${CLAUDE_PLUGIN_DATA}` | The framework has no state and no dependencies to install. |
| `defaultEnabled: false` | The framework is inert until a gate is invoked; there is nothing to opt into. |
| `color` on agents | Not in the documented plugin-agent field list; omitted rather than risk a validator warning for decoration. |
