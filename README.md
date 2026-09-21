<div align="center">

<br/>

# 🛠️ Himoa

### Senior-engineer discipline for coding agents — on any stack, in any repository.

<br/>

```text
Understand → Design → 🧑 Approve → Implement → Review → Validate → Present
```

**Investigate deeply. Build minimally. Prove every claim. Stop for the human.**

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6.svg?style=for-the-badge)](LICENSE)
[![Agents](https://img.shields.io/badge/Agents-Claude·Codex·Cursor·Copilot·Gemini-8b5cf6?style=for-the-badge)](#-agents)
[![Stack](https://img.shields.io/badge/Stack-agnostic-22c55e?style=for-the-badge)](#-what-ships)
<br/>
[![Permission rules](https://img.shields.io/badge/Permission_rules-none-64748b?style=flat-square)](#-security-boundaries)
[![Command-gating hooks](https://img.shields.io/badge/Command_gating-none-64748b?style=flat-square)](#-security-boundaries)
[![Build step](https://img.shields.io/badge/Build_step-none-64748b?style=flat-square)](#-what-ships)
[![Runtime deps](https://img.shields.io/badge/Runtime_deps-none-64748b?style=flat-square)](#-what-ships)

<br/>

[**Agents**](#-agents) · [**Install**](#-install) · [**Workflow**](#-the-workflow) · [**Risk**](#-risk-decides-the-rigor) · [**Approval**](#-human-approval) · [**Evidence**](#-evidence-language) · [**Docs**](#-documentation)

</div>

---

## Why Himoa

Coding agents are fast, confident, and happy to invent. Asked to change a system
they've never read, they guess a stack, ship an untested diff, call it done, and
commit it for you. The speed is real; so is the silent wrong turn.

**Himoa gives the agent the habits of a senior engineer instead.** It reads your
repository before touching it, designs before it builds, **stops for your
approval**, implements only what the requirement needs, reviews its own work
through independent lenses, validates against real commands, and reports with
evidence — labelling every claim, or saying `UNKNOWN` rather than bluffing.

Two things work together and own different halves:

- **Himoa owns the *methodology*** — the workflow, the risk model, the evidence
  rules, the review and validation discipline, and the human-approval boundary.
- **Your repository owns the *truth*** — what the system is, how it's built, how
  it's verified. That lives in your repo's **[`AGENTS.md`](#where-your-truth-lives)**.
  Agents cite your code or say `UNKNOWN`; they never invent an architecture you
  don't have.

> It is **not** a prompt pack and **not** tied to one tool. The methodology is
> canonical and lives in one place. **Claude Code is the reference
> implementation**; Codex, Cursor, GitHub Copilot and Gemini CLI are native
> adapters *generated from the same source* — one methodology, no fork.

---

## ⚡ The workflow

Feed Himoa a requirement — plain English, an issue key, or an issue URL — and it
runs the whole lifecycle on its own, **stopping exactly twice**: once to approve
the plan, once to review the diff before you commit.

```mermaid
flowchart LR
    U[🔍 Understand] --> D[📐 Design]
    D -->|🧑 approve the plan| I[⚙️ Implement]
    I --> R[🔬 Review]
    R --> V[✅ Validate]
    V --> P[📋 Present]
    P -->|🧑 review, then commit| Done((🚢 ship))
    classDef stop fill:#8b5cf6,stroke:#6d28d9,color:#fff,font-weight:bold;
    classDef flow fill:#1e293b,stroke:#334155,color:#e2e8f0;
    class D,P stop
    class U,I,R,V flow
```

On Claude Code:

```text
/himoa:work-item <requirement, issue key, or issue URL>
```

Other hosts invoke the same skill by name — Codex `$himoa-work-item`, Gemini
`/himoa:work-item`, Cursor `himoa-work-item`.

<details>
<summary><b>What a run looks like</b> (illustrative — shape, not fabricated output)</summary>

```text
$ /himoa:work-item "Add rate limiting to the password-reset endpoint"

  🔍 Understand   maps the endpoint, its auth path, the existing limiter
  🎚️  Risk         HIGH — authentication surface + public contract
  📐 Design       plan + threat model + negative tests, presented
      ⏸  APPROVAL REQUIRED — waiting for you  ────────────────────────
  ⚙️  Implement    (after you approve) minimal diff, reuses the limiter
  🔬 Review       security · reviewer · contract lenses, run independently
  ✅ Validate     PASS · lint · types · tests   (the commands from AGENTS.md)
  📋 Present      diff + evidence handed off
      ⏸  YOURS TO COMMIT — Himoa never commits, pushes or deploys  ────
```

</details>

**Need the ticket first?** `write-ticket` drafts one the way a business analyst
would — a story, current behaviour cited from your code, observable acceptance
criteria, non-goals and open questions. It contains **no design**; the workflow
derives that from evidence, with your approval.

<details>
<summary>Drive the stages yourself, or pick up ad-hoc work</summary>

```text
/himoa:gate-design <requirement>  →  /himoa:gate-approve  →  /himoa:gate-implement
/himoa:gate-review                →  /himoa:gate-validate
```

Implemented something by hand? Pick up the back half: `gate-review`, then
`gate-validate`. Every gate is **human-typed** — the model can neither invoke nor
fake one.
</details>

> **Small changes skip all of this.** A comment fix, a rename in one file, a log
> line, a one-liner — Himoa makes the edit and stops. No plan, no review panel,
> no report.

---

## 🌐 Agents

The methodology is identical everywhere. What differs is how strongly each host
can *enforce* a guarantee — Himoa states that honestly rather than implying parity.

| Agent | Support | What that means |
|---|:---:|---|
| **Claude Code** | 🟢 **Reference — full** | Production-proven. Native plugin, non-invocable gate skills, read-only review subagents, always-on `SessionStart` charter. |
| **OpenAI Codex** | 🔵 **Supported** | Native `SKILL.md` skills, read-only sandbox subagents, `AGENTS.md`. Structurally validated; live end-to-end run pending. |
| **Cursor** | 🔵 **Supported** | Native `SKILL.md`/`AGENTS.md`, `readonly` reviewer subagents. Shares its install with Codex. |
| **Gemini CLI** | 🔵 **Supported** | Reuses `AGENTS.md`, read-only reviewer subagents, `/himoa:*` slash commands. |
| **GitHub Copilot** | 🟡 **Supported, with limits** | Repo-committed `AGENTS.md`; approval is **hard** (human merges the PR). Reviewer lenses are **advisory** — no read-only subagent, no skills mechanism. |

> *"Compatible in theory" is not "supported."* A host is listed only once its
> adapter actually runs the methodology, and enforcement is never rounded up.
> Deeper: [platform capabilities](docs/platform-capabilities.md) ·
> [cross-agent architecture](docs/cross-agent-architecture.md).

---

## 📦 Install

Pick your agent. Every path installs the **same methodology**; only the mechanism
is host-native. Nothing here writes outside the paths shown, and **nothing commits
on your behalf.**

<details open>
<summary><b>Claude Code</b> — the reference implementation</summary>

<br/>

Installed as a plugin (once per machine), then declared in the repository (once
per repo, by one person, committed):

```text
# once per machine
/plugin marketplace add jaylordibe/himoa
/plugin install himoa@jaylordibe          # restart Claude Code after

# once per repository — writes AGENTS.md, a thin CLAUDE.md, and .claude/settings.json
/himoa:framework-install
/himoa:framework-doctor                   # verify
```

Teammates who pull the repo run only the two `/plugin` lines on their own machine
— the plugin never travels with `git pull`.

</details>

<details>
<summary><b>Codex, Cursor & Gemini CLI</b> — one installer family</summary>

<br/>

Get the `himoa-*` bins from the Claude plugin (they're on your `PATH` once it's
installed) **or** from a clone:
`git clone https://github.com/jaylordibe/himoa && himoa/plugins/himoa/bin/himoa-<host>-install`

```bash
himoa-codex-install          # Codex   — skills + read-only reviewers + standards (machine)
himoa-cursor-install         # Cursor  — shares the skills/standards install with Codex
himoa-gemini-install         # Gemini  — ~/.gemini subagents + /himoa:* commands
himoa-codex-install --repo   # once per repository: create/extend AGENTS.md (never destroys it)
himoa-codex-doctor           # verify   (himoa-{cursor,gemini}-doctor per host)
```

`--check` is a dry run; `--uninstall` removes only Himoa-owned files. Skills are
invoked by name; reviewer roles run read-only; gates cannot be self-started.

</details>

<details>
<summary><b>GitHub Copilot</b> — repository-committed only</summary>

<br/>

Copilot is a cloud agent, so its adapter **never touches `$HOME`**:

```bash
himoa-copilot-install        # writes ./AGENTS.md + advisory .github/agents/*.agent.md
himoa-copilot-doctor         # verify
git add AGENTS.md .github/agents && git commit   # then let Copilot open a PR
```

Human approval on Copilot is enforced **structurally by GitHub** — a human reviews
and merges the PR. The projected reviewer lenses are **advisory**, not
sandbox-enforced.

</details>

### Where your truth lives

Repository facts live in one neutral file — **`AGENTS.md`** at the repo root — read
by every agent. Claude Code reads it through a thin `CLAUDE.md` that imports it
(`@AGENTS.md`); Codex, Cursor, Copilot and Gemini read it directly. State it once:

- **what the system is** — language, runtime, frameworks, data stores
- **canonical commands** — build, lint, type-check, test *(the validation gate runs these)*
- **high-risk paths** that deserve extra ceremony
- **consumers** of your contracts, and deployment constraints

Himoa never invents a missing fact. An absent section is honest; a wrong one is
load-bearing misinformation. `framework-install` (Claude) and
`himoa-<host>-install --repo` scaffold the file; you fill it from repository
evidence. Full guide: [consuming repository guide](docs/consuming-repository-guide.md).

---

## 🎚️ Risk decides the rigor

Ceremony scales with what a change can break — a copy fix stays cheap, a schema
change gets everything it needs. This is agent-independent.

| Tier | Examples | You get |
|---|---|---|
| **Below Low** | Comment fix, rename in one file, log line, one-liner | The edit. Nothing else. |
| **Low** | Copy, isolated rename, test-only cleanup | No plan document |
| **Medium** | Business logic, endpoint behaviour | A plan |
| **High** | Auth, tenancy, personal data, money, uploads, webhooks, migrations, public contracts, concurrency | Full plan, threat model, negative tests, multi-lens review |
| **Critical** | Identity infrastructure, cryptography, privileged access, destructive data work | All of High, **plus human security review** |

On a boundary between two tiers you get the **higher** one; a change touching a
**high-risk path** you declared in `AGENTS.md` is raised automatically. Asking to
keep a change cheap is decisive below Low; above it, it buys a shorter report and
fewer speculative searches — **never** fewer tests, reviewers or checks.

> **🔎 Investigate deeply, build minimally.** Investigation breadth and
> implementation breadth are independent: a High-risk change may earn a deep map,
> a threat model and a full review panel — and still ship as a five-line diff.
> Himoa reuses what the repository already owns and prefers the standard library
> and platform over new code, dependencies or abstractions.
> Policy: [`execution-efficiency`](plugins/himoa/standards/execution-efficiency.md)
> · [`architecture`](plugins/himoa/standards/architecture.md) §3.

---

## 🧑 Human approval

Himoa stops for a human at **two** boundaries, and neither stop is a formality:

1. **After design, before implementation.** The plan is presented and Himoa waits.
   *Silence is not approval, task assignment is not approval, a permissive sandbox
   is not approval, and a prior approval never covers a materially changed design.*
2. **After validation, before you commit.** Himoa prepares the diff, tests and
   evidence, then hands off. It **never commits, pushes, merges, deploys or applies
   a migration** — the act of record stays yours.

How the *first* stop is enforced per host: **native** on Claude Code and Cursor
(gate skills are not model-invocable) and Codex (`allow_implicit_invocation:
false`); on Gemini a gate is a human-typed command; on **Copilot it is hard** —
GitHub requires a human to review and merge the PR. Himoa reports which applies
rather than assuming they are equivalent.

---

## 🔤 Evidence language

Every claim Himoa makes carries one of these — and never rounds up.

| Verdict | Meaning |
|:---:|---|
| `PASS` | The check ran and passed for the stated scope |
| `FAIL` | It ran and failed |
| `BLOCKED` | It could not run |
| `N/A` | Your repository has no such step — does **not** block an overall `PASS` |

> Skipped, partial, filtered or flaky is **never** `PASS`. Making a check green by
> weakening it — deleting a test, gutting an assertion, lowering a threshold,
> suppressing a finding — is *manufacturing* a pass, not passing.

---

## 📦 What ships

The **Claude Code reference implementation**:

- **16 skills** — `work-item`, `write-ticket`, five gates (`gate-design`,
  `gate-approve`, `gate-implement`, `gate-review`, `gate-validate`),
  `framework-install` / `framework-doctor`, and seven domain playbooks
  (`domain-auth`, `domain-authorization`, `domain-background-work`,
  `domain-browser-security`, `domain-cryptography`, `domain-debugging`,
  `domain-supply-chain`).
- **8 read-only review agents** — `context-mapper`, `architect`, `reviewer`,
  `security`, `tester`, `contract`, `data`, `performance`.
- **1 `SessionStart` charter** carrying the always-on rules — and gating nothing.

The **Codex, Cursor, Copilot and Gemini adapters** are generated from that same
source (**no fork**, drift-checked in CI) into each host's native format and
installed by `himoa-<host>-install`.

> **No build step. No runtime dependencies. No published artifact.** The
> marketplace serves this repository directly.

### 🚫 Security boundaries

- **No permission rules, no command-gating hooks.** Prompting and blocking are
  governed entirely by *your* settings and permission mode — Himoa ships neither,
  and no document describes it as though it can block your work.
- **Repository installs write a bounded set only.** `framework-install` merges
  exactly three keys into your project's `.claude/settings.json` —
  `extraKnownMarketplaces`, `enabledPlugins`, and
  `env.CLAUDE_CODE_ENABLE_TODO_TOOLS` — **never** `permissions`, **never** `hooks`.
  The `himoa-<host>-install` bins write only Himoa-owned, prefixed paths, are
  idempotent, and never overwrite unrelated files or destroy an existing `AGENTS.md`.
- **The act of record stays yours.** Himoa never commits, pushes, deploys or
  applies migrations. Rationale: [architecture](docs/architecture.md).

---

## ⬆️ Update

On Claude Code, auto-update is on by default — the new version loads on your next
launch or after `/reload-plugins`. If you opted out
(`framework-install --no-auto-update`): `/plugin marketplace update jaylordibe`
then `/plugin update himoa@jaylordibe`, and restart. On a **major** version bump,
read the [CHANGELOG](CHANGELOG.md) first; minor and patch bumps never ask anything
of you. For the other hosts, re-run `himoa-<host>-install` to refresh;
`himoa-<host>-doctor` reports a stale install.

---

## 🩺 Troubleshooting

<details>
<summary>Common symptoms and fixes</summary>

<br/>

| Symptom | Cause and fix |
|---|---|
| Skills / commands don't appear | Not installed, or the session predates the install. Re-check the [install](#-install) for your agent, then reload or restart. |
| Works for me, not for a teammate (Claude) | They need the per-machine `/plugin install`, not `framework-install`. The plugin doesn't travel with `git pull`. |
| `framework-doctor`: repository does not declare Himoa | Run `framework-install` (Claude) or `himoa-<host>-install --repo`, and commit the result. |
| Everything prompts for permission / a command is blocked | Not Himoa — it ships no permission rules. Check your own settings and permission mode. |
| An agent describes architecture you don't have | Your `AGENTS.md` is missing or stale. Fill it from evidence, run the doctor, then [open an issue](https://github.com/jaylordibe/himoa/issues) with the transcript. |
| The agent claims a gate ran (Claude) | It didn't — gates cannot be model-invoked. The claim is the bug. |
| A non-Claude host doesn't reflect the methodology | Confirm `himoa-<host>-doctor` is green, and that a live host run is expected — see [adapter smoke test](docs/adapter-smoke-test.md). |

</details>

---

## 📚 Documentation

| Document | For |
|---|---|
| [Consuming repository guide](docs/consuming-repository-guide.md) | Setting up a repository and filling `AGENTS.md` |
| [Cross-agent architecture](docs/cross-agent-architecture.md) | One methodology, native adapters — the core/adapter boundary |
| [Platform capabilities](docs/platform-capabilities.md) | What each agent can and cannot enforce, honestly |
| [Adapter smoke test](docs/adapter-smoke-test.md) | Producing the live end-to-end evidence per host |
| [Architecture](docs/architecture.md) | Why methodology and repository own different things |
| [Migration from `.claude`](docs/migration-from-dot-claude.md) | Moving an existing setup onto Himoa |
| [Versioning](docs/versioning.md) · [Changelog](CHANGELOG.md) | What each release means and asks of you |
| [Development guide](docs/development-guide.md) · [Constraints](docs/constraints.md) | Changing/releasing Himoa; the host limits that shaped it |

---

<div align="center">

<br/>

**MIT licensed.** · Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

**Himoa owns the methodology. Your repository owns the truth.**

<sub>Understand broadly enough to be right. Build only what the requirement needs.</sub>

</div>
