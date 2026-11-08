# ADR-010: Sandbox account management and Admin UI

## Status

Accepted (TECHNICAL_BACKLOG v1.2)

## Context

T-Invest Sandbox accounts are ephemeral (may disappear; kept ~3 months from last use). Production `GetAccounts` must not substitute sandbox account listing. Funding is one-way RUB top-up with a documented cap; close/create are external write side effects that need durable operation tracking.

## Decision

- Own sandbox lifecycle in `packages/sandbox-management` (`SandboxAccountService`).
- Provider RPCs live only in `packages/broker-tinvest` via a **sandbox-only** client factory (fixed host `sandbox-invest-public-api.tbank.ru:443` + `TINVEST_SANDBOX_TOKEN`).
- Write create/fund/close run only in `worker-execution`; API enqueues durable commands.
- Admin UI under `/admin/sandbox` talks only to our Admin API; menu visibility is not authorization.
- `MISSING` is a local diagnostic status after reconciliation with `GetSandboxAccounts`, not a broker status. Missing accounts are never auto-recreated under the same ID.

## Consequences

Separate Sandbox vs production credentials/endpoints permanently. Operation journal + idempotency keys are required before Admin API write routes. Persistence tables land with BL-020; until then the service uses an in-memory journal for unit/contract tests.
