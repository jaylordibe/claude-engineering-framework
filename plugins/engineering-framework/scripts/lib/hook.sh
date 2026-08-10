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
