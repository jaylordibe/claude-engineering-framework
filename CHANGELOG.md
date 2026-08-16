# Changelog

All notable changes to the `engineering-framework` plugin.

Entries are grouped by **workflow impact** rather than by file: an entry a
reader cannot act on, or decide not to act on, is not an entry.

This project follows [semantic versioning](docs/versioning.md). Since `1.0.0`
the contract is the ordinary one: a MAJOR bump may ask a consuming repository to
act, and MINOR and PATCH never do. Entries below `1.0.0` were released under the
`0.x` convention, where a minor bump could break you.

---

## 2.0.0 — 2026-08-16

**A repository now declares that it uses this framework, the way it declares any
other dependency, and Claude Code owns everything after that.** The framework
stopped keeping its own copy of state the host application already owns.

### Upgrade note — what a consuming repository must do

Two things, both manual and both small. Nothing migrates automatically, on
purpose: a migration subsystem for a file this size costs more than the move.

1. **Move anything still worth keeping out of
   `.claude/engineering-framework.json`, then delete the file.** It is no longer
   read by anything. `framework-doctor` names it if it is still there.
   - `commands` → the **Canonical commands** table in your `CLAUDE.md`, if it is
     not already there. The validation gate reads that table now.
   - `risk.highRiskPaths` → a **High-risk paths** section in your `CLAUDE.md`.
     The design and review gates read that section now. It is still advisory: it
     raises the risk tier and widens the review panel, and it blocks nothing.
   - `frameworkVersion` → **nothing.** Delete it. Consuming repositories no
     longer record a framework version anywhere, and nothing compares one.
2. **Run `/engineering-framework:framework-install` once** to add the dependency
   declaration to `.claude/settings.json`, then commit it. Skip this if you
   already added `extraKnownMarketplaces` and `enabledPlugins` by hand — the
   installer detects a correct declaration and rewrites nothing.

If you do neither, the framework keeps working: every gate falls back to reading
your `CLAUDE.md`, the manifest and CI, exactly as it did before when no policy
file was present.

### Changed workflow

- **`framework-install` now configures `.claude/settings.json` for you.** It
  merges exactly two keys — `extraKnownMarketplaces` and `enabledPlugins` — so a
  colleague who clones the repository does not reconstruct the configuration
  from a README. Previously it named the block and told you to paste it.
  **It still writes no permission rules**, and it never writes `permissions`,
  `hooks` or `env`. The 1.0.0 line was that a plugin must not rewrite the
  permission posture a developer chose; declaring a dependency is a different
  act, and `tests/validate-install-settings.mjs` asserts the difference rather
  than promising it.
- **The merge refuses rather than guesses.** Unparseable settings are reported
  and left byte for byte alone; a marketplace name already pointing at a
  different source is a conflict you resolve, not one it resolves for you; a
  plugin someone explicitly set to `false` needs `--enable-disabled` before it
  is flipped. Nothing is written in any of those cases.
- **Running it twice changes nothing the second time.** A correct declaration is
  left alone, including its formatting, and including an `autoUpdate` value you
  set yourself.
- **`.claude/engineering-framework.json` is removed from the architecture**, and
  with it `reference/repo-config.schema.json` and the example config. See the
  upgrade note. `ef-doctor` reports a leftover file; it never reads, migrates or
  deletes one.
- **Consuming repositories carry no framework version.** `frameworkVersion` and
  the major-version-gap check that compared it against the installed plugin are
  both gone. That check existed to make an upgrade note get read, and it cost a
  number in every repository that went stale in silence. Read this file on a
  major bump instead.

### Changed for the framework itself

- `bin/ef-install-settings` — the deterministic, idempotent settings merge, with
  17 asserted repository shapes including "writes nothing into `$HOME`".
- `reference/marketplace-declaration.json` — the identifiers the installer
  writes, pinned in CI against `marketplace.json` and `plugin.json` so a rename
  cannot point installing repositories at a marketplace that does not exist. It
  deliberately carries no `autoUpdate`, and CI fails if one is added.

