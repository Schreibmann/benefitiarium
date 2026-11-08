# ADR-001: Modular monolith instead of microservices

## Status

Accepted

## Context

Personal MOEX research/trading platform with one primary developer and heavy domain logic across market data, research, signals, and trading.

## Decision

Ship one monorepo with several independently runnable Node.js processes sharing domain/persistence packages. Split into separately deployed services only when metrics prove the need.

## Consequences

Lower distributed-transaction cost early; shared types and migrations stay coherent. Process boundaries still isolate broker write access in `worker-execution`.
