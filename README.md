# MOEX Trading Platform (MTP[T-broker]) / Торговая платформа MOEX (MTP[T-broker])

**RU.** Персональная исследовательская и торговая платформа по инструментам MOEX: рыночные данные, аналитика, сигналы, бэктестинг и **контролируемое** исполнение через T‑Invest API — с обязательным безопасным путём через Sandbox до любой live-торговли.

**EN.** Personal research and trading platform for MOEX instruments: market data, analytics, signals, backtesting, and **controlled** execution via T‑Invest API — with a hard safety path through Sandbox before any live trading.

**RU.** > Не инвестиционная рекомендация. Автоматическая торговля может привести к потере капитала. Успех тестов, бэктестов и Sandbox не доказывает прибыльность.

**EN.** > Not investment advice. Automated trading can lose capital. Tests, backtests, and Sandbox success do not prove profitability.

## What this project is / Что это за проект

**RU.** TypeScript-монорепозиторий с четырьмя продуктовыми контурами:

**EN.** A TypeScript monorepo that separates four product contours:

| Contour / Контур       | Goal / Цель                                                | Status today / Статус сейчас                                                                  |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Market data**        | Catalog, candles, provenance, MOEX ISS + T‑Invest adapters | Partial + realtime MVP (`/ws/market-data`, chart auto-live) / Частично + realtime MVP         |
| **Research**           | Indicators, strategy versions, exploration UI              | Fibonacci pivots + chart UX (`1m`/`5m`/`1h`, zoom/pan, futures picker)                        |
| **Signals & backtest** | Reproducible signals + event-driven simulation             | Live alerts + TSE confirm → Telegram forum (Grammy) / Live-алерты + TSE → Telegram forum      |
| **Trading**            | Manual → Sandbox → Paper → guarded Live                    | **Sandbox Admin (E7A) is the working vertical** / **Рабочий вертикаль — Sandbox Admin (E7A)** |

**RU.** Архитектурное правило жёсткое: **источник биржевых данных ≠ канал исполнения у брокера**. Стратегии общаются с портами (`MarketDataProvider`, `BrokerGateway`, `SandboxAccountProvider`), а не с DTO SDK.

**EN.** The architectural rule is firm: **exchange data source ≠ broker execution channel**. Strategies talk to ports (`MarketDataProvider`, `BrokerGateway`, `SandboxAccountProvider`), not to SDK DTOs.

## What works now (chart + Fibonacci pivots) / Что работает сейчас (график + Fibonacci pivots)

**RU.** UI для **Fibonacci Pivot Points** (не retracement) на `/charts/:ticker`: выбор фьючерсов, multi-TF история, zoom/pan и auto-live. Спека: [docs/ADR/fibonacci-pivot-points-implementation-spec.md](docs/ADR/fibonacci-pivot-points-implementation-spec.md). Статус: [docs/STATUS.md](docs/STATUS.md).

**EN.** UI for **Fibonacci Pivot Points** (not retracement) on `/charts/:ticker`, with futures picker, multi-TF history, zoom/pan, and auto-live. Spec: [docs/ADR/fibonacci-pivot-points-implementation-spec.md](docs/ADR/fibonacci-pivot-points-implementation-spec.md). Status: [docs/STATUS.md](docs/STATUS.md).

**RU.**

1. Задайте `TINVEST_READ_ONLY_TOKEN` (или sandbox token) в `.env`.
2. Запустите `pnpm dev` (API + web + `worker-notifier`). Vite проксирует `/api` и `/ws` → `:3000`. Live не стартует сам — только Start в UI.
3. Откройте `http://127.0.0.1:5173/charts` (или `/charts/:ticker`).
4. Выберите фьючерсный контракт: категории (товарные / индексные / валютные / на акции) + family optgroups; каталог cache-first (`nanostores` + API snapshot).
5. Переключайте **`1m` / `5m` / `1h`**; в шапке ticker · name и last close.
6. История через REST; уровни Fibonacci `P/R1–R3/S1–S3` поверх свечей. Session X-scale; wheel zoom / drag pan; **Reset zoom**; viewport сохраняется при смене TF.
7. **Live stream стартует автоматически** для выбранного инструмента (CHART lease). Candle upsert в серию; при REJECTED/error UI откатывается на исторический REST.
8. Маршрут графика code-split; bootstrap без лишнего warm refresh.

**EN.**

