# Execution efficiency standard

How much computation a stage is entitled to spend, and what it may never spend
less than. This is the framework's single source for investigation depth, model
choice, reasoning effort, fan-out, convergence and output size. Skills and
agents cite it; none of them restate it.

> **Adaptive rigor, fixed quality floor.**

The framework is not cheaper here. It stops paying for work that establishes
nothing, and spends the saving on the changes that need it.

## 1. The quality floor

> Efficiency may never reduce the evidence, validation, testing, review
> independence or review depth required to establish correctness for the
> classified risk level.

Model choice, reasoning effort, context depth, agent count, investigation
breadth and output length may be reduced **only** where doing so does not weaken
an applicable gate. Above that line, waste is a defect. On it, a saving is a
false report. No budget of any kind may turn:

| From | Into |
|---|---|
| `UNKNOWN` | assumed safe |
| `BLOCKED` | `PASS` |
| unverified | verified |
| unreviewed | reviewed |
| untested | tested |
| material uncertainty | accepted risk |

The last row has one exception, and it is not automatable: a **human** may
accept a risk, where the framework already lets them — a condition attached at
the approval gate, or a documented decision on a residual Medium finding. A
stage never accepts one on their behalf, and running short of context, turns or
patience is not evidence that they would have.

**"Ship it, the budget is exhausted" is not a verdict.** The verdicts are
`PASS`, `FAIL` and `BLOCKED` — `standards/evidence.md` §1.

## 2. Minimum sufficient computation

Each stage spends the least repository context, tool output, reasoning, fan-out
and model capability that establishes the confidence its risk tier requires —
and expands the moment evidence says the initial scope was too small.

The target is not the lowest token count. It is the **smallest computation that
establishes production-grade confidence for the actual risk and scope of this
change.** Those are different numbers, and only one of them is safe.

## 3. Investigation depth bands

Repository mapping runs in one of four bands. A band sets the *breadth* of
investigation; from Targeted upward it never removes a category from §3.1.

| Band | Entered when | Investigation |
|---|---|---|
| **Direct** | The change is contained in what is already on screen, nothing in §4 applies, and no changed path is listed under the repository's high-risk paths — a comment or wording fix, a rename inside one file, a log line, a formatting or test-only tidy, a one-liner whose cause and effect are both visible, or work the human has scoped that tightly | The lines changed and the symbol they sit in. **No map is produced and none is owed.** |
| **Targeted** | A single named behaviour in a known place, nothing in §4 applies, and the floor below is establishable without a system-wide sweep | The entry point and symbol, the files that must change, direct callers and consumers, the tests protecting the behaviour, the observable contract effect |
| **Standard** | **The default.** Anything not positively established as Targeted | The complete affected execution path, and the boundaries, contracts, persistence, access control, tests and consumers on it |
| **Deep** | A High or Critical signal, a cross-cutting or architectural change, an initially ambiguous one, or a changed path the repository's `CLAUDE.md` lists under High-risk paths | Everything the mapping agent's own method describes, at full breadth |

**Standard is the default and Targeted is earned.** A band is a conclusion from
evidence, never an opening assumption, and a cheap classification is the most
expensive mistake available here.

**Direct is the exception to that sentence, deliberately.** It is entered from
the shape of the request rather than from a map, because requiring evidence to
justify it would mean doing the investigation it exists to avoid — a band you
have to earn by mapping is not a band, it is a map. The safety is the entry
condition and the exit, not a prior sweep: the moment anything in §4 appears,
or a §3.1 question cannot be answered by looking at what is already open, the
change leaves Direct for Targeted and the map is produced normally.

Misplacing a change in either direction is a defect. Wrongly in Direct is
caught within a turn or two by the reader still in the conversation, and costs
a redo. Wrongly in Standard costs a map, a plan, a review panel and an hour on
work that needed an edit — charged to the same person every time, until they
stop invoking the framework at all. The second does not become a non-defect by
being the careful-looking one.

### 3.1 The floor every band from Targeted upward establishes

A band decides how much an answer may cost, not whether the question is asked:

- the authoritative current behaviour;
- the exact entry point or symbol, and the files directly affected;
- direct callers and consumers, where the change is observable to any;
- the tests that protect the behaviour today;
- the observable contract effect, or evidence there is none;
- enough access-control, tenancy and persistence evidence to establish that
  those areas are **genuinely unaffected**.

Each is answered `FACT`, `ABSENT` or `UNKNOWN` — never omitted, never answered
by silence. In a Targeted band "unaffected" is established cheaply and directly
(this path performs no data access; this symbol has one caller) rather than by a
system-wide audit. **What it is never established by is not looking.**

