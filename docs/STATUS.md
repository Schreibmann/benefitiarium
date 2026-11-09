# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** E7A locally verified; next is PR / merge to main  
**Next task:** Open PR / merge E7A stack to main; then worker outbox drain

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
- Local verify 2026-11-09: `docker compose` Postgres healthy; migrations 000–002 applied; `pnpm lint` (warnings only), `typecheck`, `test`, `build`, Playwright e2e 3/3; API health smoke OK (`ADMIN_API_TOKEN` empty → admin routes off)

## Next

1. Set `ADMIN_API_TOKEN` in `.env` for full Admin UI loop
2. Merge stage branches / open PR to main
3. Worker outbox drain for sandbox commands
