# Platform capability contract

Himoa is one methodology with **thin, native adapters** per coding agent. The
methodology owns *what must be true*; an adapter owns *how this host makes it
true*. Those are different, and conflating them is how a framework quietly
becomes "prompts that also run elsewhere."

This file records, per platform, whether each framework requirement can be met
and **how strongly it is enforced**. Its job is to prevent false equivalence: a
requirement that a host can only *advise* is never reported as *enforced*.

> **Adapt the framework to the agent. Never weaken the framework to fit the
> agent.** When portability and framework integrity conflict, integrity wins.

## Enforcement vocabulary

| Level | Means |
|---|---|
| **native** | The host provides a first-class mechanism for it |
| **hard** | The host can *block* the violation at runtime, not merely discourage it |
| **advisory** | Carried as instruction the model is expected to follow; not runtime-blocked |
| **methodology** | Guaranteed by how the framework is written (a gate the model cannot self-start, a verdict it cannot round up) rather than by a host feature |
| **unsupported** | No mechanism, in any spelling |

`native` and `hard` are not the same axis: a mechanism can be native and still
only advisory (an always-read instruction file), and a guarantee can be
methodology-enforced on every host without any native feature at all.

## Compatibility levels

| Level | Meaning |
|---|---|
| **Reference / Full** | Every required guarantee is expressible with the host's native mechanisms, and the implementation is production-proven here |
| **Native-mappable** | Every required primitive has a *verified* native mechanism, but the adapter is not yet built and proven |
| **Researched** | Instruction substrate and some primitives confirmed; no adapter designed |
| **Preliminary** | Partial or unverified substrate; relying on it would be a guess |

"Compatible in theory" is **not** "supported." A platform is only advertised as
supported once its adapter actually runs the methodology.

## The requirement × platform contract

Verified 2026-09-20 against each host's official documentation. Platform
behaviour is version-sensitive; re-verify before relying on a row
(`standards/repository-evidence.md` §2b).

| Requirement | Claude Code | OpenAI Codex |
|---|---|---|
| **Always-on methodology bootstrap** | SessionStart hook injects the charter; **version-stamped** from `plugin.json`; native | `AGENTS.md` (root→CWD cascade, 32 KiB cap), always read; **no version stamp**; native-load, content advisory |
| **Progressive-disclosure skills** | `SKILL.md` + description-driven load; native | `SKILL.md` + `name`/`description`, ≤2% preview, `.agents/skills/`; native |
| **Independent read-only reviewers** | subagents, `disallowedTools`, fresh context; native | subagents `.codex/agents/*.toml`, `sandbox_mode="read-only"`, isolated context; native |
| **Human-approval gate the model cannot self-start** | `disable-model-invocation` gate skills; native + methodology | `policy.allow_implicit_invocation:false`; native + methodology. Plus `approval_policy=on-request` is **hard** for restricted ops |
| **Human-owned operations** (commit/deploy/migrate) | methodology (charter) | methodology; `sandbox_mode`/`approval_policy` can additionally **hard-block** |
| **MCP** | native | native (`[mcp_servers.*]`) |
| **Evidence semantics · quality-bar · risk tiers · execution-efficiency · repository-evidence** | methodology | methodology |

### What each row implies for an adapter

- **The bootstrap has one honest gap on Codex: no version stamp.** Claude Code's
  charter carries the plugin version and auto-updates; a Codex `AGENTS.md` does
  neither. An adapter must surface that a Codex repository can silently run an
  old methodology, rather than imply parity.
- **Both hosts can *hard-gate* a tool call, and Himoa declines to on both.** The
  "methodology, not enforcement" line is platform-independent — it is a design
  choice, not a Claude limitation. An adapter never turns a stated boundary into
  a runtime block just because the host would allow it.
- **Human approval is `native + methodology`, not `hard`.** Neither host makes
  it *impossible* for a misbehaving model to proceed; both prevent the model
  from *invoking the approval gate itself*, and the methodology forbids
  inferring approval. Reporting this as "hard" would be the false equivalence
  this file exists to stop.

## The non-downgrade rule

An adapter **must not silently downgrade**. If a host cannot enforce a required
guarantee at the level the framework needs, the adapter states the limitation —
it never reports "fully supported" for a guarantee that is only advisory on that
host, and it never reinterprets "human approval required" as "the agent may
infer approval."

## Support today

| Platform | Level |
|---|---|
| **Claude Code** | **Reference / Full** — production-proven |
| **OpenAI Codex** | **Supported (initial adapter)** — projection, `$HOME` installer, doctor and repository bootstrap shipped and structurally validated (`docs/cross-agent-architecture.md`). Live end-to-end execution inside Codex has not been smoke-tested here; that evidence is pending, so it is not claimed at parity |
| **Cursor** | **Researched** — reads `AGENTS.md`, has rules/hooks/MCP |
| **GitHub Copilot** | **Researched** — reads `AGENTS.md`; approval enforced structurally via PR review |
| **Gemini CLI** | **Preliminary** — native file is `GEMINI.md`; first-class `AGENTS.md` support unverified |

### Verified corrections (2026-09-20)

Re-verification against current Codex docs changed these details, now reflected
in the adapter: the approval slash command is **`/permissions`** (was
`/approvals`); the `"untrusted"` approval policy is **retired** (use
`on-request`/`never`); `--full-auto` is **deprecated**; hooks are a **production
feature**, not beta. Codex also now has a **plugin marketplace** (`/plugins`),
but its CLI and cache specifics are documented only in secondary sources, so the
adapter targets the **documented loose-file paths** rather than the marketplace
(`standards/repository-evidence.md` §2b — an unverified external mechanism is
not built against).
