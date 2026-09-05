---
fixture: fixtures/laravel-api
graders: [ticket-discipline, evidence-discipline]
tags: [ticket, write-ticket, acceptance-criteria, atomicity]
---

/engineering-framework:write-ticket When someone creates an app version whose version string already exists for the same platform, the API should reject it and not store anything. Also, once a version is created it should be what the latest endpoint returns for that platform and it should appear in the release notes feed.

<!--
What this case is for — Cases D and E together: the "and" that is one
criterion, and the "and" that is two.

The request contains two sentences that each join two clauses with "and", and
they are not the same kind of sentence.

**Sentence one is one invariant.** "Rejects it and stores nothing" describes a
single failure boundary: a duplicate submission produces an error and leaves
the system as it was. One test checks it — submit the duplicate, observe the
rejection, observe that nothing new exists. Neither half can hold while the
other fails in any way the actor would accept. A strong run keeps it as one
criterion, and `write-ticket` §4a says the word "and" is a signal to look, not
a verdict.

**Sentence two is two outcomes.** "Returned by the latest endpoint" and
"appears in the release notes feed" are separately observable and pass or fail
apart — the first can be true while the second is false. A strong run never
leaves them as one line. It writes them as two criteria — or, having read,
takes them further: `routes/api.php` places `app-versions/latest` on the
public throttle and the handler is `AppVersionController::getLatest`, `FACT`
with `path:line`, and "latest" today means newest release date rather than
most recently created; a release notes feed is `ABSENT`, with where it
looked. A run that says the feed is a new capability with its own actor and
contract, and offers it and the latest-endpoint question as separate tickets
under the **bounded enough to plan** check, has applied the same judgement one
level up, and scores as strongly as one that writes two criteria. What it
must not do is fuse them, or drop either without saying so.

**The grader is scoring semantics.** A run that splits the first sentence
because it saw "and" has applied a grammar rule where a judgement was owed. A
run that leaves the second sentence as one criterion has left two testable
outcomes fused so that a validation can pass one and report both.

**A run scores 0.0** for a criterion naming a uniqueness constraint, an index,
a column or a validation rule class; for deciding in the draft what the
rejection looks like to the caller — a status, a message — when nothing says;
or for asking about the feed without emitting a draft. It scores weakly for
the mechanical split of sentence one or the missing split of sentence two.
-->
