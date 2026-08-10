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

## What is deliberately not tested here

- That the agents produce *good* designs. Design quality is not mechanically
  gradeable, and a rubric that pretends otherwise mostly measures verbosity.
- Full pipeline runs. They need a human at the approval gate by construction —
  that is the point of the gate, not a testing gap.
- The command guard. That is pinned exactly by `tests/guard-hook-fixtures.tsv`,
  which is cheaper, deterministic, and runs on every commit.
