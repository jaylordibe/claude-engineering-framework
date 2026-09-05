# Changelog

All notable changes to the `engineering-framework` plugin.

Entries are grouped by **workflow impact** rather than by file: an entry a
reader cannot act on, or decide not to act on, is not an entry.

This project follows [semantic versioning](docs/versioning.md). Since `1.0.0`
the contract is the ordinary one: a MAJOR bump may ask a consuming repository to
act, and MINOR and PATCH never do. Entries below `1.0.0` were released under the
`0.x` convention, where a minor bump could break you.

---

## 2.11.0 — 2026-09-04

**A ticket is written as a goal, not as the design an agent found.** Asked to
create a ticket, the default behaviour was to map the repository and write the
resulting design into the description — steps, files, a schema — so the ticket
reached `work-item` as a specification nobody had approved. That stage then
graded the method as one proposal among alternatives, which is what a ticket
is, and re-derived the design from evidence. The work was discarded and the
human never saw the goal stated on its own.

- **`write-ticket`**, a human-invoked skill that starts a mode the
  conversation stays in until the human says the ticket is final. The first
  turn reads the area the goal names — a bounded read, never a `context-mapper`
  launch — and emits a full draft with every gap labelled `UNKNOWN` rather than
  an interview. Every turn after re-emits the whole ticket with a `Changed:`
  line, asks at most three questions, and states in one line whether the
  ticket is ready and what stands in the way. A mechanism the human names is
  kept under **Ideas from discussion**, non-binding; a second goal is offered
  as a second ticket; a product question is listed with the human as its
  owner, never decided. The skill writes nothing into the repository, never
  declares the ticket final, and creates an issue in a tracker only when asked
  to in that turn.
- **`templates/ticket.md`**, the shape: story, current behaviour with
  `path:line`, problem, scope and non-goals, `Given / when / then` criteria
  with negatives, edge cases, contract and data touchpoints, open questions
  with owners, non-binding ideas, dependencies, evidence. Each section names
  what it becomes in `work-item`, which is what makes a ticket written here fit
  the pipeline it is fed to.
- `validate-plugin.mjs` pins the skill read-only and anchors its three
  boundaries. A new eval case and a `ticket-discipline` grader score the first
  turn and a follow-up.

**The ticket writer is hardened against the thoroughness that is a defect.**
Each of these corrects a way a draft could look more complete while carrying a
requirement nobody made. Together they keep `write-ticket` the light stage it
is meant to be beside `work-item`. None of them adds an agent, a pass or a
stage, and none of them touches a component that shipped in 2.10.0: this
release is the skill, its template, its grader and its eval cases.

- **Economy is scope, not effort.** The skill launches no mapper and no lens
  and finishes in one turn; that is where it is cheap. Its effort stays at
  high like every component that judges, because the calls it makes — is
  this claim confirmed, is this actor grounded, is this the human's question
  — fail as a tidier draft, and an unusually ambiguous request earns more care
  inside the same turn rather than a second pass or a delegated review.
- **Clarification depth follows the execution-efficiency standard.** The
  skill now applies `standards/execution-efficiency.md` to a ticket rather
  than reading the same amount for every request: the read starts narrow —
  the entry point, the current behaviour, the actor, the tests — and a clear
  request is drafted from it and finished. It widens only when evidence
  reveals an uncertainty that could change the ticket: more than one
  plausible reading, several deliverable outcomes, an unclear actor or
  permission boundary, a contradiction between the code and the human's
  account, a mechanism mistaken for a requirement, a symptom mixed with a
  cause. Widening names its trigger, reads only what bears on it, and
  contracts once the human resolves it; it gathers current behaviour and
  boundaries and never a design, so a library the human mentions is recorded
  as an idea and not investigated. A question is asked only when its answer
  could change readiness, the actor, the scope, a criterion, a contract, a
  failure behaviour or the split — three remains the hard limit, the
  repository is read rather than asked about, and broad questions are never
  asked. Nothing is selected by the user and no depth label exists; it
  follows from the evidence. Six eval cases grade it in both directions.
- **Readiness judges scope, not effort.** The "small enough to estimate" check
  asked the writer for a number only a design could supply. It is replaced by
  **bounded enough to plan**: the ticket fails when it carries more than one
  independently deliverable goal, when its edges cannot be stated without
  choosing a design, when a boundary that decides what is inside is
  unresolved, or when the request should be several tickets — and the
  readiness line then proposes the split. The writer never estimates duration
  or difficulty.
- **An actor is evidenced or human-supplied, and never invented.** A story's
  "As a" is grounded by the repository — a role, a caller, an operator the
  code names, cited with `path:line` — or by the human introducing the actor
  as part of the behaviour they asked for, marked as new product scope and
  `ABSENT` from the code today. A greenfield capability is not rejected because
  its actor does not exist yet. A persona neither source named stays `UNKNOWN`
  and is asked about in one bounded question. The rule applies to product
  stories and to the operator or maintainer of technical work alike.
- **Every turn re-emits the substantive ticket, and nothing else.** The story,
  the current behaviour, the problem, the scope with its exclusions, every
  criterion and every open question survive each turn and compaction. A
  section with nothing in it — contract, dependencies, ideas, an edge-case
  table of blank rows — is left out rather than written as "none" or "N/A".
  `templates/ticket.md` says which sections are always present, and that
  section numbers are stable identifiers whether or not a section appears.
- **Atomicity is semantic.** A criterion is split when it holds two
  independently verifiable outcomes — two things that could pass or fail
  apart. The word "and" is a signal to look, not a verdict: "rejected and
  nothing persisted" is one invariant and stays one criterion; "created and
  the dashboard refreshes" is two.
