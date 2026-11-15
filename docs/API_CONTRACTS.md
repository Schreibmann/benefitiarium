# External API contract notes / Заметки по внешним API-контрактам

**RU.** **Обновлено:** 2026-11-10  
**EN.** **Updated:** 2026-11-10

**RU.** **Согласовано с:** TECHNICAL_BACKLOG v1.2  
**EN.** **Aligned with:** TECHNICAL_BACKLOG v1.2

**RU.** Санитизированные заметки со spike. Не коммитить токены и персональные payload счёта.

**EN.** Sanitized notes from spikes. Do not commit tokens or personal account payloads.

## T-Invest SDK (`@ttech-pub/*`) — BL-013 / BL-014

| Package                       | Pinned version |
| ----------------------------- | -------------- |
| `@ttech-pub/invest-sdk-node`  | `1.61.0`       |
| `@ttech-pub/invest-core`      | `1.61.0`       |
| `@ttech-pub/grpc-node-client` | `1.61.0`       |

**RU.** Заметки по runtime:

**EN.** Runtime notes:

- Node.js `>=22` (repo `.node-version`).
- Entry: `InvestNodeSDK.create({ token, url, telemetry })` then `sdk.send(command)`.
- Empty token → SDK `EmptyTokenError`; our wrapper also rejects blank tokens before create.
- Env secrets: `TINVEST_SANDBOX_TOKEN` (sandbox URL) and `TINVEST_READ_ONLY_TOKEN` (production read).
- `TINVEST_FULL_ACCESS_TOKEN` reserved for execution worker later; not used by spike/read adapters.
- Sandbox URL: `https://sandbox-invest-public-api.tbank.ru:443`
- Production URL: `https://invest-public-api.tbank.ru:443`
- TLS: `createTinvestSdk` sets `useMincifryCertificate: true` by default (Russian CA). Without it Node often errors with `self-signed certificate in certificate chain`.
- Stream commands return `Promise<Observable<...>>` (RxJS 7.8.0).
- Peer warning observed on install: `@opentelemetry/api` range mismatch under `@sentry/node` (non-blocking for offline spike).
- Runtime gap: `@ttech-pub/grpc-node-client@1.61.0` requires `@bufbuild/protobuf` (`/wire`) and peer `nice-grpc`; added explicitly in `@moex/broker-tinvest`.

**RU.** Команды, подтверждённые offline:

**EN.** Commands verified present offline:

- `GetSharesCommand`, `GetFuturesCommand`, `GetIndicativesCommand`
- `GetCandlesCommand`, `GetLastPricesCommand`, `GetMarketdataStreamCommand`
- `GetTechAnalysis` via local `BaseCommand` wrapper (`buildGetTechAnalysisCommand`) — SDK 1.61.0 has `GetTechAnalysisIndicatorsCommand` but does not re-export it; wrapper also maps `upperBand`
- `GetSandboxAccountsCommand`, `GetSandboxPositionsCommand`, `PostSandboxOrderCommand`

### MarketDataStream realtime (BL-040…BL-045 / RT-01…RT-09)

**RU.** Каноническое руководство: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**).

**EN.** Canonical guide: [`docs/realtime/TINVEST_REALTIME_CANDLE_STREAM.md`](realtime/TINVEST_REALTIME_CANDLE_STREAM.md) (**v1.3**).

**RU.** Заметки SDK spike (1.61.0):

**EN.** SDK spike notes (1.61.0):

- `GetMarketdataStreamCommand` opens **`marketDataServerSideStream`** (unary request → server stream), not the bidirectional `MarketDataStream`. Dynamic subscribe/unsubscribe on one connection requires low-level `NodeApiClient.marketdataStream.marketDataStream(AsyncIterable<MarketDataRequest>)`.
- Platform manager: `@moex/broker-tinvest` `StreamConnectionManager` + `SubscriptionRegistry` (ref-counted provider keys; limits **32** quote stream connections / **300** subscriptions per stream / **100** subscribe requests/min).
- **Candle ≠ HistoricCandle:** stream `Candle` has no `is_complete`; `HistoricCandle` from `GetCandles` does. Contract test: `stream-candle-contract.test.ts`. Lifecycle uses `waitingClose` → `deliveryMode`/`barState` (`UPDATING` | `CLOSE_EMITTED` | `FINALIZED_BY_SCHEDULE` | `CORRECTED`).
- Candle source enum in stream SDK: `CandleSource.CANDLE_SOURCE_EXCHANGE` / `CANDLE_SOURCE_DEALER_WEEKEND` (REST may say `INCLUDE_WEEKEND`); canonical label `WEEKEND_INCLUDED`.
- Internal browser transport (MVP): WebSocket `/ws/market-data` with `market.subscribe` / `market.unsubscribe` / `market.subscription.state` / `market.candle.updated|close_emitted|finalized|corrected` (no broker token in browser). Currently attached in-process to `apps/api` until `worker-market-data` hosts the stream.
- Chart page Live button: one `instrumentId` + one timeframe per subscribe; ephemeral `CHART` leases only after explicit click; history load does not create demand.