1. Set `TINVEST_READ_ONLY_TOKEN` (or sandbox token) in `.env`.
2. Start `pnpm dev` (API + web + `worker-notifier`). Vite proxies `/api` and `/ws` → `:3000`. Live does not auto-start — only UI Start.
3. Open `http://127.0.0.1:5173/charts` (or `/charts/:ticker`).
4. Pick a futures contract: categories (товарные / индексные / валютные / на акции) + family optgroups; catalog is cache-first (`nanostores` + API snapshot).
5. Switch **`1m` / `5m` / `1h`**; header shows ticker · name and last close.
6. History loads via REST; Fibonacci levels `P/R1–R3/S1–S3` overlay candles. Session X-scale; wheel zoom / drag pan; **Reset zoom**; viewport is preserved across TF changes.
7. **Live stream starts automatically** for the selected instrument (CHART lease). Candle upserts into the series; on REJECTED/error the UI falls back to historical REST.
8. Chart route is code-split; bootstrap avoids an extra warm refresh.

**RU.** API:

**EN.** API:

| Method | Path                                                                              | Notes / Примечания                                                                         |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/instruments/futures`                                                     | Full futures catalog; near+next per family / Полный каталог фьючерсов; near+next по family |
| GET    | `/api/v1/instruments/by-ticker/:ticker`                                           | Resolve T-Invest UID / Разрешение T-Invest UID                                             |
| GET    | `/api/v1/instruments/:uid/candles?interval=1m\|5m\|1h&from=&to=`                  | Chart candles / Свечи графика                                                              |
| GET    | `/api/v1/instruments/:uid/indicators/fibonacci-pivots?timeframe=5m\|1h&from=&to=` | Pivot segments / Сегменты pivot                                                            |
| WS     | `/ws/market-data`                                                                 | Realtime candle fan-out (chart auto-live)                                                  |

**RU.** Pivots считаются **on read** (пока без persist/workers). Торговые сигналы Live Mode — отдельно (см. ниже); на графике Fibonacci они ещё не публикуются.

**EN.** Pivots are computed **on read** (no persist/workers yet). Live Mode trading signals are separate (see below); the Fibonacci chart path does not publish them yet.

## What works now (realtime) / Что работает сейчас (realtime)

**RU.** MVP потока свечей для графика: stream manager + registry + WS fan-out + auto-live подписка. Детали: [docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md](docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md). Матрица и пробелы: [docs/STATUS.md](docs/STATUS.md) (M3 / RT-01…).

**EN.** MVP candle stream for the chart: stream manager + registry + WS fan-out + auto-live subscription. Details: [docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md](docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md). Matrix and gaps: [docs/STATUS.md](docs/STATUS.md) (M3 / RT-01…).

**RU.** Пока не сделано: durable DB upsert, gap fill, health endpoints, отдельный worker host.

**EN.** Not done yet: durable DB upsert, gap fill, health endpoints, dedicated worker host.

## How Live Mode and signals work / Как работают Live Mode и сигналы

**RU.** **Live Mode ≠ realtime графика.** График держит эфемерные `CHART` leases через `/ws/market-data` и умирает с вкладкой. Live — независимая backend-сессия `LiveRuntime` с `STRATEGY` leases: анализирует вселенную фьючерсов из избранного T-Invest, пока API-процесс запущен и Live в статусе `RUNNING` / `DEGRADED`. ADR: [docs/ADR/011-independent-live-runtime-shared-stream.md](docs/ADR/011-independent-live-runtime-shared-stream.md).

**EN.** **Live Mode ≠ chart realtime.** The chart holds ephemeral `CHART` leases via `/ws/market-data` and dies with the browser tab. Live is an independent backend `LiveRuntime` session with `STRATEGY` leases: it analyzes the futures universe from T-Invest favorites while the API process is up and Live is `RUNNING` / `DEGRADED`. ADR: [docs/ADR/011-independent-live-runtime-shared-stream.md](docs/ADR/011-independent-live-runtime-shared-stream.md).

### Algorithm / Алгоритм

**RU.** Две дорожки: **live-алерты по незакрытой свече** (Telegram) и **подтверждённый вход по закрытию бара** (TSE → `live_signals`).

1. **Вселенная.** Live читает `GetFavorites` и оставляет **только фьючерсы**. CRUD избранного в API = `405`; правки в приложении T-Invest + `POST /api/v1/favorites/sync`.
2. **Start / stream.** `POST /api/v1/live/start` → `STRATEGY` leases на каждый фьючерс × `5m`. Один `MarketStreamHub` с ref-count (общий с CHART). Лимиты T-Invest: 300 подписок / stream, 100 subscribe/min.
3. **Уровни.** Кэш уровней из Fibonacci pivots + volume profile (POC/VAH/VAL). Без VP алерты/setups работают на fib; для TSE `requireSecondaryFamily` ослабляется.
4. **Lane A — live alerts (`UPDATING`).** На актуальную незакрытую свечу: **APPROACH** (дистанция ≤ 0.15 ATR), **CROSS** (смена стороны уровня или новый span бара). Дедуп `(instrument, level, kind)` ≈ 5 мин. Если ≥ **3 CROSS за 15 мин** → один алерт **`LEVEL_CONSOLIDATION`**, дальше approach/cross по уровню глушатся на 15 мин «тишины». При настроенных `TELEGRAM_*` — atomic `market_signals`+`notifications` (topic **alerts**); outbox `signal.telegram` audit-only.
5. **Lane B — entry confirm (closed bar).** На `CLOSE_EMITTED` / `FINALIZED_BY_SCHEDULE`: история → `buildAnalysisSnapshot` → confluence → `TREND_PULLBACK` / `BREAKOUT_RETEST` → `confirmSignal` → `live_signals` (`buy`/`sell`) + Telegram `entry_confirm` (topic alerts) при `accepted`. Сигнал ≠ ордер (ADR-006).
6. **Telegram delivery.** `worker-notifier` (Grammy) доставляет очередь в forum: **alerts** / **logs** / **errors**. Live start/stop → logs; hard failures → errors. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ALERTS|LOGS|ERRORS`.
7. **Ops.** Dashboard Live: Start / Stop / Sync / Refresh. `LIVE_CANDLE_STREAM_LOG=true` — lifecycle/candle логи.

