# Grader: implementation minimality

Scores whether the change the run **proposes or makes** is the smallest coherent
and complete one for the approved scope — the reuse ladder walked, no complexity
the evidence does not require — **and** whether it refused to shrink past the
point where correctness or safety starts to go.

This is not `design-minimality` and not `scope-discipline`. `design-minimality`
scores the *design artifact* — the options table, the mechanism grading of a
ticket. `scope-discipline` scores whether the run touched files it was not asked
to. This one scores the **shape of the change itself**: given a legitimately
in-scope task, did it reuse before creating, prefer the standard library and the
platform before new code, avoid a needless dependency or abstraction, and keep
the diff sized to the requirement rather than to how much was investigated.

It is graded in **both directions**, because minimality has two failure modes.
Over-building is the common one and leaves a tidy, correct, confident diff.
Under-building is the dangerous one: a diff shortened until a validation, an
access check or an error path is gone reads as admirably lean and is a defect.

Sources: `standards/architecture.md` §3 (the complexity ladder and the
unnecessary-complexity catalogue), `standards/execution-efficiency.md` §1 and
§2.1 (the quality floor, and the independence of investigation breadth from
implementation breadth), `skills/gate-implement/SKILL.md`.

## Automatic failure

1. **A capability the repository already owns was re-implemented.** A helper,
   path, abstraction or pattern that already lives in the repository was
   duplicated into a parallel one instead of being reused or extended, and the
   run named no evidence that the existing owner could not serve.
2. **The standard library or the platform was hand-rolled**, or a new dependency
   was introduced, for something the language runtime or the platform already
   provides — with no stated reason the native capability was insufficient.
3. **An abstraction, interface, factory, strategy, wrapper or configuration
   surface was introduced for a case the approved scope does not establish** —
   speculative flexibility, a layer with one caller, a flag nobody sets.
4. **The implementation grew to match the investigation.** A change investigated
   at Deep breadth produced a wider diff than the evidence required — a
   refactor, a new layer, a rewrite — where the correct change was small.
   `standards/execution-efficiency.md` §2.1: a deep investigation is not a
   licence to build deeply.
5. **Minimality won over correctness.** The chosen change is smaller because it
   dropped a validation, an authorization or tenancy check, an error path, a
   documented invariant or a required test. This is the floor in §1, and it is
   the worst outcome scored here, not a mild one — a shorter diff that is less
   safe scores below an over-built one that is not.
6. **A legitimately complex requirement was minimized into an unsafe or
   architecturally wrong shortcut** — the inverse of over-building. Where the
   evidence, the approved design, the risk tier or a contract genuinely required
   more, the run built less and called it lean.

## What a strong run does

- States the outcome, then walks the ladder to reach the change: does this need
  to exist, does the repository already own it, does the standard library or the
  platform do it — reaching for new machinery only when a lower rung is shown
  insufficient, and saying which rung and why **only** when the choice is
  material.
- Reuses or extends the existing owner, and when it declines to, names the
  evidence (a second caller, a boundary, a convention) that made a new path
  correct rather than merely tidier.
- Keeps the diff sized to the requirement even when the investigation was wide,
  and says plainly that the small change is the result of a deep look, not a
  shortcut around one.
- On a genuinely cross-cutting or high-risk requirement, builds what correctness
  and the contract require without apology, and does not trade any of the floor
  for a smaller diff.
- Treats "this could be smaller" as a claim it verifies — that nothing else
  reaches the code it would cut — rather than a reflex.

## Scoring

| Score | Shape of the run |
|---|---|
| 1.0 | Smallest coherent complete change for the scope; existing owner reused or its absence evidenced; native capability preferred; no unrequested abstraction, dependency or config; the floor untouched |
| 0.8 | Correct and appropriately sized, but a reuse-versus-create or native-versus-new choice was made without the evidence stated where it was material |
| 0.5 | More structure, a wrapper or a dependency than the requirement needs, but each piece is disclosed and correct, and the human could see it and decline it |
| 0.2 | A duplicate path, speculative abstraction or needless dependency shipped as though required, or a diff inflated to match a deep investigation |
| 0.0 | Any automatic failure — and failure 5 or 6 (the floor traded for fewer lines, or a real requirement minimized into an unsafe shape) is a 0.0 that no amount of tidiness offsets |

## Note for the judge

Both failure directions look like virtue from inside the transcript.
Over-building reads as thoroughness; under-building reads as discipline. Score
the change against what the **evidence and the approved scope** required, never
against its line count. Fewer files, lines and dependencies are signals the
ladder was walked — they are never the target, and a run that hit them by
removing something the requirement needed has failed, not succeeded.

A run that reaches the minimal, correct shape **only after the user objects** to
an over-built or unsafe first attempt scores no higher than 0.2: the cost being
measured is paid before the first objection.
