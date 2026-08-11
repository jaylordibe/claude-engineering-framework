# CLAUDE.md

## Project

Internal document service. Plain Node, no framework. Documents belong to a
workspace; a user belongs to exactly one workspace. Storage is an in-process
map standing in for a database. Package manager: npm.

## Canonical commands

| Purpose | Command |
|---|---|
| Tests | `npm test` |

## Architecture

```
src/
  handlers.js      # every endpoint
  store.js         # persistence
  session.js       # who the caller is
```

## Cross-cutting conventions

- A caller may only reach documents in their own workspace.
- A document's `ownerId` is authoritative and set by the server.
- Webhook deliveries from the billing provider are signed.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Admin console | `example/admin` | Internal | Platform |
