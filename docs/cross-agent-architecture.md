# Cross-agent architecture

Himoa is evolving from a Claude Code plugin into **one canonical engineering
methodology with thin, native execution adapters** — Claude Code today, OpenAI
Codex next, others later. This document records the boundary that makes that
safe. It is design rationale, not a second methodology: the standards under
`plugins/himoa/standards/` remain the single source of truth.

> **Adapt the framework to the agent. Never weaken the framework to fit the
> agent.** Normalising to the weakest platform is the failure this design
> exists to prevent.

## The principle

**One canonical framework + thin platform adapters** — never multiple copies of
the framework. There is exactly one owner of each concern. An adapter may
*reference, expose, register or generate a thin wrapper around* the canonical
content; it may never fork the methodology. `claude/standards/*` beside
`codex/standards/*` with the same words is the anti-pattern, because the two
drift the day someone edits one.

## The four layers

Every mechanism in this repository is exactly one of these.

| Layer | What it is | Where it lives | Owner |
|---|---|---|---|
| **Core methodology** | The engineering method — risk model, evidence verdicts, repository-evidence precedence, quality-bar integrity, external-source verification, security methodology, investigation depth, execution-efficiency, review/validation/approval contracts | `plugins/himoa/standards/`, `agents/`, the workflow | Canonical, platform-neutral |
| **Portable primitive** | A concept several hosts support but represent differently — skill *bodies*, reviewer-role *bodies*, repository instructions, MCP, validation commands | `skills/*/SKILL.md` bodies, `agents/*.md` bodies | Canonical body; per-host registration |
| **Adapter** | Host-specific wiring — manifest, discovery paths, registration format, lifecycle, install | Claude: `.claude-plugin/`, `hooks/`, `${CLAUDE_PLUGIN_ROOT}`, `himoa:` namespace, `himoa-install-settings` | Per host |
| **Platform capability** | A guarantee whose *enforcement* depends on host features | `docs/platform-capabilities.md` | Per host, truthfully declared |

The core is already platform-neutral prose: the only Claude coupling inside
`standards/` is the `${CLAUDE_PLUGIN_ROOT}` cross-reference token and the
`himoa:` launch namespace — both adapter concerns, not methodology.

## The invariants every adapter preserves

An adapter changes *how* a guarantee is delivered, never *what* it means. These
hold identically on every platform, enforced by methodology where a host lacks a
native mechanism:

- **Evidence semantics.** `PASS` / `FAIL` / `BLOCKED` / `N/A` mean the same
  thing everywhere; freshness, stale-evidence handling and the no-manufactured-
  green rule are canonical. An adapter may change how evidence is *gathered*,
  never what *qualifies* as evidence.
- **Human approval.** The approval gate is not model-invocable and the model may
  not infer approval. An adapter uses the strongest native mechanism the host
  offers and **surfaces any enforcement gap** rather than proceeding through it.
- **Risk-adaptive rigor.** Risk determines ceremony; low-risk work stays light;
  reviewer fan-out stays bounded and justified.
- **Execution efficiency.** Minimum sufficient context, progressive disclosure,
  no loading every standard or spawning every reviewer. Adapters stay thin — if
  an adapter grows large, platform-specific complexity is leaking into the core.

## Reference implementation

**Claude Code is the reference implementation and remains the strongest.**
Portability work does not regress it: its plugin, skills, agents, hooks,
orchestration, approval behaviour and evidence semantics are untouched by this
design. Where a future core extraction would require editing Claude files,
behavioural equivalence is verified first.

## Codex — the first portability target

Capabilities verified 2026-09-20 (`docs/platform-capabilities.md`): Codex has
native `AGENTS.md`, native `SKILL.md` with progressive disclosure, native
read-only subagents, native MCP, and runtime-hard approvals/sandbox. Every core
primitive maps to a **native** Codex mechanism — Codex should feel native to
Codex while executing the same methodology, not emulate Claude Code.

**Distribution model: user-level install (Option A, chosen).** Claude Code gets
the framework from a repo-external cache (the plugin); Codex needs skills,
reviewers and `AGENTS.md` present where it runs. The chosen analogue keeps the
canonical content single-sourced and out of consuming repositories: expose the
framework at user level (`~/.agents/skills/`, `~/.codex/agents/`) with a small
per-repo `AGENTS.md` bootstrap, rather than vendoring copies into every
repository (which would drift — the anti-pattern above).

