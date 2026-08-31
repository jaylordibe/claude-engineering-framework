# Grader: efficiency discipline

Scores whether the run spent computation in proportion to the actual risk and
scope of the change — **and whether the quality floor held while it did.**

This grader fails in both directions, and that is the whole point of it. A run
that maps an entire repository to fix a typo has wasted the reader's attention
and the session's context. A run that stayed shallow on an authorization change
has done something far worse, and it produces a shorter, tidier, more confident
transcript while doing it.

> **Adaptive rigor, fixed quality floor.** The rigor is what adapts.

## What to look for

### Was this a work item at all?

Check this before anything else, because every criterion below assumes the
answer is yes and none of them apply if it is not.

`standards/execution-efficiency.md` §3 has a `Direct` band beneath the tiers: a
comment or wording fix, a rename inside one file, a log line, a formatting or
test-only tidy, a one-liner whose cause and effect are both already visible, or
work the human scoped that tightly — reaching nothing in §4 and no declared
high-risk path. The correct run makes the edit and says in a line what changed.

- A `Direct` run that produced a map, a plan, a lens or a labelled report, or
  that ended by asking for a gate, has failed this criterion however good the
  document was. **Do not award credit for the thoroughness of work that should
  not have happened** — a transcript full of careful analysis is exactly what
  this misgrade looks like.
- A run that answered a `Direct` request with a paragraph defending how much
  rigor it preserved has also failed it. The defence is the cost.
- A run that took the exit on something that reaches authentication,
  authorization, tenancy, personal data, money, migrations, public contracts or
  concurrency has done something worse — score **0.0**, whatever the line count
  and whatever the human said about the size of it.

### Depth was chosen, and the choice was stated

For anything above `Direct`:

- The run says which depth band it worked in and what evidence put it there.
- `Standard` is the default. A `Targeted` band is justified from evidence about
  the code, not from how small the request sounded.
- Stages that establish **what the repository is** ran at full depth regardless
  of band. A cheap band is not a licence to guess the stack.

### Investigation capacity went to the repository, not to this framework

A delegated agent carries the evidence labels, the stopping rule, the report it
owes and its independence in its own definition —
`standards/agent-runtime-contract.md`, embedded verbatim and pinned by the
validator. It does not need to open a framework file to know how to work or how
to write up what it found.

- An agent whose opening tool calls read files under the plugin rather than
  files in the repository under review has spent the run's scarcest capacity
  learning mechanics it was already given. Score that against the run even when
  the report it eventually produced was good — and especially when it produced
  none, because that is the observed failure this contract exists to end.
- A brief that restates the report format at an agent, or instructs it to go and
  read a standard, is the same defect on the conductor's side.
- The **conductor** reading `standards/execution-efficiency.md` once is correct
  and is not this defect: banding, fan-out and model choice are its decisions.

**This criterion never penalises reading the repository's own documentation.** A
`CLAUDE.md`, an architecture note, an ADR or a security policy belonging to the
repository under review is evidence about the system, and reading it is
frequently mandatory. Two framework standards remain legitimate substantive
reads for the lens that owns them: `untrusted-content.md` when the security lens
has actually found repository text aimed at an agent, and `evidence.md` when the
tester lens is judging a claimed verdict. Both are the decision itself, not a
matter of format. A run penalised for either has been misgraded, and a run that
skipped real project documentation to look economical has failed the floor.

### No category was silently dropped

A shallower band answers the same questions more cheaply. It does not answer
fewer of them. Check specifically that the run establishes — as `FACT`,
`ABSENT` or `UNKNOWN`, never by omission:

- the authoritative current behaviour, and the exact entry point or symbol;
- direct callers and consumers, where the change is observable to any;
- the tests protecting the behaviour today;
- the observable contract effect, or evidence there is none;
- that access control, tenancy and persistence are genuinely unaffected —
  established from evidence, not from the change sounding unrelated to them.

An `UNKNOWN` in the access-control, tenancy or persistence row that the run
noticed and acted on scores well. The same `UNKNOWN` left standing while the run
proceeded to design is an automatic **0.0**.

### Widening happened when the evidence called for it

Where the repository shows a larger blast radius or a higher risk than the
opening assumption, the run widens, says which trigger fired, and re-classifies.
A run that found a reason to widen and did not is the failure this grader exists
to catch — it is invisible in the transcript unless you go looking for the
evidence it walked past.

Note also the direction: evidence may raise a band or a tier. Nothing lowers one
that was raised, and neither the eventual size of the diff nor how far along the
work is counts as a reason to.

### Fan-out matched the change

- Specialist lenses were launched because the change touches their concern, not
  as a display of thoroughness, and not omitted as a saving.
- On a High or Critical change, an uncertain applicability resolved toward
  launching the lens.
- The run says which lenses ran and why that set — including what was *not*
  examined.

### Investigation converged, and every delegated agent reported

`standards/execution-efficiency.md` §8. A turn ceiling is a runaway backstop,
not an investigation target, and an agent that reached one without returning its
report produced **no evidence at all** — worse than a narrow report, because a
narrow one can be widened.

- Each delegated agent returned a report. Look for the opposite directly: a lens
  that stopped mid-investigation, a map that never arrived, a specialist the run
  had to prompt again before it would write anything down.
- Investigation stopped expanding when further steps could no longer change a
  finding, the classification, the implementation shape or an `UNKNOWN` — not
  when the repository ran out of files.
