# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** BL-079 sandbox sync (branch `cursor/bl-079-sandbox-sync`)  
**Next task:** BL-087 safe fund/close workflows (separate branch)

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status      | Notes                                   |
| -------------------- | ----------- | --------------------------------------- |
| M0 — Foundation      | DONE        | EPIC E0 verified locally                |
| M1 — Providers       | IN_PROGRESS | E1 nearly complete; BL-017 done         |
| M2 — Historical Data | TODO        | needs BL-039 live matrix + BL-031       |
| M3 — Realtime        | TODO        |                                         |
| M4 — Signals         | TODO        |                                         |
| M5 — Backtesting     | TODO        |                                         |
| M6 — Manual Sandbox  | IN_PROGRESS | E7A: BL-078 done; BL-079 on this branch |
| M7 — Paper           | TODO        |                                         |
| M8 — Guarded Live    | TODO        |                                         |

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

| ID     | Status | Notes                                       |
| ------ | ------ | ------------------------------------------- |
| BL-020 | DONE   | Migrations applied on local Docker Postgres |
| BL-021 | DONE   | Repositories + psql/docker `DbClient`       |

## EPIC E7A (v1.2)

| ID     | Status | Notes                                                                                                                                                                  |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-078 | DONE   | Durable command request bodies; hash conflict rejection                                                                                                                |
| BL-079 | DONE   | Global durable sync; ACCOUNT_STATUS_ALL listing; provider vs local status; missing recovery hint (create new, keep history); transient list errors do not mark missing |
| BL-087 | TODO   | funding validators present                                                                                                                                             |
| BL-088 | TODO   | Admin API                                                                                                                                                              |
| BL-089 | TODO   | Admin UI                                                                                                                                                               |

## Notes

- Sync helpers: `reconcileSandboxAccounts`, `listMissingAccountRecoveries` in `@moex/sandbox-management`
- SDK provider: `createSdkSandboxAccountProvider` requests `ACCOUNT_STATUS_ALL`
- Quality: Biome + `pnpm precommit`

## Next

1. **BL-087** — safe fund/close workflows (new branch)
2. BL-022 outbox / BL-023 audit (needed before BL-088)
3. BL-088 Admin API → BL-089 UI
