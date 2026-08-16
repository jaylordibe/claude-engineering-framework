---
name: gate-review
description: Independently reviews the current diff for conformance to the approved plan, correctness, application security, contract compatibility, data and migration safety, reliability and test coverage — selecting review lenses by risk tier, verifying every finding against source, adversarially refuting Critical and High findings, then remediating and re-reviewing.
argument-hint: "[base ref | review focus]"
disable-model-invocation: true
model: inherit
effort: high
---

# Review the current change

Input:

```text
$ARGUMENTS
```

You are the conductor and the remediation owner. The specialist agents are
read-only and independent; you verify what they return and own every edit.

## 1. Establish the exact target and the risk

State the target precisely:

- the approved plan, when one exists;
- the staged and unstaged worktree diff, or the explicit base reference;
- the changed files and the contracts they touch;
- **unrelated user changes, excluded by name.**

Then state the **risk tier** and the evidence for it. Name it *before*
launching anything: an unstated tier defaults to whatever panel it happens to
get, which is how every change ends up costing the same regardless of what it
is. Take the higher tier whenever the change sits on a boundary, or when a
changed path matches one the repository's `CLAUDE.md` lists under **High-risk
paths**. Read that section rather than assuming it is empty; a repository that
declared its own high-risk paths and then got a Medium panel was told its
declaration mattered and it did not.

**Never state a tier below one this change has already been given.** Design may
have classified it, and implementation may have raised it on evidence the final
diff no longer shows — a boundary that turned out to be reachable, a consumer
nobody had traced. Classify independently, then take **the higher** of your
answer and the tier carried in. A finished diff frequently looks calmer than the
investigation that produced it, and reviewing it at the tier it *looks* like is
how the panel shrinks at precisely the moment the evidence said it should not.

If your own reading is higher than the tier carried in, that is the tier, and
say so — it is a finding about the classification as well as a change of panel.

## 2. Select the lenses by risk

Reviewing a copy fix with seven agents and reviewing an authorization change
with one are the same mistake in opposite directions.

| Tier | Lenses |
|---|---|
| **Low** | No subagents. Review it yourself; run a bundled diff-review skill if one is available. |
| **Medium** | `reviewer`, plus the one domain lens the change actually touches. |
| **High** | `reviewer`, `security`, `tester`, plus every domain lens touched. Add a bundled security-review skill when available. |
| **Critical** | The full panel including `architect`, plus everything High requires. **Automated review is never sufficient here** — say so explicitly in the report. |

### Which domain lenses the change actually touches

This table resolves the phrase **"every domain lens touched"** in the tier table
above, and does nothing else. **It never removes a lens a tier names outright:**
High gets `reviewer`, `security` and `tester` whatever the rows below say, and
Critical gets the full panel including `architect`. A tier's named set is a
floor, and this table only ever adds to it.

"Touched" is decided by what the diff does, not by what the change is called.
Launch a lens when its row is true of the diff, and leave it out when the row is
false — a lens launched on a change it has nothing to say about is a whole agent
returning `No findings.`

| Lens | Launch when the diff touches |
|---|---|
| `engineering-framework:contract` | Anything a consumer can observe: an entry point or its shape, a field's presence, nullability or type, an enumerated value, a stable error identifier, status semantics, pagination or ordering, an event or webhook payload, a generated schema |
| `engineering-framework:data` | Persistence: a query, a persisted shape, a constraint or index, a transaction boundary, a migration or backfill, lifecycle or delete semantics, ownership or tenancy in data access |
| `engineering-framework:performance` | Workload-sensitive behaviour: query shape, unbounded work, asynchronous or scheduled work, an external call, timeouts, retries, idempotency, caching, resource limits |
| `engineering-framework:security` | Any trust boundary or sensitive operation — authentication, authorization, tenancy, personal or financial data, uploads, webhooks, secrets, untrusted input reaching a sensitive sink |
| `engineering-framework:tester` | The tier requires it, or coverage adequacy is material to whether this change is correct |
| `engineering-framework:architect` | Cross-cutting or structural change, a new component, an ownership or boundary decision — and every Critical change. Not ordinary localized work |

Two rules bound the table in opposite directions, and both matter:

- **On a High or Critical change, uncertain applicability means launch it.** The
  cost of a lens that finds nothing is one agent. The cost of the missing lens
  is the finding nobody made.
