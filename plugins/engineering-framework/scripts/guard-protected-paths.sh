#!/usr/bin/env bash
#
# PreToolUse guard for Edit / Write / NotebookEdit against protected paths.
#
# Emits an "ask" decision with a path-specific reason, so the agent learns WHY
# the path is protected and what precondition it must satisfy, rather than
# seeing an anonymous permission prompt. Hard prohibitions belong in
# `permissions.deny` in the repository's `.claude/settings.json`, not here — a
# deny rule cannot fail open, a hook can.
#
# WHAT EARNS A DEFAULT ENTRY
# --------------------------
# Exactly one property: the failure it prevents is **silent, remote and
# unrecoverable**. Editing an already-applied migration corrupts a checksum and
# surfaces mid-deploy in an environment nobody is watching. Editing a CI
# workflow changes what runs with the repository's secrets. Editing an
# infrastructure definition changes real infrastructure on the next apply.
# Hand-editing a lockfile produces a dependency tree nobody resolved.
#
# What deliberately does NOT earn an entry: application source, schema files,
# authorization code, error contracts. Those are already governed by the
# repository's own CLAUDE.md and by the design gate, where a human consciously
# approves touching them. A third check firing on every file edit adds no
# information the reviewer did not already have — a single authorization change
# legitimately touches thirty files, and thirty identical prompts do not make
# the reviewer thirty times more informed. They train the reviewer to click
# through without reading, which is strictly worse than one prompt they read.
#
# Repositories add their own patterns in `.claude/engineering-framework.json`.
#
# Failure policy: FAIL CLOSED. Any inability to inspect the payload degrades to
# "ask" (a human prompt), never to silent approval. Decisions are encoded with
# jq: a repository-authored `reason` containing a quote would otherwise emit
# invalid JSON, which Claude Code cannot parse — so the prompt would vanish and
# the edit would proceed.

set -euo pipefail

script_directory=${0%/*}
[ "$script_directory" != "$0" ] || script_directory='.'

# shellcheck source=./lib/hook.sh
. "${script_directory}/lib/hook.sh"

ef_require_jq 'protected-path guard'

# shellcheck source=./lib/config.sh
. "${script_directory}/lib/config.sh"

IFS= read -r -d '' payload || true
file_path=$(printf '%s' "$payload" |
  jq -r '.tool_input.file_path // .tool_input.notebook_path // .tool_input.path // ""')

if [ -z "$file_path" ]; then
  exit 0 # No file path to classify; defer to the normal permission flow.
fi

# Repository-declared patterns are checked first, so a repository can attach a
# more specific reason to a path the defaults would also match. Costs nothing
# when no policy file exists: ef_config_entries returns immediately.
while IFS="$(printf '\t')" read -r pattern reason _unused; do
  [ -n "$pattern" ] || continue
  # shellcheck disable=SC2254 # The pattern is data and must expand as a glob.
  case "$file_path" in
    $pattern)
      emit_ask "${reason:-this path is listed as protected in .claude/engineering-framework.json. Confirm the change is intended before approving.}"
      ;;
  esac
done <<REPOSITORY_PATTERNS
$(ef_config_entries protectedPaths pattern reason)
REPOSITORY_PATTERNS

if [ "$(ef_config_flag useDefaultProtectedPaths true)" != 'true' ]; then
  exit 0
fi

case "$file_path" in
  */migrations/* | */migrate/versions/* | */db/migrate/*)
    emit_ask "this edits a migration file. Never edit a migration that has already been applied anywhere: its checksum is recorded by the migration tool, and changing it breaks deployment in every environment that already ran it. Approve ONLY for a migration that has not been applied anywhere. Otherwise add a NEW migration."
    ;;
  *.tf | *.tfvars | *.tfvars.json | */terraform/* | */.terraform/* | *.bicep)
    emit_ask "this edits an infrastructure definition. The change becomes real on the next apply, in an environment this session cannot see. Confirm the target workspace and that a plan will be reviewed before it is applied."
    ;;
  */.github/workflows/* | */.gitlab-ci.yml | .gitlab-ci.yml | */.circleci/config.yml | */azure-pipelines.yml | Jenkinsfile | */Jenkinsfile)
    emit_ask "this edits continuous integration configuration, which runs with the repository's secrets and can publish artifacts. Confirm the change does not add a new command, action, or credential scope."
    ;;
  */package-lock.json | package-lock.json | */yarn.lock | yarn.lock | \
    */pnpm-lock.yaml | pnpm-lock.yaml | */bun.lockb | bun.lockb | \
    */composer.lock | composer.lock | */Gemfile.lock | Gemfile.lock | \
    */poetry.lock | poetry.lock | */Pipfile.lock | Pipfile.lock | \
    */Cargo.lock | Cargo.lock | */go.sum | go.sum | \
    */gradle.lockfile | gradle.lockfile | */packages.lock.json)
    emit_ask "this hand-edits a dependency lockfile. A lockfile is generated output: editing it produces a tree no resolver ever verified, and the integrity hashes stop meaning anything. Run the package manager instead."
    ;;
  */.env | .env | */.env.* | .env.*)
    case "$file_path" in
      *.example | *.sample | *.template | *.dist | *.test | *.testing) ;;
      *)
        emit_ask "this writes to a real environment file. Secrets belong to the human and to the secret store, not to a diff. Confirm this is a local development file and that no real credential is being written."
        ;;
    esac
    ;;
esac

exit 0 # Not a protected path; the normal permission flow applies.
