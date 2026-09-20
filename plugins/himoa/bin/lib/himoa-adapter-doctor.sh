# shellcheck shell=bash
#
# Shared doctor logic for Himoa's non-Claude adapters (Codex, Cursor), read-only.
#
# Reports in Himoa's evidence vocabulary and changes nothing. It claims only what
# it can observe: whether the machine-level adapter is installed and current, and
# — inside a repository — whether the Himoa bootstrap and the repository's own
# truth are present. It cannot verify that the host will execute the methodology
# correctly at runtime; that is a live-session concern, reported N/A rather than
# faked. Each wrapper sets HIMOA_HOST and BIN_DIR, then sources this file.
#
# PASS / FAIL (exit 1) / WARN / N/A. bash 3.2 compatible.

himoa_adapter_doctor() {
  local host="$HIMOA_HOST"
  local self_dir="$BIN_DIR"
  local source_root="${CLAUDE_PLUGIN_ROOT:-$self_dir/..}/adapters"
  [ -d "$source_root" ] || source_root="$self_dir/../adapters"

  local skills_dst="$HOME/.agents/skills"
  local himoa_home="$HOME/.agents/himoa"
  local agents_dst
  if [ "$host" = "codex" ]; then agents_dst="${CODEX_HOME:-$HOME/.codex}/agents"; else agents_dst="$HOME/.cursor/agents"; fi

  local fails=0
  pass() { printf 'PASS  %s\n' "$1"; }
  warn() { printf 'WARN  %s\n' "$1"; }
  na()   { printf 'N/A   %s\n' "$1"; }
  fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }

  printf 'Himoa — %s installation audit\n\n' "$host"

  if [ ! -f "$himoa_home/VERSION" ]; then
    fail "Himoa is not installed ($himoa_home/VERSION is absent). Run himoa-${host}-install."
  else
    local installed; installed=$(cat "$himoa_home/VERSION" 2>/dev/null || printf 'unknown')
    pass "Himoa reference home is installed ($installed)."
    if [ -f "$source_root/VERSION" ]; then
      local canonical; canonical=$(cat "$source_root/VERSION" 2>/dev/null || printf 'unknown')
      if [ "$installed" = "$canonical" ]; then pass "Installed version matches this source ($canonical)."
      else warn "Installed $installed, this source is $canonical — re-run himoa-${host}-install to refresh."; fi
    else na "No source VERSION here to compare against."; fi
  fi

  if [ -d "$source_root/skills" ]; then
    local expected=0; for d in "$source_root"/skills/himoa-*; do [ -e "$d" ] && expected=$((expected + 1)); done
    local found=0; if [ -d "$skills_dst" ]; then for d in "$skills_dst"/himoa-*; do [ -e "$d" ] && found=$((found + 1)); done; fi
    if [ "$found" -eq 0 ]; then fail "No Himoa skills in $skills_dst (expected $expected)."
    elif [ "$found" -lt "$expected" ]; then warn "$found of $expected Himoa skills present — re-run himoa-${host}-install."
    else pass "$found Himoa skills present in $skills_dst."; fi
  else na "No source skills to compare against."; fi

  local expected_a=0; for f in "$source_root/$host"/agents/himoa-*; do [ -e "$f" ] && expected_a=$((expected_a + 1)); done
  local found_a=0; if [ -d "$agents_dst" ]; then for f in "$agents_dst"/himoa-*; do [ -e "$f" ] && found_a=$((found_a + 1)); done; fi
  if [ "$expected_a" -eq 0 ]; then na "No source reviewer agents to compare against."
  elif [ "$found_a" -eq 0 ]; then fail "No Himoa reviewer agents in $agents_dst (expected $expected_a)."
  elif [ "$found_a" -lt "$expected_a" ]; then warn "$found_a of $expected_a Himoa reviewer agents present — re-run himoa-${host}-install."
  else pass "$found_a Himoa reviewer agents present, read-only."; fi

  if [ -d ".git" ] || [ -f "AGENTS.md" ]; then
    if [ ! -f "AGENTS.md" ]; then warn "This repository has no AGENTS.md — no Himoa bootstrap here."
    elif grep -q 'himoa:bootstrap' AGENTS.md 2>/dev/null; then
      pass "AGENTS.md carries the Himoa bootstrap."
      if grep -qiE 'Canonical commands|## Project' AGENTS.md 2>/dev/null; then pass "Repository declares its own truth in AGENTS.md."
      else warn "AGENTS.md has the bootstrap but no repository truth (Project, Canonical commands) yet."; fi
    else warn "AGENTS.md exists but carries no Himoa bootstrap marker."; fi
  else na "Not inside a repository — skipped the repository bootstrap checks."; fi

  printf '\n'
  if [ "$fails" -gt 0 ]; then printf 'FAIL — %d check(s) failed.\n' "$fails"; return 1; fi
  printf 'OK — no failures.\n'
  return 0
}