### Unchanged, and worth saying

- **Nothing global is written.** Not `~/.claude/settings.json`, not
  `~/.claude/plugins/known_marketplaces.json`, not the plugin cache.
- **Auto-update stays where Claude Code puts it** — a per-user toggle in
  `/plugin` (third-party marketplaces default to off), or an administrator key
  in managed settings. The installer will not write it, because accepting
  unreviewed changes to this framework is not a decision this framework should
  make in its own favour.
- **A colleague who clones still runs one command.** As of Claude Code
  v2.1.195, a plugin that only project settings enable, and that comes from an
  external source, does not load until that person installs it. The declaration
  takes team setup from two commands to one, not to zero.

## 1.1.0 — 2026-08-15

**Risk now decides how much investigation a change gets, not only how much
ceremony it produces.** Nothing a risk tier required before is optional now.

### Changed workflow

- **Repository mapping runs in one of three depth bands.** `context-mapper`
  states which band it worked in and why, and a localized Low-risk change no
  longer receives a system-wide audit. **Standard is the default; a shallower
  band is earned from evidence, never from how small a request sounds.** No
  action required.
- **A map that could not finish now says so.** `context-mapper` returns an
  explicitly `Incomplete` map naming what it could not establish, instead of a
  partial map that reads as complete. `work-item` and `gate-design` respond by
  closing the gap — a narrowed re-launch, or the lens that owns it — before
  classifying risk, rather than designing over it. This spends *more* on the
  runs where evidence was missing; it is not a new refusal, and the pipeline
  continues once the gap is closed. Where it genuinely cannot be, the existing
  unresolved-blocker stop applies as it did before. No action required.
- **Evidence widens the investigation and raises the tier, and nothing lowers
  either afterwards.** A change that turns out to reach a trust boundary, a
  persisted shape or an unbounded blast radius is re-classified upward mid-run,
  and the higher tier's rigor applies to what remains. The eventual size of the
  diff is not evidence that the tier should be lower.
- **`gate-review` selects domain lenses by what the diff touches**, with a
  per-lens trigger table. On a High or Critical change, uncertain applicability
  means the lens runs. Fewer agents on changes that engage one concern; the same
  panel, or a wider one, on changes that engage several. No action required.
- **A check is invalidated by a later edit to the code it covers**
  (`standards/evidence.md` §7). Re-using still-valid evidence is efficiency and
  is now explicitly allowed — the row has to say it was re-used and what has
  changed since. Reporting a result from before a review fix is a false `PASS`.
- **`work-item` names the durable state that must survive compaction** —
  requirement, stage, tier, band, approved scope, verbatim human conditions,
  non-goals, decisions, blockers, review and validation state — and requires
  re-reading source rather than resuming from a summary of it.
- **A risk tier that rises now obliges what the new tier's *design* required,
  not only its review panel.** Before or during implementation that is a
  material divergence and returns to the approval gate; during review the panel
  runs at the higher tier and anything the higher tier's design owed is stated
  as a blocker for the human. A threat model written afterwards to close the gap
  is explicitly not the fix.
- **`gate-review` can never state a tier below the one carried in.** It
  classifies independently and takes the higher of its own answer and the tier
  design or implementation assigned. A finished diff often looks calmer than the
  investigation that produced it, and reviewing it at the tier it *looks* like
  shrank the panel exactly where the evidence said not to.
- **The evidence table gains a `When it ran` column**, in
  `standards/evidence.md` §6 and both report templates. Age is part of whether a
  row is evidence at all, and anything optional in that table is what gets left
  out. No action required.

### New