An `UNKNOWN` in the access-control, tenancy or persistence row of a Targeted or
Standard map is a widening trigger, not a footnote.

**In the Direct band these questions are answered by inspection, not omitted.**
Entering Direct is itself the claim that every row above is already visible —
this text performs no data access, this symbol has one caller, this file is a
test. That claim is cheap to make and cheap to be wrong about in one direction
only: if any row cannot be answered from what is open, the answer is not
`UNKNOWN`, it is that this was never a Direct change, and the band was chosen
wrongly. Leave for Targeted and map it. What Direct never does is answer a row
by deciding it probably does not matter.

## 4. Widening is mandatory, and it is not a failure

Depth is iterative: *initial signal → targeted investigation → evidence → widen
and reclassify when the evidence says so.* A band chosen at the start is a
hypothesis about blast radius, and repository evidence outranks it like any
other prior.

Widen the band, and re-classify the risk tier, on any of:

- the change reaches a trust boundary, an access-control decision, tenancy, or
  personal or financial data;
- a persisted shape, migration, backfill or lifecycle rule is involved;
- the blast radius cannot be bounded — callers or consumers are unenumerable
  from the repository;
- an observable or externally consumed contract is touched;
- concurrency, transaction boundaries or ordering matter to correctness;
- a changed path matches a declared high-risk path;
- repository evidence contradicts the request;
- the architecture the change depends on stays ambiguous after investigation.

Say which trigger fired and what changed as a result. A silent widening is
indistinguishable from an inconsistent one.

**The reverse move does not exist.** Evidence may raise a band or a tier; it may
not lower one that was raised, and neither may a later stage. The eventual size
of the diff is not evidence about risk.

## 5. Escalation

Escalation is what this standard requires instead of accepting an unresolved
material uncertainty.

| Trigger | Escalate to |
|---|---|
| Any widening trigger in §4 | A wider band; re-classify the tier |
| Authorization, tenancy or authentication behaviour cannot be established | Deep band; the security lens, whatever the tier |
| Migration, backfill or destructive data behaviour cannot be established safe | Deep band; the data lens; the design gate if the plan assumed otherwise |
| External or public compatibility is uncertain | The contract lens; consumer handoff becomes a plan blocker |
| Concurrency or transaction correctness is uncertain | The lens that owns it, plus a second independent reader |
| Implementation needs a material divergence from the plan | Back to the approval gate — never a wider reading of the approval |
| Two reviewers disagree on a material issue | An additional independent lens; the disagreement is reported either way |
| A Critical or High finding can be neither verified against source nor put to the lens that owns it | A second independent reader on that one claim. The refutation contract belongs to the review gate and this does not amend it — what escalates is being unable to reach a determination at all |
| Validation evidence is contradictory | `BLOCKED`, naming the two results that disagree |
| A cheaper reasoning path could not establish correctness | A higher-capability model, more investigation, or the human |
| Investigation ran out of room before the §3.1 floor was met | Report bounded per §8.3, naming exactly what is unestablished |
| A delegated agent stopped without returning its report | Continue it report-first per §8.4. Never a fresh launch over the same ground |

Escalation may mean broader mapping, higher effort, an additional lens, a
higher-capability model, more turns, a return to design, or a question for the
human. It never means proceeding on the uncertainty.

## 6. Model policy

Model selection is expressible **per launch**. It is not expressible per risk
tier inside an agent's definition, because a definition is static and the tier
is not known until the change has been mapped. This is therefore a policy for
the stage that launches an agent, not a property of the agent.

| Work | Capability |
|---|---|
| Implementation · design · code review · test design · contract, data and security reasoning | The session's production model. **Never reduced to save usage.** |
| Bounded mechanical delegation — locate files matching a pattern, enumerate callers of a symbol, inventory a directory | May be reduced, under §6.1 |
| Major architectural choice · Critical-risk design · a subtle trust boundary · concurrency or consistency · a difficult migration · destructive data work · conflicting serious findings · anything the session's model could not settle | Raise it, where a higher-capability model is available |

### 6.1 What makes a reduced model safe

**Output from a reduced-capability launch is a set of pointers, not evidence.**
Every claim taken from it is re-established against the source by the reader
relying on it, before it appears in a map, a plan, a finding or a report. A
`path:line` nobody re-opened is a fabrication whichever model produced it —
`standards/repository-evidence.md` §2.

