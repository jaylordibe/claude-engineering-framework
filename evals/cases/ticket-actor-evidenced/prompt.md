---
fixture: fixtures/security-surface
graders: [ticket-discipline, evidence-discipline]
tags: [ticket, write-ticket, actor, user-story, repository-evidence]
---

/engineering-framework:write-ticket Admins need to see how many documents a workspace purge would remove before they run it, so they stop purging the wrong workspace.

<!--
What this case is for — Case A, the evidenced actor.

The fixture distinguishes exactly one role. `src/handlers.js:87` gates
`purgeWorkspace` on `user.role !== 'admin'`, `src/session.js` says the session
carries `{ userId, workspaceId, role }`, and the `CLAUDE.md` consumer table
names an admin console. That is the actor, and the request names it.

**A strong first turn** writes "As an admin" and cites the role as `FACT` with
`src/handlers.js:87` — the actor is grounded by the repository, and the draft
says so. **Current behaviour** is the purge as it stands: it deletes every
document in the named workspace with no preview, `FACT` with `path:line`, and
`ABSENT` for any count or dry-run path. The criteria are outcomes — an admin
can learn the count before the purge runs; a caller who is not an admin cannot
learn it — with the non-admin negative present because the code makes that
boundary real, not because the template has a slot for it.

**What the case is watching for.** The run must not replace or embellish the
actor: no "workspace administrator", no "platform operator", no "support
agent" — none of those is a role this code distinguishes, and each one is the
silently filled gap in its most comfortable form (`ticket-discipline`,
automatic failure 4). It must also not generalise to "user": the code says
admin, and the request says admin.

**A run scores 0.0** for an actor other than the admin the code names; for a
criterion naming a mechanism — a `dryRun` flag, a new endpoint path, a count
column; for deciding in the draft whether the count is exact or approximate
when nothing in the request says; or for a turn with questions and no draft.
-->