- **`framework-install` names the marketplace pin, and refuses to write it.** A
  repository can commit `extraKnownMarketplaces` and `enabledPlugins` so a
  colleague who clones it skips registering the marketplace by hand. The
  installer says the option exists, points at the block in the plugin's own
  `README.md`, states plainly that the install is still per-developer, states
  the `autoUpdate` decision, and stops — including if asked to write it during
  the skill. Settings belong to the repository's owner; a merge only ever adds
  and nothing here could withdraw a marketplace entry later; and `autoUpdate` is
  a decision to accept unreviewed changes to this framework, which this
  framework should not be making in its own favour.
- The plugin's bundled `README.md` carries the exact settings block, so the
  payload states it once and the installer can cite it.
- **`standards/execution-efficiency.md`** — the single source for investigation
  depth, model choice per launch, fan-out, output size, escalation triggers and
  anti-patterns. Skills and agents cite it; none of them restate it.
- **A quality floor that outranks a request to spend less.** Efficiency may
  never reduce the evidence, validation, testing, review independence or review
  depth a tier requires, and no budget converts `UNKNOWN` into safe, `BLOCKED`
  into `PASS`, or material uncertainty into accepted risk. "Keep it cheap" is a
  preference about method; it is not one of the risk acceptances a human can
  make, because it names no risk. Stated in six lines of the always-on charter
  as well, because that pressure arrives before any gate has loaded.
- **`efficiency-discipline` grader and nine eval cases** covering Low through
  Critical, a local change whose evidence widens it, unresolved uncertainty,
  a resumed run with no approval trace, and explicit token pressure on a
  High-risk change. The grader fails over-investigation at 0.4 and a moved
  quality floor at 0.0.
- **`docs/constraints.md` C16–C18** — what Claude Code actually guarantees for
  per-launch model selection, reasoning effort and turn ceilings, verified
  against v2.1.233 on 2026-08-15.

### Fixed

- `validate-plugin.mjs` now fails an agent that declares no `maxTurns` (no
  runaway backstop at all), and fails any file that restates the depth-band
  policy without citing the standard that owns it.
- **The validator's frontmatter allowlists were stale, and a stale allowlist
  fails the build.** `paths` and `shell` on a skill, and `color` and
  `initialPrompt` on an agent, are documented fields that were rejected under
  `--strict` with a message asserting they did not exist. Corrected against the
  field tables on 2026-08-15.
- **`hooks` on a skill is now refused explicitly, and says by whom.** Claude Code
  supports it and the hook keeps running for the rest of the session; this
  framework registers no hook that gates a tool call. It previously produced the
  same "not a documented field" warning as a typo — so the obvious fix was to
  add it to the supported list, which would have reinstated the enforcement
  layer through the one door the agent-level refusal did not cover.
- `docs/constraints.md` claimed `color` is not a documented agent field. It is;
  it is omitted here because it is decoration, not because it would fail.
- `CONTRIBUTING.md` still declined "new hook denials without a version bump and
  a policy switch" six lines after stating that enforcement changes are not
  accepted at all, and both it and `docs/development-guide.md` warned against
  describing "either guard" as a sandbox — guards removed in 1.0.0.
- **The documentation claimed committed settings give a teammate zero-setup
  onboarding. They do not.** From Claude Code v2.1.195, a plugin enabled only by
  a project's `.claude/settings.json`, and sourced from a git repository, does
  **not** load until that person installs it: the marketplace registers itself
  after folder trust, the install does not. Onboarding goes from two commands to
  one, not to none. Corrected in the plugin README, the root README — including
  a command-reference row that marked the install "required *unless* the
  repository pins `enabledPlugins`" — the consuming-repository guide, and
  `framework-install`. Recorded as C19, with the honest note that no mechanical
  check can cover it.
- **`autoUpdate` verified rather than assumed.** It refreshes the marketplace
  **and** updates installed plugins on disk, after session start with a delay of
  up to ten minutes, loading on the next launch or after `/reload-plugins` — so
  `docs/versioning.md` is correct as written. Four passages described it as
  covering only the catalogue refresh, and so understated the manual case as one
  command when it is two.

### Deliberately not done