Every framework agent reasons about correctness, and none is launched on a
reduced model by default. Their definitions inherit the session's model
deliberately: a default that fails toward capability costs tokens, and one that
fails toward cheapness costs correctness on the change that mattered.

**No quality guarantee may be stated in terms of which model ran.** The host
resolves the model from an environment variable, then the launch parameter, then
the definition, and an organisation allowlist can substitute another — so the
model that ran is not knowable from here. Guarantees rest on evidence, gates and
independent readers, which hold whatever resolved.

## 7. Reasoning effort

Risk and uncertainty decide effort, not diff size. **A one-line authorization
defect is Critical.** Never reduce effort for security, concurrency, data
correctness or migration safety because the change is small.

Effort is fixed in a component's own definition and cannot be varied per launch
the way a model can. The framework therefore holds every reasoning-bearing
component at high effort and takes its savings where they are expressible:
**which** agents run, **how much** they investigate, and **how much** they
write. A lens that runs only when the diff intersects its concern already costs
nothing on the changes that do not.

That is not in tension with §12's entry on high effort applied to everything,
and the difference is which decision each one is about. **A component's effort
is set by what it decides; a launch is decided by whether there is anything to
decide.** A lens reasoning about correctness runs at high effort whenever it
runs at all — reducing it there buys tokens with the finding nobody made. What
§12 rejects is convening such a component over bounded or mechanical work that
decides nothing: the saving is the launch that does not happen, never a weaker
version of the one that does.

Neither is a claim about which model or setting actually resolved. §6.1's last
paragraph holds here unchanged: guarantees rest on evidence, gates and
independent readers.

## 8. Convergence, and the briefs that make it possible

An agent's turn ceiling is a **runaway backstop, not a budget.** An agent that
finishes in eight turns costs eight turns whatever its ceiling says, so lowering
one saves nothing on the runs that were already short and truncates the one run
that needed the room — the deepest, highest-risk investigation there is.

It is also not a warning. A ceiling stops a delegated agent where it stands,
with no turn left in which to write anything up, so **an agent cannot converge
by watching how much room it has left.** Convergence is a property of the
evidence, and the rest of this section is how it is decided.

**Reaching a ceiling without returning a report is a failed execution, not a
thorough one.** Everything that run established is lost, the delegating stage
has to establish it again, and the change is scrutinised by whoever pays for the
second attempt rather than by the lens that was launched for it. It is the only
investigation outcome that produces no evidence at all — worse than a narrow
report, because a narrow report can be widened and a missing one cannot.

### 8.1 The sufficiency test

Before each further search, read or command, name what its result could change:

- a finding, or its severity;
- the risk tier or the depth band;
- the shape the implementation has to take;
- an authentication, authorization or tenancy conclusion;
- a persistence, migration or concurrency conclusion;
- a public-contract or consumer conclusion;
- a test that would become required;
- an `UNKNOWN` that would otherwise stand in the report.

If it could change one of those, take the step. **This test never argues against
following evidence**, and §4's widening triggers outrank it outright: a step that
would settle a widening trigger always passes it. Where you genuinely cannot
tell whether a step could change one of them, §13.1 settles it — that is a close
call, and close calls spend more.

If it could not, the step is confirmatory, duplicative or merely adjacent, and
what it would return is already held. **Stop expanding and write.** Two
consecutive steps that changed none of the above are the signal that
investigation has converged, whatever quantity of repository remains unread —
**steps, whatever turn they were issued in.** Batching several into one turn
gathers evidence faster; it does not make the signal arrive sooner.

### 8.2 Synthesis is part of the task

The report is owed from the first turn, not attempted once the evidence runs
out. An investigation that continues until it can continue no further has spent
its entire allowance on the half of the task nobody can read.

So: **the moment the assigned decision is answerable from what is held, the
remaining room belongs to the report** — not to one more confirmation of
something already established.

### 8.3 The bounded report

However investigation ends — by §8.1, by §4 having been satisfied, or by being
cut short — what is returned is written from what is held:

- every established claim labelled and cited per
  `standards/repository-evidence.md` §2;
- every unresolved item as `UNKNOWN`, naming what would settle it, rather than
  as a plausible answer or as silence;
- what was examined and what was not reached, so a reader can tell a lens that
  found nothing from one that never looked.

**A bounded report carrying verified findings and explicit `UNKNOWN`s outranks
an exhausted investigation that returned nothing.**

It is not the preferred outcome — §8.1 is — and it is never a way to keep a
report short. An investigation that stopped while the sufficiency test was still
returning answers has under-investigated, and labelling the hole `UNKNOWN` does
not make it one. Escalate per §5: an incomplete result is reported as incomplete
and named, never rounded up to a finished one.

