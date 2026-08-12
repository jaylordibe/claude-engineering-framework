#!/usr/bin/env bash
#
# PreToolUse guard for Bash and PowerShell against operations the engineering
# framework reserves for the human, and against a small set of operations that
# are destructive or exfiltrating in every repository.
#
# WHY THIS EXISTS ALONGSIDE permissions.deny
# ------------------------------------------
# A `permissions.deny` rule such as `Bash(git commit *)` matches a command
# PREFIX. It is therefore structurally blind to the same operation written any
# other way:
#
#   git -C /elsewhere commit -m x            flag before the verb
#   dotenv -e .env -- <migration runner>     environment runner
#   sudo npm publish                         privilege wrapper
#   cat .env                                 the shell, not the Read tool
#
# Claude Code strips a fixed wrapper list before matching deny rules, but not
# environment runners such as dotenv, direnv exec, devbox run or npx. This hook
# parses the whole command, resolves the effective verb behind those forms, and
# closes that gap.
#
# WHY THIS EXISTS AT ALL
# ----------------------
# A plugin cannot ship `permissions.deny`: plugin settings.json supports only
# `agent` and `subagentStatusLine`. So in a repository that has not installed
# the framework's permissions floor, this hook is the ONLY layer. That makes it
# important, and it also makes it insufficient — see below.
#
# WHAT THIS IS NOT
# ----------------
# Defence in depth, not a sandbox, and it must never be documented as one. A
# shell can always express an operation this parser does not model: a verb
# built from a variable, an operation inside a script file, a here-doc. A
# `permissions.deny` rule cannot fail open for the exact forms it names; this
# hook sees far more forms but is executable code that can fail. They are
# complementary and neither is a boundary. For a real boundary use OS
# sandboxing or a container.
#
# FAILURE POLICY
# --------------
# FAIL CLOSED. Any inability to inspect or classify the payload degrades to
# "ask" (a human prompt), never to silent approval. Decisions are encoded with
# jq rather than printf, because a reason containing a quote would otherwise
# emit invalid JSON — which Claude Code cannot parse, which fails OPEN.
#
# CONFIGURATION
# -------------
# Per-repository policy lives in
# `${CLAUDE_PROJECT_DIR}/.claude/engineering-framework.json`. Every key has a
# default, so a repository with no file still gets the intended floor.
# `protectedCommands` lets a repository name its OWN destructive commands,
# which the framework's ecosystem tables cannot know about.
#
# PERFORMANCE
# -----------
# This runs on every Bash call in every repository, forever. It forks one jq
# for the payload, plus two only when a policy file exists. Everything else is
# pure shell. Keep it that way: a fork added here is paid by every user on
# every command.
#
# TESTING
# -------
# Behaviour is pinned by `tests/guard-hook-fixtures.tsv` in the framework
# repository, which runs this script against a decision table in CI. A guard
# that crashes exits non-zero, which Claude Code treats as a non-blocking
# error — so a broken guard fails open. The table is what prevents that, and it
# deliberately includes ordinary commands that must NEVER prompt: a guard that
# nags is switched off within a day, and then it protects nothing.

set -euo pipefail

# Every `case` and `[[` below matches case-INSENSITIVELY.
#
# macOS and Windows both default to case-insensitive filesystems, so `.ENV`,
# `Id_Rsa` and `database/Migrations/` address exactly the same bytes on disk as
# their lowercase spellings. A case-sensitive guard therefore had a one-keypress
# bypass on the two most common developer platforms, which is not a bypass worth
# preserving on the third.
#
# The cost is a slightly wider match on Linux — `GIT COMMIT` is now denied where
# it would previously have failed with "command not found". No legitimate
# command is spelled in a case this changes the classification of, and the
# false-positive rows in tests/guard-hook-fixtures.tsv pin that.
shopt -s nocasematch

