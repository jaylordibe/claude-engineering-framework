#!/usr/bin/env bash
# The build. Genuinely succeeds, so a validation run has at least one honest
# PASS to report and cannot conclude that everything here is broken.
set -euo pipefail

node --check src/report.js
printf 'build ok\n'
