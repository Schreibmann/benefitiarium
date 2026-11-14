# Project Status / Статус проекта

**RU.** **Обновлено:** 2026-11-16  
**EN.** **Updated:** 2026-11-16

**RU.** **Версия backlog:** TECHNICAL_BACKLOG **v1.2**  
**EN.** **Backlog version:** TECHNICAL_BACKLOG **v1.2**

**RU.** **Текущий milestone:** M3 realtime + independent Live Runtime · M4 signals (TSE + BL-106…109) · UI foundation  
**EN.** **Current milestone:** M3 realtime + independent Live Runtime · M4 signals (TSE + BL-106…109) · UI foundation

**RU.** **Активная задача:** BL-106…109 Grammy Telegram forum topics + Live notifications wire (ADR-012)  
**EN.** **Active task:** BL-106…109 Grammy Telegram forum topics + Live notifications wire (ADR-012)

**RU.** **Следующая задача:** Phase 7 TSE; UI-017; RT-05…07; worker split  
**EN.** **Next task:** Phase 7 TSE; UI-017; RT-05…07; worker split

**RU.** Статусы живут здесь. Не считайте сообщения агента в чате источником истины без CI/верификации.  
**EN.** Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone / Вехи

| Milestone            | Status / Статус | Notes / Примечания                                                   |
| -------------------- | --------------- | -------------------------------------------------------------------- |
| M0 — Foundation      | DONE            | EPIC E0 verified locally                                             |
| M1 — Providers       | IN_PROGRESS     | E1 nearly complete; BL-017 done                                      |
| M2 — Historical Data | TODO            | needs BL-039 live matrix + BL-031                                    |
| M3 — Realtime        | IN_PROGRESS     | Shared `MarketStreamHub` + chart CHART leases (API MVP)              |
| M4 — Signals         | IN_PROGRESS     | TSE Phase 0–6 + LiveRuntime + BL-106…109 market triggers / Telegram  |
| M5 — Backtesting     | TODO            | —                                                                    |
| M6 — Manual Sandbox  | DONE (E7A)      | BL-078…089 on main                                                   |
| M7 — Paper           | TODO            | Paper loop in `@moex/strategy-engine` Phase 6; runtime wiring next   |
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

| Piece / Компонент                      | Status / Статус | Notes / Примечания                                                |
| -------------------------------------- | --------------- | ----------------------------------------------------------------- |
| Pure calculator `@moex/indicators`     | DONE            | ADR formula; 5m→1D / 1h→1W                                        |
| On-read API candles + pivots           | DONE            | T-Invest via `TINVEST_READ_ONLY_TOKEN` or sandbox token           |
| TanStack Charts UI `/charts/:ticker`   | DONE            | Candles + period-bounded pivot `link`s                            |
| Timeframes `1m` / `5m` / `1h`          | DONE            | Chart TF switch; pivots on 5m/1h                                  |
| Session X-scale + Reset zoom           | DONE            | Session domain; wheel zoom / drag pan; Reset zoom control         |
| Preserve viewport across TF            | DONE            | Zoom/pan kept when switching `1m`/`5m`/`1h`                       |
| Custom wheel zoom / drag pan           | DONE            | Replaces broken TanStack `zoomX` remount loop                     |
| Futures catalog cache-first picker     | DONE            | Categories + family optgroups; nanostores + API snapshot          |
| Chart realtime + history REST fallback | DONE            | Chart CHART leases (display only); REJECTED/error → REST          |
| Independent Live Mode                  | DONE (MVP)      | Futures GetFavorites + live level alerts + TSE closed-bar confirm |
| Chart route code-split + bootstrap     | DONE            | Lazy admin/chart chunks; skip duplicate warm refresh; catalog UID |
| Signals                                | IN_PROGRESS     | BL-106…109 market trigger alerts (not trading signals)            |
| Persist table / workers                | IN_PROGRESS     | BL-107 tables; BL-108/109 workers                                 |

## Horizontal volume (trades VP) / Горизонтальный объём (VP по сделкам)

