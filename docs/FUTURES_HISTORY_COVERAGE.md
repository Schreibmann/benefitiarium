# Futures history coverage matrix (BL-039)

**Status:** fixture scaffold + first sandbox live probe (2026-11-08)  
**Updated:** 2026-11-08  
**Backlog:** TECHNICAL_BACKLOG v1.1 / BL-039

Do not treat missing archive years as zero market volume — mark `unavailable`.

## Live sandbox probe (TINVEST_SANDBOX_TOKEN)

Sanitized notes from `pnpm --filter @moex/broker-tinvest spike` (values never logged):

| Check            | Result                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| TLS              | requires SDK `useMincifryCertificate: true`                                                       |
| Sandbox accounts | `count=0` (account id configured locally; OpenSandboxAccount may be needed)                       |
| Futures catalog  | `562` instruments                                                                                 |
| Indicatives      | `78` instruments (separate from futures)                                                          |
| Commodity sample | `S2H7` / SPBFUT / `TYPE_COMMODITY` / basicAsset «Серебро» / first_1min `2026-09-17T14:07:00.000Z` |
| Index sample     | `NDH7` / SPBFUT / `TYPE_INDEX` / first_1min `2026-09-29T06:37:00.000Z`                            |
| Currency sample  | `UMH7` / SPBFUT / `TYPE_CURRENCY`                                                                 |
| GetCandles DAY   | `S2H7` → 3 rows over last 3 days                                                                  |
| Production read  | skipped — `TINVEST_READ_ONLY_TOKEN` empty                                                         |

Asset type labels from live API use `TYPE_*` prefix; domain mapper normalizes them.

## Fixture seed set (offline)

Sanitized UIDs below are local fixtures in `@moex/broker-tinvest`, not live broker IDs.

| Ticker | Class  | Underlying type | Underlying | Expiry     | Active | Fixture UID                             | first_1min | first_1day | GetCandles 1m/5m/1h/1d | Archive years | Notes                                              |
| ------ | ------ | --------------- | ---------- | ---------- | ------ | --------------------------------------- | ---------- | ---------- | ---------------------- | ------------- | -------------------------------------------------- |
| BRH6   | SPBFUT | commodity       | Brent      | 2026-02-16 | yes    | `br-active-uid-0001-0000-000000000001`  | 2025-08-01 | 2025-08-01 | pending_live           | pending_live  | commodity sample                                   |
| GDH6   | SPBFUT | commodity       | Gold       | 2026-03-19 | yes    | `gd-active-uid-0001-0000-000000000002`  | 2025-09-01 | 2025-09-01 | pending_live           | pending_live  | commodity sample                                   |
| MXH6   | SPBFUT | equity_index    | IMOEX      | 2026-03-19 | yes    | `mx-active-uid-0001-0000-000000000003`  | 2025-09-15 | 2025-09-15 | pending_live           | pending_live  | index future; do not substitute IMOEX indicative   |
| RIH6   | SPBFUT | equity_index    | RTSI       | 2026-03-19 | yes    | `ri-active-uid-0001-0000-000000000004`  | 2025-09-15 | 2025-09-15 | pending_live           | pending_live  | index future                                       |
| CRZ5   | SPBFUT | currency        | CNY/RUB    | 2025-12-18 | no     | `cr-expired-uid-0001-0000-000000000005` | 2024-12-01 | 2024-12-01 | pending_live           | pending_live  | expired series; History MD sample id `CRZ5_SPBFUT` |
| SiH6   | SPBFUT | currency        | USD/RUB    | 2026-03-19 | yes    | `a1b2c3d4-e5f6-4789-a012-3456789abcde`  | 2025-09-01 | 2025-09-01 | pending_live           | pending_live  | extra FX future                                    |

## Indicatives (not futures)

| Ticker | Fixture UID                         | Role                                                                                 |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| IMOEX  | `imoex-indicative-uid-000000000001` | Underlying index series for MX\* contracts — candles allowed, never contract history |
| RTSI   | `rtsi-indicative-uid-000000000002`  | Underlying index series for RI\* contracts                                           |

## Reproducible live probe plan

Requires `TINVEST_READ_ONLY_TOKEN` and/or `TINVEST_SANDBOX_TOKEN` (and optionally `MOEX_ISS_TOKEN` for AlgoPack).

1. `GetFutures` / `FutureBy`-style UID lookup for one active commodity and one active index future; persist real UID, ticker/class_code, basic_asset / basic_asset_position_uid, expiry, `first_1min_candle_date`, `first_1day_candle_date`.
2. For each UID call `GetCandles` for intervals `1m`, `5m`, `1h`, `1d` over a short window inside the first-candle boundary; record row counts and gaps.
3. Probe annual ZIP archives per UID/year; missing year → `unavailable`.
4. Cross-check one contract against History MD example naming `CRZ5_SPBFUT` (expired CNY series).
5. Optional: AlgoPack FORTS path  
   `GET /iss/engines/futures/markets/forts/boards/rfud/securities/{ticker}/candles.json?from=&till=&interval=`  
   via `buildFortsCandlesPath` in `@moex/marketdata-moex-iss`.
6. Re-run: `pnpm --filter @moex/broker-tinvest spike` after setting tokens; attach sanitized samples here (no tokens, no personal accounts).

## Coverage status legend

| Value          | Meaning                                     |
| -------------- | ------------------------------------------- |
| `pending_live` | Fixture only; live API not probed           |
| `available`    | Confirmed rows / archive present            |
| `unavailable`  | Provider reports missing history/archive    |
| `gap`          | Partial coverage with detected session gaps |

## Gate for BL-031

Importer work must not start from assumed full history. Fill this matrix for ≥2 commodity + ≥2 index futures including ≥1 expired series before merging GetCandles importer.
