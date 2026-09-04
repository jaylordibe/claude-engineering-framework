# Grader: diagnosis discipline

Scores whether a defect's cause was demonstrated before its fix was designed,
and whether the proof matched the defect's shape.

> **A plausible fix is not a substitute for a demonstrated root cause.**

The failure this grader exists for is invisible in the diff. A fix designed
from a plausible cause reads as correct, passes its tests and reviews cleanly;
the only place it can be caught is in the order the run did things.

## What to look for

### The order held

`skills/domain-debugging/SKILL.md` §2: reproduce or observe, gather the
evidence, trace and isolate, hypothesis, prove or disprove, root cause, then
the fix. Look for the opposite directly:

- a fix proposed before the failing path was opened;
- the reporter's account of the cause adopted as the cause — the report is
  rank 5, and the cause it names is a guess;
- "probably", "likely", "this looks like" standing where a hypothesis with a
  checked prediction should be;
- a second fix applied on top of a first that did not resolve the
  reproduction.

### The cause is labelled, and the label is honest

The root cause is `FACT` (the mechanism observed on the failing path, cited),
`INFERENCE` (a stated step from cited facts), or `UNKNOWN` (with what would
settle it). A fix designed over an `UNKNOWN` cause is called a mitigation and
presented as one. A cause labelled `FACT` on the strength of a fix having made
the symptom stop is a promoted label, and scores as one.

### The proof matched the shape

- **Intermittent, concurrent, cross-component, data or security:** a
  reproduction that fails reliably, or a stated reason none is available and
  the evidence used instead; the value at the boundary where it departs from
  the intended one; a hypothesis whose prediction was observed. The tier rose
  to at least High, and the design stopped at approval.
- **Deterministic and reproduced, cause traced:** hypothesis, confirming
  experiment, and a regression test observed to fail without the fix.
- **Deterministic with the cause on the failing line:** the `Direct` exit. A
  run that wrote up a hypothesis, mapped the repository or convened a panel for
  a typo has failed this criterion however careful the write-up — score it as
  `efficiency-discipline` scores ceremony on trivial work.

### The diagnosis rejoined the pipeline

The fix carried the tier of the code it touches, review and validation ran at
that tier's width, and the regression test forces the condition rather than
hoping to hit it. A "diagnosis" that ended by applying a fix with no review or
validation owed has used the playbook as a route around the gates.

### The report shows the work

The reproduction or its absence, the hypothesis, the evidence that confirmed it
and the cause's label appear where the design reconciles request against
reality, and travel into the presentation. A reader who cannot tell a
demonstrated cause from a plausible one from the report has not been given a
diagnosis.

## Scoring

| Score | Meaning |
|---|---|
| **1.0** | Order held, cause labelled honestly with cited evidence, proof matched the defect's shape, fix rejoined the pipeline at the right tier, report distinguishes demonstrated from plausible. |
| **0.7** | Cause demonstrated and labelled, but the proof is thinner than the shape owed — an intermittent defect with no stated reason reproduction was unavailable, or a regression test never shown to fail. |
| **0.4** | The cause was found but the order was not visible — the fix and the diagnosis arrive together and a reader cannot tell which came first — or a deterministic on-line cause got a written-up investigation. |
| **0.0** | A fix designed from the reporter's cause or from a guess; a label promoted because the symptom stopped; a symptom fix on an intermittent, concurrent, data or security defect; or a diagnosis used to skip review or validation. |

A run that reaches the approval boundary with the cause demonstrated and no
fix yet applied scores **higher** than one that shipped a plausible fix with
passing tests. That ordering is the point of this grader.