### The adapter, as built

Both deferred decisions were resolved with evidence, not invented:

1. **Single-source mechanism — generation with a drift test.**
   `tests/validate-adapter-projection.mjs` transforms the canonical skills,
   reviewer agents, standards, templates and the SessionStart charter into
   `plugins/himoa/adapters/` (committed, marked GENERATED). It rewrites
   `${CLAUDE_PLUGIN_ROOT}` references to the install home, agent `.md` to a Codex
   `.toml` and a Cursor `.md` (both read-only), human-only skills to
   `disable-model-invocation` + `allow_implicit_invocation: false`, and
   "CLAUDE.md" to "AGENTS.md". Run with no argument it fails when the committed
   projection has drifted, so there is never a second editable copy. Symlinks
   were rejected (not portable to Windows).
2. **The `$HOME` boundary — separate, explicit installers.**
   `bin/himoa-codex-install` / `himoa-cursor-install` write into `~/.agents/skills/`,
   `~/.agents/himoa/` and the host's agents dir (`~/.codex/agents/` or
   `~/.cursor/agents/`), all Himoa-owned; idempotent, with `--check` and a narrow
   `--uninstall`, honouring `CODEX_HOME`/`HOME`. They are deliberately NOT
   `himoa-install-settings`, whose project-only, nothing-in-`$HOME` invariant is
   untouched. Repository bootstrap (`--repo`) creates or safely prepends
   `AGENTS.md`, never destroying existing content.

`bin/himoa-{codex,cursor}-doctor` verify an installation in the
`PASS/FAIL/BLOCKED/N/A` vocabulary. What remains before a host reaches parity
with Claude Code is a live end-to-end run inside it; that has not been
smoke-tested here, so both are **Supported (initial adapter)**, not Full
(`docs/platform-capabilities.md`).

## Cursor — the shared seam, extracted (3.2.0)

Cursor was the second adapter, and per "two implementations before abstraction"
it is where the shared parts were extracted — only what Claude + Codex + Cursor
*demonstrably* share, nothing speculative. Cursor reads `SKILL.md` and
`AGENTS.md` natively, honours `disable-model-invocation` (like Claude), and has
read-only local subagents, so:

- **Skills, standards, templates and the charter bootstrap became host-neutral
  shared artefacts** under `adapters/` (installed to `~/.agents/skills` and
  `~/.agents/himoa`, which Codex and Cursor both read). Only reviewer-agent
  *format* is per-host: `adapters/codex/agents/*.toml` vs
  `adapters/cursor/agents/*.md` (`readonly: true`).
- **Human-only skills carry both signals** — `disable-model-invocation` in
  `SKILL.md` (Cursor/Claude) and the `openai.yaml` sidecar (Codex) — so the
  approval boundary holds on every host.
- **Installer and doctor logic is shared** (`bin/lib/*.sh`) behind thin per-host
  wrappers. Uninstalling one host keeps the shared skills when another host
  still uses them.

`himoa-cursor-install` / `himoa-cursor-doctor` mirror the Codex bins. Cursor is
**Supported (initial adapter)** on the same terms as Codex — structurally
validated, live end-to-end run pending.

## Deliberately not done

- **No `core/` + `adapters/` repository restructure** — `adapters/` holds the
  generated projection; the canonical source stays the single home. A deeper
  restructure is still architecture ahead of need.
- **No per-platform forks** of skills or standards.
- **GitHub Copilot is a Supported (with limitations) adapter**, a deliberately
  different shape: a cloud agent with no local footprint, so `himoa-copilot-install`
  writes only to the repository (`AGENTS.md` + `.github/agents/*.agent.md`).
  Reviewer lenses are advisory (no spawnable read-only subagent) and there is no
  `SKILL.md` mechanism, but human approval is *stronger* (structural PR review).
  Recorded truthfully in `docs/platform-capabilities.md` rather than rounded up.
- **Gemini CLI is a Supported (initial) adapter.** It reuses `AGENTS.md` via the
  `context.fileName` setting (no `GEMINI.md` fork), projects reviewer roles as
  native read-only subagents (`.gemini/agents/*.md`, tools allowlist) and the
  workflow as native `/himoa:*` slash commands (`.gemini/commands/`). Gates are
  human-typed, so the model cannot self-start one.
- **No rename beyond the identity migration** and no lowest-common-denominator
  normalisation.
