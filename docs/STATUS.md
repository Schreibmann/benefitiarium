# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** BL-089 Playwright E2E (branch `cursor/bl-089-playwright-e2e`)  
**Next task:** Open PR / merge E7A stack to main

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
| M6 — Manual Sandbox  | IN_PROGRESS | E7A Admin API + UI + e2e in progress |
| M7 — Paper           | TODO        |                                      |
| M8 — Guarded Live    | TODO        |                                      |

## EPIC E7A (v1.2)

| ID     | Status | Notes                                                               |
| ------ | ------ | ------------------------------------------------------------------- |
| BL-078 | DONE   | Durable command request bodies                                      |
| BL-079 | DONE   | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE   | Safe fund/close                                                     |
| BL-088 | DONE   | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE   | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## Notes

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`

## Next

1. Merge stage branches / open PR to main
2. Worker outbox drain for sandbox commands
