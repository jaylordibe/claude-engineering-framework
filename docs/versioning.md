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
- a gate starts refusing to proceed where it previously continued, so a
  workflow that worked yesterday now stops;
- an agent's output contract changes shape, breaking anything that consumed it;
- a configuration key is removed or its meaning changes.

Every MAJOR ships an upgrade note in `CHANGELOG.md` saying exactly what a
consuming repository must do, and the note has to be legible to someone who
never sees it coming.

Until 2.0.0 a repository declared `frameworkVersion` and `ef-doctor` failed on a
major gap, so the note was read rather than discovered. **That mechanism is
gone**, and removing it was itself a 2.0.0 change: it bought its warning at the
price of a version number in every consuming repository, duplicating state
Claude Code already owns and going stale in silence whenever nobody updated it.

What replaces it is weaker and honest about being weaker: the changelog entry,
and — where a removal leaves something behind that quietly stops working —
a line in `ef-doctor` naming it. That is why the 2.0.0 doctor reports a leftover
policy file. **A removal that leaves inert configuration behind must say so
somewhere the user will actually look**, or the failure is indistinguishable
from the feature working.

### MINOR — new capability, nothing to do

- a new skill, agent, standard or template;
- a new **optional** configuration key;
- a review lens is added to a risk tier's default panel;
- materially improved guidance in an existing component.

### PATCH — corrections

- wording, typos or formatting **inside a shipped component**;
- a correction to the manifest's own description;
- a refactor with no behavioural change.

### NONE — repository documentation is not a release

`README.md`, `docs/`, `CLAUDE.md` and `CHANGELOG.md` are served from `main` and
reach every reader the moment they are pushed. **Do not bump for them.** A bump
ships an update that every auto-updating consumer downloads, for a change none
of them can act on — and by the changelog's own standard, an entry a reader
cannot act on is not an entry. Fix them, merge them, and let them ride along
with the next release that has a reason of its own.

**The test is where the file is read from.** Anything under
`plugins/engineering-framework/` is copied into each consumer's plugin cache at
install time and is frozen at whatever version they have; correcting it requires
a release to reach them. Everything else in this repository is read live from
GitHub and requires nothing.

The bundled `plugins/engineering-framework/README.md` is the awkward case: it
ships in the payload, but nothing routes a user to it — `claude plugin details`
renders the manifest `description`, not the README, and a person looking for a
README finds the one on GitHub. Correct it, and let it ride.

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

## Since 1.0.0

`1.0.0` shipped on 2026-08-12. The bar it had to clear was that a real
repository be migrated onto it and run a pipeline end to end — a framework
nobody has used is a framework whose contract has not been tested. That bar has
been met.

From here the semver contract is the ordinary one: MAJOR may ask a consuming
repository to act, MINOR and PATCH never do. The `0.x` caveat that a MINOR bump
might break you no longer applies.

**Consumers auto-update. This is no longer an assumption.** From 2.0.0
`framework-install` writes `"autoUpdate": true` on the marketplace entry, so
every repository configured by the installer receives a release without anyone
typing an update command — Claude Code refreshes the catalogue *and* updates the
installed plugin on disk, in the background after a session starts.

Until 2.0.0 this section asked you to *assume* that, as the conservative reading
of a setting some teams had opted into. The default made it true. Nothing else
in this document changes, but everything in it now binds harder:

**The version bump is not a notification. It is the only brake.** A standard
changed without a bump reaches nobody; a standard changed with one reaches every
installed repository at once, on their next session, and neither outcome is
recoverable by editing this repository afterwards. Decide the bump before
merging, not after — and decide the *change* on the understanding that there is
no staging population between you and everyone.

A team can still opt out (`--no-auto-update`, or `"autoUpdate": false` on the
entry), and you cannot see which ones did. That asymmetry only ever runs one
way: assume none of them.

## A release cut minutes ago can still absorb changes

Immutability starts at **propagation**, not at the push. A consumer's plugin
cache is keyed by version — `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
— so once someone holds `1.1.0`, changing what `1.1.0` contains never reaches
them: Claude Code sees that version installed and does nothing. *That* is what
makes a published version immutable, and it is why amending one is worse than
bumping.

Before anyone has fetched it, none of that applies. More work landing in the
same session as a release **folds into that release**: amend its `CHANGELOG`
entry, leave `version` alone, and say plainly that the version's contents
changed. Cutting a second number for a release nobody has seen the first one of
spends a version on nothing.

Check propagation with evidence rather than assuming it:

```bash
git log -1 --format=%cI <release-commit>          # when it actually went out
ls ~/.claude/plugins/cache/<marketplace>/<plugin>/ # which versions exist on disk
```

Auto-update runs after session start with a delay of up to ten minutes, so a
release younger than that has almost certainly reached nobody. Older than a few
hours, or once any consumer machine shows the version in its cache, bump instead.

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
