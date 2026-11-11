# Local Docker dependencies / Локальные Docker-зависимости

## Postgres / Postgres

**RU.** Запуск контейнера и проверка статуса:

**EN.** Start the container and check status:

```bash
docker compose up -d
docker compose ps
```

**RU.** Подключение по умолчанию (также в `.env.example`):

**EN.** Default connection (also in `.env.example`):

`postgresql://postgres:postgres@localhost:5432/moex`

## Migrations (BL-020) / Миграции (BL-020)

**RU.** Из корня репозитория после готовности Postgres:

**EN.** From repo root after Postgres is healthy:

```bash
pnpm db:migrate
pnpm db:status
```

**RU.** SQL-файлы: `packages/persistence/migrations/` (`000_schema_migrations.sql`, `001_init.sql` из TECHNICAL_BACKLOG §5.2, включая `broker_accounts.environment` и `sandbox_account_operations`).

**EN.** SQL files: `packages/persistence/migrations/` (`000_schema_migrations.sql`, `001_init.sql` from TECHNICAL_BACKLOG §5.2 including `broker_accounts.environment` and `sandbox_account_operations`).

## Reset / Сброс

**RU.** Полный сброс тома и повторные миграции:

**EN.** Full volume reset and re-run migrations:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```
