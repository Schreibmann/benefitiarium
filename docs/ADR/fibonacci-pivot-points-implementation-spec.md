---

spec_id: fibonacci-pivot-points
spec_version: 1.0.0
status: implementation-ready-with-explicit-verification-gates
language: ru-RU+en-US
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

# Fibonacci Pivot Points — Implementation Specification / Fibonacci Pivot Points — спецификация реализации

**RU.** Машиночитаемая техническая спецификация для автономного coding agent. Документ задаёт поведение, контракты, ограничения, порядок реализации и критерии приёмки. Агент обязан сначала исследовать существующий репозиторий и адаптировать имена/пути/инфраструктуру под его фактическую структуру, не меняя зафиксированную бизнес-семантику.

**EN.** Machine-readable technical specification for an autonomous coding agent. The document defines behavior, contracts, constraints, implementation order, and acceptance criteria. The agent must explore the existing repository first and adapt names/paths/infrastructure to its actual layout without changing the fixed business semantics.

## 0. Agent execution contract / Контракт исполнения для агента

### 0.1. Required behavior / Обязательное поведение

**RU.**

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

**EN.**

1. Study `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, the structure of `apps/` and `packages/`, and existing market data, candles, instruments, technical analysis, workers, migrations, API, and chart UI modules.
2. Find existing implementations of: T-Invest API client; candle and `Quotation` normalization; historical candle storage; instrument definitions and identifiers; trading calendar/schedule; background jobs, queues, retries, and distributed locks; PostgreSQL repositories and migrations; REST conventions, DTO validation, API errors; TanStack Charts integration and chart state/time viewport.
3. Reuse existing abstractions. Do not create a second candle store, API client, queue, or parallel chart framework.
4. Do not invent exact file paths or mechanically copy the suggested directory tree below. Follow repository conventions.
5. Do not add new decimal, calendar, queue, or chart libraries until existing dependencies are checked. If functionality is missing, pick a minimal compatible dependency and justify it in the report.
6. Do not change formulas, coefficients, timeframe mapping, or time semantics without an explicit product-owner decision.
7. Implement backend math/data pipeline and its tests first, then API, then frontend overlay. Do not block backend delivery on optional visual polish.
8. After each phase, run relevant lint, typecheck, unit, and integration tests; at the end, run all project checks.
9. Do not leave pseudocode, `TODO`, placeholder values, or skipped implementations on the production path.
10. In the final report, list changed files, migrations, verification commands, test results, limitations, and open questions.

### 0.2. Scope boundaries / Границы объёма

**RU. Входит в задачу:**

- Fibonacci Pivot Points;
- исходные OHLC дневного и недельного интервалов;
- расчёт и историческое построение уровней;
- корректная временная привязка по биржевым торговым периодам MOEX;
- хранение результатов и инкрементальная актуализация;
- REST API для 5m и 1h графиков;
- слой отображения уровней в TanStack Charts;
- unit, integration и acceptance tests;
- проверка совпадения на инструменте NG-12.26.

**EN. In scope:**

- Fibonacci Pivot Points;
- source OHLC for daily and weekly intervals;
- calculation and historical level construction;
- correct time alignment by MOEX exchange trading periods;
- result storage and incremental updates;
- REST API for 5m and 1h charts;
- level display layer in TanStack Charts;
- unit, integration, and acceptance tests;
- match verification on instrument NG-12.26.

**RU. Не входит без отдельного согласования:**

- Fibonacci Retracement между swing high/swing low;
- автоматическое определение swing points;
- торговые сигналы, входы/выходы, stop-loss и take-profit;
- исполнение заявок;
- оптимизация торговых стратегий;
- новые chart engines или замена текущего графического движка;
- настройка пользовательских коэффициентов Fibonacci через UI;
- другие методы Pivot Points (Classic, Woodie, Camarilla и т. п.).

**EN. Out of scope without separate agreement:**

- Fibonacci Retracement between swing high/swing low;
- automatic swing-point detection;
- trading signals, entries/exits, stop-loss and take-profit;
- order execution;
- trading strategy optimization;
- new chart engines or replacing the current chart engine;
- user-configurable Fibonacci coefficients in the UI;
- other Pivot Points methods (Classic, Woodie, Camarilla, etc.).

## 1. Зафиксированные продуктовые решения / Fixed product decisions

**RU.** Таблица фиксирует обязательные продуктовые значения; идентификаторы кода и путей не переводятся.

**EN.** The table fixes required product values; code identifiers and paths are not translated.

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

### 1.1. Mapping / Соответствие таймфреймов

```ts
export const FIBONACCI_PIVOT_TIMEFRAME_MAP = {
  '5m': '1D',
  '1h': '1W',
} as const;
```

**RU.** Mapping должен существовать в одном backend domain/config module и быть согласован с API. Frontend не должен независимо вычислять reference timeframe по собственным правилам. Backend response возвращает фактический `referenceTimeframe`.

**EN.** Mapping must live in one backend domain/config module and stay aligned with the API. The frontend must not independently derive reference timeframe by its own rules. The backend response returns the actual `referenceTimeframe`.

### 1.2. Important interpretation / Важная интерпретация

**RU.** Уровни для целевого периода `N` рассчитываются по OHLC предыдущего завершённого биржевого периода `N-1` и действуют на целевой период `N`.

- Для 5m chart: daily OHLC предыдущего торгового дня → семь уровней для следующего торгового дня.
- Для 1h chart: weekly OHLC предыдущей торговой недели → семь уровней для следующей торговой недели.

Не рассчитывать дневные уровни по предыдущей 5m-свече и недельные уровни по предыдущей 1h-свече.

**EN.** Levels for target period `N` are calculated from OHLC of the previous completed exchange period `N-1` and apply to target period `N`.

- For 5m chart: previous trading day daily OHLC → seven levels for the next trading day.
- For 1h chart: previous trading week weekly OHLC → seven levels for the next trading week.

Do not derive daily levels from the previous 5m candle or weekly levels from the previous 1h candle.

## 2. Mathematical specification / Математическая спецификация

### 2.1. Input / Вход

```ts
export interface PivotSourceOHLC {
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
}
```

**RU.** `DecimalLike` — существующий в проекте тип точной десятичной арифметики. Для финансовых цен не выполнять промежуточные вычисления через двоичный JavaScript `number`, если проект уже использует Decimal/BigNumber или другую точную модель.

**EN.** `DecimalLike` is the project's exact decimal arithmetic type. For financial prices, do not perform intermediate calculations via binary JavaScript `number` if the project already uses Decimal/BigNumber or another exact model.

### 2.2. Formula / Формула

**EN.** Let:

**RU.** Обозначения:

- `H` = high of previous completed reference period;
- `L` = low of previous completed reference period;
- `C` = close of previous completed reference period;
- `D = H - L`;
- `P = (H + L + C) / 3`.

**EN.** Fibonacci coefficients:

**RU.** Коэффициенты Fibonacci:

```ts
const FIBONACCI_COEFFICIENTS = {
  first: '0.382',
  second: '0.618',
  third: '1.000',
} as const;
```

**EN.** Levels:

**RU.** Уровни:

```text
R1 = P + D * 0.382
R2 = P + D * 0.618
R3 = P + D * 1.000