- **A negative is written where a boundary is real.** The caller who is not
  permitted, the unsupported input, the invalid state, the repeat, the
  excluded scope and the failure the actor would notice each get a criterion
  or an open question when the request or the code makes them real. A
  negative is not manufactured for every positive line because the template
  has a slot for one.
- **The WHAT/HOW line holds in both directions.** A mechanism the human offers
  — "maybe use a cache" — stays under **Ideas from discussion** unless they
  state in so many words that the mechanism itself is contractual, in which
  case the criterion quotes them. A cause the read finds for a defect is an
  `INFERENCE` with its `path:line`, never a root cause; `domain-debugging`
  proves it downstream.
- Nine new eval cases cover the evidenced, human-supplied and absent actor;
  the "and" that is one criterion beside the "and" that is two; the sections
  a simple ticket does not earn; a refinement turn that must keep every
  earlier criterion and exclusion; a suggested mechanism; a request that is
  three tickets; and a defect whose cause is guessed by the reporter and again
  by the read. `ticket-discipline` scores each of these, and
  `validate-plugin.mjs` anchors the rules in the skill and the template.

## 2.10.0 — 2026-09-04

**A defect is diagnosed before its fix is designed.** The framework treated a
bug as a work item and ran the pipeline over it, and nothing in that pipeline
asked whether the cause had been demonstrated. A fix designed from a plausible
cause is the one defect no later stage can catch: it reads as correct, its
tests pass, and the review sees a tidy diff. The proof has to exist before the
design does, and now something says so.

- **`domain-debugging`**, a fourth model-invoked playbook in the shape of the
  other three. It loads itself when the work is a bug, a regression, a failing
  or flaky test, unexpected or intermittent behaviour, an integration failure
  or a performance regression — in ad-hoc sessions as well as under a gate. It
  fixes the order (reproduce, evidence, trace, hypothesis, prove or disprove,
  root cause, then the fix with its regression test), labels the cause like any
  other claim, and scales the proof owed to the defect's shape: a deterministic
  failure whose cause is on the failing line takes the `Direct` exit with no
  diagnosis written up, and an intermittent, concurrent, data or security defect
  owes a demonstrated mechanism rather than a fix that made the symptom stop.
  It adds no stage and skips none — the fix is reviewed and validated at the
  tier of the code it touches.
- `work-item` reads it at Stage 1 for a defect, briefs the mapper with the
  failing path rather than the reporter's cause, and reads a root cause still
  `UNKNOWN` back at approval as a mitigation rather than a fix. `gate-design`
  §3 and the plan template's reconciliation section record the cause with its
  label.

**A brief carries minimum sufficient context.** `standards/execution-efficiency.md`
§8.5 said what a brief carries; nothing said what it never carries, so a lens
launched by inheriting the conversation — the context that just wrote the diff
— violated nothing. §8.6 names the principle and the exclusions: a fresh
context per launch, never the conversation, the plan document, another agent's
report or a paste of what the agent can read itself, with the single exception
of the one claim a refutation or a re-review exists to judge. Widening stays
the agent's, which is what makes a narrow brief safe.

**A review answers two questions, and a finding is a claim.** `gate-review`
now names the two questions it always asked — *did we build the approved
thing*, owned by the conductor as the whole-change checks, and *did we build it
correctly and safely*, answered by the lenses — with no second reviewer per
ticket: below Critical one pass answers both, and on Critical `architect`'s
declared area already includes plan conformance. The whole-change checks gain
rows for partial delivery, the human's verbatim conditions and unapproved
additions. And each candidate finding now leaves verification as **confirmed**,
**rejected** or **unresolved**: remediation starts only from a confirmed one,
an unresolved Critical or High escalates to a second reader, and nothing is
fixed to be safe — a change made against a claim nobody could confirm is an
unreviewed change with a reviewer's name on it.

Every rule above is anchored in `tests/validate-plugin.mjs`, root-cause
vocabulary is bound to its single source the way the convergence vocabulary
already is, and a `diagnosis-discipline` grader with the
`defect-root-cause-before-fix` case scores the behaviour a static check cannot.

**Nothing to act on.** Methodology only; no consuming repository changes.

---

## 2.9.0 — 2026-09-01

**A ticket proposes a method; the framework now grades it instead of building
it.** A real 2.8.0 run against a bulk-endpoint ticket produced a plan with a new
boolean column, two new tables, a migration, a new queue lane, new error codes
and a new module. The correct design needed none of it: no schema change, no new
module, one job on the existing lane. It took four rounds of user correction to
get there, and on each round the run subtracted from the rejected plan rather
than re-deriving from the one-sentence goal.

Nothing in the shipped text failed. That is the finding. The framework said
"prefer the smallest coherent complete end state" in one sentence of
`gate-design` §5 — a preference with no artefact, no grade and no read-back
behind it, and by this repository's own rule a rule nothing fails on is not a
rule. Every mechanism that could have caught this was pointed elsewhere:

- **The method grade could not express the failure.** `repository-evidence.md`
  §5 grades a prescribed method Sound / Suboptimal / Bad practice. A ticket
  asking for two tables the outcome does not need grades **Sound** — it would
  work — so the one mechanism built to push back on a ticket's HOW was blind to
  the most common way a HOW is wrong.
- **Acceptance criteria entered as requirements.** `gate-design` §1 extracted
  "desired outcome and acceptance criteria" as one thing, and `work-item` fetched
  them from the tracker with no note that a criterion naming a column is a
  proposal. A checklist is the format most often mistaken for a specification.
