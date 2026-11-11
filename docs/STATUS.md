# Project Status / Статус проекта

**RU.** **Обновлено:** 2026-11-11  
**EN.** **Updated:** 2026-11-11

**RU.** **Версия backlog:** TECHNICAL_BACKLOG **v1.2**  
**EN.** **Backlog version:** TECHNICAL_BACKLOG **v1.2**

**RU.** **Текущий milestone:** M6 — Manual Sandbox (E7A DONE) · UI foundation · M3 realtime chart slice  
**EN.** **Current milestone:** M6 — Manual Sandbox (E7A DONE) · UI foundation · M3 realtime chart slice

**RU.** **Активная задача:** merge UI-001…016 + BL-040 realtime/chart into `main`  
**EN.** **Active task:** merge UI-001…016 + BL-040 realtime/chart into `main`

**RU.** **Следующая задача:** UI-017 visual regression; RT-05…07; host stream in `worker-market-data`  
**EN.** **Next task:** UI-017 visual regression; RT-05…07; host stream in `worker-market-data`

**RU.** Статусы живут здесь. Не считайте сообщения агента в чате источником истины без CI/верификации.  
**EN.** Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone / Вехи

| Milestone            | Status / Статус | Notes / Примечания                                                   |
| -------------------- | --------------- | -------------------------------------------------------------------- |
| M0 — Foundation      | DONE            | EPIC E0 verified locally                                             |
| M1 — Providers       | IN_PROGRESS     | E1 nearly complete; BL-017 done                                      |
| M2 — Historical Data | TODO            | needs BL-039 live matrix + BL-031                                    |
| M3 — Realtime        | IN_PROGRESS     | Stream manager + registry + chart WS Live button (API MVP)           |
| M4 — Signals         | TODO            | —                                                                    |
| M5 — Backtesting     | TODO            | —                                                                    |
| M6 — Manual Sandbox  | DONE (E7A)      | BL-078…089 on main                                                   |
| M7 — Paper           | TODO            | —                                                                    |
| M8 — Guarded Live    | TODO            | —                                                                    |
| UI foundation        | IN_PROGRESS     | UI-001…007, UI-010…013, UI-015…016 done; next UI-017 / instrument UI |

## EPIC E7A (v1.2) / EPIC E7A (v1.2)

| ID     | Status / Статус | Notes / Примечания                                                  |
| ------ | --------------- | ------------------------------------------------------------------- |
| BL-078 | DONE            | Durable command request bodies                                      |
| BL-079 | DONE            | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE            | Safe fund/close                                                     |
| BL-088 | DONE            | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE            | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## UI design backlog / UI design backlog

**RU.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md) · Primitives: [`docs/ui/SHARED_PRIMITIVES.md`](ui/SHARED_PRIMITIVES.md) · Responsive: [`docs/ui/RESPONSIVE_PASS.md`](ui/RESPONSIVE_PASS.md) · A11y: [`docs/ui/A11Y_PASS.md`](ui/A11Y_PASS.md)  
**EN.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md) · Primitives: [`docs/ui/SHARED_PRIMITIVES.md`](ui/SHARED_PRIMITIVES.md) · Responsive: [`docs/ui/RESPONSIVE_PASS.md`](ui/RESPONSIVE_PASS.md) · A11y: [`docs/ui/A11Y_PASS.md`](ui/A11Y_PASS.md)

| ID     | Status / Статус | Notes / Примечания                            |
| ------ | --------------- | --------------------------------------------- |
| UI-001 | DONE            | Frontend audit; no duplicate UI kit           |
| UI-002 | DONE            | Tokens + ThemeProvider + FOUC bootstrap       |
| UI-003 | DONE            | App shell sidebar/topbar + `/app` routes      |
| UI-004 | DONE            | Shared Button/Card/Badge/Empty/Dialog         |
| UI-005 | DONE            | Landing Page sections + risk disclaimer       |
| UI-006 | DONE            | Dashboard overview empty widgets + layout     |
| UI-007 | DONE            | Welcome + onboarding checklist (localStorage) |
| UI-010 | DONE            | Signals filters/list/detail; signal ≠ order   |
| UI-011 | DONE            | Strategies create/settings/mode/status shells |
| UI-012 | DONE            | Backtesting params/progress/metrics/compare   |
| UI-013 | DONE            | Trading+Portfolio modes; LIVE confirm; empty  |
| UI-015 | DONE            | Breakpoints 767/1279/1280; QA 375–1440        |
| UI-016 | DONE            | Skip links, drawer inert, tabs keyboard       |