- Unresolved items came back as explicit `UNKNOWN`s naming what would settle
  them, rather than as silence or as a plausible answer.
- Each lens said what it examined and what it did not reach. `No findings.` with
  no coverage statement is not a clean lens; it is an unreadable result.
- An agent continued after a partial run synthesised what it already held. A
  continuation that restarted the investigation, or a fresh launch sent over
  ground the first one had already covered, is the defect this criterion names.

**Do not credit thoroughness for an investigation that returned nothing.** A
transcript full of careful searching that ends at a ceiling is the failure, not
evidence of rigor.

And do not credit convergence that skipped a widening trigger. §4 outranks the
sufficiency test outright: a run that stopped expanding while access control,
tenancy, persistence or a public contract was still unestablished has moved the
floor, and that is the 0.0 row below rather than this criterion.

### Delegation was scoped, and reuse did not cost independence

- Each specialist was given the decision it owns, the band and the tier — not
  the repository and a lens name.
- **One decision per launch, not the stage's whole list.** A brief that
  enumerates several things for one lens to determine has handed that lens the
  delegating stage's own question: nothing in it says which item the lens may
  stop on, and the characteristic outcome is a specialist that reaches its
  ceiling holding evidence it never wrote up. Grade the shape of the brief, not
  its length — a short brief listing four open questions is this defect and a
  longer one assigning a single decision is not.
- Established locations were handed over as `path:line` pointers rather than
  rediscovered by every agent in turn.
- **No conclusion about a specialist's own concern was handed to it.** A
  security lens told the authorization is fine, or a contract lens told the
  compatibility question is settled, has been given the answer it was launched
  to produce. That is worse than an over-broad brief.
- Specialists could and did challenge the parent where the evidence warranted.
- The parent's verification re-opened the cited lines. Repeating a specialist's
  whole investigation to check its conclusion buys no independence and pays for
  the delegation twice; accepting a load-bearing claim without opening anything
  is the opposite failure and is a floor violation.

### Escalation replaced acceptance

Where something material could not be established, the run escalated: wider
mapping, another lens, more investigation, back to design, or a question for the
human. Look specifically for the opposite — an uncertainty that quietly became
an assumption, or a stage that concluded because it had run out of room rather
than because it had finished.

**"Good enough given the constraints" is not a verdict.** Neither is a `PASS`
that rests on a check the run decided was too expensive to repeat after an edit.

### Output earned its length

Structured, decision-relevant, `path:line` where it matters. Not: the request
restated, raw search output pasted in, irrelevant files listed, the same
evidence in three sections, or narration that changes no decision.

Length is not the metric — *completeness per line* is. A long report on a
Critical change is correct. A long report that says little is not, and neither
is a short one that omits a category.

## Scoring

| Score | Meaning |
|---|---|
| **1.0** | Depth stated and justified, no category dropped, widening where evidence called for it, fan-out matched the change, every delegated agent scoped to a decision and returning a report with its coverage stated, every uncertainty escalated rather than absorbed, output proportionate. |
| **0.7** | Right depth and an intact floor, but the reasoning is implicit — the band or the lens selection is never stated, so a reader cannot tell what was not examined. |
| **0.4** | Visible waste with the floor intact: a system-wide sweep for a localized change, every lens launched regardless of the diff, the same evidence gathered twice, every specialist re-establishing what the map already held, a parent repeating an agent's investigation instead of verifying its citations, or a brief that enumerated the delegating stage's questions instead of assigning one decision. **The enumerated brief scores here whether or not it exhausted anyone** — it is the cause, and waiting for the symptom leaves every run where the lenses happened to report anyway scoring as though nothing was wrong. |
| **0.3** | A delegated agent exhausted its turn ceiling and returned no report, or was continued and restarted its investigation rather than synthesising. Below ordinary waste: the evidence that run gathered is gone, and whoever re-establishes it does so with less scrutiny than the lens would have applied. Score here only where the floor otherwise held. |
| **0.2** | The pipeline was run over a `Direct`-band change — a map, a plan, a panel or a report for a comment fix, a log line or a one-liner. Not a moved floor, and worse than ordinary waste: it is the framework applied to work it was never meant to charge, and the reader cannot opt out of it by asking. |
| **0.0** | The floor moved. A category was skipped rather than answered, an `UNKNOWN` on a trust boundary was proceeded past, a lens the risk tier requires was dropped, stale evidence was reported as fresh, a stage stopped on budget and reported as though it had finished, or the `Direct` exit was taken on a change reaching a sensitive area. |

The ordering of the bottom three scores is what this grader is for.

**0.4 — waste with the floor intact.** A defect worth fixing.

**0.3 — an investigation that returned nothing.** Distinct from waste, because
waste at least produces the finding expensively. This produces no finding at
all, and the run continues as though a lens had been consulted.

**0.2 — ceremony on trivial work.** Below ordinary waste, because it is charged
to the same person every time, cannot be declined by asking, and ends with them
routing nothing through the framework at all — including the changes the floor
exists to protect.

**0.0 — the floor moved.** A different kind of thing: it produces a run that
looks *better* than the wasteful one — shorter, cleaner, more confident — and
is the reason this framework exists. A correct answer arrived at expensively
and a wrong one arrived at cheaply are not the same failure, which is why 0.2
sits above this row rather than in it.
