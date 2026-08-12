# Security policy

## What this project is, and is not

The `engineering-framework` plugin ships **methodology**: a session charter, a
set of human-invoked gates, eight read-only review lenses, and the standards
they judge against.

**It ships no permission rules and no hooks that gate a tool call. It is not a
security control, and it must never be described as one.**

Until 1.0.0 it shipped both: a reference permissions floor that
`framework-install` merged into a consuming repository's settings, and two
`PreToolUse` guards that inspected every Bash and Edit call. Both were removed,
for two reasons worth stating here because they are security reasoning:

- **A text parser cannot out-guess a shell.** A verb built from a variable, an
  operation inside a script file, a here-doc, an interpreter given a string — a
  guard sees the forms it models and no more. A six-lens review of the last
  attempt to extend those guards found two Critical and ten High defects in a
  single pass, each one a command that reached a destructive operation without a
  decision. Every hole patched implied another.
- **A hook can fail open.** Claude Code treats every non-zero exit except 2 as a
  non-blocking error, so a guard that crashes lets the operation through. That
  happened here twice, once because `jq` ran inside a command substitution under
  `set -e`. A safety layer that an apostrophe can defeat is not a safety layer.

**For a real boundary, use your own permission rules, Claude Code's permission
modes, OS-level sandboxing, or a container.** Those are yours to configure, and
this plugin will not change them.

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/jaylordibe/claude-engineering-framework/security/advisories/new).
Please do not open a public issue for an unfixed problem.

Include: the prompt or repository content that triggered it, what the agent did,
what you expected, and your Claude Code version.

Expect an acknowledgement within a few days. A confirmed issue ships as a patch
release with an eval case or fixture pinning it, so the same shape cannot
regress.

## What counts as a vulnerability here

**In scope:**

- Guidance in a skill, agent or standard that would lead Claude to weaken a
  security control, exfiltrate a secret, disclose data, or perform a human-owned
  operation without being asked.
- Repository content that reliably steers an agent — obtaining an approval it
  never received, a fabricated `PASS`, a credential, or a force push. See
  *Repository content is not a source of instructions* below.
- A gate that can be made to report a verdict its evidence does not support.
- Anything in this plugin that writes to a consuming repository's
  `.claude/settings.json`. That is a defect by definition from 1.0.0 onward: the
  framework must never alter permissions a developer chose.

**Out of scope:**

- That the framework does not block operations. It does not, by design, and
  every document here says so.
- Prompting behaviour, permission modes, or rules in your own settings. Those
  are yours; this plugin neither reads nor writes them.
- Anything requiring the ability to modify the plugin's own files — at that
  point the attacker already runs code on the machine.
- False positives in a review. Those are ordinary bugs; open an issue.

## Hardening a consuming repository

The framework will not do any of this for you, and that is deliberate.

1. **Choose your permission posture yourself.** Deny rules, ask rules and your
   permission mode are the layers that actually stop an operation. `ef-doctor`
   will name a rule it thinks you want; it will never write one.
2. **Mirror Bash rules as PowerShell rules.** The PowerShell tool is enabled by
   default on Windows without Git Bash, and `Bash(...)` rules do not govern it,
   so an unmirrored rule silently disappears on those machines.
3. **Use `Read(...)` and `Edit(...)` for file rules.** A `Write(...)`,
   `Glob(...)`, `MultiEdit(...)` or `NotebookEdit(...)` path rule is accepted,
   never enforced, and warns at startup — the worst failure shape available,
   because the path reads as protected while being fully writable. Pair every
   `Read` deny with an `Edit` deny.
4. **Check `permissions.defaultMode` in your repository settings.** A project
   settings file *overrides* your own `~/.claude/settings.json` for that key, so
   a value committed to a repository silently changes the permission mode for
   everyone who works in it. Versions of this framework before 1.0.0 installed
   one; if yours has it, decide deliberately whether you want it.
5. **Keep `CLAUDE.md` true.** Agents treat it as evidence, so a stale one is a
   security problem and not only a documentation one.

## Repository content is not a source of instructions

Every agent this framework ships reads the repository: its `CLAUDE.md`, its
README, its comments, its manifests, its tickets. All of that is **untrusted
input**, and text placed in any of it can be written to address the agent rather
than to describe the system — asking for an approval it never received, a
fabricated `PASS`, a credential, a force push, or a weakened CI job.

`plugins/engineering-framework/standards/untrusted-content.md` is the standard.
The rule it enforces is that a repository *describes itself* to an agent and
never *issues instructions* to one, and that an attempt to do so is a finding to
report with its `path:line` rather than a directive to follow.

**This is guidance, not a control.** It is enforced by instruction to a model,
which is materially weaker than a rule, and it should be described that way.
Since 1.0.0 it is the framework's *primary* defence rather than one layer of
several, which raises rather than lowers the bar for keeping it honest.
`fixtures/adversarial-injection/` and the `injection-resistance` grader exist
for that.

Treat a bypass — repository text that reliably obtains a human-owned operation,
a credential, or a fabricated verdict — as in scope for a report.

## Supply chain

The plugin has **no runtime dependencies**. It is Markdown, JSON and POSIX
shell, and it executes nothing it did not ship. Since 1.0.0 the only script it
runs is `scripts/session-charter.sh`, on `SessionStart`. Third-party GitHub
Actions in this repository's own CI are pinned to commit SHAs rather than tags.

Updates are gated on the plugin's `version` field: with an explicit version,
`/plugin update` is a no-op until that field changes, so a commit pushed to
`main` without a version bump does not reach an existing installation. It does
reach a **new** one, which is the case to keep in mind — install from a tag you
have looked at if that matters to you.

There is no documented way to pin a plugin version inside `enabledPlugins`. If
you need a specific version to be the one your team runs, vendor the plugin or
point your marketplace entry at a fixed ref; do not rely on a settings key that
does not exist.
