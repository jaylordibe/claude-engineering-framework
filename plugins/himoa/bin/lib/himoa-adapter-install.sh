# shellcheck shell=bash
#
# Shared installer logic for Himoa's non-Claude adapters (Codex, Cursor).
#
# WHY A SHARED LIB
# ----------------
# Codex and Cursor install the SAME shared artefacts — the skills at
# ~/.agents/skills and the standards/templates at the neutral home ~/.agents/himoa
# (both hosts read those paths natively) — and differ only in where their
# read-only reviewer agents go. Two independently edited installers would drift;
# this is the one place the install logic lives. Each wrapper sets HIMOA_HOST and
# BIN_DIR, then sources this file.
#
# It writes only Himoa-owned paths (himoa-* and the himoa/ home), is idempotent,
# has --check / --uninstall / --repo, and honours HOME (and CODEX_HOME for the
# Codex agents dir) — which is what lets it be tested against an isolated fake
# HOME. bash 3.2 compatible.

himoa_adapter_main() {
  local host="$HIMOA_HOST"
  local self_dir="$BIN_DIR"

  local source_root="${CLAUDE_PLUGIN_ROOT:-$self_dir/..}/adapters"
  [ -d "$source_root" ] || source_root="$self_dir/../adapters"
  if [ ! -d "$source_root" ]; then
    printf 'himoa-%s-install: cannot find adapters/ — run from an installed plugin or a repo clone.\n' "$host" >&2
    return 1
  fi
  source_root=$(cd "$source_root" && pwd)
  local reference_root="${CLAUDE_PLUGIN_ROOT:-$self_dir/..}/reference"
  [ -d "$reference_root" ] || reference_root="$self_dir/../reference"

  # Shared, host-neutral: both Codex and Cursor read these paths.
  local skills_dst="$HOME/.agents/skills"
  local himoa_home="$HOME/.agents/himoa"

  # Host-specific reviewer agents.
  local agents_src agents_dst other_agents_dst
  if [ "$host" = "codex" ]; then
    agents_src="$source_root/codex/agents"
    agents_dst="${CODEX_HOME:-$HOME/.codex}/agents"
    other_agents_dst="$HOME/.cursor/agents"
  else
    agents_src="$source_root/cursor/agents"
    agents_dst="$HOME/.cursor/agents"
    other_agents_dst="${CODEX_HOME:-$HOME/.codex}/agents"
  fi

  local mode="install"
  case "${1:-}" in
    --check) mode="check" ;;
    --uninstall) mode="uninstall" ;;
    --repo) mode="repo"; [ "${2:-}" = "--check" ] && mode="repo-check" ;;
    "") : ;;
    -h|--help)
      printf 'usage: himoa-%s-install [--check | --uninstall | --repo [--check]]\n' "$host"
      printf '  (no flag)      install/refresh the machine-level adapter (idempotent)\n'
      printf '  --check        dry run: print destinations, write nothing\n'
      printf '  --uninstall    remove this host'\''s reviewer agents (and shared files if no other Himoa host remains)\n'
      printf '  --repo         bootstrap ./AGENTS.md in this repository (create or prepend, never destroy)\n'
      return 0 ;;
    *) printf 'himoa-%s-install: unknown argument %s\n' "$host" "$1" >&2; return 2 ;;
  esac

  local version; version=$(cat "$source_root/VERSION" 2>/dev/null || printf 'unknown')
  say() { printf '%s\n' "$1"; }

  install_file() {
    if [ "$mode" = "check" ]; then say "  would write  $2"; return; fi
    mkdir -p "$(dirname "$2")"
    sed "s|@HIMOA_HOME@|$himoa_home|g" "$1" > "$2"
  }
  install_tree() {
    local rel
    while IFS= read -r rel; do install_file "$1/$rel" "$2/$rel"; done < <(cd "$1" && find . -type f | sed 's|^\./||')
  }

  # --- Repository bootstrap ---
  if [ "$mode" = "repo" ] || [ "$mode" = "repo-check" ]; then
    local dry=0; [ "$mode" = "repo-check" ] && dry=1
    local boot="$source_root/AGENTS.himoa.md"
    local scaffold="$reference_root/AGENTS.md.template"
    [ -f "$boot" ] || { printf 'missing bootstrap %s\n' "$boot" >&2; return 1; }
    if [ ! -e "AGENTS.md" ]; then
      if [ "$dry" = "1" ]; then say "would create ./AGENTS.md (Himoa bootstrap + repository-truth scaffold)"; return 0; fi
      { cat "$boot"; printf '\n\n'; [ -f "$scaffold" ] && cat "$scaffold"; } > "AGENTS.md"
      say "Created ./AGENTS.md — Himoa bootstrap plus a repository-truth scaffold. Fill it from evidence and commit it."
      return 0
    fi
    if grep -q 'himoa:bootstrap' "AGENTS.md" 2>/dev/null; then say "./AGENTS.md already carries the Himoa bootstrap — nothing to do."; return 0; fi
    if [ "$dry" = "1" ]; then say "would prepend the Himoa bootstrap to ./AGENTS.md (existing content preserved)"; return 0; fi
    local tmp; tmp=$(mktemp "${TMPDIR:-/tmp}/himoa-agents.XXXXXX")
    { cat "$boot"; printf '\n\n---\n\n'; cat "AGENTS.md"; } > "$tmp" && mv "$tmp" "AGENTS.md"
    say "Prepended the Himoa bootstrap to ./AGENTS.md; existing content preserved below it."
    return 0
  fi

  # --- Uninstall ---
  if [ "$mode" = "uninstall" ]; then
    say "Himoa ${host} adapter — uninstall (removes only Himoa-owned files)"
    if [ -d "$agents_dst" ]; then for f in "$agents_dst"/himoa-*; do [ -e "$f" ] && rm -rf "$f"; done; fi
    # Shared skills/home are removed only if no OTHER Himoa host still needs them.
    local other=0
    if [ -d "$other_agents_dst" ]; then for f in "$other_agents_dst"/himoa-*; do [ -e "$f" ] && other=1; done; fi
    if [ "$other" = "0" ]; then
      if [ -d "$skills_dst" ]; then for d in "$skills_dst"/himoa-*; do [ -e "$d" ] && rm -rf "$d"; done; fi
      rm -rf "$himoa_home"
      say "Removed this host's reviewer agents and the shared skills/standards (no other Himoa host present)."
    else
      say "Removed this host's reviewer agents; kept the shared skills/standards, which the other installed Himoa host still uses."
    fi
    say "AGENTS.md and everything not prefixed himoa- were left untouched."
    return 0
  fi

  # --- Install / check ---
  say "Himoa ${host} adapter ${version} — ${mode}"
  say "Source: $source_root"
  say ""
  say "Destinations (Himoa-owned only):"
  say "  skills     $skills_dst/himoa-*        (shared)"
  say "  reviewers  $agents_dst/himoa-*"
  say "  reference  $himoa_home               (standards, templates, VERSION; shared)"
  say ""

  for f in "$agents_src"/himoa-*; do [ -e "$f" ] && install_file "$f" "$agents_dst/$(basename "$f")"; done
  for d in "$source_root"/skills/himoa-*; do [ -e "$d" ] && install_tree "$d" "$skills_dst/$(basename "$d")"; done
  install_tree "$source_root/standards" "$himoa_home/standards"
  install_tree "$source_root/templates" "$himoa_home/templates"
  install_file "$source_root/VERSION" "$himoa_home/VERSION"

  # Migration: 3.1.0 installed the Codex reference home at ~/.codex/himoa; the
  # neutral home is now ~/.agents/himoa. Remove the stale one so it cannot be
  # read in preference to the current standards.
  if [ "$host" = "codex" ] && [ "$mode" != "check" ]; then
    local legacy="${CODEX_HOME:-$HOME/.codex}/himoa"
    [ -d "$legacy" ] && [ "$legacy" != "$himoa_home" ] && rm -rf "$legacy"
  fi

  say ""
  if [ "$mode" = "check" ]; then
    say "Dry run only — nothing was written."
  else
    say "Installed Himoa ${version} for ${host}. Verify with: himoa-${host}-doctor"
    say "Nothing outside the Himoa-owned paths above was created or modified."
  fi
  return 0
}
