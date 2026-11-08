# Local Docker dependencies

Root `docker-compose.yml` starts PostgreSQL 16 for local development.

```bash
docker compose up -d
docker compose ps
docker compose down
# reset data volume
docker compose down -v
```

Database migrations arrive in BL-020 (`pnpm db:migrate`). Until then `pnpm db:migrate` is an explicit no-op stub.