### 8.4 Continuation

An agent continued after a partial run **does not restart its investigation.**
It synthesises what it already holds, fills only the gaps the assigned decision
actually turns on, and returns the report. Re-deriving evidence that is already
in front of it spends the continuation exactly the way the first run was spent.

**The delegating stage owns the other half of this.** An agent that stopped
without its report has not returned a null result — nothing it established is in
anyone's hands. Continue that agent where the session can, asking for the
bounded report first and further evidence only after it; launching a fresh one
over the same ground repeats the investigation that just ran. Where continuation
is not available, the next launch carries a narrower brief and asks for the
report first.

A continuation says *report from what you hold*. It never sends the agent back
to a framework document to check how — the agent's definition already carries
that, and an agent that stopped short of its report has no room to spend
re-reading anything.

**Two attempts is the limit.** A third says the brief rather than the agent is
what needs changing, and by then the bounded work is cheaper done directly —
§12's entry on spawning an agent for work cheaper than briefing one.

**Except where the launch existed to supply independence, and then doing the
work directly is not the fallback.** A review panel on High or Critical work is
the only independent reader that diff will get, so a conductor substituting its
own reading of code it wrote has skipped the gate rather than economised on it.
There the answer is a narrower brief, a different lens, or §5 — never absorbing
the work.

### 8.5 The brief a delegated agent is given

An agent converges on the decision it was given. A brief naming no decision is a
brief to investigate the repository, and that has no stopping point at all — so
a specialist that spends its whole allowance investigating is frequently
reporting a defect in what it was asked, not in how it works.

Give each launch:

- **the decision it owns**, in one sentence;
- **the depth band and the risk tier** it is working in;
- **the paths and symbols already established as in scope**, as `path:line`
  pointers;
- **what the work was already agreed to be**, where the launch judges something
  against a decision already taken — the agreed scope and its stated non-goals,
  in a line or two, never the document it came from;
- the name of the authoritative source for its lens — never a paste of it.

**Only the first of those — the decision it owns — is an assignment.** The rest
is context the agent would otherwise spend its opening turns acquiring, and none
of it is a second thing to do. A brief that reads as an enumerated list of
things to determine has handed over the delegating stage's whole question
instead of one lens's share of it, and **an agent working a list has no item it
is allowed to stop on** — §8.1's stopping rule removed by the brief rather than
by the agent.
Where a lens genuinely owns two decisions, that is two launches or a narrower
lens. It is never a longer brief.

**A lens's own declared area is one decision, however many facets it has.** The
thing this forbids is handing over the questions the delegating stage has to
settle — not asking a specialist to cover the surface its own definition
already claims. Judge the shape, not the length: a short brief listing four
open questions is the defect, and a longer one assigning a single decision is
not.

What a brief never carries is how the agent should work or write up: the
evidence labels, when to stop, that the report is owed, what the report looks
like. Every agent already holds that, embedded in its own definition from
`standards/agent-runtime-contract.md`, so restating it in a brief spends context
on both sides to say something twice — and telling an agent to go *read* it
spends the investigation's opening turns on the framework instead of the
repository, which is the failure §8 exists to prevent.

**Hand over locations, never conclusions.** A pointer says where to look and
costs nothing to re-open; a conclusion about the agent's own concern is the one
thing that can stop it finding the defect sitting there. *"Access control for
this operation is decided at `path:line`"* is a brief. *"Access control here is
fine"* is a brief that has already decided what the lens was launched to decide.

A specialist is never told what to find, never told its own area is already
cleared, and never asked to re-establish what the map established. The first two
remove the independence the launch was paying for; the third is the duplicated
acquisition this section exists to end. It stays free to contradict every
pointer it was given, and when it does, that is a finding about the map as much
as about the code.

**A brief that cannot be stated in a few lines has a scope nobody has decided
yet.** Deciding it once, here, costs less than each agent deciding it separately
and differently.

## 9. Bounded output

**Concise by default; completeness expands with risk and uncertainty.** No fixed
token limit applies to any report: a limit that can truncate evidence buys
efficiency with the thing the report exists for.

Structure over prose — tables, compact bullets, exact paths and symbols,
explicit unknowns, short execution flows, and what is affected against what was
checked and is not.

Leave out: the request restated · repository structure explained at length · raw
search output · files that turned out to be irrelevant · the same evidence in a
second section · prose that changes no decision.

## 10. Tool-output economy

- Read the region that matters; whole files when the reasoning needs them, not
  because they are there.
