---

spec_id: fibonacci-pivot-points
spec_version: 1.0.0
status: implementation-ready-with-explicit-verification-gates
language: ru-RU
created_at: 2026-11-09
owner: trading-platform
feature:
name: Fibonacci Pivot Points
algorithm_id: fibonacci-pivot-points
algorithm_version: 1.0.0
chart_engine: TanStack Charts v1
market_data_provider: T-Invest API
primary_exchange: MOEX
initial_instrument_for_validation: NG-12.26
chart_timeframes:

- chart_timeframe: 5m
  reference_timeframe: 1D
  reference_period: previous_completed_exchange_trading_day
- chart_timeframe: 1h
  reference_timeframe: 1W
  reference_period: previous_completed_exchange_trading_week
  levels: [P, R1, R2, R3, S1, S2, S3]
  fibonacci_coefficients:
- 0.382
- 0.618
- 1.000

---

# Fibonacci Pivot Points — Implementation Specification

> Машиночитаемая техническая спецификация для автономного coding agent. Документ задаёт поведение, контракты, ограничения, порядок реализации и критерии приёмки. Агент обязан сначала исследовать существующий репозиторий и адаптировать имена/пути/инфраструктуру под его фактическую структуру, не меняя зафиксированную бизнес-семантику.

## 0. Agent execution contract

### 0.1. Required behavior

1. Изучи `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, структуру `apps/` и `packages/`, существующие модули market data, candles, instruments, technical analysis, workers, migrations, API и chart UI.
2. Найди существующие реализации:
   - клиента T-Invest API;
   - нормализации свечей и `Quotation`;
   - хранения исторических свечей;
   - определения инструментов и их идентификаторов;
   - торгового календаря / расписания торгов;
   - фоновых задач, очередей, повторов и distributed locks;
   - PostgreSQL repositories и миграций;
   - REST conventions, DTO validation, API errors;
   - TanStack Charts integration и chart state / time viewport.
3. Переиспользуй существующие абстракции. Не создавай второй candle store, второй API client, вторую очередь или параллельный chart framework.
4. Не придумывай точные пути файлов и не копируй предлагаемое ниже дерево каталогов механически. Следуй конвенциям репозитория.
5. Не устанавливай новую библиотеку decimal, calendar, queue или chart, пока не проверены уже используемые зависимости. Если требуемой функциональности нет, выбери минимальную совместимую зависимость и обоснуй её в отчёте.
6. Не меняй формулы, коэффициенты, маппинг таймфреймов и семантику времени без явного решения владельца проекта.
7. Сначала реализуй backend math/data pipeline и его тесты, затем API, затем frontend overlay. Не блокируй поставку backend из-за необязательных визуальных улучшений.
8. После каждого этапа запускай релевантные lint, typecheck, unit и integration tests. В конце — все проверки, предусмотренные проектом.
9. Не оставляй псевдокод, `TODO`, фиктивные значения и пропущенные реализации в production path.
10. В итоговом отчёте перечисли изменённые файлы, миграции, команды проверок, результаты тестов, ограничения и открытые вопросы.

### 0.2. Scope boundaries

**Входит в задачу:**

- Fibonacci Pivot Points;
- исходные OHLC дневного и недельного интервалов;
- расчёт и историческое построение уровней;
- корректная временная привязка по биржевым торговым периодам MOEX;
- хранение результатов и инкрементальная актуализация;
- REST API для 5m и 1h графиков;
- слой отображения уровней в TanStack Charts;
- unit, integration и acceptance tests;
- проверка совпадения на инструменте NG-12.26.

**Не входит без отдельного согласования:**

- Fibonacci Retracement между swing high/swing low;
- автоматическое определение swing points;
- торговые сигналы, входы/выходы, stop-loss и take-profit;
- исполнение заявок;
- оптимизация торговых стратегий;
- новые chart engines или замена текущего графического движка;
- настройка пользовательских коэффициентов Fibonacci через UI;
- другие методы Pivot Points (Classic, Woodie, Camarilla и т. п.).

## 1. Зафиксированные продуктовые решения

| Property                      | Required value                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Indicator                     | `FIBONACCI_PIVOT_POINTS`                                                                      |
| Algorithm version             | `1.0.0`                                                                                       |
| Formula family                | Fibonacci Pivot Points, не Fibonacci Retracement                                              |
| Chart timeframe `5m`          | Reference timeframe `1D`                                                                      |
| Chart timeframe `1h`          | Reference timeframe `1W`                                                                      |
| Daily reference               | Предыдущая завершённая торговая дневная свеча/период                                          |
| Weekly reference              | Предыдущая завершённая торговая недельная свеча/период                                        |
| Coefficients                  | `0.382`, `0.618`, `1.000`                                                                     |
| Output levels                 | `P`, `R1`, `R2`, `R3`, `S1`, `S2`, `S3`                                                       |
| Market data                   | T-Invest API через существующий provider adapter                                              |
| Initial exchange              | MOEX                                                                                          |
| Initial validation instrument | NG-12.26 (использовать его canonical instrument UID из instrument service, не хардкодить UID) |
| Backend storage               | Существующий PostgreSQL / repository pattern проекта                                          |
| Background processing         | Существующие workers / job queue проекта                                                      |
| Frontend chart engine         | TanStack Charts v1; React adapter, если frontend действительно React                          |
| Level rendering primitive     | TanStack Charts `link`                                                                        |
| Level label primitive         | TanStack Charts `text` либо существующий chart annotation pattern                             |
| API                           | Существующий REST API style проекта                                                           |
| Timestamp storage / transport | UTC instants; биржевой календарь определяет границы торговых периодов                         |

### 1.1. Mapping

```ts
export const FIBONACCI_PIVOT_TIMEFRAME_MAP = {
  '5m': '1D',
  '1h': '1W',
} as const;
```

Mapping должен существовать в одном backend domain/config module и быть согласован с API. Frontend не должен независимо вычислять reference timeframe по собственным правилам. Backend response возвращает фактический `referenceTimeframe`.

### 1.2. Important interpretation

Уровни для целевого периода `N` рассчитываются по OHLC предыдущего завершённого биржевого периода `N-1` и действуют на целевой период `N`.

- Для 5m chart: daily OHLC предыдущего торгового дня → семь уровней для следующего торгового дня.
- Для 1h chart: weekly OHLC предыдущей торговой недели → семь уровней для следующей торговой недели.

Не рассчитывать дневные уровни по предыдущей 5m-свече и недельные уровни по предыдущей 1h-свече.

## 2. Mathematical specification

### 2.1. Input

```ts
export interface PivotSourceOHLC {
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
}
```

`DecimalLike` — существующий в проекте тип точной десятичной арифметики. Для финансовых цен не выполнять промежуточные вычисления через двоичный JavaScript `number`, если проект уже использует Decimal/BigNumber или другую точную модель.

### 2.2. Formula

Let:

- `H` = high of previous completed reference period;
- `L` = low of previous completed reference period;
- `C` = close of previous completed reference period;
- `D = H - L`;
- `P = (H + L + C) / 3`.

Fibonacci coefficients:

```ts
const FIBONACCI_COEFFICIENTS = {
  first: '0.382',
  second: '0.618',
  third: '1.000',
} as const;
```

Levels:

```text
R1 = P + D * 0.382
R2 = P + D * 0.618
R3 = P + D * 1.000

