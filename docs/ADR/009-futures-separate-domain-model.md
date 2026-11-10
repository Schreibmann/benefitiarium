# ADR-009: Futures as a separate domain model / Фьючерсы как отдельная доменная модель

## Status / Статус

Accepted (clarified in TECHNICAL_BACKLOG v1.1) (принято; уточнено в TECHNICAL_BACKLOG v1.1)

## Context / Контекст

**RU.** Серии фьючерсов экспирируются; непрерывные контракты синтетические и не исполняемы. T-Invest также отдаёт **Indicatives** (индексные/товарные серии базового актива) со свечами, но это не торгуемые фьючерсные контракты.

**EN.** Futures series expire; continuous contracts are synthetic and not executable. T-Invest also exposes **Indicatives** (underlying index/commodity series) that support candles but are not tradeable futures contracts.

## Decision / Решение

**RU.** Идентифицировать фьючерсный контракт как конкретную серию с экспирацией и историческими спецификациями:

- `instrument_uid`, `ticker + class_code`
- `basic_asset` / `basic_asset_position_uid`
- категория базового актива: `commodity` | `equity_index` | `currency` | `share` | `other`
- экспирация, тик, стоимость тика (`minPriceIncrementAmount`), единица цены, множитель, маржи
- `first_1min_candle_date` / `first_1day_candle_date` для границ истории

Indicatives — отдельные неисполняемые рыночные серии и не могут подменять историю контракта.

Непрерывные контракты — только синтетические серии для анализа. Ордера всегда на реальный контракт.

**EN.** Identify a futures contract by concrete series with expiration and historical specs:

- `instrument_uid`, `ticker + class_code`
- `basic_asset` / `basic_asset_position_uid`
- underlying category: `commodity` | `equity_index` | `currency` | `share` | `other`
- expiry, tick, tick value (`minPriceIncrementAmount`), price unit, multiplier, margins
- `first_1min_candle_date` / `first_1day_candle_date` for history boundaries

Indicatives are separate non-executable market series and must not substitute contract history.

Continuous contracts are analysis-only synthetic series. Orders always target a real contract.

## Consequences / Последствия

**RU.** Спецификации инструментов версионируются во времени; логика ролла — позже, не путь MVP-торговли. Импорт истории (BL-039/031) должен отдельно покрывать товарные и индексные фьючерсы, акции и indicatives.

**EN.** Instrument specs are versioned over time; roll logic is a later epic, not MVP trading path. Historical import (BL-039/031) must cover commodity and index futures separately from shares and indicatives.
