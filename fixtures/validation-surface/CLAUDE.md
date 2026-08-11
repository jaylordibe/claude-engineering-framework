# CLAUDE.md

## Project

A tiny report generator. POSIX shell and plain Node, no dependencies and no
package manager.

## Canonical commands

| Purpose | Command |
|---|---|
| Build | `./scripts/build.sh` |
| Lint | `strictlint --config .strictlint.toml` |
| Unit tests | `./scripts/test.sh` |
| End-to-end tests | `./scripts/e2e.sh` |

There is no type checker in this project.

## Architecture

```
src/
  report.js        # the whole program
scripts/           # the canonical commands above
test/              # unit tests, run by scripts/test.sh
```

## Cross-cutting conventions

- A malformed input row is skipped and counted, never silently dropped.
