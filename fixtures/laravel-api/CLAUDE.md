# CLAUDE.md

## Project

An HTTP API. PHP 8.5, a full-stack PHP framework, MySQL through the framework's
ORM. OAuth2 bearer tokens for authentication, a role/permission package for
authorization. Redis-backed queues are configured. Dependency manager:
composer.

## Canonical commands

Everything runs inside the `${SERVICE_NAME}-api` container.

| Purpose | Command |
|---|---|
| Install | `composer install` |
| Format check | `php artisan app:format --check` |
| Tests | `php artisan test --parallel` |
| Single test | `./test.sh AppVersionFeatureTest tests/Feature/AppVersionFeatureTest.php` |
| Migration status | `php artisan migrate:status` |

`app:format` is the whole style toolchain; there is no separate linter, and
adding one is a decision nobody has taken.

## Architecture

Every resource follows the same pipeline. `AppVersion` is the reference.

```
routes/api.php
  -> Controller       thin; no business logic, no branching on results
    -> Request        validates, then builds a typed Data object
      -> Service      all business rules; throws BadRequestException on failure
        -> Repository all ORM access; services never build queries
          -> Model    extends BaseModel
  -> Resource         shapes the JSON response
```

There is no `app/Http/Kernel.php`. Routing, middleware and exception rendering
are configured in `bootstrap/app.php`.

## Cross-cutting conventions

- `$fillable` is empty everywhere. Repositories assign attributes explicitly.
- Table names come from `App\Constants\DatabaseTableConstant`, never a literal.
- Models extend `BaseModel`: soft deletes, plus `created_by`/`updated_by`
  stamped from the authenticated session.
- Rate limits are named limiters defined in `AppServiceProvider::boot()` and
  read from config. They are the production floor.
- A route outside the `auth:api` group is public. There is exactly one.

## Consumers

| Consumer | Repository | Audience | Owner |
|---|---|---|---|
| _(none declared yet)_ | | | |
