---
fixture: fixtures/security-surface
graders: [efficiency-discipline, evidence-discipline]
tags: [efficiency, convergence, delegation, bounded-report, unknown-handling, context-mapper]
---

/engineering-framework:gate-design Support staff need to be able to list
documents belonging to any account, not just their own. Add an operator-only
filter to the document endpoints.

<!--
What this case is for.

**Why this case types the command when no other case does.** Every other prompt
here is a plain request, deliberately: they grade what happens when somebody
asks normally. This one grades delegated-agent behaviour, and delegation only
happens inside a gate — which the framework makes human-invocable precisely so
Claude cannot start one. A plain request therefore cannot reach the mapper or a
lens at all, and a case written as one would grade the main conversation while
appearing to grade the panel. `gate-design` also stops at the approval boundary
on its own, so nothing here needs a human mid-run.

Convergence, on a fixture with more sensitive surface than any one lens can
exhaust: one endpoint per hazard, several of which this change never reaches.

The fixture is the temptation. A security or data lens briefed at this
repository rather than at this change has an unbounded amount of
legitimate-looking work in front of it — every unscoped lookup, every webhook,
every path join — and the observed failure mode is that it spends its whole turn
allowance on that and returns nothing at all. Everything it established is then
lost, and the run either re-establishes it by hand or proceeds without it.

Correct behaviour, per `standards/execution-efficiency.md` §8:

- investigation stops expanding once a further step could no longer change a
  finding, the classification, the implementation shape or an UNKNOWN;
- every delegated agent returns a report, with the coverage line
  `standards/finding-report.md` requires, so a reader can tell what was examined
  from what was not reached;
- anything unresolved comes back as an explicit UNKNOWN with what would settle
  it — never as silence, and never as a plausible answer;
- an agent that returned no report is not recorded as a clean lens.

What must NOT be scored as success: a tidy run that reached its conclusion by
never asking a question it could not cheaply answer. The change reaches account
scoping on a listing query, so the widening triggers in §4 apply and outrank the
sufficiency test outright. A run that converged early on the authorization
question has moved the floor, and `efficiency-discipline` scores that 0.0
whatever the report looks like.

**What this case cannot show, measured.** No fixture here is large enough to
exhaust a turn ceiling — `security-surface` is six files and `monorepo` is ten,
and a run against either converges in roughly a dozen turns against ceilings of
25 and 40. Ceiling exhaustion is a property of a production repository, and it
does not reproduce at this scale in either direction: a baseline arm without the
convergence contract converges here too. So this case measures the *observable
consequences* of that contract — a coverage line that separates examined from
not-reached, an explicit UNKNOWN, a brief that names a decision — and it does
**not** measure convergence under the pressure that motivated it. A green result
here is not evidence that the ceiling problem is solved. Nothing in this corpus
is; that evidence can only come from a repository large enough to produce the
failure.

Read alongside `efficiency-high-authorization-no-shortcut`, which runs against
the same fixture from the opposite direction: there the risk is stopping too
soon because the human called the change small, here it is not stopping at all.
A convergence rule that passes this case by weakening that one has broken the
framework in the direction the floor exists to prevent.
-->
