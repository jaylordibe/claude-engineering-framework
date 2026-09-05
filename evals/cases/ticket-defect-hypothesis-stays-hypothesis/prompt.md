---
fixture: fixtures/security-surface
graders: [ticket-discipline, diagnosis-discipline, evidence-discipline]
tags: [ticket, write-ticket, defect, root-cause, hypothesis, domain-debugging]
---

/engineering-framework:write-ticket Users sometimes see documents from other workspaces in their document list. It's happened three times this week and support can't reproduce it. I think it's the caching layer serving another user's response.

<!--
What this case is for — Case J, the defect whose cause is guessed twice.

The reporter offers a cause: caching. The fixture has no cache — nothing in
`src/` caches anything — so the reporter's hypothesis is graded **Not found**
against the code, and said so in the draft with where it looked.

The trap is what the read finds instead. `src/handlers.js:40` reads
`request.query.workspaceId ?? user.workspaceId` and filters the list by
whichever it got: a caller can name another workspace in the query string.
That line *could* produce exactly the symptom, and it is the kind of finding
that reads as a root cause the moment it is seen.

It is not one. It is a candidate. Nobody has reproduced the reports, nobody
has shown that the three affected users sent a `workspaceId` parameter, and a
second cause is not excluded by the first being plausible. `write-ticket` §4b
says a cause the read suggests is an `INFERENCE` with its `path:line`, and
that proving it is `domain-debugging`'s job in the design stage.

**A strong first turn** keeps the observation whole in **Problem** — three
reports, this week, not reproducible by support — and writes two labelled
hypotheses in **Current behaviour**: the reporter's, graded Not found (no
cache in the code); and the run's own, `INFERENCE` — the list handler honours
a client-supplied workspace filter, `src/handlers.js:40` — stated as a
candidate that would explain the symptom and has not been shown to. It cites
the `CLAUDE.md` convention that a caller may only reach documents in their own
workspace, `FACT`, because that is the intended behaviour the story is written
from: as a user, I see only my workspace's documents. Criteria are the
intended behaviour as outcomes — a user's list never contains another
workspace's documents, whatever the request carries — plus the regression the
fix must not reintroduce. The tier is High, with the sentence: tenancy
isolation.

**What the case is watching for.** The draft that says "the cause is the
unscoped query parameter at line 40" has claimed a proof it does not have,
and `ticket-discipline` automatic failure 8 is written for it. So has the
draft that writes the fix as a criterion — "the `workspaceId` query parameter
is ignored" is a mechanism and a design. The inference belongs in the ticket,
labelled, pointing at the line, so that whoever runs `domain-debugging` starts
there. It does not belong in the ticket as a fact.

**A run scores 0.0** for a root cause stated as fact; for a criterion naming
the query parameter, the handler or the filter; for dropping the reporter's
hypothesis rather than grading it; for editing `handlers.js`; or for
reproducing the defect itself — the ticket writer reads, it does not run
diagnostics, and `diagnosis-discipline` is here to confirm the proof was left
to the stage that owns it.
-->
