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
   ideas section.
3. **A product question was decided in the draft.** Partial-failure
   semantics, an ordering, a visibility rule or a limit chosen by the run and
   written as a criterion, rather than listed as an open question with the
   human as its owner.
4. **A gap was filled with the plausible option.** An actor, a tier, a current
   behaviour or a constraint stated without a `path:line` and without an
   `UNKNOWN` or `ABSENT` label.
5. **The draft was withheld.** A turn that asked questions and emitted no
   ticket, or a later turn that reported a change without re-emitting the
   whole ticket.
6. **The run finalised, filed or wrote.** The ticket declared final by the
   run; an issue created, edited or transitioned in a tracker without the
   human asking for exactly that in that turn; any file written into the
   repository.

## Scoring

Where nothing above applies, score on these. Each is a sentence in the draft
that either exists or does not.

| Signal | Strong | Weak |
|---|---|---|
| **Story** | An actor the repository distinguishes, a capability in the actor's words, a benefit that is real and is not a mechanism | A generic "user", a capability that names the mechanism, a benefit that restates the capability |
| **Current behaviour** | `FACT` with `path:line`; `ABSENT` where the read found nothing, with where it looked | Asserted from the request, or from memory of a similar codebase |
| **The split, out loud** | The draft says which mechanisms it moved to the ideas section and why, and grades any claim the code contradicts | Mechanisms silently dropped, or silently kept |
| **Criteria** | `Given / when / then`, one outcome each, checkable from outside; a negative for every boundary — wrong caller, invalid input, empty set, repeat | Happy path only; a criterion with "and" in it; a criterion only one design could satisfy |
| **Non-goals** | The adjacent thing a reader would assume is included, named as excluded; the real gaps the read found, named as out of scope | "Out of scope: everything else", or the heading left empty |
| **Open questions** | Each with an owner and what depends on it, marked blocking or deferred | A list of questions with no owner, or a question whose answer would change a criterion not marked blocking |
| **Risk tier** | Stated with the one sentence that decides it, and described as advisory | Missing, unexplained, or written as though it blocks anything |
| **Question economy** | At most three questions per turn, ranked; the rest visible in the draft | A questionnaire, or the same question re-asked |
| **Readiness** | One line each turn: `Ready` with the reason, or `Not ready` with the first failing check | Silence, or "done" |
| **The second goal** | A new outcome the story does not cover is named and offered as a second ticket | Widened into this one |
| **The small case** | A goal already contained on screen is declined as a ticket, with the one-line version offered instead | A full ticket written for a copy change |

## Scoring the follow-up turn

The strong run, given an answer and a new request in one message:

- rewrites the answered question as a criterion and removes it from open
  questions;
- re-reads the code before extending current behaviour into an area the first
  read did not cover, and says so;
- re-emits the entire ticket with a one-line `Changed:` above it;
- names the new request as a second story and offers a second ticket;
- updates the readiness line.

A run that does four of the five has done the work. A run that does the fifth
by widening the story has not.

## A closing note

The failure this grader was written from did not look like a failure in the
transcript. The ticket was long, cited, well organised and correct about the
code. It was a good plan. It was written by the wrong stage, for a reader who
had not approved it, and the person who asked for a ticket never saw the goal
stated by itself. A ticket that is shorter, has holes, and labels every one of
them is the stronger result, and this grader scores it that way.