S1 = P - D * 0.382
S2 = P - D * 0.618
S3 = P - D * 1.000
```

### 2.3. Output contract

```ts
export interface FibonacciPivotValues {
  p: DecimalLike;
  r1: DecimalLike;
  r2: DecimalLike;
  r3: DecimalLike;
  s1: DecimalLike;
  s2: DecimalLike;
  s3: DecimalLike;
}
```

### 2.4. Validation

Reject input when any required value is missing, non-finite, unparsable, or:

- `H < L`;
- `C < L`;
- `C > H`.

Do not silently repair invalid OHLC. Record a structured validation error with instrument, timeframe, candle timestamp and provider source.

`H === L` is a degenerate but mathematically valid range: `D = 0`, all seven output levels equal `P = H = L = C`. Do not divide by the range. Emit a diagnostic/quality flag such as `DEGENERATE_RANGE`; do not fabricate non-zero levels.

### 2.5. Precision and tick size

- Keep full calculation precision in backend and database.
- Do not round to instrument `min_price_increment` during the calculation.
- Round/format only at the UI boundary using instrument metadata.
- For order pricing, if ever used by another feature, apply tick-size rounding in that execution/risk domain; this indicator must not silently apply order-price rounding.
- Preserve the instrument price currency and quotation units. Do not multiply or divide by lot size: T-Invest candle OHLC is price per instrument unit.

## 3. Time model and MOEX trading calendar

### 3.1. Fundamental rule

Never infer MOEX trading periods with generic calendar arithmetic such as:

```ts
new Date(timestamp).setHours(0, 0, 0, 0);
DATE_TRUNC('day', timestamp);
periodStart + 24 * 60 * 60 * 1000;
periodStart + 7 * 24 * 60 * 60 * 1000;
```

These approaches do not correctly model exchange holidays, non-trading days, evening sessions, clearing breaks, schedule changes, futures trading dates and partial sessions.

### 3.2. Required abstraction

Use the repository's existing exchange calendar if available. Otherwise introduce a domain abstraction, not indicator-specific timestamp arithmetic:

```ts
export interface TradingPeriod {
  exchange: 'MOEX' | string;
  market: string;
  instrumentUid: string;
  timeframe: '1D' | '1W';
  periodId: string; // stable calendar-defined ID
  start: Date; // inclusive UTC instant
  end: Date; // exclusive UTC instant
  tradingDate?: string; // exchange trading date, if applicable
  calendarVersion?: string;
}

export interface TradingCalendar {
  getPeriodContaining(
    instrument: InstrumentTradingMetadata,
    timeframe: '1D' | '1W',
    instant: Date,
  ): Promise<TradingPeriod | null>;

  getPreviousPeriod(
    instrument: InstrumentTradingMetadata,
    timeframe: '1D' | '1W',
    period: TradingPeriod,
  ): Promise<TradingPeriod | null>;

  getNextPeriod(
    instrument: InstrumentTradingMetadata,
    timeframe: '1D' | '1W',
    period: TradingPeriod,
  ): Promise<TradingPeriod | null>;

