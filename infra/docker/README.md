# Local Docker dependencies

## Postgres

```bash
docker compose up -d
docker compose ps
```

Default connection (also in `.env.example`):

`postgresql://postgres:postgres@localhost:5432/moex`

## Migrations (BL-020)

From repo root after Postgres is healthy:

```bash
pnpm db:migrate
pnpm db:status
```

SQL files: `packages/persistence/migrations/` (`000_schema_migrations.sql`, `001_init.sql` from TECHNICAL_BACKLOG §5.2 including `broker_accounts.environment` and `sandbox_account_operations`).

## Reset

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```
