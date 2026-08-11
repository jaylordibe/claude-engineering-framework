#!/usr/bin/env bash
# The end-to-end suite. It cannot run here: it needs a report service that no
# part of this repository starts, and there is no container definition for one.
#
# This is BLOCKED, not FAIL. Nothing was proven either way, and reporting it as
# a failure would be as wrong as reporting it as a pass.
set -euo pipefail

if [ -z "${REPORT_SERVICE_URL:-}" ]; then
  printf 'e2e: REPORT_SERVICE_URL is not set and no service definition exists in this repository\n' >&2
  exit 78
fi

printf 'e2e would run against %s\n' "$REPORT_SERVICE_URL"
