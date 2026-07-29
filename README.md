# International Trade Website

A production-oriented multilingual public website and merchant CMS built with
Next.js 16, Payload 3, PostgreSQL, S3-compatible object storage and Redis.

## Supported experiences

- Public routes: `/{locale}`, `/{locale}/products/{slug}`,
  `/{locale}/posts` and `/{locale}/posts/{slug}`.
- Locales: English, Spanish, Arabic, German, Hebrew, Korean, Portuguese,
  Simplified Chinese and Traditional Chinese.
- Merchant roles: `owner` and `editor`.
- Product workflow: draft, publish and unlist; homepage ordering lives in the
  separate `homepage` Global.
- Product, article and company translations run as retryable Payload Jobs.
- Public images live in S3-compatible storage. Rate limits and idempotency
  records live in Redis.

## Local development

Use Node 22.17 and pnpm 11.9. Copy `.env.example` to `.env`, then:

```bash
docker compose up -d
pnpm install --frozen-lockfile
pnpm dev
```

The local stack contains PostgreSQL, MinIO and Redis. Start the optional local
translator with:

```bash
docker compose --profile translation up -d
```

Development may use Payload schema push. CI, staging and production must set
`PAYLOAD_DB_PUSH=false` and use migrations.

## Database workflow

```bash
pnpm payload migrate:create descriptive_change_name
pnpm db:status
pnpm db:migrate
```

The checked-in baseline creates the complete PostgreSQL schema from an empty
database. Every later schema change must have a checked-in migration. Never run
application instances with schema push enabled outside local development.

## Legacy import

The importer is read-only unless `--apply` is supplied:

```bash
pnpm data:import -- --source ./international-trade-web.db \
  --media-dir ./public/media --report ./reports/preflight.json
```

Fix every blocking item in the preflight report, freeze old-admin writes and
take backups before applying:

```bash
pnpm data:import -- --apply --send-invites \
  --source ./international-trade-web.db --media-dir ./public/media
```

Use `--skip-invites` only for an explicit staging rehearsal. Production also
requires `IMPORT_PRODUCTION_CONFIRM=IMPORT_SQLITE`. The importer is idempotent:
slugs, emails and media migration checksums are used to update/reuse records.
It never copies legacy password hashes.

## Safe demo data

Demo seed is CLI-only, rejects production and refuses any database whose name
does not contain `demo`:

```bash
SITE_VARIANT=demo DATABASE_URL=postgresql://.../trade_demo pnpm seed:demo
```

It only runs against an empty database and prints a runtime-random one-time
password. There is no public seed route and no fixed demo credential.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test:int
pnpm test:e2e
pnpm build
pnpm audit --prod --audit-level=high
```

Tests refuse databases whose name does not contain `_test`. Each run creates
and removes its own PostgreSQL schema and MinIO bucket. Playwright always starts
its own web server and uses the pinned Chromium version.

## Operations

For a step-by-step Chinese production deployment guide, see
[deployment.zh-CN.md](docs/deployment.zh-CN.md). The detailed operations
runbook for storage configuration, Docker builds, migrations, backups and
rollback is in [operations.md](docs/operations.md). The release gates are in
[acceptance-checklist.md](docs/acceptance-checklist.md), and the permission
matrix is in [permissions.md](docs/permissions.md). The single currently
accepted moderate transitive advisory is documented in
[security-exceptions.md](docs/security-exceptions.md).