- **A lens is never launched to look thorough.** A panel that always runs at
  full width is a panel whose composition carries no information, and it makes
  the reader stop reading the "why this set" row — which is the row that says
  what was *not* examined.

Record the set and the reason in the report either way. The full policy for
fan-out, model choice per launch and output size is
`${CLAUDE_PLUGIN_ROOT}/standards/execution-efficiency.md`; it does not change
anything this section requires.

Launch the selected agents **in parallel**. Give each: the approved plan, the
exact diff, the changed-file scope, and the name of the authoritative source
for its lens. **Do not paste contract text into the prompt** — name the file
and let the agent read it, so it reviews against the current rule rather than
your summary of it.

Bundled skills supplement the panel; they never replace it. Run a
simplification pass only after correctness and security findings are resolved,
and verify each of its proposals against the approved plan before accepting it.

## 3. What to review against

Each lens reviews against its own authoritative source — the repository's own
documentation first, then `${CLAUDE_PLUGIN_ROOT}/standards/`. This skill does
not restate those contracts, for the same reason `gate-implement` does not: a
paraphrased checklist drifts from the rule it paraphrases, silently, and no
tooling can detect it.

Some checks belong to **you** rather than to any lens, because they are about
the change as a whole rather than about one dimension of it. They are the
"Whole-change checks" list in
`${CLAUDE_PLUGIN_ROOT}/templates/review-handoff.md`, which is also the report
you fill in at §6 — so the list lives there, once, and cannot drift from the
report that asks for it.

## 4. Verify every finding

For each candidate, before it becomes a finding:

1. open the surrounding source — actually open it;
2. cite the exact `path:line`;
3. state the concrete trigger, and expected versus actual behaviour;
4. state the impact;
5. assign Critical / High / Medium / Low / Note;
6. prescribe the smallest correct fix;
7. specify the regression coverage;
8. state confidence.

Reject speculative, duplicate, irrelevant and style-only findings. A finding
that cannot name a trigger is a worry.

### Adversarial verification — Critical and High only

You commissioned the review, so you are the worst available judge of whether
its findings are real: the same context that produced a finding tends to
confirm it.

For each **Critical or High** finding on a **High or Critical risk** change,
launch one independent agent — the specialist whose lens owns the finding —
with the single instruction to **refute** it:

> Here is a claimed defect at `path:line`: <claim>. Read the surrounding source
> and try to prove it is NOT a defect: that the trigger is unreachable, that
> the invariant is enforced elsewhere, that the behaviour is intended, or that
> the cited line does not say what the claim says. Default to `refuted: true`
> when the evidence is ambiguous. Return `refuted` plus the evidence that
> settles it.

A refuted finding is dropped and recorded in the rejected-findings summary with
its refutation. A surviving finding proceeds to remediation with the refutation
attempt on record — that record is what makes the severity credible later.

Do not run this for Medium and below, and do not run it on Low or Medium risk
changes; the cycle costs more than the precision it buys there.

## 5. Remediate

- Fix verified Critical and High findings within the approved scope.
- Fix Medium findings unless they require product or architecture approval.
- Fix Low findings only when the fix is safe and local.
- Add regression tests for every fix.
- Return to the approval gate for material divergence. **Never edit the plan to
  match the diff.**
- Re-run the affected checks after fixes, and re-run the affected lenses.

Perform **at most two** complete remediation and re-review cycles. If findings
remain unresolved after the second, stop and say so.

## 6. Report

Use `${CLAUDE_PLUGIN_ROOT}/templates/review-handoff.md`:

exact target and risk tier · lenses selected and why that set · findings by
severity · adversarial verification outcomes · rejected findings and why ·
fixes and their tests · command evidence with real scopes · unresolved blockers
and risks · consumer handoff · readiness for validation.

Do not commit, push, deploy, apply migrations, or claim production readiness.

## 7. Handoff

Follow `${CLAUDE_PLUGIN_ROOT}/standards/gate-handoff.md`, starting with its §0
mode table.

**Standalone** — offer to continue into `gate-validate`.

**Conductor** — emit the stage marker and go straight into validation.

**An unresolved Critical or High finding stops the work in both modes.** Name
what remains and stop. This is not the inter-stage prompt that conductor mode
removes; it is the gate doing its only job, and a pipeline that runs past it
has not saved anyone time.