  getPeriodsIntersecting(
    instrument: InstrumentTradingMetadata,
    timeframe: '1D' | '1W',
    from: Date,
    to: Date,
  ): Promise<TradingPeriod[]>;
}
```

Adapt signatures to existing calendar conventions where possible. `end` is exclusive, and all instants are stored in UTC.

### 3.3. MOEX futures requirement

The initial validation instrument is a MOEX natural-gas futures contract. Its evening/night activity and exchange trading-date definition must be respected. Do not assume the evening session belongs to the calendar date on which its wall-clock timestamp falls. Resolve this through the exchange calendar/provider candle semantics and verify with NG-12.26 fixtures.

The exchange schedule can change. Do not hardcode one universal opening/closing time for every instrument, market, historical year and session. The calendar implementation must support historical schedule data or delegate to the project's authoritative market calendar source.

### 3.4. Period boundaries

- Periods are half-open intervals: `[start, end)`.
- No synthetic daily periods for Saturdays, Sundays or exchange holidays.
- No synthetic weekly periods for weeks with no trading sessions unless required by the calendar domain.
- The next valid trading period after a holiday/weekend is the next period returned by the calendar.
- Weekly bounds follow the exchange trading calendar, not a naïve Monday 00:00 through Sunday 23:59:59 UTC interval.
- Keep reference period bounds separate from the period in which calculated levels are valid.

### 3.5. Calendar/provider alignment gate

Before production backfill, prove that T-Invest native `DAY` and `WEEK` candles map to the same MOEX trading periods used by the chart and strategy layer for the instrument. Compare provider `time`, `is_complete`, `candle_source`, OHLC, and calendar period assignment.

If provider daily/weekly candle timestamps do not unambiguously identify those periods, implement a tested provider-time-to-calendar-period mapping or an aggregation fallback. Do not assume `time + 24h` / `time + 7d` equals period end.

## 4. T-Invest market data integration

### 4.1. Reuse provider adapter

Use the project's existing T-Invest API client and instrument resolver. Do not create direct HTTP calls in the indicator service and do not store tokens in this module.

Use canonical `instrument_uid` for internal identity. A ticker/class code such as `NG-12.26` is a lookup/display key, not the database identity.

### 4.2. Reference candle intervals

Preferred source intervals:

| Chart | Reference data interval | T-Invest enum          |
| ----- | ----------------------- | ---------------------- |
| 5m    | 1 day                   | `CANDLE_INTERVAL_DAY`  |
| 1h    | 1 week                  | `CANDLE_INTERVAL_WEEK` |

Use explicit exchange candle source for MOEX-only calculations:

```text
candleSourceType = CANDLE_SOURCE_EXCHANGE
```

Do not rely on `CANDLE_SOURCE_UNSPECIFIED` when the business requirement explicitly means exchange candles. Do not include weekend candle source unless the relevant market/instrument and product decision explicitly requires it.

### 4.3. Chart candle data is a separate request

The candles displayed on the main chart are independent of the reference candles used for pivots:

| Chart | Chart candle interval   |
| ----- | ----------------------- |
| 5m    | `CANDLE_INTERVAL_5_MIN` |
| 1h    | `CANDLE_INTERVAL_HOUR`  |

Do not derive daily/weekly pivot inputs from the last visible chart candle. Keep source-reference and display-chart data pipelines separate.

### 4.4. Candle DTO normalization

Normalize generated/client DTO naming to one internal model. T-Invest REST/OpenAPI documentation may expose snake_case names, while generated TypeScript SDK types may use camelCase.

```ts
export interface NormalizedMarketCandle {
  instrumentUid: string;
  interval: '5m' | '1h' | '1D' | '1W';
  time: Date; // UTC candle timestamp from provider
  open: DecimalLike;
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
  volume?: bigint;
  isComplete: boolean;
  candleSource: string;
}
```

The provider adapter must explicitly map `is_complete` / `isComplete` to `isComplete`. A missing completeness flag must not be interpreted as `true` in the pivot source pipeline.

### 4.5. Completeness and look-ahead protection

Only reference candles with `isComplete === true` may feed pivot calculations.

- Ignore current daily candle until provider marks it complete.
- Ignore current weekly candle until provider marks it complete.
- Never replace a previous completed source candle with the currently forming candle.
- Do not use wall-clock estimation alone to declare a candle complete.
- Historical replay/backtesting must select only data available at the target period's start.

### 4.6. API history limits and chunking

T-Invest documents approximate limits that depend on interval and request parameters. At the time this specification was prepared, the documented limits include:

| Interval | Approximate maximum request span | Maximum `limit` |
| -------- | -------------------------------: | --------------: |
| 5m       |                           1 week |            2400 |
| 1h       |                         3 months |            2400 |
| 1D       |                          6 years |            2400 |
| 1W       |                          5 years |             300 |

Implementation requirements:

1. Read current official provider documentation and installed SDK contract before coding; these limits may change.
2. Chunk historical requests by both provider time-window and `limit`.
3. Use UTC `from` / `to` values.
4. Deduplicate by `(instrument_uid, interval, candle_time, candle_source)`.
5. Sort candles ascending before aggregation or generation.
6. Detect truncated pages/chunks; do not claim history is complete merely because the API returned HTTP 200.
7. Read instrument metadata for first available candle dates. History depth can differ by instrument and interval.
8. Handle 429, 5xx, timeouts and partial provider responses using the project's retry/backoff policy.
9. Do not issue unbounded large-history requests in one worker execution.

### 4.7. Aggregation fallback

Native `DAY` and `WEEK` candles are preferred only after passing the calendar-alignment gate.

If native interval data is unavailable or its boundaries differ from the agreed period definition:

- For `1D`, aggregate a supported lower interval (prefer the finest reliable existing source already stored, usually 1m or 5m) inside calendar-defined daily period boundaries.
- For `1W`, aggregate calendar-aligned daily candles into a calendar-defined trading week; if daily data is unavailable, aggregate lower interval candles according to the same calendar.
- Aggregate OHLC as `open = first.open`, `high = max(high)`, `low = min(low)`, `close = last.close`, `volume = sum(volume)` when volume is applicable.
- Do not include candles outside `[period.start, period.end)`.
- Require adequate coverage and a valid first/last candle according to the existing historical-data completeness policy.
- Record exact aggregation source interval and source provenance.
- Never mix native provider candles and locally aggregated candles in one period without an explicit source priority rule.

## 5. Domain model and calculation pipeline

### 5.1. Recommended domain types

```ts
export type ChartTimeframe = '5m' | '1h';
export type ReferenceTimeframe = '1D' | '1W';

export interface ReferencePeriodOHLC {
  instrumentUid: string;
  timeframe: ReferenceTimeframe;
  periodId: string;
  start: Date;
  end: Date;
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
  isComplete: true;
  source: {
    provider: 'T_INVEST' | string;
    candleSource: string;
    interval: string;
    aggregationMethod: 'NATIVE' | 'AGGREGATED';
    sourceHash: string;
  };
}

export interface CalculatedPivotPeriod {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  referenceTimeframe: ReferenceTimeframe;

  // Source period used to calculate the levels.
  sourcePeriodId: string;
  sourcePeriodStart: Date;
  sourcePeriodEnd: Date;
  sourceOHLC: {
    high: DecimalLike;
    low: DecimalLike;
    close: DecimalLike;
  };

  // Target period during which the levels are valid.
  validPeriodId: string;
  validFrom: Date;
  validTo: Date;

  levels: FibonacciPivotValues;
  algorithmId: 'FIBONACCI_PIVOT_POINTS';
  algorithmVersion: '1.0.0' | string;
  configHash: string;
  sourceHash: string;
  calculatedAt: Date;
}
```

Adapt names to project style, but preserve source-period vs valid-period distinction.

### 5.2. Pure calculator

Create a pure deterministic function:

```ts
calculateFibonacciPivotPoints(
  source: Pick<ReferencePeriodOHLC, 'high' | 'low' | 'close'>,
): FibonacciPivotValues
```

Constraints:

- no database calls;
- no HTTP calls;
- no reading system time;
- no timezone/calendar operations;
- no global mutable state;
- no UI/chart dependencies;
- deterministic output for identical normalized input and config.

### 5.3. Historical generator

Input is a chronologically ordered list of complete reference periods plus calendar-resolved target periods.

Pseudo-contract:

```ts
interface GenerateHistoricalPivotInput {
  instrument: InstrumentTradingMetadata;
  chartTimeframe: '5m' | '1h';
  sourcePeriods: ReferencePeriodOHLC[];
  targetPeriods: TradingPeriod[];
  algorithmVersion: string;
}

