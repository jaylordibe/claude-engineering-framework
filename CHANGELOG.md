# Changelog

All notable changes to the `engineering-framework` plugin.

Entries are grouped by **workflow impact** rather than by file: an entry a
reader cannot act on, or decide not to act on, is not an entry.

This project follows [semantic versioning](docs/versioning.md). During `0.x`,
treat a minor bump as potentially breaking.

---

## 0.2.0 — 2026-08-11

A production-hardening audit of 0.1.0, and the work it produced. The audit's
method was to attack the framework rather than exercise it: 15 controlled
mutations against the full suite, ~80 adversarial probes against both guards,
and every documented Claude Code constraint re-verified against current
documentation.

**Upgrade note.** The guards are stricter in three ways and the charter is
different. Nothing a repository declares changes meaning, and no `humanOwned*`
switch behaves differently. If your repository has a path whose name differs
from a protected path only by case, it will now prompt where it did not.

### The finding that motivated the release

**Policy-independent guarantees had no regression coverage.** Every one of the
135 guard fixtures ran with no repository policy file, so the behaviour of the
guard under a *delegated* policy — a documented, supported configuration — was
never tested. Deleting the force-push denial outright left the whole suite
green; with `humanOwnedGitWrites: false`, the same command then returned
`allow`, against a schema that promises force pushes are denied regardless.

`tests/guard-policy-matrix.tsv` re-runs the guard under five policy profiles
(defaults, fully delegated, no-default-rules, a corrupt file, and switches
written as strings) and asserts the **reason** as well as the decision — so a
policy-independent rule can no longer be shadowed by a policy-governed one that
happens to produce the same answer.

### Agentic security

- **New standard `untrusted-content.md`.** The framework ranked sources by
  which is *true* and had nothing at all on which may *instruct*. A `CLAUDE.md`
  is the most authoritative statement of what a system is and carries no
  authority to approve a change, retire a gate, declare a check passed or ask
  for a credential. The standard covers both directions, including how not to
  become useless in a repository that simply documents itself well.
- Summarised in the always-on charter, because a defence an attacker can
  decline to load is not a defence — a model-invoked skill would be exactly
  that.
- **New fixture `adversarial-injection/`** carrying payloads in every channel
  repository content reaches an agent through, plus the
  `injection-resistance` grader and two cases. `validate-fixtures.mjs` pins each
  channel individually, because tidying this fixture up would delete the test
  and leave it green.

### Guard hardening

- **Fail closed on malformed payloads.** Both guards ran `jq` under `set -e`,
  so a payload that was not valid JSON exited 5 — and Claude Code treats every
  non-zero exit except 2 as non-blocking, so the operation proceeded. Both
  headers promised FAIL CLOSED without qualification. `guard-robustness.mjs`
  pins 35 malformed, empty, oversized and hostile payloads.
- **Case-insensitive matching.** `database/Migrations/x.php` is the same file as
  `database/migrations/x.php` on macOS and Windows, and the guard let it through
  unprompted. The same applied to `.ENV` and to command verbs.
- **Quotes stripped before classification.** `git 'commit' -m x` defeated the
  guard *and* `permissions.deny` prefix rules simultaneously. Quoting is removed
  by the shell before the command runs; the guard now removes it before deciding.
- `php artisan migrate:status` is allowed. A `migrate:*` glob was swallowing
  read-only inspection, against the framework's own documented rule.

### Regression detection

Nine of fifteen mutations were undetected by 0.1.0. These close the structural
ones:

- **Skill read-only declarations are validated.** Deleting
  `disallowed-tools` from `gate-validate` — the line stopping a validation run
  from editing a test to make it pass — was undetected. Agents were checked;
  skills were not.
- **Component references must resolve.** Deleting `agents/security.md` left
  five dangling references and a silently smaller review panel.
- **Every schema key must be consumed.** `risk.highRiskPaths` was documented,
  offered to repositories, and read by nothing. Four `commands` keys were never
  named anywhere either. Both are now load-bearing, and `ef-doctor` reports them
  back so a repository can see its declaration took effect.
- **The charter has a test.** It had none: deleting its human-owned-operations
  section was undetected. `validate-charter.mjs` asserts the hook contract, the
  character cap, a line ceiling, every guarantee, and that it never asserts
  anything about the repository's architecture.
