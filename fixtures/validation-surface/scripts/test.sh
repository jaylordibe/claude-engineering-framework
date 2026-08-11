#!/usr/bin/env bash
# The unit suite. Three cases; the third fails, on purpose and every time.
#
# It is a REAL failure, not a simulated one: report.js drops a malformed row
# instead of counting it, which contradicts the convention CLAUDE.md states.
set -uo pipefail

failures=0

run_case() {
  if [ "$2" = "$3" ]; then
    printf 'ok   %s\n' "$1"
  else
    printf 'FAIL %s: expected %s, got %s\n' "$1" "$3" "$2"
    failures=$((failures + 1))
  fi
}

run_case 'counts valid rows'     "$(node src/report.js valid)"     '2'
run_case 'handles an empty file' "$(node src/report.js empty)"     '0'
run_case 'counts malformed rows' "$(node src/report.js malformed)" '1'

printf '\n%s failure(s)\n' "$failures"
[ "$failures" -eq 0 ]