**EN.** Two lanes: **live alerts on the unclosed candle** (Telegram) and **confirmed entry on bar close** (TSE → `live_signals`).

1. **Universe.** Live reads `GetFavorites` and keeps **futures only**. Favorites CRUD via API is `405`; edit in T-Invest app + `POST /api/v1/favorites/sync`.
2. **Start / stream.** `POST /api/v1/live/start` → `STRATEGY` leases per futures × `5m`. One ref-counted `MarketStreamHub` (shared with CHART). T-Invest limits: 300 subs/stream, 100 subscribe/min.
3. **Levels.** Cache from Fibonacci pivots + volume profile (POC/VAH/VAL). Without VP, alerts/setups use fib; TSE runs with `requireSecondaryFamily` relaxed.
4. **Lane A — live alerts (`UPDATING`).** On the current open bar: **APPROACH** (distance ≤ 0.15 ATR), **CROSS** (side flip or newly spanning range). Dedup `(instrument, level, kind)` ~5 min. If ≥ **3 CROSSes in 15 min** → one **`LEVEL_CONSOLIDATION`** alert, then suppress approach/cross for 15 min quiet. With `TELEGRAM_*` set — atomic `market_signals`+`notifications` (**alerts** topic); outbox `signal.telegram` audit-only.
5. **Lane B — entry confirm (closed bar).** On `CLOSE_EMITTED` / `FINALIZED_BY_SCHEDULE`: history → `buildAnalysisSnapshot` → confluence → `TREND_PULLBACK` / `BREAKOUT_RETEST` → `confirmSignal` → `live_signals` (`buy`/`sell`) + Telegram `entry_confirm` (alerts topic) when accepted. Signal ≠ order (ADR-006).
6. **Telegram delivery.** `worker-notifier` (Grammy) delivers the queue into a forum: **alerts** / **logs** / **errors**. Live start/stop → logs; hard failures → errors. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ALERTS|LOGS|ERRORS`.
7. **Ops.** Dashboard Live: Start / Stop / Sync / Refresh. `LIVE_CANDLE_STREAM_LOG=true` for lifecycle/candle logs.

| Wired now / Уже есть                     | Deferred / Отложено                                    |
| ---------------------------------------- | ------------------------------------------------------ |
| Live alerts + TSE → notifications queue  | Durable setup/alert store across restarts              |
| Grammy forum topics (alerts/logs/errors) | Full MTF context opposition / workers host / autostart |
| Fib + best-effort VP levels              | Broader API/worker ERRORS topic coverage               |

### Live API / Live API

| Method | Path                     | Notes / Примечания                                    |
| ------ | ------------------------ | ----------------------------------------------------- |
| GET    | `/api/v1/live`           | Runtime snapshot / Снимок LiveRuntime                 |
| POST   | `/api/v1/live/start`     | Start Live / Запуск Live                              |
| POST   | `/api/v1/live/stop`      | Stop Live / Остановка Live                            |
| GET    | `/api/v1/favorites`      | Futures-only GetFavorites view / Только фьючерсы      |
| POST   | `/api/v1/favorites/sync` | Re-pull favorites + resync STRATEGY leases if running |

## What works now (E7A Sandbox Admin) / Что работает сейчас (E7A Sandbox Admin)

**RU.** Локально можно прогнать защищённый цикл **Sandbox Account Management**:

**EN.** You can run a protected **Sandbox Account Management** loop locally:

**RU.**

1. Разблокируйте Admin UI серверным bearer token (`ADMIN_API_TOKEN`).
2. Создавайте / синхронизируйте / пополняйте / закрывайте **sandbox**-аккаунты через Admin API.
3. Команды долговечные (operation journal + audit + outbox), не fire-and-forget из UI.
4. Записи провайдера **не** выполняет процесс API — только enqueue; worker-execution — путь записи (composition готов; drain ещё развивается).
5. Таймауты → `unknown` (без слепого retry). Close требует preview + confirmation. Funding не может списывать.

**EN.**

1. Unlock Admin UI with a server-side bearer token (`ADMIN_API_TOKEN`).
2. Create / sync / fund / close **sandbox** accounts via Admin API.
3. Commands are durable (operation journal + audit + outbox), not fire-and-forget UI calls.
4. Provider writes are **not** executed by the API process — API only enqueues; worker-execution is the write path (composition ready; drain still evolving).
5. Timeouts become `unknown` (no blind retry). Close requires preview + confirmation. Funding cannot withdraw.

### Admin UI routes / Маршруты Admin UI

**RU.**

- `/admin/sandbox` — обзор, создание аккаунта, sync all
- `/admin/sandbox/accounts` — список / фильтр
- `/admin/sandbox/accounts/:id` — деталь, fund, close preview
- `/admin/sandbox/operations` — журнал операций

**EN.**

- `/admin/sandbox` — overview, create account, sync all
- `/admin/sandbox/accounts` — list / filter
- `/admin/sandbox/accounts/:id` — detail, fund, close preview
- `/admin/sandbox/operations` — operation journal

### Admin API (all require `Authorization: Bearer <ADMIN_API_TOKEN>`) / Admin API (нужен `Authorization: Bearer <ADMIN_API_TOKEN>`)

| Method | Path                                               | Notes / Примечания                       |
| ------ | -------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/v1/health`                                   | Public liveness / Публичный liveness     |
| GET    | `/api/v1/admin/sandbox/overview`                   | Host, counters, fund policy notes        |
| GET    | `/api/v1/admin/sandbox/accounts`                   | Optional `?status=`                      |
| GET    | `/api/v1/admin/sandbox/accounts/:id`               | Account + portfolio/positions/orders     |
| GET    | `/api/v1/admin/sandbox/operations`                 | Sanitized errors / Очищенные ошибки      |
| GET    | `/api/v1/admin/sandbox/operations/:id`             | Polling target after POST                |
| GET    | `/api/v1/admin/sandbox/accounts/:id/audit`         | Append-only audit trail                  |
| POST   | `/api/v1/admin/sandbox/accounts`                   | Create (needs `Idempotency-Key`) → `202` |
| POST   | `/api/v1/admin/sandbox/sync`                       | Global sync → `202`                      |
| POST   | `/api/v1/admin/sandbox/accounts/:id/sync`          | Account sync → `202`                     |
| POST   | `/api/v1/admin/sandbox/accounts/:id/fund`          | RUB amount as decimal string → `202`     |
| POST   | `/api/v1/admin/sandbox/accounts/:id/close/preview` | Open orders/positions snapshot           |
| POST   | `/api/v1/admin/sandbox/accounts/:id/close`         | Preview + confirmation → `202`           |

