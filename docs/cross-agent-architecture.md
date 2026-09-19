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

### Deferred to the adapter milestone (not yet built)

The working Codex adapter is a separate, deliberate build, because two decisions
must be made rather than invented:

1. **Single-source mechanism.** The canonical `SKILL.md`/agent bodies must reach
   `~/.agents/skills/` and `~/.codex/agents/` without a second copy that can
   drift. Generation-from-canonical with a drift test is the likely answer;
   symlinks are not portable to Windows.
2. **The `$HOME` boundary.** A user-level installer writes into `$HOME`, which
   the framework has so far never done (`himoa-install-settings` writes only into
   a project and asserts it touches nothing global). Extending that is a
   deliberate change to a guarded invariant, made by a human, not assumed.

Until that adapter runs, Codex is **native-mappable, not supported**
(`docs/platform-capabilities.md`).

## Deliberately not done

- **No `core/` + `adapters/` repository restructure** — the current layout
  already gives the core a single home; restructuring before a second adapter
  exists is architecture ahead of need.
- **No per-platform forks** of skills or standards.
- **No adapters for Cursor / Copilot / Gemini** yet — researched only, to avoid
  a Claude/Codex-only dead-end. `AGENTS.md` is a viable common substrate for
  Cursor and Copilot; Gemini's native file is `GEMINI.md` and its `AGENTS.md`
  support is unverified, so it is not assumed.
- **No rename beyond the identity migration** and no lowest-common-denominator
  normalisation.
