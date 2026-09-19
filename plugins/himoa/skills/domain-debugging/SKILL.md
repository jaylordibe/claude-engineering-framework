---
name: domain-debugging
description: The order a defect is diagnosed in, and the proof a fix owes before it is designed. Carries the questions a defect must answer, and none of the answers.
when_to_use: Use when the work is a bug, a regression, a failing or flaky test, unexpected or intermittent behaviour, a defect reported from production or staging, an integration failure, or a performance regression whose symptom must be explained before anything is changed — any work where the cause has to be found before the fix can be designed.
user-invocable: false
---

# Diagnosis before remediation

This skill carries the **order of a diagnosis and the proof a fix owes**. It
does not know what is broken in this repository, why, or how it is tested.

**Establish that from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md`. A defect report is
rank 5 like any other request: it states an observation and usually a guess at
the cause, and the guess is the part written most concretely.

> **A plausible fix is not a substitute for a demonstrated root cause.**

A fix designed from a plausible cause is the one defect no later stage can
catch: it reads as correct, its tests pass, and the review sees a tidy diff.
What was wrong is invisible from every stage after the design, so the proof has
to exist before the design does.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What is observed, exactly — the failing output, stack trace, assertion or symptom, kept whole rather than summarised? | |
| What was intended, and which source says so — a test, a contract, a document, the reporter? | |
| Does it reproduce, by what steps, and how often? If not on demand, what evidence of it exists at all? | |
| What changed recently on this path — code, dependency, configuration, data, environment? | |
| Which path reaches the failing point, and at which boundary does the observed value first depart from the intended one? | |
| Is there a working equivalent — a sibling path, an earlier version, another caller — and what differs? | |
| Which tests cover this path today, and why did none of them fail? | |

The first row is kept whole. A summary of a failure drops the detail that
decides between two causes:
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §10 keeps the
failing evidence and drops the rest of the log, never the reverse.

## 2. The order, and why it is an order

```text
reproduce or observe → gather the evidence → trace and isolate
→ hypothesis → prove or disprove → root cause
→ minimal correct fix → regression coverage
→ normal review → normal validation
```

Each step is answered from the one before it. Every failure mode in §4 is the
same move — a later step taken before an earlier one.

**A hypothesis is one sentence naming a mechanism** — *X produces the observed
Y because Z* — and it predicts something checkable: a value at a boundary, a
step that fails under a specific input, a test that fails with the fix absent.
The experiment is the smallest thing that checks the prediction, one variable
at a time. A hypothesis whose prediction was observed is the root cause. One
whose prediction was not is disproved, and the next hypothesis is formed from
the new evidence rather than stacked on the old one.

**The root cause is labelled like every other claim.** `FACT` when the
mechanism was observed on the failing path; `INFERENCE` when it follows from
facts by a stated step; `UNKNOWN` when it could not be established. Only the
first two support a fix design. An `UNKNOWN` cause is a finding: the report
says so, names what would settle it, and the human decides whether a
mitigation ships in its place — a retry, a timeout, a guard — labelled as a
mitigation and never as the fix.

## 3. How much proof the defect requires

Rigor scales with the defect's shape, not with the size of the fix.
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` owns the bands and
the widening triggers; this table says what they mean for a diagnosis.

| The defect's shape | Proof owed | Where the fix goes |
|---|---|---|
| Deterministic, reproduced, and the cause is on the failing line — a typo, an inverted condition, a wrong constant — with nothing in that standard's §4 reached and no declared high-risk path touched | The reproduction is the proof. Fix it, run the reproduction, say what changed | The `Direct` band. No map, no plan, no written-up hypothesis, and investigating it at length is the defect |
| Deterministic and reproduced, cause traced through more than the failing line | The hypothesis, the experiment that confirmed it, and a regression test observed to fail without the fix | The normal pipeline, at the tier the touched code carries |
| Intermittent, concurrent, cross-component, environment-dependent, data-corrupting, security-relevant, or a performance regression | A reproduction that fails reliably, or a stated reason none is possible and the evidence relied on instead; the value observed at each component boundary; a hypothesis whose prediction was observed — never one whose fix made the symptom stop | At least High, per §4 there. A fix that silences the symptom without a demonstrated mechanism is not a fix, and is reported as one that did not |

A defect in the first row that turns out to reach a boundary in §4 has left
that row, whatever its line count. The safety of the exit is its bound.

## 4. The failure modes, in order of how often they are real

### Fixing the symptom

The value is wrong at the output, so the output is corrected. The bad value
still originates upstream and still reaches every other consumer. Trace to
where it first departs from the intended one, and fix there.

### Stacking fixes

The first fix did not resolve the reproduction, so a second is applied on top
of it, and nothing can now say which change did what. A fix that did not
resolve the reproduction is reverted; the new evidence goes into §1, and the
next hypothesis is formed from it.

### Fixing without reproducing

The report describes the symptom, the cause looks obvious, and the fix ships
against the description. The reporter's account of the mechanism is rank 5,
and the obvious cause is the guess the report was written around. Reproduce
first. Where reproduction is impossible, say so, and say what stood in for it.

### Calling it environmental

"Flaky", "timing", "the network", after a short look. Most of those have a
mechanism that a reproduction under the right condition exposes. The label is
earned by the §1 table having been answered, not by the investigation having
been short — and where it is earned, what ships is labelled a mitigation.

### Taking a green suite as proof

The suite passed before the defect was reported. Passing again after the fix
proves the fix broke nothing the suite covers. It proves nothing about the
cause unless a test reproduces the defect and fails without the fix.

### Widening the fix

The diagnosis found other things wrong. Each is real, none was asked for, and
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` §4c owns them:
reported as non-goals with their evidence, never fixed in the same diff.

## 5. Tests that must exist

`${CLAUDE_PLUGIN_ROOT}/standards/testing.md` §3 already requires a regression
case for every defect fixed. A diagnosis adds one property to it:

- the regression test reproduces the defect and **was observed to fail with
  the fix absent** — a test written after the fix and only ever seen passing
  has not been shown to test the defect;
- for an intermittent or concurrent defect, the test forces the condition —
  two callers on one record, the boundary value, the ordering — rather than
  hoping to hit it;
- where the repository's test topology cannot express the reproduction, say so
  and name the evidence the fix rests on instead. That gap is an accepted risk,
  stated as one rather than left implicit.

## 6. Rejoining the pipeline

The diagnosis changes what the fix is designed from. It changes nothing about
what happens to the fix afterwards.

The fix is a change like any other: it carries the tier of the code it touches,
it is reviewed at that tier's width, it is validated with the repository's
canonical commands, and a human owns the commit. The reproduction, the
hypothesis, the evidence that confirmed it and the cause's label go where a
plan reconciles the request against repository reality, and from there into the
presentation and the pull request — so the next reader can tell a demonstrated
cause from a plausible one.