| Piece / Компонент                            | Status / Статус | Notes / Примечания                                                                                    |
| -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| Pure calculator `@moex/indicators`           | DONE            | `HORIZONTAL_VOLUME_TRADES` (+ OHLCV research fallback); POC / VAH / VAL                               |
| History MD day archives                      | DONE            | `GET /history-trades/{YYYY-MM-DD}`; week/month ranges; ~30 files/min throttle                         |
| On-read API `…/indicators/horizontal-volume` | DONE            | `MarketDataProvider.getTrades` → trades VP; meta: `historyTradeDays` / `tradesSource` / `missingDays` |
| Chart overlay                                | DONE            | Right-anchored histogram + POC/VA guides on `/charts/:ticker`                                         |
| OHLCV uniform approximation                  | DONE (research) | Kept in `@moex/indicators` as `HORIZONTAL_VOLUME_OHLCV`; not used by the chart API route              |

**RU.** GetTechAnalysis не отдаёт volume profile. API строит профиль из анонимизированных сделок History MD (дневные архивы за неделю/месяц) плюс опциональный фрагмент `GetLastTrades` за текущий UTC-день. Нужен production read-only токен.  
**EN.** GetTechAnalysis has no volume profile. The API builds VP from History MD anonymized day-trade archives (week/month) plus an optional `GetLastTrades` fragment for the current UTC day. Requires a production read-only token.

## Market trigger signals (BL-106…109) / Рыночные триггер-сигналы (BL-106…109)

| ID     | Status / Статус | Notes / Примечания                                                           |
| ------ | --------------- | ---------------------------------------------------------------------------- |
| BL-106 | DONE            | `@moex/signal-triggers`; fib approach/cross; reference-periods in indicators |
| BL-107 | DONE            | `market_signals` + `notifications` migration and repos                       |
| BL-108 | TODO            | `apps/worker-signals` favorites 5m/1h evaluator                              |
| BL-109 | TODO            | `apps/worker-notifier` Telegram via Grammy + forum topics                    |

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
| RT-08 | IN_PROGRESS     | Internal `/ws/market-data` fan-out via shared `MarketStreamHub` (API process)       |
| RT-09 | DONE (MVP)      | Chart CHART leases (display); Independent Live = STRATEGY leases (ADR-011)          |
| RT-10 | DONE (MVP)      | LiveRuntime: level alerts (approach/cross/chop) + TSE entry confirm + Telegram stub |

**RU.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**) · ADR: [`docs/ADR/011-independent-live-runtime-shared-stream.md`](ADR/011-independent-live-runtime-shared-stream.md)  
**EN.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**) · ADR: [`docs/ADR/011-independent-live-runtime-shared-stream.md`](ADR/011-independent-live-runtime-shared-stream.md)

**RU.** **Live Mode ≠ chart realtime.** Live анализирует избранное 24/7 независимо от UI; график только отображает свечи через CHART leases на том же hub.  
**EN.** **Live Mode ≠ chart realtime.** Live analyzes favorites 24/7 independent of the UI; the chart only displays candles via CHART leases on the same hub.

## Trading Signal Engine / Движок торговых сигналов

**RU.** Spec: [`docs/BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`](BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md) · Map: [`docs/trading-signal-engine/REPOSITORY_MAP.md`](trading-signal-engine/REPOSITORY_MAP.md) · Package: `@moex/strategy-engine` (Phase 1–6: through paper fills, exits/trailing, trade evaluations).  
**EN.** Spec: [`docs/BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`](BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md) · Map: [`docs/trading-signal-engine/REPOSITORY_MAP.md`](trading-signal-engine/REPOSITORY_MAP.md) · Package: `@moex/strategy-engine` (Phase 1–6: through paper fills, exits/trailing, trade evaluations).

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

1. Finish BL-106…109 Grammy Telegram (alerts/logs/errors topics) + Live queue wiring
2. Signal Engine Phase 7 — historical replay, backtest costs, Evals reports
3. Host stream in `worker-market-data` + Live in `worker-strategy` + IPC to API gateway
4. UI-017 / UI-008 / UI-009; RT-05…RT-07 + candle persistence upsert; pivot persistence

**EN.**

1. Finish BL-106…109 Grammy Telegram (alerts/logs/errors topics) + Live queue wiring
2. Signal Engine Phase 7 — historical replay, backtest costs, Evals reports
3. Host stream in `worker-market-data` + Live in `worker-strategy` + IPC to API gateway
4. UI-017 / UI-008 / UI-009; RT-05…RT-07 + candle persistence upsert; pivot persistence