S1 = P - D * 0.382
S2 = P - D * 0.618
S3 = P - D * 1.000
```

### 2.3. Output contract / Контракт выхода

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

### 2.4. Validation / Валидация

**EN.** Reject input when any required value is missing, non-finite, unparsable, or:

**RU.** Отклонять вход, если обязательное значение отсутствует, не конечно, не разбирается или:

- `H < L`;
- `C < L`;
- `C > H`.

**EN.** Do not silently repair invalid OHLC. Record a structured validation error with instrument, timeframe, candle timestamp and provider source.

**RU.** Не чинить невалидный OHLC молча. Записывать структурированную ошибку валидации с инструментом, таймфреймом, временем свечи и источником провайдера.

**EN.** `H === L` is a degenerate but mathematically valid range: `D = 0`, all seven output levels equal `P = H = L = C`. Do not divide by the range. Emit a diagnostic/quality flag such as `DEGENERATE_RANGE`; do not fabricate non-zero levels.

**RU.** `H === L` — вырожденный, но математически допустимый диапазон: `D = 0`, все семь уровней равны `P = H = L = C`. Не делить на диапазон. Выставлять диагностический флаг вроде `DEGENERATE_RANGE`; не подставлять ненулевые уровни.

### 2.5. Precision and tick size / Точность и размер тика

**EN.**

- Keep full calculation precision in backend and database.
- Do not round to instrument `min_price_increment` during the calculation.
- Round/format only at the UI boundary using instrument metadata.
- For order pricing, if ever used by another feature, apply tick-size rounding in that execution/risk domain; this indicator must not silently apply order-price rounding.
- Preserve the instrument price currency and quotation units. Do not multiply or divide by lot size: T-Invest candle OHLC is price per instrument unit.

**RU.**

- Сохранять полную точность расчёта в бэкенде и БД.
- Не округлять до `min_price_increment` инструмента во время расчёта.
- Округлять/форматировать только на границе UI по метаданным инструмента.
- Для цены ордера, если её использует другая фича, округление по тику — в домене исполнения/риска; этот индикатор не должен молча округлять цену ордера.
- Сохранять валюту цены и единицы котировки инструмента. Не умножать/делить на лот: OHLC T-Invest — цена за единицу инструмента.

## 3. Time model and MOEX trading calendar / Временная модель и торговый календарь MOEX

### 3.1. Fundamental rule / Фундаментальное правило

**EN.** Never infer MOEX trading periods with generic calendar arithmetic such as:

**RU.** Не выводить торговые периоды MOEX обычной календарной арифметикой, например:

```ts
new Date(timestamp).setHours(0, 0, 0, 0);
DATE_TRUNC('day', timestamp);
periodStart + 24 * 60 * 60 * 1000;
periodStart + 7 * 24 * 60 * 60 * 1000;
```

**EN.** These approaches do not correctly model exchange holidays, non-trading days, evening sessions, clearing breaks, schedule changes, futures trading dates and partial sessions.

**RU.** Такие подходы не моделируют праздники биржи, не торговые дни, вечерние сессии, клиринговые перерывы, смену расписания, торговые даты фьючерсов и укороченные сессии.

### 3.2. Required abstraction / Требуемая абстракция

**EN.** Use the repository's existing exchange calendar if available. Otherwise introduce a domain abstraction, not indicator-specific timestamp arithmetic:

**RU.** Использовать существующий биржевой календарь репозитория, если он есть. Иначе ввести доменную абстракцию, а не арифметику timestamp внутри индикатора:

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

**EN.** Adapt signatures to existing calendar conventions where possible. `end` is exclusive, and all instants are stored in UTC.

**RU.** Адаптировать сигнатуры к существующим конвенциям календаря, где возможно. `end` исключающий; все моменты хранятся в UTC.

### 3.3. MOEX futures requirement / Требования MOEX-фьючерсов

**EN.** The initial validation instrument is a MOEX natural-gas futures contract. Its evening/night activity and exchange trading-date definition must be respected. Do not assume the evening session belongs to the calendar date on which its wall-clock timestamp falls. Resolve this through the exchange calendar/provider candle semantics and verify with NG-12.26 fixtures.

**RU.** Первый валидационный инструмент — фьючерс на природный газ MOEX. Учитывать вечернюю/ночную активность и биржевое определение торговой даты. Не считать, что вечерняя сессия относится к календарной дате по wall-clock timestamp. Решать через биржевой календарь/семантику свечей провайдера и проверять фикстурами NG-12.26.

**EN.** The exchange schedule can change. Do not hardcode one universal opening/closing time for every instrument, market, historical year and session. The calendar implementation must support historical schedule data or delegate to the project's authoritative market calendar source.

**RU.** Расписание биржи может меняться. Не хардкодить одно универсальное время открытия/закрытия для всех инструментов, рынков, лет и сессий. Реализация календаря должна поддерживать историческое расписание или делегировать авторитетному источнику календаря проекта.

### 3.4. Period boundaries / Границы периодов

**EN.**

- Periods are half-open intervals: `[start, end)`.
- No synthetic daily periods for Saturdays, Sundays or exchange holidays.
- No synthetic weekly periods for weeks with no trading sessions unless required by the calendar domain.
- The next valid trading period after a holiday/weekend is the next period returned by the calendar.
- Weekly bounds follow the exchange trading calendar, not a naïve Monday 00:00 through Sunday 23:59:59 UTC interval.
- Keep reference period bounds separate from the period in which calculated levels are valid.

**RU.**

- Периоды — полуинтервалы `[start, end)`.
- Не создавать синтетические дневные периоды для субботы, воскресенья и праздников биржи.
- Не создавать синтетические недельные периоды для недель без торгов, если домен календаря этого не требует.
- Следующий валидный торговый период после праздника/выходных — следующий период из календаря.
- Недельные границы по торговому календарю биржи, а не наивный интервал пн 00:00 — вс 23:59:59 UTC.
- Границы reference-периода отдельно от периода действия рассчитанных уровней.

### 3.5. Calendar/provider alignment gate / Сверка календаря и провайдера

**EN.** Before production backfill, prove that T-Invest native `DAY` and `WEEK` candles map to the same MOEX trading periods used by the chart and strategy layer for the instrument. Compare provider `time`, `is_complete`, `candle_source`, OHLC, and calendar period assignment.

**RU.** Перед продакшен-backfill доказать, что нативные свечи T-Invest `DAY` и `WEEK` соответствуют тем же торговым периодам MOEX, что график и слой стратегии для инструмента. Сверять `time`, `is_complete`, `candle_source`, OHLC и назначение периода календарём.

**EN.** If provider daily/weekly candle timestamps do not unambiguously identify those periods, implement a tested provider-time-to-calendar-period mapping or an aggregation fallback. Do not assume `time + 24h` / `time + 7d` equals period end.

**RU.** Если timestamp дневных/недельных свечей провайдера однозначно не задаёт периоды — реализовать проверенное отображение время-провайдера → период календаря или fallback агрегации. Не предполагать, что `time + 24h` / `time + 7d` равно концу периода.

## 4. T-Invest market data integration / Интеграция рыночных данных T-Invest

### 4.1. Reuse provider adapter / Переиспользование адаптера провайдера

**EN.** Use the project's existing T-Invest API client and instrument resolver. Do not create direct HTTP calls in the indicator service and do not store tokens in this module.

**RU.** Использовать существующий клиент T-Invest API и резолвер инструментов проекта. Не делать прямых HTTP-вызовов в сервисе индикатора и не хранить токены в этом модуле.

**EN.** Use canonical `instrument_uid` for internal identity. A ticker/class code such as `NG-12.26` is a lookup/display key, not the database identity.

**RU.** Внутренней идентичностью служит канонический `instrument_uid`. Ticker/class code вроде `NG-12.26` — ключ поиска/отображения, а не идентификатор в БД.

### 4.2. Reference candle intervals / Интервалы reference-свечей

**EN.** Preferred source intervals:

**RU.** Предпочтительные интервалы источника:

| Chart | Reference data interval | T-Invest enum          |
| ----- | ----------------------- | ---------------------- |
| 5m    | 1 day                   | `CANDLE_INTERVAL_DAY`  |
| 1h    | 1 week                  | `CANDLE_INTERVAL_WEEK` |

**EN.** Use explicit exchange candle source for MOEX-only calculations:

**RU.** Явный биржевой источник свечей для расчётов только MOEX:

```text
candleSourceType = CANDLE_SOURCE_EXCHANGE
```

**EN.** Do not rely on `CANDLE_SOURCE_UNSPECIFIED` when the business requirement explicitly means exchange candles. Do not include weekend candle source unless the relevant market/instrument and product decision explicitly requires it.

**RU.** Не полагаться на `CANDLE_SOURCE_UNSPECIFIED`, когда бизнес-требование явно означает биржевые свечи. Не включать weekend candle source, если рынок/инструмент и продуктовое решение этого явно не требуют.

### 4.3. Chart candle data is a separate request / Свечи графика — отдельный запрос

**EN.** The candles displayed on the main chart are independent of the reference candles used for pivots:

**RU.** Свечи на основном графике независимы от reference-свечей для pivot:

| Chart | Chart candle interval   |
| ----- | ----------------------- |
| 5m    | `CANDLE_INTERVAL_5_MIN` |
| 1h    | `CANDLE_INTERVAL_HOUR`  |

**EN.** Do not derive daily/weekly pivot inputs from the last visible chart candle. Keep source-reference and display-chart data pipelines separate.

**RU.** Не выводить дневной/недельный вход pivot из последней видимой свечи графика. Держать пайплайны reference-источника и отображения графика раздельно.

### 4.4. Candle DTO normalization / Нормализация DTO свечей

**EN.** Normalize generated/client DTO naming to one internal model. T-Invest REST/OpenAPI documentation may expose snake_case names, while generated TypeScript SDK types may use camelCase.

**RU.** Нормализовать именование generated/client DTO к одной внутренней модели. REST/OpenAPI T-Invest может отдавать snake_case, а сгенерированный TypeScript SDK — camelCase.

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

**EN.** The provider adapter must explicitly map `is_complete` / `isComplete` to `isComplete`. A missing completeness flag must not be interpreted as `true` in the pivot source pipeline.

**RU.** Адаптер провайдера должен явно маппить `is_complete` / `isComplete` в `isComplete`. Отсутствующий флаг полноты нельзя трактовать как `true` в pipeline источника pivot.

### 4.5. Completeness and look-ahead protection / Полнота и защита от look-ahead

**EN.** Only reference candles with `isComplete === true` may feed pivot calculations.

**RU.** В расчёт pivot допускаются только reference-свечи с `isComplete === true`.

**EN.**

- Ignore current daily candle until provider marks it complete.
- Ignore current weekly candle until provider marks it complete.
- Never replace a previous completed source candle with the currently forming candle.
- Do not use wall-clock estimation alone to declare a candle complete.
- Historical replay/backtesting must select only data available at the target period's start.

**RU.**

- Игнорировать текущую дневную свечу, пока провайдер не отметит её завершённой.
- Игнорировать текущую недельную свечу, пока провайдер не отметит её завершённой.
- Никогда не подменять завершённую source-свечу формирующейся.
- Не объявлять свечу завершённой только по wall-clock.
- Исторический replay/бэктест — только данные, доступные на старте целевого периода.

### 4.6. API history limits and chunking / Лимиты истории API и чанкинг

**EN.** T-Invest documents approximate limits that depend on interval and request parameters. At the time this specification was prepared, the documented limits include:

**RU.** T-Invest документирует приблизительные лимиты в зависимости от интервала и параметров запроса. На момент подготовки спецификации задокументированы, в частности:

| Interval | Approximate maximum request span | Maximum `limit` |
| -------- | -------------------------------: | --------------: |
| 5m       |                           1 week |            2400 |
| 1h       |                         3 months |            2400 |
| 1D       |                          6 years |            2400 |
| 1W       |                          5 years |             300 |

**EN.** Implementation requirements:

**RU.** Требования к реализации:

**EN.**

1. Read current official provider documentation and installed SDK contract before coding; these limits may change.
2. Chunk historical requests by both provider time-window and `limit`.
3. Use UTC `from` / `to` values.
4. Deduplicate by `(instrument_uid, interval, candle_time, candle_source)`.
5. Sort candles ascending before aggregation or generation.
6. Detect truncated pages/chunks; do not claim history is complete merely because the API returned HTTP 200.
7. Read instrument metadata for first available candle dates. History depth can differ by instrument and interval.
8. Handle 429, 5xx, timeouts and partial provider responses using the project's retry/backoff policy.
9. Do not issue unbounded large-history requests in one worker execution.

**RU.**

1. Перед кодом читать актуальную документацию провайдера и контракт установленного SDK; лимиты могут меняться.
2. Чанковать исторические запросы по окну времени провайдера и `limit`.
3. Использовать UTC для `from` / `to`.
4. Дедуплицировать по `(instrument_uid, interval, candle_time, candle_source)`.
5. Сортировать свечи по возрастанию перед агрегацией или генерацией.
6. Обнаруживать усечённые страницы/чанки; не считать историю полной из‑за HTTP 200.
7. Читать метаданные инструмента для первой доступной даты свечи; глубина истории зависит от инструмента и интервала.
8. Обрабатывать 429, 5xx, таймауты и частичные ответы по политике retry/backoff проекта.
9. Не отправлять неограниченные крупные запросы истории в одном выполнении worker.

### 4.7. Aggregation fallback / Fallback агрегации

**EN.** Native `DAY` and `WEEK` candles are preferred only after passing the calendar-alignment gate.

**RU.** Нативные свечи `DAY` и `WEEK` предпочтительны только после прохождения сверки календаря.

**EN.** If native interval data is unavailable or its boundaries differ from the agreed period definition:

**RU.** Если нативные данные интервала недоступны или границы не совпадают с согласованным определением периода:

**EN.**

- For `1D`, aggregate a supported lower interval (prefer the finest reliable existing source already stored, usually 1m or 5m) inside calendar-defined daily period boundaries.
- For `1W`, aggregate calendar-aligned daily candles into a calendar-defined trading week; if daily data is unavailable, aggregate lower interval candles according to the same calendar.
- Aggregate OHLC as `open = first.open`, `high = max(high)`, `low = min(low)`, `close = last.close`, `volume = sum(volume)` when volume is applicable.
- Do not include candles outside `[period.start, period.end)`.
- Require adequate coverage and a valid first/last candle according to the existing historical-data completeness policy.
- Record exact aggregation source interval and source provenance.
- Never mix native provider candles and locally aggregated candles in one period without an explicit source priority rule.

**RU.**

- Для `1D` агрегировать поддерживаемый младший интервал (предпочтительно самый мелкий надёжный уже сохранённый источник, обычно 1m или 5m) внутри дневных границ календаря.
- Для `1W` агрегировать дневные свечи по календарной неделе; если дневных нет — младший интервал по тому же календарю.
- OHLC: `open = first.open`, `high = max(high)`, `low = min(low)`, `close = last.close`, `volume = sum(volume)` где применимо.
- Не включать свечи вне `[period.start, period.end)`.
- Требовать достаточное покрытие и валидные первую/последнюю свечи по политике полноты исторических данных.
- Фиксировать интервал агрегации и происхождение источника.
- Не смешивать нативные свечи провайдера и локальную агрегацию в одном периоде без явного правила приоритета источника.

## 5. Domain model and calculation pipeline / Доменная модель и конвейер расчёта

### 5.1. Recommended domain types / Рекомендуемые доменные типы

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

**EN.** Adapt names to project style, but preserve source-period vs valid-period distinction.

**RU.** Адаптировать имена к стилю проекта, сохраняя различие source-period и valid-period.

### 5.2. Pure calculator / Чистый калькулятор

**EN.** Create a pure deterministic function:

**RU.** Создать чистую детерминированную функцию:

```ts
calculateFibonacciPivotPoints(
  source: Pick<ReferencePeriodOHLC, 'high' | 'low' | 'close'>,
): FibonacciPivotValues
```

**EN.** Constraints:

**RU.** Ограничения:

**EN.**

- no database calls;
- no HTTP calls;
- no reading system time;
- no timezone/calendar operations;
- no global mutable state;
- no UI/chart dependencies;
- deterministic output for identical normalized input and config.

**RU.**

- без обращений к БД;
- без HTTP;
- без чтения системного времени;
- без операций timezone/календаря;
- без глобального изменяемого состояния;
- без зависимостей UI/графика;
- детерминированный вывод при одинаковых нормализованных входе и конфиге.

### 5.3. Historical generator / Исторический генератор

**EN.** Input is a chronologically ordered list of complete reference periods plus calendar-resolved target periods.

**RU.** Вход — хронологически упорядоченный список завершённых reference-периодов плюс целевые периоды по календарю.

**EN.** Pseudo-contract:

**RU.** Псевдо-контракт:

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

**EN.** For each target period `T[n]`:

**RU.** Для каждого целевого периода `T[n]`:

**EN.**

1. Resolve the immediately previous exchange trading period `S[n-1]` of the mapped reference timeframe using the calendar (do not rely on adjacent array indices unless continuity has been validated).
2. Find the matching complete OHLC source for `S[n-1]`.
3. Validate its quality and provenance.
4. Calculate levels from `S[n-1].high`, `.low`, `.close`.
5. Persist/return the record with validity `[T[n].start, T[n].end)`.
6. If the previous valid source is absent/incomplete/invalid, emit an explicit gap/diagnostic and do not invent levels.

**RU.**

1. По календарю найти непосредственно предыдущий торговый период `S[n-1]` для сопоставленного reference-таймфрейма (не полагаться на соседние индексы массива без проверки непрерывности).
2. Найти полный OHLC-источник для `S[n-1]`.
3. Проверить качество и происхождение.
4. Рассчитать уровни по `S[n-1].high`, `.low`, `.close`.
5. Сохранить/вернуть запись с действием `[T[n].start, T[n].end)`.
6. Если предыдущий валидный источник отсутствует/неполон/невалиден — явный gap/диагностика, без выдуманных уровней.

**EN.** The backfill request for a visible `from` range must load at least one prior reference period before the earliest target period, otherwise the first target period cannot be calculated.

**RU.** Запрос backfill для видимого диапазона `from` должен загрузить минимум один prior reference-период до самого раннего целевого, иначе первый целевой период не рассчитать.

**EN.** Do not assign a source period's levels to that same source period. This is the key anti-look-ahead invariant.

**RU.** Не назначать уровни source-периода на тот же source-период. Ключевой инвариант anti-look-ahead.

### 5.4. Incremental update / Инкрементальное обновление

**EN.** When a new source period becomes complete:

**RU.** Когда новый source-период становится завершённым:

**EN.**

- resolve the next applicable target period;
- calculate and upsert only that target period's pivot record;
- do not recalculate every candle or every historical target period.

**RU.**

- определить следующий применимый целевой период;
- рассчитать и upsert только запись pivot этого целевого периода;
- не пересчитывать каждую свечу или все исторические целевые периоды.

**EN.** When a previously stored source candle is corrected:

**RU.** Когда ранее сохранённая source-свеча исправлена:

**EN.**

- recompute its canonical source hash;
- find the next target period that uses it;
- recalculate that target period;
- update downstream records only if their actual source inputs changed;
- preserve an audit trail or versioning according to repository conventions.

**RU.**

- пересчитать канонический `source_hash`;
- найти следующий целевой период, который его использует;
- пересчитать этот целевой период;
- обновить downstream-записи только если изменились фактические входы источника;
- сохранить audit trail или версионирование по конвенциям репозитория.

## 6. Persistence / Персистентность

### 6.1. Storage policy / Политика хранения

**EN.** Reuse the existing historical candle store. Add a dedicated pivot-results table only if the repository does not already have a generic indicator-result store suitable for period segments and algorithm versioning.

**RU.** Переиспользовать существующее хранилище исторических свечей. Отдельную таблицу результатов pivot добавлять только если в репозитории ещё нет универсального хранилища результатов индикаторов для сегментов периодов и версий алгоритма.

### 6.2. Proposed PostgreSQL table / Предлагаемая таблица PostgreSQL

**EN.** The following is a logical migration template; adapt UUID generation, naming, schema and migration conventions to the actual project.

**RU.** Ниже — логический шаблон миграции; адаптировать генерацию UUID, именование, схему и конвенции миграций под фактический проект.

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

### 6.3. Persistence rules / Правила персистентности

**EN.**

- Use `NUMERIC` for prices and levels.
- `valid_to` is exclusive.
- Persist source and target period metadata separately.
- `source_hash` must cover normalized source OHLC, source interval, source timestamp/period ID, candle source and aggregation provenance.
- `config_hash` must cover coefficients, formula ID, relevant aggregation/calendar configuration and any settings that affect output.
- On duplicate key with identical hashes, treat operation as idempotent and avoid rewriting `calculated_at` unnecessarily.
- On duplicate key with changed `source_hash` or `config_hash`, update or create a version according to existing project audit/versioning conventions. Never silently mutate a result used by completed backtests without preserving reproducibility.
- Add foreign keys only if the existing instrument storage guarantees stable canonical keys and the project convention requires them.
- Do not store numeric values as JS floating point text converted after calculations.

**RU.**

- `NUMERIC` для цен и уровней.
- `valid_to` исключающий.
- Метаданные source и target периодов хранить раздельно.
- `source_hash` покрывает нормализованный OHLC, интервал, timestamp/period ID, candle source и происхождение агрегации.
- `config_hash` покрывает коэффициенты, ID формулы, конфиг агрегации/календаря и настройки, влияющие на выход.
- При дубликате ключа с теми же hash — идемпотентность, без лишней перезаписи `calculated_at`.
- При изменении `source_hash` или `config_hash` — обновление/версия по аудит-конвенциям; не молча менять результат завершённых бэктестов.
- Foreign keys — только если хранилище инструментов гарантирует стабильные ключи и конвенция проекта требует FK.
- Не хранить числа как текст float JS после расчётов.

## 7. Background workers and scheduling / Фоновые workers и планирование

**EN.** Use the existing worker/job infrastructure.

**RU.** Использовать существующую инфраструктуру worker/job.

### 7.1. Job types / Типы задач

| Job                             | Trigger                                      | Responsibility                                              |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `FIBONACCI_PIVOT_BACKFILL`      | Admin/operator request or onboarding         | Historical calculation for selected instrument/time range   |
| `FIBONACCI_PIVOT_DAILY_UPDATE`  | Completed daily source period                | Create levels for next applicable trading day (`5m` chart)  |
| `FIBONACCI_PIVOT_WEEKLY_UPDATE` | Completed weekly source period               | Create levels for next applicable trading week (`1h` chart) |
| `FIBONACCI_PIVOT_RECALCULATE`   | Source candle correction/calendar correction | Recompute dependent target period(s)                        |
| `FIBONACCI_PIVOT_RECONCILE`     | Periodic maintenance                         | Find missing/stale pivot records and safely repair them     |

### 7.2. Scheduling requirements / Требования к планированию

**EN.**

- Schedule from the authoritative calendar/period completion event or a calendar-aware worker schedule.
- Do not hardcode midnight, 23:59, a fixed UTC offset, or a fixed 24h/7d delay.
- Do not run daily/weekly calculation while the provider still marks source candle incomplete.
- If the close event is missed or provider data is delayed, the retry/reconciliation path must create the missing record once the completed candle becomes available.
- Weekly calculation happens only after completed weekly source data is confirmed.

**RU.**

- Планировать от авторитетного события завершения периода/календаря или calendar-aware расписания worker.
- Не хардкодить полночь, 23:59, фиксированный UTC offset или фиксированную задержку 24h/7d.
- Не запускать дневной/недельный расчёт, пока провайдер не пометил source-свечу завершённой.
- При пропуске close или задержке данных retry/reconciliation создаёт недостающую запись после появления завершённой свечи.
- Недельный расчёт только после подтверждения завершённых недельных source-данных.

### 7.3. Idempotency and locking / Идемпотентность и блокировки

**EN.** Recommended idempotency key:

**RU.** Рекомендуемый ключ идемпотентности:

```text
fibonacci-pivot:{instrumentUid}:{chartTimeframe}:{validPeriodId}:{algorithmVersion}:{configHash}
```

**EN.** Requirements:

**RU.** Требования:

**EN.**

- use existing queue idempotency and/or database uniqueness;
- use a per-key distributed lock if the same instrument/period can be processed concurrently;
- use transactional upsert;
- retries must not duplicate rows;
- retry transient provider failures with exponential backoff and jitter according to project policy;
- classify permanent validation/data errors separately from transient transport errors;
- expose failed jobs through existing dead-letter/error monitoring conventions.

**RU.**

- идемпотентность очереди и/или уникальность БД;
- distributed lock по ключу при параллельной обработке инструмента/периода;
- транзакционный upsert;
- retry не дублируют строки;
- transient-ошибки провайдера — exponential backoff и jitter по политике проекта;
- постоянные ошибки валидации/данных отдельно от транспортных;
- failed jobs — через dead-letter/мониторинг ошибок проекта.

### 7.4. Reconciliation / Сверка

**EN.** Reconciliation should compare expected calendar target periods against stored calculation records within a bounded lookback. It must not scan/recalculate the full history on every run. It should:

**RU.** Сверка сравнивает ожидаемые целевые периоды календаря с сохранёнными расчётами в ограниченном lookback. Не сканировать/пересчитывать всю историю каждый запуск. Должна:

**EN.**

- identify missing expected periods;
- compare current source hashes with persisted hashes;
- enqueue bounded backfill/recalculation jobs;
- be safe to repeat.

**RU.**

- выявлять отсутствующие ожидаемые периоды;
- сравнивать текущие source hash с сохранёнными;
- ставить в очередь ограниченные backfill/recalculation jobs;
- быть безопасной при повторе.

## 8. Backend service and API contract / Сервис бэкенда и контракт API

### 8.1. Service boundary / Граница сервиса

**EN.** Suggested logical service methods:

**RU.** Предлагаемые логические методы сервиса:

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

**EN.** The exact API route and response envelope must match existing API conventions.

**RU.** Точный маршрут API и обёртка ответа должны соответствовать конвенциям API проекта.

### 8.2. Recommended read endpoint / Рекомендуемый read-эндпоинт

```http
GET /api/v1/instruments/{instrumentUid}/indicators/fibonacci-pivots
    ?timeframe=5m
    &from=2026-11-01T00:00:00.000Z
    &to=2026-11-10T00:00:00.000Z
