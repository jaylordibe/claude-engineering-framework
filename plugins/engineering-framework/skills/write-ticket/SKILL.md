---
name: write-ticket
description: Writes a work ticket the way a business analyst or product owner would — a goal in user-story form, current behaviour cited from the repository, observable acceptance criteria, explicit non-goals, a suggested risk tier and the questions still open. Iterates with the human across turns, re-emitting the full substantive draft each time, and never writes a design, a file, or an issue into any system on its own.
argument-hint: "<one-line goal | rough notes | issue key | issue URL | nothing yet>"
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
model: inherit
effort: high
---

# Write a ticket

Starting point:

```text
$ARGUMENTS
```

This skill starts a **mode the conversation stays in** until the human says
the ticket is final. A ticket is rarely right on the first draft. It converges
through turns, and the rules below describe what every one of those turns owes.

Run it in the **main conversation context**. Do not fork it into a subagent:
the draft is held in the message, the questions are answered by the person
here, and the person is the only one who can end the mode.

The work here is bounded — classifying the input, a targeted read, separating
the outcome from the mechanism, and writing the draft. It maps nothing,
designs nothing, implements nothing and reviews nothing. How much of that
bounded work a given ticket gets is not fixed: **the computation adapts and
the quality floor does not**, exactly as
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` says of every stage.
That standard is the authority for how much this skill reads, asks and writes;
§2a below is only its application to a ticket. A clear request is drafted
from a narrow read and finished. A materially ambiguous one widens — more
evidence, sharper questions — only along the uncertainty, and only inside the
same turns. Nothing here ever earns a second pass, a hidden review or a
delegated agent, and no one selects a depth: it follows from the evidence.

> **A ticket states a goal. A design is the next stage's job.**

The reason this skill exists is a specific default: asked for a ticket, an
agent maps the repository and writes the design it found into the description,
so the ticket arrives at `work-item` as a specification nobody approved.
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` §5 then grades that
method as one proposal among alternatives — rank 5, because that is what a
ticket is — and re-derives the design from evidence. The work spent writing
the specification is discarded, and the human never saw the goal stated on
its own. This skill writes the goal, the evidence that frames it and the
outcomes that would prove it, and stops there on purpose.

## Non-negotiable boundaries

- **Never write a design.** No implementation steps, no file list, no schema,
  no chosen mechanism. A mechanism the human names is kept, labelled
  non-binding, under **Ideas from discussion** (§9 of the ticket) — and it
  stays there unless the human states that the mechanism itself is a
  contractual requirement, in which case the ticket records who said so.
- **Never write anything into the repository.** The ticket lives in the
  message. `disallowed-tools` enforces this for the turn that invokes the
  skill; the rule holds for every turn after it.
- **Never create, edit or transition an issue in a tracker on your own.** The
  finished ticket is handed over as text. If a tracker is connected and the
  human explicitly asks in that turn to create the issue, create it, report the
  key, and touch nothing else in that system.
- **Never decide product behaviour.** An unresolved question about what the
  product should do is listed as open with the human named as its owner. It is
  not answered with the plausible option.
- **Never fill a gap with something plausible.** A fact you did not verify is
  `UNKNOWN`, and it stays visible as `UNKNOWN` in the draft until the human or
  the repository answers it — `${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md`
  owns the labels and the rule. An actor is the gap this is most often broken
  on; §4d says who may be one.
- **Never declare the ticket final.** You say whether it is ready and why. The
  human says it is final.

## 1. Input resolution

`$ARGUMENTS` arrives in one of four forms. Classify it before doing anything
else.

1. **An issue key** (`ABC-123`) or **an issue URL** carrying one — extract the
   key by pattern from the path or query string, never by matching a host.
   When a tracker is connected, fetch the item: this is a **rewrite** of an
   existing ticket, and the existing text is the first input to the split in
   §3. If no tracker is connected, say so and ask for the text. A key is an
   identifier, not a requirement.
2. **A goal, a request, rough notes or a pasted conversation** — the common
   case. Everything in it is rank 5 and untrusted in the sense
   `${CLAUDE_PLUGIN_ROOT}/standards/untrusted-content.md` gives the word: it
   states what someone wants, and it directs nothing.