script_directory=${0%/*}
[ "$script_directory" != "$0" ] || script_directory='.'

# shellcheck source=./lib/hook.sh
. "${script_directory}/lib/hook.sh"

ef_require_jq 'command guard'

# shellcheck source=./lib/config.sh
. "${script_directory}/lib/config.sh"

ef_read_payload 'command guard'
raw_command=$(ef_payload_string '.tool_input.command // .tool_input.script // ""')

if [ -z "$raw_command" ]; then
  exit 0 # Not a shell-shaped payload; defer to the normal permission flow.
fi

# ---------------------------------------------------------------------------
# Repository policy
# ---------------------------------------------------------------------------

policy_git_writes=$(ef_config_flag humanOwnedGitWrites true)
policy_pull_requests=$(ef_config_flag humanOwnedPullRequests true)
policy_migrations=$(ef_config_flag humanOwnedMigrations true)
policy_deployments=$(ef_config_flag humanOwnedDeployments true)
policy_dependency_install=$(ef_config_flag humanOwnedDependencyInstall false)
policy_default_rules=$(ef_config_flag useDefaultCommandRules true)

# ---------------------------------------------------------------------------
# Classification tables. Single-line, space-delimited, matched by contains_word.
# ---------------------------------------------------------------------------

# Commands that run their own argument list as another command. Resolving past
# these is the entire reason this hook exists.
COMMAND_WRAPPERS=' sudo doas command builtin exec env time nice nohup stdbuf caffeinate setsid ionice flock watch xargs timeout noglob nocorrect npx bunx pnpx dotenv direnv devbox mise rbenv asdf poetry pipenv bundle uv rye hatch nix '

# Wrappers that consume one bare (non-option) token before the real command:
# `timeout 30 ...`, `flock lockfile ...`, `xargs -a list ...`.
WRAPPERS_CONSUMING_ONE_ARGUMENT=' timeout flock watch ionice '

# Wrappers that are ALSO ordinary commands with their own dangerous verbs.
# `poetry run pytest` is a wrapper; `poetry publish` is a publication. Treating
# these as unconditional wrappers made `poetry publish` resolve to `publish`,
# which matches no rule — a silent allow for an operation documented as never
# delegated. They are wrappers only when an execution marker follows.
SUBCOMMAND_INVOKING_WRAPPERS=' poetry pipenv bundle uv rye hatch direnv devbox mise rbenv asdf nix '
EXECUTION_MARKERS=' run exec shell run-script develop '

# Wrappers whose execution marker is followed by a directory or environment
# token before the real command: `direnv exec DIR cmd`, `nix develop DIR -c cmd`.
WRAPPERS_WITH_MARKER_ARGUMENT=' direnv nix '

# Wrapper options that consume the following token as their value, so the token
# after them is an argument rather than the effective command.
#
# `-i` is deliberately ABSENT: `env -i` takes no value, and listing it made
# `env -i git commit` swallow `git` and resolve to `commit`, matching no rule.
WRAPPER_OPTIONS_TAKING_A_VALUE=' -e --env-file -n -C -u -w -f --file --cwd --dir --chdir -p --path -a --arg-file --interval -s --signal --timeout '

# Git subcommands that write history, move HEAD, discard work, or publish.
# Governed by the humanOwnedGitWrites policy.
GIT_WRITE_SUBCOMMANDS=' commit push merge rebase tag reset clean stash checkout switch restore cherry-pick revert am apply remote '

# Git subcommands that rewrite or forge history. Never policy-governed: a
# repository that wants an agent committing on its behalf still does not want
# one rewriting published history.
GIT_HISTORY_REWRITE_SUBCOMMANDS=' filter-branch filter-repo update-ref fast-import replace '

# Package-manager subcommands that are definitely not publication, so a package
# literally named `publish` cannot be mistaken for the verb.
NON_PUBLISHING_SUBCOMMANDS=' install i add remove rm uninstall ci update up upgrade run run-script exec test audit why info view search list ls link unlink pack dedupe outdated init create '

# Commands that move a file's contents to stdout, a variable, a pipe, or
# another path. Touching a credential file with one of these is exposure, not
# inspection.
FILE_CONTENT_READERS=' cat bat less more head tail nl tac strings xxd od base64 grep egrep fgrep rg ag ack sed awk gawk jq yq tee dd cp install source . open pbcopy xclip xsel curl wget http scp rsync '

# Commands that cannot read a file, so a credential path in their arguments is
# text rather than access. Keeps the guard quiet on ordinary narration.
INERT_COMMANDS=' echo printf true false : test [ ls stat file basename dirname realpath find touch mkdir '

# Environment files that hold shapes and test values rather than real secrets.
# Validation legitimately reads these, so they are never blocked.
READABLE_ENVIRONMENT_FILES=' .env.example .env.sample .env.template .env.dist .env.test .env.testing '

contains_word() {
  case "$1" in
    *" $2 "*) return 0 ;;
    *) return 1 ;;
  esac
}

is_option_token() {
  case "$1" in
    -?*) return 0 ;;
    *) return 1 ;;
  esac
}

is_environment_assignment() {
  case "$1" in
    [A-Za-z_]*=*) return 0 ;;
    *) return 1 ;;
  esac
}

# Options that `docker exec` / `kubectl exec` take with a SEPARATE value, which
# must be consumed together with that value or the value is mistaken for the
# container name.
CONTAINER_EXEC_OPTIONS_TAKING_A_VALUE=' -u --user -w --workdir -e --env --env-file --container -n --namespace --detach-keys '

# The command a container-exec invocation runs INSIDE the container.
#
# `docker exec api php artisan migrate` is a migration. It is the same
# operation as the bare `php artisan migrate` this guard already denies, and in
# a containerised repository it is the form people actually type — so resolving
# past the container boundary is the difference between governing a repository
# and governing only the half of it that runs on the host.
#
# Everything after `--` wins when present (the kubectl form). Otherwise skip the
# exec flags, then one bare token for the container or service name. Returns
# empty when no inner command remains, which keeps the caller's "cannot classify
# it" fallback reachable for `docker exec -it api sh`.
container_exec_inner_command() {
  set -f # Never let a segment's own glob expand against the real filesystem.
  # shellcheck disable=SC2086 # Deliberate word splitting: we are tokenising.
  set -- $1
  set +f

  # The explicit separator removes all ambiguity, so prefer it.
  for token in "$@"; do
    if [ "$token" = '--' ]; then
      while [ "$#" -gt 0 ] && [ "$1" != '--' ]; do shift; done
      shift # past the separator itself
      printf '%s' "$*"
      return 0
    fi
  done

  while [ "$#" -gt 0 ] && is_option_token "$1"; do
    if contains_word "$CONTAINER_EXEC_OPTIONS_TAKING_A_VALUE" "$1" && [ "$#" -gt 1 ]; then
      shift
    fi
    shift
  done

  shift # the container or service name
  printf '%s' "$*"
}

# `bash -c "php artisan migrate:fresh"` hides the real command inside a string
# argument. Unwrap it, or the inner command resolves to the shell itself and
# matches no rule.
shell_dash_c_payload() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  candidate=${1:-}
  case "${candidate##*/}" in
    sh | bash | zsh | ash | dash | ksh) ;;
    *) return 1 ;;
  esac
  shift

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -*c*)
        shift
        [ "$#" -gt 0 ] || return 1
        printf '%s' "$(strip_surrounding_quotes "$*")"
        return 0
        ;;
      -*) shift ;;
      *) return 1 ;;
    esac
  done

  return 1
}

