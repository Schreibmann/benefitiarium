# MOEX Trading Platform

Personal research and trading platform for MOEX instruments: market data, analytics, signals, backtesting, and controlled execution via T-Invest API.

> Not investment advice. Automated trading can lose capital. Tests, backtests, and Sandbox success do not prove profitability.

## Docs

- [Technical backlog](docs/TECHNICAL_BACKLOG.md) (v1.1)
- [Roadmap](docs/ROADMAP.md)
- [Status](docs/STATUS.md)
- [Futures history coverage](docs/FUTURES_HISTORY_COVERAGE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Security](docs/SECURITY.md)
- [ADR index](docs/ADR/)

## Prerequisites

- Node.js 22+ (see `.node-version`)
- pnpm 10+
- Docker (for local PostgreSQL)

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Database (BL-020 SQL migrations in `packages/persistence/migrations`):

```bash
docker compose up -d
pnpm db:status
pnpm db:migrate
```

Requires `psql` on `DATABASE_URL`, or Docker Desktop with the compose Postgres service.

Reset local Postgres volume:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

## Monorepo layout

- `apps/` — API, web UI, workers
- `packages/` — shared domain, adapters, engines
- `infra/docker/` — local container notes
- `docs/` — backlog, roadmap, ADR, status

## Current milestone

**M1 — Providers** + E7A sandbox foundation (see `docs/STATUS.md`). Backlog **v1.2**: Sandbox Account Management Service.
