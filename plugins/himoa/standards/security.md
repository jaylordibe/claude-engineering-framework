# Application security standard

Generic application-security expectations. The consuming repository's own
security documentation is authoritative where it is more specific; this file is
the floor, not the ceiling.

Read `standards/repository-evidence.md` first. Every control named here must be
located in the repository before it is assessed — a control you assume exists
cannot be reviewed.

## 1. Authentication

- Credentials and tokens are never logged, echoed, returned in an error, or
  written to an audit record.
- A session or token carries **identity**, not authoritative permission data.
  Anything that can be revoked must be resolved server-side per request, or the
  revocation does not take effect until expiry.
- Authentication, registration and recovery paths resist **account
  enumeration**: the same response shape, the same status, and comparable
  timing whether or not the account exists.
- Credential comparison is constant-time. Password storage uses a
  memory-hard, salted, current algorithm.
- Session invalidation on password change, privilege change and logout is
  explicit and tested.

## 2. Authorization

Every protected operation verifies, in order:

1. there is an authenticated actor;
2. the actor holds the required permission for this operation;
3. **this specific record is visible to this actor**;
4. tenancy or scope boundaries hold;
5. ownership or relationship requirements hold;
6. the record is in a lifecycle state where the operation is legal.

**Steps 1–2 prove a rule exists. Only steps 3–5 prove this row is allowed.** A
check that runs before the record is loaded cannot know anything about the
record. Record-level access must be enforced **in the data query**, so that an
unauthorised row is never loaded in the first place.

Disclosure behaviour: return **not-found** when the actor may not know the
record exists; return **forbidden** only when they may see it but may not
perform this action. Returning forbidden for an invisible record confirms it
exists.

## 3. Never trust the client

Reject or recompute, always server-side:

- role, permission, group or scope claims;
- tenant, organisation, owner or account identifiers used to select data;
- prices, amounts, totals, discounts, taxes, credits and entitlements;
- approval, status and lifecycle transitions;
- audit or provenance metadata;
- identifiers used as foreign keys — a caller supplying another tenant's
  identifier must fail authorization, not succeed quietly.

Mass assignment is a first-class risk: binding a request body straight onto a
persisted record is how privilege fields get set by callers who should not be
able to reach them.

## 4. Sensitive sinks

Trace every untrusted input to the sinks it can reach, and check the boundary:

| Sink | Primary risk |
|---|---|
| Database queries and writes | Injection, filter tampering, mass assignment |
| Outbound URLs and fetches | Server-side request forgery, credential leakage |
| File names, paths and parsers | Path traversal, zip/entity expansion, unsafe deserialisation |
| Shell and dynamic evaluation | Command injection |
| Templates and rendered output | Injection into the rendered context |
| Message, job and event payloads | Deserialisation, privilege carried across a trust boundary |
| Logs and audit records | Secret leakage, log injection |
| Responses and generated schemas | Over-exposure of internal fields |

## 5. Abuse and reliability controls

- Publicly reachable endpoints, and anything that sends mail, messages or
  one-time codes, have an explicit rate limit — a global default is not one.
- Inbound webhooks verify sender authenticity, payload signature and freshness,
  and resist replay.
- Anything retried is idempotent; duplicate delivery is safe.
- Expensive operations have bounds and backpressure.
- Counters, uniqueness and state transitions are safe under concurrency.
- Poison and terminal-failure handling is defined, not implicit.

## 6. Data exposure

- Errors returned to untrusted callers are stable and generic; the diagnostic
  detail is logged, not returned. Health and status endpoints are the most
  commonly missed case — they are usually unauthenticated and frequently quote
  the driver's error verbatim, including internal hosts and usernames.
- Response shapes exclude secrets at runtime **and** in any generated schema or
  documentation. Those are independent layers, and protecting one is a common
  false sense of security.
- Log redaction covers authorization headers, cookies, credentials, tokens and
  one-time codes, and is extended whenever a new sensitive field appears.
- Audit records are useful but minimised: enough to reconstruct who did what to
  what, without copying the sensitive payload into a second store.

## 7. Secrets

- No secret in source, in a fixture, in a test, in a log, in a comment, or in a
  commit message.
- Configuration is read through one typed source; secrets come from the
  environment or a secret store.
- A secret that has been exposed is rotated, not deleted from history and
  forgotten.

## 8. Proportionality

High-risk changes require an explicit threat model and negative tests —
unauthenticated, wrong permission, another tenant's record, another actor's
record.

Critical changes require qualified **human** security review. Automated review
is never sufficient on its own, and a report on a Critical change says so
plainly rather than implying coverage it does not have.
