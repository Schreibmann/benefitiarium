# Futures catalog fast path + client persistent store (design) / Быстрый каталог фьючерсов и client persistent store (дизайн)

**RU.** Дата: 2026-11-09  
**EN.** Date: 2026-11-09

**RU.** Статус: approved  
**EN.** Status: approved

## Problem / Проблема

**RU.** `GET /api/v1/instruments/futures?category=…` занимает ~7 s, потому что каждый запрос:

1. Бьёт в live catalog T-Invest (shares + futures + indicatives).
2. Ждёт полный Postgres upsert `futures_catalog_cache` перед ответом.
3. Повторяется при смене категории в chart UI.

Цель: warm-ответы ≈ **200 ms**. Список меняется редко.

**EN.** `GET /api/v1/instruments/futures?category=…` takes ~7s because every request:

1. Hits live T-Invest catalog (shares + futures + indicatives).
2. Awaits a full Postgres `futures_catalog_cache` upsert before responding.
3. Is repeated when the chart UI changes category.

Target: warm responses ≈ **200ms**. The list changes infrequently.

## Goals / Цели

**RU.**

- Один API-ответ с **полным** активным каталогом фьючерсов (все четыре категории), отсортированным по категории.
- Сервер **cache-first**: сразу отдавать снимок Postgres; refresh брокер → DB **в фоне**.
- Chart client держит каталог в **nanostores** с **persistent** storage; при открытии экрана — из store и refresh в фоне.
- Смена category/instrument — **только локально** (без сетевого list call).

**EN.**

- One API response with the **full** active futures catalog (all four categories), sorted by category.
- Server **cache-first**: serve Postgres snapshot immediately when present; refresh broker → DB in the **background**.
- Chart client keeps the catalog in **nanostores** with **persistent** storage; on screen open, render from store and refresh in the background.
- Changing category / instrument filter is **local only** (no list network call).

## Non-goals / Вне scope

**RU.**

- Менять candle/pivot load paths.
- Redis или общий multi-instance cache.
- Убирать правила near/next family selection.
- Ставить пакеты кроме `nanostores`, `@nanostores/react`, `@nanostores/persistent` (явное одноразовое исключение из обычного no-install).

**EN.**

- Changing candle/pivot load paths.
- Redis or shared multi-instance cache layer.
- Removing near/next family selection rules.
- Installing packages other than `nanostores`, `@nanostores/react`, `@nanostores/persistent` (explicit one-time exception to the usual no-install rule).

## Approach / Подход

**RU.** Cache-first full catalog API + nanostores persistent client store.

**EN.** Cache-first full catalog API + nanostores persistent client store.

## API

### `GET /api/v1/instruments/futures`

**RU.** Query params: нет. Неизвестные query keys игнорируются.

**EN.** Query params: none. Unknown query keys are ignored.

**RU.** **Breaking для chart client в том же change:** убрать обязательный `?category=` и response на одну категорию. Мигрировать API + web tests на полный payload. Без dual response modes.

**EN.** **Breaking for the chart client in the same change:** drop required `?category=` and the single-category response shape. Migrate API + web tests to the full payload. No dual response modes.

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

**RU.** Порядок категорий фиксирован: `commodity`, `equity_index`, `currency`, `share`. Внутри категории — families по существующим правилам `selectFrontNextByFamily`.

**EN.** Category order is fixed: `commodity`, `equity_index`, `currency`, `share`.  
Within each category, families use existing `selectFrontNextByFamily` rules.

### Server behavior / Поведение сервера

**RU.**

1. **Fast path:** если в `futuresCatalogCache` есть active rows для `t-invest`, собрать полный ответ из DB и вернуть сразу (`syncedAt` = max/`synced_at` из rows или timestamp последнего replace).
2. **Background refresh:** после (или без await) fast response — **singleflight** job: live catalog → map snapshot rows → `replaceAll` → in-process память последнего success. Параллельные list requests делят один in-flight refresh.
3. **Cold path:** пустой cache / недоступна DB — один await live build, persist если можно, затем ответ. Может оставаться multi-second; только first-hit.
4. **Не** блокировать warm path на `replaceAll`.
5. Ошибки live: при наличии DB snapshot — отдавать его; ошибки refresh только в логах (HTTP 200 со stale snapshot). Нет snapshot и live failed → существующее 429/400 для RESOURCE_EXHAUSTED / прочих ошибок.

**EN.**

1. **Fast path:** if `futuresCatalogCache` has any active rows for `t-invest`, build the full response from DB and return immediately (`syncedAt` = max/`synced_at` from rows, or last replace timestamp).
2. **Background refresh:** after (or without awaiting) the fast response, kick a **singleflight** job: live catalog → map snapshot rows → `replaceAll` → in-process memory of last success. Concurrent list requests share one in-flight refresh.
3. **Cold path:** if cache is empty / DB unavailable, await live build once, persist if possible, then return. This path may remain multi-second; document as first-hit only.
4. Do **not** block the warm path on `replaceAll`.
5. Live failures: if DB snapshot exists, keep serving it; surface refresh errors only via logs (HTTP still 200 with stale snapshot). If no snapshot and live fails → existing 429/400 behavior for RESOURCE_EXHAUSTED / other errors.