function generateHistoricalPivots(input: GenerateHistoricalPivotInput): CalculatedPivotPeriod[];
```

For each target period `T[n]`:

1. Resolve the immediately previous exchange trading period `S[n-1]` of the mapped reference timeframe using the calendar (do not rely on adjacent array indices unless continuity has been validated).
2. Find the matching complete OHLC source for `S[n-1]`.
3. Validate its quality and provenance.
4. Calculate levels from `S[n-1].high`, `.low`, `.close`.
5. Persist/return the record with validity `[T[n].start, T[n].end)`.
6. If the previous valid source is absent/incomplete/invalid, emit an explicit gap/diagnostic and do not invent levels.

The backfill request for a visible `from` range must load at least one prior reference period before the earliest target period, otherwise the first target period cannot be calculated.

Do not assign a source period's levels to that same source period. This is the key anti-look-ahead invariant.

### 5.4. Incremental update

When a new source period becomes complete:

- resolve the next applicable target period;
- calculate and upsert only that target period's pivot record;
- do not recalculate every candle or every historical target period.

When a previously stored source candle is corrected:

- recompute its canonical source hash;
- find the next target period that uses it;
- recalculate that target period;
- update downstream records only if their actual source inputs changed;
- preserve an audit trail or versioning according to repository conventions.

## 6. Persistence

### 6.1. Storage policy

Reuse the existing historical candle store. Add a dedicated pivot-results table only if the repository does not already have a generic indicator-result store suitable for period segments and algorithm versioning.

### 6.2. Proposed PostgreSQL table

The following is a logical migration template; adapt UUID generation, naming, schema and migration conventions to the actual project.

```sql
CREATE TABLE fibonacci_pivot_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    instrument_uid TEXT NOT NULL,
    chart_timeframe TEXT NOT NULL
        CHECK (chart_timeframe IN ('5m', '1h')),
    reference_timeframe TEXT NOT NULL
        CHECK (reference_timeframe IN ('1D', '1W')),

    source_period_id TEXT NOT NULL,
    source_period_start TIMESTAMPTZ NOT NULL,
    source_period_end TIMESTAMPTZ NOT NULL,

    valid_period_id TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,

    source_high NUMERIC(30, 12) NOT NULL,
    source_low NUMERIC(30, 12) NOT NULL,
    source_close NUMERIC(30, 12) NOT NULL,

    pivot NUMERIC(30, 12) NOT NULL,
    r1 NUMERIC(30, 12) NOT NULL,
    r2 NUMERIC(30, 12) NOT NULL,
    r3 NUMERIC(30, 12) NOT NULL,
    s1 NUMERIC(30, 12) NOT NULL,
    s2 NUMERIC(30, 12) NOT NULL,
    s3 NUMERIC(30, 12) NOT NULL,

    algorithm_id TEXT NOT NULL DEFAULT 'FIBONACCI_PIVOT_POINTS',
    algorithm_version TEXT NOT NULL DEFAULT '1.0.0',
    config_hash TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    source_provider TEXT NOT NULL,
    source_interval TEXT NOT NULL,
    aggregation_method TEXT NOT NULL
        CHECK (aggregation_method IN ('NATIVE', 'AGGREGATED')),
    calendar_version TEXT NULL,

    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (source_period_end > source_period_start),
    CHECK (valid_to > valid_from),
    CHECK (source_high >= source_low),
    CHECK (source_close BETWEEN source_low AND source_high),

    UNIQUE (
        instrument_uid,
        chart_timeframe,
        valid_from,
        algorithm_id,
        algorithm_version,
        config_hash
    )
);

CREATE INDEX idx_fibonacci_pivots_chart_range
ON fibonacci_pivot_levels (
    instrument_uid,
    chart_timeframe,
    valid_from,
    valid_to
);
```

### 6.3. Persistence rules

- Use `NUMERIC` for prices and levels.
- `valid_to` is exclusive.
- Persist source and target period metadata separately.
- `source_hash` must cover normalized source OHLC, source interval, source timestamp/period ID, candle source and aggregation provenance.
- `config_hash` must cover coefficients, formula ID, relevant aggregation/calendar configuration and any settings that affect output.
- On duplicate key with identical hashes, treat operation as idempotent and avoid rewriting `calculated_at` unnecessarily.
- On duplicate key with changed `source_hash` or `config_hash`, update or create a version according to existing project audit/versioning conventions. Never silently mutate a result used by completed backtests without preserving reproducibility.
- Add foreign keys only if the existing instrument storage guarantees stable canonical keys and the project convention requires them.
- Do not store numeric values as JS floating point text converted after calculations.

## 7. Background workers and scheduling

Use the existing worker/job infrastructure.

### 7.1. Job types

| Job                             | Trigger                                      | Responsibility                                              |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `FIBONACCI_PIVOT_BACKFILL`      | Admin/operator request or onboarding         | Historical calculation for selected instrument/time range   |
| `FIBONACCI_PIVOT_DAILY_UPDATE`  | Completed daily source period                | Create levels for next applicable trading day (`5m` chart)  |
| `FIBONACCI_PIVOT_WEEKLY_UPDATE` | Completed weekly source period               | Create levels for next applicable trading week (`1h` chart) |
| `FIBONACCI_PIVOT_RECALCULATE`   | Source candle correction/calendar correction | Recompute dependent target period(s)                        |
| `FIBONACCI_PIVOT_RECONCILE`     | Periodic maintenance                         | Find missing/stale pivot records and safely repair them     |

### 7.2. Scheduling requirements

- Schedule from the authoritative calendar/period completion event or a calendar-aware worker schedule.
- Do not hardcode midnight, 23:59, a fixed UTC offset, or a fixed 24h/7d delay.
- Do not run daily/weekly calculation while the provider still marks source candle incomplete.
- If the close event is missed or provider data is delayed, the retry/reconciliation path must create the missing record once the completed candle becomes available.
- Weekly calculation happens only after completed weekly source data is confirmed.

### 7.3. Idempotency and locking

Recommended idempotency key:

```text
fibonacci-pivot:{instrumentUid}:{chartTimeframe}:{validPeriodId}:{algorithmVersion}:{configHash}
```

Requirements:

- use existing queue idempotency and/or database uniqueness;
- use a per-key distributed lock if the same instrument/period can be processed concurrently;
- use transactional upsert;
- retries must not duplicate rows;
- retry transient provider failures with exponential backoff and jitter according to project policy;
- classify permanent validation/data errors separately from transient transport errors;
- expose failed jobs through existing dead-letter/error monitoring conventions.

### 7.4. Reconciliation

Reconciliation should compare expected calendar target periods against stored calculation records within a bounded lookback. It must not scan/recalculate the full history on every run. It should:

- identify missing expected periods;
- compare current source hashes with persisted hashes;
- enqueue bounded backfill/recalculation jobs;
- be safe to repeat.

## 8. Backend service and API contract

### 8.1. Service boundary

Suggested logical service methods:

```ts
interface FibonacciPivotService {
  getLevels(params: {
    instrumentUid: string;
    chartTimeframe: '5m' | '1h';
    from: Date;
    to: Date;
  }): Promise<FibonacciPivotPeriodDto[]>;

