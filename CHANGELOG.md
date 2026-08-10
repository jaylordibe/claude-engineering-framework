# Changelog

All notable changes to the `engineering-framework` plugin.

Entries are grouped by **workflow impact** rather than by file: an entry a
reader cannot act on, or decide not to act on, is not an entry.

This project follows [semantic versioning](docs/versioning.md). During `0.x`,
treat a minor bump as potentially breaking.

---

## 0.1.0 — 2026-08-11

First release. The workflow is extracted and generalised from a mature
`.claude/` implementation that lived inside a single API repository; the
generalisation across stacks is new and is what `0.x` exists to prove.

### Workflow

- Seven-stage pipeline: understand, design, approve, implement, review,
  validate, present — with an optional issue-tracker report.
- `work-item` conductor running the whole pipeline in one session, stopping
  exactly twice: plan approval, and the human commit boundary.
- Five gates runnable individually: `gate-design`, `gate-approve`,
  `gate-implement`, `gate-review`, `gate-validate`.
- Risk tiers decide ceremony. Low-risk changes get no plan document; High and
  Critical get threat models and multi-lens review.
- Adversarial refutation of Critical and High findings on High and Critical
  changes.

### Agents

- Eight read-only lenses: `context-mapper`, `architect`, `reviewer`,
  `security`, `tester`, `contract`, `data`, `performance`.
- Read-only enforced by the effective tool pool and asserted in CI, not
  promised in prose.

### Repository-evidence discipline

- `standards/repository-evidence.md` fixes source precedence and the
  FACT / INFERENCE / ASSUMPTION / ABSENT / UNKNOWN labelling every agent must
  use. `ABSENT` — searched, and this system genuinely has none — is a complete
  answer; `UNKNOWN` is a gap. Only the second blocks anything, and `N/A` is the
  matching verdict state so a repository with no linter can still reach `PASS`.
- A mechanical denylist fails CI when any skill, agent, standard or template
  names a specific framework, ORM, database, queue or tool.

### Safety

- Command guard resolving the effective verb behind wrappers, privilege
  escalation and environment runners; policy-configurable per repository.
- Protected-path guard for migrations, infrastructure, CI configuration,
  lockfiles and real environment files.
- 87-row decision table pinning both what is blocked and what must never
  prompt.
- Reference permissions floor, an installer that never overwrites, and
  `ef-doctor` to audit that it is still in force.

### Domain playbooks

- `domain-auth`, `domain-authorization`, `domain-background-work` — model
  invoked, carrying the decisions and failure modes without any stack's
  answers.

### Hardened before release

A full review pass against this release found and fixed, before any of it
shipped:

- **Ten command-guard bypasses**, each of which allowed a documented
  human-owned operation. All were wrapper-resolution defects — an option before
  a wrapper's argument (`timeout -s KILL 5 git commit`), a wrapper option that
  is not value-taking (`env -i git commit`), a package manager treated as an
  unconditional wrapper (`poetry publish`), and a publication verb pushed out of
  the subcommand slot by an unlisted option (`npm --prefix /tmp publish`). Each
  is now pinned by its own row in the decision table, which grew from 87 to 101.
- **Two fail-open JSON injections.** Both guards built their decision object
  with `printf`, so a reason containing a double quote — a package script name
  lifted from the command, or a repository-authored `reason` string — produced
  invalid JSON. Claude Code cannot parse it, so the `deny` or `ask` was silently
  lost and the operation proceeded. Decisions are now encoded with `jq`, and the
  validator rejects `printf`-built decisions.
- **`useDefaultProtectedPaths` was unreachable**, read from the wrong place in
  the config, so a repository that turned it off still got prompted.
- **A latent hole in the read-only agent check**: an agent declaring
  `tools: Read, Bash` with no `disallowedTools` passed as read-only while being
  able to write any file through the shell.
- **A denylist false positive** that failed the build on the word "guardrails"
  (matching `rails`) and "reactive" (matching `react`).

### Known limitations

- The declarative permissions floor cannot ship with the plugin and must be
  installed into each repository. See `docs/constraints.md` C1.
- `claude plugin eval` is in early access, so `evals/` uses the
  `prompt.md` + `graders/*.md` layout and every case is written to be runnable
  by hand.
- No stack packs exist yet, deliberately. The first should be extracted from a
  second real repository that needs one.
