---
name: domain-auth
description: The decisions and failure modes that govern authentication and account security. Carries the questions a change must answer, and none of the answers.
when_to_use: Use when changing sign-up, sign-in, sign-out, sessions or tokens, password handling, account recovery or reset, email or phone verification, one-time codes, multi-factor enrolment, lockout or throttling on an authentication path, or tests for any of those.
user-invocable: false
---

# Authentication and account security

This skill carries the **decisions and the failure modes**. It does not know
how this repository implements any of them.

**Establish the mechanism from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md`. Authentication is the
area where an assumed mechanism does the most damage, because every plausible
guess is a real design that some system somewhere uses.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What proves identity — session, bearer token, cookie, external provider? | |
| What is inside the credential, and what is looked up per request? | |
| How is it revoked, and how long does revocation take? | |
| How are passwords stored and compared? | |
| Where are one-time codes generated, stored and consumed? | |
| What rate limiting exists on each authentication path? | |
| What is audited on success, and on failure? | |
| Which of these paths are reachable without authentication? | |

## 2. The decisions this change must make

1. **What is the credential, and what does it authorise?** Identity is not
   permission; anything revocable must be resolved server-side per request or
   revocation does not take effect until expiry.
2. **What does each path reveal about whether an account exists?**
3. **What is the lifetime**, of the session, the token, the code, the reset
   link — and what invalidates each early?
4. **What is the rate limit**, per what key, and what happens at the limit?
5. **What is recorded** for the account owner and for an investigator?

## 3. The failure modes, in order of how often they are real

### Account enumeration

Registration, login, recovery, verification and resend paths must not reveal
whether an account exists — through the **response body**, the **status code**,
the **field-level validation error**, the **timing**, or the **side effect**
(one path sends mail, the other does not).

The standard shape: always accept, always respond identically, and only do the
work when the account exists. If the product genuinely requires telling the
user their email is already registered, that is a product decision with a named
owner, made explicitly, and paired with rate limiting.

### Timing parity

A path that returns early when the account does not exist is measurably faster
than one that verifies a credential. Do the equivalent work in both branches —
a comparison against a dummy value of the same cost is the usual mechanism —
and assert the parity in a test if the path matters.

### One-time codes

Every one of these is a real failure that has shipped somewhere:

- the code is verifiable more than once, so it is replayable;
- the code has no expiry, or the expiry is not enforced on the consuming path;
- the code is not bound to the account, so a code issued for one identity
  verifies another;
- the code is not bound to its purpose, so a code issued for verification
  completes a password reset;
- attempts are unlimited, so a short code is brute-forceable;
- the code is logged, or returned in the response in a non-production mode that
  ships;
- comparison is not constant-time.

Consume the code atomically: mark it used in the same operation that validates
it, or two concurrent requests both succeed.

### Recovery is an authentication path

A reset token is a credential. It needs the same expiry, single use, binding
and rate limiting as any other, plus: it must invalidate existing sessions on
use, and it must not be usable to change the account's identifier as a side
effect.

### Lockout as a denial-of-service vector

Locking an account after N failures lets anyone lock anyone out. Prefer rate
limiting on the attempt, per source and per account, over a hard lock; if a
lock is required, it needs a bounded automatic release and a way for the real
owner to recover.

### Session lifecycle

Establish and state: what happens to existing sessions on password change, on
permission change, on explicit sign-out, and on account deactivation. "Nothing"
is an answer that must be deliberate.

### Leakage

Credentials, tokens, codes and reset links must never appear in logs, error
messages, audit metadata, analytics events, referrer headers, or a URL that a
browser will store in history. A code delivered in a link is in the URL — check
what the receiving page does with it.

## 4. Tests that must exist

- the enumeration-safe response is **byte-identical** between existing and
  non-existing accounts, asserted explicitly;
- an expired code is rejected;
- a used code cannot be reused;
- a code issued for one purpose does not work for another;
- a code issued for one account does not verify another;
- the attempt limit is enforced, and the response at the limit is asserted;
- sessions are invalidated by the events that should invalidate them;
- no credential, code or token appears in any log assertion.
