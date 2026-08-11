# CLAUDE.md

## Project

A workspace holding two applications and two shared packages. `apps/api` is a
Node service; `apps/web` is a browser application; `packages/contracts` is the
shape they agree on; `packages/shared` is utility code.

Package manager: npm workspaces at the root. Each package also declares its own
scripts, and they are not the same.

## Canonical commands

| Purpose | Command |
|---|---|
| Tests, everything | `npm test --workspaces` |
| Tests, one package | `npm test --workspace apps/api` |

There is no repository-wide build. Each application builds itself.

## Architecture

```
apps/
  api/               # owns the HTTP surface
  web/               # owns the browser surface
packages/
  contracts/         # the shape both applications agree on
  shared/            # utilities, no domain logic
```

## Cross-cutting conventions

- `packages/contracts` is the only thing both applications import. A change
  there is a change to both, and neither owns it alone.
- An application never imports from another application.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Mobile client | `example/mobile` | Public | Mobile team |

Note that the mobile client consumes `apps/api` directly and does **not** live
in this workspace.
