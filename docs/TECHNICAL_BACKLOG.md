# MOEX Trading Platform — Technical Backlog & Implementation Blueprint

**Версия:** 1.0  
**Дата:** 8 ноября 2026 г.  
**Базовый документ:** [`ROADMAP.md`](ROADMAP.md)  
**Статус задач:** [`STATUS.md`](STATUS.md)  
**Назначение:** исполняемый backlog для разработки Cursor/AI-агентом и контроля результата человеком.  
**Рекомендуемый стек:** TypeScript, Node.js, React + Vite, Fastify, pnpm workspaces, Turborepo, PostgreSQL, Drizzle ORM, Vitest, Playwright.

> Документ описывает технический план, а не инвестиционную рекомендацию. Автоматическая торговля несёт риск потери капитала. Наличие успешных тестов, backtest или Sandbox не доказывает прибыльность стратегии и не гарантирует исполнение по ожидаемой цене.

---

## 0. Как использовать этот документ

Документ предназначен для последовательной реализации небольшими задачами. Не поручать AI-агенту реализовать весь проект одним запросом. Одна задача backlog = один изолированный change set с тестами, миграциями (если нужны), документацией и понятным результатом.

### Рабочий цикл для Cursor/AI-агента

1. Прочитать этот документ полностью, затем открыть только релевантные разделы и исходные API-контракты.
2. Проверить текущее состояние репозитория: `git status`, структуру каталогов, зависимости, существующие ADR и миграции. Не перезаписывать работающий код ради совпадения со структурой из документа.
3. Выбрать одну задачу по ID, проверить её зависимости и критерии приёмки.
4. До реализации перечислить план изменения файлов, риски и тесты. Если API/SDK контракт не подтверждён документацией или типами установленного пакета — сначала сделать spike/POC, не придумывать сигнатуры.
5. Реализовать только выбранную задачу. Не расширять scope без необходимости.
6. Запустить typecheck, lint, unit/integration tests, проверить миграции и обновить документацию.
7. В ответе сообщить: что сделано, какие файлы изменены, какие проверки запущены и прошли, какие ограничения остались.
8. Не отмечать задачу выполненной, если критерии приёмки не проверены.

### Шаблон запроса для каждой задачи

```text
Работай по задаче <ID> из docs/TECHNICAL_BACKLOG.md.
Статусы обновляй в docs/STATUS.md после проверки критериев приёмки.

Сначала изучи текущую реализацию и зависимости задачи. Не переписывай соседние модули.
Соблюдай архитектурные границы и правила безопасности документа.
Перед изменениями кратко перечисли план и файлы.
Реализуй задачу полностью, добавь/обнови тесты и документацию.
Запусти релевантные проверки. Не имитируй внешние API: используй sandbox, contract fixtures
или явно помеченные test doubles. Не используй реальные торговые токены.
В конце укажи выполненные критерии приёмки, команды проверок и незакрытые вопросы.
Если внешний контракт не подтверждён, остановись на минимальном spike и зафиксируй факт.
```

### Статусы задач

- `TODO` — не начиналась.
- `IN_PROGRESS` — выполняется.
- `BLOCKED` — заблокирована внешним доступом/решением.
- `IN_REVIEW` — код готов, ожидает review.
- `DONE` — все acceptance criteria подтверждены тестами или демонстрацией.

Канонический трекер статусов — [`STATUS.md`](STATUS.md). Не менять статусы только по сообщению агента без проверки CI.

---

## 1. Продуктовая цель и границы MVP

### 1.1. Что строим

Персональную исследовательско-торговую платформу для инструментов MOEX с четырьмя независимыми контурами:

1. **Market Data:** каталог инструментов, исторические свечи, realtime-потоки, контроль качества и происхождения данных.
2. **Research:** графики, индикаторы, features, исследование и версионирование стратегий.
3. **Signals & Backtesting:** воспроизводимые сигналы, event-driven simulation, комиссии и проскальзывание.
4. **Trading:** ручные поручения через брокерский API, затем PAPER/Sandbox и только после прохождения gate — ограниченный LIVE.

### 1.2. Источники и ответственность адаптеров

| Источник | Ответственность | Не использовать для |
|---|---|---|
| T-Invest API | Брокерский каталог и спецификации, доступные брокеру котировки/потоки, счета, позиции, заявки, сделки, Sandbox | Представления его истории как полного архива всей биржи без проверки доступности |
| MOEX ISS | Биржевая структура, режимы торгов, справочники, доступные свечи и исторические данные, независимая сверка | Выставления брокерских поручений |
| Внутреннее хранилище | Каноническая нормализованная модель, provenance, dataset snapshots, аудит | Смешивания данных с разными источниками и разным quality без явного правила |
| Paper broker | Симуляция заявок на realtime feed | Подмены фактического исполнения или оценки ликвидности |

**Важное ограничение:** ISS предоставляет delayed data без соответствующей подписки, а realtime и некоторые исторические наборы зависят от тарифов/прав доступа. До проектирования production ingestion подтвердить права использования и фактическую доступность каждого market/board/data-set. Точный контракт T-Invest SDK сверять с установленной версией пакетов и текущей документацией, не копировать предположительные imports из старых примеров.

### 1.3. В MVP входит

- одна среда backend + одна web-панель;
- каталог акций и фьючерсов;
- нормализованные спецификации и provider ID mapping;
- импорт дневных и доступных минутных свечей;
- идемпотентный backfill с checkpoint и журналом data gaps;
- realtime last price и bar stream минимум для выбранных инструментов;
- график, EMA/RSI/ATR и две простые стратегии;
- воспроизводимый backtest с издержками;
- ручное размещение тестовых заявок в T-Invest Sandbox;
- журнал заявок/сделок и восстановление состояния после рестарта.

### 1.4. Не входит в MVP

- HFT, colocation, прямой MOEX FIX/FAST;
- размещение токена в браузере;
- live-автоторговля;
- полноценный исторический order book/tick replay, если права и источник ещё не подтверждены;
- ML/LLM, которые принимают торговые решения или самостоятельно определяют размер позиции;
- multi-user SaaS, мультиброкерский routing и сложная portfolio optimization.

### 1.5. Основной пользовательский сценарий MVP

1. Пользователь выбирает ликвидную акцию и конкретный контракт фьючерса.
2. Система синхронизирует метаданные и спецификации.
3. Импортирует минимум 12 месяцев дневной истории (если она доступна у источника) и максимально доступную внутридневную историю; фактические границы фиксирует в UI и отчёте.
4. Пользователь открывает график, видит источник, время и качество данных.
5. Движок рассчитывает EMA(20), EMA(50), RSI(14), ATR(14).
6. Стратегия создаёт сигнал с объяснением, сроком действия и ссылками на входные данные.
7. Пользователь запускает backtest на фиксированной версии датасета и стратегии.
8. Пользователь создаёт order preview и подтверждает тестовую заявку в Sandbox.
9. Приложение получает статус/исполнение, сохраняет события и сверяет локальную модель с брокером.

---

## 2. Архитектурные решения (фиксируем до реализации)

### ADR-001. Модульный монолит вместо микросервисов

На старте — один monorepo и несколько независимо запускаемых Node.js процессов. Общая доменная модель и persistence-пакеты разделяются по слоям, но отдельные сервисы/деплойменты выносятся только при измеримой необходимости.

**Причина:** личный проект, один основной разработчик, много предметной логики и высокая цена распределённых транзакций в торговом контуре.

### ADR-002. React SPA + Fastify API

- Frontend: React + TypeScript + Vite; SPA, без SSR на первой версии.
- API: Fastify + schema validation (Zod/TypeBox — выбрать один подход и применять последовательно).
- Realtime UI: WebSocket; SSE допустим для однонаправленных событий, но не смешивать транспортные решения без необходимости.
- Вся брокерская авторизация и write operations — только backend.

### ADR-003. pnpm + Turborepo

- `pnpm-workspace.yaml` — workspace.
- Turborepo — orchestration задач `build`, `lint`, `typecheck`, `test`.
- Единая версия Node LTS, зафиксированная в `.nvmrc`/`.node-version` и CI.
- Версии зависимостей фиксировать lock-файлом. Не использовать плавающие диапазоны для SDK и финансовых библиотек.

### ADR-004. PostgreSQL как источник истины

- PostgreSQL для доменных данных, задач импорта, signals, orders, fills, audit и backtest results.
- Drizzle ORM для типизированного доступа и SQL migrations.
- Критичные запросы/ограничения разрешено писать SQL вручную.
- TimescaleDB не является обязательной зависимостью MVP: сначала измерить объём и latency; затем принять решение об hypertables/retention/compression.
- Для фоновых задач в MVP можно использовать PostgreSQL-backed queue (например, pg-boss). Redis добавлять только при доказанной потребности в fan-out/cache/stream coordination.

### ADR-005. Точные финансовые величины

- Цены, деньги, комиссии, стоимость пункта, маржа и расчёты количества — decimal.
- На границе SDK значения Decimal преобразуются в внутреннее представление через строку/точное десятичное число.
- В PostgreSQL — `NUMERIC`, в API — decimal strings.
- JS `number` допустим только для графических/статистических расчётов, если точность и диапазон осознанно определены; не использовать его как источник истины для ордера или PnL.

### ADR-006. Сигнал не равен поручению

Цепочка строго разделена:

`Market Event → Feature/Indicator → Strategy → Signal → Trade Proposal → Risk Check → Order Command → Broker → Order/Fill Events`.

