# Migrating from a copied `.claude/` directory

For a repository that already has a mature `.claude/` framework of its own and
wants to move the reusable half into the plugin.

The worked example throughout is `jaylordibe/nestjs-api`, the repository this
framework was extracted from.

---

## The rule

Every file in a mature `.claude/` directory is one of three things. Sort each
one before moving anything:

| It is | It goes |
|---|---|
| **Methodology** — true in any repository | Delete it. The plugin has it. |
| **Repository truth** — cites your symbols, paths, commands | Stays. It is why your framework was good. |
| **Both, fused together** | Split along the seam. The questions leave; the answers stay. |

The third category is the interesting one, and the one most likely to be
mis-sorted in both directions.

---

## Step 1 — Install and audit before deleting anything

```bash
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

```text
/engineering-framework:framework-doctor
```

The doctor reports your existing `.claude/agents/`, `.claude/standards/` and
`.claude/templates/` as leftovers. Do not act on that yet — read it as an
inventory.

**Both frameworks coexist safely at this point.** Project-level agent
definitions override same-named plugin ones, so your existing agents keep
winning until you remove them. That is deliberate: it makes this migration
reversible at every step.

---

## Step 2 — Delete what the plugin now owns

For `nestjs-api`, these came out wholesale:

| Deleted | Replaced by |
|---|---|
| `.claude/standards/gate-handoff.md` | `standards/gate-handoff.md` |
| `.claude/skills/gate-{design,approve,implement,review,validate}/` | the plugin's five gates |
| `.claude/skills/work-item/` | the plugin's conductor |
| `.claude/templates/plan.md`, `threat-model.md` | the plugin's templates |
| `.claude/hooks/*.sh` | the plugin's guards, which cover more forms |

Before deleting each one, read it once and ask: **does this file say anything
the plugin's version does not?** If it does, that sentence is repository truth
that was living in the wrong file. Move it to `CLAUDE.md` first.

---

## Step 3 — Split the fused files

This is the real work. Take each domain playbook and separate the **decisions
and failure modes** from **your answers to them**.

`nestjs-api` had five. They split like this:

| File | Outcome |
|---|---|
| `auth-security` | Its enumeration, timing, one-time-code and session rules are universal → covered by the plugin's `domain-auth`. Its specific decorators, helpers and flows stay. |
| `authorization` | "Isolation belongs in the query, not the guard" is universal → `domain-authorization`. The named query service, ability factory and scope enum stay. |
| `scheduled-sweep` | Sweep-versus-job choice, atomic claiming, bounded batches, poison handling are universal → `domain-background-work`. The specific queue library's API stays. |
| `e2e-testing` | Its universal half was already in the plugin's `standards/testing.md`. The harness detail — template database cloning, per-worker isolation — stays. |
| `resource-pattern` | **Kept whole.** It is "how this repository scaffolds a module". Its universal residue is three sentences that already live in the plugin's standards. |

Each surviving file gets reframed rather than merely trimmed: it now reads as
*this repository's answers to the questions `domain-authorization` asks*, and
it can drop the general explanation entirely.

### The test for whether you split correctly

Read the trimmed file and ask: **would this sentence still be true in a
different repository?**

- Yes, and it names no symbol → it belonged in the plugin. Delete it.
- No, or it names a symbol → it belongs here. Keep it.

A file that ends up with no repository-specific content should be deleted, not
kept "for context".

---

## Step 4 — Retarget your agents

If you keep any project-local agents, delete the ones the plugin now provides
and rewrite any that remain. Two mechanical changes are required:

- **Remove `permissionMode`.** Plugin-shipped agents do not support it. If you
  keep an agent project-local it still works, but you now have two agents
  enforcing read-only two different ways.
- **Reference the plugin's standards** with `${CLAUDE_PLUGIN_ROOT}/standards/…`
  rather than `.claude/standards/…`.

For `nestjs-api`, all eight agents were replaced by the plugin's eight. The
project-specific knowledge in them moved into `CLAUDE.md` conventions and the
surviving playbooks, where it is read by whichever lens needs it.

---

## Step 5 — Rewrite `CLAUDE.md`

This is where the migration is won or lost.

**Delete from it** everything the plugin now supplies: the engineering bar, the
gate sequence and descriptions, the risk table, the evidence language, the
human-owned operations list, the skill-naming rationale.

**Keep and sharpen** everything that describes your system: the project
paragraph, the architecture map, the cross-cutting conventions, the language
gotchas, the migration policy, the consumers table, the deep-reference index.

For `nestjs-api` this removes roughly 70 of 270 lines — and makes the remaining
200 more valuable, because they are now unambiguously *truth* rather than truth
mixed with methodology.

Add one line near the top so precedence is explicit:

> Engineering methodology comes from the `engineering-framework` plugin and is
> not restated here. Where a generic framework standard conflicts with a rule
> in this file, **this file wins.**

---

## Step 6 — Reconcile the permissions floor

Your existing `settings.json` almost certainly has more rules than the
framework's floor, because it names your ecosystem's commands. **Keep all of
them.** Run `framework-install` to add anything the floor has that you do not,
and let it report anything of yours the floor would weaken.

Then move the repository-specific parts of your old hooks into
`.claude/engineering-framework.json`:

- paths your protected-path hook guarded → `protectedPaths`, with the reason
  text you already wrote;
- any policy you deliberately relax → `policy`;
- your canonical commands → `commands`.

The plugin's guard covers the generic verbs across every ecosystem, so most
custom hook code disappears here rather than moving.

---

## Step 7 — Replace your validator

A project-local `.claude` validator mostly checks files that no longer exist.
Two of its ideas are worth keeping, and both have a new home:

| Old check | New home |
|---|---|
| Plugin structure, frontmatter, collisions, read-only agents | The framework's own CI. Delete yours. |
| Permissions floor present, Bash/PowerShell parity, inert file rules | `ef-doctor`, which runs in your repository |
| **Documentation-versus-code symbol drift** | Keep this. It is repository-specific and it is the best check you had. |
| **Hook decision fixtures** | The framework's, for the framework's guard. Keep yours for any hook you still own. |

Keep your validator's drift check wired into your own CI. It is the thing that
stops your `CLAUDE.md` from describing an architecture you no longer have —
which now matters *more*, because the plugin's agents treat that file as
evidence.

---

## Step 8 — Verify

```text
/engineering-framework:framework-doctor
```

Then run one real change end to end:

```text
/engineering-framework:work-item <a small, real requirement>
```

Watch for three things specifically:

1. **Does the context mapper still know your architecture?** It should, from
   `CLAUDE.md` and the code — not from a plugin that was told about it.
2. **Do reviews still cite your specific contracts?** If they went generic,
   something that was repository truth got deleted instead of moved. Find it
   and put it back in `CLAUDE.md`.
3. **Did the gates still stop where they should?**

If (2) fails, that is the migration's characteristic failure mode. It is
recoverable, and the fix is always the same: the knowledge belongs in your
repository, so write it there.

---

## Rollback

Every step is reversible until you delete files. Keep the migration on a
branch, and keep the deletions in their own commit — separate from the
`CLAUDE.md` rewrite — so reverting one does not undo the other.

To disable the framework entirely without uninstalling:

```bash
claude plugin disable engineering-framework@jaylordibe
```
