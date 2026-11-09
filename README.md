# MOEX Trading Platform (MTP[T-broker])

Personal research and trading platform for MOEX instruments: market data, analytics, signals, backtesting, and **controlled** execution via T‑Invest API — with a hard safety path through Sandbox before any live trading.

> Not investment advice. Automated trading can lose capital. Tests, backtests, and Sandbox success do not prove profitability.

## What this project is

A TypeScript monorepo that separates four product contours:

| Contour                | Goal                                                       | Status today                                    |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| **Market data**        | Catalog, candles, provenance, MOEX ISS + T‑Invest adapters | Partial (E1 providers mostly done)              |
| **Research**           | Indicators, strategy versions, exploration UI              | Fibonacci pivots chart UI (5m/1h)               |
| **Signals & backtest** | Reproducible signals + event-driven simulation             | Packages exist as stubs                         |
| **Trading**            | Manual → Sandbox → Paper → guarded Live                    | **Sandbox Admin (E7A) is the working vertical** |

The architectural rule is firm: **exchange data source ≠ broker execution channel**. Strategies talk to ports (`MarketDataProvider`, `BrokerGateway`, `SandboxAccountProvider`), not to SDK DTOs.

## What works now (chart + Fibonacci pivots)

UI slice for **Fibonacci Pivot Points** (not retracement). Spec: [docs/ADR/fibonacci-pivot-points-implementation-spec.md](docs/ADR/fibonacci-pivot-points-implementation-spec.md).

1. Set `TINVEST_READ_ONLY_TOKEN` (or sandbox token) in `.env`.
2. Start API + web (`pnpm --filter @moex/api dev` and `pnpm --filter @moex/web dev`).
3. Open `http://127.0.0.1:5173/charts/NG-12.26`.
4. Switch **5m** (daily reference) / **1h** (weekly reference); levels `P/R1–R3/S1–S3` overlay candles.

API:

| Method | Path                                                                              | Notes                                      |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------------ |
| GET    | `/api/v1/instruments/futures`                                                     | Full futures catalog; near+next per family |
| GET    | `/api/v1/instruments/by-ticker/:ticker`                                           | Resolve T-Invest UID                       |
| GET    | `/api/v1/instruments/:uid/candles?interval=5m\|1h&from=&to=`                      | Chart candles                              |
| GET    | `/api/v1/instruments/:uid/indicators/fibonacci-pivots?timeframe=5m\|1h&from=&to=` | Pivot segments                             |

Pivots are computed **on read** (no persist/workers yet). Signals are not implemented.

## What works now (E7A Sandbox Admin)

You can run a protected **Sandbox Account Management** loop locally:

1. Unlock Admin UI with a server-side bearer token (`ADMIN_API_TOKEN`).
2. Create / sync / fund / close **sandbox** accounts via Admin API.
3. Commands are durable (operation journal + audit + outbox), not fire-and-forget UI calls.
4. Provider writes are **not** executed by the API process — API only enqueues; worker-execution is the write path (composition ready; drain still evolving).
5. Timeouts become `unknown` (no blind retry). Close requires preview + confirmation. Funding cannot withdraw.

### Admin UI routes

- `/admin/sandbox` — overview, create account, sync all
- `/admin/sandbox/accounts` — list / filter
- `/admin/sandbox/accounts/:id` — detail, fund, close preview
- `/admin/sandbox/operations` — operation journal

### Admin API (all require `Authorization: Bearer <ADMIN_API_TOKEN>`)

| Method | Path                                               | Notes                                    |
| ------ | -------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/v1/health`                                   | Public liveness                          |
| GET    | `/api/v1/admin/sandbox/overview`                   | Host, counters, fund policy notes        |
| GET    | `/api/v1/admin/sandbox/accounts`                   | Optional `?status=`                      |
| GET    | `/api/v1/admin/sandbox/accounts/:id`               | Account + portfolio/positions/orders     |
| GET    | `/api/v1/admin/sandbox/operations`                 | Sanitized errors                         |
| GET    | `/api/v1/admin/sandbox/operations/:id`             | Polling target after POST                |
| GET    | `/api/v1/admin/sandbox/accounts/:id/audit`         | Append-only audit trail                  |
| POST   | `/api/v1/admin/sandbox/accounts`                   | Create (needs `Idempotency-Key`) → `202` |
| POST   | `/api/v1/admin/sandbox/sync`                       | Global sync → `202`                      |
| POST   | `/api/v1/admin/sandbox/accounts/:id/sync`          | Account sync → `202`                     |
| POST   | `/api/v1/admin/sandbox/accounts/:id/fund`          | RUB amount as decimal string → `202`     |
| POST   | `/api/v1/admin/sandbox/accounts/:id/close/preview` | Open orders/positions snapshot           |
| POST   | `/api/v1/admin/sandbox/accounts/:id/close`         | Preview + confirmation → `202`           |

Production T‑Invest base URL is refused for Sandbox Admin. Tokens never appear in API responses.

## Docs

- [Technical backlog](docs/TECHNICAL_BACKLOG.md) (**v1.2**)
- [Roadmap](docs/ROADMAP.md)
- [Status](docs/STATUS.md) — source of truth for DONE / TODO
- [Futures history coverage](docs/FUTURES_HISTORY_COVERAGE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Security](docs/SECURITY.md)
- [ADR index](docs/ADR/)

## Prerequisites

- Node.js 22+ (see `.node-version`)
- pnpm 10.20+ (`packageManager` in root `package.json`)
- Docker Desktop (local PostgreSQL)
- Optional: `psql` on PATH (migrations also work via `docker compose exec`)

## Setup

```bash
pnpm install
cp .env.example .env
# edit .env — at minimum set ADMIN_API_TOKEN for Sandbox Admin
docker compose up -d
pnpm db:migrate
```

Important env knobs (see `.env.example`):

| Variable                                                | Purpose                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                                          | Postgres connection                                           |
| `ADMIN_API_TOKEN`                                       | Bearer token for Admin API/UI (empty = admin routes disabled) |
| `SANDBOX_ADMIN_STORE`                                   | `auto` (default) / `memory` / `postgres`                      |
| `TINVEST_SANDBOX_TOKEN`                                 | Live sandbox SDK; empty → fixture provider                    |
| `TINVEST_BASE_URL`                                      | Must stay on sandbox host for Admin                           |
| `TINVEST_READ_ONLY_TOKEN` / `TINVEST_FULL_ACCESS_TOKEN` | Later milestones; never ship to browser                       |

## Run locally

### Quality gate (same spirit as CI)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @moex/web test:e2e   # needs Playwright Chromium
```

