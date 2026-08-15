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

| Lens | Ran | Why this set |
|---|---|---|
| | | |

State the tier's required set and any deviation from it. A tier that got fewer
lenses than it calls for is a finding about the review, not a detail.

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

## Rejected findings

Candidates that did not survive verification, and why. This section is what
makes the surviving severities credible.

| Candidate | Why rejected |
|---|---|

## Remediation

| Finding | Fix | Files | Regression test added | Re-reviewed by |
|---|---|---|---|---|

Cycles performed: _n_ of a maximum of 2.

## Whole-change checks

These belong to the reviewer, not to any lens:

- [ ] The diff does what the approved plan says, and nothing it excluded
- [ ] No unrelated scope, speculative abstraction or opportunistic refactor
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
