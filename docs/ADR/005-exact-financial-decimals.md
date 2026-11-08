# ADR-005: Exact financial quantities

## Status

Accepted

## Context

Prices, money, fees, tick value, margin, and sizing must not use IEEE-754 `number` as source of truth.

## Decision

Use decimal types end-to-end: Decimal helpers in app code, `NUMERIC` in PostgreSQL, decimal strings in API. JS `number` only for charting/stats when precision is explicitly acceptable.

## Consequences

Requires a dedicated `@moex/decimal` package and mapping at SDK boundaries via string/exact decimal values.