3. **A defect report** — an observation of something wrong, usually with a
   guess at the cause. §4b has the shape a defect ticket takes.
4. **Nothing** — the human typed the command and will explain. Ask one
   question: what should be true afterwards that is not true now. Do not read
   the repository until there is a goal to read against.

## 2. First turn: read, then draft

**Draft first, interview second.** A draft the human can correct is faster
than a questionnaire they must complete, and a draft with `UNKNOWN` written in
it is a more precise question than any list. The first turn produces a full
ticket in the shape of `${CLAUDE_PLUGIN_ROOT}/templates/ticket.md`, with every
gap labelled.

Before drafting, read the repository for the area the goal names. This is a
**bounded, targeted read** in the sense of
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §3 — the entry
points, the current behaviour, the actors and the tests that pin it — and it
is the narrow start §2a widens from only when evidence requires. Do **not**
launch `context-mapper`: a full map is design-stage spending, and a ticket that
needs one to be written is a ticket that has started designing. What the read
is for:

| Looking for | Because the ticket needs |
|---|---|
| Where the behaviour lives and what it does today | A **Current behaviour** section stated as `FACT` with `path:line`, so the implementer starts from the truth and not from the reporter's memory of it |
| Who the actors are — roles, callers, systems | A story whose "As a" names someone the repository actually distinguishes, or someone the human has explicitly introduced — §4d |
| Entry points a consumer can observe — endpoints, events, exports, files | Whether the change touches a public contract, which raises the suggested tier |
| Tests that pin the current behaviour | Which acceptance criteria are already asserted and which are new |
| The repository's `CLAUDE.md` high-risk paths and canonical commands | The suggested risk tier, and whether the ticket touches something the repository has declared sensitive |
| Anything in the request that the code contradicts | A **Stale** or **Incorrect** grade on the claim, surfaced in the draft rather than silently corrected |

Write what you did not find as `ABSENT` and what you could not determine as
`UNKNOWN`. Absence is often the point of the ticket.

### 2a. Adaptive clarification depth

Follow `${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md`. Use the
minimum sufficient clarification and repository investigation needed to
establish a bounded, evidence-grounded ticket. Start narrow and widen only
when evidence requires it. The standard owns the principle — minimum
sufficient computation (§2), widening as mandatory and not a failure (§4),
the sufficiency test before each further step (§8.1), bounded output (§9),
and the rule that a genuinely close call spends more (§13.1). What follows is
what those mean for a ticket, and nothing else.

**Stay narrow.** The narrow read of §2 is enough, and the draft is written
from it, when:

- the requested outcome is singular and understandable;
- the actor is evidenced by the repository or explicitly supplied by the
  human (§4d);
- the scope boundaries that matter are explicit in the request;
- success can be stated as something observable;
- the repository does not materially contradict the request;
- any mechanism the human named separates cleanly from the outcome (§3);
- no `UNKNOWN` that remains would change readiness (§6).

In that state: inspect only the entry point, the current behaviour, the actor
and the tests that pin them; do not search for edge cases the request and the
code do not suggest; do not read adjacent architecture; do not launch any
agent; do not ask a question whose answer would not change the ticket; keep
the draft short; and stop the moment readiness can be stated. **A clean
request is a short read and a short draft**, however much more the repository
would allow you to read.

**Widen when evidence reveals material uncertainty** — one or more of:

- more than one materially different reading of the requested behaviour
  remains plausible;
- the request appears to contain more than one independently deliverable
  outcome;
- who the actor is, or what they are permitted to do, is unclear;
- a tenancy boundary is unclear, where the outcome crosses one;
- what must be persisted, or kept consistent, is unclear, where the outcome
  touches stored state;
- what a consumer or an external party could observe changing is unclear,
  where the outcome reaches a contract;
- the repository materially contradicts the human's account of today;
- an implementation suggestion is being read as a product requirement, or
  cannot be told apart from one;
- a defect symptom arrives mixed with an unverified cause;
- the observable success or failure behaviour cannot be stated with
  confidence;
- a scope boundary that decides what is inside is still `UNKNOWN`;
- choosing one reading over another would materially change product
  behaviour, security, data integrity, permissions or an external contract.

