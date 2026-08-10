# Contract change worksheet: [endpoint, event or payload]

> A thinking aid, not a deliverable. Use it when a change adds or alters
> anything a consumer can observe — a request or response shape, an event, a
> message payload, a command-line interface, a published schema. Fold the
> conclusions into the plan and commit neither.
>
> Transport-agnostic on purpose. "Request" means whatever carries input in this
> system; "consumer" means anything that programs against it.

## 1. Identity

| | |
|---|---|
| **Operation** | |
| **Transport** | request/response · event · message · scheduled · command |
| **Entry point** | `path:line` |
| **New or changed?** | |
| **Access declaration** | public / authenticated / permission required — and which |

If this system requires every entry point to declare exactly one access rule,
say which one this declares. An entry point whose access declaration is
implicit is a finding, not a detail.

## 2. Request fields

| Field | Type | Required | Nullable | Default | **Authoritative source** | Validation | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | client / server-computed / looked up | | |

The **authoritative source** column is the point of this table. Any field
marked "client" that determines money, ownership, permission, tenancy or
approval state is a security finding before it is a design decision — see
`standards/security.md` §3.

## 3. Response or payload fields

| Field | Type | Always present | Nullable | Sensitive | Excluded from generated schema | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

Runtime exclusion and documentation/schema exclusion are independent layers.
A field hidden in one and not the other is exposed.

## 4. Error and failure behaviour

| Condition | Status or result | Stable identifier | Consumer behaviour | Reveals existence? |
|---|---|---|---|---|
| | | | | yes / no |

For each new identifier, state what a consumer is expected to do with it —
retry, re-authenticate, show a message, log out. An identifier nobody knows how
to handle is a string.

For each row, answer the disclosure question: does this response tell an
unauthorised caller that something exists? Not-found for invisible records;
forbidden only for visible ones they may not act on.

## 5. Collection behaviour

Only if this operation returns a collection.

| | |
|---|---|
| **Pagination** | mechanism and maximum page size |
| **Default ordering** | and whether it is deterministic under equal keys |
| **Filtering** | which fields, and whether the filter is authorization-scoped |
| **Search** | fields, matching semantics, index support |
| **Unbounded variant** | must not exist — confirm there is none |

## 6. Idempotency and delivery

| | |
|---|---|
| **Safe to retry?** | |
| **Idempotency mechanism** | key, natural uniqueness, or none |
| **Duplicate delivery** | what happens on the second arrival |
| **Ordering assumptions** | and whether the transport actually provides them |
| **Terminal failure** | where it goes, who notices |

Never claim exactly-once without naming the mechanism.

## 7. Compatibility

| Question | Answer |
|---|---|
| Is any existing field removed, renamed, or made required? | |
| Is any enumerated value added or removed? | |
| Does any status, identifier or shape change meaning? | |
| Can old and new run simultaneously? | |
| Which side must deploy first? | |
| Roll-back path if the consumer cannot follow? | |

Adding a value to an enumeration is a breaking change for any consumer that
switches exhaustively on it. Say so rather than assuming tolerance.

## 8. Consumer handoff

| Consumer | Owner | Change required | Blocking? | Ships before / after |
|---|---|---|---|---|
| | | | | |

Take the consumer list from the repository's declared consumers. If that list
is empty *and* the repository has not explicitly stated it has none, the
correct answer is not "none" — it is "unknown", and that is a blocker.

## 9. Documentation and generated artefacts

- [ ] Generated schema or specification reflects the change
- [ ] Sensitive fields hidden in the generated artefact as well as at runtime
- [ ] Response shape is documented explicitly where the tooling cannot infer it
- [ ] Repository documentation updated where it described the old behaviour

## 10. Contract tests

| Assertion | Test file | Why it protects a consumer |
|---|---|---|
| | | |

At minimum: the success shape, the failure identifier, the access denial, and
the field that must never appear.