### Futures vs Indicatives (v1.1)

- **Futures / FutureBy** — tradeable contract series. Map via `GetFuturesCommand` with InstrumentsRequest:
  - `instrumentStatus = INSTRUMENT_STATUS_BASE`
  - `instrumentExchange = INSTRUMENT_EXCHANGE_UNSPECIFIED` (enum from `@ttech-pub/grpc-node-client/compiled/instruments`)
  - UID lookup is `FutureBy` at gRPC (`futureBy`). Node SDK 1.61.0 has no dedicated FutureBy command — adapter uses UID filter over futures catalog.
  - Category resolution prefers `Future.sector`, falling back to `Future.asset_type` when sector is empty/unknown (`resolveFuturesListCategory`). Docs still document `asset_type`: `commodity` | `currency` | `security` | `index` (domain maps `security` → `share`, `index` → `equity_index`).
  - Durable snapshot: `futures_catalog_cache` (migration 003). Successful list refreshes Postgres; on live failure (esp. `RESOURCE_EXHAUSTED`) API serves the snapshot when non-empty.
- **Indicatives** — underlying index/commodity series (e.g. IMOEX). Candles allowed via `GetCandles`, but **must not** replace contract history.
- Futures metadata used in domain: `basicAsset`, `basicAssetPositionUid`, `assetType`, `sector`, `expirationDate`, `first1minCandleDate`, `first1dayCandleDate`, `minPriceIncrementAmount`, margins (MoneyValue/Quotation → decimal string).
- History MD annual ZIP example naming: `CRZ5_SPBFUT`. Missing archive year → `unavailable`, not zero volume.
- Candle requests always by `instrument_uid`.

### GetTechAnalysis indicators

