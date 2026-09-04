# engineering-framework

A stack-agnostic engineering workflow for Claude Code.

```text
Understand → Design → Human approval → Implement → Review → Validate → Present
```

The plugin supplies the methodology. Your `CLAUDE.md` supplies the facts about
your system. Agents cite your code or say `UNKNOWN` — they never guess your
stack.

Requires `jq` on `PATH`.

## Setup

Two independent things must be in place. Confusing them is the usual problem:

| | Lives in | Arrives via |
|---|---|---|
| **The plugin** | `~/.claude/` on your machine | You install it. `git pull` never brings it. |
| **The repository declaration** (`.claude/settings.json`, `CLAUDE.md`) | The repository | `git pull`. One person ran `framework-install`. |

**Install the plugin — once per machine:**

```text
/plugin marketplace add jaylordibe/claude-engineering-framework
/plugin install engineering-framework@jaylordibe
```

Restart, then confirm with `claude plugin list`.

**Set up a repository — once, by one person.** Skip this if someone already did
it here; the declaration arrived with your `git pull`.

```text
/engineering-framework:framework-install
```

It shows every change before writing and never overwrites existing content:

| File | Required? | Purpose |
|---|---|---|
| `CLAUDE.md` | **Yes** | Your canonical commands, high-risk paths, architecture, consumers. Without it every agent infers your stack. |
| `.claude/settings.json` | Recommended | The dependency declaration. Without it, every teammate registers the marketplace by hand. |

Commit both. Verify with `/engineering-framework:framework-doctor`.

**Teammates still run `/plugin install` themselves.** From Claude Code v2.1.195
a plugin enabled only by project settings, sourced from a git repository, does
not load until that person installs it. The declaration makes the install
resolvable and prompt-free; it cannot perform it.

**Updates are automatic.** The installer sets `"autoUpdate": true`, so Claude
Code updates the plugin in the background; the new version loads on your next
launch or after `/reload-plugins`. Use `--no-auto-update` at install time for
controlled adoption. An entry that already states `autoUpdate` is never
rewritten.

## Use

```text
/engineering-framework:work-item <requirement | issue key | issue URL>
```

Runs the whole pipeline and stops exactly twice: to approve the plan, and to
review the diff before you commit.

To write the requirement first:

```text
/engineering-framework:write-ticket <goal, rough notes, or an issue to rewrite>
```

A story, current behaviour cited from your code, observable acceptance
criteria, non-goals and open questions, iterated with you until you say it is
final. No design — that is `work-item`'s job, with your approval.

Or drive it stage by stage:

```text
/engineering-framework:gate-design <requirement>
/engineering-framework:gate-approve
/engineering-framework:gate-implement
/engineering-framework:gate-review
/engineering-framework:gate-validate
```

Diagnostics: `/engineering-framework:framework-doctor`

Every one of these must be typed by a human — each sets
`disable-model-invocation: true`, so Claude cannot invoke a gate or claim one
ran.

**Small changes skip the pipeline.** A comment fix, a rename in one file, a log
line, a one-liner — the framework makes the edit and stops. Risk decides
ceremony in both directions.

## What ships

**13 skills** — the `work-item` conductor, the `write-ticket` writer, five
gates, an installer, a doctor, and four model-invoked domain playbooks (`domain-auth`,
`domain-authorization`, `domain-background-work`, `domain-debugging`).

**8 read-only agents** — `context-mapper`, `architect`, `reviewer`, `security`,
`tester`, `contract`, `data`, `performance`. Read-only is enforced by their tool
pool and asserted in CI.

**Standards and templates** — loaded on demand by the gate that needs them.

**1 hook** — a `SessionStart` charter carrying the workflow, risk tiers and
evidence language. It gates nothing.

## What it does not do

**It ships no permission rules.** It cannot block a command and will not change
how often you are prompted. If you turn on a permission mode, you get that mode.

**`framework-install` writes exactly three keys** into your project's
`.claude/settings.json`: `extraKnownMarketplaces`, `enabledPlugins`, and
`env.CLAUDE_CODE_ENABLE_TODO_TOOLS` (which makes a run's stages appear in the
task panel). Never `permissions`, never `hooks`, never another member of `env`,
never a file outside your repository. Unparseable settings, a conflicting
marketplace name, or a deliberately disabled plugin stop it with a report rather
than a guess.

**It never commits, pushes, merges, deploys or applies migrations.** The gates
prepare the diff and evidence, then hand off.

If your `.claude/settings.json` contains `permissions.defaultMode`, delete it —
project settings override each developer's own, so it cancels the permission
mode they chose. Nothing here reads it.

## Documentation

Architecture, consuming-repository guide, migration guide, development guide and
the Claude Code constraints that shaped this design are in the
[repository](https://github.com/jaylordibe/claude-engineering-framework).

MIT licensed.
