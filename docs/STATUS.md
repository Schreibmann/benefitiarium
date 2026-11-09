# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A) + Fibonacci pivots chart UI slice  
**Active task:** Fibonacci Pivot Points chart UI (`cursor/bl-fib-pivots-chart-ui`)  
**Next task:** Persist/workers for pivots; merge E7A + chart branches; sandbox worker outbox drain

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

## Fibonacci Pivot Points (UI slice)

| Piece                                | Status   | Notes                                                   |
| ------------------------------------ | -------- | ------------------------------------------------------- |
| Pure calculator `@moex/indicators`   | DONE     | ADR formula; 5m→1D / 1h→1W                              |
| On-read API candles + pivots         | DONE     | T-Invest via `TINVEST_READ_ONLY_TOKEN` or sandbox token |
| TanStack Charts UI `/charts/:ticker` | DONE     | Candles + period-bounded pivot `link`s                  |
| Signals                              | DEFERRED | Out of scope for this slice                             |
| Persist table / workers              | DEFERRED | Next stage after UI                                     |

## Notes

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Chart: `http://127.0.0.1:5173/charts/NG-12.26` (Vite proxies `/api` → `:3000`)
- Spec: `docs/ADR/fibonacci-pivot-points-implementation-spec.md`

## Next

1. Set `ADMIN_API_TOKEN` / T-Invest read token in `.env` for full local loops
2. Merge stage branches / open PR to main
3. Worker outbox drain for sandbox commands
4. Pivot persistence + calendar-alignment gate (ADR §3.5 / §6–7)
