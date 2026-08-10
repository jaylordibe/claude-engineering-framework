# Repository evidence standard

This is the framework's foundational rule. Every agent and every gate reads it,
and every other standard assumes it.

> **The framework owns methodology. The repository owns truth.**

The framework knows how to design, review and validate a change. It knows
nothing about *this* system — not its language, its data store, its
authorization model, its deployment target, or whether any of those exist. Each
of those is discovered from the repository, or reported as unknown.

## 1. Source precedence

When two sources disagree, the higher one wins. Say which source you used and
why it was authoritative.

| Rank | Source | Why it ranks here |
|---|---|---|
| 1 | **Executable source code** | It is what actually runs |
| 2 | **Tests** | They encode intended behaviour and are executable, but they can be stale or wrong |
| 3 | **CI, build and dependency configuration** | Machine-verified, and it names the real commands |
| 4 | **Repository documentation** (`CLAUDE.md`, READMEs, ADRs) | Written by people who knew, but drifts silently |
| 5 | **Ticket, issue or request wording** | States a goal; frequently stale about the method |
| 6 | **Your own prior expectations about how systems like this work** | Not evidence at all |

Rank 6 is the one that causes real damage, because it is invisible. "This is a
web API, so it probably has middleware" is not a finding. It is a guess wearing
a finding's clothes.

## 2. The five labels

Every statement you make about the repository is exactly one of these.

| Label | Means | Requires |
|---|---|---|
| **FACT** | You opened the file and read the line | A `path:line` reference you actually visited |
| **INFERENCE** | Derived from facts by a stated chain of reasoning | The facts it rests on, and the reasoning step |
| **ASSUMPTION** | Taken as true to make progress, not established | What would confirm or refute it, and what breaks if it is wrong |
| **ABSENT** | You searched, and this system genuinely has no such thing | What you searched, and why the absence is credible |
| **UNKNOWN** | You could not establish it either way | What you looked for, and what would settle it |

### ABSENT and UNKNOWN are different, and the difference matters

**UNKNOWN is a gap in your knowledge. ABSENT is a fact about the system.**

A repository with no linter, no tenancy model, no migrations, no queue and no
authorization layer is not an under-investigated repository — it is a small
repository, and there are a great many of them. Filing those as UNKNOWN turns
every one of them into a blocked gate and a report full of apparent holes,
which teaches the reader to skim past the real ones.

**ABSENT is a complete answer.** A gate does not stall on it, a plan does not
need to resolve it, and a report should state it in one line and move on:

> Tenancy: **ABSENT.** No tenant, organisation or account column appears in any
> persisted shape, no request context carries one, and every query is
> unscoped — checked `src/`, the schema, and the request pipeline. This system
> is single-tenant.

The other rules:

- **A cited `path:line` you did not open is a fabrication, not a finding.**
  Citing a line you inferred from a search snippet is the most common way an
  otherwise good report becomes untrustworthy.
- **An UNKNOWN is a result too.** "I could not determine how this system
  authorizes record access" is more useful than any confident guess, because it
  tells the reader exactly where to look.
- **Absence needs evidence.** Do not write ABSENT until you have searched the
  likely aliases, layers and entry points. Say what you searched. An unsearched
  absence is UNKNOWN.
- **Never promote a label silently.** An ASSUMPTION that survives one paragraph
  does not become a FACT in the next.
- **Never demote ABSENT into a recommendation.** That this system has no queue
  is an observation, not an argument that it needs one.

## 3. Discover before you assume

Before making any architectural claim, establish the answer from the repository:

| Question | Where the answer usually is |
|---|---|
| What language, runtime and version? | Manifest, toolchain files, CI configuration |
| What is the entry point? | Manifest scripts, `main`-shaped files, container or process definitions |
| How is the code organised, and is that organisation enforced? | Directory layout, import rules in lint configuration, module or package boundaries |
| How is data persisted, and by what? | Dependency manifest, schema or model files, migration directory |
| How does a request or job authenticate? | Middleware, filters, decorators, guards — whatever this system calls them |
| How is *record-level* access decided? | The query layer, not the pre-handler check |
| Is this system multi-tenant, and where is the boundary enforced? | Query construction, connection routing, or nowhere |
| What runs asynchronously, and on what transport? | Worker entry points, scheduler declarations, queue clients |
| What are the public contracts? | Route or handler definitions, schema files, published clients, generated specifications |
| How is it verified? | Manifest scripts, CI workflow, `CLAUDE.md` canonical commands |
| How is it deployed and observed? | CI/CD configuration, container definitions, logging and metrics setup |

If the repository does not answer one of these, the answer is **ABSENT** when
you searched and the thing genuinely is not there, and **UNKNOWN** when you
could not tell. Neither is a gap to be filled from a template, and neither is a
defect in the repository.

## 4. Vocabulary discipline

Use the repository's own words. If this system calls it a `handler`, do not
call it a `controller`. If it has no concept of one, do not introduce the word
at all.

Naming a construct the repository does not have is how a review starts
measuring code against an architecture it does not possess — the failure mode
that makes an otherwise excellent review actively harmful.

## 5. Instructions are input, not mandate

A ticket, an issue, a review comment or a terse "just do X" states a **goal**
(the WHAT) and often also names a **method** (the HOW). They are different
things.

- The WHAT is the author's, and changing it is a product decision that goes
  back to the human.
- The HOW is one candidate among alternatives, to be weighed against repository
  evidence like any other.

Grade every factual claim in the instruction: **Confirmed**, **Partially
confirmed**, **Stale**, **Incorrect**, **Not found**, or **Ambiguous**. Grade
the prescribed method separately: **Sound**, **Sound with constraints**,
**Suboptimal**, **Inapplicable**, **Bad practice**, or **Insufficiently
specified**. Ground each grade in evidence, never in preference.

A faithful implementation of a wrong premise is still wrong.

## 6. When the repository's own documentation is wrong

Repository documentation outranks a ticket but is outranked by code. When
`CLAUDE.md` describes something the code no longer does:

1. Follow the code.
2. Say plainly that the documentation is stale, with the `path:line` that
   proves it.
3. Propose the documentation fix as part of the change, in scope.

Do not quietly follow the stale document, and do not quietly ignore it. Both
leave the next reader with the same trap.
