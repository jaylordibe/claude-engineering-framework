# engineering-framework

A stack-agnostic engineering workflow for Claude Code.

```text
Understand → Design → Human approval → Implement → Review → Validate → Present
```

> **The framework owns methodology. The repository owns truth.**

This plugin knows how to design, review and validate a change. It knows nothing
about your system, and every architectural claim its agents make is either
cited to a line of your code or labelled as an unknown.

## Install

```bash
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

Then, in the repository you want to use it in:

```text
/engineering-framework:framework-install
```

Requires `jq` on `PATH`.

## Use

```text
/engineering-framework:work-item <requirement | issue key | issue URL>
```

Runs the whole pipeline in one session and stops exactly twice: for you to
approve the plan, and for you to review the diff and push.

Or drive it stage by stage:

```text
/engineering-framework:gate-design <requirement>
/engineering-framework:gate-approve
/engineering-framework:gate-implement
/engineering-framework:gate-review
/engineering-framework:gate-validate
```

Diagnostics:

```text
/engineering-framework:framework-doctor
```

## What it ships

**Skills** — the conductor, five gates, an installer and a doctor. Three
model-invoked domain playbooks (`domain-auth`, `domain-authorization`,
`domain-background-work`) carry the decisions and failure modes for those
areas, and none of the answers.

**Agents** — eight read-only lenses: `context-mapper`, `architect`, `reviewer`,
`security`, `tester`, `contract`, `data`, `performance`. Read-only is enforced
by their tool pool, not promised in prose.

**Standards and templates** — loaded on demand by the gate that needs them,
never all at once.

**One hook** — a `SessionStart` charter carrying the workflow, the risk tiers,
the evidence language and the human-owned operations. That is the framework's
entire always-on cost.

## Important

**This plugin ships no permission rules and never edits your
`.claude/settings.json`.** It cannot block a command, and it will not change
how often you are prompted. Permissions belong to your repository and to you —
if you turn on a permission mode, you get that mode.

What it does instead is methodology: gates you invoke, review lenses that read
your diff, and standards those lenses judge against. The charter states which
operations are human-owned; the gates enforce that by stopping and handing off,
not by blocking.

Versions before 1.0.0 installed a permissions floor and two hooks that gated
tool calls. Both were removed — see the 1.0.0 entry in the changelog for why,
and for the two keys worth deleting from your settings if you have them.

## Documentation

Full documentation lives in the
[repository](https://github.com/jaylordibe/claude-engineering-framework):
architecture, consuming-repository guide, migration guide, development guide,
and the Claude Code constraints that shaped the design.

MIT licensed.
