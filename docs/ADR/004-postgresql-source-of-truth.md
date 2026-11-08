# ADR-004: PostgreSQL as source of truth

## Status

Accepted

## Context

Need durable storage for instruments, candles, signals, orders, audit, and backtests.

## Decision

PostgreSQL stores domain data. Drizzle ORM owns typed access and SQL migrations (from BL-020). TimescaleDB is optional after measuring volume/latency. MVP background jobs may use PostgreSQL-backed queues; Redis only when proven necessary.

## Consequences

Single operational datastore for MVP. Partitioning/hypertables deferred until measured pain.
