#!/usr/bin/env bash
set -euo pipefail

input_directory=${1:-./data}
output_file=${2:-report.csv}

printf 'date,total\n' > "$output_file"
for daily_file in "$input_directory"/*.log; do
  [ -e "$daily_file" ] || continue
  printf '%s,%s\n' "$(basename "$daily_file" .log)" "$(wc -l < "$daily_file")" >> "$output_file"
done
