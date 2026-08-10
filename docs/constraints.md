# Claude Code constraints that shaped this design

Every entry is a real limit of Claude Code, verified against the official
documentation and the CLI on the date shown. They are recorded here because
several of them contradict the obvious design, and a future contributor who
does not know about them will "fix" something that is not broken.

**Verified against:** Claude Code **v2.1.226**, documentation at
`code.claude.com/docs/en/`, on **2026-08-11**.

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
