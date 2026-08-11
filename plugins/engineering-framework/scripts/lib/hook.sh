#!/usr/bin/env bash
#
# Shared PreToolUse hook plumbing: decision emission and the jq precondition.
#
# WHY THE DECISION IS ENCODED WITH jq AND NOT printf
# --------------------------------------------------
# A decision reason can contain text the hook did not author — a package script
# name lifted out of the command, or a `reason` string written by the
# repository's own policy file. Interpolating that into a JSON literal with
# printf produces invalid JSON the moment the text contains a double quote or a
# newline.
#
# That failure is silent and it fails OPEN: Claude Code cannot parse the
# object, so the deny or ask never reaches the user and the operation proceeds
# under the normal permission flow. A guard that is defeated by an apostrophe
# is not a guard.
#
# jq -n --arg does the escaping, so a reason is data rather than syntax.
#
# This file is sourced, not executed.

# emit_decision <deny|ask> <reason>
#   Prints the PreToolUse decision object and exits the calling hook.
emit_decision() {
  jq -cn \
    --arg decision "$1" \
    --arg reason "Engineering framework: $2" \
    '{hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: $decision,
        permissionDecisionReason: $reason
      }}'
  exit 0
}

emit_deny() { emit_decision deny "$1"; }
emit_ask() { emit_decision ask "$1"; }

# ef_require_jq <what-could-not-be-classified>
#   Fails closed to a human prompt when jq is unavailable. Emitted by hand,
#   because jq is precisely the thing that is missing.
ef_require_jq() {
  command -v jq >/dev/null 2>&1 && return 0

  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Engineering framework: jq is unavailable, so the %s could not classify this call. Failing closed. Install jq to restore automatic classification."}}' "$1"
  exit 0
}

# ef_read_payload <what-could-not-be-classified>
#   Reads the PreToolUse payload from stdin into $EF_PAYLOAD, or fails closed.
#
# WHY THIS IS NOT AN INLINE `jq` CALL
# -----------------------------------
# Both guards used to read the payload with `set -e` in force and a bare
# command substitution:
#
#     file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')
#
# A payload that is not valid JSON makes jq exit 5, `set -e` propagates it, and
# the hook exits 5. Claude Code treats **any non-zero exit other than 2** as a
# non-blocking error and proceeds with the tool call — so the guard whose header
# promises FAIL CLOSED was, for that input, failing OPEN and silently.
#
# The exposure was small (Claude Code sends well-formed payloads) but the
# promise was unconditional, and a guard that is defeated by a malformed byte is
# not a guard. Anything that is not a JSON object now degrades to `ask`.
ef_read_payload() {
  IFS= read -r -d '' EF_PAYLOAD || true

  # `empty` for a non-object, no output for unparseable input: both collapse to
  # an empty string, which is the one thing we can test portably.
  EF_PAYLOAD=$(printf '%s' "${EF_PAYLOAD:-}" |
    jq -c 'if type == "object" then . else empty end' 2>/dev/null || true)

  if [ -z "$EF_PAYLOAD" ]; then
    emit_ask "the $1 could not read this tool call as a JSON object, so it could not classify it. Failing closed rather than letting an unclassified call through."
  fi
}

# ef_payload_string <jq-filter>
#   One string field out of the payload, empty when absent. The payload is
#   already known to be a JSON object, so a failure here is a bug in the filter
#   rather than hostile input; it still degrades to empty rather than exiting.
ef_payload_string() {
  printf '%s' "$EF_PAYLOAD" | jq -r "$1" 2>/dev/null || printf ''
}