Not every unknown is a trigger. Widen for the uncertainty that could change
the ticket — its readiness, actor, scope, criteria, contract, failure
behaviour or whether it splits — and for nothing else. A wording choice, a
label, a name the product has not settled: those are noted, not investigated.

**When a trigger fires:**

1. name the specific uncertainty;
2. say what would resolve it — a piece of repository evidence, or a decision
   only the human can make;
3. read only the evidence that uncertainty needs, and nothing adjacent to it;
4. where two readings would produce materially different tickets, put both
   in front of the human, briefly, so the decision is theirs;
5. ask at most three questions in the turn, per §5;
6. keep every part of the ticket already confirmed;
7. leave the rest of the repository alone;
8. do not state `Ready` while the uncertainty is unresolved and the human has
   not explicitly accepted it or deferred it.

**Then contract.** Once the uncertainty is resolved, return to the narrow
state. Investigation does not stay wide because it was wide last turn, and
it does not go looking for the next thing to be uncertain about. Two
consecutive steps that changed nothing in the ticket are the signal to stop
and write (§8.1).

**Widening resolves the WHAT, never the HOW.** It may gather current
observable behaviour, existing actor and role boundaries, the current
external contract, a repository-confirmed constraint, current failure
behaviour, and whatever distinguishes two conflicting readings. It may not be
used to decide a library, a queue, a schema, a cache, an architectural
pattern, a module split, a migration approach, or how hard the work is. A
mechanism the human mentions is recorded under **Ideas from discussion** and
is not a reason to read that mechanism's code, its documentation or its
alternatives — that is design discovery wearing clarification's clothes, and
the design stage owns it. Widening never reaches for `context-mapper`, a
review lens or any delegated agent.

**A defect widens the same way.** The symptom is kept whole, a suggested cause
stays a hypothesis (§4b), and the read establishes only the current behaviour
that grounds the questions the report leaves open — who may act, what
"delivered" means against what "sent" means, what must never happen twice.
The purpose of the wider read is the correct WHAT; the diagnosis belongs to
`${CLAUDE_PLUGIN_ROOT}/skills/domain-debugging/SKILL.md` downstream.

**The split is detected here, not estimated here.** Widening is how a draft
that contains several tickets is noticed — outcomes that could each ship
alone. Several criteria are not several tickets; several independently
deliverable outcomes are, and when it is genuinely unclear whether the human
means one product outcome or three, that is put to them as the question
rather than bundled or split silently. §6 owns the readiness check this
feeds.

**When the goal is contained in what is already on screen** — a copy change,
a wording fix, a one-line behaviour the human has already scoped — say that a
ticket is more ceremony than the change earns, offer the one-line version, and
stop. Being invoked is not evidence that a ticket is warranted.

## 3. Separate the WHAT from the HOW