  backfill(params: {
    instrumentUid: string;
    chartTimeframe: '5m' | '1h';
    from: Date;
    to: Date;
  }): Promise<BackfillJobReference>;
}
```

The exact API route and response envelope must match existing API conventions.

### 8.2. Recommended read endpoint

```http
GET /api/v1/instruments/{instrumentUid}/indicators/fibonacci-pivots
    ?timeframe=5m
    &from=2026-11-01T00:00:00.000Z
    &to=2026-11-10T00:00:00.000Z
```

Query rules:

- `timeframe` is required and must be `5m` or `1h`;
- `from` and `to` are required ISO-8601 timestamps with timezone/UTC offset;
- require `from < to`;
- validate maximum range / page size using existing API conventions;
- resolve canonical instrument UID and verify market-data support;
- do not accept a client-supplied reference timeframe that can contradict the fixed mapping.

### 8.3. Response DTO

```ts
export interface FibonacciPivotPeriodDto {
  sourcePeriod: {
    id: string;
    timeframe: '1D' | '1W';
    start: string; // ISO UTC
    end: string; // ISO UTC
    high: string; // decimal string
    low: string;
    close: string;
    provider: string;
    candleSource: string;
    aggregationMethod: 'NATIVE' | 'AGGREGATED';
    sourceHash: string;
  };
  validPeriod: {
    id: string;
    start: string; // inclusive ISO UTC
    end: string; // exclusive ISO UTC
  };
  values: {
    p: string;
    r1: string;
    r2: string;
    r3: string;
    s1: string;
    s2: string;
    s3: string;
  };
  algorithm: {
    id: 'FIBONACCI_PIVOT_POINTS';
    version: string;
    coefficients: ['0.382', '0.618', '1.000'];
  };
  calculatedAt: string;
}

