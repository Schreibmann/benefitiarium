# Chart futures category picker (design)

Date: 2026-11-09  
Status: approved for planning (pending user review of this file)

## Problem

The Fibonacci pivots chart page (`/charts/:ticker`) requires typing a ticker by hand. Operators need a broker-terminal-like way to pick a futures contract from category lists (commodity, index, currency, share), then load chart candles + pivots for that instrument.

## Goals

- Expose futures lists **separately by category**, matching T‑Invest / terminal groupings:
  - commodity (`commodity`)
  - index (`equity_index`)
  - currency (`currency`)
  - share / equity (`share`)
- Within each category, group by `contractFamily`.
- Per family, offer the **nearest** and **next** active series by `expirationAt` (`role: near | next`) as a foundation for a later near/far hedge strategy.
- Selecting a contract loads **on-demand** chart data (candles + Fibonacci pivots) via existing chart APIs — **no durable history import**.

## Non-goals

- Persisting candle history to Postgres / BL-031 importer / worker jobs
- Terminal-style panels with last price, turnover, or period Δ%
- Four simultaneous category panels on one screen
- Implementing near/far hedge strategy logic
- Mixing Indicatives into this futures list

## Approach

Dedicated list endpoint + chart UI selectors (category + instrument). Filtering and front/next selection run on the server so the web client stays thin and the selection rules are unit-tested.

## API

### `GET /api/v1/instruments/futures`

Query:

| Param      | Required | Values                                                 |
| ---------- | -------- | ------------------------------------------------------ |
| `category` | yes      | `commodity` \| `equity_index` \| `currency` \| `share` |

Behavior:

1. Resolve futures from the market-data provider (active contracts only).
2. Keep rows whose `underlyingAssetType` equals `category` (reuse `mapTinvestUnderlyingAssetType` / instrument specs).
3. Group by `contractFamily` (existing `deriveContractFamily`).
4. Sort each family by `expirationAt` ascending; take up to **two** contracts → `near`, then `next`.
5. Families with missing `contractFamily` or missing `expirationAt` are **skipped** in MVP.
6. A family with only one qualifying contract returns a single item with `role: "near"`.
7. Empty result after filtering → `200` with `families: []` (not 404).
8. Unknown / missing `category` → `400`.

Response shape:

```json
{
  "category": "commodity",
  "families": [
    {
      "family": "NG",
      "underlyingAssetName": "Natural gas",
      "contracts": [
        {
          "role": "near",
          "ticker": "NG-11.26",
          "instrumentUid": "uuid",
          "name": "…",
          "expirationAt": "2026-11-01T00:00:00.000Z",
          "classCode": "SPBFUT",
          "isActive": true
        },
        {
          "role": "next",
          "ticker": "NG-12.26",
          "instrumentUid": "uuid",
          "name": "…",
          "expirationAt": "2026-12-01T00:00:00.000Z",
          "classCode": "SPBFUT",
          "isActive": true
        }
      ]
    }
  ]
}
```

### Data access notes

- Prefer a single in-request pass over futures + specs (avoid chatty N+1 to the broker). Fixture provider must support the same path for tests/dev without a token.
- Partial spec failures for individual UIDs: skip that contract, continue; log a warning.
- No Redis/cache in MVP. Optional short in-memory TTL can follow later.
- Chart load after selection reuses existing:
  - `GET /api/v1/instruments/by-ticker/:ticker`
  - `GET /api/v1/instruments/:uid/candles`
  - `GET /api/v1/instruments/:uid/indicators/fibonacci-pivots`

## UI (`PriceChartApp`)

Controls in the chart header (alongside timeframe):

1. **Category** `<select>` — four labels (Товарные / Индексные / Валютные / На акции) mapped to API categories. Default: `commodity`.
2. **Instrument** `<select>` with `<optgroup>` per `family`; options labeled like `NG-11.26 · near` / `NG-12.26 · next`.
3. Changing category fetches the list for that category; prefer keeping the current ticker if it exists in the new list, otherwise select first family's `near`.
4. Changing instrument updates the path to `/charts/:ticker` and runs the existing refresh (candles + pivots).
5. Keep the free-text ticker input as fallback / deep-link support. When Load succeeds and the ticker appears in the current list, sync the instrument `<select>` to that contract.

States: list loading, empty families, list error — short message; do not crash the chart canvas.

No four-panel terminal layout and no market stats columns in this MVP.

## Pure logic

Extract `selectFrontNextByFamily(contracts)` (name flexible) used by the route:

- Input: active futures in one category with `family`, `expirationAt`, identity fields.
- Output: families with 1–2 role-tagged contracts.
- Deterministic sort by `expirationAt`; tie-break by ticker ascending for stability.

## Tests

- Unit: three+ series in a family → near/next; one series → near only; sort order; skip missing expiry/family.
- API: each category filters correctly; invalid category → 400; empty → `families: []`.
- Web: category change loads list; instrument change triggers Load with the chosen ticker (client test or lightweight component test consistent with existing chart tests).

## Future hooks (not in this change)

- Near/far hedge strategy UI/runtime consuming `role: near | next`.
- Durable history import triggered from the same picker.
- Prices / turnover / Δ% overlays like the broker terminal.

## Acceptance

- Operator can switch category, see family-grouped near/next contracts, pick one, and see candles + Fibonacci pivots for that ticker without typing the ticker (typing still works).
- Lists are category-separated and do not mix Indicatives or inactive contracts.
- No Postgres candle import is required for the feature to work.