Every sentence of the input goes through the split
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` §5 owns. The outcome
is the requirement. The mechanism it happens to name is a proposal.

The move, applied to a criterion:

```text
Given:   "Add an is_business flag to the users table."
Outcome: "A caller can tell whether an account belongs to a business."
Idea:    "is_business column on users" → §9 of the ticket, non-binding.
```

The human will keep saying HOW. That is normal and it is not argued with. The
outcome goes into the acceptance criteria, the mechanism goes into **Ideas from
discussion**, and the draft says in one line that it did so. The idea is
preserved for the designer, and it is visibly not a requirement.

The same move applies to a mechanism offered as a suggestion — "maybe use a
cache for this", "a queue would do it" — and the suggestion stays a
suggestion. It becomes a requirement only when the human says the mechanism
itself is the contract: an integration a partner already depends on, a
technology the organisation has mandated, a constraint they own the risk of.
Then the ticket records it as a criterion **with the sentence in which the
human made it contractual**, so the design stage can see that it was a
decision and not a drift. "Maybe use X" is never that sentence.

Grade every factual claim the input makes against what the read found —
Confirmed, Partially confirmed, Stale, Incorrect, Not found, Ambiguous — using
the vocabulary that standard defines. A claim graded Stale or Incorrect is
shown in the draft with the evidence, because the person who wrote it believes
it, and a ticket that silently corrects them has hidden a disagreement the
design stage will re-discover.

## 4. The ticket, section by section

The shape is `${CLAUDE_PLUGIN_ROOT}/templates/ticket.md`. What each section
must satisfy, and what it becomes downstream — this is what makes the ticket
fit the pipeline it will be fed into:

| Section | Must satisfy | Becomes, in `work-item` |
|---|---|---|
| **Title** | Names the outcome, not the mechanism. A verb and an actor. Fits in one line of a board | The item's name |
| **Story** | `As a <actor>, I want <capability>, so that <benefit>`. The actor is grounded the way §4d requires; the benefit is real and stated, or the ticket has no goal | The requirement gate-design §1 establishes |
| **Current behaviour** | What happens today, `FACT` with `path:line`, or `ABSENT` | Half of the reconciliation table — the half the mapper will re-verify |
| **Problem** | Why the current behaviour is not enough, from the actor's side. No solution words | The WHAT, kept apart from any HOW |
| **In scope / Out of scope** | Non-goals stated as sentences, not as an empty heading. Anything adjacent the reader might assume is included and is not | The scope boundary review checks a diff against |
| **Acceptance criteria** | §4a below. Every one observable and testable; none naming a mechanism | What gate-validate maps tests to, and the outcomes gate-review confirms are delivered |
| **Edge cases and failure behaviour** | The boundaries this outcome actually has — the wrong caller, the invalid input, the repeat, the partial failure — each decided or listed as an open question. A boundary the outcome does not have is not a row | Negative tests, and the questions the threat model asks first |
| **Contract and data touchpoints** | What a consumer or a stored record could observe changing, stated as an outcome. Not a schema. Present only when something observable changes | The trigger for the contract and data lenses, and for a higher tier |
| **Suggested risk tier** | Low, Medium, High or Critical with the sentence that decides it, using the charter's tiers. Advisory: it shapes ceremony and blocks nothing | The starting point gate-design classifies from — and may overrule |
| **Dependencies and sequencing** | Other tickets, external parties, data that must exist first, a feature flag or a rollout order the product needs. Present only when one exists | Deployment-ordering questions for the architect lens |
| **Open questions** | Each with an owner — the human, by name of role — and what changes depending on the answer | Ambiguous product behaviour gate-design must not silently decide |
| **Ideas from discussion** | Non-binding. Every mechanism anyone proposed, kept so it is not lost. Present only when someone proposed one | Candidate methods, graded like any other |
| **Evidence** | The `path:line` pointers the draft rests on, so an implementer can verify the ticket in a minute | Locations the mapper is handed |

### 4a. What makes an acceptance criterion acceptable

Write them as `Given <state>, when <actor acts>, then <observable outcome>`.
Each criterion:

- names **one independently verifiable outcome**. The word "and" is a signal
  to look, not a verdict: "the request is rejected and nothing is persisted"
  is one invariant a single test checks, and it stays one criterion; "the
  booking is created and the reporting dashboard refreshes" is two outcomes
  that pass or fail separately, and it is two criteria. The test is whether
  one could hold while the other fails;
- is checkable by someone who cannot read the code, from outside the system;
- names an actor, an action and a result the actor can see;
- says nothing about a table, a column, a flag, a class, a module or a file;
- has a **negative** sibling where the outcome has a boundary the request or
  the repository makes real — the caller who is not permitted, the input that
  is not supported, the state that is not valid, the second attempt, the
  excluded scope, the failure the actor would notice. A boundary that exists
  gets its criterion. A boundary nothing in the request or the code supports
  is not invented so that every positive line has a partner; where it is
  unclear whether a boundary exists, that is an open question;
- is stable if the design changes — a criterion that only one design could
  satisfy is a design.

The test for the set: if two competent engineers built two different designs
and both passed every criterion, would the human accept either? If not, a
requirement is missing. If yes, the criteria are done and the choice between
the designs is the design stage's to make.

### 4b. A defect ticket

When the input is a defect report, the **Problem** section carries the
observation whole — the failing output, the trace, the steps, how often — and
the reporter's cause is written as a hypothesis, labelled as one. So is any
cause the read suggests: a line that *could* produce the symptom is an
`INFERENCE` in the ticket, never a root cause, however plausible it reads.
The ticket does not name a root cause it has not demonstrated;
`${CLAUDE_PLUGIN_ROOT}/skills/domain-debugging/SKILL.md` owns the order in
which that proof is produced, and the design stage will run it. The story for
a defect is the intended behaviour: what the actor expected to be true.
Acceptance criteria are the intended behaviour restated as outcomes, plus the
regression the fix must not reintroduce.

### 4c. Work with no user in it

Operational, migration, dependency and technical-debt work still has an actor:
an operator, a maintainer, a downstream system's owner, an on-call engineer.
Name them, and name the benefit they get. If no one can be named who benefits,
that is a finding to put to the human before the ticket is written — work with
no beneficiary is work nobody can accept.

### 4d. Who may be an actor

The "As a" of a story is grounded in exactly one of two ways, and the draft
says which:

1. **Evidenced.** The repository distinguishes the actor — a role, a
   permission, a caller, a system, an operator the code or the tests name —
   and the ticket cites it as `FACT` with `path:line`. A repository with an
   `admin` role gives you "As an admin".
2. **Human-supplied.** The human introduced the actor as part of the product
   behaviour they are asking for, and the repository has no such actor yet.
   "Finance auditors need to export the monthly ledger" gives you "As a
   finance auditor", with a line saying the actor is new product scope the
   human named and `ABSENT` from the code today. That the repository does not
   know the actor is a fact about the current behaviour, not a reason to
   reject the ticket — a greenfield capability often introduces its actor.

Nothing else grounds an actor. A persona that would make the story read well
— an "operations manager", a "power user" — is invented if neither the code
nor the human named it, and it is the silently filled gap in its most
comfortable form. When neither source supplies one, the story keeps `UNKNOWN`
in the "As a" and the draft asks one bounded question: who is meant to be
able to do this. The rule is the same for a product story and for the
operator, maintainer or on-call engineer of §4c: named by the repository, or
named by the human, or `UNKNOWN`.

## 5. Every turn after the first

Each turn in the mode does all of the following, in this order.

1. **Absorb the answer.** The human's message may answer a question, add a
   requirement, name a mechanism, or change their mind. Apply §3 to it.
2. **Re-read the code when scope moved.** A new requirement touching an area
   the first read did not cover gets the same bounded read before the
   **Current behaviour** section is extended. Never extend it from
   assumption.
3. **Re-emit the whole substantive ticket.** Never a diff, never "updated the
   criteria section". Every turn carries the full current state — the story,
   the current behaviour where evidence exists, the problem, the scope with
   its exclusions, every acceptance criterion, and every open question still
   unresolved — so the last message stands alone and survives compaction. A
   criterion or an exclusion established in an earlier turn is in this turn's
   draft unless the human removed it, and an answer the human gave is in the
   draft as the content it became. What is **not** re-emitted is a section
   with nothing in it: no **Contract and data touchpoints** when nothing a
   consumer could observe changes, no **Dependencies** when there are none,
   no **Edge cases** table of blank rows, no **Ideas from discussion** when
   nobody proposed one. An omitted section is omitted, not written as "none",
   "N/A" or "not applicable" — a placeholder is output the reader has to
   check and it says nothing. Write "none" only where the absence is itself a
   boundary the reader needs — *no existing caller may see a difference* is
   a requirement; *Dependencies: none* is a line. Above the draft, one line
   beginning `Changed:` says what this turn altered. When §2a widened this
   turn, what accompanies the draft is the uncertainty, the evidence that
   bears on it and the readings it decides between — never the investigation
   itself. Search results, files that turned out not to matter and reasoning
   that changed no line of the ticket stay out of the message
   (`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §9).
