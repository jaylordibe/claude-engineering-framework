# Execution efficiency standard

How much computation a stage is entitled to spend, and what it may never spend
less than. This is the framework's single source for investigation depth, model
choice, reasoning effort, fan-out and output size. Skills and agents cite it;
none of them restate it.

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

Repository mapping runs in one of three bands. A band sets the *breadth* of
investigation; it never removes a category from §3.1.

| Band | Entered when | Investigation |
|---|---|---|
| **Targeted** | A single named behaviour in a known place, nothing in §4 applies, and the floor below is establishable without a system-wide sweep | The entry point and symbol, the files that must change, direct callers and consumers, the tests protecting the behaviour, the observable contract effect |
| **Standard** | **The default.** Anything not positively established as Targeted | The complete affected execution path, and the boundaries, contracts, persistence, access control, tests and consumers on it |
| **Deep** | A High or Critical signal, a cross-cutting or architectural change, an initially ambiguous one, or a changed path the repository's `CLAUDE.md` lists under High-risk paths | Everything the mapping agent's own method describes, at full breadth |

**Standard is the default and Targeted is earned.** A band is a conclusion from
evidence, never an opening assumption, and a cheap classification is the most
expensive mistake available here.

### 3.1 The floor every band establishes

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
| Investigation ran out of room before the §3.1 floor was met | Report the map incomplete, naming what is missing |

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

## 8. Investigation ceilings

An agent's turn ceiling is a **runaway backstop, not a budget.** An agent that
finishes in eight turns costs eight turns whatever its ceiling says, so lowering
one saves nothing on the runs that were already short and truncates the one run
that needed the room — the deepest, highest-risk investigation there is.

- **Reserve room to report.** An investigation running long returns the evidence
  it has, with the §3.1 floor marked complete or incomplete, rather than being
  cut off mid-sweep with nothing written.
- **An incomplete investigation is reported as incomplete**, naming what remains
  unestablished, and escalated per §5 — never rounded up to a finished one.

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

- launching the strongest available model for mechanical discovery because the
  session happens to use it;
- high effort applied to everything without regard to what is being decided;
- mapping the whole repository for an obviously localized change with no
  evidence requiring it;
- fanning out every specialist lens for every review;
- repeating a repository scan whose evidence is still valid;
- pasting complete logs or raw search results into context;
- reading gate instructions the current stage does not need;
- returning a long narrative where a table of findings was asked for;
- spawning an agent for work cheaper than briefing and reading one;
- investigating indefinitely without naming the uncertainty that remains;
- **and the one that outranks every other line here** — reducing tests, review
  independence, security analysis or evidence to hit an efficiency target.

## 13. A request to "keep it cheap" is a preference about method

A human may ask for less spending, and that is a legitimate instruction about
**how** the work is done: fewer speculative searches, a shorter report, no
redundant re-verification, no lens the diff does not touch.

It is not an instruction about **whether** the work is done. It does not lower a
risk tier, retire a gate, remove a required test, drop an independent reader,
skip validation, or convert an `UNKNOWN` into an assumption. Those are the human
risk acceptances in §1, and a request to save tokens is not one of them — it
names no risk, so it cannot be accepting one.

Take the cheaper path where one exists. Say plainly what stays, and why, and
then do that too.