- Do not read large generated artefacts unless the change touches them.
- Prefer targeted search to a broad dump; narrow before widening.
- During implementation run the focused form of a check. **The validation gate
  still runs the repository's full canonical checks** — that is the gate, and
  the focused runs preceding it never replace it.
- **Independent steps go out in one turn.** A delegated agent's ceiling counts
  turns, not tool calls, so steps issued one per turn buy a fraction of the
  evidence the same allowance would otherwise carry. Batch what does not depend
  on a previous result; sequence only what does. This is not the budget-watching
  §8 rules out — it changes what a turn buys, not when investigation stops.
- Capture the failing evidence, not the entire log.
- Do not re-run a command whose evidence is still valid, and do re-run it
  whenever relevant code changed. Evidence has a scope and an age:
  `standards/evidence.md` §7.

## 11. What survives compaction

Carry forward only what cannot be recovered from disk:

the original and resolved requirement · the current stage · the risk tier and
band · the approved scope · every human condition, **verbatim** · relevant
non-goals · material design decisions · unresolved blockers · review state, if
reached · validation state, if reached.

Do not carry a repository summary forward because it might be useful. **A
summary is never stronger evidence than the source**, and after compaction the
source is still there. Re-read it wherever correctness depends on it.

## 12. Anti-patterns

- **treating a request as a work item because it arrived as a sentence rather
  than as an edit** — the size of the change decides that, not the fact that
  somebody described it;
- producing a map, a plan, a lens or a report for a change in the Direct band,
  or ending one by asking for a gate it was never in scope for;
- narrating an investigation before making a small edit, or explaining
  afterwards how much rigor was preserved;
- launching the strongest available model for mechanical discovery because the
  session happens to use it;
- launching a high-effort reasoning component over bounded or mechanical work
  that decides nothing — the saving is the launch that does not happen, never a
  weaker version of one that does (§7);
- mapping the whole repository for an obviously localized change with no
  evidence requiring it;
- fanning out every specialist lens for every review;
- repeating a repository scan whose evidence is still valid;
- pasting complete logs or raw search results into context;
- reading gate instructions the current stage does not need;
- returning a long narrative where a table of findings was asked for;
- spawning an agent for work cheaper than briefing and reading one;
- investigating indefinitely without naming the uncertainty that remains;
- **reaching a turn ceiling with the investigation still expanding**, so the run
  returns nothing and its evidence is lost — §8;
- restarting an investigation on continuation instead of synthesising what is
  already held;
- briefing a specialist to investigate an area rather than to decide a question,
  or making it re-establish what the brief already supplied as a pointer;
- **and the one that outranks every other line here** — reducing tests, review
  independence, security analysis or evidence to hit an efficiency target.

That last line is a floor, not a defence of the ones above it. Every other entry
here is also a defect, and the first three are the ones a careful reader is most
likely to commit while believing they are being thorough.

## 13. What a request to "keep it cheap" decides, and what it does not

**Below the line in §3's Direct band it is decisive.** A human saying a change
is small, or that the ceremony is too heavy for it, is scoping the work — the
one judgement they are better placed to make than any classifier here, because
they know what they meant. Take them at their word: make the edit, say what
changed, stop. If what they scoped turns out to reach §4, say which trigger
fired and why the scope has to widen. That is a finding, and it is the only
acceptable way to overrule them.

**Above that line it is an instruction about method, not about whether.** It
buys fewer speculative searches, a shorter report, no redundant
re-verification, no lens the diff does not touch. It does not lower a risk
tier, retire a gate, remove a required test, drop an independent reader, skip
validation, or convert an `UNKNOWN` into an assumption. Those are the human
risk acceptances in §1, and a request to save tokens is not one of them — it
names no risk, so it cannot be accepting one.

Take the cheaper path where one exists. Say plainly what stays, and why, and
then do that too — in a sentence. **A paragraph explaining which rigor was
preserved is itself the cost being complained about**, and answering a request
to spend less with a defence of spending is how this standard gets ignored.

### 13.1 Which calls the spend-more default settles

Underspending is invisible and overspending is not, so a judgement call that is
**genuinely uncertain** settles toward spending more. That is the default
throughout this standard, and it is the right one.

It does not settle a call that is not uncertain. Reaching for the higher band
on work that plainly does not need it is not caution: it converts a real cost
into an invisible one, because the person paying it stops sending small work
through the framework and then stops sending the large work too. **A framework
routed around protects nothing.** The ceremony a High-risk change gets is only
affordable if a one-line change does not get it as well.