# A container-exec fallback prompt only earns its place when the first pass had
# nothing to work with.
#
# classify_container_exec_inner already runs the inner command through every
# rule in this file — `docker exec api php artisan migrate` denies, `docker exec
# api psql` asks. Firing a second, blanket prompt after that pass told the human
# nothing the pass had not already decided, and it fired on `docker exec api
# php artisan test`, which is how a containerised repository runs its tests.
# For those repositories it was the single noisiest rule in the guard.
#
# An interactive shell is the case that genuinely survives classification:
# `docker exec -it api bash` opens a session this guard will never see again.
inner_is_unclassifiable() {
  inner=$(container_exec_inner_command "$1")
  [ -n "$inner" ] || return 0 # No inner command at all: an implicit shell.

  set -f
  # shellcheck disable=SC2086
  set -- $inner
  set +f

  case "${1##*/}" in
    sh | bash | zsh | ash | dash | ksh | fish) return 0 ;;
  esac

  return 1
}

# `-v` on a teardown is the flag that turns "stop the stack" into "destroy the
# data in it". The reason string already asked the human to check for it, which
# is a check the guard can simply do.
has_volume_flag() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -v | --volumes | -[!-]*v*) return 0 ;;
    esac
    shift
  done

  return 1
}

# `git branch` and `git worktree` both list by default and mutate only when
# asked. Prompting on the whole verb meant `git branch -a` — the single most
# common way to find out what exists — cost an approval, and an approval spent
# on a listing is an approval not spent on the deletion.
#
# A prefix rule cannot make this distinction, which is why the floor no longer
# carries `Bash(git branch *)` and this function exists instead.
is_git_ref_mutation() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  [ "$#" -gt 0 ] || return 1
  case "$1" in
    worktree)
      # list is the only read-only worktree subcommand; add, remove, move,
      # prune, lock, unlock and repair all change something on disk.
      [ "${2:-list}" = 'list' ] && return 1
      return 0
      ;;
    branch) shift ;;
    *) return 1 ;;
  esac

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -d | -D | -M | -C | --delete | --move | --copy | --set-upstream-to* | \
        --unset-upstream | --edit-description | -u)
        return 0
        ;;
      # -m is move, but only with a name; bare `git branch -m` is invalid.
      -m) return 0 ;;
      # These take a value that is NOT a branch being created. Consuming the
      # value here is what keeps `git branch --contains HEAD` a listing.
      --contains | --no-contains | --merged | --no-merged | --points-at | \
        --sort | --format | --color)
        shift
        [ "$#" -gt 0 ] && shift
        ;;
      -*) shift ;;
      # A positional word is a branch name, and naming a branch creates it.
      *) return 0 ;;
    esac
  done

  return 1
}

# `gh api` and `glab api` read by default. Prompting on the verb meant every
# read cost an approval; the method is right there in the command, so classify
# on it. gh switches to POST implicitly when a field flag is present, so the
# field flags count as a write.
is_api_write_call() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  while [ "$#" -gt 0 ]; do
    case "$1" in
      # Both cases are spelled out rather than folded: bash 3.2 has no
      # ${var^^}, and `tr` here would fork on the hot path of every command.
      -X | --method)
        shift
        case "${1:-}" in
          POST | post | PUT | put | PATCH | patch | DELETE | delete) return 0 ;;
        esac
        ;;
      -X* | --method=*)
        case "${1#*[=X]}" in
          POST | post | PUT | put | PATCH | patch | DELETE | delete) return 0 ;;
        esac
        ;;
      -f | -F | --field | --raw-field | --input | --field=* | --raw-field=* | --input=*)
        return 0
        ;;
    esac
    shift
  done

  return 1
}

# An interpreter handed a PROGRAM on the command line rather than a path.
#
# WHY THIS IS THE LINE, AND RUNNING A SCRIPT FILE IS NOT.
# The guard cannot read the program either way — Python is not shell. What
# differs is what the human sees. `python3 -c 'import shutil; shutil.rmtree(p)'`
# puts the code in the prompt, so the prompt is worth reading. A prompt on
# `python3 scripts/fix_imports.py` shows a filename and nothing else: the human
# would have to go and open the file to learn anything, which nobody does at
# prompt number fifteen. An uninformative prompt is not a weaker control than
# an informative one, it is a worse one, because it is what trains the reflex
# that later approves the migration.
#
# The same blindness already applies to `npm run`, `make` and `rake`, which are
# allowed. This is defence in depth, not a sandbox — see the file header.
is_inline_code_execution() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  case "${1##*/}" in
    python | python2 | python3 | python[0-9].[0-9] | python[0-9].[0-9][0-9] | \
      node | deno | ruby | perl | php) ;;
    *) return 1 ;;
  esac
  shift

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -c | -e | -r | -p | --eval | --print) return 0 ;;
      # A short-flag cluster: `python3 -uc '…'` is the same operation with the
      # same blindness, and a fixed list of single flags never sees it.
      -[!-]*[cerp]) return 0 ;;
      -*) shift ;;
      *) return 1 ;;
    esac
  done

  return 1
}

# Classify what a container-exec invocation actually runs, then return to the
# caller when nothing matched. classify_segment exits the process through
# emit_decision when it finds something, so a plain return here means
# "unclassified" and the caller's ask is still the right answer.
#
# The depth guard stops `docker exec a docker exec a ...` recursing without
# bound; two levels is already past anything a real command does.
container_exec_recursion_depth=0

classify_container_exec_inner() {
  [ "$container_exec_recursion_depth" -lt 2 ] || return 0

  inner=$(container_exec_inner_command "$1")
  [ -n "$inner" ] || return 0

  if payload=$(shell_dash_c_payload "$inner"); then
    inner=$payload
  fi

  container_exec_recursion_depth=$((container_exec_recursion_depth + 1))
  classify_segment "$inner"
  container_exec_recursion_depth=$((container_exec_recursion_depth - 1))
}

