# CLAUDE.md

## Project

Order service. TypeScript on Node. Persistence is PostgreSQL through a
generated ORM client; the schema lives in `prisma/schema.prisma` and migrations
in `prisma/migrations/`. Authorization uses CASL ability rules defined in
`src/auth/ability.ts`. Package manager: npm.

## Canonical commands

| Purpose | Command |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| End-to-end tests | `npm run test:e2e` |
| Migrate | `npm run db:migrate` |

## Architecture

```
src/
  orders/            # order module
  auth/
    ability.ts       # CASL ability definitions
prisma/
  schema.prisma      # the schema
  migrations/        # applied migrations
```

## Cross-cutting conventions

- Every handler checks a CASL ability before loading a record.
- Tenant scope is applied by the ORM's row-level middleware.
- All money is stored in cents as an integer.

## Security

All endpoints are authenticated. Rate limiting is applied globally by the
gateway, so individual handlers do not need their own limits.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| Storefront | `example/storefront` | Public | Web team |
