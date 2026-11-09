# Futures catalog fast path + client persistent store (design)

Date: 2026-11-09  
Status: approved

## Problem

`GET /api/v1/instruments/futures?category=…` takes ~7s because every request:

1. Hits live T-Invest catalog (shares + futures + indicatives).
2. Awaits a full Postgres `futures_catalog_cache` upsert before responding.
3. Is repeated when the chart UI changes category.

Target: warm responses ≈ **200ms**. The list changes infrequently.

## Goals

- One API response with the **full** active futures catalog (all four categories), sorted by category.
- Server **cache-first**: serve Postgres snapshot immediately when present; refresh broker → DB in the **background**.
- Chart client keeps the catalog in **nanostores** with **persistent** storage; on screen open, render from store and refresh in the background.
- Changing category / instrument filter is **local only** (no list network call).

## Non-goals

- Changing candle/pivot load paths.
- Redis or shared multi-instance cache layer.
- Removing near/next family selection rules.
- Installing packages other than `nanostores`, `@nanostores/react`, `@nanostores/persistent` (explicit one-time exception to the usual no-install rule).

## Approach

**Cache-first full catalog API + nanostores persistent client store.**

## API

### `GET /api/v1/instruments/futures`

Query params: none. Unknown query keys are ignored.

**Breaking for the chart client in the same change:** drop required `?category=` and the single-category response shape. Migrate API + web tests to the full payload. No dual response modes.

Response:

```json
{
  "syncedAt": "2026-11-09T20:00:00.000Z",
  "categories": [
    {
      "category": "commodity",
      "families": [ /* FuturesFamilyDto[] — near/next as today */ ]
    },
    {
      "category": "equity_index",
      "families": []
    },
    {
      "category": "currency",
      "families": []
    },
    {
      "category": "share",
      "families": []
    }
  ]
}
```

Category order is fixed: `commodity`, `equity_index`, `currency`, `share`.  
Within each category, families use existing `selectFrontNextByFamily` rules.

### Server behavior

1. **Fast path:** if `futuresCatalogCache` has any active rows for `t-invest`, build the full response from DB and return immediately (`syncedAt` = max/`synced_at` from rows, or last replace timestamp).
2. **Background refresh:** after (or without awaiting) the fast response, kick a **singleflight** job: live catalog → map snapshot rows → `replaceAll` → in-process memory of last success. Concurrent list requests share one in-flight refresh.
3. **Cold path:** if cache is empty / DB unavailable, await live build once, persist if possible, then return. This path may remain multi-second; document as first-hit only.
4. Do **not** block the warm path on `replaceAll`.
5. Live failures: if DB snapshot exists, keep serving it; surface refresh errors only via logs (HTTP still 200 with stale snapshot). If no snapshot and live fails → existing 429/400 behavior for RESOURCE_EXHAUSTED / other errors.

### Live build notes

Reuse catalog provider cache (already TTL + singleflight). Prefer iterating futures specs from the cached catalog map rather than redundant remote calls. Snapshot still includes inactive rows for catalog completeness (same as today); response families stay active + near/next only.

## Client

### Dependencies (`apps/web`)

- `nanostores`
- `@nanostores/react`
- `@nanostores/persistent`

### Store

Persistent atom (e.g. `futuresCatalogStore`) holding:

| Field        | Meaning                                          |
| ------------ | ------------------------------------------------ |
| `syncedAt`   | ISO from last successful API payload (or `null`) |
| `categories` | full `categories` array (or empty)               |
| `status`     | `idle` \| `loading` \| `refreshing` \| `error`   |
| `error`      | last refresh error message or `null`             |

Persistence key: e.g. `moex:futures-catalog:v1` via `@nanostores/persistent` (JSON encode/decode).

### Chart UI flow (`PriceChartApp`)

1. On mount / screen open: read store. If `categories` non-empty → show selectors immediately (`status` may become `refreshing`).
2. Always trigger background `GET /api/v1/instruments/futures`; on success write store; on failure keep previous data and set `error` (only block UI if store empty).
3. Category `<select>` filters `categories` locally — **no fetch**.
4. Instrument `<select>` options from the selected category’s families; changing instrument still loads candles/pivots as today.
5. Prefer keeping current ticker when switching category if it exists in the new slice; else first family’s `near`.

### API client

Replace `listFuturesByCategory(category)` with `listFuturesCatalog()` returning the full payload. Update parsers/tests accordingly.

## Testing

- Unit: build full response from cache rows; category order; empty cache → cold path invoked.
- Unit/integration: warm path does not await refresh completion (mock refresh latch / spy).
- API route: `GET /futures` returns all four category slots; RESOURCE_EXHAUSTED with empty cache → 429; with cache → 200 stale.
- Web: parser for full payload; store persistence round-trip (memory/localStorage mock); category change does not call fetch.

## Migration

- Update prior chart futures design assumption (“fetch per category”) — this spec supersedes that client behavior.
- Existing memory/Postgres cache repositories stay; add `listActive` usage for the full snapshot (already present).

## Out of scope follow-ups

- Admin “force refresh” button.
- ETag / `If-None-Match` for conditional HTTP 304.
- Worker-scheduled catalog refresh independent of HTTP traffic.
