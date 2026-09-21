---
name: domain-supply-chain
description: The decisions and failure modes that govern code the repository did not author — dependencies, build and integration tooling, lockfiles, pipeline actions and base images. Carries the questions a change must answer, and none of the answers.
when_to_use: Use when a change adds or materially updates a dependency, a development or build tool, an SDK, package-manager configuration, a lockfile, a continuous-integration action or plugin, a container or base image, or a downloaded binary or artifact, and the tests or evidence for any of those.
user-invocable: false
---

# Dependency and build-chain trust

This skill carries the **decisions and the failure modes**. It does not know
which package manager, registry, pipeline or image format this repository uses,
and it names none of them.

**Establish the mechanism from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` — then apply the
questions below to what you actually found. Use this repository's own words for
its constructs, and never introduce a term it does not use.

This surface exists only where a change touches something the repository did not
author. A change that adds, updates or removes nothing from that surface does
not pull this skill, and a routine, reviewed version bump is not turned into a
crisis by it. The point is proportion, not suspicion of every dependency.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What does this change add or update — a runtime dependency, a build or development tool, a pipeline action, a base image, a downloaded artifact? | |
| How does this ecosystem record resolved versions and integrity, and where is that record? | |
| What is the source of truth for what gets installed, and is the change reflected there and only there? | |
| Does this ecosystem run code at install or build time, and does any added package do so? | |
| Is there a dependency-audit or scanning step here, and does it run? | |
| What privilege, secret and token access does the pipeline hold on this path? | |
| Where do base images or downloaded artifacts come from, and how is their version fixed? | |

An **`UNKNOWN`** here is a blocker for the change. An **`ABSENT`** — this
ecosystem has no lockfile, or this repository has no scanning step — is a
finding to state plainly, not a row to fill with a mechanism that does not
exist; the honest label is what `evidence.md` turns into a verdict later.

## 2. The decisions this change must make

1. **Do we need this dependency at all?** Prefer, in order: existing repository
   capability, the platform or framework, the standard library, an
   already-approved dependency, and only then a new one
   (`${CLAUDE_PLUGIN_ROOT}/standards/architecture.md` §3). Its maintenance and
   security cost is part of the change.
2. **Is this the package we mean**, from the source we expect, with an identity
   that cannot be shadowed by a public name resolving ahead of a private one?
3. **Does the recorded integrity change correspond to exactly the intended
   package change**, with no unexplained transitive churn?
4. **Is the version constraint right** for this ecosystem and this risk?
5. **What runs at install or build time**, and is it trusted?
6. **What does the pipeline or the image bring**, and with what privilege?
7. **What is the known-vulnerability evidence**, honestly labelled?
8. **How is each of the above tested or evidenced?**

## 3. The failure modes, in order of how often they are real

### Adding what already exists

A new dependency for something the repository, the platform or the standard
library already does is cost without need. Necessity is the first question, not
a formality — but rejecting a legitimate dependency purely to keep the count low
is the opposite error, and just as wrong.

### The wrong package

A name close to a well-known one, an internal package name that a public
registry can answer first, a typo that resolves to someone else's code: the
install succeeds and the code is not what was meant. A new or unfamiliar
dependency is checked for name confusion and namespace resolution before it is
trusted, using risk-based judgement rather than an investigation of every
common package.

### Trusting the lockfile blindly

A generated lock or integrity record is ground truth for what actually
installs — so an unexpected change in it is evidence, not noise. Dependency
changes correspond to intended package changes; unrelated transitive churn is
explained before it is accepted. The record is never hand-edited to make a check
pass (`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md`).

### Pinning as dogma, or "newest is safest"

Neither "pin everything to an exact version" nor "always take the latest" is a
rule. The constraint appropriate to the ecosystem and the risk is a judgement;
newest can carry a fresh compromise and oldest can carry a known one.

### Arbitrary code at install time

Install and build lifecycle hooks execute with the developer's or the pipeline's
privileges before any code is reviewed or run deliberately. A new or unfamiliar
package that ships them is assessed on that basis, not on its runtime API alone.

### The pipeline as an unreviewed dependency

A continuous-integration action or plugin is third-party code with access to the
build, its secrets and its token. It is pinned to a fixed revision, scoped to
the privilege it needs, not handed more secret or token access than it uses, and
not trusted to handle attacker-influenced inputs safely.

### The base image as a dependency

A container or base image is a dependency with the largest surface of all. Its
source is trusted, its version fixed to something that cannot move underneath the
build, its package surface no larger than the workload needs, and its privilege
no higher.

### "It installed, so it is safe"

A successful install proves nothing about trustworthiness, and a scanner that
was never run proves nothing about vulnerabilities. Where a scanning step exists,
its fresh output is the evidence and its verdict is `PASS`, `FAIL` or `BLOCKED`
honestly. Where none exists, the row is `N/A`, not a silent pass; a not-checked
claim is `UNKNOWN`. "No vulnerabilities" is never written from a step that did
not run.

## 4. Tests and evidence that must exist

Provide every one this ecosystem can actually express. Skip a row only when what
it checks is `ABSENT`, and say so.

- the dependency change, and only it, appears in the integrity record;
- where a dependency-audit or scanning step exists, its fresh output is attached
  and labelled `PASS` / `FAIL` / `BLOCKED`; where none exists, the row is `N/A`,
  stated with the evidence that it is genuinely absent;
- a pipeline action is pinned and scoped, and any change to its privilege, secret
  or token access is called out;
- a base image or downloaded artifact is fixed to a version or digest from a
  trusted source.

A dependency change whose provenance, integrity and known-vulnerability status
were never established is `UNKNOWN` — which is a finding, not a pass.
