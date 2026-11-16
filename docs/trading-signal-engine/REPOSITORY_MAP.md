# Trading Signal Engine — Repository map / Карта репозитория

**RU.** **Документ:** Phase 0 reconnaissance для [`BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`](../BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md) §28.  
**EN.** **Document:** Phase 0 reconnaissance for [`BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`](../BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md) §28.

**RU.** **Дата:** 2026-11-15 · **Пакет реализации:** `@moex/strategy-engine`  
**EN.** **Date:** 2026-11-15 · **Implementation package:** `@moex/strategy-engine`

---

## Section 28 answers / Ответы §28

### 1. Fibonacci Pivot formula / Формула Fibonacci Pivot

**RU.** Канон: `FIBONACCI_PIVOT_POINTS` v1.0.0 в `packages/indicators/src/fibonacci-pivots/calculate.ts` (`calculateFibonacciPivotPoints`). Коэффициенты `0.382` / `0.618` / `1.000`. Карта ТФ: `1m`/`5m` → `1d`, `1h` → `1w`.  
**EN.** Canonical: `FIBONACCI_PIVOT_POINTS` v1.0.0 in `packages/indicators/src/fibonacci-pivots/calculate.ts` (`calculateFibonacciPivotPoints`). Coefficients `0.382` / `0.618` / `1.000`. TF map: `1m`/`5m` → `1d`, `1h` → `1w`.

### 2. Pivot timing / Тайминг пивотов

**RU.** Только OHLC **предыдущего закрытого** дневного/недельного бара; anti-look-ahead в `generateHistoricalPivots`. Текущая сессия: `valid:open` через `getFibonacciPivots` / `tradingPeriodsFromReference`.  
**EN.** Only OHLC of the **immediately preceding closed** daily/weekly bar; anti-look-ahead in `generateHistoricalPivots`. Current session: `valid:open` via `getFibonacciPivots` / `tradingPeriodsFromReference`.

### 3. Volume Profile source / Источник Volume Profile

**RU.** Production: trade-level bins (`HORIZONTAL_VOLUME_TRADES` v1.2.0) через `calculateHorizontalVolumeFromTrades` + `getHorizontalVolume`. OHLCV uniform approximation — только research/fallback, не API.  
**EN.** Production: trade-level bins (`HORIZONTAL_VOLUME_TRADES` v1.2.0) via `calculateHorizontalVolumeFromTrades` + `getHorizontalVolume`. OHLCV uniform approximation is research/fallback only, not the API path.

### 4. Profile scopes / Области профиля

**RU.** Enum scopes из спеки (`CURRENT_SESSION`, …) **не реализованы**. Есть произвольное окно `[from, to)` и visible-range VP в чарте. Для engine: явный window или `VOLUME_PROFILE_UNAVAILABLE`.  
**EN.** Spec scope enums (`CURRENT_SESSION`, …) are **not implemented**. Only arbitrary `[from, to)` windows and chart visible-range VP exist. For the engine: explicit window or `VOLUME_PROFILE_UNAVAILABLE`.

### 5. Session calendar / Календарь сессий

**RU.** `APP_TIMEZONE` default `Europe/Moscow`; таблица `trading_sessions` есть; TS loader отсутствует → typed `UNAVAILABLE` / config stub.  
**EN.** `APP_TIMEZONE` defaults to `Europe/Moscow`; `trading_sessions` table exists; no TS loader → typed `UNAVAILABLE` / config stub.

### 6. Instrument metadata / Метаданные инструмента

**RU.** Domain `InstrumentSpec`: `minPriceIncrement` (tick), `lotSize`, futures `minPriceIncrementAmount`. Commission не на инструменте → engine config.  
**EN.** Domain `InstrumentSpec`: `minPriceIncrement` (tick), `lotSize`, futures `minPriceIncrementAmount`. Commission is not on the instrument → engine config.

### 7. Event semantics / Семантика событий

**RU.** Live: `CanonicalStreamCandle` с `eventHash`, `revision`, `barState`; idempotency по hash; глобального sequence нет.  
**EN.** Live: `CanonicalStreamCandle` with `eventHash`, `revision`, `barState`; idempotency by hash; no global sequence.

### 8. Supported timeframes / Поддерживаемые ТФ

**RU.** Domain `CandleInterval` широкий; chart/API сейчас `1m` | `5m` | `1h`.  
**EN.** Domain `CandleInterval` is wide; chart/API currently `1m` | `5m` | `1h`.

### 9. Storage / infra / Хранение / инфра

**RU.** PostgreSQL + outbox в `@moex/persistence`; Redis/message bus нет; таблицы candles/signals без репозиториев.  
**EN.** PostgreSQL + outbox in `@moex/persistence`; no Redis/message bus; candles/signals tables without repositories yet.

### 10. Signal delivery / Доставка сигналов

**RU.** UI `/app/signals` — shell без API; REST сигналов нет.  
**EN.** UI `/app/signals` is a shell without API; no signal REST yet.

---

## Adapter plan / План адаптеров

**RU.**  
**EN.**

| Module / Модуль   | Approach / Подход                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Fibonacci pivots  | Wrap `@moex/indicators` — no formula fork / Обёртка `@moex/indicators` — без форка формулы |
| Volume profile    | Wrap trades calculator; OHLCV → `APPROXIMATE` / Обёртка trades; OHLCV → `APPROXIMATE`      |
| Instrument spec   | Map domain → engine; missing pointValue → `INSTRUMENT_SPEC_UNAVAILABLE`                    |
| Session calendar  | Stub `UNAVAILABLE` until loader exists / Заглушка `UNAVAILABLE` до loader                  |
| Candle normalizer | Map stream/domain → engine candle + revision gates                                         |

---

## Identified gaps / Выявленные пробелы

**RU.**

- Нет session/rolling/anchored VP scopes.
- Нет loader `trading_sessions`.
- Domain `Signal` lifecycle уже persistence-ориентирован (`new`/`accepted`/…); Benefit lifecycle + in-memory outbox есть в `@moex/strategy-engine` (Phase 5); Postgres signal repos ещё нет.
- Workers `worker-strategy` / `worker-market-data` — scaffold only.
  **EN.**

- No session/rolling/anchored VP scopes.
- No `trading_sessions` loader.
- Domain `Signal` lifecycle is persistence-oriented (`new`/`accepted`/…); Benefit lifecycle + in-memory outbox live in `@moex/strategy-engine` (Phase 5); Postgres signal repos still missing.
- Workers `worker-strategy` / `worker-market-data` are scaffold only.