DB helpers:

```bash
pnpm db:status
pnpm db:migrate
```

Reset local Postgres volume:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### Dev servers

`apps/api` loads root `.env` via `applyLocalEnvFile()` before `loadEnv`.

```bash
# API (port 3000) + workers + web via turbo
pnpm dev

# or separately:
pnpm --filter @moex/api dev
pnpm --filter @moex/web dev   # Vite on http://127.0.0.1:5173
```

Then open `http://127.0.0.1:5173/admin/sandbox`, paste `ADMIN_API_TOKEN`, unlock.

Without `TINVEST_SANDBOX_TOKEN`, Admin uses an in-process **fixture** sandbox provider (no network). With a sandbox token, it uses the real T‑Invest sandbox SDK (still write-disabled in the API process).

`SANDBOX_ADMIN_STORE=auto` uses Postgres when reachable for journal/audit/outbox; otherwise memory (lost on restart).

## Monorepo layout

### Apps

| App                       | Role                                             |
| ------------------------- | ------------------------------------------------ |
| `apps/api`                | Fastify HTTP + Sandbox Admin routes              |
| `apps/web`                | React/Vite UI including `/admin/sandbox`         |
| `apps/worker-execution`   | Intended sole writer for broker/sandbox commands |
| `apps/worker-market-data` | Market data jobs (scaffold)                      |
| `apps/worker-strategy`    | Strategy worker (scaffold)                       |
| `apps/worker-backtest`    | Backtest worker (scaffold)                       |

### Packages (selected)

| Package                                                                                                   | Role                                                         |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@moex/domain`                                                                                            | Zod-branded domain types (UUID, decimals, sandbox statuses)  |
| `@moex/contracts`                                                                                         | Ports: providers/gateways, enqueue DTOs                      |
| `@moex/decimal`                                                                                           | Decimal arithmetic helpers                                   |
| `@moex/config`                                                                                            | Env schema (`loadEnv`)                                       |
| `@moex/persistence`                                                                                       | SQL migrations, psql/docker `DbClient`, repos, outbox, audit |
| `@moex/sandbox-management`                                                                                | SandboxAccountService, sync, close preview, funding rules    |
| `@moex/broker-tinvest`                                                                                    | T‑Invest SDK adapters + sandbox-only client                  |
| `@moex/marketdata` / `@moex/marketdata-moex-iss`                                                          | Spec versioning + MOEX ISS/AlgoPack path                     |
| `@moex/risk-engine` / `@moex/execution` / `@moex/strategy-engine` / `@moex/backtest` / `@moex/indicators` | Later milestones (stubs / early scaffolding)                 |

## Safety model (short)

- Sandbox endpoint allowlist; production host rejected for Admin.
- API never places sandbox writes itself (`allowProviderWrites: false`).
- Idempotency-Key + request hash; conflict → reject.
- Timeout → operation `unknown`; reconcile before retry.
- Audit log is append-only; secrets redacted before persist.
- Kill switch / live trading flags default **safe** (`GLOBAL_KILL_SWITCH=true`, `LIVE_TRADING_ENABLED=false`).

## Current milestone

**M6 — Manual Sandbox (E7A)** is the active vertical (see `docs/STATUS.md`).  
Earlier: M0 foundation done; M1 providers largely done. Historical import, realtime, signals, paper, and guarded live are still ahead on the roadmap.

## Scripts reference

```bash
pnpm lint          # Biome
pnpm typecheck
pnpm test          # Vitest across packages
pnpm build
pnpm dev
pnpm precommit     # Biome --staged + typecheck (git hook)
pnpm db:migrate
pnpm --filter @moex/web test:e2e
```