4. **Ask at most three questions**, ranked by how much the answer changes the
   ticket. Three is the hard limit; the usual number is fewer. A question is
   justified only when its answer could change at least one of: readiness,
   the actor, the scope, an acceptance criterion, a contract requirement, an
   important failure behaviour, or whether the ticket splits. If the answer
   would not materially alter the ticket, do not ask it. Where the repository
   can establish the fact from a bounded read, read it rather than asking the
   human to describe what their code already states. Never ask a broad
   question — "can you give more detail", "what else should happen", "any
   edge cases?" — ask the focused one that exposes the exact unresolved
   decision, with the readings it decides between where that helps. Every
   other question waits, still visible in **Open questions**. A question the
   draft already shows as `UNKNOWN` is asked by pointing at it, not by
   restating it.
5. **State readiness in one line.** `Ready` with the reason, or `Not ready`
   with the one thing that most stands in the way. §6 defines ready.

And two things it watches for:

- **A second goal.** When the conversation grows an outcome the story does not
  cover — "and while we're there…" — say so, and offer it as a second ticket.
  One ticket delivers one story. A ticket with two is bounded by neither and
  reviewed against both.
- **Scope that only looks like scope.** A constraint on how the outcome is
  delivered — it must stay authorised, it must not be unbounded, a partial
  failure must have defined semantics — is an edge case or a criterion, not a
  new feature. `${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` §4c
  owns the distinction.