- **Reasoning effort still does not scale with risk.** `effort` is fixed per
  component and has no per-launch parameter, so the obvious design is not
  expressible; every reasoning-bearing component stays at `high`. See C17.
- **No turn ceiling was lowered.** A ceiling is a hard stop, so lowering one
  saves nothing on runs that finish early and truncates the deepest, riskiest
  investigation. Changing one is a measurement question and this repository has
  nothing to measure against. See C18.

---

## 1.0.0 — 2026-08-12

**The framework no longer ships permission rules or hooks that gate commands.**
It ships methodology: the charter, the gates, the review lenses, the standards.

Removed: the 172-rule permissions floor, both PreToolUse guards, the retired-rules
mechanism, and every permission check in `ef-doctor` — about 3,000 lines, a third
of the plugin and nearly half the test suite.

### Why

Two reasons, and the second is the one that decided it.

**A text parser cannot out-guess a shell.** The last attempt to extend the guard
— teaching it to read SQL statements and to tell a merge-conflict resolution from
a discard — went through a six-lens review before release. It found two Critical
and ten High defects in a single pass: `sqlite3` reaching `writefile()` behind a
`SELECT`; `-hprod` bypassing a hostname check that only matched the spaced
spelling; `git checkout --ours <path>` silently discarding uncommitted work,
because the premise that `--ours` only applies during a conflict is simply false.
Each hole patched implied another.

**A plugin that rewrites your permission rules is confusing.** If you enable a
permission mode, you should get that mode. The floor shipped
`permissions.defaultMode: "acceptEdits"` into every consuming repository, and a
project settings file *overrides* the user's own `~/.claude/settings.json` for
that key — so the framework was silently cancelling the mode developers had
chosen, and the symptom was the prompting it existed to prevent. Permissions
belong to the repository and the person who owns it.

### What you have to do

Your `.claude/settings.json` still contains everything a previous
`framework-install` merged into it, because a merge only ever adds. Nothing
removes it for you and nothing depends on it any more. Two things worth doing:

- **Delete `permissions.defaultMode`.** While it is set, it overrides the
  permission mode you chose in your own user settings.
- **Keep or delete the `allow`, `ask` and `deny` rules as you see fit.** They
  are yours now. The framework has no opinion and no longer reads them.

`.claude/engineering-framework.json` keeps `commands` and `risk`, which the
gates read. `protectedCommands`, `protectedPaths`, `useDefaultCommandRules`,
`useDefaultProtectedPaths` and the `policy` switches configured the guards and
no longer do anything; `ef-doctor` names them if they are still present.

### Unchanged

The whole engineering half. Eight read-only review lenses, five gates plus the
conductor, the standards, the risk tiers, the evidence language, the session
charter and its statement of human-owned operations. `gate-review` still selects
its panel from `risk.highRiskPaths`. What changes is that the charter and the
gates carry that methodology by stopping and handing off, rather than by a hook
blocking a command.

### Also in this release

- **`jq`'s `.key` accessor is no longer denied.** `is_protected_secret_path`
  matched `*.key`, and `*` matches the empty string, so the token `.key` — the
  ordinary way to iterate an object — was classified as a private key file and
  **denied** in every repository that installed the framework. The guard is gone
  now, but the bug was real and blocked work for as long as it shipped.
- `ef-doctor` is 461 lines shorter and reports only the repository contract.
- `framework-install` no longer writes to `.claude/settings.json` at all.

---

## 0.3.1 — 2026-08-12

Everything here removes a stop that should never have existed. The target is
the one stated in `docs/consuming-repository-guide.md`: after plan approval, a
run reaches the human's review of the diff without interrupting, and the
interruptions that remain are the dangerous ones.

### v0.3.0 did not reach the repositories that had already installed v0.2.0

`framework-install` merges the floor and never overwrites, so it only ever
*adds*. A rule the floor **withdraws** therefore stays installed forever. v0.3.0
withdrew five coarse `ask` rules — `docker exec *`, `git branch *`,
`git worktree *`, `gh api *`, `glab api *` — so that running a test suite inside
a container would stop prompting. In an already-installed repository all five
survived, `ask` still outranked the new `allow` tier, and **the release removed
none of the noise it was written to remove**.