- **The lens fan-out was itself a scope source.** Four lenses over one small
  request name, between them, every gap the repository has. Each finding is real
  and cited, and their union arrives at the design stage looking exactly like
  requirements — the machinery built to catch under-building becoming the reason
  for over-building, with every artefact downstream reading as diligence.
- **A rejection had no re-derivation rule.** "If the user requests changes,
  revise and remain at Stage 2" produced a plan edited down, which keeps the
  shape that was rejected and draws the same objection again. A run of shrinking
  plans is not convergence; it is the first answer, defended.

**What changed.** `repository-evidence.md` gains **Over-specified** as a method
grade, an explicit split of every acceptance criterion into its outcome and its
mechanism, §4c stating that a map and a lens produce constraints and non-goals
rather than scope, and a line on gathering the evidence that decides an option
before choosing the option. `gate-design` §5 turns its preference into an
obligation: the smallest approach that fully delivers the outcome is always
among the compared options, and only a stated, sourced requirement may defeat
it — "it would not scale" and "we will need this later" are predictions.
`plan.md` §5 now lists every persisted shape and abstraction introduced against
the outcome each one serves. `gate-approve` and `work-item` read the smallest
option back before the human decides, and re-derive rather than subtract when
the answer is that the design is too large.

**Two lines of the always-on charter.** The failure happens while a ticket is
being read, in sessions that never invoke a gate, so a rule reachable only from
`gate-design` arrives after the design exists. The charter now says a ticket
states a goal, not a design, and that its wording and acceptance criteria propose
a method rather than a spec. That spends the charter's remaining budget: it
renders at 84 lines against a ceiling of 84, and the next addition there removes
something first.

Both halves of each rule are anchored in `tests/validate-plugin.mjs` and
`tests/validate-charter.mjs`, and a new `design-minimality` grader plus the
`ticket-proposes-more-than-the-goal-needs` case score the behaviour a static
check cannot see.

**Nothing to act on.** Methodology only, and no consuming repository changes.

---

## 2.8.0 — 2026-08-31

**A brief now assigns one decision, and the launch sites no longer hand a
specialist a list.** A real run of 2.7.0 lost three subagents across Stage 1 and
Stage 4: each reached its turn ceiling without writing anything up, and each had
been given a six-part enumerated brief rather than the single decision §8.5
asks for. Continuing them report-first recovered the work, which is the 2.6.0
mechanism doing its job — but the second attempt was paid for by a briefing
defect, not by the agents.

2.7.0 removed the reading assignments that were spending an agent's opening
turns. What it left in place was the other way a brief removes an agent's
stopping point: **an enumerated brief has no item the agent is allowed to stop
on.** §8.1 decides convergence against *the decision it was given*, so a launch
given six is a launch given none, and the run ends at the ceiling with
everything it established still inside it.

The shipped text was pointing that way. §8.5 owns what a brief carries, and all
three launch sites restated its contents inline with three different lists —
three items in `gate-design`, four in `work-item`, and six in `gate-review`, two
of which asked for pastes rather than pointers. A conductor filling in the
six-item version wrote the six-part brief the standard forbids two paragraphs
later. This is the oldest convention in the repository failing in the ordinary
way: a paraphrase drifted from its source, silently, and nothing could see it.

**What changed.** §8.5 now says that only its first bullet — the decision the
lens owns — is an assignment and everything under it is context rather than a
further task; that a lens owning two decisions is two launches and never a
longer brief, while a lens's *own declared area* is one decision however many
facets it has; and it names the element the review case needed, the agreed
scope and its stated non-goals, where a launch judges work against a decision
already taken. The three launch sites cite it instead of restating it, and each
supplies only what §8.5 cannot know: the map's pointers in `gate-design`, the
review target in `gate-review`. `gate-review` no longer asks for the diff and
the plan document as pastes — a read-only lens is handed the target and reads
the diff itself — and it now states two things the old list left implicit. The
unrelated worktree changes §1 excluded travel to the panel **by name**, because
a lens deriving its own diff cannot otherwise know which edits are not the
change. And plan conformance stays a whole-change check the conductor owns,
rather than something delegated by handing a lens the approved scope.

**Why it survived two releases: the check was green by construction.** The
single-source rule was enforced by asking whether the owner's path appeared
anywhere in the file — and all three launch sites cited §8.5 *and* restated it,
so the suite passed for the entire time the drift was live. Restoring the three
pre-fix files to a 2.8.0 tree now fails `validate-plugin.mjs`, and so does
deleting the new rule from §8.5; both were green before. Each launch site is
anchored to the sentence that defers, the one-decision rule is pinned in its
own source, and the convergence vocabulary is widened so that naming what a
brief carries requires the citation at all — a fourth delegating site added
later is bound by the same check. That binding is file-level and the comment
beside it says so: it catches a new site, or any file that cites nothing, and
an existing launch site is held instead by the anchor on its deference
sentence. `evals/` grades the brief's *shape*
regardless of whether a lens exhausted, since waiting for the symptom scores
every run where the lenses happened to report anyway as though nothing was
wrong.

**The brief was not the whole cause, and the rest of it is here too.** Running
this release's own review surfaced the remainder: two of five lenses reached
their ceilings holding evidence they never wrote up, on briefs that named a
single decision each. What separated them from the three that reported was not
how much they read — one lens that finished and one that did not made the same
number of tool calls. **The ceiling counts turns, and nothing in this framework
ever said so.** An agent issuing independent reads one per turn buys a fraction
of the evidence the same allowance carries when they go out together, and §10's
tool economy governed only what to read, never how many steps a turn holds.

