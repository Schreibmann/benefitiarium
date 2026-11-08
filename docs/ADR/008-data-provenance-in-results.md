# ADR-008: Data source and version are part of analysis results

## Status

Accepted

## Context

Mixing MOEX ISS and T-Invest candles without provenance breaks reproducibility and QA.

## Decision

Every candle carries provider/source metadata. Backtests bind to fixed dataset snapshot/revision, strategy version, parameters, and cost model. Do not silently merge providers in one series.

## Consequences

Schema uniqueness includes provider; dataset versioning is required before serious backtests.
