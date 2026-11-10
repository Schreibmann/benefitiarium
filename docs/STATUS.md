# Project Status

**Updated:** 2026-11-10  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M3 — Realtime candle stream (MVP slice) + chart UX  
**Active task:** `cursor/bl-040-realtime-candle-stream` (guide **v1.3** alignment: no stream `is_complete`)  
**Next task:** RT-05 schedule finalizer + RT-06/07; move stream host to `worker-market-data`; pivot persistence

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status      | Notes                                                      |
| -------------------- | ----------- | ---------------------------------------------------------- |
| M0 — Foundation      | DONE        | EPIC E0 verified locally                                   |
| M1 — Providers       | IN_PROGRESS | E1 nearly complete; BL-017 done                            |
| M2 — Historical Data | TODO        | needs BL-039 live matrix + BL-031                          |
| M3 — Realtime        | IN_PROGRESS | Stream manager + registry + chart WS Live button (API MVP) |
| M4 — Signals         | TODO        |                                                            |
| M5 — Backtesting     | TODO        |                                                            |
| M6 — Manual Sandbox  | IN_PROGRESS | E7A Admin API + UI + e2e in progress                       |
| M7 — Paper           | TODO        |                                                            |
| M8 — Guarded Live    | TODO        |                                                            |

## EPIC E7A (v1.2)

| ID     | Status | Notes                                                               |
| ------ | ------ | ------------------------------------------------------------------- |
| BL-078 | DONE   | Durable command request bodies                                      |
| BL-079 | DONE   | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE   | Safe fund/close                                                     |
| BL-088 | DONE   | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE   | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## Fibonacci Pivot Points / chart UX

| Piece                                | Status   | Notes                                                             |
| ------------------------------------ | -------- | ----------------------------------------------------------------- |
| Pure calculator `@moex/indicators`   | DONE     | ADR formula; 5m→1D / 1h→1W                                        |
| On-read API candles + pivots         | DONE     | T-Invest via `TINVEST_READ_ONLY_TOKEN` or sandbox token           |
| TanStack Charts UI `/charts/:ticker` | DONE     | Candles + period-bounded pivot `link`s                            |
| Custom wheel zoom / drag pan         | DONE     | Replaces broken TanStack `zoomX` remount loop                     |
| Futures catalog cache-first picker   | DONE     | nanostores persistent + DB snapshot                               |
| Chart route code-split + bootstrap   | DONE     | Lazy admin/chart chunks; skip duplicate warm refresh; catalog UID |
| Signals                              | DEFERRED | Out of scope for this slice                                       |
| Persist table / workers              | DEFERRED | Next stage after UI                                               |

## Realtime candle stream (E4 / RT slices)

| Slice | Status      | Notes                                                                               |
| ----- | ----------- | ----------------------------------------------------------------------------------- |
| RT-01 | DONE        | SDK note + Candle/HistoricCandle contract test (no stream `is_complete`)            |
| RT-02 | DONE        | `StreamConnectionManager` + reconnect backoff                                       |
| RT-03 | DONE        | `SubscriptionRegistry` ref-count / 300 cap / 100 req·min⁻¹                          |
| RT-04 | IN_PROGRESS | Stream mapper with `deliveryMode`/`barState`; DB upsert deferred                    |
| RT-05 | IN_PROGRESS | Events: updated / close_emitted / finalized / corrected (no schedule finalizer yet) |
| RT-06 | TODO        | gap backfill                                                                        |
| RT-07 | TODO        | feed health                                                                         |
| RT-08 | IN_PROGRESS | Internal `/ws/market-data` fan-out (in API process)                                 |
| RT-09 | IN_PROGRESS | Chart auto-starts live stream + CHART leases; history REST fallback                 |

Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**)

## Notes

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Chart: `http://127.0.0.1:5173/charts/NG-12.26` (Vite proxies `/api` and `/ws` → `:3000`)
- Perf / Lighthouse: measure `pnpm --filter @moex/web build` + `preview` (not `vite` dev); preview proxies `/api` and `/ws` → `:3000`
- Spec: `docs/ADR/fibonacci-pivot-points-implementation-spec.md`

## Next

1. Set `ADMIN_API_TOKEN` / T-Invest read token in `.env` for full local loops
2. Live smoke of `/ws/market-data` against a liquid futures UID
3. Host stream in `worker-market-data` + IPC to API gateway
4. RT-05…RT-07 + candle persistence upsert
5. Pivot persistence + calendar-alignment gate (ADR §3.5 / §6–7)
