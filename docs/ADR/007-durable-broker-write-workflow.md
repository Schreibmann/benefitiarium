# ADR-007: Durable command workflow for broker writes

## Status

Accepted

## Context

Network timeouts after `PostOrder` make blind retries dangerous (duplicate orders).

## Decision

Persist local order intent and unique `client_order_id` before network send. Pass that UID as T-Invest `order_id` per API contract. Timeout → local `UNKNOWN`; no automatic resubmit until reconciliation. Audit + correlation ID on every write command.

## Consequences

Order state machine must include `UNKNOWN`. Reconciliation is mandatory after worker restart.