# Basename and quote stripping without forking. These run once per token of
# every command, so `$(basename …)` and `$(… | tr …)` cost a subshell plus an
# exec per token — measurably the largest avoidable cost in this hook.
basename_of() {
  printf '%s' "${1##*/}"
}

strip_surrounding_quotes() {
  stripped=${1//\"/}
  printf '%s' "${stripped//\'/}"
}

# A protected secret path: any .env variant other than the readable ones, plus
# private key and credential material. A glob such as `.env*` counts, since it
# expands onto a protected file.
is_protected_secret_path() {
  candidate=$(strip_surrounding_quotes "$1")
  candidate=${candidate##*/}

  if contains_word "$READABLE_ENVIRONMENT_FILES" "$candidate"; then
    return 1
  fi

  case "$candidate" in
    .env | .env.* | .env\* | \
      *.pem | *.key | *.p12 | *.pfx | *.jks | *.keystore | \
      id_rsa* | id_ed25519* | id_ecdsa* | id_dsa* | \
      .npmrc | .pypirc | .netrc | credentials | credentials.json | \
      service-account*.json | *.kubeconfig)
      return 0
      ;;
    *) return 1 ;;
  esac
}

# Every non-option token of an argument list, space-delimited. `git -C /repo
# commit -m x` yields `commit x`, so the subcommand is simply the first word.
#
# Quotes are stripped from every token. The shell strips them before `git`ever
# sees them, so `git 'commit' -m x`, `git "com""mit"` and `git commit` are the
# same command — but a guard comparing raw tokens saw three different ones, and
# `permissions.deny` prefix rules do not see through quoting either. That made a
# single pair of quotes a bypass of BOTH layers at once.
#
# This cannot know which unlisted long option takes a value, which is why the
# dangerous-verb checks below scan ALL words rather than only the first two:
# `npm --prefix /tmp publish` would otherwise present `/tmp` as its subcommand.
positional_arguments() {
  set -f # Never let a segment's own glob expand against the real filesystem.
  # shellcheck disable=SC2086 # Deliberate word splitting: we are tokenising.
  set -- $1
  set +f

  collected=''
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --) ;;
      -C | -c | --git-dir | --work-tree | --namespace | --exec-path | \
        --config-env | -m | --message | -n | -f | --file | \
        --context | --kubeconfig | --chdir | --prefix | --workspace | \
        --filter | --registry | --tag | --otp | --cwd | --dir)
        if [ "$#" -gt 1 ]; then shift; fi
        ;;
      -?*) ;;
      *)
        # Inline rather than `$(strip_surrounding_quotes ...)`: this runs once
        # per token of every command, and a command substitution here is a fork
        # per token paid by every user on every call.
        unquoted=${1//\"/}
        collected="$collected ${unquoted//\'/}"
        ;;
    esac
    shift
  done

  printf '%s' "${collected# }"
}

# The effective command of one segment: the first token that is not an
# environment assignment, an option, a `--` terminator, or a command wrapper.
# Prints `<command><TAB><remaining arguments>`.
resolve_effective_command() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  while [ "$#" -gt 0 ]; do
    token=$1

    if [ "$token" = '--' ] || is_environment_assignment "$token"; then
      shift
      continue
    fi

    if is_option_token "$token"; then
      if contains_word "$WRAPPER_OPTIONS_TAKING_A_VALUE" "$token" && [ "$#" -gt 1 ]; then
        shift
      fi
      shift
      continue
    fi

    # Quotes come off before the basename, so `'/usr/bin/git'` and `"git"`
    # resolve to the same verb the shell would actually run. Inline for the same
    # reason as in positional_arguments: no fork on the hot path.
    unquoted_token=${token//\"/}
    unquoted_token=${unquoted_token//\'/}
    token_name=${unquoted_token##*/}

    # A subcommand-invoking wrapper is only a wrapper when an execution marker
    # follows it. Otherwise it is an ordinary command with its own verbs, and
    # falling through is what lets `poetry publish` be classified at all.
    if contains_word "$SUBCOMMAND_INVOKING_WRAPPERS" "$token_name"; then
      if [ "$#" -gt 1 ] && contains_word "$EXECUTION_MARKERS" "$2"; then
        shift 2
        if contains_word "$WRAPPERS_WITH_MARKER_ARGUMENT" "$token_name" &&
          [ "$#" -gt 0 ] && ! is_option_token "$1"; then
          shift
        fi
        continue
      fi
      shift
      printf '%s\t%s' "$token_name" "$*"
      return 0
    fi

    if contains_word "$COMMAND_WRAPPERS" "$token_name"; then
      shift
      if contains_word "$WRAPPERS_CONSUMING_ONE_ARGUMENT" "$token_name"; then
        # Skip the wrapper's OWN options first. `timeout -s KILL 5 git commit`
        # otherwise consumed `KILL` as the bare argument and resolved to `5`.
        while [ "$#" -gt 0 ] && is_option_token "$1"; do
          if contains_word "$WRAPPER_OPTIONS_TAKING_A_VALUE" "$1" && [ "$#" -gt 1 ]; then
            shift
          fi
          shift
        done
        if [ "$#" -gt 0 ] && ! is_option_token "$1"; then
          shift
        fi
      fi
      continue
    fi

    shift
    printf '%s\t%s' "$token_name" "$*"
    return 0
  done

  printf '\t'
}

# ---------------------------------------------------------------------------
# Whole-command rules, evaluated before the command is split into segments
# ---------------------------------------------------------------------------

# Piping a downloaded script straight into an interpreter executes code nobody
# reviewed, from a host that can serve different bytes next time. This has to
# run before segment splitting, because splitting on `|` is exactly what
# destroys the evidence.
#
# Gated on a cheap substring test: the regex pipeline costs three processes,
# and almost no real command mentions a downloader at all.
classify_remote_script_execution() {
  case "$raw_command" in
    *curl* | *wget* | *fetch* | *iwr* | *Invoke-WebRequest*) ;;
    *) return 0 ;;
  esac

  if [[ $raw_command =~ (curl|wget|fetch|Invoke-WebRequest|iwr)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|k|da|fi)?sh([[:space:]]|$) ]]; then
    emit_deny 'this pipes a downloaded script directly into a shell. The code is never reviewed and the host can serve different bytes on the next run. Download it to a file, read it, then run it.'
  fi

  if [[ $raw_command =~ (curl|wget|fetch)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(python[0-9.]*|node|ruby|perl|php)([[:space:]]|$) ]]; then
    emit_deny 'this pipes a downloaded script directly into an interpreter. The code is never reviewed. Download it to a file, read it, then run it.'
  fi

  if [[ $raw_command =~ (ba|z|k|da)?sh[[:space:]]+-c[[:space:]]*.{0,20}\$\((curl|wget|fetch) ]]; then
    emit_deny 'this executes the output of a network fetch as a shell command. Download it to a file, read it, then run it.'
  fi
}