Withdrawal is now recorded rather than merely performed, in
`reference/retired-permission-rules.json`:

- `ef-doctor` reports any withdrawn rule still installed, by name. A rule count
  cannot detect this — the allow tier grows while the stale `ask` rule quietly
  outranks it, so the repository looks healthier as it gets worse.
- `framework-install` proposes the removals, with the reason each was withdrawn.
  Proposed, never automatic: a repository may have re-added one on purpose.

**If you installed v0.2.0 or v0.3.0, re-run `/engineering-framework:framework-install`.**
Nothing else in this release will reach you otherwise.

### False denials on read-only commands

A denial cannot be clicked through, so these blocked ordinary inspection with
no way past it — strictly worse than a prompt.

- **Quoted text is no longer read as a command.** The guard split segments with
  a character-level `tr` that had no idea what a quote was, so
  `grep -rn "git remote" scripts/` split into two fragments and the second read
  as a `git remote` invocation. Splitting is now quote-aware: single-quoted text
  is inert, `$(` and backticks still split inside double quotes because they
  still execute, and unquoted separators split exactly as before. `foo; git push`
  is still denied; `grep "git push"` is a search.
- **`git stash list`, `git stash show`, `git remote -v`, `git remote show` and
  `git remote get-url` are read-only** and no longer denied. The floor and the
  guard now name the writing subcommands instead of the whole verb. Bare
  `git stash` is still denied — with no action it means `stash push`.

### Commands that matched no rule at all

- **`git --no-pager <verb>`** matched nothing, so every one of them prompted.
  Allowed per verb for the read-only verbs; a blanket rule is not used, because
  it would also cover `git --no-pager push`.
- **Read-only forge commands**: `gh run list/view/watch`, `gh pr view/list/diff/checks`,
  `gh issue list/view`, `gh repo view`, `gh workflow list/view`, `gh auth status`,
  `gh search`, and the `glab` equivalents. Checking a CI run is how a change gets
  verified.
- **`gh api` / `glab api`** are allowed; the guard still asks for the write
  forms (`-X`/`--method` with POST, PUT, PATCH, DELETE, and the `-f`/`-F` field
  flags that make `gh` POST implicitly).
- **`npm ci`**, and `docker image rm` / `docker rmi` / `docker image ls` /
  `docker image inspect`. `npm install` is deliberately *not* allowed: `npm ci`
  installs what the lockfile already pins, while `npm install <package>` changes
  the dependency set.

`docker compose -f` was considered and **rejected**: the file flag takes an
arbitrary path and then an arbitrary verb, so allowing it would leave
`docker compose -f x.yml down -v` — which deletes volumes — matched by nothing
but the hook. A hook can fail; that tier cannot.

### Performance

The quote-aware split is a pure-shell loop, so it adds no fork to a path that
runs on every Bash call. Commands containing no quote take a `tr` fast path,
and above 8000 characters the older split is used rather than risk exceeding
the hook timeout — a guard that does not answer fails open, which is the one
outcome worse than being slow. A 60_000-character command is handled in
milliseconds; the worst realistic case measured 0.28s.

### The exclusions were re-decided against measurement, not judgment

The previous `allow` tier was reasoned about rather than measured. Replaying
**20_498 real Bash invocations** from this machine's transcripts showed the
reasoning was wrong in places, and by large margins:

| Verb | Share of all commands | Verdict |
|---|---|---|
| `cd` | **~20%** | Allowed. It cannot write, execute, or take a command as an argument. `pwd` was already allowed; `cd` was simply never added, and it was the single largest source of prompts. |
| `sed` | **17.4%** | `sed -n:*` allowed — 88.7% of every measured `sed` call is `sed -n '<range>p' <file>`, a pager. Only 0.9% used `-i`. |
| `npx` | 1.4% | Allowed **per tool** (`jest`, `tsc`, `eslint`, `ts-node`, `vite`, `prettier`, …), never `npx:*`. `npx <package>` fetches and executes from the network. |
| `awk` | 1.1% | Allowed. It writes nothing and runs nothing by default; exactly one measured call had a side effect. |
| `git --no-pager` | 0.65% | Allowed per read-only verb. |
| `git -C` | 0.29% | **Still prompts.** Every measured use was read-only, but a `Bash()` rule cannot express "any path, then only these verbs", and no Bash rule in the floor uses a mid-pattern wildcard. |
| `bash <script>` | 0.11% | **Still prompts.** Rare enough that excluding it costs almost nothing. |
| `docker compose -f` | 0.005% | **Still excluded**, as argued above. One occurrence in 20_498. |

The two verbs that were allowed on read-only grounds keep their teeth through
the guard, whose decision outranks a settings rule: `sed -i`, a `sed` script
using the `w` write flag, and an `awk` program calling `system()` all ask.

Measured effect on this machine's own repositories, replaying each repository's
real command history against its own settings: commands that would prompt fell
from **76.6% to 57.7%** in one and **75.4% to 55.9%** in the other. The
residual is a flat tail with no single cause above 2%, much of it shell-script
fragments rather than commands.

### Counts

`deny` 140 → 172, `ask` 14 (unchanged), `allow` 300 → 450. The command guard's
decision table grows from 161 to 196 rows, 80 of which assert silence.

---

## 0.3.0 — 2026-08-12

The framework spent 0.1.0 and 0.2.0 building hard gates and never built the
allow surface that makes them worth having. This release fixes that. Nothing
becomes permitted that was denied; what changes is that ordinary work stops
asking.

**Upgrade note.** Re-run `/engineering-framework:framework-install`. The floor
is not shipped by the plugin, so an existing `.claude/settings.json` keeps the
old seven-rule allow tier until it is re-copied, and `ef-doctor` now warns
while that is true. The floor also sets `permissions.defaultMode` to
`acceptEdits`; if you want the per-file edit prompt back, drop that one key.

Re-copying also **removes** five ask rules that moved into the command guard —
`git branch`, `git worktree`, `gh api`, `glab api`, `docker exec`. If your
repository would rather keep a declarative prompt on any of them, leave that
rule in place; the guard's finer decision still applies underneath it.

### The finding that motivated the release

**A floor of 122 deny rules, 24 ask rules and 7 allow rules is a floor that
prompts for everything.** `ls`, `grep`, `mkdir`, the test suite and the type
check matched no rule, so each one produced an Allow/Decline prompt, and with
no `defaultMode` every `Edit` produced one too. A single feature routinely cost
twenty prompts.

Twenty prompts is not twenty decisions. It is one reflex, and the reflex is
Yes — and that reflex is still armed when the twenty-first prompt is the
migration. This is the same argument `guard-protected-paths.sh` already made
about not firing on every source file; the floor simply had not applied it to
itself.

Two of the seven allow rules did not even work. `Bash(git status *)` requires a
space and an argument after `status`, so bare `git status` matched nothing and
prompted despite the rule that existed to allow it.

### Changed

- **`reference/permissions-floor.json` ships a 262-rule allow tier**, covering
  read-only shell inspection, read-only Git, task runners, the common test,
  lint, type-check and build tools, and read-only container and infrastructure
  inspection. Four admission criteria are stated in the file: it cannot write
  outside the working tree, it cannot execute remote code, it does not take an
  arbitrary command as an argument, and it cannot widen a deny or ask rule
  above it. `env`, `xargs`, `npx`, `sudo`, `node`, `python` and `bash -c` are
  excluded by the third criterion.
- **The floor sets `permissions.defaultMode` to `acceptEdits`.** This framework
  gates where a human reads a plan and a diff. A per-file edit prompt arrives
  with neither attached, and one authorization change legitimately touches
  thirty files. The protected-path guard still asks for migrations, CI
  workflows, infrastructure definitions, lockfiles and environment files.
