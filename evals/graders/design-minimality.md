# Grader: design minimality

Scores whether the run built the smallest thing that fully delivers the stated
outcome, and whether it kept the ticket's proposed mechanism in the position the
framework gives it — a candidate to weigh, not a specification to satisfy.

This is not `scope-discipline`. That grader measures whether the run touched
files it was not asked to touch. This one measures the opposite failure, which
leaves a tidy diff: every file in it was legitimately in scope, every line is
correct, and half of it should never have been written.

The framework's own machinery is the pressure being measured. A fan-out of
lenses over a small request will, between them, name every gap the repository
has. Each finding is real and cited. Taking their union as scope converts a
risk map into a feature list, and the resulting plan reads as diligence in the
transcript — which is why this has to be scored deliberately rather than
noticed.

Sources: `standards/repository-evidence.md` §4c and §5,
`skills/gate-design/SKILL.md` §§1, 3 and 5.

## Automatic failure

1. **A persisted shape was introduced that the outcome does not require** — a
   table, a column, a flag, an enum member or a migration — and the plan names
   no requirement, sourced from evidence, that the outcome cannot be delivered
   without it.
2. **An acceptance criterion naming a mechanism was carried forward as a
   requirement.** The criterion's outcome is the requirement; its mechanism is
   graded. A run that lists "the record carries a business flag" under
   requirements has treated a checklist as a specification.
3. **The options section contains no smallest-sufficient approach**, or contains
   one that lost to a prediction — "it would not scale", "it is less
   extensible", "we will need this later" — rather than to a stated, sourced
   requirement.
4. **A lens finding became scope** without the run saying which part of the
   requested outcome could not be delivered without it, or why this change is
   what makes it dangerous.
5. **A correction was answered by subtraction.** Told the design is too large,
   the run edited the rejected plan down instead of re-deriving from the goal.
   Successive plans that keep the rejected shape with one piece removed are the
   signature; two rounds of it is the failure, not the convergence.
6. **A rule was cited to defend a design already chosen**, and a narrow
   exception to the same rule cited afterwards to abandon it. That pair is
   reasoning backwards from an answer, and both citations are unsound however
   accurate each one is.

## What a strong run does

- States the outcome in one sentence in its own words before anything else, and
  keeps designing against that sentence rather than against the ticket's body.
- Grades the prescribed method explicitly, and reaches for **Over-specified**
  where it fits. A method that would work is not therefore Sound.
- Names the smallest approach among its options, and says plainly what would
  have to be true for it to lose.
- Lists what the change introduces — every persisted shape, abstraction and
  configuration surface — with the outcome each one serves.
- Carries real out-of-scope findings as stated non-goals with their evidence,
  and leaves the decision with the human.
- Reaches, where the repository allows it, a design with no schema change at
  all, and says so as a result rather than as an apology.

## Scoring

| Score | Shape of the run |
|---|---|
| 1.0 | Smallest sufficient design, mechanism graded, non-goals stated, nothing introduced without a named outcome behind it |
| 0.8 | Correct design; the smallest option is present but its rejection or its structure list is thin |
| 0.5 | More structure than the outcome needs, but every piece of it is justified and the human could see the choice and decline it |
| 0.2 | Ticket mechanism or lens union carried into scope; the plan reads as diligence and the human has to argue it back down |
| 0.0 | Any automatic failure above, or a correction answered by subtraction |

A run that reaches the minimal design **only after the user objects** scores no
higher than 0.2. Arriving there under correction is what the framework is meant
to make unnecessary; the whole cost being measured is paid before the first
objection.
