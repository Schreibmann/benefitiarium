# Project Status / Статус проекта

**RU.** **Обновлено:** 2026-11-10  
**EN.** **Updated:** 2026-11-10

**RU.** **Версия backlog:** TECHNICAL_BACKLOG **v1.2**  
**EN.** **Backlog version:** TECHNICAL_BACKLOG **v1.2**

**RU.** **Текущий milestone:** M3 — Realtime candle stream (MVP slice) + chart UX  
**EN.** **Current milestone:** M3 — Realtime candle stream (MVP slice) + chart UX

**RU.** **Активная задача:** `cursor/bl-040-realtime-candle-stream` (guide **v1.3** alignment: no stream `is_complete`)  
**EN.** **Active task:** `cursor/bl-040-realtime-candle-stream` (guide **v1.3** alignment: no stream `is_complete`)

**RU.** **Следующая задача:** RT-05 schedule finalizer + RT-06/07; move stream host to `worker-market-data`; pivot persistence  
**EN.** **Next task:** RT-05 schedule finalizer + RT-06/07; move stream host to `worker-market-data`; pivot persistence

**RU.** Статусы живут здесь. Не считайте сообщения агента в чате источником истины без CI/верификации.

**EN.** Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone / Вехи

| Milestone            | Status / Статус | Notes / Примечания                                                    |
| -------------------- | --------------- | --------------------------------------------------------------------- |
| M0 — Foundation      | DONE            | EPIC E0 verified locally / EPIC E0 проверен локально                  |
| M1 — Providers       | IN_PROGRESS     | E1 nearly complete; BL-017 done / E1 почти готов; BL-017 сделан       |
| M2 — Historical Data | TODO            | needs BL-039 live matrix + BL-031 / нужны BL-039 live matrix + BL-031 |
| M3 — Realtime        | IN_PROGRESS     | Stream manager + registry + chart WS Live button (API MVP)            |
| M4 — Signals         | TODO            | — / —                                                                 |
| M5 — Backtesting     | TODO            | — / —                                                                 |
| M6 — Manual Sandbox  | IN_PROGRESS     | E7A Admin (BL-078…089) DONE; live manual order ticket — нет           |
| M7 — Paper           | TODO            | — / —                                                                 |
| M8 — Guarded Live    | TODO            | — / —                                                                 |

## EPIC E7A (v1.2) / EPIC E7A (v1.2)

| ID     | Status / Статус | Notes / Примечания                                                  |
| ------ | --------------- | ------------------------------------------------------------------- |
| BL-078 | DONE            | Durable command request bodies / Долговечные тела команд            |
| BL-079 | DONE            | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE            | Safe fund/close / Безопасное пополнение и закрытие                  |
| BL-088 | DONE            | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE            | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## Fibonacci Pivot Points / chart UX / Fibonacci Pivot Points / UX графика

| Piece / Компонент                    | Status / Статус | Notes / Примечания                                                        |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------- |
| Pure calculator `@moex/indicators`   | DONE            | ADR formula; 5m→1D / 1h→1W                                                |
| On-read API candles + pivots         | DONE            | T-Invest via `TINVEST_READ_ONLY_TOKEN` or sandbox token                   |
| TanStack Charts UI `/charts/:ticker` | DONE            | Candles + period-bounded pivot `link`s / Свечи + pivot `link`s по периоду |
| Timeframes `1m` / `5m` / `1h`        | DONE            | Chart TF switch; pivots on 5m/1h / Переключение TF; pivots на 5m/1h       |
| Session X-scale + Reset zoom         | DONE            | Session domain; wheel zoom / drag pan; Reset zoom control                 |
| Preserve viewport across TF          | DONE            | Zoom/pan kept when switching `1m`/`5m`/`1h`                               |
| Custom wheel zoom / drag pan         | DONE            | Replaces broken TanStack `zoomX` remount loop                             |
| Futures catalog cache-first picker   | DONE            | Categories + family optgroups; nanostores + API snapshot                  |
| Auto-live + history REST fallback    | DONE            | Auto-subscribe on instrument select; REJECTED/error → REST                |
| Chart route code-split + bootstrap   | DONE            | Lazy admin/chart chunks; skip duplicate warm refresh; catalog UID         |
| Signals                              | DEFERRED        | Out of scope for this slice / Вне scope этого среза                       |
| Persist table / workers              | DEFERRED        | Next stage after UI / Следующий этап после UI                             |

## Realtime candle stream (E4 / RT slices) / Realtime поток свечей (E4 / срезы RT)

| Slice | Status / Статус | Notes / Примечания                                                                  |
| ----- | --------------- | ----------------------------------------------------------------------------------- |
| RT-01 | DONE            | SDK note + Candle/HistoricCandle contract test (no stream `is_complete`)            |
| RT-02 | DONE            | `StreamConnectionManager` + reconnect backoff                                       |
| RT-03 | DONE            | `SubscriptionRegistry` ref-count / 300 cap / 100 req·min⁻¹                          |
| RT-04 | IN_PROGRESS     | Stream mapper with `deliveryMode`/`barState`; DB upsert deferred                    |
| RT-05 | IN_PROGRESS     | Events: updated / close_emitted / finalized / corrected (no schedule finalizer yet) |
| RT-06 | TODO            | gap backfill / дозаполнение гэпов                                                   |
| RT-07 | TODO            | feed health / здоровье фида                                                         |
| RT-08 | IN_PROGRESS     | Internal `/ws/market-data` fan-out (in API process)                                 |
| RT-09 | IN_PROGRESS     | Chart auto-starts live stream + CHART leases; history REST fallback                 |

**RU.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**)

**EN.** Guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**)

## Notes / Заметки

**RU.** E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)

**EN.** E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)

**RU.** Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`

**EN.** Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`

**RU.** Quality: Biome + `pnpm precommit`

**EN.** Quality: Biome + `pnpm precommit`

**RU.** Chart: `http://127.0.0.1:5173/charts/NG-12.26` (Vite proxies `/api` and `/ws` → `:3000`)

**EN.** Chart: `http://127.0.0.1:5173/charts/NG-12.26` (Vite proxies `/api` and `/ws` → `:3000`)

**RU.** Perf / Lighthouse: measure `pnpm --filter @moex/web build` + `preview` (not `vite` dev); preview proxies `/api` and `/ws` → `:3000`

**EN.** Perf / Lighthouse: measure `pnpm --filter @moex/web build` + `preview` (not `vite` dev); preview proxies `/api` and `/ws` → `:3000`

**RU.** Spec: `docs/ADR/fibonacci-pivot-points-implementation-spec.md`

**EN.** Spec: `docs/ADR/fibonacci-pivot-points-implementation-spec.md`

## Next / Дальше

**RU.**

1. Set `ADMIN_API_TOKEN` / T-Invest read token in `.env` for full local loops
2. Live smoke of `/ws/market-data` against a liquid futures UID
3. Host stream in `worker-market-data` + IPC to API gateway
4. RT-05…RT-07 + candle persistence upsert
5. Pivot persistence + calendar-alignment gate (ADR §3.5 / §6–7)

**EN.**

1. Set `ADMIN_API_TOKEN` / T-Invest read token in `.env` for full local loops
2. Live smoke of `/ws/market-data` against a liquid futures UID
3. Host stream in `worker-market-data` + IPC to API gateway
4. RT-05…RT-07 + candle persistence upsert
5. Pivot persistence + calendar-alignment gate (ADR §3.5 / §6–7)