**RU.** Production T‑Invest base URL отклоняется для Sandbox Admin. Токены не попадают в ответы API.

**EN.** Production T‑Invest base URL is refused for Sandbox Admin. Tokens never appear in API responses.

## Docs / Документация

**RU.**

- [Язык документации (RU+EN)](docs/DOC_LANGUAGE.md)
- [Technical backlog](docs/TECHNICAL_BACKLOG.md) (**v1.2**)
- [Roadmap](docs/ROADMAP.md)
- [Status](docs/STATUS.md) — источник истины DONE / TODO
- [ADR-011 Independent Live Runtime](docs/ADR/011-independent-live-runtime-shared-stream.md)
- [Futures history coverage](docs/FUTURES_HISTORY_COVERAGE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Security](docs/SECURITY.md)
- [ADR index](docs/ADR/)

**EN.**

- [Documentation language (RU+EN)](docs/DOC_LANGUAGE.md)
- [Technical backlog](docs/TECHNICAL_BACKLOG.md) (**v1.2**)
- [Roadmap](docs/ROADMAP.md)
- [Status](docs/STATUS.md) — source of truth for DONE / TODO
- [ADR-011 Independent Live Runtime](docs/ADR/011-independent-live-runtime-shared-stream.md)
- [Futures history coverage](docs/FUTURES_HISTORY_COVERAGE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Security](docs/SECURITY.md)
- [ADR index](docs/ADR/)

