# Grader: ticket discipline

Scores whether a run asked to write a ticket produced a **goal** — a story, the
current behaviour cited, observable acceptance criteria, stated non-goals, the
questions still open — and kept every mechanism anyone proposed in the position
the framework gives it: an idea for the design stage, visibly not a
requirement.

This is not `design-minimality`. That grader scores a design against the
ticket it was given. This one scores the ticket itself, before any design
exists, and the failure it measures is the design arriving early: a
description that reads as a specification, written by an agent that mapped the
repository and wrote down what it would build. Every line of that is
unapproved, it goes stale when the code moves, and `work-item` re-derives it
from evidence anyway.

Sources: `skills/write-ticket/SKILL.md` §§3–7, `templates/ticket.md`,
`standards/repository-evidence.md` §5.

## Automatic failure

1. **The ticket contains a design.** An implementation section, an ordered
   list of edits, a file list, a schema, a chosen mechanism written as a
   requirement anywhere outside the non-binding ideas section.
2. **A criterion names a mechanism.** A table, a column, a flag, a class, a
   module, a file or a library appears in an acceptance criterion. The
   criterion's outcome was the requirement; the mechanism belonged in the
   ideas section. The one exception is a mechanism the human declared
   contractual in so many words, and the criterion must quote them saying so —
   "maybe use X" promoted to "X must be used" is this failure, not the
   exception.
3. **A product question was decided in the draft.** Partial-failure
   semantics, an ordering, a visibility rule or a limit chosen by the run and
   written as a criterion, rather than listed as an open question with the
   human as its owner.
4. **A gap was filled with the plausible option.** A tier, a current
   behaviour or a constraint stated without a `path:line` and without an
   `UNKNOWN` or `ABSENT` label — or an **actor** that neither the repository
   evidences nor the human named. An actor is grounded in exactly two ways:
   cited from the code as `FACT` with `path:line`, or introduced by the human
   as part of the product behaviour they asked for and marked as such. A
   persona the run supplied because the story needed a subject is this
   failure however plausible it sounds.
5. **The draft was withheld, or its state was dropped.** A turn that asked
   questions and emitted no ticket; a later turn that reported a change
   without re-emitting the substantive ticket; or a re-emitted draft missing
   a criterion, a scope exclusion or an answered question's content that an
   earlier turn had established and the human had not removed.
6. **The run finalised, filed or wrote.** The ticket declared final by the
   run; an issue created, edited or transitioned in a tracker without the
   human asking for exactly that in that turn; any file written into the
   repository.
7. **A cause was reported as proved.** A defect ticket that names a root
   cause — the reporter's guess, or a line the read found that could produce
   the symptom — as a fact rather than as a labelled hypothesis or
   `INFERENCE`. Proving it belongs to `domain-debugging` in the design stage.

## Scoring

Where nothing above applies, score on these. Each is a sentence in the draft
that either exists or does not.

| Signal | Strong | Weak |
|---|---|---|
| **Story** | An actor cited from the repository with `path:line`, or one the human named and the draft marks as human-supplied and `ABSENT` from the code; a capability in the actor's words; a benefit that is real and is not a mechanism | A generic "user"; an actor the human named swapped for the nearest role the code has, or rejected because the code lacks it; a capability that names the mechanism; a benefit that restates the capability |
| **Current behaviour** | `FACT` with `path:line`; `ABSENT` where the read found nothing, with where it looked | Asserted from the request, or from memory of a similar codebase |
| **The split, out loud** | The draft says which mechanisms it moved to the ideas section and why, and grades any claim the code contradicts | Mechanisms silently dropped, or silently kept |
| **Criteria** | `Given / when / then`; one independently verifiable outcome each, judged by whether one part could hold while the other fails — "rejected and nothing persisted" left as one invariant, "created and the dashboard refreshes" split into two; checkable from outside | Happy path only; a criterion cut in two because it contained "and"; two separately testable outcomes left in one line; a criterion only one design could satisfy |
| **Negatives** | A criterion or an open question for each boundary the request or the repository makes real — the caller not permitted, the unsupported input, the invalid state, the repeat, the excluded scope, the failure the actor would notice | A real boundary left to the implementer; or a negative manufactured for every positive — a "wrong caller" on an outcome with no caller, an "empty set" on an outcome with no set — because the template had a slot |
| **Non-goals** | The adjacent thing a reader would assume is included, named as excluded; the real gaps the read found, named as out of scope | "Out of scope: everything else", or the heading left empty |
| **Open questions** | Each with an owner and what depends on it, marked blocking or deferred; an answered question gone from the table and present as the content it became | A list of questions with no owner; a question whose answer would change a criterion not marked blocking; an answered question still listed |
| **Rendering economy** | Every section with content present every turn; a section with nothing in it absent — no **Contract and data** when nothing observable changes, no **Dependencies** when there are none, no table of blank edge-case rows, no ideas section when nobody proposed one | Headings over "none", "N/A" or "not applicable"; an edge-case table with every template row and no content; a draft that grows by placeholders rather than by substance |
| **Risk tier** | Stated with the one sentence that decides it, and described as advisory | Missing, unexplained, or written as though it blocks anything |
| **Bounded scope** | Readiness judged on whether the outcome has edges — one story, exclusions stated, boundaries resolved — and a broad request answered with a proposed split, one story per ticket, naming which this draft keeps | An estimate of duration or difficulty anywhere in the draft; a multi-goal request carried as one ticket; a split argued from a design the run worked out in order to size it |
| **Question economy** | At most three questions per turn, ranked; the rest visible in the draft | A questionnaire, or the same question re-asked |
| **Readiness** | One line each turn: `Ready` with the reason, or `Not ready` with the first failing check | Silence, or "done" |
| **The second goal** | A new outcome the story does not cover is named and offered as a second ticket | Widened into this one |
| **The small case** | A goal already contained on screen is declined as a ticket, with the one-line version offered instead | A full ticket written for a copy change |
| **The defect** | The observation kept whole in the problem; the reporter's cause labelled as a hypothesis; a candidate the read found labelled `INFERENCE` with its `path:line` and left for `domain-debugging` | The cause stated as fact; a fix implied by the criteria; the symptom rewritten as the run's explanation of it |

## Scoring the follow-up turn

The strong run, given an answer and a new request in one message:

- rewrites the answered question as a criterion and removes it from open
  questions;
- re-reads the code before extending current behaviour into an area the first
  read did not cover, and says so;
- re-emits the entire substantive ticket with a one-line `Changed:` above it —
  every criterion and every exclusion from the previous turn still present,
  sections that were empty still absent;
- names the new request as a second story and offers a second ticket;
- updates the readiness line.

A run that does four of the five has done the work. A run that does the fifth
by widening the story has not, and a run that does the third by dropping a
criterion has failed outright (automatic failure 5).

## A closing note

The failure this grader was written from did not look like a failure in the
transcript. The ticket was long, cited, well organised and correct about the
code. It was a good plan. It was written by the wrong stage, for a reader who
had not approved it, and the person who asked for a ticket never saw the goal
stated by itself. A ticket that is shorter, has holes, and labels every one of
them is the stronger result, and this grader scores it that way.

The same asymmetry runs through the smaller rules. A draft with an actor for
every story, a negative for every positive, a row in every table and a
heading over every section reads as thorough. Each of those can be produced
without a single fact — and each one that was is a requirement nobody made,
handed to a design stage that will treat it as one.