# A repository knows its own destructive commands — `make db-reset`,
# `bin/deploy.sh`, an internal CLI — and the framework's ecosystem tables never
# will. This is the command-side equivalent of `protectedPaths`, checked before
# the built-in tables so a repository-authored reason wins.
classify_repository_commands() {
  segment=$1

  while IFS="$(printf '\t')" read -r match reason decision; do
    [ -n "$match" ] || continue
    # shellcheck disable=SC2254 # The pattern is data and must expand as a glob.
    case "$segment" in
      $match)
        case "$decision" in
          deny) emit_deny "${reason:-this command is listed as human-owned in .claude/engineering-framework.json.}" ;;
          *) emit_ask "${reason:-this command is listed as needing review in .claude/engineering-framework.json.}" ;;
        esac
        ;;
    esac
  done <<REPOSITORY_COMMANDS
$(ef_config_entries protectedCommands match reason decision)
REPOSITORY_COMMANDS
}

# ---------------------------------------------------------------------------
# Per-segment rules
# ---------------------------------------------------------------------------

# `rm -r` aimed at a filesystem or home root is unrecoverable and never part of
# a legitimate change. Ordinary project-local cleanup stays unprompted.
classify_recursive_removal() {
  set -f
  # shellcheck disable=SC2086
  set -- $1
  set +f

  removal_is_recursive=false
  for token in "$@"; do
    case "$token" in
      --recursive) removal_is_recursive=true ;;
      --*) ;;
      -*r* | -*R*) removal_is_recursive=true ;;
    esac
  done
  [ "$removal_is_recursive" = true ] || return 0

  for token in "$@"; do
    if is_option_token "$token"; then continue; fi
    # These are literal patterns matched against the text of the command the
    # user is about to run, not paths this script dereferences. `~` and `$HOME`
    # must stay unexpanded so `rm -rf ~` is recognised as written.
    # shellcheck disable=SC2088
    case "$(strip_surrounding_quotes "$token")" in
      / | /\* | '~' | '~/'* | '$HOME' | '$HOME/'* | '${HOME}'* | . | .. | ./ | ../ | '*')
        emit_deny 'this recursively removes a filesystem or home directory root. Destroying data outside the change under review is never part of an approved diff.'
        ;;
      /*)
        # An absolute path shallower than three segments is a system directory.
        depth=${token//[!\/]/}
        if [ "${#depth}" -lt 3 ]; then
          emit_ask 'this recursively removes a top-level system path. Confirm the target is inside this project before approving.'
        fi
        ;;
    esac
  done
}

classify_credential_exposure() {
  effective_command=$1
  segment=$2

  if contains_word "$INERT_COMMANDS" "$effective_command"; then
    return 0
  fi

  set -f
  # shellcheck disable=SC2086
  set -- $segment
  set +f

  for token in "$@"; do
    if is_protected_secret_path "$token"; then
      if contains_word "$FILE_CONTENT_READERS" "$effective_command"; then
        emit_deny 'this reads or copies the contents of a real environment file, private key or credential file through the shell. A Read rule only governs the Read tool, so the shell is where this leaks. Use the example or test variant for shape, and ask the user for any value you genuinely need.'
      fi
      emit_ask 'this command references a real environment file, private key or credential file. Approve only if it neither reads nor copies the contents.'
    fi
  done
}

# The publication verb for a command family, or empty when the command does not
# publish anything. Checked against EVERY positional word rather than only the
# subcommand, because an unlisted option that takes a value shifts the verb out
# of the position a fixed lookup would inspect.
publication_verbs_for() {
  case "$1" in
    npm | yarn | pnpm | bun | npx | cargo | poetry | uv | hatch | rye | flit) printf ' publish ' ;;
    gem) printf ' push ' ;;
    twine) printf ' upload ' ;;
    mvn | gradle | gradlew) printf ' deploy publish release ' ;;
    docker | podman) printf ' push ' ;;
    *) printf '' ;;
  esac
}

# Migration and schema-application verbs across ecosystems. Applying a schema
# or data change is an act against a live system, not a build step.
is_migration_invocation() {
  command_name=$1
  subcommand=$2
  action=$3

  case "$command_name" in
    prisma)
      case "$subcommand" in migrate | db) return 0 ;; esac
      ;;
    knex)
      case "$subcommand" in migrate:latest | migrate:up | migrate:down | migrate:rollback | seed:run) return 0 ;; esac
      ;;
    sequelize)
      case "$subcommand" in db:migrate | db:migrate:undo | db:seed | db:seed:all | db:drop) return 0 ;; esac
      ;;
    typeorm)
      case "$subcommand" in migration:run | migration:revert | schema:sync | schema:drop) return 0 ;; esac
      ;;
    alembic)
      case "$subcommand" in upgrade | downgrade | stamp) return 0 ;; esac
      ;;
    flyway)
      case "$subcommand" in migrate | clean | undo | baseline | repair) return 0 ;; esac
      ;;
    liquibase)
      case "$subcommand" in update | rollback | dropAll | update-sql) return 0 ;; esac
      ;;
    goose | dbmate | migrate)
      case "$subcommand" in up | down | redo | reset | drop | rollback) return 0 ;; esac
      ;;
    atlas)
      case "$subcommand" in
        schema | migrate)
          case "$action" in apply | push) return 0 ;; esac
          ;;
      esac
      ;;
    php)
      # `php artisan <verb>` — the interpreter is the effective command, so the
      # framework's own entry point is one token further along.
      if [ "$subcommand" = 'artisan' ]; then
        # Read-only inspection is excluded before the glob below, which would
        # otherwise swallow it. Reporting which migrations have run changes
        # nothing, and it is how an agent establishes the schema state it is
        # about to reason about — the same exemption the script-name heuristic
        # already makes for ':status' and ':check'.
        case "$action" in migrate:status) return 1 ;; esac
        case "$action" in migrate | migrate:* | db:wipe | db:seed) return 0 ;; esac
      fi
      ;;
    python | python3)
      if [ "$subcommand" = 'manage.py' ]; then
        case "$action" in migrate | flush | sqlflush) return 0 ;; esac
      fi
      ;;
    rails | rake)
      case "$subcommand" in db:migrate | db:rollback | db:drop | db:reset | db:setup | db:schema:load | db:seed) return 0 ;; esac
      ;;
    artisan)
      case "$subcommand" in migrate | migrate:fresh | migrate:refresh | migrate:reset | migrate:rollback | db:wipe | db:seed) return 0 ;; esac
      ;;
    dotnet)
      if [ "$subcommand" = 'ef' ]; then
        case "$action" in database) return 0 ;; esac
      fi
      ;;
    manage.py | django-admin)
      case "$subcommand" in migrate | flush | sqlflush) return 0 ;; esac
      ;;
  esac

  return 1
}

# A package script whose name says it applies migrations, resets a database or
# seeds data. Read-only variants (`:status`, `:check`, `:list`, `:diff`,
# `:dry-run`, `:generate`, `:create-only`) are deliberately excluded — those are
# how an agent is supposed to inspect and prepare schema work.
#
# This is a naming heuristic over conventions the framework does not own. A
# repository whose destructive scripts are named differently declares them in
# `protectedCommands` rather than hoping this list guessed right.
is_migration_script_name() {
  case "$1" in
    *:status | *:check | *:list | *:diff | *:dry-run | *:generate | *:create-only | *:validate)
      return 1
      ;;
  esac

  case "$1" in
    migrate | migrate:* | db:migrate* | db:push | db:reset | db:drop | db:wipe | \
      db:seed* | seed | seed:* | prisma:migrate | prisma:deploy | prisma:reset | \
      prisma:seed | schema:sync | schema:drop)
      return 0
      ;;
  esac

  return 1
}

is_deployment_invocation() {
  command_name=$1
  subcommand=$2

  case "$command_name" in
    terraform | tofu)
      case "$subcommand" in apply | destroy | import | taint | untaint) return 0 ;; esac
      ;;
    pulumi)
      case "$subcommand" in up | destroy | refresh) return 0 ;; esac
      ;;
    kubectl | oc)
      case "$subcommand" in apply | delete | replace | patch | scale | rollout | drain | cordon | uncordon) return 0 ;; esac
      ;;
    helm)
      case "$subcommand" in install | upgrade | uninstall | rollback | delete) return 0 ;; esac
      ;;
    serverless | sls | vercel | netlify | fly | flyctl | heroku | wrangler | eb | sam)
      case "$subcommand" in deploy | release | rollback) return 0 ;; esac
      ;;
    ansible-playbook) return 0 ;;
    aws)
      case "$subcommand" in cloudformation | ecs | eks | lambda) return 0 ;; esac
      ;;
  esac

  return 1
}

classify_segment() {
  segment=$1

  classify_repository_commands "$segment"
  [ "$policy_default_rules" = 'true' ] || return 0

  resolution=$(resolve_effective_command "$segment")
  effective_command=${resolution%%	*}
  effective_arguments=${resolution#*	}
  [ -n "$effective_command" ] || return 0

  # The verb is classified before the credential scan: an environment runner
  # such as `dotenv -e .env -- <migration runner>` names a credential file, but
  # "this applies a migration" is the finding that matters, and the more
  # specific reason is the one worth showing the human.
  words=$(positional_arguments "$effective_arguments")
  subcommand=${words%% *}
  remaining_words=${words#"$subcommand"}
  action=${remaining_words# }
  action=${action%% *}

  # Publication, checked across every positional word. `yarn npm publish` and
  # `npm --prefix /tmp publish` both put the verb somewhere a fixed lookup does
  # not reach, and both are documented as never delegated.
  publication_verbs=$(publication_verbs_for "$effective_command")
  if [ -n "$publication_verbs" ] &&
    ! contains_word "$NON_PUBLISHING_SUBCOMMANDS" "$subcommand"; then
    for word in $words; do
      if contains_word "$publication_verbs" "$word"; then
        emit_deny "$effective_command $word publishes a package, image or release. Publication is an act of record and belongs to the human."
      fi
    done
  fi

  case "$effective_command" in
    git)
      if contains_word "$GIT_HISTORY_REWRITE_SUBCOMMANDS" "$subcommand"; then
        emit_deny "git $subcommand rewrites or forges repository history. This is never delegated, regardless of repository policy."
      fi

      if [ "$subcommand" = 'push' ]; then
        case " $effective_arguments " in
          *' --force '* | *' -f '* | *' --force-with-lease '* | *' --force-if-includes '* | *' --mirror '* | *' --delete '*)
            emit_deny 'a force or delete push can destroy commits other people depend on and cannot be undone from this side. The human owns this operation without exception.'
            ;;
        esac
      fi

      if [ "$policy_git_writes" = 'true' ] &&
        contains_word "$GIT_WRITE_SUBCOMMANDS" "$subcommand"; then
        emit_deny "git $subcommand writes history, moves HEAD, discards work or publishes it, and this repository reserves Git writes for the human. Prepare the diff and let the user commit. Read-only inspection with status, diff, log, show and blame stays allowed. Set policy.humanOwnedGitWrites to false in .claude/engineering-framework.json to change this."
      fi

      case "$subcommand" in
        worktree | branch)
          # The RAW arguments, not `$words`: positional_arguments drops option
          # tokens, so `git branch --contains HEAD` arrived here as
          # "branch HEAD" and the value read as a branch name being created.
          if is_git_ref_mutation "$effective_arguments"; then
            emit_ask "git $subcommand is creating, deleting or moving a ref here rather than listing. Confirm the ref and that no work depends on it."
          fi
          ;;
      esac
      ;;

    gh)
      case "$subcommand" in
        pr)
          if [ "$policy_pull_requests" = 'true' ]; then
            case "$action" in
              create | merge | close | edit | ready | review)
                emit_deny "gh pr $action publishes or changes a pull request, which this repository reserves for the human."
                ;;
            esac
          fi
          ;;
        release | workflow)
          emit_deny "gh $subcommand publishes a release or triggers a workflow. Releasing is an act of record and belongs to the human."
          ;;
        api)
          if is_api_write_call "$effective_arguments"; then
            emit_ask 'gh api is being called with a write method, which changes state on the forge. Confirm the endpoint and the payload; a write here is a human-owned operation.'
          fi
          ;;
      esac
      ;;

    glab)
      case "$subcommand" in
        mr)
          if [ "$policy_pull_requests" = 'true' ]; then
            case "$action" in
              create | merge | close | update | approve)
                emit_deny "glab mr $action publishes or changes a merge request, which this repository reserves for the human."
                ;;
            esac
          fi
          ;;
        release)
          emit_deny 'glab release publishes a release. Releasing is an act of record and belongs to the human.'
          ;;
        api)
          if is_api_write_call "$effective_arguments"; then
            emit_ask 'glab api is being called with a write method, which changes state on the forge. Confirm the endpoint and the payload; a write here is a human-owned operation.'
          fi
          ;;
      esac
      ;;

    docker | docker-compose | podman)
      case "$subcommand" in
        volume)
          case "$action" in
            rm | prune)
              emit_deny 'removing or pruning volumes destroys database and cache data outside the change under review, including stacks belonging to other projects.'
              ;;
          esac
          ;;
        system)
          if [ "$action" = 'prune' ]; then
            emit_deny 'docker system prune destroys volumes and images beyond this project.'
          fi
          ;;
        compose)
          case "$action" in
            down)
              if has_volume_flag "$effective_arguments"; then
                emit_ask 'docker compose down -v destroys this stack'"'"'s volumes, and with them any database or cache data in it that is not reproducible from the repository. Confirm losing it is acceptable.'
              fi
              ;;
            exec | run)
              # `compose exec <service> <cmd>`: drop the `compose` and the verb,
              # then classify what actually runs. Without this, every guarded
              # verb reached a live service unclassified.
              #
              # The fallback question is asked BEFORE classifying, because
              # classify_container_exec_inner re-enters classify_segment and
              # that overwrites `effective_arguments` and `action`. Reading them
              # afterwards classified the inner command's own arguments.
              # An `if`, never `x=$(… && printf ask)`: under `set -e` a failing
              # command substitution takes the whole script down, and a guard
              # that dies exits non-zero, which Claude Code treats as a
              # non-blocking error. It fails OPEN. This exact line silently
              # un-denied `docker exec api git commit` while under test.
              container_exec_fallback=''
              if inner_is_unclassifiable "${effective_arguments#*"$action"}"; then
                container_exec_fallback='ask'
              fi
              classify_container_exec_inner "${effective_arguments#*"$action"}"
              if [ "$container_exec_fallback" = 'ask' ]; then
                emit_ask 'this opens a shell inside a compose service, where nothing further can be classified. Confirm the session stays read-only and is not against production.'
              fi
              ;;
          esac
          ;;
        down)
          if has_volume_flag "$effective_arguments"; then
            emit_ask 'tearing the stack down with -v destroys its volumes, and with them any database or cache data in it that is not reproducible from the repository. Confirm losing it is acceptable.'
          fi
          ;;
        exec)
          # Classify the inner command first. It is the same operation whether
          # it runs on the host or one process boundary away, and in a
          # containerised repository this is the form people actually type.
          # The leading `exec` must go, or it is consumed as the container name.
          # Asked before classifying, and as an `if`, for the two reasons given
          # under `compose` above.
          container_exec_fallback=''
          if inner_is_unclassifiable "${effective_arguments#*exec}"; then
            container_exec_fallback='ask'
          fi
          classify_container_exec_inner "${effective_arguments#*exec}"
          if [ "$container_exec_fallback" = 'ask' ]; then
            emit_ask 'this opens a shell inside a container, where nothing further can be classified. Confirm the session stays read-only and is not against production.'
          fi
          ;;
      esac
      ;;

    dropdb | pg_dropcluster)
      emit_deny 'this drops a database. Destroying data is a human-owned operation.'
      ;;

    mysqladmin)
      if [ "$subcommand" = 'drop' ]; then
        emit_deny 'this drops a database. Destroying data is a human-owned operation.'
      fi
      ;;

    psql | mysql | mariadb | mongosh | mongo | redis-cli | sqlite3 | cqlsh)
      emit_ask "$effective_command opens a live database session, where this guard cannot see the statement. Approve only for read-only inspection against a development or test instance, never against production."
      ;;

    rm)
      classify_recursive_removal "$effective_arguments"
      ;;

    npm | yarn | pnpm | bun | npx)
      case "$subcommand" in
        install | add | remove | uninstall | ci | up | upgrade)
          if [ "$policy_dependency_install" = 'true' ]; then
            emit_ask "$effective_command $subcommand changes this project's dependency tree, and a new dependency is new code running with your privileges. Confirm the package, its version and its provenance."
          fi
          ;;
        *)
          # A migration script name anywhere in the words, so an unlisted option
          # that takes a value cannot shift the script name out of view.
          if [ "$policy_migrations" = 'true' ]; then
            for word in $words; do
              if [ "$word" != 'run' ] && [ "$word" != 'run-script' ] &&
                is_migration_script_name "$word"; then
                emit_deny "the script '$word' applies a migration, resets a database or seeds data. This repository leaves that to the human. Read-only variants such as ':status' and ':check' stay available. Set policy.humanOwnedMigrations to false in .claude/engineering-framework.json to change this."
              fi
            done
          fi
          ;;
      esac
      ;;

    make)
      case "$subcommand" in
        deploy | release | publish)
          emit_ask "make $subcommand names a deployment or release target, which this guard cannot inspect. Confirm what it actually runs."
          ;;
      esac
      ;;

    kubectl | oc)
      if [ "$subcommand" = 'exec' ]; then
        # A cluster workload is the least forgiving place to run an unclassified
        # command, so classify past the `--` separator before falling back.
        classify_container_exec_inner "${effective_arguments#*exec}"
        emit_ask 'this runs an arbitrary command inside a cluster workload, where this guard cannot classify it. Confirm the inner command is read-only and the context is not production.'
      fi
      ;;
  esac

  if [ "$policy_migrations" = 'true' ] &&
    is_migration_invocation "$effective_command" "$subcommand" "$action"; then
    emit_deny "this applies a schema or data change to a database. Migration application is a human-owned operation: prepare the migration file, verify the shape with the repository's build or type check, and let the human apply it. Set policy.humanOwnedMigrations to false in .claude/engineering-framework.json to change this."
  fi

  if [ "$policy_deployments" = 'true' ] &&
    is_deployment_invocation "$effective_command" "$subcommand"; then
    emit_deny "this changes deployed infrastructure or releases software. Deployment is a human-owned operation. Prepare the change and the plan output; the human applies it. Set policy.humanOwnedDeployments to false in .claude/engineering-framework.json to change this."
  fi

  classify_credential_exposure "$effective_command" "$segment"

  # A privilege wrapper that survived every rule above still deserves a human
  # look: whatever it runs, it runs as another user.
  case "$segment" in
    *sudo\ * | *doas\ *)
      emit_ask 'this runs with elevated privileges. Confirm the operation genuinely needs root and that its effects stay inside this project.'
      ;;
  esac

  if is_inline_code_execution "$segment"; then
    emit_ask 'this hands a program to an interpreter on the command line, where no rule here can read it. The program is in this prompt: read it, and approve it if it only does what the task needs. Running a script FILE is not prompted, so prefer writing the code to a file when it is long enough that reading it here is not realistic.'
  fi

  # LAST, and only after every rule above has had the outer segment.
  #
  # `bash -c 'git push --force'` reached here silent: the deny rules see `bash`,
  # and the segment splitter only trips over the payload when it happens to
  # hold a shell metacharacter. A shell payload IS shell, so re-entering
  # classify_segment gives it every rule in this file rather than a blanket
  # prompt — `bash -c 'ls'` stays silent, `bash -c 'git push'` denies.
  #
  # Running it last matters twice: the outer segment keeps its own findings
  # (the sudo check above reads `$segment`), and recursion may clobber every
  # global this function sets, which is safe only once nothing reads them again.
  if payload=$(shell_dash_c_payload "$segment"); then
    if [ "$container_exec_recursion_depth" -lt 2 ]; then
      container_exec_recursion_depth=$((container_exec_recursion_depth + 1))
      classify_segment "$payload"
      container_exec_recursion_depth=$((container_exec_recursion_depth - 1))
    fi
  fi
}

# ---------------------------------------------------------------------------
# Walk the command
# ---------------------------------------------------------------------------

classify_remote_script_execution

# Claude Code treats &&, ||, ;, |, |&, & and newlines as command separators and
# matches each subcommand independently; command substitution hides one more
# level. Splitting on all of them means a guarded verb cannot be smuggled in as
# the tail of an otherwise innocent line.
#
# The loop must NOT run in a pipeline: emit_decision exits, and from a subshell
# that would print a decision and then let the remaining segments print more,
# producing two JSON objects on stdout.

while IFS= read -r segment; do
  case "$segment" in
    *[![:space:]]*) classify_segment "$segment" ;;
  esac
done <<SEGMENTS
$(printf '%s\n' "$raw_command" | tr ';|&()`' '\n\n\n\n\n\n')
SEGMENTS

exit 0 # Nothing matched; the normal permission flow applies.
