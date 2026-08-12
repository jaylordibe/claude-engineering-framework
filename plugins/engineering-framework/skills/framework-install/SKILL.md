---
name: framework-install
description: Sets up the repository side of the engineering framework contract — the permissions floor that a plugin cannot ship, an optional repository policy file, and a CLAUDE.md scaffold — showing every change before writing it and never overwriting existing content.
argument-hint: "[floor | policy | claude-md | all]"
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

The framework ships methodology. Three things it **cannot** ship, and this
skill puts them in the repository:

1. **The permissions floor.** A plugin's `settings.json` supports only the
   `agent` and `subagentStatusLine` keys, so a plugin cannot ship permission
   rules. The plugin's command guard hook covers the same operations and more
   forms, but a hook is executable code and Claude Code treats a crashed hook
   as a non-blocking error — it can fail open. A deny rule cannot. **They are
   complementary; install both.**
2. **Repository policy.** Which operations *this* repository reserves for the
   human, which paths need a prompt, and what its canonical commands are.
3. **Repository truth.** `CLAUDE.md` — what this system actually is. The
   framework cannot write this for you, only scaffold it.

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

## 2. Permissions floor

Read `${CLAUDE_PLUGIN_ROOT}/reference/permissions-floor.json`.

**If `.claude/settings.json` does not exist:** propose writing it with that
file's `permissions` object (drop the `_comment` and `$schema` scaffolding
notes, keep `$schema`). Show the whole file, then ask.

**If it does exist:** compute the union — every rule from the floor that is not
already present, keeping the repository's existing rules untouched and its
formatting intact. Show only the added lines, grouped by tier, then ask.

Then explain, in two sentences, what the floor does and does not guarantee:
precedence is deny then ask then allow, first match wins, a deny rule cannot
carry an exception, and none of this is a sandbox.

Point out anything already present that the floor would weaken, and **do not
remove it**.

**Then propose removing any rule the floor has withdrawn.** Read
`${CLAUDE_PLUGIN_ROOT}/reference/retired-permission-rules.json` and list every
rule in it that the settings file still contains, each with its `reason` and
the version that withdrew it.

This step exists because the merge above only ever *adds*. That is the right
default — it must not silently undo a decision the repository made on purpose —
but it means a rule the floor **deletes** can never leave an installed
repository on its own. v0.3.0 withdrew five coarse `ask` rules so that
`docker exec api <test command>`, `git branch -a` and a read-only `gh api` GET
would stop prompting; in every repository that had already installed v0.2.0 all
five survived, `ask` still outranked the new `allow` rules, and the release
removed none of the noise it was written to remove.

Removal is **proposed, never automatic**, and it is a separate question from
the additions — the repository may have re-added one of these deliberately, and
only the human knows. Show the list, say that each is now handled by a narrower
rule or by the command guard, and ask. If the user declines, say plainly which
prompts will therefore continue.

`permissions.defaultMode` is the one key here that changes behaviour rather
than adding a rule, so name it explicitly when you ask. The floor sets
`acceptEdits`, because this framework gates on the human-invoked design,
approve, review and validate steps — where a person reads a plan and a diff —
and a per-file Edit prompt is not one of those gates. If the repository already
sets a `defaultMode`, **keep theirs** and say which one won.

**Then add the repository's own dev loop to the `allow` tier.** The floor is a
floor, not a ceiling: no generic list can know which command is *this*
repository's test suite. Read `commands` from
`.claude/engineering-framework.json` if it exists, otherwise read the scripts
the repository declares in its own manifest or task file, and propose an allow
rule for each of install, build, lint, typecheck and test. Use the `verb:*`
prefix form, mirror each as a `PowerShell` rule, and propose nothing that takes
an arbitrary command as an argument. A floor
whose allow tier does not cover the commands the agent runs forty times a day
produces a prompt each time, and the twenty-first reflex Yes is the one that
approves the migration.

The two failure modes worth knowing about — unmirrored PowerShell rules, and
inert file rules that are accepted but never enforced — are explained in the
`_comment` of the reference file you just read, and `ef-doctor` checks both
mechanically. Report what it found; do not re-derive the check by hand, because
a prose copy can contradict the tool this skill runs twice.

## 3. Repository policy

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

## 4. CLAUDE.md

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

## 5. Verify and hand off

Re-run `ef-doctor` and show the result.

Then state plainly:

- what changed on disk;
- what remains for the user to fill in, in priority order;
- that nothing was committed;
- the one-line summary of what is now enforced and what is only advisory.

Suggested next step: run `/engineering-framework:framework-doctor` after
filling in `CLAUDE.md`, then start real work with
`/engineering-framework:work-item <requirement>`.