Strategy Worker не имеет broker write credentials и не может вызвать `PostOrder`. Execution Worker самостоятельно валидирует предложение и режим торговли.

### ADR-007. Запись во внешний broker API — только через durable command workflow

До отправки persist-ить локальный order intent и уникальный `client_order_id`. Для T-Invest передавать этот UID как `order_id` согласно контракту API. Timeout после отправки переводит локальную заявку в `UNKNOWN`; автоматический повтор запрещён до reconciliation. Для всех write-команд — аудит и корреляционный ID.

### ADR-008. Источник и версия данных — часть результата анализа

Каждая свеча несёт provider/source metadata. Backtest привязывается к фиксированному dataset snapshot/revision, strategy version, параметрам и модели издержек. Нельзя тихо смешивать MOEX ISS и T-Invest данные в одном ряду.

### ADR-009. Futures — отдельная предметная модель

Фьючерсный контракт идентифицируется конкретной серией с датой экспирации и исторической спецификацией. Continuous contract — отдельный синтетический ряд для анализа, не исполнимый инструмент. В заявках используется реальный контракт.

---

## 3. Структура monorepo

```text
moex-trading-platform/
├── apps/
│   ├── api/                         # Fastify REST + WebSocket gateway
│   ├── web/                         # React + Vite SPA
│   ├── worker-market-data/          # исторический импорт + realtime feed
│   ├── worker-strategy/             # features, indicators, strategy runtime
│   ├── worker-execution/            # единственный процесс с broker write access
│   └── worker-backtest/             # фоновые воспроизводимые backtest jobs
│
├── packages/
│   ├── domain/                      # сущности, value objects, события, enums
│   ├── contracts/                   # REST/event schemas, DTO, validation
│   ├── config/                      # env/config schemas; no secret values
│   ├── decimal/                     # Decimal wrapper, rounding, tick/lot math
│   ├── broker-tinvest/              # @ttech-pub SDK adapter
│   ├── marketdata-moex-iss/         # MOEX ISS HTTP client + mapping
│   ├── marketdata/                  # canonical models, import, QA, aggregation
│   ├── persistence/                 # Drizzle schema, repositories, migrations
│   ├── indicators/                  # deterministic indicator calculations
│   ├── strategy-engine/              # strategy contracts and runner
│   ├── risk-engine/                  # pre-trade policy and sizing
│   ├── execution/                   # order state machine, commands, reconciliation
│   ├── backtest/                    # event-driven simulator and cost models
│   ├── observability/               # logger, metrics, tracing conventions
│   ├── test-fixtures/                # deterministic market/broker fixtures
│   └── ui-kit/                      # shared UI primitives (only if needed)
│
├── infra/
│   ├── docker/                      # Dockerfiles and local container config
│   ├── grafana/                     # dashboards, later stage
│   └── prometheus/                  # scrape config, later stage
│
├── docs/
│   ├── TECHNICAL_BACKLOG.md         # this document (canonical backlog)
│   ├── ROADMAP.md                   # product/architecture roadmap
│   ├── ADR/                         # architecture decision records
│   ├── API_CONTRACTS.md             # external contract notes + tested examples
│   ├── RUNBOOK.md                   # operational procedures
│   ├── SECURITY.md                  # secrets and trading safety
│   └── STATUS.md                    # current milestone and task state
│
├── BACKLOG.md / ROADMAP.md          # root pointers to docs/*
│
├── .github/workflows/               # or .gitlab-ci.yml, depending on repository
├── .env.example
├── .gitignore
├── .npmrc
├── .node-version
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### 3.1. Dependency rules

Allowed direction:

```text
apps/* → packages/* → domain/contracts
broker-tinvest → domain + contracts + decimal
marketdata-moex-iss → domain + contracts + decimal
strategy-engine → domain + indicators
backtest → domain + indicators + strategy-engine + marketdata
execution → domain + risk-engine + broker port (interface)
risk-engine → domain + decimal
persistence → domain + contracts (must not import apps/* or broker SDK)
```

Forbidden:

- `domain` imports React, Fastify, Drizzle, T-Invest SDK or MOEX HTTP client.
- Strategy imports concrete broker SDK or submits orders.
- Frontend imports broker SDK secret config or direct write client.
- Persistence imports application services.
- Provider-specific DTO leaks into public API or strategy interface.

### 3.2. Package conventions

Each package must expose `src/index.ts` and have scripts `build`, `typecheck`, `test`, `lint` where applicable. Public exports are explicit; avoid deep imports from another package's `src` path. Use workspace dependencies `workspace:*` and avoid circular dependencies.

### 3.3. Root scripts (target)

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "db:generate": "pnpm --filter @moex/persistence db:generate",
    "db:migrate": "pnpm --filter @moex/persistence db:migrate",
    "db:status": "pnpm --filter @moex/persistence db:status"
  }
}
```

Команды адаптировать под реальную структуру пакетов. Не добавлять фиктивные scripts: каждая команда должна реально работать.

---

## 4. Доменные контракты и границы интеграции

### 4.1. Основные value objects

```ts
export type UUID = string & { readonly __brand: 'UUID' };
export type DecimalString = string & { readonly __brand: 'DecimalString' };
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };
export type InstrumentId = UUID;

export type AssetType = 'share' | 'bond' | 'etf' | 'future' | 'currency' | 'index';
export type CandleInterval =
  | '5s' | '10s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m'
  | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w' | '1M';

export type DataProvider = 't-invest' | 'moex-iss' | 'paper' | 'manual-import';

export interface Instrument {
  id: InstrumentId;
  assetType: AssetType;
  ticker: string;
  name: string;
  exchange: 'MOEX';
  currency: string | null;
  isActive: boolean;
}

export interface InstrumentProviderId {
  instrumentId: InstrumentId;
  provider: DataProvider;
  providerInstrumentId: string;
  engine?: string | null;
  market?: string | null;
  board?: string | null;
  secid?: string | null;
  classCode?: string | null;
  isPrimary: boolean;
}

export interface InstrumentSpec {
  instrumentId: InstrumentId;
  validFrom: IsoDateTime;
  validTo: IsoDateTime | null;
  lotSize: number;
  minPriceIncrement: DecimalString;
  priceCurrency: string | null;
  priceType: 'currency' | 'points' | 'percent';
  contractMultiplier: DecimalString | null;
  expirationAt: IsoDateTime | null;
  marginInitial: DecimalString | null;
  raw: Record<string, unknown>;
}

export interface Candle {
  instrumentId: InstrumentId;
  provider: DataProvider;
  interval: CandleInterval;
  timeStart: IsoDateTime;
  timeEnd: IsoDateTime;
  open: DecimalString;
  high: DecimalString;
  low: DecimalString;
  close: DecimalString;
  volume: DecimalString;
  volumeUnit: 'lots' | 'contracts' | 'shares' | 'currency' | 'unknown';
  turnover: DecimalString | null;
  isClosed: boolean;
  quality: 'good' | 'delayed' | 'incomplete' | 'suspect';
  sourceRevision: string | null;
}

export interface MarketDataContext {
  provider: DataProvider;
  receivedAt: IsoDateTime;
  eventTime: IsoDateTime;
  isDelayed: boolean;
  isStale: boolean;
  correlationId: string;
}
```

**Контракт:** decimal в API и persistence всегда сериализуется строкой. `timeStart` / `timeEnd` — ISO 8601 UTC. В UI timezone отображения — `Europe/Moscow`; источник времени не должен зависеть от локальной timezone сервера.

### 4.2. Port interfaces

```ts
export interface HistoricalMarketDataProvider {
  getCandles(input: {
    instrumentId: InstrumentId;
    interval: CandleInterval;
    from: Date;
    to: Date;
    cursor?: string;
  }): Promise<{ items: Candle[]; nextCursor?: string }>;
}

export interface MarketDataProvider extends HistoricalMarketDataProvider {
  getInstrumentCatalog(): Promise<ProviderInstrument[]>;
  getInstrumentSpec(providerInstrumentId: string): Promise<InstrumentSpecInput>;
  getLastPrices(instrumentIds: InstrumentId[]): Promise<LastPrice[]>;
}

export interface BrokerGateway {
  listAccounts(): Promise<BrokerAccount[]>;
  getPositions(accountId: string): Promise<BrokerPosition[]>;
  getOrders(accountId: string): Promise<BrokerOrder[]>;
  getOrderState(accountId: string, brokerOrderId: string): Promise<BrokerOrder>;
  placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderResult>;
  cancelOrder(command: CancelOrderCommand): Promise<CancelOrderResult>;
  replaceOrder(command: ReplaceOrderCommand): Promise<ReplaceOrderResult>;
  // Streams exposed through separately typed observable/event interfaces.
}
```

Это внутренние интерфейсы, не обещание точных сигнатур конкретной версии `invest-js`. Адаптер обязан преобразовать реальные protobuf/SDK response types в доменные типы и покрыть mapping tests.

### 4.3. Принципы идентификации

- Внутренний UUID `instrument_id` — основной ключ системы.
- T-Invest `instrument_uid` — актуальный брокерский идентификатор; FIGI держать только для совместимости, если он ещё встречается в API/старых данных.
- MOEX ISS — составной контекст `engine + market + board + SECID`.
- Тикер сам по себе не уникален и не является FK.
- Смена лота, шага цены, экспирации, множителя или валюты создаёт новую строку `instrument_specs` с временной валидностью, а не перезаписывает историю.

---

## 5. PostgreSQL schema blueprint

Ниже — логическая схема и базовые DDL-фрагменты. Реальные миграции нужно разделить на несколько файлов, проверить под выбранную версию PostgreSQL и дополнить FK/constraints. Не создавать все таблицы одним огромным миграционным файлом.

### 5.1. Обязательные таблицы

| Таблица | Назначение | Ключевые ограничения |
|---|---|---|
| `instruments` | Внутренний каталог | UUID PK; ticker не unique глобально |
| `instrument_provider_ids` | Mapping UID/FIGI/SECID/board | unique(provider, provider_instrument_id); unique provider + exchange context |
| `instrument_specs` | История спецификаций | valid_from/valid_to; проверка непересекающихся интервалов в service/migration |
| `trading_sessions` | Календарь торговых сессий | market/board + session date + session type |
| `candles` | OHLCV от отдельных провайдеров | unique(instrument, provider, interval, time_start) |
| `data_gaps` | Обнаруженные пропуски | уникальный открытый gap по instrument/provider/interval/range |
| `history_import_jobs` | Задачи загрузки истории | checkpoint/cursor; resume-safe |
| `dataset_versions` | Фиксация состава данных для исследований | immutable metadata/hash и watermark |
| `strategies` | Логическая стратегия | stable ID |
| `strategy_versions` | Версия кода/конфига стратегии | immutable version + code hash |
| `strategy_runs` | Запуск стратегии на данных | version + dataset + parameters |
| `signals` | Сигналы и их lifecycle | dedupe key; valid_until |
| `trade_proposals` | Предложение к исполнению | ссылка на signal; status |
| `broker_accounts` | Счета брокера | provider account ID unique |
| `account_snapshots` | Периодический snapshot денег/маржи | account + timestamp |
| `position_snapshots` | Состояние позиций на момент времени | account + instrument + timestamp |
| `orders` | Локальный lifecycle заявки | unique client_order_id; broker order ID index |
| `order_events` | Append-only история состояний | event ID unique; received_at |
| `fills` | Исполненные сделки/частичные fills | unique broker execution ID при наличии |
| `risk_policies` | Лимиты для account/strategy/instrument | immutable revisions |
| `automation_sessions` | Текущий/исторический режим автоторговли | explicit mode + enabled flag |
| `audit_log` | Критичные команды и решения | append-only, actor + action + correlation ID |
| `backtest_runs` | Результат прогона | immutable config + dataset + strategy version |
| `backtest_trades` | Сделки симулятора | FK backtest run |
| `backtest_equity_points` | Equity curve | run + timestamp |
| `outbox_events` | Надёжная доставка внутренних событий | event ID unique; published_at |

### 5.2. SQL — базовый каркас

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('share','bond','etf','future','currency','index')),
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'MOEX',
  currency CHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX instruments_ticker_idx ON instruments (ticker);
CREATE INDEX instruments_asset_type_idx ON instruments (asset_type, is_active);

CREATE TABLE instrument_provider_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL CHECK (provider IN ('t-invest','moex-iss','manual-import')),
  provider_instrument_id TEXT NOT NULL,
  engine TEXT,
  market TEXT,
  board TEXT,
  secid TEXT,
  class_code TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_instrument_id)
);
CREATE INDEX instrument_provider_context_idx
  ON instrument_provider_ids (provider, engine, market, board, secid);
CREATE INDEX instrument_provider_instrument_idx
  ON instrument_provider_ids (instrument_id, provider);

CREATE TABLE instrument_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  lot_size INTEGER NOT NULL CHECK (lot_size > 0),
  min_price_increment NUMERIC(28, 12) NOT NULL CHECK (min_price_increment > 0),
  price_currency CHAR(3),
  price_type TEXT NOT NULL CHECK (price_type IN ('currency','points','percent')),
  contract_multiplier NUMERIC(28, 12),
  expiration_at TIMESTAMPTZ,
  margin_initial NUMERIC(28, 12),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX instrument_specs_lookup_idx
  ON instrument_specs (instrument_id, valid_from DESC);

CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL DEFAULT 'MOEX',
  engine TEXT,
  market TEXT,
  board TEXT,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled','open','closed','suspended','unknown')),
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (closes_at > opens_at),
  UNIQUE (exchange, engine, market, board, session_date, session_type)
);
CREATE INDEX trading_sessions_lookup_idx
  ON trading_sessions (session_date, engine, market, board);

CREATE TABLE candles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL CHECK (provider IN ('t-invest','moex-iss','manual-import')),
  interval_code TEXT NOT NULL,
  time_start TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ NOT NULL,
  open NUMERIC(28, 12) NOT NULL,
  high NUMERIC(28, 12) NOT NULL,
  low NUMERIC(28, 12) NOT NULL,
  close NUMERIC(28, 12) NOT NULL,
  volume NUMERIC(28, 8) NOT NULL DEFAULT 0 CHECK (volume >= 0),
  volume_unit TEXT NOT NULL DEFAULT 'unknown',
  turnover NUMERIC(28, 8),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  quality TEXT NOT NULL DEFAULT 'good'
    CHECK (quality IN ('good','delayed','incomplete','suspect')),
  source_revision TEXT,
  raw_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (time_end > time_start),
  CHECK (low <= high AND low <= open AND low <= close AND high >= open AND high >= close),
  UNIQUE (instrument_id, provider, interval_code, time_start)
);
CREATE INDEX candles_query_idx
  ON candles (instrument_id, interval_code, time_start DESC);
CREATE INDEX candles_provider_query_idx
  ON candles (provider, instrument_id, interval_code, time_start DESC);

CREATE TABLE history_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  interval_code TEXT NOT NULL,
  requested_from TIMESTAMPTZ NOT NULL,
  requested_to TIMESTAMPTZ NOT NULL,
  cursor JSONB,
  checkpoint_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','partial','failed','cancelled')),
  rows_received BIGINT NOT NULL DEFAULT 0,
  rows_inserted BIGINT NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requested_to > requested_from)
);
CREATE INDEX history_import_jobs_status_idx ON history_import_jobs (status, created_at);

CREATE TABLE data_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL,
  interval_code TEXT NOT NULL,
  gap_from TIMESTAMPTZ NOT NULL,
  gap_to TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','accepted_non_trading')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CHECK (gap_to > gap_from)
);
CREATE INDEX data_gaps_open_idx ON data_gaps (instrument_id, interval_code, gap_from)
  WHERE status = 'open';

CREATE TABLE dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_policy JSONB NOT NULL,
  instrument_ids UUID[] NOT NULL,
  intervals TEXT[] NOT NULL,
  from_at TIMESTAMPTZ NOT NULL,
  to_at TIMESTAMPTZ NOT NULL,
  source_watermarks JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (to_at > from_at)
);

CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  version TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  config_schema JSONB NOT NULL,
  default_config JSONB NOT NULL,
  entrypoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, version)
);
CREATE TABLE strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  dataset_version_id UUID NOT NULL REFERENCES dataset_versions(id),
  parameters JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result_summary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  interval_code TEXT NOT NULL,
  event_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy','sell','close','hold')),
  status TEXT NOT NULL CHECK (status IN ('new','accepted','rejected','expired','executed','invalidated')),
  reference_price NUMERIC(28, 12) NOT NULL,
  entry_min NUMERIC(28, 12),
  entry_max NUMERIC(28, 12),
  stop_loss NUMERIC(28, 12),
  take_profit JSONB,
  confidence NUMERIC(8, 6),
  reasons JSONB NOT NULL,
  features JSONB NOT NULL,
  data_quality TEXT NOT NULL,
  source_event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  UNIQUE (strategy_version_id, instrument_id, interval_code, event_key)
);
CREATE INDEX signals_feed_idx ON signals (created_at DESC, status);

CREATE TABLE trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signals(id),
  account_id UUID NOT NULL,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('limit','market','best_price','stop')),
  quantity_lots INTEGER NOT NULL CHECK (quantity_lots > 0),
  limit_price NUMERIC(28, 12),
  stop_price NUMERIC(28, 12),
  estimated_risk NUMERIC(28, 8),
  risk_snapshot JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','rejected','expired','submitted')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broker_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 't-invest',
  provider_account_id TEXT NOT NULL,
  account_type TEXT,
  currency CHAR(3),
  is_sandbox BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  UNIQUE (provider, provider_account_id)
);
ALTER TABLE trade_proposals
  ADD CONSTRAINT trade_proposals_account_fk
  FOREIGN KEY (account_id) REFERENCES broker_accounts(id);

CREATE TABLE account_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  captured_at TIMESTAMPTZ NOT NULL,
  currency CHAR(3) NOT NULL,
  total_value NUMERIC(28, 8),
  cash NUMERIC(28, 8),
  blocked NUMERIC(28, 8),
  margin_used NUMERIC(28, 8),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX account_snapshots_latest_idx ON account_snapshots (account_id, captured_at DESC);

CREATE TABLE position_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  captured_at TIMESTAMPTZ NOT NULL,
  quantity NUMERIC(28, 8) NOT NULL,
  average_price NUMERIC(28, 12),
  current_price NUMERIC(28, 12),
  unrealized_pnl NUMERIC(28, 8),
  currency CHAR(3),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX position_snapshots_latest_idx
  ON position_snapshots (account_id, instrument_id, captured_at DESC);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  proposal_id UUID REFERENCES trade_proposals(id),
  client_order_id UUID NOT NULL UNIQUE,
  broker_order_id TEXT,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  order_type TEXT NOT NULL,
  quantity_lots INTEGER NOT NULL CHECK (quantity_lots > 0),
  limit_price NUMERIC(28, 12),
  status TEXT NOT NULL CHECK (status IN (
    'created','submitting','unknown','new','active','partially_filled',
    'cancel_pending','filled','cancelled','rejected','expired'
  )),
  mode TEXT NOT NULL CHECK (mode IN ('manual','paper','sandbox','live_guarded','live')),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_last_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (account_id, broker_order_id)
);
CREATE INDEX orders_account_status_idx ON orders (account_id, status, updated_at DESC);
CREATE INDEX orders_instrument_idx ON orders (instrument_id, submitted_at DESC);

CREATE TABLE order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  event_time TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX order_events_order_time_idx ON order_events (order_id, received_at);

CREATE TABLE fills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  broker_execution_id TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  quantity_lots NUMERIC(28, 8) NOT NULL,
  price NUMERIC(28, 12) NOT NULL,
  commission NUMERIC(28, 8),
  currency CHAR(3),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX fills_order_execution_unique_idx
  ON fills (order_id, broker_execution_id) WHERE broker_execution_id IS NOT NULL;

CREATE TABLE risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global','account','strategy','instrument')),
  scope_id TEXT,
  version INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limits JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, version)
);
CREATE TABLE automation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  mode TEXT NOT NULL CHECK (mode IN ('research','manual','paper','sandbox','live_guarded','live')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_strategies UUID[] NOT NULL DEFAULT '{}',
  allowed_instruments UUID[] NOT NULL DEFAULT '{}',
  risk_policy_id UUID REFERENCES risk_policies(id),
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  correlation_id TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_target_idx ON audit_log (target_type, target_id, created_at DESC);
CREATE INDEX audit_log_correlation_idx ON audit_log (correlation_id);

CREATE TABLE backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  dataset_version_id UUID NOT NULL REFERENCES dataset_versions(id),
  parameters JSONB NOT NULL,
  cost_model JSONB NOT NULL,
  execution_model JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metrics JSONB,
  result_hash TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE backtest_trades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  side TEXT NOT NULL,
  quantity_lots NUMERIC(28, 8) NOT NULL,
  entry_price NUMERIC(28, 12) NOT NULL,
  exit_price NUMERIC(28, 12),
  gross_pnl NUMERIC(28, 8),
  fees NUMERIC(28, 8),
  slippage NUMERIC(28, 8),
  net_pnl NUMERIC(28, 8)
);
CREATE TABLE backtest_equity_points (
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id),
  event_time TIMESTAMPTZ NOT NULL,
  equity NUMERIC(28, 8) NOT NULL,
  drawdown NUMERIC(12, 8) NOT NULL,
  PRIMARY KEY (backtest_run_id, event_time)
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX outbox_pending_idx ON outbox_events (created_at)
  WHERE published_at IS NULL;
```

### 5.3. Schema design notes

1. **`candles` unique key includes provider.** Это позволяет хранить разные версии одного периода от ISS и T-Invest и сравнивать расхождения. Канонический источник выбирается политикой dataset, а не потерей исходной записи.
2. **Таблицы истории неизменяемы по смыслу.** Исправление свечи обновляет provider-specific row только по явному reconciliation, меняет `updated_at/raw_hash`, а версия dataset фиксирует использованные watermark/hash.
3. **Большие временные таблицы партиционировать после измерения.** Для PostgreSQL declarative partitioning ключ должен соответствовать уникальным ограничениям; при TimescaleDB проверить ограничения hypertable/composite primary key.
4. **Не использовать `NUMERIC` для количества миллисекунд или простых счётчиков.** Numeric нужен финансовым значениям; временные поля — `TIMESTAMPTZ`, счётчики — integer/bigint.
5. **История позиций — snapshots, не mutable truth.** Операции и fills используются для восстановления ledger; брокерский snapshot — сверка внешнего состояния.
6. **JSONB только для provider raw payload/config metadata.** Основные поля, по которым фильтруют/сортируют/связывают данные, должны быть нормализованы.
7. **Статусы и переходы валидировать в application layer + тестах.** CHECK constraint защищает от неизвестных статусов, но не заменяет полноценную state machine.
8. **UUID заявки формировать до вызова брокера.** `client_order_id` генерируется один раз и не меняется при retry/reconciliation.
9. **Не хранить API token в БД.** Секреты берутся из secret store / environment, а в audit сохраняются только безопасные метаданные.
10. **Migrations — append-only.** Исправления — новая миграция; destructive migration требует backup, review и отдельного согласования.

### 5.4. Дополнительные таблицы, отложенные до появления функции

- `raw_market_events` — сырой поток trades/orderbook, если появится задача микроструктурного анализа.
- `continuous_futures` / `futures_roll_events` — синтетические ряды и roll mapping.
- `corporate_actions` — дивиденды, сплиты и иные корректировки исторических акций.
- `notifications` — Telegram/email/push delivery queue.
- `users`, `sessions`, `api_keys` — только если продукт становится multi-user.

---

## 6. Внутренний API приложения

Контракт API — собственный, не проксирование protobuf. Все ответы проходят runtime validation. Decimal возвращаются строками, время — UTC ISO 8601. Ошибки имеют стабильный `code`, человекочитаемый `message`, `correlationId`.

### 6.1. Read endpoints

| Method | Route | Назначение |
|---|---|---|
| GET | `/api/v1/health` | liveness/readiness без секретов |
| GET | `/api/v1/instruments` | фильтр каталога, asset type, active |
| GET | `/api/v1/instruments/:id` | карточка и актуальная спецификация |
| GET | `/api/v1/instruments/:id/specs` | история спецификаций |
| GET | `/api/v1/market/:id/candles` | candles; interval/from/to/provider |
| GET | `/api/v1/market/:id/last` | последняя цена + receivedAt + age |
| GET | `/api/v1/market/:id/orderbook` | стакан с timestamp/quality |
| GET | `/api/v1/signals` | лента сигналов с фильтрами |
| GET | `/api/v1/signals/:id` | сигнал + объяснение + inputs metadata |
| GET | `/api/v1/strategies` | список стратегий и versions |
| GET | `/api/v1/backtests/:id` | статус и метрики backtest |
| GET | `/api/v1/trading/accounts` | broker accounts без токенов |
| GET | `/api/v1/trading/positions` | positions snapshot |
| GET | `/api/v1/trading/orders` | журнал заявок |
| GET | `/api/v1/system/data-health` | stream state, gaps, freshness |
| GET | `/api/v1/automation/status` | текущий mode, enabled, kill switch |

### 6.2. Command endpoints

| Method | Route | Условия |
|---|---|---|
| POST | `/api/v1/data/imports` | админ/локальный пользователь; async job |
| POST | `/api/v1/strategies/:id/backtests` | immutable config + dataset ID |
| POST | `/api/v1/signals/:id/accept` | создаёт Trade Proposal, не Order |
| POST | `/api/v1/signals/:id/reject` | audit reason |
| POST | `/api/v1/trading/order-preview` | без broker write side effects |
| POST | `/api/v1/trading/orders` | MANUAL mode, явное confirm token, повторная server-side risk validation |
| POST | `/api/v1/trading/orders/:id/cancel` | проверка ownership/status и audit |
| POST | `/api/v1/trading/orders/:id/replace` | preview новой цены/количества, audit |
| POST | `/api/v1/automation/mode` | только разрешённые transitions, подтверждение режима |
| POST | `/api/v1/automation/kill-switch` | аварийная операция; backend-enforced |

### 6.3. Order confirmation

Order Preview должен возвращать `previewId`, `expiresAt`, `instrumentSpecVersion`, `quoteTimestamp`, `dataAgeMs`, нормализованные цену/лотность/оценочные издержки и список risk checks. Подтверждение ссылается на `previewId`; backend повторно проверяет, что цена/спецификация/лимиты не изменились за время preview. Не принимать сумму из браузера как authoritative input.

### 6.4. WebSocket events

Минимальные типы:

- `market.last_price.updated`
- `market.candle.updated`
- `market.data_health.changed`
- `signal.created`, `signal.updated`
- `order.updated`, `trade.executed`
- `portfolio.position.updated`
- `automation.state.changed`

События содержат `eventId`, `occurredAt`, `correlationId`, `schemaVersion`, `payload`. Повторная доставка допустима; UI и backend consumers должны обрабатывать дубликаты безопасно.

---

## 7. Полный технический backlog

**Оценка:** S = до 0.5 рабочего дня, M = 1–2 дня, L = 3–5 дней, XL = больше 5 дней / разбить на subtasks. Оценка относится к реализации и тестам одним разработчиком, не включает ожидание внешних доступов и review. Не считать календарным обещанием.

Приоритеты: `P0` — блокирует MVP/безопасность; `P1` — MVP feature; `P2` — после MVP; `P3` — исследовательское расширение.

### EPIC E0 — Repository foundation & engineering standards

**Результат:** репозиторий воспроизводимо устанавливается, собирается и проверяется в CI.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-001 | P0 / M | Создать pnpm monorepo и Turborepo | — | `pnpm install` проходит с lockfile; workspace видит все пакеты; root scripts `build/typecheck/lint/test` работают; CI повторяет эти команды |
| BL-002 | P0 / M | Зафиксировать TypeScript и code style | BL-001 | `strict: true`; единые ESLint/Prettier правила; нет неявных `any` в production packages; форматирование проверяется CI |
| BL-003 | P0 / M | Создать skeleton apps/packages | BL-001 | Созданы пустые entrypoints для API/web/worker процессов и базовых packages; нет circular deps; package exports работают |
| BL-004 | P0 / S | Валидация конфигурации и `.env.example` | BL-001 | Zod/TypeBox schema валидирует обязательные env; приложение падает с понятной ошибкой при пропущенном ключе; секреты не коммитятся; `.env.example` не содержит реальных значений |
| BL-005 | P0 / M | Local Docker Compose | BL-001, BL-004 | `docker compose up` поднимает PostgreSQL и локальные зависимости; healthchecks работают; данные сохраняются в volume; README содержит команды reset/migrate |
| BL-006 | P0 / M | CI pipeline | BL-001–BL-005 | PR pipeline запускает install, lint, typecheck, tests, build; миграции проверяются на чистой БД; секреты CI не печатаются в лог |
| BL-007 | P0 / S | Документы ADR и STATUS | BL-001 | Созданы ADR-001…ADR-009 (или зафиксированы решения/отклонения); STATUS содержит выбранный milestone и активную задачу |

### EPIC E1 — Domain model & provider adapters

**Результат:** внутренние сущности не зависят от структур SDK или MOEX ISS.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-010 | P0 / M | Реализовать domain value objects | BL-003 | Есть Instrument, InstrumentSpec, Candle, Quote, Order, Fill, Signal; decimal/time/id типы валидируются; unit tests на граничные значения |
| BL-011 | P0 / M | Реализовать decimal package | BL-010 | Есть parse/format/compare/add/multiply/divide/roundToTick/quantityToLots; нет арифметики `number` для денег/цен; тесты на дробные тики и округление |
| BL-012 | P0 / M | Определить порты MarketDataProvider и BrokerGateway | BL-010 | Контракты не импортируют SDK; mocks можно реализовать в тестах; methods documented; отсутствие provider type leakage подтверждается dependency check |
| BL-013 | P0 / L | Сделать T-Invest Node SDK spike | BL-012 | Отдельная команда/тест подключается к Sandbox и получает accounts, instrument metadata, candles и market stream; зафиксирована версия пакетов и runtime requirements; raw SDK types не выходят из адаптера |
| BL-014 | P0 / L | Реализовать `broker-tinvest` adapter | BL-013 | Реализованы list accounts, search instruments, get specs, get candles/last price, positions/orders reads; contract tests фиксируют преобразования; токен только server-side |
| BL-015 | P0 / L | Реализовать `marketdata-moex-iss` HTTP client | BL-012 | Timeout, abort, retry policy для GET, pagination, `columns` mapping, response validation; unit tests на fixtures; логирование без персональных данных |
| BL-016 | P0 / L | Инструментальный каталог и cross-provider mapping | BL-014, BL-015 | На выбранных акциях/фьючерсах связаны внутренний UUID, broker UID и ISS engine/market/board/SECID; неоднозначные тикеры не мапятся автоматически; неразрешённые пары показываются как unmatched |
| BL-017 | P0 / M | Версионирование спецификаций | BL-010, BL-016 | Изменение lot/tick/multiplier/expiry создаёт новую запись; историческая спецификация выбирается по `valid_from/valid_to`; unit tests на границах периода |
| BL-018 | P1 / M | Trading schedule adapter | BL-014, BL-015 | Для инструмента можно определить открытый/закрытый режим и торговую сессию; отсутствие данных трактуется как UNKNOWN, а не OPEN |

### EPIC E2 — Persistence & data governance

**Результат:** надёжное хранилище, миграции, происхождение и аудит.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-020 | P0 / L | Создать PostgreSQL migrations v1 | BL-005, BL-010 | Таблицы каталога, specs, candles, jobs, gaps, signals, orders, fills, audit, backtest существуют; FK/check/unique constraints включены; миграции применяются на пустой БД |
| BL-021 | P0 / M | Создать repositories | BL-020 | Для основных сущностей есть интерфейсы и PostgreSQL реализации; домен не зависит от Drizzle; transaction boundary документирован |
| BL-022 | P0 / M | Реализовать transaction outbox | BL-020, BL-021 | Событие и изменение агрегата пишутся одной транзакцией; publisher повторяет отправку; повторная доставка не порождает дубликат по `eventId` |
| BL-023 | P0 / M | Реализовать audit log service | BL-020 | Критичные команды пишут actor/action/target/correlation/result; update/delete audit запрещены для application DB role; secrets redacted |
| BL-024 | P1 / M | Dataset versioning | BL-020, BL-021 | Backtest dataset фиксирует provider policy, диапазон, интервалы, instrument set, watermark/hash; повторный запуск использует тот же набор данных или явно сообщает об изменении |
| BL-025 | P1 / M | Retention, backup и restore procedure | BL-020 | Проверенный backup/restore runbook; восстановление проходит на чистом окружении; секреты не попадают в dump без необходимости |

### EPIC E3 — Historical market data pipeline

**Результат:** повторяемая загрузка истории, продолжение после рестарта и прозрачные пропуски.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-030 | P0 / M | Candle canonicalization | BL-010, BL-020 | Одинаковый mapping timestamp/volume/price для обоих provider; unit tests на timezone, volume unit, закрытую/открытую свечу |
| BL-031 | P0 / L | T-Invest GetCandles importer | BL-014, BL-020, BL-030 | Импортирует диапазон порциями по фактическим лимитам; rate limited; checkpoint после каждого окна; повторный импорт идемпотентен |
| BL-032 | P1 / L | T-Invest annual archive importer | BL-014, BL-020, BL-030 | При доступности архива скачивает/распаковывает/валидирует данные; zip errors и missing year отражаются в job; текущий день не считается покрытым архивом |
| BL-033 | P0 / L | MOEX ISS history/candles importer | BL-015, BL-020, BL-030 | Есть `from/till/start` pagination; читается `columns`; соблюдаются ограничения доступа; импорт сохраняет provider отдельно; пустая выдача не трактуется как отсутствие инструмента без диагностики |
| BL-034 | P0 / M | Import job orchestration | BL-031, BL-033 | Можно создать job, продолжить после рестарта, отменить, повторить failed range; checkpoint не теряется; есть summary rows received/inserted/failed |
| BL-035 | P0 / M | Data quality validator + gap detection | BL-030, BL-034 | Проверяются OHLC, volume, duplicate, chronology, session gaps; гэпы в торговой сессии создаются в `data_gaps`; не создаются искусственные нулевые свечи |
| BL-036 | P1 / M | Reconciliation двух источников | BL-031, BL-033, BL-035 | Для выбранного окна строится отчёт по расхождениям OHLC/volume/time; исходные строки не затираются; dataset policy выбирает один source explicitly |
| BL-037 | P0 / M | Market history query API | BL-020, BL-030 | `GET /candles` корректно фильтрует interval/from/to/provider; отдаёт UTC, decimal strings, source metadata; пагинация ограничивает размер ответа |
| BL-038 | P1 / M | Historical import CLI | BL-034 | CLI запускает импорт по ticker/internal ID и interval/date range; dry-run выводит план окон; команда возобновления поддерживает job ID |

### EPIC E4 — Realtime market data & data health

**Результат:** единый stream manager с восстановлением, stale detection и UI health.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-040 | P0 / L | Stream connection manager | BL-014 | State machine DISCONNECTED/CONNECTING/CONNECTED/DEGRADED/RECONNECTING; exponential backoff + jitter; heartbeat/last event age; reconnect test |
| BL-041 | P0 / M | Subscription registry | BL-040 | Подписки агрегируются по инструментам и типам данных; reconnect восстанавливает нужные подписки; UI не создаёт broker subscription напрямую |
| BL-042 | P0 / L | Realtime event normalization | BL-040, BL-030 | Market streams mapped to canonical LastPrice/Candle/Trade/Book; сохраняются event time и receive time; повторные события дедуплицируются |
| BL-043 | P0 / M | Data freshness and health service | BL-042 | Для каждого instrument/feed доступен age/stale/delayed/unknown; stale thresholds конфигурируются по feed/interval; неизвестное качество запрещает live order |
| BL-044 | P1 / M | Realtime fan-out to UI | BL-037, BL-042 | API WebSocket отдаёт подписанные события; reconnect клиента восстанавливает subscriptions; UI показывает receivedAt, eventTime, provider и stale badge |
| BL-045 | P1 / M | Gap backfill after reconnect | BL-034, BL-040, BL-043 | После восстановления stream запускается backfill с контрольной точки; нет двойного сигнала от перекрывающегося окна; data gaps резолвятся только после проверки |

### EPIC E5 — Analytics, indicators & signals

**Результат:** детерминированные признаки и объяснимые сигналы, которые не могут торговать сами.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-050 | P0 / M | Индикаторы SMA/EMA | BL-030 | Формулы и warm-up periods задокументированы; эталонные fixtures; нет look-ahead; повторяемость на одинаковом input |
| BL-051 | P1 / M | Индикаторы RSI/ATR/MACD/Bollinger | BL-050 | Корректные warmup/null handling; тесты на flat/up/down series; результат совпадает с эталонным расчётом в допуске |
| BL-052 | P1 / M | Volume/VWAP features | BL-030 | Явно задаётся volume unit; VWAP не вычисляется при неизвестной единице объёма без предупреждения; внутридневные session reset тесты |
| BL-053 | P0 / M | Strategy interface + deterministic runner | BL-050 | Вход — упорядоченные closed bars + context; выход — StrategyDecision; стратегия не импортирует broker SDK; same input/version/config → same output |
| BL-054 | P1 / M | Baseline EMA crossover strategy | BL-053 | Есть entry/exit rules, direction, timeframe, invalidation, config schema; искусственные графики покрывают signal/no-signal сценарии |
| BL-055 | P1 / M | RSI filter / ATR risk strategy | BL-051, BL-053 | Сигнал включает причину фильтра, стоп/цель как proposal metadata; расчёт не отправляет order; спецификация инструмента учтена для sizing на следующем этапе |
| BL-056 | P0 / M | Signal persistence and deduplication | BL-020, BL-053 | Unique event key предотвращает повторный signal на повторной свече; сохраняется strategy version, source time, data quality, features/reasons, valid_until |
| BL-057 | P1 / M | Signal REST API + UI | BL-037, BL-056 | Есть filters/status/detail; UI показывает цену/время/источник/причины/срок действия; delayed/stale signal визуально помечен |
| BL-058 | P2 / M | Feature research export | BL-024, BL-052 | Выгрузка dataset + features привязана к версии и диапазону; leakage-sensitive поля исключены или явно маркированы |

### EPIC E6 — Backtesting & Strategy Lab

**Результат:** event-driven simulator, учитывающий временную доступность данных и торговые издержки.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-060 | P0 / M | Проверить `invest-engine-node` spike | BL-013, BL-053 | Отчёт показывает поддерживаемые event types, fees, slippage, partial fills, futures, sessions, data format; решение use/adapt/replace зафиксировано ADR |
| BL-061 | P0 / L | Event-driven backtest core | BL-024, BL-053 | События проигрываются строго по времени; order fills не происходят раньше сигнала/доступности события; фиксированный seed и dataset дают одинаковый результат |
| BL-062 | P0 / L | Cost & execution model | BL-061, BL-017 | Учтены commission, spread/slippage, tick/lot, next-event fill, market session; сценарии gap-through-stop и no-liquidity покрыты тестами |
| BL-063 | P1 / M | Backtest metrics and report | BL-061, BL-062 | Есть net/gross PnL, max drawdown, profit factor, expectancy, win rate, avg win/loss, exposure, fees share; формулы документированы |
| BL-064 | P1 / M | Backtest job + immutable result | BL-024, BL-061 | Запуск асинхронный; сохраняются strategy version/config/dataset/cost model/result hash; завершённый run не меняется при последующем изменении стратегии |
| BL-065 | P1 / M | Strategy Lab UI | BL-063, BL-064 | Можно выбрать version/dataset/period/config, запустить прогон, открыть equity/drawdown/trades/metrics; видны ограничения данных и модели исполнения |
| BL-066 | P1 / M | Walk-forward / OOS evaluation | BL-064 | Train/validation/test интервалы заданы по времени и не пересекаются; отчет не использует будущие данные при выборе параметров; сохраняются границы выборок |

### EPIC E7 — Manual trading & order lifecycle

**Результат:** пользователь вручную подтверждает заявку в Sandbox; система надёжно отслеживает order/fill lifecycle.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-070 | P0 / M | Broker account/positions sync | BL-014, BL-020 | Аккаунты и позиции сохраняются snapshot-ами; broker IDs сопоставлены; состояние `last_synced_at` доступно; расхождение не затирает историю |
| BL-071 | P0 / M | Order preview service | BL-017, BL-043, BL-070 | В preview есть tick/lot checks, quote age, trading status, estimate costs, account state; preview expires; нет broker write call |
| BL-072 | P0 / L | Server-side Risk Engine v1 | BL-011, BL-017, BL-071 | Лимиты account/instrument/order size, allowed mode, quote freshness, trading status, cash/margin checks реализованы и покрыты unit tests; UNKNOWN status всегда fail-closed |
| BL-073 | P0 / L | Order aggregate + state machine | BL-020, BL-023 | Переходы валидируются; `UNKNOWN` есть отдельным состоянием; order_events append-only; duplicate event does not duplicate transition/fill |
| BL-074 | P0 / L | Sandbox submit/cancel adapter | BL-014, BL-072, BL-073 | В запросе используется заранее созданный уникальный client order ID; timeout не вызывает blind retry; успешные/отклонённые заявки мапятся в state machine; tests только Sandbox |
| BL-075 | P0 / L | Order streams + reconciliation | BL-074 | OrderStateStream/TradesStream обновляют локальные заявки; при disconnect/worker restart делается `GetOrders`/`GetOrderState`/fills reconciliation; неизвестный order ID блокирует новые открытия до разрешения |
| BL-076 | P1 / M | Manual trading UI | BL-071, BL-075 | Форма limit order, preview, явное подтверждение; рыночная заявка имеет предупреждение; UI отображает partial fill/cancel/reject/unknown; sandbox/live явно различаются |
| BL-077 | P1 / M | Replace/cancel race handling | BL-073–BL-076 | Cancel/replace допускаются только из валидных состояний; конкурирующие события обрабатываются идемпотентно; UI не утверждает отмену до подтверждения broker |

### EPIC E8 — Paper trading, automation controls & failure handling

**Результат:** полная стратегия работает на realtime данных без отправки реальных поручений; контроль режима защищён backend-ом.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-080 | P0 / L | Paper broker simulator | BL-042, BL-061, BL-073 | Симулируются order status, partial fill, cancel, spread/slippage; каждый fill имеет source market event; повтор одного события не создаёт новый fill |
| BL-081 | P0 / M | Trading mode state machine | BL-072, BL-073 | Есть RESEARCH/MANUAL/PAPER/SANDBOX/LIVE_GUARDED/LIVE; разрешённые transitions описаны; опасные transitions требуют явного подтверждения и аудита |
| BL-082 | P0 / M | Global kill switch | BL-072, BL-081 | Kill switch хранится backend-side; проверяется непосредственно перед каждой отправкой; нельзя сбросить одной UI манипуляцией; restart сохраняет безопасное состояние |
| BL-083 | P0 / M | Risk policies and loss limits | BL-072, BL-081 | Configurable max risk/trade, max daily loss, max exposure, max orders, max spread/slippage; при превышении новых входов нет; события попадают в audit |
| BL-084 | P1 / M | Automation orchestration | BL-053, BL-081–BL-083 | Strategy Worker отправляет proposal event; Execution Worker независимо проверяет signal freshness, whitelist, policy, quote age and mode; нет прямого вызова broker из стратегии |
| BL-085 | P0 / L | Failure/restart/chaos test suite | BL-075, BL-080–BL-084 | Проверены network loss, API 429/5xx, DB restart, worker crash, duplicate events, stale feed, unknown order, kill switch; система остаётся fail-closed |
| BL-086 | P1 / M | Paper monitoring report | BL-080, BL-084 | Отчёт сравнивает сигнал, расчётный и simulated fill, slippage, rejected proposals, data quality; период и dataset/live range фиксируются |

### EPIC E9 — Guarded live & operations

**Результат:** строго ограниченный запуск реального исполнения после независимой проверки.

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-090 | P0 / M | Live trading approval gate | BL-085, BL-086 | Есть документированный checklist и sign-off человеком; стратегия version/hash зафиксированы; live disabled by default; нет автоматического перехода из Sandbox в Live |
| BL-091 | P0 / M | Production preflight + daily reconciliation | BL-075, BL-082, BL-090 | Перед включением сверяются accounts/positions/orders/specs/market status; при mismatch новые заявки заблокированы; повторная сверка доступна и аудитируется |
| BL-092 | P0 / L | LIVE_GUARDED order path | BL-090, BL-091 | Разрешён whitelist account/strategy/instrument; ограничение объёма/частоты и дневного риска проверяется backend; отдельный production credential; kill switch протестирован в production-like environment |
| BL-093 | P0 / M | Runbook and operational alerts | BL-085, BL-091 | Есть инструкции API outage, stale feed, unknown order, mismatch portfolio, daily loss, credential rotation; health/metrics/alerts проверены тестовым incident |
| BL-094 | P1 / M | Deployment hardening | BL-093 | Non-root containers, secret injection, backup schedule, restore test, DB migration strategy, log redaction, dependency scanning; release has rollback procedure |

### EPIC E10 — Future extensions (не блокируют MVP)

| ID | Приоритет / размер | Задача | Зависимости | Критерии приёмки |
|---|---|---|---|---|
| BL-100 | P2 / L | Futures continuous series and roll logic | BL-017, BL-024 | Continuous series явно синтетический; метод roll/back-adjust описан; не подменяет contract ID в order flow; тесты на expiry boundary |
| BL-101 | P2 / L | Trades/orderbook analytics | BL-042 | Источник/подписка/глубина известны; timestamps и sequence handling validated; microstructure data не смешивается с OHLCV |
| BL-102 | P2 / L | Corporate actions adjustment | BL-030 | Raw и adjusted series хранятся отдельно; метод корректировки воспроизводим; backtest использует выбранный режим явно |
| BL-103 | P2 / XL | Portfolio-level risk | BL-070, BL-083 | Учитываются корреляции, совместное exposure, концентрация и сценарные потери; deterministic tests |
| BL-104 | P3 / XL | ML regime classifier / anomaly detector | BL-024, BL-066 | Есть time-based validation, leakage audit, baseline comparison, model versioning; ML не обходит risk engine |
| BL-105 | P3 / M | Notifications (Telegram/email) | BL-023, BL-093 | Retry, dedupe, delivery status, no credentials in payload; alerts имеют severity и action hint |

---

## 8. Milestones, dependencies и release gates

| Milestone | Включает | Видимый результат | Gate для перехода |
|---|---|---|---|
| M0 — Foundation | E0 | Репозиторий + CI + локальная БД | Чистый clone собирается и проходит CI |
| M1 — Providers | E1 + часть E2 | Каталог/спецификации доступны через adapters | Тестовый набор инструментов однозначно mapped; sandbox API работает |
| M2 — Historical Data | E2 + E3 | История загружается, доступна через API и график | Повторный импорт идемпотентен; gaps видимы; качество проверено на samples |
| M3 — Realtime | E4 | Живая котировка и health в UI | Reconnect/backfill/stale test пройдены |
| M4 — Signals | E5 | Первые объяснимые сигналы | Deterministic replay даёт идентичные результаты |
| M5 — Backtesting | E6 | Strategy Lab + отчёт | Нет look-ahead; fees/slippage учтены; OOS выделен |
| M6 — Manual Sandbox | E7 | Ручная заявка и журнал | Timeout/retry/partial fill/reconcile tests пройдены |
| M7 — Paper | E8 | Полный pipeline без реальных денег | Failure tests, kill switch, risk policies пройдены; paper период документирован |
| M8 — Guarded Live | E9 | Ограниченная live торговля | Человеческий sign-off; preflight и rollback plan; стратегия зафиксирована |

**Порядок выполнения:** E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9. Часть UI можно развивать параллельно с backend после готовности контрактов, но не делать UI прототипом вместо backend security rules.

### 8.1. Gate перед первым Sandbox order

- [ ] Используется отдельный sandbox endpoint/credential/account.
- [ ] В runtime невозможно выбрать production случайным `NODE_ENV` без отдельного explicit config.
- [ ] Preview показывает account, instrument, side, type, quantity, price, quote age и spec version.
- [ ] Сервер повторно проверяет лимиты перед отправкой.
- [ ] `client_order_id` сохранён до network call.
- [ ] Timeout переводит заявку в `UNKNOWN`; повторный submit блокируется.
- [ ] `OrderStateStream`/reconciliation обновляют состояние.
- [ ] Все события записаны в audit log.

### 8.2. Gate перед PAPER

- [ ] Сигнал и proposal — разные сущности.
- [ ] У Strategy Worker нет брокерского write token.
- [ ] Feed freshness и session gate реализованы.
- [ ] Paper fills используют явную модель исполнения и source events.
- [ ] Repeated event не создаёт дубль signal/order/fill.
- [ ] Kill switch проверяется на backend.

### 8.3. Gate перед LIVE_GUARDED

- [ ] Пройдено не менее 20 торговых сессий PAPER (порог для эксплуатационной проверки, не доказательство прибыльности).
- [ ] По каждой сессии есть отчёт по сигналам, simulated fills, rejected trades, data gaps и системным сбоям.
- [ ] Есть out-of-sample backtest на заранее зафиксированном участке.
- [ ] Комиссии и проскальзывание проверены консервативными сценариями.
- [ ] На практике проверены stop/market/limit semantics и ограничения конкретного инструмента.
- [ ] Риск-лимиты заданы до запуска, а не после первых убытков.
- [ ] Выполнена ручная сверка broker positions/orders с локальным state.
- [ ] Есть отдельное подтверждение пользователя/владельца системы.
- [ ] Live выключен по умолчанию и ограничен allowlist.

---

## 9. Definition of Done (общий)

Любая задача считается `DONE`, только если применимые пункты выполнены:

1. Код следует слоям monorepo; нет import cycle и provider leakage.
2. Типы публичных входов/выходов определены; runtime validation применяется к внешним данным.
3. Unit tests покрывают normal case, boundary case и error case.
4. Integration test использует sandbox или fixture; тест не может случайно отправить реальный ордер.
5. Для миграции проверены up и совместимость с существующей схемой; destructive SQL отдельно одобрен.
6. Логирование содержит correlation ID, но не token/authorization headers/секреты.
7. Обработаны timeout, отмена, retry policy и идемпотентность там, где они применимы.
8. Метрики/ошибки достаточны для диагностики.
9. README/API docs/ADR/STATUS обновлены, если контракт или поведение изменились.
10. CI `lint`, `typecheck`, `test`, `build` проходит.
11. В PR указаны выполненные критерии и ограничения.

### Дополнительный DoD для финансовых/торговых модулей

- Цена/сумма/комиссия/маржа не проходят через небезопасный `number` pipeline.
- Tick/lot/specification version валидируются server-side.
- Нет side-effect от стратегии до отдельного proposal/risk/execute шага.
- Все внешние write requests имеют audit trail и idempotency key.
- Для неопределённого результата broker write — `UNKNOWN` и reconciliation, а не blind retry.
- При stale/unknown market data, неизвестном trading status, потере broker connection или превышении лимита — fail-closed.

---

## 10. Тестовая стратегия и fixtures

### 10.1. Unit tests

- Decimal parsing, rounding to tick, lot conversion, contract multiplier.
- Futures price/value converter на выбранных контрактах.
- Candle validation, timezone conversion, volume unit mapping.
- MOEX ISS `columns` mapping и pagination cursor.
- Provider DTO → canonical model mapping.
- Indicator warm-up, flat series, gaps, boundary calculations.
- Strategy deterministic replay и signal deduplication.
- Backtest next-event execution, commissions, slippage, gap-through-stop, no liquidity.
- Risk engine policy precedence, max quantity, stale quote, unknown session.
- Order state transitions, duplicate events, cancel/replace race, unknown timeout state.

### 10.2. Integration tests

- T-Invest Sandbox: accounts, instruments, post/cancel/status.
- T-Invest market data: candles/last price/stream (read path).
- MOEX ISS: market structure and a small paginated history range.
- PostgreSQL: upsert, transaction/outbox, migration, dataset snapshot.
- Worker: restart during an import, resume from checkpoint.
- WebSocket: client disconnect/reconnect and event replay/deduplication.

### 10.3. E2E / failure scenarios

1. Полностью пройти use case: instrument sync → history import → chart → indicators → signal → backtest report.
2. Создать Sandbox order → partial fill/status event → cancel remaining → reconciliation.
3. Симулировать timeout после broker submit; убедиться, что новая заявка не отправляется автоматически.
4. Отключить feed на интервал выше threshold; убедиться, что новые proposals блокируются.
5. Перезапустить worker при активной заявке; проверить восстановление состояния.
6. Вызвать превышение daily loss; проверить отказ новых входов и audit record.
7. Включить kill switch в момент очереди на отправку; проверить, что команда не проходит.
8. Повторно доставить один market event/order event; проверить отсутствие дублей.

### 10.4. Набор fixtures

Хранить anonymized/static fixtures в `packages/test-fixtures`:

- 1 liquid stock, 1 futures contract, 1 instrument with changing spec;
- candles с обычной сессией, gap, duplicate, outlier, partial current bar;
- sample MOEX ISS response с `columns` в отличном от ожидаемого порядке;
- broker order lifecycle: accepted, rejected, partial, filled, cancelled, timeout/unknown;
- market stream disconnect/reconnect;
- futures expiry/roll boundary.

Fixtures должны быть небольшими, неизменяемыми и иметь README с источником/датой получения. Не коммитить реальные данные пользовательского портфеля или токены.

---

## 11. Инфраструктура, конфигурация и наблюдаемость

### 11.1. Environment variables (пример имён, не секретные значения)

```dotenv
NODE_ENV=development
APP_TIMEZONE=Europe/Moscow
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moex

TINVEST_ENV=sandbox
TINVEST_BASE_URL=https://sandbox-invest-public-api.tbank.ru:443
TINVEST_TOKEN=
TINVEST_ACCOUNT_ID=

MOEX_ISS_BASE_URL=https://iss.moex.com/iss
MOEX_ISS_AUTH_MODE=anonymous

TRADING_MODE=research
LIVE_TRADING_ENABLED=false
GLOBAL_KILL_SWITCH=true
LOG_LEVEL=info
```

Имена окончательно нормализовать (например, `TINVEST_*` uppercase); не поддерживать параллельные алиасы без причины. Production URL и token должны быть отдельными секретами, а переключение режима — explicit allowlisted config. `.env.example` содержит только пустые значения/фейковые локальные значения.

### 11.2. Rate limiting

Разделить budgets по категориям:

- catalog/instruments;
- historical candles/backfill;
- realtime stream subscriptions;
- account/portfolio reads;
- order reads;
- order write/cancel/replace.

Все числа лимитов хранить в provider adapter config и сверять с действующей официальной таблицей непосредственно перед релизом. Не переносить значения лимитов в strategy logic. Backfill имеет меньший приоритет, чем realtime и execution. Для GET использовать bounded exponential backoff + jitter; для POST order — reconciliation вместо автоматического повторения.

### 11.3. Минимальные метрики

- `provider_request_total{provider,method,status}` и latency histogram;
- `provider_rate_limit_total{provider,method}`;
- `stream_connection_state`, `stream_reconnect_total`, `market_event_age_ms`;
- `history_import_jobs{status}`, `history_rows_written`, `data_gaps_open`;
- `signals_created_total`, `signals_expired_total`, `signals_deduplicated_total`;
- `orders_by_status`, `order_submit_latency_ms`, `unknown_orders_total`, `fills_total`;
- `risk_rejections_total{reason}`, `kill_switch_state`;
- worker heartbeat, queue depth, DB pool saturation.

### 11.4. Логирование

Все логи — JSON и по возможности содержат `correlationId`, `instrumentId`, `strategyVersionId`, `signalId`, `proposalId`, `clientOrderId`, `brokerOrderId`. Никогда не логировать токен, Authorization header, API secret, полные персональные данные аккаунта. Ошибки провайдера сохранять в редактированном виде с кодом и sanitized message.

---

## 12. Security & trading safety checklist

- [ ] Sandbox и production конфигурации/секреты хранятся отдельно.
- [ ] В браузер не передаётся full-access token и не используется `VITE_*` для секретов.
- [ ] Только `worker-execution` имеет write credential; api/web/strategy не имеют его.
- [ ] По возможности отдельные токены/права для read и trade, если это поддержано T-Invest.
- [ ] Live выключен по умолчанию на уровне конфигурации и БД.
- [ ] Каждая live strategy/account/instrument комбинация находится в allowlist.
- [ ] Сброс kill switch требует явного backend action и аудита.
- [ ] Для ручного заказа нужен явный confirmation workflow; для автоматического — approved automation session.
- [ ] Неизвестная спецификация, неизвестный статус торгов, stale quote или неактуальная позиция → отказ.
- [ ] Timeout write call не приводит к повтору до reconciliation.
- [ ] При рестарте execution worker сначала reconcile active/unknown orders, потом разрешает новые открытия.
- [ ] Kill switch останавливает новые заявки; политика по открытым позициям задана отдельно и явно.
- [ ] Backups защищены; restore tested; credentials rotatable.
- [ ] Права на хранение и показ биржевых данных проверены по договору/лицензии MOEX и условиям брокера.

---

## 13. Практический порядок реализации — первые 15 задач

Это рекомендуемая последовательность для Cursor, с фокусом на подтверждение архитектуры до массовой реализации.

| Порядок | ID | Что сделать | Конкретный результат для review |
|---:|---|---|---|
| 1 | BL-001 | pnpm + Turborepo skeleton | Пустой monorepo с рабочими root scripts |
| 2 | BL-002 | TS strict + lint | CI typecheck/lint на чистом clone |
| 3 | BL-004 | Config schema | Startup validation и безопасный `.env.example` |
| 4 | BL-005 | PostgreSQL local infra | `docker compose up` + healthcheck |
| 5 | BL-010 | Domain types | Независимые сущности и tests |
| 6 | BL-011 | Decimal helpers | Точные tick/lot calculations |
| 7 | BL-013 | T-Invest SDK spike | Подключение к Sandbox и первые реальные API responses |
| 8 | BL-015 | MOEX ISS spike/client | Один реальный ISS request + fixture tests |
| 9 | BL-012 | Provider ports | Независимые internal interfaces |
| 10 | BL-014 | T-Invest adapter | Каталог/спеки/свечи через adapter |
| 11 | BL-016 | Instrument mapping | На практике связаны один share и один future |
| 12 | BL-020 | Initial migrations | База данных с core tables |
| 13 | BL-031 | T-Invest historical importer | Первая воспроизводимая загрузка и checkpoint |
| 14 | BL-033 | MOEX ISS importer | Дополнительная история с pagination и source tag |
| 15 | BL-037 | Candle query API | Frontend может получить нормализованные свечи |

После задачи BL-015, до дальнейшей реализации provider adapters, сохранить реальные sanitized examples ответов и точные версии SDK в `docs/API_CONTRACTS.md`.

---

## 14. Риски, открытые вопросы и технические spikes

Эти вопросы нужно закрыть проверкой/POC, а не предположением AI-агента:

| Вопрос | Как проверить | Блокирует |
|---|---|---|
| Какие MOEX ISS истории доступны без подписки для целевых рынков/board? | Прямые запросы `/iss/history` на выбранных security; проверить политику доступа и условия договора | Финальный выбор источника и глубины истории |
| Есть ли для нужных инструментов достаточная T-Invest история/архив? | GetCandles + history-data ZIP; зафиксировать реальные границы и sample count | План импортёра и MVP coverage |
| Какова фактическая совместимость пакетов `@ttech-pub/*`? | Установить согласованные версии; проверить peer dependencies, Node compatibility, imports, runtime | BL-013/014 |
| Доступен ли `invest-engine-node` для требуемой модели fills/futures? | Spike с partial fills, commissions, sessions, expiry, event time | Решение о backtest engine |
| Как интерпретировать цену и объём выбранного фьючерса? | Сверить spec, converter и брокерский preview для 1–2 контрактов | Любой futures sizing/order |
| Можно ли применять stop orders для каждого типа инструмента/режима? | Проверить contract, trading status и ограничения брокера | UI и execution feature scope |
| Какие права на показ/сохранение/перераспространение данных? | Проверить условия MOEX и тариф брокера; при необходимости получить письменное подтверждение | Production и sharing |
| Нужна ли TimescaleDB? | Нагрузочный тест на ожидаемом объёме candles/query latency | Оптимизация хранения, не MVP |

### 14.1. Явно не предполагать

- Нельзя считать, что MOEX ISS всегда отдаёт полный исторический период без авторизации.
- Нельзя считать, что одинаковый ticker у двух провайдеров гарантирует один инструмент/режим торгов.
- Нельзя считать, что Sandbox полностью эмулирует рыночную ликвидность, margin и реальные fills.
- Нельзя считать, что стакан/сделки доступны с той же глубиной и задержкой, что и свечи.
- Нельзя считать, что timeout означает неуспешную заявку.
- Нельзя считать касание high/low внутри OHLC свечи доказательством исполнения лимитного/стоп ордера.
- Нельзя включать LIVE потому, что backtest показал положительный PnL.

---

## 15. Решения, которые не нужно принимать заранее

Чтобы не переусложнить первый релиз, отложить следующие вопросы до появления конкретной нагрузки/требования:

1. TimescaleDB vs vanilla PostgreSQL partitioning — принять по результату измерений.
2. Redis — добавить при необходимости low-latency cache/fan-out/coordination; не добавлять «потому что так принято».
3. NestJS vs Fastify — выбрать Fastify для небольшого backend, но не менять framework ради предпочтений агента.
4. Большой charting package — выбрать после UX прототипа; не смешивать chart state с market data state.
5. `invest-engine-node` vs собственный simulator — принять после spike BL-060, а не по названию пакета.
6. LLM-анализ рынка — только отдельный advisory layer после появления базовых deterministic signals; никаких полномочий на order execution.
7. Микросервисы — только при независимом масштабировании/отказоустойчивости, подтверждённых метриками.

---

## 16. Официальные источники и reference links

Проверять перед каждой интеграцией: API-контракт, лимиты, доступность методов и семантику полей могут изменяться. Дата первоначальной сверки этого плана — 8 ноября 2026 г.

### T-Invest API

- [Начало работы](https://developer.tbank-online.com/invest/intro/intro/)
- [Каталог сервисов API](https://developer.tbank-online.com/invest/api)
- [MarketDataService — котировки, свечи и стакан](https://developer.tbank-online.com/invest/services/quotes/marketdata/)
- [OrdersService — выставление, отмена и статусы](https://developer.tbank-online.com/invest/api/orders-service)
- [Описание PostOrder и идемпотентный `order_id`](https://developer.tbank-online.com/invest/services/orders/head-orders/)
- [Лимиты API](https://developer.tbank-online.com/invest/intro/intro/limits)
- [Рекомендуемые deadlines запросов](https://developer.tbank-online.com/invest/intro/developer/deadlines)
- [Sandbox](https://developer.tbank-online.com/invest/intro/developer/sandbox)
- [JS/TS SDK FAQ](https://developer.tbank-online.com/invest/sdk/faq_js)

### `invest-js` SDK

- [Репозиторий `invest-js`](https://opensource.tbank.ru/invest/invest-js)
- [npm profile `@ttech-pub`](https://www.npmjs.com/~ttech-pub)
- [Node SDK package](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node)
- [Core package](https://www.npmjs.com/package/@ttech-pub/invest-core)
- [Engine package](https://www.npmjs.com/package/@ttech-pub/invest-engine-node)

### MOEX ISS

- [MOEX — Program interface for ISS](https://www.moex.com/a8531)
- [MOEX — Programming interface to the ISS](https://www.moex.com/a2920)
- [ISS interactive API reference](https://iss.moex.com/iss/reference/)

---

## 17. Итоговая рекомендуемая стратегия

Реализовывать проект вертикальными срезами и закрывать качество данных до перехода к торговле:

1. **Сначала** monorepo, domain contracts, Decimal, provider adapters и mapping инструментов.
2. **Затем** PostgreSQL, исторические загрузчики, checkpoint/retry/data gaps и график истории.
3. **Далее** realtime streams, freshness checks, индикаторы и объяснимые сигналы.
4. **После** — event-driven backtest с fees/slippage и out-of-sample evaluation.
5. **Затем** — ручные Sandbox orders, order state machine, idempotency и reconciliation.
6. **Только после длительного PAPER и отдельного sign-off** — ограниченный LIVE_GUARDED.

### Первое действие

Начать с **BL-001**. В первом PR не реализовывать брокерский API, индикаторы или UI. Цель PR — получить чистую, воспроизводимую основу monorepo, на которой все последующие задачи можно безопасно выполнять и проверять.