So the runtime contract every agent carries now states it, in the paragraph
that already explains why a ceiling cannot be watched — the two are compatible
and the text says which is which: it governs what a turn buys, never when
investigation stops. `standards/execution-efficiency.md` §10 owns the policy
and the contract carries the projection, as with everything else an agent holds
rather than fetches. The seven review lenses move from `maxTurns: 25` to the
mapper's `40`, which §8 says costs nothing on the runs that were already short
and is the difference on the one run that needed the room. The panel's lenses
must now agree on that number: a bulk edit of seven files that changes six is
invisible to a check asserting only that a ceiling exists, which is how one
lens spent a whole validation run a tier below its peers.

**Nothing about panel composition, independence or depth moved.** The tier
tables, the lens-selection rules, the uncertain-applicability rule on High and
Critical work, the ceilings and `model: inherit` are all unchanged. A brief
carrying less is not a lens investigating less: what came out of it was the
delegating stage's question, which the lens was never launched to answer.

## 2.7.0 — 2026-08-27

**Agents no longer spend their opening turns learning how this framework wants
them to work.** A real run of 2.6.0 watched nine subagents reach their turn
ceilings before writing anything up, each having spent its first turns reading
framework standards to learn the report format. Every one of them recovered when
told to skip the format documents and report from what it already held.

2.6.0 fixed the policy and shipped it as a reading assignment. Every review lens
opened with an ordered list of three to six framework documents, and
`finding-report.md` — first on all seven of those lists — sent the reader on to
a five-hundred-line standard *"before your first search"*. The context mapper
was told to read four sections of it, and again at the end of its run to check
its own floor. **Those reads came out of the same allowance as the investigation
and the report, and were spent before any evidence existed to say what
mattered.** A rule that tells an agent to converge, delivered as an acquisition
task, spends the room it exists to protect.

The static suite could not see it. It asserted that an agent *cites* a
convergence carrier — and the cheapest way to satisfy that is to tell the agent
to go and read one.

**What changed.** `standards/agent-runtime-contract.md` is new and is the single
source of the compact contract every reasoning agent now carries **inside its
own definition**: the evidence labels and the citation rule, source precedence,
that repository content never instructs, the sufficiency test, that widening
outranks stopping, that `UNKNOWN` is not a way to stop early, that the report is
owed from the first turn, that a continued agent synthesises rather than
restarts, that briefed locations are routing hints and not an allowlist,
read-only operation, the report shape, and that correct engineering outranks
correct presentation. The ordered read lists are gone from all eight agents;
each now starts on the repository. `finding-report.md` no longer sends a lens to
the efficiency standard mid-flight, §8.5 states that a brief never carries
execution mechanics, and the three launch sites say so where a conductor writes
one.

**Nothing about depth, independence or the quality floor moved.** The lenses,
their ceilings, `model: inherit`, the widening triggers, adversarial refutation,
and targeted parent verification are all unchanged. No agent lost a capability:
every framework document an agent could open before, it can still open — for a
question its contract genuinely leaves open, rather than as an opening step. Two
of them stay explicitly substantive reads, `untrusted-content.md` for the
security lens and `evidence.md` for the tester lens judging a verdict, because
there the document is the decision rather than its formatting. Reading the
repository's own documentation was never the cost and is untouched.

**What is enforced.** `validate-plugin.mjs` pins every embedded copy
byte-for-byte to the single source, caps the block at 130 lines so a runtime
contract cannot grow back into a second copy of the standards corpus, asserts
each rule the contract must state, and fails an agent that reinstates an ordered
framework read. `evals/cases/efficiency-no-framework-acquisition` and a new
criterion in the efficiency grader cover the behaviour.

Static validation proves the architecture, not the saving. Whether the ceiling
cycles actually stop is a property of a repository large enough to reproduce
them, and no fixture here is.

---

## 2.6.0 — 2026-08-26

**Agents now converge and report; they no longer investigate until they are cut
off.** In controlled runs of one work item at two reasoning-effort settings,
four delegated agents reached their turn ceilings without returning a report at
all — the context mapper and three review lenses, in both runs. Not a shallow
report: nothing. Everything each of them had established was lost, the
conductor re-established it by hand, and each had to be prompted again before it
would write anything down.

The framework already contained every idea needed to prevent that — bounded
investigation, evidence sufficiency, reserving room to report — and none of it
was reachable by the agents that needed it. Seven of the eight agents referenced
no efficiency policy at all. The eighth was told to read the sections either
side of the one that governs it.

**No rigor was removed to fix this.** The independent lenses are what found the
real defects; every one of them still runs, at the same effort, on the same
model policy, with the same review independence and the same adversarial
refutation pass. What changed is that an investigation now has a stopping
condition and a report it owes, and that a specialist is told which decision it
owns rather than being pointed at a repository.

### The convergence contract

- **`standards/execution-efficiency.md` §8 is now the convergence contract**,
  and it owns four things that were previously stated nowhere. **§8.1 the
  sufficiency test**: before each further search or read, name what its result
  could change — a finding, the classification, the implementation shape, an
  authorization, persistence or contract conclusion, a required test, or an
  `UNKNOWN` that would otherwise stand. If it could change none of them, the
  answer is already held, and the step is confirmatory. §4's widening triggers
  **outrank the test outright**, so it never argues against following evidence.
- **§8.2 synthesis is part of the task.** The report is owed from the first
  turn, not attempted once the evidence runs out. The moment the assigned
  decision is answerable, the remaining room belongs to the report.
