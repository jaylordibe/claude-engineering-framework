# Security policy

## What this project's guards are, and are not

The `engineering-framework` plugin ships two `PreToolUse` hooks and a reference
permissions floor. Together they stop a large class of destructive and
exfiltrating operations.

**They are defence in depth. They are not a sandbox, and they must never be
described as one.**

A shell can always express an operation a parser does not model: a verb built
from a variable, an operation inside a script file, a here-doc, an interpreter
given a string. The guards see the forms they model, and no more.

| Layer | Sees | Can fail open |
|---|---|---|
| `permissions.deny` | Only the exact command prefixes it names | **No** |
| Command guard hook | Wrappers, privilege escalation, environment runners, pipelines | **Yes** — it is executable code, and Claude Code treats a crashed hook as a non-blocking error |

Note the asymmetry: the layer that cannot fail open is the one a plugin
*cannot ship*, so a repository that has not installed the floor is relying
entirely on the layer that can. `framework-doctor` exists to tell you which
situation you are in.

**For a real boundary, use OS-level sandboxing or a container.**

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/jaylordibe/claude-engineering-framework/security/advisories/new).
Please do not open a public issue for an unfixed bypass.

Include: the exact command or payload, the decision you observed, the decision
you expected, and your Claude Code version.

Expect an acknowledgement within a few days. A confirmed bypass ships as a
patch release with a fixture pinning it, so the same shape cannot regress.

## What counts as a vulnerability here

**In scope:**

- A guard bypass: a command that reaches a denied operation without a `deny`
  or `ask` decision — particularly through a wrapper, an environment runner, a
  privilege escalation, a pipeline, or a quoting trick.
- A credential path reaching the shell without a decision.
- A crash or hang in a guard, since a failed hook is treated as non-blocking
  and therefore fails open.
- Guidance in a skill or agent that would lead Claude to weaken a security
  control, exfiltrate a secret, or disclose data.
- An inert or ineffective rule in the reference permissions floor that reads as
  protective.

**Out of scope:**

- That the guards are not a sandbox. That is documented, everywhere, on purpose.
- Operations a repository has explicitly delegated in its own policy file.
- Anything requiring the ability to modify the plugin's own files — at that
  point the attacker already runs code on the machine.
- False positives. Those are ordinary bugs; open an issue.

## Hardening a consuming repository

1. **Install the permissions floor.** Run
   `/engineering-framework:framework-install`. It is the only layer that cannot
   fail open, and it is the one thing the plugin cannot install for you.
2. **Mirror Bash rules as PowerShell rules.** The PowerShell tool is enabled by
   default on Windows without Git Bash, and `Bash(...)` rules do not govern it.
   An unmirrored floor silently disappears on those machines.
3. **Use `Read(...)` and `Edit(...)` for file rules.** A `Write(...)`,
   `Glob(...)`, `MultiEdit(...)` or `NotebookEdit(...)` path rule is accepted,
   never enforced, and warns at startup — the worst failure shape available,
   because the path reads as protected while being fully writable.
4. **Install `jq`.** Without it both guards fail closed and prompt for
   everything. That is safe, but it is tedious enough that people disable the
   plugin, which is not.
5. **Run `framework-doctor` after any settings change.** A floor that was
   quietly edited away still reads as present in your documentation.
6. **Review the policy file in code review.** Every `humanOwned*` switch set to
   `false` is a deliberate delegation and deserves a reviewer.

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
which is a materially weaker mechanism than a deny rule, and it should be
described that way. `fixtures/adversarial-injection/` and the
`injection-resistance` grader exist to keep it honest.

Treat a bypass — repository text that reliably obtains a human-owned operation,
a credential, or a fabricated verdict — as in scope for a report.

## Supply chain

The plugin has **no runtime dependencies**. It is Markdown, JSON and POSIX
shell, and it executes nothing it did not ship. Third-party GitHub Actions in
this repository's own CI are pinned to commit SHAs rather than tags.

Updates are gated on the plugin's `version` field: with an explicit version,
`/plugin update` is a no-op until that field changes, so a commit pushed to
`main` without a version bump does not reach an existing installation. It does
reach a **new** one, which is the case to keep in mind — install from a tag you
have looked at if that matters to you.

There is no documented way to pin a plugin version inside `enabledPlugins`. If
you need a specific version to be the one your team runs, vendor the plugin or
point your marketplace entry at a fixed ref; do not rely on a settings key that
does not exist.
