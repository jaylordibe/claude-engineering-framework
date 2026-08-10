#!/usr/bin/env bash
#
# Repository policy reader for the engineering-framework guard hooks.
#
# The framework is installed once and runs in every repository the developer
# opens. A policy that is right for a production service is wrong for a scratch
# repository, so the guards read a per-repository policy file:
#
#   ${CLAUDE_PROJECT_DIR}/.claude/engineering-framework.json
#
# The file is optional. Every key has a default chosen so a repository with no
# file at all still gets the framework's intended floor. Reading is best-effort
# by design: a missing, unreadable or malformed file falls back to the defaults
# rather than failing the tool call, because a developer must never be locked
# out of their own shell by a typo in a config file.
#
# PERFORMANCE
# -----------
# These hooks run on EVERY Bash and EVERY Edit/Write call, in every repository,
# forever. Everything here is resolved ONCE at source time:
#
#   - no config file  -> zero jq processes
#   - config file     -> two jq processes total, whatever a hook asks for later
#
# Lookups after that are pure shell. An earlier version cached into a variable
# from inside a `$( )` pipeline, where the assignment happened in a grandchild
# subshell and was discarded — so every lookup re-read and re-parsed the file.
# Resolve at source scope, never inside a command substitution.
#
# This file is sourced, not executed. It must not exit.

EF_CONFIG_RAW='{}'
EF_CONFIG_PRESENT=false
EF_CONFIG_FLAGS=''

_ef_config_file=''
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  _ef_config_file="${CLAUDE_PROJECT_DIR}/.claude/engineering-framework.json"
fi

if [ -n "$_ef_config_file" ] && [ -r "$_ef_config_file" ]; then
  # `if type == "object"` keeps a config that is valid JSON but the wrong shape
  # — an array, a string — from making every later query error out.
  if _ef_parsed=$(jq -c 'if type == "object" then . else {} end' <"$_ef_config_file" 2>/dev/null); then
    EF_CONFIG_RAW=$_ef_parsed
    EF_CONFIG_PRESENT=true
  fi
fi

if [ "$EF_CONFIG_PRESENT" = true ]; then
  # Every boolean in the file, from `policy` and from the top level, flattened
  # into one space-delimited string. One jq process serves every later lookup.
  #
  # Both locations are read because the schema puts the humanOwned* switches
  # under `policy` and `useDefaultProtectedPaths` at the top level. Reading only
  # one of them silently ignored half the file.
  EF_CONFIG_FLAGS=$(printf '%s' "$EF_CONFIG_RAW" | jq -r '
    [ (.policy // {} | to_entries[]), (to_entries[] | select(.key != "policy")) ]
    | map(select(.value | type == "boolean"))
    | map(" \(.key)=\(.value)")
    | join("") + " "
  ' 2>/dev/null) || EF_CONFIG_FLAGS=''
fi

# ef_config_flag <key> <default:true|false>
#   Prints `true` or `false`. Pure shell; no process.
#   A non-boolean value in the file is ignored in favour of the default, so a
#   string "false" cannot silently disable a control it does not look like it
#   disables.
ef_config_flag() {
  case "$EF_CONFIG_FLAGS" in
    *" $1=true "*) printf 'true' ;;
    *" $1=false "*) printf 'false' ;;
    *) printf '%s' "$2" ;;
  esac
}

# ef_config_entries <key> <field-a> <field-b> [field-c]
#   Prints one tab-delimited record per entry of an array-of-objects key.
#   Entries missing field-a are dropped; missing later fields print empty.
#   Costs one jq process, and only when a config file exists.
ef_config_entries() {
  [ "$EF_CONFIG_PRESENT" = true ] || return 0

  printf '%s' "$EF_CONFIG_RAW" | jq -r \
    --arg key "$1" --arg a "$2" --arg b "$3" --arg c "${4:-}" '
    (.[$key] // []) | if type == "array" then .[] else empty end
    | select(type == "object")
    | select((.[$a] // "") | type == "string" and length > 0)
    | [.[$a], (.[$b] // ""), (if $c == "" then "" else (.[$c] // "") end)]
    | @tsv
  ' 2>/dev/null || true
}
