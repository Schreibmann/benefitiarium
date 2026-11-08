# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** BL-088 Sandbox Admin API (branch `cursor/bl-088-admin-api`)  
**Next task:** BL-089 Admin UI (separate branch)

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status      | Notes                                |
| -------------------- | ----------- | ------------------------------------ |
| M0 — Foundation      | DONE        | EPIC E0 verified locally             |
| M1 — Providers       | IN_PROGRESS | E1 nearly complete; BL-017 done      |
| M2 — Historical Data | TODO        | needs BL-039 live matrix + BL-031    |
| M3 — Realtime        | TODO        |                                      |
| M4 — Signals         | TODO        |                                      |
| M5 — Backtesting     | TODO        |                                      |
| M6 — Manual Sandbox  | IN_PROGRESS | E7A: Admin API routes on this branch |
| M7 — Paper           | TODO        |                                      |
| M8 — Guarded Live    | TODO        |                                      |

## EPIC E1 task board

| ID     | Status  | Notes                                                                                            |
| ------ | ------- | ------------------------------------------------------------------------------------------------ |
| BL-010 | DONE    | Domain VO + sandbox types                                                                        |
| BL-011 | DONE    | `@moex/decimal`                                                                                  |
| BL-012 | DONE    | MarketDataProvider + BrokerGateway + SandboxAccountProvider                                      |
| BL-013 | PARTIAL | Live sandbox probe OK; READ_ONLY token empty                                                     |
| BL-014 | DONE    | T-Invest adapters + sandbox-only client                                                          |
| BL-015 | DONE    | MOEX ISS + AlgoPack path                                                                         |
| BL-016 | DONE    | Cross-provider mapping                                                                           |
| BL-017 | DONE    | Spec versioning: half-open `valid_from/valid_to`, material change → new row (`@moex/marketdata`) |
| BL-018 | TODO    | trading schedule adapter                                                                         |

## EPIC E2

| ID     | Status | Notes                                                                               |
| ------ | ------ | ----------------------------------------------------------------------------------- |
| BL-020 | DONE   | Migrations applied on local Docker Postgres                                         |
| BL-021 | DONE   | Repositories + psql/docker `DbClient`                                               |
| BL-022 | DONE   | Outbox repository + publisher + eventId consumer idempotency                        |
| BL-023 | DONE   | Append-only audit service + secret redaction; migration `002_audit_append_only.sql` |

## EPIC E7A (v1.2)

| ID     | Status | Notes                                                                                                                                                                  |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-078 | DONE   | Durable command request bodies; hash conflict rejection                                                                                                                |
| BL-079 | DONE   | Global durable sync; ACCOUNT_STATUS_ALL listing; provider vs local status; missing recovery hint (create new, keep history); transient list errors do not mark missing |
| BL-087 | DONE   | Close preview + open-risk ack; fund no-withdraw policy notes; timeout → `unknown` (no blind retry); ambiguous create needs reconciliation                              |
| BL-088 | DONE   | Admin sandbox routes + bearer auth; POST → 202 + audit/outbox; refuses production base URL; no token leakage in responses                                              |
| BL-089 | TODO   | Admin UI                                                                                                                                                               |

## Notes

- Admin API: `registerSandboxAdminRoutes` / `ADMIN_API_TOKEN` (empty token → 503)
- Composition root still needs live provider/DB wiring for production process start
- Quality: Biome + `pnpm precommit`

## Next

1. Wire API composition root to Postgres + sandbox provider
2. **BL-089** — Admin UI
