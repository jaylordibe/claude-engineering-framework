# Adapter live smoke test

Every non-Claude adapter (Codex, Cursor, Copilot, Gemini) is validated
**structurally** in CI — projection drift, generated-config schema shape,
host-constraint conformance, installer safety against an isolated fake `$HOME`,
no dangling references, and the human-approval and read-only guarantees. What CI
**cannot** do is run the host itself: there is no Codex/Cursor/Copilot/Gemini
runtime in CI or in the environment these adapters were built in. So one piece of evidence is, by
`standards/evidence.md`, **`BLOCKED` there and only obtainable on a machine that
has the host** — a live end-to-end run.

This is that test. It is not run automatically and is not fabricated; run it on a
machine with the host to turn `BLOCKED` into `PASS`. Until then, the adapters are
**Supported (initial adapter)** / **Supported with limitations**, never parity —
see `docs/platform-capabilities.md`.

## What a pass looks like

For each host: after installing the adapter and bootstrapping a throwaway
repository, the host, given a trivial prompt, **reflects the Himoa methodology it
was not told inline** — it states the `Understand → Design → Human approval → …`
workflow, the risk tiers, and the `PASS/FAIL/BLOCKED/N/A` evidence vocabulary,
and it does **not** self-start a gate or claim approval it was not given. That
demonstrates the projected skills / `AGENTS.md` bootstrap actually loaded and
drove the agent.

## Codex

```bash
himoa-codex-install                 # into ~/.agents/skills, ~/.codex/agents, ~/.agents/himoa
mkdir /tmp/himoa-smoke && cd /tmp/himoa-smoke && git init -q
himoa-codex-install --repo          # writes AGENTS.md
himoa-codex-doctor                  # expect PASS on install, skills, reviewers, bootstrap
codex                               # then ask: "What engineering workflow and risk tiers apply here, and how must approval be handled?"
```

**Pass:** the reply states the Himoa workflow, the risk tiers, and that gates are
human-invoked (it will not self-approve). **Fail:** it answers generically, with
no sign the methodology loaded.

## Cursor

```bash
himoa-cursor-install                # shares ~/.agents/skills, ~/.agents/himoa with Codex
cd /tmp/himoa-smoke && himoa-cursor-install --repo
himoa-cursor-doctor
# In Cursor, open the repo and invoke a skill by name (e.g. /himoa-gate-design) or ask the same question as above.
```

**Pass:** the skill loads and the agent works the Himoa methodology; a gate skill
is only invocable by the human (`disable-model-invocation`), not auto-run.

## Gemini CLI

```bash
himoa-gemini-install                # ~/.gemini/agents (read-only reviewers), ~/.gemini/commands/himoa/*.toml (/himoa:*), ~/.gemini/himoa (standards)
cd /tmp/himoa-smoke && himoa-gemini-install --repo   # writes AGENTS.md + .gemini/settings.json so context.fileName includes AGENTS.md
himoa-gemini-doctor
gemini                              # then run /himoa:gate-design, or ask the same question as above
```

**Pass:** the reply works the Himoa methodology loaded from `AGENTS.md` (added to
`context.fileName`); a `/himoa:*` command is human-typed, so the model cannot
self-start a gate; and the reviewer subagents in `~/.gemini/agents/` are
restricted to read-only tools (no `write_file` / `run_shell_command`). **Fail:**
it answers generically, or a gate runs without a human invoking it.

## GitHub Copilot

```bash
cd <a repo Copilot is enabled on> && himoa-copilot-install   # writes AGENTS.md + .github/agents/*.agent.md
himoa-copilot-doctor
git add AGENTS.md .github/agents && git commit -m "himoa: bootstrap for Copilot" && git push
# Assign an issue to Copilot, or @-mention it, so it opens a PR.
```

**Pass:** the PR description / agent behaviour reflects the Himoa methodology from
`AGENTS.md`, and — structurally guaranteed by GitHub — a **human must review and
merge** the PR (the agent cannot self-approve). Reviewer lenses in
`.github/agents/` are **advisory** on Copilot (it has no read-only reviewer
subagent), so confirm they are *available*, not that they run in isolation.

## Recording the result

Report each in `standards/evidence.md` vocabulary with the host version:
`PASS — Codex <version>, methodology loaded and approval boundary held`, or
`FAIL — …` with what was missing. A `PASS` here is what lifts an adapter from
"Supported (initial)" toward parity; do not claim parity without it.
