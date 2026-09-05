---
fixture: fixtures/security-surface
graders: [ticket-discipline, efficiency-discipline, scope-discipline]
tags: [ticket, write-ticket, adaptive-depth, widen, contract, multi-turn]
---

/engineering-framework:write-ticket Let admins export a workspace's documents as a file.

<!--
What this case is for — Case E of the adaptive-depth set: the read widens on
a real trigger, and contracts once the human resolves it.

**The first turn has a material uncertainty**, and it is one the code makes
visible: "a workspace's documents" — whose? `CLAUDE.md` says a caller may
only reach documents in their own workspace, `purgeWorkspace` lets an admin
name any workspace in the body (`src/handlers.js:89-90`), and `listDocuments`
honours a client-supplied workspace id (`src/handlers.js:40`). So an admin
export of "a workspace" is either scoped to the admin's own workspace or
crosses the tenancy boundary the way the purge does, and those are materially
different tickets — different criteria, different negatives, different tier.
That is a §2a trigger: the actor's permitted reach is unclear, and choosing
one reading would change security and permissions. A strong first turn says
so, reads exactly the three places above, cites them, drafts the story with
the boundary as a blocking open question, and asks it first. It does not
also ask about file formats, sizes, attachments or what "a file" is, because
none of those changes readiness once the boundary is decided — the format is
the design stage's unless the human makes it contractual.

**The follow-up turn** is a plain message: "Any workspace — admins are
platform staff, not workspace members. The file just needs to open in a
spreadsheet; the format is up to the engineers."

**A strong second turn** turns the answer into a criterion (an admin can
export any workspace's documents) and a negative (a non-admin cannot), keeps
everything the first turn confirmed, records the format as deferred to
design in one line, and does not read anything new — nothing about the
answer requires it. The draft is short, and the readiness line is `Ready`, or
`Not ready` naming one genuinely open thing (what the file must contain per
document is a fair one, if the first turn did not settle it). What it must
not do is keep going: no new read of the attachment path or the store
because the export "touches documents", no fresh question about size limits
or empty workspaces invented to have something to ask.

**A run scores 0.0** for a first turn that picks a scope for the admin
without asking; for a second turn that drops a first-turn criterion or the
non-admin negative; for a criterion naming a file format the human deferred,
a streaming mechanism, or a storage path; or for a second turn that reads
more of the repository than the answer required and cannot say why.
-->