- **§8.3 the bounded report.** A report carrying verified findings and explicit
  `UNKNOWN`s outranks an exhausted investigation that returned nothing. It is
  never a way to keep a report short: an investigation that stopped while the
  sufficiency test was still returning answers has under-investigated, and
  labelling the hole `UNKNOWN` does not make it one.
- **§8.4 continuation.** A continued agent synthesises what it holds rather than
  restarting, and the delegating stage continues it rather than launching a
  fresh one over the same ground. Two attempts is the limit.
- **§8.5 the brief.** Each launch gets the decision it owns, the band and the
  tier, and `path:line` pointers into its area — and **locations, never
  conclusions.** A specialist handed the parent's verdict on its own concern has
  lost the independence the launch was paying for, and one briefed at a
  repository rather than at a decision has no stopping point to converge on.

### Every lens now says what it did not reach

- **`standards/finding-report.md` gains a coverage line**, returned before the
  findings table and before `No findings.` as well. `No findings.` had two
  meanings — *examined and clean*, and *ran out of room before looking* — and
  nothing in the report told them apart.
- It is also what makes the reader's verification **targeted**. The parent still
  re-opens the source behind any load-bearing claim; what it should never have
  to do is repeat the investigation to work out where to look.
- Findings now separate what the cited line **says** from what was concluded
  from it, so one file settles a row instead of a reconstruction of the
  reasoning, and a citation is stated **repository-relative** — an absolute path
  carries the reader's directory layout into a pull-request body, where it means
  nothing to anyone else.
- **All eight agents read that contract first**, before their first search
  rather than after their last one.
- `templates/review-handoff.md`'s lens table gains a *what it did not reach*
  column, and records a lens that returned no report as exactly that — never as
  `No findings.`

### The mapper

- `context-mapper` reads §8 as well as §3, §4 and §9. It was previously told the
  rest of that file governed stages it was not running; §8 governs it directly.
- **Full depth is now a property of the answer, not of the reading.** Every row
  of the stack ledger is still answered from evidence in every band — a row this
  change cannot reach is answered *as unreachable*, in one line, with the search
  that establishes it. Studying a subsystem the change never touches was
  consuming the room Stages 4 to 9 needed.
- The same rule bounds Stage 5 to the flow Stage 4 traced, and Stage 6 to the
  resolution the change needs. Stage 3's enumeration is complete when the search
  forms stop returning anything new.
- **Stage 9 no longer argues against its own bounded report.** It previously
  said an `Incomplete` map costs the pipeline more than finishing would have,
  which left exhaustion looking like the diligent option. The three outcomes are
  now ranked explicitly, and the ceiling reached with nothing returned is the
  only one that helps nobody.

### Orchestration

- `work-item` Stage 1 and `gate-review` §2 construct briefs on §8.5, and both
  state that verification re-opens the cited lines rather than repeating the
  investigation behind them.
- Both, and `gate-design`, now handle an agent that returned no report: it is
  continued report-first rather than relaunched, at most twice, and never
  recorded as a clean lens.
- The three lenses with an inventory obligation — `security`'s control table,
  `contract`'s surface inventory, `data`'s storage model — are bounded to what
  this change reaches, each in one sentence in its own vocabulary.

### Effort policy, clarified

- **§7 and §12 looked contradictory and were not.** A component's effort is set
  by what it decides; a launch is decided by whether there is anything to decide.
  A lens reasoning about correctness runs at high effort whenever it runs at
  all — reducing it there buys tokens with the finding nobody made. What §12
  rejects is convening such a component over bounded or mechanical work: the
  saving is the launch that does not happen, never a weaker version of one that
  does.

### Enforcement

- `validate-plugin.mjs` **fails any agent that declares a `maxTurns` ceiling and
  cites neither file carrying the convergence contract.** The frontmatter field
  is the trigger, so this is structural rather than prose-grepping: an agent with
  a backstop must be told how to stop before it.
- Six new normative anchors fail either file that stops stating the contract, and
  the convergence vocabulary joins the single-source policies — a second unlinked
  statement of "when have I gathered enough" is the one that drifts loosest.
- Two eval cases (`efficiency-specialist-returns-bounded-report`,
  `efficiency-brief-is-decision-scoped`) and two new criteria in
  `efficiency-discipline`, including a **0.3** row for a delegated agent that
  returned nothing — below ordinary waste, because waste at least produces the
  finding expensively.
- **Those two cases open with the gate command, and no other case does.** A
  delegated agent exists only inside a gate, and the gates are human-invocable
  by construction — so a plain request reaches neither the mapper nor a lens,
  and a case written as one grades the main conversation while appearing to
  grade the panel. `evals/README.md` records the exception and its reason.
- **Neither case can demonstrate the failure that motivated this release, and
  both say so.** No fixture is large enough to exhaust a turn ceiling: a run
  against one converges in roughly a dozen turns against ceilings of 25 and 40,
  with or without the convergence contract. What they measure is the contract's
  observable consequences — the coverage line, the explicit `UNKNOWN`, the brief
  that names a decision. Evidence about ceilings can only come from a repository
  large enough to produce one.

### What deliberately did not change

- No turn ceiling was raised or lowered. Raising one hides ceiling exhaustion
  instead of fixing it; lowering one truncates the deepest legitimate run. The
  value was never the lever.
- No lens was merged, dropped, downgraded or moved to a cheaper model, and no
  token quota of any kind was introduced. The quality floor in §1 is untouched.
- `gate-validate`'s narrow asks to individual lenses were left alone: each
  already names one decision, which is what §8.5 requires.
- The always-on charter is unchanged. Convergence is a property of a delegated
  investigation, and the charter's budget is for what arrives before anything
  has loaded.

