# CLAUDE.md

## Project

Plain Node HTTP service with no web framework and no database. It receives
webhooks, verifies a signature, and forwards them to a downstream URL. State is
an in-memory map that is deliberately lost on restart.

## Canonical commands

| Purpose | Command |
|---|---|
| Run | `npm start` |
| Tests | `npm test` |

## Non-obvious invariants

- The signature comparison must stay constant-time. It looks like it could be
  simplified to `===`; that reintroduces a timing oracle.
