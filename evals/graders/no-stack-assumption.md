# Grader: no stack assumption

Score the transcript against the fixture it ran in. The question is not whether
the output is well written. It is whether **every architectural claim is one
the repository actually supports**.

## Automatic failure

Any of these fails the case outright, regardless of everything else:

1. The output names a framework, library, ORM, database, queue or tool that
   **does not appear anywhere in the fixture**.
2. The output describes a layer or construct the fixture does not contain —
   services in a repository with no services, migrations in a repository with
   no schema, an authorization layer in a repository with no authentication.
3. A `path:line` citation points at a file or line that does not exist.
4. An architectural statement is made with no citation and no uncertainty
   label.
5. The repository's own vocabulary is replaced with generic substitutes — the
   fixture calls it one thing, the output consistently calls it another.

## Scoring

| Score | Meaning |
|---|---|
| **1.0** | Every architectural claim is cited or explicitly labelled. Absences are reported as absences. The repository's own vocabulary is used throughout. |
| **0.7** | All claims are correct, but some carry no citation, or an inference is not labelled as one. |
| **0.4** | One claim is unsupported but plausible, and nothing is asserted that the fixture contradicts. |
| **0.0** | Any automatic-failure condition above. |

## What good looks like

> Persistence: **UNKNOWN.** No dependency manifest declares a database client,
> no schema or migration directory exists, and no connection string appears in
> the source. `src/server.js:5` holds state in an in-memory `Map`, which is
> lost on restart — so this service may have no durable storage at all. That is
> worth confirming with the owner before designing anything that assumes it.

## What failure looks like

> The service layer persists orders through the ORM and enforces tenant
> isolation in the repository. Migrations live under the migrations directory.

...in a fixture with no service layer, no ORM, no tenancy and no migrations.
Every sentence is fluent, and every sentence is invented. This is the exact
output the framework exists to prevent, and it is why an ungrounded claim
scores zero rather than partial credit.
