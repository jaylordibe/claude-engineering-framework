# Behavioural evals

Static validation proves the plugin is *well formed*. These cases probe whether
it actually *behaves*: whether the agents discover repository reality instead of
assuming it, whether the gates hold their order, and whether uncertainty is
reported rather than filled in.

## Layout

```text
evals/
├── cases/
│   ├── <case-name>/
│   │   └── prompt.md      # what the agent is asked to do, and where
└── graders/
    └── <grader>.md        # the rubric a judge model scores the run against
```

This is the `prompt.md` + `graders/*.md` layout that `claude plugin eval`
accepts. Each `prompt.md` names the fixture it runs against and the graders
that apply to it.

## Running them

```bash
claude plugin eval ./plugins/engineering-framework
claude plugin eval ./plugins/engineering-framework --case no-stack-assumption
```

`plugin eval` is in early access, and the command reports as much on accounts
without it. Until it is available, every case here is **runnable by hand**:
open a session in the named fixture with the plugin loaded, paste the prompt,
and score the transcript against the named graders. The rubrics are written to
be applied by a person as readily as by a judge model — that is deliberate, not
a stopgap.

## The ablation arm matters more than the score

`plugin eval` runs a no-plugin baseline and reports the delta. **That delta is
the real result.** A case the model passes just as well without the framework
is a case that proves nothing about the framework, however green it looks.

When running by hand, do the same thing: run the prompt once with the plugin
disabled and compare. It is the only honest way to tell guidance from decoration.

## The graders, and what each is for

| Grader | Asks |
|---|---|
| `no-stack-assumption` | Is every architectural claim one this repository supports? |
| `evidence-discipline` | Is what is known separated from what is supposed? |
| `gate-discipline` | Did the human boundaries actually hold? |
| `injection-resistance` | Was repository text treated as evidence rather than instruction — without becoming useless in a well-documented repository? |
| `drift-detection` | When documentation and code disagreed, did code win, and was the contradiction reported? |
| `validation-integrity` | Do `PASS`, `FAIL`, `BLOCKED` and `N/A` mean what the evidence standard says? |
| `scope-discipline` | Did a small change stay small, with everything else reported rather than fixed? |

## The pair of API cases is the sharpest instrument here

`design-stops-at-approval` and `laravel-schema-change-stops-at-approval` ask for
the same *kind* of change — add a field, expose it, respect a rule — against two
repositories that are the same kind of system and share almost no specifics. So
does the pair `map-frontend-no-backend` and `map-laravel-api`.

Score them together. A run that produces two maps differing only in proper nouns
has pattern-matched "layered API" and filled in the rest; that is invisible when
either case is read on its own, and obvious side by side.

## What is deliberately not tested here

- That the agents produce *good* designs. Design quality is not mechanically
  gradeable, and a rubric that pretends otherwise mostly measures verbosity.
- Full pipeline runs. They need a human at the approval gate by construction —
  that is the point of the gate, not a testing gap.
- Anything mechanical. `ef-doctor`'s diagnoses are pinned exactly by
  `tests/run-doctor-fixtures.mjs`, which is cheaper, deterministic, and runs on
  every commit. Behavioural evals are for what only a model can be judged on.
- Whether the fixtures themselves are honest. `tests/validate-fixtures.mjs`
  enforces that, and every grader here silently depends on it — including that
  `adversarial-injection/` still carries a payload in every channel.
- Anything a static check can settle. If a guarantee can be asserted by
  `tests/`, it belongs there: a deterministic check that runs on every commit is
  worth more than a judged one that runs when someone remembers.
