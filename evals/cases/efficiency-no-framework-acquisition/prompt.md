---
fixture: fixtures/monorepo
graders: [efficiency-discipline, evidence-discipline]
tags: [efficiency, convergence, delegation, runtime-contract, framework-acquisition, context-mapper]
---

/engineering-framework:gate-design Order totals render inconsistently between
the web app and the API for some amounts. Fix the money formatting so the two
agree.

<!--
What this case is for.

It grades where a delegated agent spends its opening turns, which is the one
thing the convergence hardening could not fix by being correct.

**The failure it exists to catch.** Every reasoning agent used to open with an
ordered list of three to six framework documents — the report contract first,
which in turn pointed at a five-hundred-line standard "before your first
search". A real run of the framework watched nine subagents spend their opening
turns reading those, reach their turn ceilings holding real findings, and write
up none of them. Each recovered as soon as it was told to stop reading format
documents and report from what it already held.

So the rule that tells an agent to converge was itself the reason it did not:
the reads came out of the same allowance as the investigation, and were spent
before any evidence existed to say what mattered. The fix is architectural —
`standards/agent-runtime-contract.md` is embedded verbatim in every agent, so
the semantics are held rather than fetched — and `tests/validate-plugin.mjs`
pins it. This case is what tells us the architecture changed the behaviour.

Correct behaviour:

- the first tool calls of every delegated agent read THIS REPOSITORY — the
  contracts package, the two consumers of it, the shared money module — not any
  file under the plugin;
- each agent still returns a coverage line, labelled claims with `path:line`,
  and explicit UNKNOWNs, without having opened the standard that defines any of
  those;
- the brief each agent is given names the decision it owns and hands over
  `path:line` pointers, and does **not** instruct it to read a framework
  document or restate the report format at it;
- the conductor may read `standards/execution-efficiency.md` itself, once — it
  owns banding, fan-out and model choice, and that is a legitimate read by the
  stage that makes those decisions.

What must NOT be scored as success:

- a run whose agents never opened a framework file **because they also never
  investigated properly**. This fixture spans two consumers of one shared
  contract, so a lens that stopped at `packages/shared` has under-investigated;
  transitive impact across the workspace is the thing this fixture exists to
  make discoverable, and `efficiency-discipline` scores a missed cross-package
  consumer 0.0 whatever the acquisition profile looked like. Cheap acquisition
  is only worth anything if the depth it freed up was actually spent.
- a run that suppressed a legitimate read of the repository's own documentation.
  `fixtures/monorepo/CLAUDE.md` is evidence about the system and reading it is
  correct. The distinction being graded is framework mechanics versus
  substantive evidence, never "documents are expensive".

**What this case cannot show, measured.** This fixture is ten files; nothing
here exhausts a turn ceiling, and a baseline arm converges too. What is
observable is the *acquisition profile* — which files an agent opens first, and
whether it produced a conforming report without opening the file that defines
the format. That the ceiling problem is solved is not something any fixture in
this corpus can establish, and a green result here is not that evidence. Only a
repository large enough to reproduce the original failure can supply it.

Read alongside `efficiency-specialist-returns-bounded-report`, which grades the
other half: that the report comes back at all. A change that made acquisition
cheap by making the contract thinner would pass this case and fail that one.
-->
