# ADR-006: Signal is not an order

## Status

Accepted

## Context

Strategies must not silently trade. Broker writes need independent risk validation.

## Decision

Strict chain:

`Market Event → Feature/Indicator → Strategy → Signal → Trade Proposal → Risk Check → Order Command → Broker → Order/Fill Events`

Strategy Worker has no broker write credentials and cannot call `PostOrder`. Execution Worker validates proposals and trading mode itself.

## Consequences

Clear process/package boundaries; safer automation path later.