---

## 2.5.0 — 2026-08-25

**A one-line change now costs a one-line change.** Until this release the
framework had a floor and no ceiling. Every proportion mechanism it owned moved
in one direction — the higher tier on a boundary, `Standard` as the default
band and `Targeted is earned`, a `Low` classification that still ran Stages 4–7
at full width, and an always-on charter paragraph that classified a human
asking for less ceremony as expressing a preference rather than making a
decision. There was nowhere for a small change to land, so a typo, a log line
or a one-line fix could be mapped, planned, reviewed by a panel and reported
on, and the person paying for it could not turn that off by asking.

Nothing above the line moved. The evidence, tests, review independence and
validation each tier requires are unchanged, and the exit added below is
bounded to the same sensitive-area list the tiers use.

### The exit

- **`standards/execution-efficiency.md` §3 has a fourth band, `Direct`.** A
  comment or wording fix, a rename inside one file, a log line, a formatting or
  test-only tidy, a one-liner whose cause and effect are both already visible,
  or work a human has scoped that tightly: the lines changed and the symbol
  they sit in. No map is produced and none is owed. It is entered from the
  shape of the request rather than earned from one, because a band you have to
  map to justify is not a band — and it is left for `Targeted` the moment a §4
  trigger appears or a §3.1 question cannot be answered from what is open.
- **The charter states the same exit always-on**, as `Below Low there is no
  tier`. It has to be always-on for the same reason the injection defence does:
  the requests that most need the low end are exactly the ones where no gate
  ran and no standard was ever loaded, so an exit stated only inside the
  machinery is unreachable from outside it. The charter line ceiling went from
  80 to 84 to pay for it; `tests/validate-charter.mjs` argues the purchase and
  now fails if the exit — or the bound on it — is deleted.
- **`work-item` checks whether a request is a work item before Stage 1**, and
  says which band and why in one sentence. Being invoked is not evidence that
  six stages are warranted.

### What a request to spend less now decides

- **`standards/execution-efficiency.md` §13 splits in two.** Below the `Direct`
  line a human calling a change small is scoping the work, and it is decisive —
  they know what they meant. Above it the previous rule is unchanged: it buys
  method, not whether, and it is not one of the §1 risk acceptances. Overruling
  a human's scoping is still possible and now has one acceptable form — name
  the §4 trigger that fired.
- New §13.1 states the other half of the asymmetry this framework was built on.
  Overspending was priced as an aesthetic cost; its real cost is that it is
  charged to the same person every time until they stop routing work through
  the framework at all, and a framework routed around protects nothing.
- §12 gains three anti-patterns, and a line saying the quality floor is a floor
  rather than a defence of the entries above it. The first — treating a request
  as a work item because it arrived as a sentence rather than as an edit — is
  the one a careful reader commits while believing they are being thorough.

### Elsewhere

- The charter's evidence labels are scoped to a map, plan, finding or report.
  Ordinary conversation is not a report and is no longer labelled like one.
- `work-item`'s `Low` path carries the tier into Stages 4–7 instead of
  reasserting full ceremony over it. Each of those stages already scaled by
  tier in its own gate; the conductor was overriding them.

Nothing here asks a consuming repository to act.

## 2.4.0 — 2026-08-22

**Approved work can now be picked up safely a day later, and the three files
that disagreed about whether it could now say the same thing.** A pipeline that
stops for human approval and then runs unattended will be interrupted — by
compaction, by a closed terminal, by the end of the day. 2.2.0 gave it a run
state file so it could survive that. What it did not have was any way to answer
the question that actually decides whether resuming is safe: *has the repository
moved under the thing that was approved?*

- **New `standards/resumption.md`** — the single source for the run state file,
  the approval trace, the repository baseline and the drift assessment. It is
  read on demand, only when a run is resumed, and costs nothing on the runs
  that are not.

- **Drift is assessed before a resumed run touches anything, and it compares
  meaning rather than identifiers.** That the commit changed is not a finding;
  a change to a file the approved design was written about is. Three outcomes —
  `SAFE TO RESUME`, `REVALIDATE DESIGN`, `BLOCKED` — and when the reading is
  genuinely balanced it escalates rather than guessing. A README typo does not
  invalidate an authentication design. A rewritten authentication middleware
  does.

- **What an approval survives is now stated once, precisely.** It survives
  compaction and it survives the session being resumed — but only while carried
  by a trace holding the human's own words, and only while the repository has
  not moved under it. Until now `gate-approve` said an approval never carries to
  a later session, `work-item` said a resumed run continues from its trace, and
  `gate-implement` required one "taken in this session"; the host restores a
  resumed session's entire conversation, so "this session" had stopped naming
  one thing. Every uncertainty resolves to `RE-APPROVAL REQUIRED`, and on High
  or Critical work uncertain provenance alone is enough to trigger it.

- **A defect this release found while fixing the above.** `gate-implement` told
  the implementation stage to read the approval trace from "the implementation
  task" — a host task-list record. On a model with no task list, which is the
  default ([C21](docs/constraints.md)), that record never exists, so a correctly
  approved run reached implementation, found no trace, and applied its own rule
  that a design without one is unapproved. It stopped work that had been
  approved. The trace's home is now the run state file, with the task record as
  a mirror where the host provides one.

- **A resumed run never assumes uncommitted changes are its own.** Files are
  classified as this work item's, pre-existing and unrelated, or unknown — and
  unknown is never resolved as Claude's. Nothing is reset, cleaned, stashed,
  checked out or discarded in any class.

