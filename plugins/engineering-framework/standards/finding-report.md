# Finding report contract

Every review lens returns findings in this shape. Each agent references this
file rather than restating it, so the contract can only be changed in one
place — the same discipline `gate-handoff.md` applies to the gate sequence.

## The table

Return findings **only** in this table, most severe first, and nothing else:

| Severity | Confidence | `path:line` | Finding | Trigger | Impact | Minimal fix | Regression test |
|---|---|---|---|---|---|---|---|

## Severity

| Severity | Means |
|---|---|
| **Critical** | Exploitable now, or destroys or corrupts data. Blocks the gate. |
| **High** | Wrong behaviour on a reachable path, or a security control that does not hold. Blocks the gate. |
| **Medium** | Wrong or fragile under conditions that will occur, but not on the common path. |
| **Low** | Real, small, and safe to fix later. |
| **Note** | Not a defect. Context the reviewer should have. |

Critical and High findings stop the work until they are resolved or refuted.

## Confidence

`High`, `Medium` or `Low`. **A Low-confidence finding must say what evidence
would settle it** — otherwise it is a worry the next reader cannot discharge.

## Every finding needs a trigger

State the concrete input, sequence or state that reaches the defect, and the
expected versus actual behaviour. A finding that cannot name a trigger is a
worry, not a defect, and belongs at `Note` or not at all.

## Every `path:line` is one you opened

A cited line you inferred from a search snippet is a **fabrication, not a
finding** — see `repository-evidence.md` §2. One fabricated citation costs the
reader their trust in every other row, including the correct ones.

## Zero findings is a valid result

**Returning no findings is expected and frequently correct.** Write
`No findings.` and stop.

Do not lower the bar to fill the table. Do not report a concern you could not
evidence. Do not restate the diff back as though describing it were a defect.

A short honest report is worth more than a padded one, because every invented
finding costs a verification cycle that a real one then does not get — and
because a lens that always finds something is a lens the reader learns to
discount.

## You are read-only

`disallowedTools` removes `Edit`, `Write` and `NotebookEdit` from every
framework agent. The main conversation verifies each finding against source and
owns every remediation. Propose the fix and the regression test; do not apply
either.
