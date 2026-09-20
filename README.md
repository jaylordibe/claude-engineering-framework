<div align="center">

# 🛠️ Himoa

### Production-grade engineering for coding agents — on any stack, in any repository.

```text
Understand → Design → Human approval → Implement → Review → Validate → Present
```

**Understand broadly enough to be right. Build only what the requirement needs.**
Evidence over assumption · risk-based rigor · explicit human approval · independent review.

<br/>

[![License: MIT](https://img.shields.io/badge/license-MIT-3b82f6.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6?style=flat-square)](https://claude.com/claude-code)
[![Stack agnostic](https://img.shields.io/badge/stack-agnostic-22c55e?style=flat-square)](#-what-it-does-not-do)
[![Permission rules](https://img.shields.io/badge/permission%20rules-none-64748b?style=flat-square)](#-what-it-does-not-do)
[![Build step](https://img.shields.io/badge/build-none-64748b?style=flat-square)](#-what-ships)

<br/>

[**Install**](#-getting-started) · [**Use**](#-use) · [**Risk tiers**](#-risk-decides-the-rigor) · [**What ships**](#-what-ships) · [**Docs**](#-documentation)

</div>

---

Himoa supplies the **methodology**. Your repository's **`AGENTS.md`** supplies
the **facts** about your system — the one neutral home every agent reads (Claude
Code reads it through a thin `CLAUDE.md` that imports it). Agents cite your code
or say `UNKNOWN` — they never guess your stack, and they never invent an
architecture you don't have.

```mermaid
flowchart LR
    U[Understand] --> D[Design]
    D -->|🧑 approve the plan| I[Implement]
    I --> R[Review]
    R --> V[Validate]
    V --> P[Present]
    P -->|🧑 review, then commit| Done((ship))
    classDef stop fill:#8b5cf6,stroke:#6d28d9,color:#fff;
    class D,P stop
```

> The pipeline runs on its own and **stops exactly twice** — to approve the
> plan, and to review the diff before you commit. Everything else runs without
> asking, at the rigor the change's risk earns.

---

## 🚀 Getting started

Two independent things must be in place. One lives on **your machine**; the
other lives in the **repository**.

| | Lives in | Arrives via |
|---|---|---|
| **The plugin** | `~/.claude/` on your machine | You install it. `git pull` never brings it. |
| **The repository declaration** (`.claude/settings.json`, `CLAUDE.md`) | The repository | `git pull`. One person ran `framework-install`. |

| Your situation | Do this |
|---|---|
| 🆕 Nothing set up yet | [1](#1-install-the-plugin-once-per-machine) then [2](#2-set-up-a-repository-once-per-repository) |
| 🤝 Teammate already set up the repo | [3](#3-join-a-repository-thats-already-set-up) |
| ⬆️ New version released | [4](#4-update) |

### 1. Install the plugin (once per machine)

```text
/plugin marketplace add jaylordibe/himoa
/plugin install himoa@jaylordibe
```

Restart Claude Code, then check:

```bash
claude plugin list      # expect: himoa@jaylordibe, ✔ enabled
```

### 2. Set up a repository (once per repository)

By one person. The result is committed.

```text
/himoa:framework-install
/himoa:framework-doctor      # verify
```

It shows every change before writing, never overwrites existing content, and
writes two files:

| File | Required? | Purpose |
|---|---|---|
| `CLAUDE.md` | **Yes** | Your stack, canonical commands, high-risk paths, consumers. Without it agents infer your architecture, and `framework-doctor` fails. |
| `.claude/settings.json` | Recommended | Declares the framework dependency. Without it, every teammate registers the marketplace by hand. |

Commit both. **Flags:** `--no-auto-update` (adopt releases manually),
`--no-task-tools` (skip the task-panel key).

### 3. Join a repository that's already set up

**Do not run `framework-install`.** You only need the plugin on your machine:

1. Open the repo and accept the trust prompt — the marketplace registers itself.
2. Run `/plugin install himoa@jaylordibe` and restart.
3. `/himoa:framework-doctor` to confirm.

If the repo doesn't declare the marketplace, run both commands from [step 1](#1-install-the-plugin-once-per-machine).

### 4. Update

**Auto-update is on by default.** Claude Code updates the plugin in the
background; the new version loads on your next launch or after
`/reload-plugins`. Nothing else to do.

<details>
<summary>If you set <code>"autoUpdate": false</code></summary>

```text
/plugin marketplace update jaylordibe
/plugin update himoa@jaylordibe
```

Then restart or `/reload-plugins` — updates don't apply to a running session. An
update never requires `framework-install`, `marketplace add`, or a re-install.
On a **major** bump, read the [CHANGELOG](CHANGELOG.md) entry first; minor and
patch bumps never ask anything of you.
</details>

---

## ⚡ Use

```text
/himoa:work-item <requirement, issue key, or issue URL>
```

Runs the whole pipeline. Stops exactly twice: to approve the plan, and to review
the diff before you commit.

Before there is a requirement to feed it:

```text
/himoa:write-ticket <goal, rough notes, or an issue to rewrite>
```

Writes the ticket the way a business analyst would — a story, the current
behaviour cited from your code, observable acceptance criteria, non-goals and
open questions — and iterates until you say it is final. It starts with bounded
evidence gathering and widens only when material ambiguity requires it. It
contains no design; `work-item` derives that from evidence, with approval.

<details>
<summary>Or drive the stages yourself</summary>

```text
/himoa:gate-design <requirement>
/himoa:gate-approve
/himoa:gate-implement
/himoa:gate-review
/himoa:gate-validate
```

Implemented something ad hoc? Pick up the back half: `gate-review`, then
`gate-validate`.
</details>

> **Small changes skip all of this.** A comment fix, a rename in one file, a log
> line, a one-liner — the framework makes the edit and stops. No plan, no review
> panel, no report.

<details>
<summary><strong>Full command reference</strong></summary>

| Command | How often | Required? |
|---|---|---|
| `/plugin marketplace add jaylordibe/himoa` | Per machine | Only if the repo doesn't declare it |
| `/plugin install himoa@jaylordibe` | Per machine | **Always, per developer** — project settings can't install it for you |
| `/himoa:framework-install` | Per repository | Yes, for the person introducing it. Never for anyone who pulls afterwards |
| `/plugin marketplace update jaylordibe` | Per release | Only if you opted out of auto-update |
| `/plugin update himoa@jaylordibe` | Per release | Only if you opted out of auto-update |
| `/himoa:framework-doctor` | Any time | Optional — fastest way to check everything is wired |
| `/himoa:work-item <requirement>` | Per change | The everyday command |
| `/himoa:gate-*` | Per stage | Optional alternative to `work-item` |

Every `/himoa:` command must be typed by a human — each sets
`disable-model-invocation: true`. Claude cannot invoke or fake one.
</details>

---

## 🎚️ Risk decides the rigor

Ceremony is not uniform. It scales with what the change can break — so a copy
fix stays cheap and a schema change gets everything it needs.

| Tier | Examples | You get |
|---|---|---|
| **Below Low** | Comment fix, rename in one file, log line, one-liner | The edit. Nothing else. |
| **Low** | Copy, isolated rename, test-only cleanup | No plan document |
| **Medium** | Business logic, endpoint behaviour | A plan |
| **High** | Auth, tenancy, personal data, money, uploads, webhooks, migrations, public contracts, concurrency | Full plan, threat model, negative tests, multi-lens review |
| **Critical** | Identity infrastructure, cryptography, privileged access, destructive data work | All of High, plus human security review |

On a boundary between two tiers, you get the higher one. A change touching a
path listed under **High-risk paths** in your `CLAUDE.md` is raised
automatically.

Asking to keep a change cheap is decisive below Low. Above it, it buys a shorter
report and fewer speculative searches — **not** fewer tests, reviewers or
checks.

### 🪶 Investigate deeply, build minimally

Investigation breadth and implementation breadth are **independent**. A
High-risk change may earn a deep map, a threat model and a full review panel and
still ship as a five-line diff — a deep look is not a licence to build deeply.
Before adding an abstraction, a dependency or a new path, the framework reuses
what the repository already owns and prefers the standard library and the
platform over new code — and never trades a test, a check or an error path for a
smaller diff. Policy: [`standards/execution-efficiency.md`](plugins/himoa/standards/execution-efficiency.md)
and [`standards/architecture.md`](plugins/himoa/standards/architecture.md) §3.

---

## 🔤 Evidence language

Every claim the framework makes carries one of these — and never rounds up.

| Verdict | Meaning |
|---|---|
| `PASS` | The check ran and passed for the stated scope |
| `FAIL` | It ran and failed |
| `BLOCKED` | It could not run |
| `N/A` | Your repository has no such step — does not block an overall `PASS` |

Skipped, partial, filtered or flaky is **never** `PASS`.

---

## 📦 What ships

- **13 skills** — `work-item` (the conductor), `write-ticket`, the gates
  `gate-design` · `gate-approve` · `gate-implement` · `gate-review` ·
  `gate-validate`, `framework-install`, `framework-doctor`, and four domain
  playbooks that load themselves when relevant: `domain-auth`,
  `domain-authorization`, `domain-background-work`, `domain-debugging`.
- **8 read-only agents** — `context-mapper`, `architect`, `reviewer`,
  `security`, `tester`, `contract`, `data`, `performance`. Read-only is enforced
  by their tool pool and asserted in CI. `gate-review` picks the panel by risk
  tier and by what the diff touches.
- **1 hook** — a `SessionStart` charter carrying the workflow, risk tiers and
  evidence language. It gates nothing.
- **Adapters for Codex, Cursor, Copilot and Gemini** — the same skills,
  reviewer roles and charter, generated from this one source (no fork,
  drift-checked in CI) into each host's native format, installed by
  `himoa-<host>-install`. See [Platforms](#-platforms).

The above is the **Claude Code reference implementation**. No build step, no
runtime dependencies, no published artifact.

## 🚫 What it does not do

- **Ships no permission rules and no hooks that gate a command.** Prompting and
  blocking are governed entirely by your own settings and permission mode.
- **`framework-install` writes exactly three keys** into your project's
  `.claude/settings.json`: `extraKnownMarketplaces`, `enabledPlugins`, and
  `env.CLAUDE_CODE_ENABLE_TODO_TOOLS`. Never `permissions`, never `hooks`, never
  a file outside your repository.
- **Never commits, pushes, merges, deploys or applies migrations.** It prepares
  the diff and evidence, then hands off. The act of record stays yours.

Rationale: [Architecture](docs/architecture.md).

---

## 🌐 Platforms

Himoa is one methodology with thin, **native** adapters per coding agent — the
methodology owns risk, evidence, approval, review and validation; an adapter
owns discovery, registration and the host's native enforcement. Claude Code is
the reference implementation; Codex, Cursor, Copilot and Gemini CLI are shipped
adapters (see the matrix below for each one's support level).

| Platform | Status |
|---|---|
| **Claude Code** | **Reference — full support.** Production-proven |
| **OpenAI Codex** | **Supported (initial adapter).** Projection, `$HOME` installer, doctor and repository bootstrap shipped and structurally validated; live end-to-end execution not yet smoke-tested, so not claimed at parity |
| **Cursor** | **Supported (initial adapter).** Reads `SKILL.md`/`AGENTS.md` natively, read-only reviewer subagents; shares the install with Codex; live run not yet smoke-tested |
| **GitHub Copilot** | **Supported with limitations.** Repo-committed `AGENTS.md` bootstrap; human approval is hard (structural PR review); reviewer lenses are advisory (no read-only subagent), no `SKILL.md` mechanism |
| **Gemini CLI** | **Supported (initial adapter).** Reuses `AGENTS.md` (via `context.fileName`); native read-only reviewer subagents; workflow as `/himoa:*` slash commands |

"Compatible in theory" is not "supported": a platform is listed as supported
only once its adapter runs the methodology, and an adapter never reports a
guarantee as enforced when the host can only advise it. Design and the
per-platform capability contract:
[Cross-agent architecture](docs/cross-agent-architecture.md) ·
[Platform capabilities](docs/platform-capabilities.md).

### Using Himoa from Codex, Cursor or Copilot

```bash
himoa-codex-install          # Codex: once per machine (skills + read-only reviewers + standards)
himoa-cursor-install         # Cursor: same, sharing the skills/standards install with Codex
himoa-codex-install --repo   # Codex/Cursor: once per repository, create/extend AGENTS.md (never destroys it)
himoa-copilot-install        # Copilot: repo only (AGENTS.md + advisory .github/agents), never touches $HOME
himoa-gemini-install         # Gemini: ~/.gemini subagents + /himoa:* commands; --repo wires AGENTS.md via context.fileName
himoa-codex-doctor           # verify (himoa-{cursor,copilot,gemini}-doctor per host)
```

`--check` is a dry run; `--uninstall` removes only Himoa-owned files (and keeps
the shared skills when the other host still uses them). The same canonical
methodology runs through each host's native mechanisms — skills invoked by name,
reviewer subagents that run read-only, and the human-approval gate the model
cannot self-start. Human approval and evidence semantics mean exactly what they
do on Claude Code; where a host enforces something differently,
[Platform capabilities](docs/platform-capabilities.md) says so rather than
implying parity.

---

## 🩺 Troubleshooting

<details>
<summary>Common symptoms and fixes</summary>

| Symptom | Cause and fix |
|---|---|
| Skills don't appear | Plugin not installed or session predates it. `claude plugin list`, then `/reload-plugins` or restart. |
| Works for me, not for a teammate | They need [the install](#1-install-the-plugin-once-per-machine), not `framework-install`. The plugin doesn't travel with `git pull`. |
| `framework-doctor`: repository does not declare the framework | Run `framework-install` and commit `.claude/settings.json`. |
| Update seems to have no effect | Restart. Updates don't apply to a running session. |
| Task panel stays empty during `work-item` | Check `env.CLAUDE_CODE_ENABLE_TODO_TOOLS` in `.claude/settings.json` — re-run `framework-install` if absent. Then check the plugin is 2.3.0+. Then check `.claude/settings.local.json`, which is per-developer and outranks the committed file. The run also prints a pipeline ledger in the conversation. |
| Everything prompts for permission / a command is blocked | Not this plugin — it ships no permission rules. Check your own settings and permission mode. |
| An agent describes architecture you don't have | Check `CLAUDE.md` is current, run `framework-doctor`, then [open an issue](https://github.com/jaylordibe/himoa/issues) with the transcript. |
| Claude claims a gate ran | It didn't — gates cannot be model-invoked. The claim is the bug. |

**Leftover from an older setup** — nothing here reads it; clean it up by hand:

- **A `permissions` block in `.claude/settings.json`** — it's yours now. Delete
  `permissions.defaultMode` in particular: project settings override each
  developer's own, so it cancels the permission mode they chose.
</details>

---

## 📚 Documentation

| Document | For |
|---|---|
| [Consuming repository guide](docs/consuming-repository-guide.md) | Setting up a repository |
| [Architecture](docs/architecture.md) | Why the framework and the repository own different things |
| [Migration guide](docs/migration-from-dot-claude.md) | Moving from a copied `.claude/` directory |
| [Versioning](docs/versioning.md) | What major, minor and patch mean here |
| [Changelog](CHANGELOG.md) | What each release asks of you |
| [Development guide](docs/development-guide.md) | Changing and releasing the framework |
| [Claude Code constraints](docs/constraints.md) | Platform limits that shaped the design |
| [Cross-agent architecture](docs/cross-agent-architecture.md) | The core/adapter boundary and how each host maps |
| [Platform capabilities](docs/platform-capabilities.md) | What each agent can and cannot enforce |
| [Adapter smoke test](docs/adapter-smoke-test.md) | Producing the live end-to-end evidence per host |

---

<div align="center">

**MIT licensed.** Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

<sub>The framework owns methodology. Your repository owns truth.</sub>

</div>