- Official IndicatorType: **BB | EMA | RSI | MACD | SMA** only ([investAPI marketdata.proto](https://github.com/RussianInvestments/investAPI)).
- **No Fibonacci** and **no horizontal volume / volume profile** in GetTechAnalysis. Local Fibonacci Pivot Points (`GET …/indicators/fibonacci-pivots`, `@moex/indicators`) remain the chart overlay and are **not** superseded.
- **Local horizontal volume** (`GET …/indicators/horizontal-volume`, `@moex/indicators` `HORIZONTAL_VOLUME_TRADES`): true volume-at-price from anonymized trades via `MarketDataProvider.getTrades`. Data source: History MD daily archives `GET /history-trades/{YYYY-MM-DD}?instrumentId=` (nightly; no current day; ~30 files/min) plus optional live `GetLastTrades` fragment for the current UTC day. `sourceKind: last_trades`; meta includes `tradesSource` (`history_trades` \| `last_trades` \| `mixed`), `historyTradeDays`, `missingDays`, `lastTradesIncluded`, `tradeCount`. Response: `levels[]` (with `buyVolume`/`sellVolume`), `poc` / `vah` / `val`, `volumeUnit`. OHLCV uniform approx remains in the indicators package as research-only. Chart compose **requires** `TINVEST_READ_ONLY_TOKEN` and production hosts (sandbox token/URL are not used for VP). History MD HTTP uses Mincifry CA (Node default `fetch` hits `SELF_SIGNED_CERT_IN_CHAIN`). **Chart UI** requests VP with `from`/`to` equal to the visible candle window (250 ms debounce after pan/zoom; skips refetch when the UTC day set is unchanged; aborts in-flight requests) — not a fixed week/month lookback.
- Adapter: `TinvestReadApi.getTechAnalysis` → raw bands/signal/macd strings. No HTTP route yet for BB/EMA/RSI/MACD/SMA (stop at adapter + fixtures).

**RU.** Горизонтальный объём в T-Invest GetTechAnalysis отсутствует; локальный endpoint строит volume profile из дневных архивов History MD через `TINVEST_READ_ONLY_TOKEN` и при необходимости добирает текущий UTC-день через `GetLastTrades` (окно ~1 час). Chart UI передаёт `from`/`to` по видимому окну (debounce 250 ms, skip тех же UTC-дней). Песочный токен для архивов не используется.

**EN.** Horizontal volume is absent from T-Invest GetTechAnalysis; the local endpoint builds a volume profile from History MD day archives via `TINVEST_READ_ONLY_TOKEN` and, when needed, tops up the current UTC day via `GetLastTrades` (~1h window). Chart UI sends `from`/`to` for the visible window (250 ms debounce, skip same UTC days). Sandbox token is not used for archives.

**RU.** Live probe: `pnpm --filter @moex/broker-tinvest spike` загружает repo `.env` и использует `TINVEST_SANDBOX_TOKEN` / `TINVEST_READ_ONLY_TOKEN` раздельно (значения токенов не логируются).

**EN.** Live probe: `pnpm --filter @moex/broker-tinvest spike` loads repo `.env` and uses `TINVEST_SANDBOX_TOKEN` / `TINVEST_READ_ONLY_TOKEN` separately (never logs token values).

**RU.** Последний успешный sandbox probe (2026-11-08): 562 futures, 78 indicatives, sample `GetCandles` на commodity `S2H7` вернул 3 daily bars. Production read probe пропущен, пока `TINVEST_READ_ONLY_TOKEN` пуст.

**EN.** Last successful sandbox probe (2026-11-08): 562 futures, 78 indicatives, sample `GetCandles` on commodity `S2H7` returned 3 daily bars. Production read probe skipped while `TINVEST_READ_ONLY_TOKEN` is empty.

## Sandbox Account Management (v1.2 / BL-078)

**RU.** Allowlisted host: `sandbox-invest-public-api.tbank.ru` (`createSandboxSdk` / `assertSandboxUrl`).

**EN.** Allowlisted host: `sandbox-invest-public-api.tbank.ru` (`createSandboxSdk` / `assertSandboxUrl`).

**RU.** SDK-команды, необходимые для lifecycle (подтверждены offline в 1.61.0):

**EN.** SDK commands required for lifecycle (verified offline in 1.61.0):

- `GetSandboxAccountsCommand`, `OpenSandboxAccountCommand`, `CloseSandboxAccountCommand`
- `SandboxPayInCommand` (RUB only; max 30_000_000; no withdraw)
- `GetSandboxPortfolioCommand`, `GetSandboxPositionsCommand`
- No dedicated `GetSandboxOperations` in SDK 1.61.0 — adapter may return empty until confirmed

**RU.** Прикладной слой: `@moex/sandbox-management` (`SandboxAccountService`) — разделение enqueue vs execute; `MISSING` — локально только после reconcile.

**EN.** Application layer: `@moex/sandbox-management` (`SandboxAccountService`) — enqueue vs execute separation; `MISSING` is local-only after reconcile.

**RU.** Каркас матрицы покрытия: [`FUTURES_HISTORY_COVERAGE.md`](FUTURES_HISTORY_COVERAGE.md).

**EN.** Coverage matrix scaffold: [`FUTURES_HISTORY_COVERAGE.md`](FUTURES_HISTORY_COVERAGE.md).

## MOEX ISS / AlgoPack — BL-015 / BL-033

Base URL: `https://iss.moex.com/iss`  
Auth modes: `anonymous` (default) or `authenticated` via `MOEX_ISS_AUTH_MODE` + `MOEX_ISS_TOKEN`.

**RU.** Подтверждённые поведения клиента (unit + optional live smoke):

**EN.** Verified client behaviors (unit + optional live smoke):

- GET with timeout + abort
- Retry/backoff on `429`/`5xx` and transient network errors
- `columns` → row object mapping (column order must not be assumed)
- Pagination via `start`
- Optional Bearer auth header in authenticated mode

**RU.** Примеры anonymous endpoints в smoke:

**EN.** Example anonymous endpoints used in smoke:

- `GET /engines.json`
- `GET /engines/stock/markets/shares/boards/TQBR/securities/SBER.json`

### FORTS futures candles (AlgoPack-documented)

Path helper: `buildFortsCandlesPath({ ticker })` →

`/engines/futures/markets/forts/boards/rfud/securities/{TICKER}/candles.json`

Query params typically: `from`, `till`, `interval`, pagination `start`.

**RU.** Заметки:

**EN.** Notes:

- T-Invest `class_code` `SPBFUT` maps to ISS board `RFUD` (alias in cross-provider mapping).
- Full historical depth / delay / auth requirements are **not** assumed; verify per contract in BL-039 / BL-033.
- AlgoPack is an optional reconciliation source — not a blocker for T-Invest history ingestion.

**RU.** Доступность History `/iss/history` зависит от подписки; не предполагать полную историю по всем boards без проверки.

**EN.** History `/iss/history` availability depends on subscription; do not assume full history for all boards without checking.

**RU.** Live smoke: `pnpm --filter @moex/marketdata-moex-iss smoke` (требует `DATABASE_URL` через `.env` / env для `@moex/config`).

**EN.** Live smoke: `pnpm --filter @moex/marketdata-moex-iss smoke` (requires `DATABASE_URL` via `.env` / env for `@moex/config`).
