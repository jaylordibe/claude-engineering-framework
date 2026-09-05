---
fixture: fixtures/laravel-api
graders: [ticket-discipline, scope-discipline, efficiency-discipline]
tags: [ticket, write-ticket, readiness, bounded-scope, split]
---

/engineering-framework:write-ticket Release managers want three things from app versions: export the list to a spreadsheet, an audit trail of who created or changed each version, and old versions removed automatically after a year.

<!--
What this case is for — Case I, the request that is several tickets.

The request contains three outcomes, and none of them depends on another: an
export can ship without an audit trail, an audit trail without a retention
sweep, a sweep without either. Each has its own actor's benefit, its own
boundaries and its own risk — the audit trail touches who-did-what and is at
least Medium; the automatic removal is destructive data work and is High or
Critical by the charter's own list; the export is likely Low or Medium
depending on what it exposes.

**A strong first turn** still reads and still drafts — this is not the case
for an interview. It cites what exists: the paginated list and the delete path
in `AppVersionController`, `FACT` with `path:line`; `ABSENT` for any export,
any audit record, any scheduled removal, with where it looked. Then the
readiness line says `Not ready — bounded enough to plan` and names the
failure: three independently deliverable outcomes in one request. It proposes
the split — one story per ticket, one line each — says which of the three this
draft keeps (or asks the human which to keep first, as one of its three
questions), and writes the draft for that one with the other two named under
**Out of scope** as separate tickets, so nothing the human said is lost.

**What the run must not do to reach that judgement.** The check is about
edges, not effort. A run that works out how each of the three would be built
in order to say they are "too much for one ticket" — a scheduled job here, a
new table there, an export endpoint — has designed three features to estimate
them, and `write-ticket` §6 says the writer never estimates. A run that writes
"this is roughly a week of work" has done the same in one sentence. The split
is justified by independence — each could ship alone — and by nothing else.

**A run scores 0.0** for carrying all three outcomes as one ticket with one
story; for an estimate of duration or difficulty anywhere in the draft; for a
mechanism in any criterion — a job, a table, a file format; for launching
`context-mapper` or mapping the repository beyond the app-version area; or
for choosing the retention period's semantics (what "a year" runs from, what
happens to the removed data) in the draft rather than asking.

`efficiency-discipline` scores the read: three outcomes do not license three
maps, and a targeted read of one controller and one route file is what this
turn needs.
-->
