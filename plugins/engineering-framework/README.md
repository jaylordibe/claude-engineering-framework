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

**Safety hooks** — a command guard that resolves the effective verb behind
wrappers and environment runners, and a protected-path guard for edits whose
failure is silent, remote and unrecoverable.

## Important

The declarative permissions floor — the only layer that cannot fail open —
**cannot ship inside a plugin**. `framework-install` writes it into your
repository and `framework-doctor` tells you if it goes missing. Neither guard
is a sandbox.

## Documentation

Full documentation lives in the
[repository](https://github.com/jaylordibe/claude-engineering-framework):
architecture, consuming-repository guide, migration guide, development guide,
and the Claude Code constraints that shaped the design.

MIT licensed.
