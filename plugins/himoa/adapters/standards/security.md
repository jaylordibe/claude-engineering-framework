<!-- GENERATED from plugins/himoa/standards/security.md by tests/validate-adapter-projection.mjs (himoa 3.5.0). DO NOT EDIT. Edit the canonical source and run: node tests/validate-adapter-projection.mjs --write -->

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

## 8. Browser and client trust boundary

When a change reaches a browser or other client runtime, that runtime is an
untrusted, inspectable, attacker-influenced environment. This is the §3 rule —
never trust the client — extended to what the client renders, sends and stores.
It applies only when a change actually reaches a client runtime; a
backend-only, worker-only or command-line change does not pull this section.

- **Output is encoded for the context it lands in.** Element text, an
  attribute, a URL, a script context and a style context are different
  escapings. Prefer the framework's own context-aware rendering over
  hand-written sanitisation. Untrusted input reaching an unsafe rendering sink
  is how stored, reflected and DOM-based cross-site scripting occur.
- **Ambient-credential authentication carries a cross-site request-forgery
  risk.** Where the client attaches a credential automatically — a cookie or
  equivalent — state-changing operations need an anti-forgery control suited to
  that model. A request authenticated only by a value the caller must set does
  not, so the requirement follows the actual authentication model, not a rule.
- **Security-sensitive cookies** declare their scope, lifetime and the
  attributes that keep them from script and from cross-site attachment. A change
  to session cookies is an authentication change (§1).
- **A cross-origin sharing policy is not authorization.** It widens who may read
  a response in a browser; it never decides who may perform an operation — that
  is §2. Credentialed access from an over-broad or reflected origin is a finding.
- **Client storage is not protected storage.** Anything placed in client
  storage, a URL, browser history or a client log is readable by the client and
  by any script in it; a secret, token or another actor's data does not belong
  there.
- **UI visibility is not authorization.** Hiding or disabling a control, a route
  or a menu item is presentation. Every operation it would reach is still
  enforced on the server (§2), or it is unprotected.
- **A user-controlled redirect or callback destination** is validated against an
  allowlist or constrained to a safe relative target.
- **Cross-document messaging** validates the origin and the shape of what it
  receives, and does not post sensitive data to an unrestricted target origin.
- **Third-party client code runs with the page's full authority.** Introducing
  or materially changing a client-loaded script or SDK is a trust-boundary
  decision: its necessity, the data it can reach, and its integrity and
  provenance are all in scope.

The `domain-browser-security` playbook carries these decisions and their failure
modes in full.

## 9. Dependency and build-chain trust

Code the repository did not author still runs with its privileges. A change that
adds or materially updates a dependency, a build or continuous-integration tool,
a lockfile, a pipeline action, a base image or a downloaded artifact is a
supply-chain decision. A change that does not touch that surface does not pull
this section.

- **Necessity first.** A new dependency is justified against reuse of existing
  capability, the platform and the standard library; its maintenance and
  security cost is part of the change, not an afterthought (`architecture.md`
  §3).
- **Identity and provenance.** The package is the one intended, from the
  expected source, and cannot be shadowed by a public name resolving ahead of a
  private one. A new or unfamiliar dependency is checked for name confusion and
  typo-squatting before it is trusted.
- **Integrity is preserved, not asserted.** Where the ecosystem records resolved
  versions and hashes, that record is kept, and its changes correspond to the
  intended package change; unexplained transitive churn is investigated, not
  waved through. A generated lockfile is not hand-edited to make a check pass
  (`evidence.md`).
- **Version constraints match the ecosystem and the risk.** Pinning is a
  judgement, not a universal rule, and "newest" is not "safest".
- **Install and build lifecycle scripts execute arbitrary code** at install
  time. A new or unfamiliar package that ships them is reviewed on that basis.
- **A pipeline is a dependency.** A pipeline action or plugin is pinned, scoped
  to the privilege it needs, not handed more secret or token access than it
  uses, and does not trust its inputs blindly. A container base image has a
  trusted source, a version or digest strategy, and no more surface than the
  workload needs.
- **Known-vulnerability status is evidence, not assumption.** Where the
  repository supports a dependency-audit or scanning step, a security-sensitive
  dependency change carries fresh output from it. Where no such step exists, that
  is `N/A`, not a silent pass; a not-checked claim that a dependency is free of
  known issues is `UNKNOWN`, never "no vulnerabilities" (`evidence.md`).

The `domain-supply-chain` playbook carries these decisions and their failure
modes in full.

## 10. Cryptographic and security-sensitive primitives

A security primitive is correct only in its exact, reviewed form; a
plausible-looking variant is usually broken in a way no test reveals. The
governing rule is **do not invent them**. Prefer, in order: a primitive the
repository already wraps for this purpose; the platform or framework's native
primitive; an established, maintained library; and only with exceptional,
stated justification and human security review, custom code.

- **Randomness for anything security-bearing** — tokens, identifiers, keys,
  nonces, salts, reset and verification codes — comes from a cryptographically
  secure generator. A general-purpose or seedable random is a defect here
  however it reads.
- **Hashing is fit for purpose.** Password and credential storage uses a
  memory-hard, salted, current algorithm (§1); a fast general-purpose hash for
  password storage is wrong. Integrity or identifier hashing is a different job
  with different requirements.
- **Encryption that needs integrity uses authenticated encryption,** with
  correctly generated, non-reused nonces or initialisation vectors.
  Unauthenticated encryption where tampering matters is a finding.
- **Keys and cryptographic material** are never hard-coded or committed, are
  stored and rotated through the secret path (§7), and never reach a log, a
  response or a client.
- **Verification is not an obstacle to switch off.** Disabling signature,
  certificate or host verification to make an integration work removes the
  property the primitive existed to provide; the fix makes verification succeed,
  it does not bypass it.
- **A signature proves origin and integrity, not freshness** — replay resistance
  is a separate control (§5). Inventing a bespoke authentication, token or
  signature protocol instead of using an established one is itself the risk.
- **Compare secrets and authentication tags in constant time** (§1).

A change to cryptography is Critical risk: automated review is never sufficient
and human security review is required (§11). The `domain-cryptography` playbook
carries these decisions and their failure modes in full.

## 11. Proportionality

High-risk changes require an explicit threat model and negative tests —
unauthenticated, wrong permission, another tenant's record, another actor's
record.

Critical changes require qualified **human** security review. Automated review
is never sufficient on its own, and a report on a Critical change says so
plainly rather than implying coverage it does not have.

Where the repository declares a security-validation command — a security test
suite, a dependency audit, a static-analysis or an application-security step — it
is run and consumed like any other declared check, and reported `PASS`, `FAIL`,
`BLOCKED` or `N/A` on its own evidence (`evidence.md`). No such command is named
or required here: its absence is `N/A`, never a substitute for the review this
section requires, and its passing is evidence for what it tested, never a claim
of "secure" beyond that.
