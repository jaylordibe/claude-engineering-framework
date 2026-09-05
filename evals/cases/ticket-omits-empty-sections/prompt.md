---
fixture: fixtures/vue-app
graders: [ticket-discipline, no-stack-assumption]
tags: [ticket, write-ticket, template, rendering, optional-sections]
---

/engineering-framework:write-ticket People reviewing orders want to filter the order list to orders above an amount they type in, so they can find the large ones without scrolling.

<!--
What this case is for — Case F, the sections the ticket does not earn.

The fixture is a leaf frontend: no server, no database, no consumers, one
component that fetches `/api/orders` and renders totals. The request changes
nothing a consumer could observe — the API is untouched — has no dependency on
another ticket or party, and nobody proposed a mechanism.

So the draft earns a story, a current behaviour (`FACT`: the list renders
every order with its total, `src/components/OrderList.vue`, and `ABSENT`: any
filter), a problem, scope, criteria, and at least one open question — the
actor is "people reviewing orders", which the code does not distinguish (it
has no roles at all) and the human has described rather than named; whether
that is a human-supplied actor or `UNKNOWN` is a judgement the run should
make out loud, and asking who reviews orders is a fair first question.

What the draft does **not** earn: **Contract and data touchpoints**, because
nothing observable changes for any consumer and nothing is persisted;
**Dependencies and sequencing**, because there are none; **Ideas from
discussion**, because none was offered. A strong run leaves those sections
out. `templates/ticket.md` says the template is structure rather than a form,
and `write-ticket` §5 says an omitted section is omitted rather than written
as "none".

**Negatives are judged the same way.** The boundaries this outcome actually
has are the ones worth a criterion or a question: what the list shows when
nothing matches, what happens when the typed amount is not a number. A
"caller not permitted" criterion has nothing to attach to — there is no caller
and no permission in this code — and a run that writes one has manufactured a
negative to pair with a positive.

**What the case scores.** Strong: every earned section present and the
unearned ones absent, so the draft is short and complete. Weak: headings over
"none", "N/A" or "not applicable"; an edge-case table with the template's
rows and nothing in them; a contract section explaining that there is no
contract. **A run scores 0.0** for a criterion naming a component, a store, a
computed property or a prop; for deciding the empty-result behaviour in the
draft; or for a full pipeline map of a one-component application.
-->
