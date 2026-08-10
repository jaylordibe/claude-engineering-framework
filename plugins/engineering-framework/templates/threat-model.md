# Threat model: [change title]

> A thinking aid, not a deliverable. Fill it in to reach the decision, fold the
> conclusion into the plan, and commit neither. Required for High and Critical
> changes; a brief version is enough for Medium changes that touch a trust
> boundary.

## 1. What is being protected

| Asset | Why an attacker wants it | Impact if it is lost, altered or disclosed |
|---|---|---|
| | | |

Include data, money, availability, integrity of records, and the reputation
cost of a specific disclosure. Be concrete: "user records" is not an asset,
"the email address and password hash of every user" is.

## 2. Who can reach it

| Actor | How they authenticate | What they are trusted with | What they must never reach |
|---|---|---|---|
| Anonymous | — | | |
| Authenticated user | | | |
| Elevated / administrative | | | |
| Another tenant or organisation | | | |
| Internal service or job | | | |
| Compromised dependency | | | |

Include the actors the system does not intend to have. A tenant that can reach
another tenant's record is an actor whether or not the design admits it.

## 3. Trust boundaries crossed

Where does data or authority cross from less trusted to more trusted?

```text
[actor] --> [boundary: what is checked here] --> [what is now trusted]
```

For each boundary: what is validated, what is normalised, what is
re-authorised, and what is simply carried through.

## 4. Threats

One row per concrete threat. A threat that cannot be stated as an action by an
actor is not a threat, it is a worry.

| # | Threat (actor + action + result) | Existing control | Evidence `path:line` | Residual risk | Mitigation in this change |
|---|---|---|---|---|---|
| 1 | | | | | |

Work through at least these, and write "not applicable" with a reason for the
ones that do not apply:

- **Authentication** — bypass, weak credential handling, session fixation,
  missing invalidation on privilege change.
- **Function-level authorization** — an operation reachable without the
  permission it requires.
- **Record-level authorization** — a record reachable by someone who may not
  see it; enforcement in a pre-check rather than in the query.
- **Tenancy** — cross-tenant read or write, including through a
  client-supplied identifier.
- **Enumeration and disclosure** — response shape, status code or timing that
  reveals whether something exists.
- **Privilege escalation** — self-granted role, relationship or ownership
  change; a foreign key that grants access.
- **Mass assignment** — a request body reaching a field the caller must not
  set.
- **Value tampering** — price, total, discount, entitlement or approval state
  taken from the client.
- **Replay and duplication** — a request or message processed twice.
- **Race conditions** — two callers, one record, a lost update or a double
  spend.
- **Injection** — into queries, commands, templates, paths or deserialisers.
- **Server-side request forgery** — a URL or host taken from input.
- **Resource exhaustion** — unbounded input size, fan-out, recursion or result
  set.
- **Rate limiting and abuse** — anything public, anything that sends a message
  or one-time code.
- **Inbound webhook authenticity** — signature, freshness, replay.
- **Data exposure** — internal error detail, secrets in logs, over-broad
  response shape, generated documentation exposing a hidden field.
- **Audit gaps** — a privileged action that leaves no record of who did it.

## 5. Controls this change adds or relies on

| Control | Where it lives | How it is tested | What happens if it is removed |
|---|---|---|---|
| | | | |

A control with no test is a control that will be deleted by someone who did not
know it was load-bearing. If it cannot be tested, say so and put a comment
beside it.

## 6. Accepted residual risk

| Risk | Why it is accepted | Who accepted it | What would change the decision |
|---|---|---|---|
| | | | |

Only a human accepts risk. If this table has a row with no named human, the
change is not ready for approval.

## 7. Verdict

- Threats identified: _n_
- Mitigated in this change: _n_
- Accepted with a named owner: _n_
- **Unresolved: _n_** — each one is a blocker in the plan's §13.

For a **Critical** change, state plainly: automated review is not sufficient
here, and name the human security review still owed.