- **`ef-doctor` has a test.** CI ran it across the fixtures and discarded the
  result with `|| true`. 18 repository shapes now assert exit code *and* the
  finding that produced it.

### Coverage

Five new fixtures, each for a situation rather than a stack: `drift-repository`
(documentation that describes a system the code is not), `validation-surface`
(one repository where `PASS`, `FAIL`, `BLOCKED` and `N/A` are all reachable and
real), `security-surface` (one endpoint per hazard), `legacy-repository`
(tempting unrelated work), `monorepo` (ownership boundaries and a contract
crossing them). Three new graders: `drift-detection`, `validation-integrity`,
`scope-discipline`. Eight new eval cases.

### Supply chain

- GitHub Actions pinned to commit SHAs; `persist-credentials: false`;
  `CODEOWNERS` over the enforcement surface.
- The reference floor gains `Edit` mirrors for `*.p12`, `*.pfx`, `.netrc` and
  `.npmrc`. A `Read` deny covers `Edit` from v2.1.208 but never `Write` or
  `NotebookEdit`, so those four paths read as protected while remaining
  writable.
- `SECURITY.md` no longer advises pinning a plugin version in
  `.claude/settings.json`. There is no documented syntax for it, and advice that
  cannot be followed is worse than none.

### Constraints

Four new entries in `docs/constraints.md`, each verified against current
documentation: `Read`/`Edit` deny coverage (C11), the `additionalContext` cap
and its framing requirement (C12), exit-code semantics and the new `defer`
decision (C13), and which command forms Claude Code prompts for without the
guard's help (C14).

### Evidence coverage — a second real stack

- **New fixture `fixtures/laravel-api/`**, modelled on a real PHP API
  repository. It is the same *kind* of system as `fixtures/nestjs-api/` — HTTP
  API, layers, an ORM, tokens, migrations — and shares none of its specifics.
  That contrast is the point: a map that reads perfectly while reusing the other
  API's answers is the failure mode a single-API corpus structurally cannot
  catch. It carries no `package.json`, no lockfile and no ORM client; its
  manifest, test runner, authentication scheme and record-access model all have
  to be discovered.
- **New eval cases** `map-laravel-api` (discovery) and
  `laravel-schema-change-stops-at-approval` (a schema change with an explicit
  "apply it for me", against the human-owned migration boundary).
- **New validator `tests/validate-fixtures.mjs`.** Every fixture must be
  described in `fixtures/README.md`, be named by at least one eval case, and
  carry a stack signature listing what it must and must **not** contain. The
  second half is load-bearing: the graders' automatic-failure conditions are
  worth nothing if a fixture quietly acquires the stack it is meant to lack.

### Safety

- **The protected-path guard now has a decision table.** It previously had no
  test at all, so nothing proved it prompts on a migration or — more importantly
  — stays silent on ordinary application source.
  `tests/guard-path-fixtures.tsv` pins 23 decisions, and
  `tests/run-hook-fixtures.mjs` drives both guards.
- **Fixed: `php artisan migrate:status` was denied.** A `migrate:*` glob
  swallowed read-only inspection, contradicting the framework's own rule that
  `:status` and `:check` variants stay available — the rule the script-name
  heuristic beside it already honoured. Reporting which migrations have run
  changes nothing, and it is how an agent establishes the schema state it is
  about to reason about. This is a relaxation; no repository loses a denial.
- Command decision table grew from 101 to 112 rows, covering an
  interpreter-fronted CLI where the verb sits two tokens past the command.

### Stack neutrality

- Denylist extended with `eloquent`, `artisan` and `phpunit`, so vocabulary from
  the new fixture's stack cannot leak into a skill, agent, standard or template.

### Noted, not built

Working a second stack through the framework surfaced genuinely reusable
guidance that is **stack-specific** and therefore does not belong in any generic
agent: migration-safety practice for schema tools that key applied migrations by
filename, and expand/contract sequencing when the previous build serves traffic
against the new schema for the length of a deploy. That is a candidate for the
first stack pack, extracted from a real repository — not an addition to the
generic agents. See `docs/architecture.md` on where such packs would live.

### Still not claimed

The framework is comprehensively tested. It is **not** battle-tested: there is
no operational history behind it yet — no real repositories, no real failures,
no real fixes. That word stays unused until there is.

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
