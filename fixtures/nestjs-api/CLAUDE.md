# CLAUDE.md

## Project

Decorator-based TypeScript HTTP service. Persistence through a generated ORM
client against a relational database. Package manager: npm.

## Canonical commands

| Purpose | Command |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| End-to-end tests | `npm run test:e2e` |

## Architecture

```
src/
  main.ts            # bootstrap
  orders/            # the only feature module
```

## Cross-cutting conventions

- Every route handler declares exactly one access decorator.
- Responses are built from a response shape, never a persistence record.
- Tenant scope is applied inside the query, not in a guard.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Storefront web app | `example/storefront` | Public | Web team |