## Fibonacci Pivot Points / chart UX / Fibonacci Pivot Points / UX графика

| Piece / Компонент                    | Status / Статус | Notes / Примечания                                                |
| ------------------------------------ | --------------- | ----------------------------------------------------------------- |
| Pure calculator `@moex/indicators`   | DONE            | ADR formula; 5m→1D / 1h→1W                                        |
| On-read API candles + pivots         | DONE            | T-Invest via `TINVEST_READ_ONLY_TOKEN` or sandbox token           |
| TanStack Charts UI `/charts/:ticker` | DONE            | Candles + period-bounded pivot `link`s                            |
| Timeframes `1m` / `5m` / `1h`        | DONE            | Chart TF switch; pivots on 5m/1h                                  |
| Session X-scale + Reset zoom         | DONE            | Session domain; wheel zoom / drag pan; Reset zoom control         |
| Preserve viewport across TF          | DONE            | Zoom/pan kept when switching `1m`/`5m`/`1h`                       |
| Custom wheel zoom / drag pan         | DONE            | Replaces broken TanStack `zoomX` remount loop                     |
| Futures catalog cache-first picker   | DONE            | Categories + family optgroups; nanostores + API snapshot          |
| Auto-live + history REST fallback    | DONE            | Auto-subscribe on instrument select; REJECTED/error → REST        |
| Chart route code-split + bootstrap   | DONE            | Lazy admin/chart chunks; skip duplicate warm refresh; catalog UID |
| Signals                              | DEFERRED        | Out of scope for this slice                                       |
| Persist table / workers              | DEFERRED        | Next stage after UI                                               |

## Realtime candle stream (E4 / RT slices) / Realtime поток свечей (E4 / срезы RT)

| Slice | Status / Статус | Notes / Примечания                                                                  |
| ----- | --------------- | ----------------------------------------------------------------------------------- |
| RT-01 | DONE            | SDK note + Candle/HistoricCandle contract test (no stream `is_complete`)            |
| RT-02 | DONE            | `StreamConnectionManager` + reconnect backoff                                       |
| RT-03 | DONE            | `SubscriptionRegistry` ref-count / 300 cap / 100 req·min⁻¹                          |
| RT-04 | IN_PROGRESS     | Stream mapper with `deliveryMode`/`barState`; DB upsert deferred                    |
| RT-05 | IN_PROGRESS     | Events: updated / close_emitted / finalized / corrected (no schedule finalizer yet) |
| RT-06 | TODO            | gap backfill                                                                        |
| RT-07 | TODO            | feed health                                                                         |
| RT-08 | IN_PROGRESS     | Internal `/ws/market-data` fan-out (in API process)                                 |
| RT-09 | IN_PROGRESS     | Chart auto-starts live stream + CHART leases; history REST fallback                 |

**RU.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**)  
**EN.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**)

## Notes / Заметки

**RU.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Web: `/` Landing · `/app` overview · `/app/signals` · `/app/strategies` · `/app/backtesting` · `/app/trading` · `/app/portfolio` · `/charts/:ticker` · `/admin/sandbox`
- `pnpm dev` runs **API + web only**; workers via `pnpm dev:workers`

**EN.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Web: `/` Landing · `/app` overview · `/app/signals` · `/app/strategies` · `/app/backtesting` · `/app/trading` · `/app/portfolio` · `/charts/:ticker` · `/admin/sandbox`
- `pnpm dev` runs **API + web only**; workers via `pnpm dev:workers`

## Next / Дальше

**RU.**

1. UI-017 visual regression (Landing/Dashboard Dark/Light)
2. UI-008 / UI-009 — Instrument page + realtime lease UI
3. Live smoke of `/ws/market-data` against a liquid futures UID
4. Host stream in `worker-market-data` + IPC to API gateway
5. RT-05…RT-07 + candle persistence upsert; pivot persistence

**EN.**

1. UI-017 visual regression (Landing/Dashboard Dark/Light)
2. UI-008 / UI-009 — Instrument page + realtime lease UI
3. Live smoke of `/ws/market-data` against a liquid futures UID
4. Host stream in `worker-market-data` + IPC to API gateway
5. RT-05…RT-07 + candle persistence upsert; pivot persistence
