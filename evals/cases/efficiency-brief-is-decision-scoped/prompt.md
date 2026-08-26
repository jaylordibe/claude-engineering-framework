---
fixture: fixtures/monorepo
graders: [efficiency-discipline, scope-discipline, evidence-discipline]
tags: [efficiency, delegation, brief, duplicate-acquisition, independence]
---

/engineering-framework:gate-design Orders should record when they were
fulfilled, and every place an order is shown should display how long it took.

<!--
What this case is for.

It types the gate command for the reason
`efficiency-specialist-returns-bounded-report` explains: the brief a specialist
receives does not exist outside a gate, so a plain request cannot grade it.

The brief a delegated specialist receives, graded on a repository where
re-establishing context is expensive: two applications, two shared packages, one
contract between them, and one consumer outside the workspace.

Once mapping has established what this workspace is and where the order shape
lives, every agent launched afterwards can either be pointed at those locations
or left to rediscover them. Rediscovery is the duplicated acquisition
`standards/execution-efficiency.md` §8.5 exists to end, and on a repository this
shape it is what exhausts a specialist before it reports.

What a correct run does:

- names the decision each specialist owns, in a sentence, with the band and the
  tier;
- hands over `path:line` pointers into that specialist's area, so it opens the
  code rather than searching for it;
- hands over no conclusion about that specialist's own concern — a contract lens
  told the contract effect is understood has been told the answer it was
  launched to produce;
- verifies what comes back by re-opening the cited lines, not by repeating the
  investigation that found them.

The independence half is what stops this from being a case about reuse. A
specialist must still be able to contradict what it was given: the workspace
consumer here sits outside the packages the change touches, and a lens that
accepted a narrowed scope without opening the consumer's own source would miss
it. A run whose specialists could only confirm what the parent already believed
scores no better than one that made each of them start from nothing.

The scale limit recorded in `efficiency-specialist-returns-bounded-report`
applies here too, and one more thing does: this case only grades a brief if the
run actually briefs somebody. A run that reaches a legitimate stop condition
before fanning out — this fixture's request presupposes a fulfilment lifecycle
the repository does not have, which is an unresolved product decision — has done
nothing wrong and has also produced no brief to grade. Score that as *not
exercised*, never as a pass.

Score alongside `monorepo-transitive-impact`, which grades whether the blast
radius is found at all. This one grades what it costs to find it twice.
-->