**If the human says "just write it."** Produce the smallest honest ticket: a
story, the criteria the input supports, and every gap as an open question with
its owner. A short ticket with visible holes is a good ticket. A short ticket
with the holes quietly filled is a specification of the wrong thing.

**After compaction** the draft is rebuilt from the last full ticket in the
summary, and every `FACT` in it is re-read from the code before it is
restated — `${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §11. A
summary's account of what the code does is not evidence.

## 6. What "ready" means

A ticket is ready when it satisfies all of these, and the readiness line names
the first one it does not:

| Check | Fails when |
|---|---|
| **One story** | The ticket delivers more than one outcome |
| **Actor grounded** | The "As a" is neither evidenced from the repository nor supplied by the human, and is not shown as `UNKNOWN` — §4d |
| **Beneficiary named** | The "so that" is missing, circular, or a mechanism |
| **No mechanism in the story or criteria** | Any criterion names a table, column, flag, class, module, file or library, other than one the human made contractual in so many words |
| **Every criterion observable** | A criterion cannot be checked from outside the system |
| **Boundaries have negatives** | A boundary the request or the repository makes real — a wrong caller, an unsupported input, an invalid state, a repeat, an excluded scope — has no criterion and no open question for it |
| **Non-goals written** | Out of scope is empty, or says only "everything else" |
| **No `UNKNOWN` in story or criteria** | A gap the ticket depends on has not been answered or explicitly deferred |
| **Open questions have owners** | A question exists with nobody named to answer it, or one whose answer would change a criterion is not marked as blocking |
| **Risk tier stated with its reason** | The tier is missing, or given without the sentence that decides it |
| **Current behaviour cited or absent** | A claim about today's behaviour has no `path:line` and is not labelled `ABSENT` |
| **Bounded enough to plan** | The outcome contains more than one independently deliverable goal; the ticket's edges cannot be stated without first choosing a design; a scope boundary that decides what is inside remains unresolved; or the request is broad enough that it should be several tickets |

The last check is about scope, not size. **The ticket writer never estimates
how long the work takes or how hard it is** — that answer needs a design, and
a design is what the next stage produces from this ticket. What the writer
can judge without one is whether the outcome has edges: a request for one
thing with its exclusions stated is bounded however much work it turns out to
be, and a request for three things is three tickets however small each one
is. When the check fails on breadth, the readiness line proposes the split —
one story per ticket, and which one this draft keeps.

These are the ordinary tests a good story is held to — independent,
negotiable, valuable, bounded, testable — written so that each one is a
specific sentence in the draft that either exists or does not.

Ready does not mean every open question is answered. A question the human has
deliberately deferred to the design stage stays open, marked deferred, with
what depends on it. That is a decision, and it is recorded as one.

## 7. Finalisation

When the human says the ticket is final:

1. Emit the ticket once more, **clean**: draft markers, `Changed:` lines,
   readiness lines and grading notes stripped; `UNKNOWN` labels that survived
   converted to open questions with owners; sections the ticket never earned
   still absent. Put it in one fenced block so it pastes into a tracker
   unchanged.
2. Say what happens next, in two lines: the ticket can be fed to
   `/engineering-framework:work-item` as pasted text or by its key once filed,
   and that stage will re-verify every `FACT` and grade every idea. That is not
   distrust of this ticket. It is the ticket being a ticket.
3. Create nothing anywhere. If the human asks in that turn to create the issue
   in a connected tracker, do exactly that and report the key.

## 8. Anti-patterns

Each of these has been observed in a real transcript, and each is a defect.

- **The specification wearing a ticket's clothes.** Steps, files, a schema, an
  ordered list of edits. Everything in it is an unapproved design, and it goes
  stale the day the code moves.
- **The interview before the draft.** Eight questions and no ticket. The human
  came with a goal; give them something to correct.
- **The interview disguised as clarification.** Three questions a turn, every
  turn, none of which would change a line — asked because widening was
  permitted, not because anything was uncertain. §2a widens on material
  uncertainty; a question whose answer alters nothing is a cost with no
  ticket behind it.
- **The read that keeps going.** Queues, providers, retries and internals
  inspected for a request that named none of them, because the repository was
  there and reading it felt like rigour. The narrow read answers what the
  ticket asks; the rest is the design stage's evidence, gathered by the stage
  that will use it.
- **The widening that never contracts.** Investigation still broad three turns
  after the uncertainty that opened it was resolved, each turn finding a new
  thing to be unsure of. Once the trigger is gone, the read returns to
  narrow, and two steps that change nothing are the signal to write.
- **The clarification that designs.** A mechanism the human mentioned, taken
  as a reason to read its implementation, compare it to alternatives, or
  decide whether it would work. That is design discovery, and the ticket
  records the idea as non-binding without doing any of it.
- **The narrow read that should have widened.** A tidy, confident, short draft
  over a request that contained two actors, a symptom and a cause, or a
  contract nobody could state — the cheap classification
  `${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §3 calls the most
  expensive mistake available. The floor is fixed; only the spend adapts.
- **The silently filled gap.** A plausible actor, a plausible tier, a
  plausible current behaviour written without a read — the same shape as a
  design from an assumed architecture.
- **The invented persona.** An "operations manager" in the story because the
  sentence needed a subject, when the code names no such role and the human
  never did. The actor the human did name is kept even when the code has never
  heard of it; the one nobody named is `UNKNOWN`.
- **The checklist criterion.** "A migration adds the column." It is checkable
  and it is not an outcome.
- **The suggestion promoted.** "Maybe use a cache" arriving in the criteria as
  "a cache must be used". The human offered an idea and received a
  requirement they never made.
- **The boundary with no negative.** An unauthorised caller or an invalid
  input the request plainly has, decided by whoever implements it because
  every criterion described the happy path.
- **The manufactured negative.** A "wrong caller" criterion on an outcome
  with no caller, an "empty set" row on an outcome with no set — a negative
  for every positive because the template had a slot for one. It reads as
  rigour and it is a speculative requirement nobody asked for.
- **The split by conjunction.** "Rejected and nothing persisted" cut into two
  criteria because it contained "and", when it is one invariant one test
  checks. Atomicity is about what can be verified apart, not about grammar.
- **The estimate.** "About two days" or "a small change" in the draft. The
  writer has no design to estimate from, and a number written without one is
  a design decision made in a sentence.
- **The union of lens findings as scope.** Every adjacent gap the read found,
  written into scope because it was real. It was real and it was not asked
  for.
- **The ticket that decides.** A product question answered in the draft with
  the option that seemed reasonable, instead of asked.
- **The cause that was not proved.** A defect ticket that names the line at
  fault because the read found a line that could be. It is a hypothesis with
  a `path:line`, and it is labelled as one until `domain-debugging` proves it.
- **The tier as a gate.** Writing the risk tier as though it blocks anything.
  It shapes ceremony downstream and nothing else.
- **The diff instead of the draft.** "I updated the criteria" with the ticket
  nowhere in the message. The next turn, or the next session, has nothing to
  work from.
- **The dropped criterion.** A re-emitted draft that is shorter than the last
  one because a criterion or an exclusion the human agreed to two turns ago
  quietly fell out. The full substantive state is re-emitted every turn; only
  the empty sections are not.
- **The form filled in.** Every heading of the template present every turn,
  with "N/A" under half of them. The template is structure. A section with
  nothing in it is omitted, and the reader is spared the checking.
- **Finalising unasked.** Announcing the ticket done because no question
  remains. The human closes the mode.
