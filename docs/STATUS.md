# Project Status

**Updated:** 2026-11-08  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** BL-078 durable payloads (branch `cursor/bl-078-durable-payloads`)  
**Next task:** BL-079 sandbox account discovery/sync (separate branch)

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status      | Notes                                             |
| -------------------- | ----------- | ------------------------------------------------- |
| M0 — Foundation      | DONE        | EPIC E0 verified locally                          |
| M1 — Providers       | IN_PROGRESS | E1 nearly complete; BL-017 done                   |
| M2 — Historical Data | TODO        | needs BL-039 live matrix + BL-031                 |
| M3 — Realtime        | TODO        |                                                   |
| M4 — Signals         | TODO        |                                                   |
| M5 — Backtesting     | TODO        |                                                   |
| M6 — Manual Sandbox  | IN_PROGRESS | E7A: BL-078 durable request bodies on this branch |
| M7 — Paper           | TODO        |                                                   |
| M8 — Guarded Live    | TODO        |                                                   |

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

| ID     | Status | Notes                                                                             |
| ------ | ------ | --------------------------------------------------------------------------------- |
| BL-020 | DONE   | Migrations applied on local Docker Postgres: `000_schema_migrations` + `001_init` |
| BL-021 | DONE   | Repositories + psql/docker `DbClient` in `@moex/persistence`                      |

## EPIC E7A (v1.2)

| ID     | Status | Notes                                                                                                                                                                                 |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-078 | DONE   | Durable command request in journal (`result.request` + fund amount/currency); in-memory Map removed; idempotency hash conflict rejected; worker can execute after API-process restart |
| BL-079 | TODO   | next branch                                                                                                                                                                           |
| BL-087 | TODO   | funding validators present                                                                                                                                                            |
| BL-088 | TODO   | Admin API                                                                                                                                                                             |
| BL-089 | TODO   | Admin UI                                                                                                                                                                              |

## Notes

- Spec helpers: `selectInstrumentSpecAt`, `appendInstrumentSpecVersion` in `@moex/marketdata`
- Migrations: `packages/persistence/migrations/`
- Repositories: `packages/persistence/src/repos/`
- Spike: `pnpm --filter @moex/broker-tinvest spike`
- Quality: Biome + `pnpm precommit` (lint staged + typecheck)

## Next

1. **BL-079** — sandbox account discovery/sync/recovery (new branch off main)
2. BL-022 outbox / BL-023 audit (needed before BL-088)
3. BL-087 fund/close workflows → BL-088 Admin API → BL-089 UI