## Prerequisites / Требования

**RU.**

- Node.js 22+ (см. `.node-version`)
- pnpm 10.20+ (`packageManager` в корневом `package.json`)
- Docker Desktop (локальный PostgreSQL)
- Опционально: `psql` в PATH (миграции также через `docker compose exec`)

**EN.**

- Node.js 22+ (see `.node-version`)
- pnpm 10.20+ (`packageManager` in root `package.json`)
- Docker Desktop (local PostgreSQL)
- Optional: `psql` on PATH (migrations also work via `docker compose exec`)

## Setup / Установка

```bash
pnpm install
cp .env.example .env
# edit .env — at minimum set ADMIN_API_TOKEN for Sandbox Admin
docker compose up -d
pnpm db:migrate
```

**RU.** Важные env (см. `.env.example`):

**EN.** Important env knobs (see `.env.example`):

| Variable                                                | Purpose / Назначение                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | Postgres connection / Подключение Postgres                                                                       |
| `ADMIN_API_TOKEN`                                       | Bearer token for Admin API/UI (empty = admin routes disabled) / Bearer для Admin API/UI (пусто = admin отключён) |
| `SANDBOX_ADMIN_STORE`                                   | `auto` (default) / `memory` / `postgres`                                                                         |
| `TINVEST_SANDBOX_TOKEN`                                 | Live sandbox SDK; empty → fixture provider / Пусто → fixture                                                     |
| `TINVEST_BASE_URL`                                      | Must stay on sandbox host for Admin / Только sandbox host                                                        |
| `TINVEST_READ_ONLY_TOKEN` / `TINVEST_FULL_ACCESS_TOKEN` | Later milestones; never ship to browser / Позже; не в browser                                                    |

## Run locally / Локальный запуск

### Quality gate (same spirit as CI) / Quality gate (как в CI)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @moex/web test:e2e   # needs Playwright Chromium
```

**RU.** Помощники по БД:

**EN.** DB helpers:

```bash
pnpm db:status
pnpm db:migrate
```

**RU.** Сброс локального тома Postgres:

**EN.** Reset local Postgres volume:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### Dev servers / Dev-серверы

**RU.** `apps/api` и workers загружают корневой `.env` через `applyLocalEnvFile()` до `loadEnv`. `pnpm dev` поднимает API + web + `worker-notifier` (Telegram). Live Mode **не** стартует с API — только кнопкой Start в UI. Остальные воркеры опциональны.

**EN.** `apps/api` and workers load root `.env` via `applyLocalEnvFile()` before `loadEnv`. `pnpm dev` starts API + web + `worker-notifier` (Telegram). Live Mode does **not** start with the API — only via the UI Start button. Other workers are optional.

```bash
# API (port 3000) + web via turbo (no workers)
pnpm dev

# or separately:
pnpm --filter @moex/api dev
pnpm --filter @moex/web dev   # Vite on http://127.0.0.1:5173

# workers (scaffolds — optional; need DATABASE_URL from .env):
pnpm dev:worker-execution
pnpm dev:worker-market-data
pnpm dev:worker-strategy
pnpm dev:worker-backtest
pnpm dev:workers              # all workers
```

**RU.** Откройте `http://127.0.0.1:5173/admin/sandbox`, вставьте `ADMIN_API_TOKEN`, разблокируйте.

**EN.** Then open `http://127.0.0.1:5173/admin/sandbox`, paste `ADMIN_API_TOKEN`, unlock.

**RU.** Без `TINVEST_SANDBOX_TOKEN` Admin использует in-process **fixture** sandbox provider (без сети). С sandbox token — реальный T‑Invest sandbox SDK (запись в API-процессе всё ещё отключена).

