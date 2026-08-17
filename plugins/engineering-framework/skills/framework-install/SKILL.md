---
name: framework-install
description: Configures the current repository to use the engineering framework — declares the marketplace and enables the plugin in the project's own .claude/settings.json, and scaffolds the CLAUDE.md that states what this system is. Preserves every existing setting, writes no permission rules, and touches nothing global.
argument-hint: "[settings | claude-md | all]"
disable-model-invocation: true
model: inherit
effort: medium
---

# Configure this repository to use the framework

Scope requested:

```text
$ARGUMENTS
```

Empty argument means `all`. `settings` runs §1–2 and §4; `claude-md` runs §1,
§3 and §4.

## What this skill is for

Running it means one thing: **configure THIS repository to use the engineering
framework.** It is the `npm install` of this framework — the project gains a
declaration that it depends on the framework, and nothing else.

Two things go in the repository, and both are committed:

1. **The dependency declaration.** `.claude/settings.json` gains the framework's
   marketplace and enables the plugin for this project, so a colleague who
   clones the repository does not reconstruct that configuration from a README.
2. **Repository truth.** `CLAUDE.md` — what this system actually is, how it is
   verified, and which of its paths deserve more ceremony. The framework cannot
   write this for you, only scaffold it.

## What this skill does not do

**It writes no permission rules.** It merges exactly three things —
`extraKnownMarketplaces`, `enabledPlugins`, and the single `env` member
`CLAUDE_CODE_ENABLE_TODO_TOOLS` — and never `permissions`, never `hooks`, never
another member of `env`. That third key grants nothing and denies nothing; it
only lets a run's stages appear in the task panel. The 1.0.0 line holds: a
developer who turns on a permission mode is entitled to get that mode, not one a
plugin rewrote underneath them. Declaring a dependency and rewriting someone's permission
posture are different acts, and `bin/ef-install-settings` is written so the
difference is mechanical rather than promised.

**It writes nothing global and nothing of Claude Code's.** Not
`~/.claude/settings.json`, not `~/.claude/plugins/known_marketplaces.json`, not
the plugin cache. Trust, installation, the installed version, the cache and the
update lifecycle belong to Claude Code. A repository declares a dependency; it
does not manage the host application's state.

**It creates no version file and no install marker.** The consuming repository
records nowhere which framework version it was set up against. Claude Code owns
the installed version; a second copy in the repository is a second thing to
forget, and it goes stale silently.

## Rules for this skill

- **Show every change before making it.** The settings merge has a `--check`
  mode; use it, show the result, then apply.
- **Never overwrite existing content.** For settings this is enforced by the
  script. For `CLAUDE.md`, merge into it or write a `.new` file beside it and
  say so.
- **Never write a secret**, and never write anything into `.env` or a
  credential file.
- **Do not commit.** The user owns the commit, as always.
- If a target already looks correct, say so and skip it.

---

## 1. Survey first

```bash
ef-doctor
```

It is on `PATH` while the plugin is enabled. Report what already exists before
proposing anything. An install that overwrites a working configuration is worse
than no install.

## 2. The dependency declaration

Show what would change, then apply it:

```bash
ef-install-settings --check
ef-install-settings
```

The script merges structurally: it adds only what is missing, leaves an
existing correct declaration byte for byte alone, and rewrites nothing when the
configuration is already right. Report its output rather than paraphrasing it.

It stops without writing in four cases, and each one is a decision for the
user, not for you:

| It reports | What it means | What you do |
|---|---|---|
| not valid JSON | The file cannot be parsed, so a merge would have to guess | Show the parse error. Ask the user to repair it. **Never rewrite the file to complete the install** — it may hold permission rules and hooks this repository depends on |
| is not an object | Valid JSON of a shape Claude Code cannot read as settings | Report it. The repository's settings are already inert; that is the finding |
| declared with a different source | This marketplace name already points somewhere else | Report both sources. Replacing it would repoint every plugin the other source serves. The user decides |
| explicitly disabled | Someone set this plugin to `false` deliberately, in a committed file | Say so, say the decision may be the whole team's, and ask before re-running with `--enable-disabled` |

Do not work around any of these. Do not edit `.claude/settings.json` by hand to
get past one — a merge the script refused is a merge that needed a human.

**Then say plainly what a colleague still has to do**, because it is one
command and pretending otherwise is the failure mode this section exists to
prevent: once they trust the repository folder, the marketplace registers
itself, and **they still install the plugin on their own machine.** Project
settings enable a plugin; they never install one.

**Say what auto-update buys and what it costs, because the installer turns it
on.** A new marketplace entry is written with `"autoUpdate": true`, so releases
of this framework arrive without anyone running an update command. Give both
halves rather than only the convenience:

- the repository records no framework version, so without this key the team
  stays on whatever version it first received until someone deliberately runs
  the two update commands, and nothing prompts them to;
- the framework's version bump then becomes the only thing between a changed
  standard and this repository, and Claude Code keeps marketplace state per user,
  so it reaches each machine that opens it.

Then name the alternative in one line: `ef-install-settings --no-auto-update`
writes the entry without the key, and releases are adopted with the two update
commands. An entry that already states `autoUpdate` either way is left alone,
and you should not offer to change it.

## 3. CLAUDE.md

If `CLAUDE.md` exists, do not touch it. Instead, report which sections of the
contract it is missing — Project, canonical commands, high-risk paths,
architecture, cross-cutting conventions, non-obvious invariants, consumers —
and offer to draft the missing ones **from repository evidence** for the user
to review.

If it does not exist, copy `${CLAUDE_PLUGIN_ROOT}/reference/CLAUDE.md.template`
and then fill in what you can establish from evidence, marking anything you
could not establish as a question for the user rather than inventing it.

Two sections are the ones the gates read directly, so spend the effort there:

- **Canonical commands** — discovered from this repository's manifest scripts,
  its CI workflow, its existing documentation. The validation gate runs these
  before it infers anything. **Omit a row whose command you could not
  establish.** Do not guess a command: one that happens to exit zero reads as a
  pass and is worse than no evidence.
- **High-risk paths** — optional, and only for paths this repository has a real
  reason to treat as High risk, each with the reason. Delete the section if the
  diff alone classifies changes correctly. A list naming half the repository
  raises the tier for everything, which is the same as raising it for nothing.

**Never invent a fact about the repository to fill a template section.** An
unfilled section is honest; a wrong one is load-bearing misinformation that
every later agent will trust.

## 4. Verify and hand off

Re-run `ef-doctor` and show the result.

Then state plainly:

- what changed on disk, naming `.claude/settings.json` explicitly;
- that nothing outside this repository was touched;
- what remains for the user to fill in, in priority order;
- that nothing was committed, and that both files are meant to be;
- the one command each colleague still runs on their own machine;
- that `env.CLAUDE_CODE_ENABLE_TODO_TOOLS` was set, so a `work-item` run's
  stages appear in Claude Code's task panel — current models are not given
  those tools by default — and that a developer who wants it off for themselves
  sets it in `.claude/settings.local.json` rather than editing the committed
  file.

Suggested next step: run `/engineering-framework:framework-doctor` after
filling in `CLAUDE.md`, then start real work with
`/engineering-framework:work-item <requirement>`.