export interface FibonacciPivotResponseDto {
  instrumentUid: string;
  chartTimeframe: '5m' | '1h';
  referenceTimeframe: '1D' | '1W';
  periods: FibonacciPivotPeriodDto[];
  meta: {
    requestedFrom: string;
    requestedTo: string;
    hasGaps: boolean;
    missingPeriodIds?: string[];
  };
}
```

Use decimal strings over JSON to avoid precision loss in transport. Keep exact names aligned to current project API standards.

### 8.4. Query semantics

Return every pivot segment whose validity interval intersects the requested chart range:

```text
validFrom < requestedTo AND validTo > requestedFrom
```

If the endpoint requires context for visible range boundaries, include the valid segment crossing the start/end. Do not return duplicate one-point rows per chart candle.

If a period is missing, either return `meta.hasGaps=true` with missing period IDs or use the project's established partial-data envelope. Do not fill the gap with stale/guessed levels.

### 8.5. Error handling

Follow existing API error format. Distinguish at least:

- invalid timeframe / date range;
- instrument not found or unsupported market;
- no historical source data;
- source data incomplete;
- provider temporarily unavailable;
- calculation data quality failure.

A valid request with no calculated periods may return an empty `periods` array with a useful `meta` state rather than a server error, if that matches API conventions.

## 9. Frontend: TanStack Charts v1 integration

### 9.1. Library and documentation requirements

- Use `@tanstack/charts` and the official React adapter `@tanstack/charts/react` when the app is React.
- Verify exact installed package versions and exports in `pnpm-lock.yaml` and installed `.d.ts` before writing imports. Do not copy API from another major version or from unreleased `main`.
- Current v1 documentation includes `defineChart`, marks and scales. The official React adapter renders a `Chart` from a framework-independent `definition`.
- The official Candlestick catalog example uses `link` to draw each candle wick (`Low` to `High`) and body (`Open` to `Close`), so use that as the implementation reference for candle rendering if the project does not already have it.

### 9.2. Relevant TanStack Charts primitives

| Primitive     | Use                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `defineChart` | Chart definition and composition                                                                          |
| `link`        | Independent finite segments with explicit endpoints; required for time-bounded pivot levels               |
| `text`        | Data-anchored labels for `P`, `R1`…`S3`, if the existing UI does not render labels in an external overlay |
| `ruleY`       | Full-width horizontal reference line; do NOT use for period-bounded pivot segments                        |
| `scaleUtc`    | Time scale for UTC `Date` values                                                                          |
| `scaleLinear` | Numeric price scale                                                                                       |
| React `Chart` | Chart rendering component                                                                                 |

Official docs say `link` draws one independent segment per row and accepts `x1`, `y1`, `x2`, `y2`; pass a stable key channel for keyed reconciliation. `ruleY` spans the complete inner chart width and is therefore not suitable for the period-bounded levels.

### 9.3. Imports and chart construction

Use the official docs and installed package's exports as source of truth. The current official candlestick example uses this general pattern:

```ts
import { defineChart, link } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear, scaleUtc } from 'd3-scale';
```

Do not assume every scale is exported from `@tanstack/charts/scales/*`; the official current Candlestick example imports `scaleLinear` and `scaleUtc` from `d3-scale`. Validate against installed declarations and app dependencies.

### 9.4. Frontend view model

Convert API periods into seven line-segment rows per valid period:

```ts
export type PivotLevelName = 'P' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3';

export interface PivotSegment {
  id: string;
  periodId: string;
  level: PivotLevelName;
  x1: Date; // validPeriod.start
  x2: Date; // validPeriod.end, exclusive boundary
  y1: number; // exact decimal converted to chart numeric representation at UI boundary
  y2: number; // same as y1
}
```

Implementation requirements:

- Keep raw decimal strings in query/cache/domain DTO.
- Convert to JavaScript `number` only at the chart rendering boundary because chart scales consume numeric values.
- Validate conversion is finite and within supported precision. Do not use chart-rendered numbers as backend calculation inputs.
- Build stable IDs from `(instrumentUid, chartTimeframe, validPeriodId, level, algorithmVersion)`.
- Do not create one point per chart candle for a flat level.

### 9.5. Mark creation

Create independent `link` marks for each visual group or one mark with per-datum style channels, following the installed TanStack Charts API. Use `key: 'id'` (or exact v1 key channel syntax) to guarantee stable keyed reconciliation.

Conceptual shape:

```ts
const pivotSegments = toPivotSegments(response.periods);
const pivotDefinition = defineChart({
  marks: [
    link(pivotSegments, {
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      key: 'id',
      stroke: (d) => (d.level === 'P' ? pivotPalette.p : pivotPalette.level),
      strokeWidth: (d) => (d.level === 'P' ? 1.5 : 1),
    }),
  ],
  scales: {
    x: { scale: scaleUtc },
    y: { scale: scaleLinear },
  },
});
```

This is a conceptual integration sample, not a guarantee that callback/channel syntax is identical across all package versions. Verify the installed v1 `LinkOptions` types before merging. The mathematical/service module must remain independent of this code.

### 9.6. Candlestick composition

The pivot layer must be composed into the same price chart definition as candles, sharing the same X and Y scales. Do not mount an independent pivot chart over the candle chart with unrelated scales.

- Draw pivot segments behind candles if matching the supplied reference image; keep their labels legible above candles.
- In the TanStack definition, mark order controls visual composition; confirm actual painter order in a visual test.
- Keep volume in the existing volume pane/view and do not force volume onto the price Y scale.
- If a custom candle body mark is already implemented, reuse it. Otherwise use the official Candlestick catalog `link` pattern as a baseline and verify candle body width at both 5m and 1h zoom levels.

### 9.7. Level labels

- Labels must read exactly `P`, `R1`, `R2`, `R3`, `S1`, `S2`, `S3`.
- Use `text` mark or current chart label system only after validating API.
- Do not render seven copies per historical candle.
- Prefer labels for segments intersecting the visible right edge / current valid period. Avoid label clutter when multiple historical periods are visible.
- Label Y is the corresponding price value; X is the valid segment's visible end/right edge, clipped to viewport if segment extends past viewport.
- Format price with instrument's display precision; do not round stored values.

### 9.8. Scales and viewport

- Use the same UTC time scale as candles.
- Use the same price scale as candles.
- Keep X-domain/viewport ownership in the existing TradingChart component.
- Decide and test whether Y-domain includes enabled pivot levels outside current candle range. Recommended initial policy: include visible pivot levels in Y extent only when they would otherwise be clipped; prevent extreme off-screen levels from collapsing candle readability. If the project already has a consistent indicator-scale policy, reuse it.
- On `5m` ↔ `1h` switch, fetch the corresponding pivot mapping and chart candles; do not merely relabel one set of levels.
- When the visible time range changes, fetch levels intersecting that range plus one adjacent period on each edge if needed for labels/context.

### 9.9. React update and performance

- `Chart`'s `definition` identity is the update boundary; memoize/rebuild only when candle/level data, timeframe, viewport or chart settings actually change.
- Keep data transform pure and memoized.
- Query/cache keys must include `(instrumentUid, chartTimeframe, from, to, algorithmVersion)`.
- Do not recompute pivots during mouse move, crosshair update, tooltip display or every new 5m/1h candle.
- The default React chart renderer is SVG. Use selective Canvas renderer only after profiling; pivot segments are typically few (7 per period) and should remain in SVG unless measured performance says otherwise.
- Avoid relying on `link`'s native focus point for pivot tooltip semantics: a link's interaction coordinate is its midpoint and semantic X/Y correspond to the second endpoint. Resolve the pivot segment for a crosshair timestamp with the half-open interval check `validFrom <= cursorTime < validTo` and feed the values to the existing chart tooltip model.

### 9.10. Suggested frontend organization

Adapt to actual feature structure:

```text
trading-chart/
  layers/
    fibonacci-pivots/
      fibonacci-pivots.layer.ts
      fibonacci-pivots.adapter.ts
      fibonacci-pivots.types.ts
      fibonacci-pivots.labels.ts
  hooks/
    useFibonacciPivotLevels.ts
  adapters/
    tanstack-charts/
      chart.factory.ts
```

No Fibonacci formula belongs in the frontend.

## 10. Rendering semantics and reference-image matching

The supplied reference screenshots show period-bounded horizontal levels labelled `P`, `R1`–`R3`, `S1`–`S3`. The feature must reproduce that general behavior, not necessarily every pixel, color, or unspecified TradingView setting.

Initial styling defaults (defer to existing theme tokens):

| Level group | Suggested style                                                             |
| ----------- | --------------------------------------------------------------------------- |
| `P`         | Distinct accent line, slightly thicker                                      |
| `R1`–`R3`   | Resistance color, normal width                                              |
| `S1`–`S3`   | Support color; it may share the resistance hue if matching the reference UI |
| Labels      | Same group color, compact, readable                                         |

Requirements:

- Each segment starts at valid period start and ends at valid period end.
- Segments must not extend over a holiday or non-trading target period unless the chart's exchange calendar explicitly includes it in the same valid period.
- Historical levels remain visible over their own target periods when user pans backward.
- Current active period displays levels derived from the previous completed source period.
- No level line is generated if source data is absent or incomplete.
- The seven levels must map correctly to the shared chart price scale.

## 11. Tests and verification

### 11.1. Calculator unit tests

Use exact decimal expected values. Fixture:

```text
H = 110
L = 90
C = 100
D = 20
P = 100

R1 = 107.64
R2 = 112.36
R3 = 120

S1 = 92.36
S2 = 87.64
S3 = 80
```

Required cases:

- valid normal OHLC;
- `close === high`;
- `close === low`;
- `high === low` degenerate range;
- `high < low` rejection;
- close outside `[low, high]` rejection;
- missing/NaN/infinite/unparsable input rejection;
- exact decimal behavior and no premature tick-size rounding;
- output ordering: `R1 < R2 < R3`, `S1 > S2 > S3`, and `S3 <= P <= R3` for non-negative range.

### 11.2. Calendar/aggregation tests

Use deterministic mocked calendar fixtures, plus a real calendar adapter integration test where available:

- ordinary business trading day;
- weekend and public holiday;
- short/partial trading session;
- futures evening session that crosses a calendar date;
- weekly boundary with holiday;
- year boundary;
- historical schedule change;
- no-trading period;
- source candle whose timestamp is near a period boundary.

Assert exact `[start, end)` period bounds and previous-period mapping.

### 11.3. Provider adapter tests

- correct interval enum mapping (`DAY`, `WEEK`, and chart `5_MIN` / `HOUR`);
- explicit `CANDLE_SOURCE_EXCHANGE`;
- UTC `from` / `to` conversion;
- respect documented chunk and `limit` ceilings;
- normalize `is_complete` / `isComplete`;
- incomplete candles are rejected by calculation pipeline;
- source `time` and candle source preserved;
- pagination/chunk boundary duplicates removed;
- retry behavior for rate limit / transient errors;
- instrument first-available-history boundary handled without fake values.

### 11.4. Historical generator tests

- first target period uses previous completed source period;
- current source period is never used to calculate its own levels;
- missing previous source produces explicit gap;
- weekend/holiday does not create fabricated period;
- records are chronologically sorted;
- historical generation is deterministic;
- backfill includes one prior reference period;
- correction of source OHLC changes only dependent target period(s);
- identical rerun is idempotent;
- algorithm/config version change produces distinguishable records.

### 11.5. API tests

- timeframe `5m` maps to `1D`;
- timeframe `1h` maps to `1W`;
- unsupported timeframe rejected;
- invalid date range rejected;
- intersection query uses `valid_from < to AND valid_to > from`;
- decimal prices serialized as strings;
- gaps reported explicitly;
- authorization follows existing API policy;
- missing instrument and missing source data handled according to API contract.

### 11.6. TanStack Charts tests

- each pivot level becomes exactly one segment per valid period;
- each segment has `x1=validFrom`, `x2=validTo`, `y1=y2=levelValue`;
- stable segment IDs;
- level timeframe mapping correct after 5m/1h switch;
- chart and pivot layer share the same X and Y scale definitions;
- historical segments are clipped by viewport rather than recalculated;
- `ruleY` is not used for finite period segments;
- labels do not multiply per candle;
- current chart tooltip at cursor time resolves the correct active period;
- visual regression/screenshot test checks no gaps, off-by-one boundaries, scale mismatch or candle obstruction.

### 11.7. No-look-ahead/backtest tests

For every generated target period `T`:

```text
sourcePeriod.end <= T.start
```

And all source candle data must have been complete by `T.start`. No data whose timestamp/completion is after target start may influence the levels.

### 11.8. Reference validation on NG-12.26

Use the same:

- instrument UID / contract;
- provider source type;
- daily/weekly OHLC source periods;
- trading session interpretation;
- completed period;
- coefficient values;
- algorithm formula.

Compare all seven levels with an independently calculated reference (e.g. manually computed fixture or TradingView Fibonacci Pivot Points with matching reference timeframe and source OHLC). Store a test fixture with source OHLC and expected level values. Do not compare only visual similarity; compare numeric level values and effective time boundaries.

The screenshot label `PivotsFibonacci Auto 15` does not uniquely prove every indicator setting. The implementation must follow the explicitly approved `5m → 1D` and `1h → 1W` configuration, not attempt to reverse-engineer unspecified `Auto 15` behavior.

## 12. Observability and operations

Expose structured logs/metrics using project conventions:

- number of completed source periods fetched;
- number of generated/updated pivot periods;
- number of skipped incomplete periods;
- number of invalid source candles;
- number of missing-period gaps;
- provider latency, errors and rate limits;
- backfill duration and records per batch;
- calculation lag from reference period close to persisted levels;
- source hash mismatch / recalculation count;
- job retries and dead-letter count.

Logs must contain canonical `instrumentUid`, chart timeframe, reference timeframe, source period ID, valid period ID, algorithm version and job correlation ID. Do not log bearer tokens or secrets.

## 13. Implementation sequence

Use this order unless repository dependencies require a different dependency graph:

### Phase 0 — Repository reconnaissance

- [ ] Inspect monorepo and document existing architecture.
- [ ] Identify current T-Invest client, candle schema, candle store, calendar, jobs, database and TanStack Charts versions.
- [ ] Confirm TanStack package exports from installed type declarations.
- [ ] Record any deviations from this spec before implementation; do not change business semantics.

### Phase 1 — Domain core

- [ ] Define types and stable config.
- [ ] Implement pure decimal Fibonacci Pivot Calculator.
- [ ] Implement validation and diagnostic codes.
- [ ] Complete calculator unit tests.

### Phase 2 — Market data and calendar

- [ ] Implement/reuse T-Invest adapter for completed `1D` and `1W` candles.
- [ ] Add completeness/source normalization.
- [ ] Integrate the exchange calendar and period resolver.
- [ ] Prove DAY/WEEK candle alignment for NG-12.26.
- [ ] Implement aggregation fallback only if the alignment/data gate requires it.
- [ ] Complete provider and calendar tests.

### Phase 3 — Historical generation and persistence

- [ ] Implement historical generator and previous-period mapping.
- [ ] Add migration/repository/upsert.
- [ ] Implement bounded backfill with chunking.
- [ ] Test idempotency, correction handling and no-look-ahead.

### Phase 4 — Workers

- [ ] Add daily, weekly, correction and reconciliation jobs.
- [ ] Add idempotency and locks using project patterns.
- [ ] Add retry policy and metrics.
- [ ] Verify recovery after missed schedule/provider outage.

### Phase 5 — API

- [ ] Add DTO/schema validation.
- [ ] Add range-intersection query and mapped timeframe response.
- [ ] Add API tests and API documentation.

### Phase 6 — TanStack Charts frontend

- [ ] Add API query hook/cache integration.
- [ ] Map API DTO to `PivotSegment[]`.
- [ ] Add `link` overlay in the same chart definition as candles.
- [ ] Add labels with `text` or current annotation system.
- [ ] Verify shared scales, viewport, tooltip and performance.
- [ ] Add visual tests for 5m and 1h.

### Phase 7 — Acceptance and rollout

- [ ] Backfill NG-12.26 test range.
- [ ] Compare numeric levels to independent reference.
- [ ] Verify chart visually against supplied screenshots.
- [ ] Run all relevant CI checks.
- [ ] Roll out behind existing feature flag/config if the project has this mechanism.
- [ ] Expand to other instruments only after NG-12.26 passes.

## 14. Definition of Done

Implementation is accepted only when all applicable statements are true:

- [ ] `5m` chart requests use previous completed `1D` exchange period.
- [ ] `1h` chart requests use previous completed `1W` exchange period.
- [ ] Fibonacci coefficients and formulas match Section 2 exactly.
- [ ] OHLC values come from completed provider candles or tested calendar-aligned aggregation.
- [ ] Native provider candle and calendar period semantics are verified for NG-12.26.
- [ ] MOEX weekends, holidays, partial sessions and evening futures sessions are handled by the trading calendar.
- [ ] Source and validity period boundaries are stored separately.
- [ ] Every historical segment has exact validity `[validFrom, validTo)`.
- [ ] No look-ahead bias exists in historical generation or backtests.
- [ ] Missing/incomplete/invalid periods are surfaced as gaps, not fabricated.
- [ ] PostgreSQL uses exact decimal storage for prices and pivot values.
- [ ] Backfill is chunked, bounded and idempotent.
- [ ] Daily/weekly workers run only after source completion and recover from missed runs.
- [ ] Source corrections can trigger bounded dependent recalculation.
- [ ] REST API returns timeframe mapping and decimal-string levels.
- [ ] TanStack Charts uses `link` for period-bounded level segments.
- [ ] Pivot levels and candles share chart scales and viewport.
- [ ] Labels are readable and not duplicated per candle.
- [ ] All unit, integration, API and visual tests pass.
- [ ] NG-12.26 numeric reference validation is documented.
- [ ] No unrelated architecture or dependencies were changed without justification.

## 15. Explicit assumptions and unresolved repository-specific details

The coding agent must resolve these by inspecting the repository, not by asking the user to repeat already-approved product choices:

1. **Actual package paths:** use existing monorepo boundaries; path examples in this document are logical, not mandatory.
2. **Database migration conventions:** use the project's migration tool and naming rules.
3. **Worker/queue API:** reuse the actual scheduler, queue, retry and lock abstractions.
4. **Trading calendar provider:** reuse the existing authoritative MOEX calendar if present. If absent, identify and document the approved source and historical coverage before relying on it.
5. **T-Invest SDK shape:** normalize the installed SDK's exact generated types; do not assume REST snake_case equals TS camelCase.
6. **TanStack Charts version:** use the installed version in the lockfile, validate `link`, `text`, scales, chart adapter and renderer imports against that version.
7. **Chart Y-domain policy:** preserve the current trading chart's scale behavior if already established; otherwise implement and test the policy in Section 9.8.
8. **Existing chart candle implementation:** reuse it rather than rewriting candlesticks as part of this indicator unless it is absent or cannot compose with the new overlay.
9. **Historical data availability:** T-Invest states first historical date and history depth can vary by instrument and interval; handle this as partial history, not a calculation bug.
10. **Reference image compatibility:** screenshots show the desired segment/label behavior, but unspecified TradingView settings are not inferred. Approved timeframe mapping in Section 1 is authoritative.

## 16. Official references

Use these sources as references and re-check them during implementation because APIs and limits can change.

### T-Invest API

- GetCandles endpoint and interval/limit/source parameters: https://developer.tbank.ru/invest/api/market-data-service-get-candles
- Historical quote loading, history windows and `limit` guidance: https://developer.tbank.ru/invest/intro/intro/load_history
- Market data service and `HistoricCandle` fields, including UTC `time` and completion flag: https://developer.tbank.ru/invest/services/quotes/marketdata
- Market data FAQ / instrument first-candle metadata: https://developer.tbank.ru/invest/services/quotes/faq_marketdata/

### MOEX

- Evening trading session background; use the current interactive calendar and instrument-specific session schedule for actual boundaries: https://www.moex.com/a2732
- Interactive Trading Calendar: https://www.moex.com/ru/tradingcalendar

### TanStack Charts

- API reference: https://tanstack.com/charts/latest/docs/reference/index
- Chart definitions: https://tanstack.com/charts/latest/docs/reference/chart-definitions
- Rules, links, arrows, vectors and ticks; `link` vs full-width `ruleY`: https://tanstack.com/charts/latest/docs/reference/marks/rules-links-arrows-vectors-and-ticks
- Text marks: https://tanstack.com/charts/latest/docs/reference/marks/text-frame-and-facet
- React Chart component: https://tanstack.com/charts/latest/docs/framework/react/reference/chart
- Official candlestick example using `link` for wick and body: https://tanstack.com/charts/catalog/charts/28-candlestick

---

## Final instruction to the implementation agent

Implement the feature end-to-end within the existing repository. The two approved mappings are immutable unless the product owner explicitly changes them: **5m → previous completed 1D MOEX trading period; 1h → previous completed 1W MOEX trading period**. All levels are Fibonacci Pivot Points calculated from previous-period H/L/C. Keep the backend algorithm independent from TanStack Charts. Render the time-bounded segments through TanStack Charts `link` in the same coordinate system as the candlesticks. Preserve exact time boundaries, source provenance, decimal precision and no-look-ahead guarantees. Validate on NG-12.26 before enabling for the full instrument universe.
