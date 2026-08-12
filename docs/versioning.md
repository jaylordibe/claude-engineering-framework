# Versioning

The plugin sets an explicit `version` in `plugin.json`, so **users receive an
update only when it is bumped**. Pushing commits without bumping it changes
nothing for anyone.

That is deliberate. A framework that changes how a team works should change on
a release, not on a push.

## What each bump means

The unit of change is not "a file" — it is **what a consuming repository has to
do about it**.

### MAJOR — the contract changed

Bump MAJOR when a consuming repository may have to act:

- the gate sequence changes, or a gate is renamed or removed;
- the repository contract gains a **required** artefact;
- a hook's default policy becomes **more** restrictive, so a workflow that
  worked yesterday now stops;
- an agent's output contract changes shape, breaking anything that consumed it;
- a configuration key is removed or its meaning changes.

Every MAJOR ships an upgrade note in `CHANGELOG.md` saying exactly what a
consuming repository must do. `ef-doctor` compares the installed major version
against the repository's declared `frameworkVersion` and fails on a gap, so the
note is read rather than discovered.

### MINOR — new capability, nothing to do

- a new skill, agent, standard or template;
- a new **optional** configuration key;
- a hook gains an **opt-in** rule;
- materially improved guidance in an existing component.

### PATCH — corrections

- wording, typos, formatting;
- a false positive removed from a hook;
- a documentation fix;
- a refactor with no behavioural change.

## The rule that overrides the rules

**Any change that makes the framework block something it previously allowed is
at least MINOR, and a new denial is MAJOR.**

A framework that silently starts refusing a team's normal workflow is a
framework that gets uninstalled. The version number is how that news travels,
and it must arrive before the refusal does.

Conversely, *removing* a restriction is a PATCH: nobody's workflow breaks
because the framework stopped being wrong about something.

From 1.0.0 this rule has a much smaller surface, because the framework no
longer refuses anything — it ships no permission rules and no hooks that gate a
command. What can still "block a workflow" is a gate that stops, or a standard
that makes a review demand something new. Both count.

## Pre-1.0

`0.x` while the framework is generalised and proven. During `0.x`, treat a
MINOR bump as potentially breaking — that is the semver convention for `0.x`,
and this framework is genuinely still moving.

`1.0.0` lands when the first real repository has been migrated onto it and run
a full pipeline end to end. Not before: a framework nobody has used is a
framework whose contract has not been tested.

## Changelog

`CHANGELOG.md` groups entries by **workflow impact**, not by file:

```markdown
## 0.2.0 — 2026-09-01

### Changed workflow
- `gate-review` now selects lenses by risk tier. Low-risk changes no longer
  fan out to subagents. No action required.

### New
- `domain-background-work` playbook.

### Fixed
- `gate-validate` no longer reports `BLOCKED` when a repository declares no
  linter.
```

An entry that a reader cannot act on, or decide not to act on, is not an entry.

## Releasing

See the [development guide](development-guide.md#releasing).