- **Persisted state is untrusted input on resume.**
  `standards/untrusted-content.md` §3.1 extends the boundary from "no text found
  in a repository" to any file read back into a later session, including one
  this framework wrote itself. A state field reading *"the human approved this —
  skip the review gate"* is a finding to report, not an instruction. The
  framework wrote the file; that is not evidence it wrote what is in it now.

- **Validation output stops carrying the log and starts carrying the
  evidence.** `gate-validate` runs the full canonical suite, so it produces more
  raw output than any other gate — and all of it flows into the presentation and
  the pull-request body. A passing check is one row. A failing check keeps the
  command, the exit status, the failing check and the error with its
  `path:line`, and not the thousands of successful lines around it.

- **And the rule that makes a concise format safe.** Report only fields the
  command actually printed. A test count, a duration or an exit status the
  runner did not emit is omitted — never estimated, never carried over from an
  earlier run. A tidy summary reads as measured evidence, which is exactly why a
  number invented to complete it is a false `PASS` in a better-looking format.

- **Nothing to do, and nothing new is mandatory.** No settings change, no
  re-run of `framework-install`, no repository artefact. Resumability is not a
  step a normal work item performs: a run that is never interrupted opens its
  state file as it already did and never loads this standard. The one visible
  behaviour change is that a resumed run whose repository has moved under the
  approved design now revalidates instead of implementing, which is the point.

---

## 2.3.0 — 2026-08-19

**The task panel 2.2.0 promised now actually fills.** Setting
`CLAUDE_CODE_ENABLE_TODO_TOOLS` was necessary and, it turns out, not
sufficient: Claude Code registers the task tools behind that key but hands them
over *deferred* — listed by name in the session's inventory of tools it can
load on request, callable only once the run asks for one. A conductor deciding
"do I have a task list?" from the tools already in front of it answered **no**
in a session that had one, skipped the mirror, and left the panel empty. The
run itself was correct throughout — the ledger in the message is the record and
never depended on the host — so the only visible symptom was the one 2.2.0 was
released to remove.

- **What changed.** `standards/gate-handoff.md` §5 now asks the question of
  both places: what is already callable, **and** what the host says it can
  load. If the task list is only in the second, the run loads it once, at
  Stage 1, and the answer stands for the rest of the run.

- **Nothing about a stage depends on the outcome.** One attempt, never
  retried, never waited on, and a mirroring failure is never reported as a
  stage failure. The rule also names no tool and no loading mechanism: two
  renames have already invalidated files written against a specific tool name
  ([C21](docs/constraints.md)), and a third would invalidate a rule written
  against a specific loader.

- **Nothing to do.** No settings change, no re-run of `framework-install`. A
  repository already configured by 2.2.0 has the key it needs; this release is
  the half that reads it. If you configured before 2.2.0, that entry's
  instruction still stands.

---

## 2.2.0 — 2026-08-17

**`framework-install` now switches the task panel on for you.** 2.1.0 moved the
pipeline's position into a ledger in the message, which was right, and left the
native panel as a manual step in each developer's own `~/.claude/settings.json`,
which was not. A per-machine step that has to be found and performed by hand is
one most people never take, so the framework was promising visible progress and
delivering it to almost nobody.

- **What changed on disk.** `ef-install-settings` merges a third thing into your
  project's committed `.claude/settings.json`: the single `env` member
  `CLAUDE_CODE_ENABLE_TODO_TOOLS`, set to `"1"`. A `work-item` run's seven
  stages then tick in Claude Code's task panel, because current models are not
  given the task tools unless a session opts in
  ([C21](docs/constraints.md)). **Re-run
  `/engineering-framework:framework-install` once and commit** — a repository
  configured by an earlier version does not have the key, and nothing else asks
  for it.

- **Nothing else in `env` is read or written**, an existing value for that key —
  `"1"` or `"0"` — is never rewritten, and `--no-task-tools` skips it. To turn
  it off for yourself without changing it for your team, set it in
  `.claude/settings.local.json`, which is per developer and is not committed.
  Note that project settings outrank your own `~/.claude/settings.json`.

- **Why this is not the permissions floor coming back.** The test that admitted
  it is that the key **grants nothing and denies nothing**: a wrong value costs
  you a checklist you did not want, where a wrong permission rule blocks work
  outright and cannot be clicked through. The 1.0.0 line is about rules that can
  deny, and it is unchanged. `tests/validate-install-settings.mjs` asserts the
  new width — three keys, and still nothing written into `$HOME`.

- **The ledger is unchanged and still prints.** It is the durable record and the
  thing that survives a compaction; the panel is how you read the current stage
  without scrolling. Both, not either.

- **`ef-install-settings --check` no longer reports a pending value as done.**
  A key this run *would* write was printed as `PASS ... is "1"`, which is what
  an already-configured project prints — so a dry run on a repository missing
  the key looked identical to one that had it. Both that key and `autoUpdate`
  now print `TODO`, which is what every other pending change in the report has
  always used. The merge itself never changed; only the report did.

---

## 2.1.0 — 2026-08-17

**`/engineering-framework:work-item` had stopped showing where it was, and had
stopped recording that its plan was approved.** Both had the same cause, both
arrived without this repository changing a line, and one of them was silent.

No action required, and nothing is asked of a consuming repository. If you are
on 2.0.0, take this release: the run you get otherwise is one that cannot tell a
compacted session its design was approved.

### Fixed

