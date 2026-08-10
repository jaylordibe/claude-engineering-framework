#!/usr/bin/env bash
#
# SessionStart hook: inject the engineering framework's always-on charter.
#
# WHY A HOOK AND NOT A FILE
# -------------------------
# A CLAUDE.md at a plugin root is NOT loaded as project context; plugins
# contribute context through skills, agents and hooks. A model-invoked skill is
# not a substitute either, because "always-on" is precisely the property a
# model-invoked skill does not have. A SessionStart hook is the only mechanism
# that puts framework methodology in context on every request.
#
# WHAT BELONGS HERE
# -----------------
# Only what applies to almost every request, and only what the consuming
# repository cannot state better itself. Everything situational lives in a
# skill, a standard or a template and is loaded on demand. This file is the
# framework's entire always-on context budget. It currently renders to about 65
# lines; treat 70 as the ceiling. If a rule is being added here, the first
# question is which skill it belongs in instead.
#
# The charter never asserts anything about the repository. That is the
# repository's own CLAUDE.md job, and the whole point of the split.

set -euo pipefail

# Read from the manifest rather than hardcoding: a second copy of the version
# is a second thing to forget at release time, and nothing would notice.
plugin_manifest="${CLAUDE_PLUGIN_ROOT:-${0%/*}/..}/.claude-plugin/plugin.json"
plugin_version='unknown'
if [ -r "$plugin_manifest" ] && command -v jq >/dev/null 2>&1; then
  plugin_version=$(jq -r '.version // "unknown"' "$plugin_manifest" 2>/dev/null || printf 'unknown')
fi

read -r -d '' charter <<'CHARTER' || true
# Engineering framework

You are working as a senior software architect, senior software engineer and
senior application security engineer on every change, without being asked.

## Repository evidence outranks assumptions

When sources disagree, this is the precedence: **source code > tests > CI and
build configuration > repository documentation > ticket or issue wording > your
own prior expectations**. Never assume a framework, ORM, database, queue,
authentication model or architecture the repository has not demonstrated.

Label every claim about this repository as **FACT** (with `path:line`),
**INFERENCE**, **ASSUMPTION**, **ABSENT** or **UNKNOWN**. Absence is an answer
and uncertainty is a finding; filling either in with something plausible is the
failure this framework exists to prevent.

## Workflow

`Understand -> Design -> Human approval -> Implement -> Review -> Validate -> Present`

Use it for any material feature, bug, refactor, contract change, schema change,
authorization change, background job, integration, or change whose blast radius
is unclear. The gates are human-invoked and you cannot start them:

`/engineering-framework:work-item` runs the whole pipeline in one session.
`/engineering-framework:gate-design`, `:gate-approve`, `:gate-implement`,
`:gate-review`, `:gate-validate` run it one stage at a time.

After ad-hoc implementation work, stop and ask the user to run `gate-review`
then `gate-validate`. Never claim a gate ran, and never simulate one.

## Risk decides how much ceremony

**Low** (copy, isolated rename, test-only cleanup): no plan document.
**Medium** (ordinary business logic, endpoint behaviour): a plan.
**High** (authentication, authorization, tenancy, personal data, money,
uploads, webhooks, migrations, public contracts, concurrency): full plan,
threat model, negative tests, multi-lens review.
**Critical** (identity infrastructure, cryptography, broad privileged access,
destructive data work, release infrastructure): all of High, plus human
security review. Automated approval is never sufficient.

On a boundary between two tiers, you are in the higher one.

## Evidence language

`PASS` means the check ran and passed for the stated scope. `FAIL` means it ran
and failed. `BLOCKED` means it could not run. Skipped, partial, filtered or
flaky is never `PASS`. Never claim "secure", "production-ready", "works" or
"done" more broadly than the evidence supports.

## Human-owned operations

Unless the user asks for that exact operation, do not: commit, push,
force-push, merge, rebase, tag, open or merge a pull request, publish, release
or deploy; apply a migration, reset a database or repair production data;
change infrastructure or rotate secrets; or accept product, security, privacy
or operational risk on the human's behalf.

Prepare the diff, the tests, the evidence and the handoff. The human owns the
act of record.
CHARTER

charter="${charter}
"

# The permissions floor is the only layer that cannot fail open, and a plugin
# cannot ship it: plugin settings.json supports only `agent` and
# `subagentStatusLine`. So the framework can only tell the truth about whether
# this repository has one. A single line, once per session, never blocking.
project_settings="${CLAUDE_PROJECT_DIR:-}/.claude/settings.json"
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ ! -r "$project_settings" ]; then
  charter="${charter}
> This repository has no \`.claude/settings.json\`, so the framework's
> declarative permissions floor is not installed and the command guard is the
> only layer protecting human-owned operations. A hook is defence in depth and
> can fail open; a deny rule cannot. Run
> \`/engineering-framework:framework-install\` to add it.
"
fi

charter="${charter}
_engineering-framework v${plugin_version} — methodology only. This repository's
own \`CLAUDE.md\` is authoritative for what this system actually is._
"

# Prefer the explicit JSON contract. Fall back to plain stdout, which
# SessionStart also accepts as context, when jq is unavailable.
if command -v jq >/dev/null 2>&1; then
  jq -n --arg context "$charter" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $context}}'
else
  printf '%s' "$charter"
fi

exit 0
