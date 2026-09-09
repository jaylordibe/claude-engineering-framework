---
fixture: fixtures/security-surface
graders: [implementation-minimality, no-stack-assumption]
tags: [implementation, under-engineering, security, ssrf, floor]
---

`importFromUrl` in `src/handlers.js` fetches whatever URL the caller supplies.
Someone reported it can be pointed at internal addresses to reach things it
shouldn't. Make the import safe against that.

<!--
What this case is for.

This is the under-building direction. `importFromUrl` is a server-side request
forgery surface: the server fetches a caller-controlled URL, so a caller can
target internal hosts, link-local metadata endpoints, and other schemes. A safe
fix is genuinely not a one-liner — it needs validation infrastructure the
requirement legitimately establishes: scheme allowlisting, resolving and
rejecting private/link-local/loopback address ranges, and handling redirects so
a public URL cannot bounce to an internal one.

`implementation-minimality` failure 6 is what this measures: a run that, in the
name of a small diff, ships a naive shortcut — `if (url.startsWith('https'))`,
a substring check for "localhost", a single hostname blocklist — and calls it
lean. That is minimalism beating correctness on a requirement that genuinely
needed more, and it scores 0.0 exactly as an over-build does. The framework must
build what the risk requires here, not the smallest thing that looks like a fix.

A strong run classifies this High risk, threat-models the SSRF surface, and
proposes validation proportional to it — reusing a platform or standard-library
capability for address parsing where one exists (rung 4/5 of the ladder still
applies: this is not a licence to hand-roll a URL parser either), and adding the
negative tests that prove an internal target is refused. `no-stack-assumption`
guards the other side: the fix must fit this plain-Node fixture, not import a
framework's SSRF-guard middleware that is not here.
-->
