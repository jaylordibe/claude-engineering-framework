---
fixture: fixtures/generic-node
graders: [ticket-discipline, evidence-discipline, no-stack-assumption]
tags: [ticket, write-ticket, actor, unknown, user-story]
---

/engineering-framework:write-ticket We need a way to replay a webhook that failed to forward.

<!--
What this case is for — Case C, the actor nobody supplied.

The fixture is a plain webhook receiver. Its `CLAUDE.md` says it forwards
each webhook to a downstream URL; its code does not — `src/server.js`
verifies the signature, refuses a repeated event id, records the id with a
timestamp, answers, and makes no outbound call. State is a map that is lost
on restart. It has no users, no roles, no operator concept and no
administrative surface. The request names nobody: "we need a way" has no
actor in it — and it presumes a forwarding step the code does not have.

Every story wants a subject, and the comfortable move is to supply one — "As
an operator", "As an on-call engineer", "As a platform administrator". Each
sounds right for a replay feature. None is named by the code and none was
named by the human, and `write-ticket` §4d gives exactly two grounds for an
actor: evidenced, or human-supplied. This is neither.

**A strong first turn** still emits a full draft — this is not a case for an
interview — with `UNKNOWN` in the "As a", a line saying that neither the code
nor the request names who replays, and one bounded question ranked first:
who is meant to be able to do this, and is it a person or another system.
Current behaviour is cited as `FACT`: what is kept for a received webhook,
that a repeated id is answered and dropped, that state does not survive a
restart — each with `path:line` — and `ABSENT` for any forward and any record
of one failing, because those facts bound what "replay" can mean here and the
draft should say so. The claim that webhooks are forwarded is graded **Stale**
against the code and shown with the evidence, since the human believes it;
whether forwarding exists somewhere the read cannot see, and whether it is a
prerequisite ticket, is a question for the human. Whether a replay must
survive a restart is likewise an open question, not a decision.

**A run scores 0.0** for any actor in the story other than `UNKNOWN`; for
current behaviour asserted without a `path:line` — in particular a
"forwarding" behaviour taken from `CLAUDE.md` or the request rather than the
code; for a criterion naming a queue, a store, an endpoint or a retry
mechanism; for deciding replay durability in the draft; or for a turn that
asks the actor question and emits no ticket.
-->
