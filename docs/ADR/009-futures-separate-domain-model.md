# ADR-009: Futures as a separate domain model

## Status

Accepted

## Context

Futures series expire; continuous contracts are synthetic and not executable.

## Decision

Identify a futures contract by concrete series with expiration and historical specs. Continuous contracts are analysis-only synthetic series. Orders always target a real contract.

## Consequences

Instrument specs are versioned over time; roll logic is a later epic, not MVP trading path.
