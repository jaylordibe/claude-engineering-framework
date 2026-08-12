---
name: framework-install
description: Sets up the repository side of the engineering framework contract — a repository policy file declaring canonical commands and high-risk paths, and a CLAUDE.md scaffold — showing every change before writing it and never overwriting existing content. Writes no permission rules.
argument-hint: "[policy | claude-md | all]"
disable-model-invocation: true
model: inherit
effort: medium
---

# Install the repository contract

Scope requested:

```text
$ARGUMENTS
```

Empty argument means `all`.

## Why this skill exists

The framework ships methodology. Two things it **cannot** ship, and this skill
puts them in the repository:

1. **Repository policy.** What this repository's canonical commands are, so the
   validation gate runs them rather than inferring, and which paths are
   high-risk, so the design and review gates raise the ceremony for a change
   touching one.
2. **Repository truth.** `CLAUDE.md` — what this system actually is. The
   framework cannot write this for you, only scaffold it.

## What this skill will not do

**It writes no permission rules, and it never edits `.claude/settings.json`.**

Until 1.0.0 it installed a permissions floor and the plugin shipped hooks that
gated commands. Both are gone. Permissions belong to the repository and the
person who owns it: someone who turns on a permission mode is entitled to get
that mode, not a mode a plugin quietly rewrote underneath them. A framework
that edits a developer's own rules to enforce its methodology has confused
advice with authority.

The methodology is unchanged and is carried where it belongs — the session
charter states the human-owned operations, and the gates enforce them by
stopping and handing off. If this repository wants an operation blocked rather
than merely reserved, that is a rule its owner adds to their own settings, and
this skill will explain which rule without writing it.

## Rules for this skill

- **Show every change before making it.** Print the diff or the file, then ask.
- **Never overwrite existing content.** Merge into it, or write a `.new` file
  beside it and tell the user to merge. A settings file may contain rules the
  user depends on.
- **Never write a secret**, and never write anything into `.env` or a
  credential file.
- **Do not commit.** The user owns the commit, as always.
- If a target already looks correct, say so and skip it.

---

## 1. Survey first

Run `ef-doctor` and read its output. It is on `PATH` while the plugin is
enabled.

```bash
ef-doctor
```

Report what already exists before proposing anything. An install that
overwrites a working configuration is worse than no install.

## 2. Repository policy

Read `${CLAUDE_PLUGIN_ROOT}/reference/repo-config.schema.json` and
`${CLAUDE_PLUGIN_ROOT}/reference/engineering-framework.example.json`.

If `.claude/engineering-framework.json` does not exist, propose a **minimal**
one — not the full example. Include only:

- `frameworkVersion`, set to the installed plugin version;
- `commands`, **discovered from this repository** (its manifest scripts, its CI
  workflow, its `CLAUDE.md`). Omit any key whose command you could not
  establish. Do not guess a command.

Leave `policy` out entirely when the defaults are right — an absent key and a
key set to its default behave identically, and the shorter file is the one
people keep accurate.

Add `protectedPaths` entries only for paths this repository has a real reason
to protect, each with a reason that names the precondition rather than
restating that the path is protected.

## 3. CLAUDE.md

If `CLAUDE.md` exists, do not touch it. Instead, report which sections of the
contract it is missing — Project, canonical commands, architecture,
cross-cutting conventions, non-obvious invariants, consumers — and offer to
draft the missing ones **from repository evidence** for the user to review.

If it does not exist, copy `${CLAUDE_PLUGIN_ROOT}/reference/CLAUDE.md.template`
and then fill in what you can establish from evidence, marking anything you
could not establish as a question for the user rather than inventing it.

**Never invent a fact about the repository to fill a template section.** An
unfilled section is honest; a wrong one is load-bearing misinformation that
every later agent will trust.

## 4. Verify and hand off

Re-run `ef-doctor` and show the result.

Then state plainly:

- what changed on disk;
- what remains for the user to fill in, in priority order;
- that nothing was committed;
- the one-line summary of what is now enforced and what is only advisory.

Suggested next step: run `/engineering-framework:framework-doctor` after
filling in `CLAUDE.md`, then start real work with
`/engineering-framework:work-item <requirement>`.
