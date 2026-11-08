# ADR-009: Futures as a separate domain model

## Status

Accepted (clarified in TECHNICAL_BACKLOG v1.1)

## Context

Futures series expire; continuous contracts are synthetic and not executable. T-Invest also exposes **Indicatives** (underlying index/commodity series) that support candles but are not tradeable futures contracts.

## Decision

Identify a futures contract by concrete series with expiration and historical specs:

- `instrument_uid`, `ticker + class_code`
- `basic_asset` / `basic_asset_position_uid`
- underlying category: `commodity` | `equity_index` | `currency` | `share` | `other`
- expiry, tick, tick value (`minPriceIncrementAmount`), price unit, multiplier, margins
- `first_1min_candle_date` / `first_1day_candle_date` for history boundaries

Indicatives are separate non-executable market series and must not substitute contract history.

Continuous contracts are analysis-only synthetic series. Orders always target a real contract.

## Consequences

Instrument specs are versioned over time; roll logic is a later epic, not MVP trading path. Historical import (BL-039/031) must cover commodity and index futures separately from shares and indicatives.
