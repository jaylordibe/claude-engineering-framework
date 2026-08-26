# Finding report contract

Every review lens returns its report in this shape. Each agent references this
file rather than restating it, so the contract can only be changed in one
place — the same discipline `gate-handoff.md` applies to the gate sequence.

**A report is two parts: one coverage line, then the findings table.** Nothing
else, in either direction — a lens that returns only the table has not said
where it has been, and one that returns prose around the table has returned
something the reader has to re-read the source to use. A lens whose own
definition names a deliverable of its own returns it between the two.

## When you stop investigating and start writing

`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md` §8 owns that
decision, and it is worth reading before your first search rather than after
your last one. Three of its rules decide this report:

- **Synthesis is part of this task, not what follows it.** The moment the
  question you were launched to answer is answerable from what you hold, the
  room that remains belongs to the report.
- **A bounded report carrying verified findings and explicit `UNKNOWN`s
  outranks an investigation that ran to its ceiling and returned nothing.** The
  second returns no evidence at all, and the reader has to establish from
  scratch what you already knew.
- **Continued after a partial run, synthesise rather than restart.** Fill only
  the gaps the assigned question turns on.

None of that licenses a short look. An investigation that stopped while there
was still something its answer depended on has under-investigated, and marking
that hole `UNKNOWN` does not convert it into one.

## The coverage line

One line or two, always — before the table, and before `No findings.` as well:

```text
Coverage — examined: <what you opened, in this repository's own words>;
not reached: <what your lens owns and did not establish>;
UNKNOWN: <each, with what would settle it> | none.
```

It is here because `No findings.` has two meanings and only one of them is
safe. A lens that established its controls and found nothing wrong, and a lens
that ran out of room before it looked, return the same three words — and
nothing in the report tells them apart. This line does.

It is also what keeps the reader's verification **targeted**. Whoever
commissioned this report re-opens the source behind any claim a decision rests
on — that is independent review and it does not go away. What it should not
have to do is repeat your investigation to work out where to look. `examined`
says where you have been; `not reached` says which part of your own remit is
still owed to somebody.

Keep it to a pointer. It is not a second report, and it never carries a
conclusion the table does not.

## The table

Return findings **only** in this table, most severe first. The coverage line
above it is the report's other half; nothing else appears in either.

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

**A citation is repository-relative.** `src/handlers.js:40`, not the absolute
path it happened to be read from — an absolute path is noise in a report, and it
carries the reader's directory layout into a pull-request body where it means
nothing to anyone else.

**Separate what the line says from what you concluded from it.** The citation
is the `FACT`; where the defect follows from the line rather than being written
on it, the step between them is an `INFERENCE` and belongs in the Trigger cell,
stated. A reader who can see which is which re-opens one file and settles the
row. A reader who cannot has to reconstruct your reasoning before they can
check it, and that is the whole investigation again.

## Zero findings is a valid result

**Returning no findings is expected and frequently correct.** Write the
coverage line, then `No findings.`, and stop. The coverage line appears either
way. Without it, this result is indistinguishable from a lens that never looked
at all.

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
