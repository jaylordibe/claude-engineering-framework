---
name: himoa-domain-cryptography
description: The decisions and failure modes that govern cryptography and security-sensitive primitives — encryption, hashing, signatures, tokens, randomness, keys and verification. Carries the questions a change must answer, and none of the answers.
---

<!-- GENERATED from plugins/himoa/skills/domain-cryptography/SKILL.md by tests/validate-adapter-projection.mjs (himoa 3.7.0). DO NOT EDIT. Edit the canonical source and run: node tests/validate-adapter-projection.mjs --write -->

# Cryptographic and security-sensitive primitives

This skill carries the **decisions and the failure modes**. It does not know
which platform, library or algorithm this repository uses, and it prescribes
none — the right choice depends on the platform, the framework, repository
convention, interoperability, and current accepted guidance.

**Establish the mechanism from evidence first** —
`@HIMOA_HOME@/standards/repository-evidence.md` — then apply the
questions below to what you actually found. Use this repository's own words for
its constructs, and never introduce a term it does not use.

The governing rule sits above every question here: **do not invent security
primitives.** A primitive is correct only in its exact, reviewed form, and a
plausible variant is usually broken in a way no test reveals. Prefer, in order:
a primitive the repository already wraps for this purpose; the platform or
framework's native primitive; an established, maintained library; and only with
exceptional, stated justification and human security review, custom code.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What security property does this code actually need — confidentiality, integrity, authentication of origin, proof of possession, unguessability? | |
| Does the repository already wrap a primitive for this purpose, and where? | |
| What does the platform or an established library provide for it? | |
| Where does randomness for security-bearing values come from? | |
| Where are keys and cryptographic material held, generated and rotated? | |
| What verifies signatures, certificates or hosts on this path, and what happens when verification fails? | |

An **`UNKNOWN`** here is a blocker. An **`ABSENT`** primitive the change needs —
no integrity on encryption that requires it, no verification on a path that
consumes signed data — is a finding, not a gap to route around.

## 2. The decisions this change must make

1. **Which rung of the ladder does this use** — an existing wrapper, a platform
   primitive, an established library, or (exceptionally, with human review)
   custom code? Name the rung and why a lower one does not serve.
2. **Is randomness for anything security-bearing** — tokens, identifiers, keys,
   nonces, salts, reset and verification codes — from a cryptographically secure
   source?
3. **Is the hash fit for its purpose** — memory-hard and salted for credential
   storage, versus a fast primitive for integrity or identifiers?
4. **Does encryption that needs integrity use authenticated encryption**, with a
   unique, correctly generated nonce or initialisation vector each time?
5. **Where does key material live**, how is it generated, and is it ever
   hard-coded, committed, logged or returned?
6. **Is verification kept on**, and does a verification failure fail closed?
7. **Is freshness handled separately from the signature**, where replay matters?
8. **How is each of the above tested?**

## 3. The failure modes, in order of how often they are real

### Inventing the primitive

A custom cipher, a bespoke password hash, a home-grown token or signature
protocol, "encryption" that is an encoding: each reads as done and is broken.
The fix is not to review the invention harder; it is to replace it with an
established primitive. Where a custom construction is genuinely unavoidable, it
does not ship on an automated run's say-so — cryptography is Critical risk and
requires qualified human security review
(`@HIMOA_HOME@/standards/security.md`).

### Predictable randomness for secrets

A general-purpose or seedable random generator produces values an attacker can
predict or reproduce. Anything unguessable by requirement — a token, a key, a
nonce, a reset code — comes from a cryptographically secure generator. This is
the single most common real defect in this area, and it always reads as fine.

### The wrong hash for the job

A fast, general-purpose hash is correct for integrity and identifiers and wrong
for password storage, where it must be memory-hard and salted so that stealing
the store does not yield the passwords. Using the integrity hash for credentials
is the classic version of this.

### Unauthenticated encryption, or a reused nonce or IV

Encryption without integrity lets an attacker alter ciphertext undetected;
authenticated encryption is the default where tampering matters. A nonce or
initialisation vector reused across messages under the same key breaks the
guarantee even when the algorithm is sound.

### Hard-coded, logged or returned key material

A key in source, a fixture, a commit, a log line, a response body or anything
sent to a client is compromised. Keys and secrets load from the secret path,
are rotated there, and never cross into output.

### Disabling verification to make it work

Turning off signature, certificate or host verification because an integration
fails removes the exact property the primitive existed to provide. The fix makes
verification succeed — the right trust anchor, the right host, the right
clock — never a flag that skips it.

### A signature is not freshness

A valid signature proves origin and integrity, not that the message is new. Where
replay matters — a webhook, a signed request, a one-time action — freshness is a
separate control: a nonce, a timestamp window, a single-use record. "We signed
it, so replay is impossible" is the failure.

### Comparing secrets in variable time

A comparison of a secret, a token or an authentication tag that returns on the
first differing byte leaks the value through timing. Secret and tag comparisons
are constant-time.

## 4. Tests that must exist

Write every one this system can actually express. Skip a row only when what it
checks is `ABSENT`, and say so.

- a security-bearing value is drawn from a cryptographically secure generator —
  asserted, not assumed;
- authenticated encryption rejects a tampered ciphertext;
- a verification failure is rejected and cannot be silently switched off by
  configuration;
- a replayed but validly-signed message is rejected where freshness matters;
- a secret or tag comparison does not short-circuit on the first differing byte.

Where cryptographic correctness depends on external behaviour, follow the
repository-evidence and external-verification rules and prefer authoritative
sources over recall. A change to a security primitive that an automated run
alone pronounces "safe" has not met the bar: Critical risk means human security
review, and self-certification is what this skill exists to refuse.