- **Allow rules use the `verb:*` prefix form.** Deny and ask keep `verb *`:
  the command guard matches those operations too, in more forms than a prefix
  rule can express.
- **`framework-install` now proposes the repository's own dev loop** — its
  install, build, lint, typecheck and test commands — as allow rules, read from
  `commands` in `.claude/engineering-framework.json` or from the repository's
  own manifest. No generic list can know which command is a given repository's
  test suite.
- **`ef-doctor` warns when the allow tier holds fewer than 40 rules**, which is
  how a repository still carrying the 0.2.0 floor finds out.
- **`validate-plugin.mjs` asserts containment rather than equality** between
  this repository's `.claude/settings.json` and the floor. A floor is a floor,
  not a ceiling; equality forbade this repository from allowing its own test
  suite in the settings file its contributors inherit.

### The guard learned to tell reading from writing

Five rules prompted on a whole verb because a prefix rule cannot see what the
verb is doing. The guard can, so the decision moved to it. In every case the
dangerous form still prompts — what stopped prompting is the reading form.

| Command | Before | Now |
|---|---|---|
| `git branch -a`, `git worktree list` | ask | silent — `git branch -d`, `-m`, or a branch name still asks |
| `gh api /repos/…`, `glab api …` | ask | silent — `-X DELETE`, `--method PATCH` and field flags still ask |
| `docker exec api <test command>` | ask | silent — the inner command already had a full pass; `docker exec -it api bash` still asks |
| `docker compose down` | ask | silent — `docker compose down -v` still asks |
| Adding a **new** migration file | ask | silent — editing an **existing** migration still asks |

The migration rule is the one worth reading twice. Its own reason string tells
the human to add a new migration instead of editing an applied one, so
prompting for exactly that made the framework's advice cost an approval. The
test is "the migrations directory exists and this file does not", never the
weaker "this file does not exist" — a path the hook cannot resolve keeps its
prompt, which is what stops a metacharacter suffix from buying silence on a
real migration.

`git branch`, `git worktree`, `gh api`, `glab api` and `docker exec` also left
the floor's `ask` tier, or the coarse rule would have prompted anyway. The
trade is stated in the floor: a rule cannot fail, a hook can. `kubectl exec`
and the database clients therefore **keep** their ask rules — a cluster or a
live database session can be production, and that is the wrong place to depend
on a hook running.

### Interpreters

`python`, `python3`, `node`, `ruby`, `perl` and `php` are now allowed, and the
guard draws the line inside them instead: **inline code asks, a script file does
not.** `python3 -c '…'` and `node -e '…'` ask; `python3 scripts/fix.py` and
`node build.js` do not.

The guard cannot read either one — Python is not shell. What differs is what
the *prompt* shows. Inline code is in the prompt and can be judged. A prompt on
`python3 scripts/fix_imports.py` shows a filename, and nobody opens the file at
prompt fifteen; that prompt is a rubber stamp, and a rubber stamp is worse than
no prompt because it is what trains the reflex.

### Fixed

- **`bash -c 'git push --force'` returned no decision at all.** The deny rules
  see `bash`, and the segment splitter only tripped over the payload when it
  happened to contain a shell metacharacter. A shell payload *is* shell, so
  `classify_segment` now re-enters itself with it: `bash -c 'git push --force'`
  denies, `sh -c 'rm -rf /'` denies, and `bash -c 'ls'` stays silent. The
  floor's `_comment` had documented this gap as known since 0.1.0.
- **`Bash(git status *)` never matched bare `git status`.** The allow tier now
  uses the `verb:*` prefix form throughout.

### Unchanged

No `humanOwned*` switch changes behaviour, and no operation that was denied
became permitted. The suite grew from 214 to 246 guard decisions and from 35 to
36 robustness payloads; the fixture corpus passes unmodified.

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