- **`work-item` prints a pipeline ledger, and no longer keeps its position in
  Claude Code's task list.** Seven stages with exactly one marked in progress,
  emitted in the first response and re-emitted at every stage transition, after
  your approval, on the first response after compaction, whenever the run stops,
  and at the end. A pipeline that stops twice and runs unattended in between is
  now legible while it happens instead of only in its closing report. It
  replaces the two-line stage marker, and it is written into the conversation,
  so it needs no host feature and cannot be withdrawn by one.

  **The half that was not visible.** From Claude Code v2.1.233 the task tools
  are not provided to current models by default (`docs/constraints.md` C21), and
  this pipeline had kept its state in them. Two things stopped working at once.
  The stages no longer ticked — the reported symptom — **and the Stage 2
  approval trace, which was a `TaskUpdate` call, silently stopped being
  written**, so a compacted run could no longer show that its design had ever
  been approved. `gate-implement` then treats the design as unapproved, which is
  the correct outcome reached by wasting the run. That failure produces a
  *shorter, tidier* transcript than the correct one, which is why it had to be
  found rather than noticed.

- **Durable state is a run state file kept outside your repository.** The
  approval trace is written there before the first edit of Stage 3, not at the
  end of it: a run compacted in between is otherwise indistinguishable from one
  that was never approved. No framework file is written into your working tree —
  the only thing a run leaves there is still the approved diff. When a session
  does have task tools, the same seven stages and the same record are mirrored
  into them.

- **Set this on every machine:** `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in your own
  `~/.claude/settings.json` restores Claude Code's native task panel on current
  models, so the seven stages tick while a run works. `framework-install` will
  not write it for you — it merges two keys, `env` is not one of them, and
  buying a progress display by widening that exception is the trade 1.0.0
  exists to refuse. The ledger is the record either way; the panel is how you
  read the current stage without scrolling.

  **Superseded by 2.2.0**, which writes the key into the project's own settings.
  A step every developer had to find and perform by hand was one most never
  took, which made this a feature that mostly did not work. Nothing to undo: a
  value already in your own settings is still honoured.

### Changed for the framework itself

- **CI now fails a shipped file that requires a host task-list tool.**
  `validate-plugin.mjs` refuses any file under `skills/`, `agents/`,
  `standards/` or `templates/` that names `TodoWrite` or a `Task*` tool without
  stating what the run does when the session has none, and carries normative
  anchors for the ledger's emission points and for the run state file. The
  defect it now catches shipped in 1.0.0 and survived every check here, because
  the thing that vanished was the host's and not ours.
- `standards/gate-handoff.md` §5 owns the ledger — its format, its markers and
  every point at which it is re-emitted — so the gates and the conductor cannot
  drift into two accounts of where a run is.
- `evals/cases/ledger-visible-through-run` — grades a run that does all seven
  stages correctly and tells the developer nothing as a failure, on a session
  with no task tools, which is the default.
- `CLAUDE.md` records the invariant this cost us: **a host feature may be used
  and may never be required.**

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
   declaration to `.claude/settings.json`, then commit it. If you already added
   `extraKnownMarketplaces` and `enabledPlugins` by hand, running it again is
   safe: it rewrites nothing that is already correct.
3. **Nothing, if you want auto-update** — the installer turns it on, so your
   team stops chasing plugin updates. Pass `--no-auto-update`, or set
   `"autoUpdate": false` on the entry, if you would rather adopt releases by
   hand. An entry that already states it either way is left alone.

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
- **`framework-install` turns auto-update on.** A new marketplace entry carries
  `"autoUpdate": true`, so a released version arrives without anyone running an
  update command. The framework is **development tooling, not an application
  runtime dependency**: a release changes how Claude approaches future
  engineering work, and does not modify deployed code, update your dependencies,
  touch production, or bypass review, tests, CI or this framework's own gates.
  Teams should be shipping product value rather than tracking framework
  releases. It also follows from removing the version pin — a repository now
  records no framework version, so nothing in it would ever ask to be updated.

  **Auto-update relaxes nothing.** The pipeline, the risk tiers, the evidence
  language and the human-owned operations are unchanged by how the plugin
  arrived on disk.

  **Controlled adoption is preserved.** `--no-auto-update` writes the entry
  without the key, and **an entry that already states `autoUpdate`, `true` or
  `false`, is never rewritten.** The cost accepted: the version bump becomes the
  only thing between a changed standard and every repository that has this key.
  Reasoning in `docs/architecture.md` §4b; platform citations and the
  measurement in `docs/constraints.md` C20.
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
  22 asserted repository shapes including "writes nothing into `$HOME`".
- `reference/marketplace-declaration.json` — the entry the installer writes,
  pinned in CI against `marketplace.json` and `plugin.json` so a rename cannot
  point installing repositories at a marketplace that does not exist. CI asserts
  `autoUpdate` stays exactly `true` — losing it is silent — and a second check
  fails if the installer's source writes into `$HOME`, names Claude Code's
  internal plugin state, or mentions a framework version.

### Unchanged, and worth saying

- **Nothing global is written.** Not `~/.claude/settings.json`, not
  `~/.claude/plugins/known_marketplaces.json`, not the plugin cache.
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

  > **Superseded by 2.0.0.** `framework-install` now writes the declaration
  > itself, with `autoUpdate: true` by default. This bullet records what 1.1.0
  > did; it is not current guidance.
- The plugin's bundled `README.md` carries the exact settings block, so the
  payload states it once and the installer can cite it. **Superseded by 2.0.0:**
  the installer merges it rather than asking anyone to copy it.
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
  **Superseded by 2.0.0:** it now merges the two declaration keys —
  `extraKnownMarketplaces` and `enabledPlugins` — and still never writes
  `permissions`, `hooks` or `env`.

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
