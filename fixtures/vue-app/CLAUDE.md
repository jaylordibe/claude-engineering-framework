# CLAUDE.md

## Project

Single-page frontend. No server, no database, no background work. All data
comes from the orders API over HTTP. Package manager: npm.

## Canonical commands

| Purpose | Command |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |

## Architecture

```
src/
  main.ts            # mount
  components/        # presentation
  stores/            # client-side state
```

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| _(none — this is a leaf application)_ | | | |
