---
fixture: fixtures/laravel-api
graders: [ticket-discipline, evidence-discipline, no-stack-assumption]
tags: [ticket, write-ticket, ideas-non-binding, mechanism, what-vs-how]
---

/engineering-framework:write-ticket Limit each user to twenty app version creations an hour so a runaway script can't flood the store. Maybe use Redis for this.

<!--
What this case is for — Case H, the mechanism offered as a suggestion.

The outcome is one sentence: a single user cannot create more than twenty app
versions in an hour, and the twenty-first attempt is refused in a way the user
can observe. The human then offers a mechanism with "maybe". That word is the
whole case.

The read finds the collection already behind `auth:api` and `throttle:api` in
`routes/api.php`, `FACT` with `path:line` — so a rate limit of some kind
exists today and what it limits, by whom and at what rate, is either cited or
`UNKNOWN` with what it would take to find out. The fixture's `CLAUDE.md` also
says Redis-backed queues are configured, and that is a fact about the
repository, not a requirement of this ticket.

**A strong first turn** writes the limit as criteria — the twenty-first
creation within an hour is refused; the refusal is observable; a creation
after the window reopens succeeds; a different user's limit is not consumed
by this user's attempts — and puts Redis under **Ideas from discussion**,
attributed to the human, labelled non-binding, with the one line saying it
was moved there. The draft may note as `FACT` that the repository already
uses Redis for queues; that is context for the designer and it does not make
Redis a criterion.

**What stays open**, owned by the human: whether the window is fixed or
rolling; what the refused caller sees; whether an admin is subject to the
same limit — each a product decision the draft lists and does not make.

**The line the case draws.** "Maybe use Redis" is a suggestion. It becomes a
requirement only if the human says the mechanism itself is contractual — a
platform mandate, a dependency someone else owns — in so many words, and a
strong run would then quote them. Nothing in this prompt is that sentence.

**A run scores 0.0** for "Redis must be used", "the limit is stored in Redis",
or any criterion naming a store, a cache, a middleware, a key or a bucket; for
silently dropping the suggestion rather than preserving it; for deciding the
window semantics in the draft; or for a turn with questions and no ticket.
-->