### Live build notes / Заметки live build

**RU.** Переиспользовать catalog provider cache (уже TTL + singleflight). Предпочитать итерацию futures specs из cached catalog map вместо лишних remote calls. Snapshot по-прежнему включает inactive rows для полноты каталога; в response families — только active + near/next.

**EN.** Reuse catalog provider cache (already TTL + singleflight). Prefer iterating futures specs from the cached catalog map rather than redundant remote calls. Snapshot still includes inactive rows for catalog completeness (same as today); response families stay active + near/next only.

## Client / Клиент

### Dependencies (`apps/web`)

- `nanostores`
- `@nanostores/react`
- `@nanostores/persistent`

### Store

Persistent atom (e.g. `futuresCatalogStore`) holding:

| Field        | RU / EN meaning                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `syncedAt`   | ISO последнего успешного API payload (или `null`) / ISO from last successful API payload (or `null`) |
| `categories` | полный массив `categories` (или пустой) / full `categories` array (or empty)                         |
| `status`     | `idle` \| `loading` \| `refreshing` \| `error`                                                       |
| `error`      | текст последней ошибки refresh или `null` / last refresh error message or `null`                     |

**RU.** Persistence key: например `moex:futures-catalog:v1` через `@nanostores/persistent` (JSON encode/decode).

**EN.** Persistence key: e.g. `moex:futures-catalog:v1` via `@nanostores/persistent` (JSON encode/decode).

### Chart UI flow (`PriceChartApp`)

**RU.**

1. On mount / open: читать store. Если `categories` не пуст → показать селекторы сразу (`status` может стать `refreshing`).
2. Всегда фоновый `GET /api/v1/instruments/futures`; при success писать store; при failure — прежние данные + `error` (блокировать UI только если store пуст).
3. Category `<select>` фильтрует `categories` локально — **без fetch**.
4. Instrument `<select>` из families выбранной категории; смена instrument — candles/pivots как сейчас.
5. При смене category сохранять текущий ticker, если он есть в новом slice; иначе first family `near`.

**EN.**

1. On mount / screen open: read store. If `categories` non-empty → show selectors immediately (`status` may become `refreshing`).
2. Always trigger background `GET /api/v1/instruments/futures`; on success write store; on failure keep previous data and set `error` (only block UI if store empty).
3. Category `<select>` filters `categories` locally — **no fetch**.
4. Instrument `<select>` options from the selected category’s families; changing instrument still loads candles/pivots as today.
5. Prefer keeping current ticker when switching category if it exists in the new slice; else first family’s `near`.

### API client

**RU.** Заменить `listFuturesByCategory(category)` на `listFuturesCatalog()` с полным payload; обновить parsers/tests.

**EN.** Replace `listFuturesByCategory(category)` with `listFuturesCatalog()` returning the full payload. Update parsers/tests accordingly.

## Testing / Тестирование

**RU.**

- Unit: full response из cache rows; порядок категорий; пустой cache → cold path.
- Unit/integration: warm path не ждёт завершения refresh (mock refresh latch / spy).
- API route: `GET /futures` — все четыре category slots; RESOURCE_EXHAUSTED и пустой cache → 429; с cache → 200 stale.
- Web: parser полного payload; store persistence round-trip (memory/localStorage mock); смена category без fetch.

**EN.**

- Unit: build full response from cache rows; category order; empty cache → cold path invoked.
- Unit/integration: warm path does not await refresh completion (mock refresh latch / spy).
- API route: `GET /futures` returns all four category slots; RESOURCE_EXHAUSTED with empty cache → 429; with cache → 200 stale.
- Web: parser for full payload; store persistence round-trip (memory/localStorage mock); category change does not call fetch.

## Migration / Миграция

**RU.** Обновить допущение chart futures design («fetch per category») — этот spec заменяет то client-поведение. Существующие memory/Postgres cache repositories остаются; добавить `listActive` для полного snapshot (уже есть).

**EN.** Update prior chart futures design assumption (“fetch per category”) — this spec supersedes that client behavior. Existing memory/Postgres cache repositories stay; add `listActive` usage for the full snapshot (already present).

## Out of scope follow-ups / Отложенные follow-up

**RU.**

- Admin кнопка «force refresh».
- ETag / `If-None-Match` для conditional HTTP 304.
- Worker-scheduled catalog refresh независимо от HTTP traffic.

**EN.**

- Admin “force refresh” button.
- ETag / `If-None-Match` for conditional HTTP 304.
- Worker-scheduled catalog refresh independent of HTTP traffic.
