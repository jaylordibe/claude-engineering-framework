---
name: framework-doctor
description: Audits the contract between the installed engineering framework and this repository — whether the required artefacts exist, whether the declared commands actually resolve, and whether repository documentation still matches repository reality. Read-only; changes nothing, and reports no permission state because the framework ships none.
argument-hint: "[--strict]"
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
model: inherit
effort: medium
---

# Audit the repository contract

Options:

```text
$ARGUMENTS
```

This skill is **read-only**. It reports; it never fixes. Use
`/engineering-framework:framework-install` to change anything.

## 1. Run the mechanical checks

```bash
ef-doctor
```

Add `--strict` if the argument requested it. `ef-doctor` is on `PATH` while the
plugin is enabled.

Report its output verbatim, then interpret it. Do not repeat a `PASS` line as
prose; spend the words on the `WARN` and `FAIL` lines, saying for each **what
becomes possible because of it**, not just that it is missing.

## 2. Check the thing a script cannot: is the documentation still true?

This is the highest-value part of the audit, and only a reading agent can do
it. `ef-doctor` can tell you `CLAUDE.md` exists. It cannot tell you whether it
still describes this repository.

Pick the load-bearing claims in the repository's own documentation — the
architecture section, the cross-cutting conventions, the canonical commands,
the non-obvious invariants — and **verify each against the source**. Sample
rather than exhaust: five verified claims are worth more than a promise to
check everything.

For each claim, report one of:

| Grade | Meaning |
|---|---|
| **Confirmed** | Found in source at `path:line` |
| **Stale** | The code moved; the document did not |
| **Incorrect** | The document describes something that was never true here |
| **Not found** | The named construct does not exist in this repository |

**A stale architectural claim is a real defect, not a documentation nit.** The
framework's agents treat repository documentation as evidence, so a
`CLAUDE.md` that describes a construct this repository does not have will
produce reviews measuring the code against an architecture it does not possess.
That is worse than no documentation at all.

Check specifically for text copied in from another repository or another
project's framework: a convention citing a symbol, path, decorator or command
that does not exist here.

## 3. Check the canonical commands actually work

For each command the repository declares in its `CLAUDE.md` canonical-commands
table, confirm the target exists: the script is defined in the manifest, the
binary is on `PATH`, the configuration file it names is present.

**Do not run build, test or install commands to check this.** Establish it
statically. A command that is declared but undefined is a `BLOCKED` validation
gate waiting to happen, and finding it now costs nothing.

## 4. Report

```text
Repository contract audit
  Mandatory:   <status of CLAUDE.md>
  Dependency:  <whether .claude/settings.json declares the marketplace and
                enables the plugin, and that each colleague still installs it>
  Drift:       <stale or incorrect documentation claims, with path:line>
  Commands:    <declared vs. actually resolvable>
  Risk paths:  <declared high-risk paths, and that they shape ceremony only>
  Leftovers:   <pre-plugin .claude/ directories still overriding the plugin,
                and any policy file left over from before 2.0.0 that ef-doctor
                names — report what it says; do not read the file yourself>
```

Everything this reports is **advisory**. The framework ships no permission
rules and no hooks that gate a command, so nothing here is enforced by the
plugin. If the repository wants an operation blocked rather than reserved by
the charter, say which rule its owner would add to their own settings — and do
not add it.

Then, at most five recommendations, **ordered by what they prevent** rather
than by how easy they are. For each: what to do, and the concrete failure it
avoids.

End with one honest sentence about the state of the contract. If the repository
is in good shape, say so plainly and stop — a doctor that always finds
something is a doctor nobody runs twice.