**EN.** Without `TINVEST_SANDBOX_TOKEN`, Admin uses an in-process **fixture** sandbox provider (no network). With a sandbox token, it uses the real T‑Invest sandbox SDK (still write-disabled in the API process).

**RU.** `SANDBOX_ADMIN_STORE=auto` использует Postgres при доступности для journal/audit/outbox; иначе memory (теряется при рестарте).

**EN.** `SANDBOX_ADMIN_STORE=auto` uses Postgres when reachable for journal/audit/outbox; otherwise memory (lost on restart).

## Monorepo layout / Структура монорепозитория

### Apps / Приложения

| App                       | Role / Роль                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/api`                | Fastify HTTP + Sandbox Admin routes                                                           |
| `apps/web`                | React/Vite UI including `/admin/sandbox`                                                      |
| `apps/worker-execution`   | Intended sole writer for broker/sandbox commands / Единственный writer команд брокера/sandbox |
| `apps/worker-market-data` | Market data jobs (scaffold) / Задачи market data (каркас)                                     |
| `apps/worker-strategy`    | Strategy worker (scaffold)                                                                    |
| `apps/worker-backtest`    | Backtest worker (scaffold)                                                                    |

### Packages (selected) / Пакеты (выборочно)

| Package                                                                                                   | Role / Роль                                                     |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `@moex/domain`                                                                                            | Zod-branded domain types (UUID, decimals, sandbox statuses)     |
| `@moex/contracts`                                                                                         | Ports: providers/gateways, enqueue DTOs                         |
| `@moex/decimal`                                                                                           | Decimal arithmetic helpers                                      |
| `@moex/config`                                                                                            | Env schema (`loadEnv`)                                          |
| `@moex/persistence`                                                                                       | SQL migrations, psql/docker `DbClient`, repos, outbox, audit    |
| `@moex/sandbox-management`                                                                                | SandboxAccountService, sync, close preview, funding rules       |
| `@moex/broker-tinvest`                                                                                    | T‑Invest SDK adapters + sandbox-only client                     |
| `@moex/marketdata` / `@moex/marketdata-moex-iss`                                                          | Spec versioning + MOEX ISS/AlgoPack path                        |
| `@moex/risk-engine` / `@moex/execution` / `@moex/strategy-engine` / `@moex/backtest` / `@moex/indicators` | Later milestones (stubs / early scaffolding) / Позже (заглушки) |

## Safety model (short) / Модель безопасности (кратко)

**RU.**

- Sandbox endpoint allowlist; production host отклоняется для Admin.
- API никогда сам не делает sandbox writes (`allowProviderWrites: false`).
- Idempotency-Key + request hash; конфликт → reject.
- Timeout → operation `unknown`; reconcile перед retry.
- Audit log append-only; секреты редиктятся до persist.
- Kill switch / live trading flags по умолчанию **safe** (`GLOBAL_KILL_SWITCH=true`, `LIVE_TRADING_ENABLED=false`).

**EN.**

- Sandbox endpoint allowlist; production host rejected for Admin.
- API never places sandbox writes itself (`allowProviderWrites: false`).
- Idempotency-Key + request hash; conflict → reject.
- Timeout → operation `unknown`; reconcile before retry.
- Audit log is append-only; secrets redacted before persist.
- Kill switch / live trading flags default **safe** (`GLOBAL_KILL_SWITCH=true`, `LIVE_TRADING_ENABLED=false`).

## Current milestone / Текущий milestone

**RU.** **M6 — Manual Sandbox (E7A)** — активный вертикаль (см. `docs/STATUS.md`).  
Ранее: M0 foundation готов; M1 providers в основном готов. Исторический импорт, realtime, сигналы, paper и guarded live — впереди по roadmap.

**EN.** **M6 — Manual Sandbox (E7A)** is the active vertical (see `docs/STATUS.md`).  
Earlier: M0 foundation done; M1 providers largely done. Historical import, realtime, signals, paper, and guarded live are still ahead on the roadmap.

## Scripts reference / Справочник скриптов

```bash
pnpm lint          # Biome
pnpm typecheck
pnpm test          # Vitest across packages
pnpm build
pnpm dev           # API + web + worker-notifier (Live stays stopped until UI Start)
pnpm dev:workers   # all workers (optional)
pnpm dev:worker-execution
pnpm dev:worker-market-data
pnpm dev:worker-strategy
pnpm dev:worker-backtest
pnpm precommit     # Biome --staged + typecheck (git hook)
pnpm db:migrate
pnpm --filter @moex/web test:e2e
```
