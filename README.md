# MOEX Trading Platform

Personal research and trading platform for MOEX instruments: market data, analytics, signals, backtesting, and controlled execution via T-Invest API.

> Not investment advice. Automated trading can lose capital. Tests, backtests, and Sandbox success do not prove profitability.

## Docs

- [Technical backlog](docs/TECHNICAL_BACKLOG.md)
- [Roadmap](docs/ROADMAP.md)
- [Status](docs/STATUS.md)
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

Database commands (stub until BL-020):

```bash
pnpm db:status
pnpm db:migrate
```

Reset local Postgres volume:

```bash
docker compose down -v
docker compose up -d
```

## Monorepo layout

- `apps/` — API, web UI, workers
- `packages/` — shared domain, adapters, engines
- `infra/docker/` — local container notes
- `docs/` — backlog, roadmap, ADR, status

## Current milestone

**M0 — Foundation** (see `docs/STATUS.md`). Next after M0: EPIC E1 / BL-010 domain model.
