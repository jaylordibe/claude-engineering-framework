# Review report: [change title]

> The shape of what `gate-review` returns. Produced in the conversation and in
> the pull request body — never committed as a file.

## Target

| | |
|---|---|
| **Diff under review** | working tree / base reference / commit range |
| **Files changed** | count, and the areas they touch |
| **Approved plan** | present / absent — and if absent, why review is still meaningful |
| **Risk tier** | Low / Medium / High / Critical, with the evidence for it |
| **Tier carried in** | the tier design or implementation assigned — and if this review is higher, why. Never lower |
| **Excluded** | unrelated changes deliberately not reviewed |

A tier that rose after the plan was approved owes what the new tier's **design**
required, not only its panel. Name anything still owed in *Outcome* below; it is
a blocker for the human, not something to backfill here.

## Lenses

| Lens | Ran | What it did not reach | Why this set |
|---|---|---|---|
| | | | |

State the tier's required set and any deviation from it. A tier that got fewer
lenses than it calls for is a finding about the review, not a detail.

The third column is each lens's coverage line —
`${CLAUDE_PLUGIN_ROOT}/standards/finding-report.md`. A lens that ran but did not
reach part of its own remit is not the same as one that examined it and found
nothing, and this is the only column that can tell the reader which happened. A
lens that returned no report at all is recorded here as exactly that, never as
`No findings.`

## Findings

Most severe first. Every `path:line` is one that was actually opened.

| Severity | Confidence | `path:line` | Finding | Trigger | Impact | Minimal fix | Regression test |
|---|---|---|---|---|---|---|---|

**No findings is a valid and frequently correct result.** Write "No findings."
rather than padding the table.

## Adversarial verification

Only for Critical and High findings on High or Critical risk changes.

| Finding | Refuted? | Evidence that settled it |
|---|---|---|
| | | |

## Rejected and unresolved findings

Candidates that did not survive verification, and why; and candidates that
could be neither confirmed nor ruled out, with what would settle them. This
section is what makes the surviving severities credible — a finding is a claim
until the source was re-opened, and an unresolved one is never remediated to be
safe.

| Candidate | Outcome | Evidence, or what would settle it |
|---|---|---|

## Remediation

| Finding | Fix | Files | Regression test added | Re-reviewed by |
|---|---|---|---|---|

Cycles performed: _n_ of a maximum of 2.

## Whole-change checks — did we build the approved thing?

These belong to the reviewer, not to any lens. The lenses answer the other
question, did we build it correctly, and their answer is the findings table
above.

- [ ] The diff does what the approved plan says, and nothing it excluded
- [ ] Every approved outcome is delivered in full — nothing partial, nothing
      deferred without being named
- [ ] Every condition the human attached at approval is honoured, verbatim
- [ ] No unrelated scope, speculative abstraction, opportunistic refactor, or
      addition nobody approved
- [ ] Every in-scope call site of a changed pattern was migrated
- [ ] Replaced code paths were deleted, not left in parallel
- [ ] Contract changes name their consumers

## Evidence

| Gate | Command | Scope | When it ran | Result |
|---|---|---|---|---|

Every row here ran **after** the remediation above, or says which fix landed
since. This is the table staleness reaches first: a fix changes behaviour, and
the run that proves the behaviour is the one from before it —
`${CLAUDE_PLUGIN_ROOT}/standards/evidence.md` §7.

## Outcome

- **Unresolved Critical or High:** _n_ — **any is a stop.**
- **Unresolved Medium accepted for human decision:** list them.
- **Ready for validation:** yes / no.
