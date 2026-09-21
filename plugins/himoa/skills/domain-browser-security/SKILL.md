---
name: domain-browser-security
description: The decisions and failure modes that govern code running in a browser or other client runtime. Carries the questions a change must answer, and none of the answers.
when_to_use: Use when a change reaches a client runtime — rendering data into a page, cookie or ambient-credential sessions, cross-origin sharing, security response headers, framing, user-controlled redirects or callbacks, cross-document messaging, data kept in client storage, an access decision made in the client, or third-party scripts and SDKs, and tests for any of those.
user-invocable: false
---

# Browser and client trust boundary

This skill carries the **decisions and the failure modes**. It does not know
how this repository builds, renders or serves its client, and it names no
framework.

**Establish the mechanism from evidence first** —
`${CLAUDE_PLUGIN_ROOT}/standards/repository-evidence.md` — then apply the
questions below to what you actually found. Use this repository's own words for
its constructs, and never introduce a term it does not use.

This trust boundary exists only where a change reaches a client runtime. A
backend-only, worker-only or command-line change has no browser surface, and
saying so plainly is the correct answer — inventing one is not.

## 1. Establish before deciding

| Question | Answer with `path:line`, or `UNKNOWN` |
|---|---|
| What client runtime does this change render into, and what code renders it? | |
| How does that renderer encode output by default, and where is the escaping bypassed? | |
| What proves identity in the client — a credential the client attaches automatically, or one the caller must set? | |
| Which requests change state, and what protects them from cross-site forgery? | |
| What scope, lifetime and attributes do security-sensitive cookies carry? | |
| What cross-origin sharing policy is configured, and does it permit credentialed access? | |
| Which security response headers are set, and by what? | |
| What may be framed by another site, and what prevents it? | |
| What does the client store, and which sensitive values reach client storage, a URL, history or a client log? | |
| Which access decisions are made in the client, and is any of them the only check? | |
| What third-party code loads into the page, and with what integrity and provenance? | |

An **`UNKNOWN`** here — you could not tell — is a blocker for the change, not a
detail to work around. An **`ABSENT`** — you searched and the mechanism
genuinely does not exist — is a finding: a state-changing form behind
automatically-attached credentials with no anti-forgery control is a defect, and
saying which of the two you found is the point.

## 2. The decisions this change must make

1. **Where does untrusted data enter a rendered context**, and is it encoded for
   that exact context — element text, attribute, URL, script or style?
2. **Does the authentication model create a cross-site request-forgery
   exposure**, and what control answers it? Base this on the actual model, not a
   reflex.
3. **What may each security-sensitive cookie do** — its scope, lifetime, whether
   script can read it, and whether it is attached on cross-site requests?
4. **What does cross-origin sharing permit**, to which origins, and with
   credentials or without?
5. **Which operations are authorized on the server**, and is any of that
   authority implied only by what the UI shows or hides?
6. **What redirect or callback destinations can the caller influence**, and how
   are they constrained?
7. **What does the client store**, and does anything sensitive belong somewhere
   else entirely?
8. **How is each of the above tested?**

## 3. The failure modes, in order of how often they are real

### Encoding for the wrong context, or bypassing it

Output safe as element text is unsafe in an attribute, a URL, a script or a
style, and a value routed through a sink that parses a string into live markup
is not encoded at all. Prefer the renderer's own context-aware output over
hand-written sanitisation; reach for sanitisation only for genuinely rich HTML,
at one reviewed boundary. Untrusted input reaching an unsafe markup sink is
stored, reflected or DOM-based cross-site scripting, whichever way it arrives.

### Ambient credentials without anti-forgery

Where the client attaches a credential automatically, any site can cause the
caller's browser to send a state-changing request. The control that answers this
depends on the mechanism the repository actually uses; the failure is a
state-changing operation that has none. A read-only request, or one
authenticated only by a value the caller must set explicitly, does not carry
this exposure — requiring the control there is the inverse mistake.

### Cross-origin sharing mistaken for access control

A sharing policy widens who may **read a response in a browser**. It decides
nothing about who may perform an operation — that is authorization, enforced on
the server. Reflecting the request origin, or allowing credentialed access from
an over-broad origin, hands that read access to any site.

### The client as the only access check

Hiding or disabling a control, a route or a menu item is presentation, and a
route guard that runs only in the client is presentation too. The operation each
would reach is authorized on the server or it is unprotected. **UI visibility is
not authorization**, and neither is a client-side guard.

### Sensitive data left in the client

Client storage, a URL, browser history and a client log are all readable by the
client and by any script running in it. A secret, a token, another actor's data
or more of the current actor's data than the screen needs does not belong there;
client storage is not protected server-side storage.

### Open redirects and unvalidated callbacks

A redirect or callback target taken from caller-influenced input, and not checked
against an allowlist or constrained to a safe relative destination, sends the
actor — and sometimes a credential in the URL — wherever the attacker chooses.

### Cross-document messages trusted without checking origin

A handler for messages from another window or frame that does not validate the
sender's origin and the shape of the payload will act on anything any page sends
it; a message posted to an unrestricted target origin leaks its payload.

### Third-party script with the page's full authority

Code loaded into the page runs with the page's authority over the DOM, storage
and in-flight credentials. Introducing or materially changing such a script or
SDK is a trust decision — its necessity, the data it can reach, and its
integrity and provenance — not a dependency detail.

## 4. Tests that must exist

Write every one this client can actually express. Skip a row only when the
surface it tests is `ABSENT`, and say so.

- untrusted input rendered into each reachable context is neutralised — the
  injected script does not execute;
- a state-changing request without the anti-forgery control is rejected, where
  ambient credentials apply;
- a credentialed cross-origin request from a disallowed origin is refused;
- an operation the UI hides or disables is still refused when called directly on
  the server;
- a redirect or callback to an off-allowlist destination is rejected;
- a cross-document message from an unexpected origin is ignored.

A browser-facing change whose server-side access decision has no negative test
has not been tested. UI-only behaviour is not that test.