```

**EN.** Query rules:

**RU.** Правила query:

**EN.**

- `timeframe` is required and must be `5m` or `1h`;
- `from` and `to` are required ISO-8601 timestamps with timezone/UTC offset;
- require `from < to`;
- validate maximum range / page size using existing API conventions;
- resolve canonical instrument UID and verify market-data support;
- do not accept a client-supplied reference timeframe that can contradict the fixed mapping.

**RU.**

- `timeframe` обязателен: `5m` или `1h`;
- `from` и `to` — обязательные ISO-8601 с timezone/UTC offset;
- требовать `from < to`;
- проверять максимальный диапазон/размер страницы по конвенциям API;
- резолвить канонический instrument UID и проверять поддержку market data;
- не принимать reference timeframe от клиента, противоречащий фиксированному mapping.

### 8.3. Response DTO / DTO ответа

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

**EN.** Use decimal strings over JSON to avoid precision loss in transport. Keep exact names aligned to current project API standards.

**RU.** Передавать десятичные строки в JSON, чтобы не терять точность. Имена полей — по текущим стандартам API проекта.

### 8.4. Query semantics / Семантика запросов

**EN.** Return every pivot segment whose validity interval intersects the requested chart range:

**RU.** Возвращать каждый сегмент pivot, чей интервал действия пересекается с запрошенным диапазоном графика:

```text
validFrom < requestedTo AND validTo > requestedFrom
```

**EN.** If the endpoint requires context for visible range boundaries, include the valid segment crossing the start/end. Do not return duplicate one-point rows per chart candle.

**RU.** Если эндпоинту нужен контекст границ видимого диапазона — включать валидный сегмент, пересекающий start/end. Не дублировать однострочные записи на каждую свечу.

**EN.** If a period is missing, either return `meta.hasGaps=true` with missing period IDs or use the project's established partial-data envelope. Do not fill the gap with stale/guessed levels.

**RU.** При отсутствии периода — `meta.hasGaps=true` с ID пропусков или установленная обёртка partial-data проекта. Не заполнять пропуск устаревшими/угаданными уровнями.

### 8.5. Error handling / Обработка ошибок

**EN.** Follow existing API error format. Distinguish at least:

**RU.** Следовать формату ошибок API проекта. Различать как минимум:

**EN.**

- invalid timeframe / date range;
- instrument not found or unsupported market;
- no historical source data;
- source data incomplete;
- provider temporarily unavailable;
- calculation data quality failure.

**RU.**

- неверный timeframe / диапазон дат;
- инструмент не найден или рынок не поддерживается;
- нет исторических source-данных;
- source-данные неполны;
- провайдер временно недоступен;
- сбой качества расчётных данных.

**EN.** A valid request with no calculated periods may return an empty `periods` array with a useful `meta` state rather than a server error, if that matches API conventions.

**RU.** Валидный запрос без рассчитанных периодов может вернуть пустой `periods` с полезным `meta`, а не server error, если так принято в API проекта.

## 9. Frontend: TanStack Charts v1 integration / Фронтенд: интеграция TanStack Charts v1

### 9.1. Library and documentation requirements / Требования к библиотеке и документации

**EN.**

- Use `@tanstack/charts` and the official React adapter `@tanstack/charts/react` when the app is React.
- Verify exact installed package versions and exports in `pnpm-lock.yaml` and installed `.d.ts` before writing imports. Do not copy API from another major version or from unreleased `main`.
- Current v1 documentation includes `defineChart`, marks and scales. The official React adapter renders a `Chart` from a framework-independent `definition`.
- The official Candlestick catalog example uses `link` to draw each candle wick (`Low` to `High`) and body (`Open` to `Close`), so use that as the implementation reference for candle rendering if the project does not already have it.

**RU.**

- Использовать `@tanstack/charts` и официальный React-адаптер `@tanstack/charts/react`, если приложение на React.
- Проверять версии пакетов и exports в `pnpm-lock.yaml` и `.d.ts` до импортов. Не копировать API другой major-версии или unreleased `main`.
- Документация v1 включает `defineChart`, marks и scales; React-адаптер рендерит `Chart` из framework-independent `definition`.
- Официальный пример Candlestick использует `link` для фитиля и тела свечи — опора для отрисовки свечей, если в проекте ещё нет своей реализации.

### 9.2. Relevant TanStack Charts primitives / Примитивы TanStack Charts

| Primitive     | Use                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `defineChart` | Chart definition and composition                                                                          |
| `link`        | Independent finite segments with explicit endpoints; required for time-bounded pivot levels               |
| `text`        | Data-anchored labels for `P`, `R1`…`S3`, if the existing UI does not render labels in an external overlay |
| `ruleY`       | Full-width horizontal reference line; do NOT use for period-bounded pivot segments                        |
| `scaleUtc`    | Time scale for UTC `Date` values                                                                          |
| `scaleLinear` | Numeric price scale                                                                                       |
| React `Chart` | Chart rendering component                                                                                 |

**EN.** Official docs say `link` draws one independent segment per row and accepts `x1`, `y1`, `x2`, `y2`; pass a stable key channel for keyed reconciliation. `ruleY` spans the complete inner chart width and is therefore not suitable for the period-bounded levels.

**RU.** В документации `link` — один независимый сегмент на строку с `x1`, `y1`, `x2`, `y2`; нужен стабильный key channel. `ruleY` на всю ширину графика и не подходит для уровней, ограниченных периодом.

### 9.3. Imports and chart construction / Импорты и сборка графика

**EN.** Use the official docs and installed package's exports as source of truth. The current official candlestick example uses this general pattern:

**RU.** Источник истины — официальная документация и exports установленного пакета. Общий паттерн из официального candlestick-примера:

```ts
import { defineChart, link } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear, scaleUtc } from 'd3-scale';
```

**EN.** Do not assume every scale is exported from `@tanstack/charts/scales/*`; the official current Candlestick example imports `scaleLinear` and `scaleUtc` from `d3-scale`. Validate against installed declarations and app dependencies.

**RU.** Не предполагать, что все scale экспортируются из `@tanstack/charts/scales/*`; в официальном Candlestick `scaleLinear` и `scaleUtc` из `d3-scale`. Сверять с установленными декларациями и зависимостями приложения.

### 9.4. Frontend view model / View model фронтенда

**EN.** Convert API periods into seven line-segment rows per valid period:

**RU.** Преобразовать периоды API в семь строк сегментов на каждый валидный период:

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

**EN.** Implementation requirements:

**RU.** Требования к реализации:

**EN.**

- Keep raw decimal strings in query/cache/domain DTO.
- Convert to JavaScript `number` only at the chart rendering boundary because chart scales consume numeric values.
- Validate conversion is finite and within supported precision. Do not use chart-rendered numbers as backend calculation inputs.
- Build stable IDs from `(instrumentUid, chartTimeframe, validPeriodId, level, algorithmVersion)`.
- Do not create one point per chart candle for a flat level.

**RU.**

- Десятичные строки в query/cache/domain DTO без изменений.
- В `number` только на границе рендера графика (scale ожидают числа).
- Проверять конечность и точность; не использовать числа графика как вход бэкенда.
- Стабильные ID из `(instrumentUid, chartTimeframe, validPeriodId, level, algorithmVersion)`.
- Не создавать по точке на свечу для плоского уровня.

### 9.5. Mark creation / Создание marks

**EN.** Create independent `link` marks for each visual group or one mark with per-datum style channels, following the installed TanStack Charts API. Use `key: 'id'` (or exact v1 key channel syntax) to guarantee stable keyed reconciliation.

**RU.** Создавать независимые `link` marks по визуальным группам или один mark с каналами стиля на datum по API установленной версии. `key: 'id'` (или точный синтаксис v1) для стабильной reconciliation.

**EN.** Conceptual shape:

**RU.** Концептуальная форма:

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

**EN.** This is a conceptual integration sample, not a guarantee that callback/channel syntax is identical across all package versions. Verify the installed v1 `LinkOptions` types before merging. The mathematical/service module must remain independent of this code.

**RU.** Это концептуальный пример; синтаксис callback/channel может отличаться между версиями. Сверить `LinkOptions` v1 до merge. Математический/сервисный модуль независим от этого кода.

### 9.6. Candlestick composition / Композиция со свечами

**EN.** The pivot layer must be composed into the same price chart definition as candles, sharing the same X and Y scales. Do not mount an independent pivot chart over the candle chart with unrelated scales.

**RU.** Слой pivot в той же `definition` ценового графика, что и свечи, с общими шкалами X и Y. Не накладывать отдельный график pivot с несвязанными шкалами.

**EN.**

- Draw pivot segments behind candles if matching the supplied reference image; keep their labels legible above candles.
- In the TanStack definition, mark order controls visual composition; confirm actual painter order in a visual test.
- Keep volume in the existing volume pane/view and do not force volume onto the price Y scale.
- If a custom candle body mark is already implemented, reuse it. Otherwise use the official Candlestick catalog `link` pattern as a baseline and verify candle body width at both 5m and 1h zoom levels.

**RU.**

- Сегменты pivot за свечами, если так на эталоне; подписи читаемы поверх свечей.
- Порядок marks в TanStack задаёт композицию; проверить painter order визуально.
- Объём — в существующей volume pane, не на ценовой шкале Y.
- Свою реализацию тела свечи переиспользовать; иначе baseline — официальный `link` Candlestick; ширину тела проверить на 5m и 1h.

### 9.7. Level labels / Подписи уровней

**EN.**

- Labels must read exactly `P`, `R1`, `R2`, `R3`, `S1`, `S2`, `S3`.
- Use `text` mark or current chart label system only after validating API.
- Do not render seven copies per historical candle.
- Prefer labels for segments intersecting the visible right edge / current valid period. Avoid label clutter when multiple historical periods are visible.
- Label Y is the corresponding price value; X is the valid segment's visible end/right edge, clipped to viewport if segment extends past viewport.
- Format price with instrument's display precision; do not round stored values.

**RU.**

- Подписи строго `P`, `R1`…`S3`.
- `text` mark или текущая система подписей — после проверки API.
- Не рисовать семь копий на каждую историческую свечу.
- Предпочитать подписи у правого края видимой области / текущего периода; избегать захламления при нескольких периодах.
- Y — цена уровня; X — видимый правый край сегмента, обрезка по viewport.
- Формат цены по точности отображения инструмента; хранимые значения не округлять.

### 9.8. Scales and viewport / Шкалы и viewport

**EN.**

- Use the same UTC time scale as candles.
- Use the same price scale as candles.
- Keep X-domain/viewport ownership in the existing TradingChart component.
- Decide and test whether Y-domain includes enabled pivot levels outside current candle range. Recommended initial policy: include visible pivot levels in Y extent only when they would otherwise be clipped; prevent extreme off-screen levels from collapsing candle readability. If the project already has a consistent indicator-scale policy, reuse it.
- On `5m` ↔ `1h` switch, fetch the corresponding pivot mapping and chart candles; do not merely relabel one set of levels.
- When the visible time range changes, fetch levels intersecting that range plus one adjacent period on each edge if needed for labels/context.

**RU.**

- Та же UTC-шкала времени, что у свечей.
- Та же ценовая шкала.
- Владение X-domain/viewport — у существующего TradingChart.
- Протестировать включение pivot в Y-domain вне текущего диапазона свечей; начальная политика — расширять Y только если уровни иначе обрежутся; не ломать читаемость свечей экстремальными уровнями; переиспользовать политику индикаторов проекта.
- При смене `5m` ↔ `1h` — загружать соответствующий mapping и свечи, не переименовывать один набор уровней.
- При смене видимого диапазона — уровни с пересечением плюс соседний период на краях для подписей/контекста.

### 9.9. React update and performance / Обновление React и производительность

**EN.**

- `Chart`'s `definition` identity is the update boundary; memoize/rebuild only when candle/level data, timeframe, viewport or chart settings actually change.
- Keep data transform pure and memoized.
- Query/cache keys must include `(instrumentUid, chartTimeframe, from, to, algorithmVersion)`.
- Do not recompute pivots during mouse move, crosshair update, tooltip display or every new 5m/1h candle.
- The default React chart renderer is SVG. Use selective Canvas renderer only after profiling; pivot segments are typically few (7 per period) and should remain in SVG unless measured performance says otherwise.
- Avoid relying on `link`'s native focus point for pivot tooltip semantics: a link's interaction coordinate is its midpoint and semantic X/Y correspond to the second endpoint. Resolve the pivot segment for a crosshair timestamp with the half-open interval check `validFrom <= cursorTime < validTo` and feed the values to the existing chart tooltip model.

**RU.**

- Граница обновления — identity `definition` у `Chart`; memoize/rebuild только при изменении свечей/уровней, timeframe, viewport или настроек.
- Трансформы данных — чистые и memoized.
- Ключи query/cache: `(instrumentUid, chartTimeframe, from, to, algorithmVersion)`.
- Не пересчитывать pivot при движении мыши, crosshair, tooltip или каждой новой 5m/1h свече.
- По умолчанию SVG; Canvas — после профилирования; обычно 7 сегментов на период — оставить SVG.
- Tooltip pivot: не полагаться на midpoint `link`; сегмент по `validFrom <= cursorTime < validTo` для crosshair.

### 9.10. Suggested frontend organization / Предлагаемая организация фронтенда

**EN.** Adapt to actual feature structure:

**RU.** Адаптировать к фактической структуре фичи:

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

**EN.** No Fibonacci formula belongs in the frontend.

**RU.** Формулы Fibonacci не принадлежат фронтенду.

## 10. Rendering semantics and reference-image matching / Семантика отрисовки и соответствие эталонным изображениям

**EN.** The supplied reference screenshots show period-bounded horizontal levels labelled `P`, `R1`–`R3`, `S1`–`S3`. The feature must reproduce that general behavior, not necessarily every pixel, color, or unspecified TradingView setting.

**RU.** Эталонные скриншоты показывают горизонтальные уровни, ограниченные периодом, с подписями `P`, `R1`–`R3`, `S1`–`S3`. Функция должна воспроизводить это общее поведение, а не обязательно каждый пиксель, цвет или неуказанные настройки TradingView.

**EN.** Initial styling defaults (defer to existing theme tokens):

**RU.** Начальные стили (по токенам темы проекта):

| Level group | Suggested style                                                             |
| ----------- | --------------------------------------------------------------------------- |
| `P`         | Distinct accent line, slightly thicker                                      |
| `R1`–`R3`   | Resistance color, normal width                                              |
| `S1`–`S3`   | Support color; it may share the resistance hue if matching the reference UI |
| Labels      | Same group color, compact, readable                                         |

**EN.** Requirements:

**RU.** Требования:

**EN.**

- Each segment starts at valid period start and ends at valid period end.
- Segments must not extend over a holiday or non-trading target period unless the chart's exchange calendar explicitly includes it in the same valid period.
- Historical levels remain visible over their own target periods when user pans backward.
- Current active period displays levels derived from the previous completed source period.
- No level line is generated if source data is absent or incomplete.
- The seven levels must map correctly to the shared chart price scale.

**RU.**

- Сегмент от start до end валидного периода.
- Не растягивать сегмент через праздник/не торговый период, если календарь графика этого не включает в тот же valid period.
- Исторические уровни видны на своих периодах при прокрутке назад.
- Текущий активный период — уровни от предыдущего завершённого source-периода.
- Без линии уровня при отсутствии/неполноте source.
- Семь уровней корректно на общей ценовой шкале графика.

## 11. Tests and verification / Тесты и верификация

### 11.1. Calculator unit tests / Модульные тесты калькулятора

**EN.** Use exact decimal expected values. Fixture:

**RU.** Использовать точные десятичные ожидаемые значения. Фикстура:

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

**EN.** Required cases:

**RU.** Обязательные случаи:

**EN.**

- valid normal OHLC;
- `close === high`;
- `close === low`;
- `high === low` degenerate range;
- `high < low` rejection;
- close outside `[low, high]` rejection;
- missing/NaN/infinite/unparsable input rejection;
- exact decimal behavior and no premature tick-size rounding;
- output ordering: `R1 < R2 < R3`, `S1 > S2 > S3`, and `S3 <= P <= R3` for non-negative range.

**RU.**

- валидный обычный OHLC;
- `close === high`;
- `close === low`;
- вырожденный диапазон `high === low`;
- отказ при `high < low`;
- close вне `[low, high]`;
- отказ при missing/NaN/infinite/unparsable;
- точная десятичная арифметика без раннего округления по тику;
- порядок: `R1 < R2 < R3`, `S1 > S2 > S3`, `S3 <= P <= R3` при неотрицательном диапазоне.

### 11.2. Calendar/aggregation tests / Тесты календаря и агрегации

**EN.** Use deterministic mocked calendar fixtures, plus a real calendar adapter integration test where available:

**RU.** Детерминированные mock-фикстуры календаря плюс интеграционный тест реального адаптера, где доступен:

- ordinary business trading day;
- weekend and public holiday;
- short/partial trading session;
- futures evening session that crosses a calendar date;
- weekly boundary with holiday;
- year boundary;
- historical schedule change;
- no-trading period;
- source candle whose timestamp is near a period boundary.

**EN.** Assert exact `[start, end)` period bounds and previous-period mapping.

**RU.** Проверять точные границы `[start, end)` и mapping предыдущего периода.

### 11.3. Provider adapter tests / Тесты адаптера провайдера

**EN.**

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

**RU.** (те же проверки: mapping интервалов, `CANDLE_SOURCE_EXCHANGE`, UTC `from`/`to`, chunk/limit, `isComplete`, отказ неполных свечей, сохранение `time` и source, дедуп на границах страниц, retry, граница первой доступной истории без фиктивных значений.)

### 11.4. Historical generator tests / Тесты исторического генератора

**EN.**

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

**RU.** (те же инварианты: первый целевой период от предыдущего завершённого source; не считать уровни для текущего source на себе; явный gap; без фабрикации на выходных; сортировка; детерминизм; prior reference в backfill; пересчёт только зависимых периодов при коррекции OHLC; идемпотентность повтора; различимые записи при смене версии алгоритма/конфига.)

### 11.5. API tests / Тесты API

**EN.**

- timeframe `5m` maps to `1D`;
- timeframe `1h` maps to `1W`;
- unsupported timeframe rejected;
- invalid date range rejected;
- intersection query uses `valid_from < to AND valid_to > from`;
- decimal prices serialized as strings;
- gaps reported explicitly;
- authorization follows existing API policy;
- missing instrument and missing source data handled according to API contract.

**RU.** (mapping `5m`→`1D`, `1h`→`1W`; отклонение неподдерживаемого timeframe и невалидного диапазона; пересечение `valid_from < to AND valid_to > from`; цены-строки; явные gaps; авторизация; missing instrument/source по контракту API.)

### 11.6. TanStack Charts tests / Тесты TanStack Charts

**EN.**

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

**RU.** (один сегмент на уровень и период; координаты `x1`/`x2`/`y1`/`y2`; стабильные ID; корректный mapping после смены 5m/1h; общие шкалы; clip по viewport; без `ruleY` для конечных сегментов; подписи не множатся на свечи; tooltip по активному периоду; visual regression на gaps и шкалы.)

### 11.7. No-look-ahead/backtest tests / Тесты no-look-ahead и бэктеста

**EN.** For every generated target period `T`:

**RU.** Для каждого сгенерированного целевого периода `T`:

```text
sourcePeriod.end <= T.start
```

**EN.** And all source candle data must have been complete by `T.start`. No data whose timestamp/completion is after target start may influence the levels.

**RU.** Все source-свечи должны быть завершены к `T.start`. Данные с timestamp/завершением после старта цели не влияют на уровни.

### 11.8. Reference validation on NG-12.26 / Эталонная валидация на NG-12.26

**EN.** Use the same:

**RU.** Использовать те же:

- instrument UID / contract;
- provider source type;
- daily/weekly OHLC source periods;
- trading session interpretation;
- completed period;
- coefficient values;
- algorithm formula.

**EN.** Compare all seven levels with an independently calculated reference (e.g. manually computed fixture or TradingView Fibonacci Pivot Points with matching reference timeframe and source OHLC). Store a test fixture with source OHLC and expected level values. Do not compare only visual similarity; compare numeric level values and effective time boundaries.

**RU.** Сверить все семь уровней с независимым эталоном (ручная фикстура или TradingView Fibonacci Pivot Points с тем же reference timeframe и source OHLC). Сохранить тестовую фикстуру с OHLC и ожидаемыми уровнями. Сравнивать числа и границы времени, не только визуально.

**EN.** The screenshot label `PivotsFibonacci Auto 15` does not uniquely prove every indicator setting. The implementation must follow the explicitly approved `5m → 1D` and `1h → 1W` configuration, not attempt to reverse-engineer unspecified `Auto 15` behavior.

**RU.** Подпись `PivotsFibonacci Auto 15` на скриншоте не доказывает все настройки индикатора. Следовать утверждённым `5m → 1D` и `1h → 1W`, не реверс-инжинирить неуказанное поведение `Auto 15`.

## 12. Observability and operations / Наблюдаемость и эксплуатация

**EN.** Expose structured logs/metrics using project conventions:

**RU.** Публиковать структурированные логи/метрики по конвенциям проекта:

**EN.**

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

**RU.**

- число загруженных завершённых source-периодов;
- число сгенерированных/обновлённых pivot-периодов;
- число пропущенных неполных периодов;
- число невалидных source-свечей;
- число gaps по периодам;
- задержки/ошибки/rate limit провайдера;
- длительность backfill и записей в batch;
- лаг расчёта от закрытия reference-периода до сохранения;
- несовпадение source hash / число пересчётов;
- retry jobs и dead-letter.

**EN.** Logs must contain canonical `instrumentUid`, chart timeframe, reference timeframe, source period ID, valid period ID, algorithm version and job correlation ID. Do not log bearer tokens or secrets.

**RU.** В логах: канонический `instrumentUid`, chart timeframe, reference timeframe, source period ID, valid period ID, версия алгоритма и job correlation ID. Не логировать bearer-токены и секреты.

## 13. Implementation sequence / Порядок реализации

**EN.** Use this order unless repository dependencies require a different dependency graph:

**RU.** Следовать этому порядку, если зависимости репозитория не требуют иного графа зависимостей:

### Phase 0 — Repository reconnaissance / Фаза 0 — разведка репозитория

- [ ] Inspect monorepo and document existing architecture.
- [ ] Identify current T-Invest client, candle schema, candle store, calendar, jobs, database and TanStack Charts versions.
- [ ] Confirm TanStack package exports from installed type declarations.
- [ ] Record any deviations from this spec before implementation; do not change business semantics.

### Phase 1 — Domain core / Фаза 1 — доменное ядро

- [ ] Define types and stable config.
- [ ] Implement pure decimal Fibonacci Pivot Calculator.
- [ ] Implement validation and diagnostic codes.
- [ ] Complete calculator unit tests.

### Phase 2 — Market data and calendar / Фаза 2 — рыночные данные и календарь

- [ ] Implement/reuse T-Invest adapter for completed `1D` and `1W` candles.
- [ ] Add completeness/source normalization.
- [ ] Integrate the exchange calendar and period resolver.
- [ ] Prove DAY/WEEK candle alignment for NG-12.26.
- [ ] Implement aggregation fallback only if the alignment/data gate requires it.
- [ ] Complete provider and calendar tests.

### Phase 3 — Historical generation and persistence / Фаза 3 — историческая генерация и персистентность

- [ ] Implement historical generator and previous-period mapping.
- [ ] Add migration/repository/upsert.
- [ ] Implement bounded backfill with chunking.
- [ ] Test idempotency, correction handling and no-look-ahead.

### Phase 4 — Workers / Фаза 4 — workers

- [ ] Add daily, weekly, correction and reconciliation jobs.
- [ ] Add idempotency and locks using project patterns.
- [ ] Add retry policy and metrics.
- [ ] Verify recovery after missed schedule/provider outage.

### Phase 5 — API / Фаза 5 — API

- [ ] Add DTO/schema validation.
- [ ] Add range-intersection query and mapped timeframe response.
- [ ] Add API tests and API documentation.

### Phase 6 — TanStack Charts frontend / Фаза 6 — фронтенд TanStack Charts

- [ ] Add API query hook/cache integration.
- [ ] Map API DTO to `PivotSegment[]`.
- [ ] Add `link` overlay in the same chart definition as candles.
- [ ] Add labels with `text` or current annotation system.
- [ ] Verify shared scales, viewport, tooltip and performance.
- [ ] Add visual tests for 5m and 1h.

### Phase 7 — Acceptance and rollout / Фаза 7 — приёмка и rollout

- [ ] Backfill NG-12.26 test range.
- [ ] Compare numeric levels to independent reference.
- [ ] Verify chart visually against supplied screenshots.
- [ ] Run all relevant CI checks.
- [ ] Roll out behind existing feature flag/config if the project has this mechanism.
- [ ] Expand to other instruments only after NG-12.26 passes.

## 14. Definition of Done / Критерии готовности

**EN.** Implementation is accepted only when all applicable statements are true:

**RU.** Реализация принимается только когда все применимые утверждения истинны:

**EN.** Checklist (identifiers unchanged):

**RU.** Чеклист (идентификаторы без перевода):

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

## 15. Explicit assumptions and unresolved repository-specific details / Явные допущения и нерешённые детали репозитория

**EN.** The coding agent must resolve these by inspecting the repository, not by asking the user to repeat already-approved product choices:

**RU.** Coding agent должен прояснить это, исследуя репозиторий, а не переспрашивая пользователя об уже согласованных продуктовых решениях:

**EN.**

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

**RU.**

1. **Фактические пути пакетов:** границы существующего монорепо; примеры путей в документе логические, не обязательные.
2. **Конвенции миграций БД:** инструмент и правила именования проекта.
3. **Worker/queue API:** фактические scheduler, queue, retry и lock.
4. **Провайдер торгового календаря:** авторитетный MOEX-календарь проекта, если есть; иначе задокументировать источник и покрытие истории до использования.
5. **Форма T-Invest SDK:** нормализовать точные generated-типы; snake_case REST ≠ camelCase TS.
6. **Версия TanStack Charts:** из lockfile; сверить импорты `link`, `text`, scales, adapter, renderer.
7. **Политика Y-domain графика:** сохранить поведение TradingChart или реализовать политику § 9.8.
8. **Существующая отрисовка свечей:** переиспользовать, не переписывать ради индикатора, если можно компоновать overlay.
9. **Доступность истории:** глубина и первая дата зависят от инструмента/интервала — partial history, не баг расчёта.
10. **Совместимость с эталоном:** скриншоты задают сегменты/подписи; настройки TradingView не выводятся; mapping из § 1 авторитетен.

## 16. Official references / Официальные ссылки

**EN.** Use these sources as references and re-check them during implementation because APIs and limits can change.

**RU.** Использовать эти источники как справочники и перепроверять при реализации: API и лимиты могут меняться.

### T-Invest API / API T-Invest

**EN.**

- GetCandles endpoint and interval/limit/source parameters: https://developer.tbank.ru/invest/api/market-data-service-get-candles
- Historical quote loading, history windows and `limit` guidance: https://developer.tbank.ru/invest/intro/intro/load_history
- Market data service and `HistoricCandle` fields, including UTC `time` and completion flag: https://developer.tbank.ru/invest/services/quotes/marketdata
- Market data FAQ / instrument first-candle metadata: https://developer.tbank.ru/invest/services/quotes/faq_marketdata/

**RU.** (те же URL — документация T-Invest API по свечам, истории и market data.)

### MOEX / MOEX

**EN.**

- Evening trading session background; use the current interactive calendar and instrument-specific session schedule for actual boundaries: https://www.moex.com/a2732
- Interactive Trading Calendar: https://www.moex.com/ru/tradingcalendar

**RU.**

- Контекст вечерней сессии; фактические границы — из интерактивного календаря и расписания инструмента: https://www.moex.com/a2732
- Интерактивный торговый календарь: https://www.moex.com/ru/tradingcalendar

### TanStack Charts / TanStack Charts

**EN.**

- API reference: https://tanstack.com/charts/latest/docs/reference/index
- Chart definitions: https://tanstack.com/charts/latest/docs/reference/chart-definitions
- Rules, links, arrows, vectors and ticks; `link` vs full-width `ruleY`: https://tanstack.com/charts/latest/docs/reference/marks/rules-links-arrows-vectors-and-ticks
- Text marks: https://tanstack.com/charts/latest/docs/reference/marks/text-frame-and-facet
- React Chart component: https://tanstack.com/charts/latest/docs/framework/react/reference/chart
- Official candlestick example using `link` for wick and body: https://tanstack.com/charts/catalog/charts/28-candlestick

**RU.** (те же URL; описания совпадают с EN — справочная документация TanStack Charts.)

---

## Final instruction to the implementation agent / Финальная инструкция агенту реализации

**EN.** Implement the feature end-to-end within the existing repository. The two approved mappings are immutable unless the product owner explicitly changes them: **5m → previous completed 1D MOEX trading period; 1h → previous completed 1W MOEX trading period**. All levels are Fibonacci Pivot Points calculated from previous-period H/L/C. Keep the backend algorithm independent from TanStack Charts. Render the time-bounded segments through TanStack Charts `link` in the same coordinate system as the candlesticks. Preserve exact time boundaries, source provenance, decimal precision and no-look-ahead guarantees. Validate on NG-12.26 before enabling for the full instrument universe.

**RU.** Реализовать функцию end-to-end в существующем репозитории. Два утверждённых соответствия неизменны, пока владелец продукта явно их не сменит: **5m → предыдущий завершённый торговый день MOEX (1D); 1h → предыдущая завершённая торговая неделя MOEX (1W)**. Все уровни — Fibonacci Pivot Points по H/L/C предыдущего периода. Алгоритм бэкенда независим от TanStack Charts. Отрисовывать ограниченные по времени сегменты через `link` TanStack Charts в той же системе координат, что и свечи. Сохранять точные границы времени, происхождение источника, десятичную точность и гарантии no-look-ahead. Валидировать на NG-12.26 до включения на всю вселенную инструментов.
