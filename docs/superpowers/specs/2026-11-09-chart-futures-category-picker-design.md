# Chart futures category picker (design) / Выбор фьючерсов по категории на графике (дизайн)

**RU.** Дата: 2026-11-09  
**EN.** Date: 2026-11-09

**RU.** Статус: approved for planning (ожидается review этого файла)  
**EN.** Status: approved for planning (pending user review of this file)

## Problem / Проблема

**RU.** Страница Fibonacci pivots (`/charts/:ticker`) требует ручного ввода тикера. Операторам нужен выбор контракта из списков по категориям (commodity, index, currency, share), как в терминале брокера, с загрузкой свечей + pivots для выбранного инструмента.

**EN.** The Fibonacci pivots chart page (`/charts/:ticker`) requires typing a ticker by hand. Operators need a broker-terminal-like way to pick a futures contract from category lists (commodity, index, currency, share), then load chart candles + pivots for that instrument.

## Goals / Цели

**RU.**

- Отдельные списки фьючерсов **по категориям**, как в T‑Invest / терминале:
  - commodity (`commodity`)
  - index (`equity_index`)
  - currency (`currency`)
  - share / equity (`share`)
- Внутри категории — группировка по `contractFamily`.
- На семью — **ближайший** и **следующий** active series по `expirationAt` (`role: near | next`) как основа для будущей near/far hedge.
- Выбор контракта грузит **on-demand** chart data (candles + Fibonacci pivots) через существующие chart APIs — **без durable history import**.

**EN.**

- Expose futures lists **separately by category**, matching T‑Invest / terminal groupings:
  - commodity (`commodity`)
  - index (`equity_index`)
  - currency (`currency`)
  - share / equity (`share`)
- Within each category, group by `contractFamily`.
- Per family, offer the **nearest** and **next** active series by `expirationAt` (`role: near | next`) as a foundation for a later near/far hedge strategy.
- Selecting a contract loads **on-demand** chart data (candles + Fibonacci pivots) via existing chart APIs — **no durable history import**.

## Non-goals / Вне scope

**RU.**

- Персистентный импорт свечей в Postgres / BL-031 importer / worker jobs
- Панели терминала с last price, turnover, period Δ%
- Четыре одновременные category panels на одном экране
- Логика near/far hedge strategy
- Смешивание Indicatives в этот futures list

**EN.**

- Persisting candle history to Postgres / BL-031 importer / worker jobs
- Terminal-style panels with last price, turnover, or period Δ%
- Four simultaneous category panels on one screen
- Implementing near/far hedge strategy logic
- Mixing Indicatives into this futures list

## Approach / Подход

**RU.** Отдельный list endpoint + UI-селекторы (category + instrument). Фильтрация и front/next selection на сервере — тонкий web client и unit-tested правила.

**EN.** Dedicated list endpoint + chart UI selectors (category + instrument). Filtering and front/next selection run on the server so the web client stays thin and the selection rules are unit-tested.

## API

### `GET /api/v1/instruments/futures`

Query:

| Param      | Required | Values                                                 |
| ---------- | -------- | ------------------------------------------------------ |
| `category` | yes      | `commodity` \| `equity_index` \| `currency` \| `share` |

Behavior:

**RU.**

1. Futures из market-data provider (только active).
2. Строки с `underlyingAssetType === category` (reuse `mapTinvestUnderlyingAssetType` / specs).
3. Группировка по `contractFamily` (`deriveContractFamily`).
4. В семье сортировка по `expirationAt` ASC; до **двух** контрактов → `near`, затем `next`.
5. Семьи без `contractFamily` или `expirationAt` **пропускаются** в MVP.
6. Одна qualifying серия → один item с `role: "near"`.
7. Пустой результат → `200` с `families: []` (не 404).
8. Unknown / missing `category` → `400`.

**EN.**

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

### Data access notes / Заметки по доступу к данным

**RU.**

- Один проход futures + specs в рамках запроса (избегать N+1 к брокеру). Fixture provider поддерживает тот же path для tests/dev без token.
- Частичные ошибки spec по UID: пропуск контракта, warning в лог.
- Без Redis/cache в MVP. Позже — optional in-memory TTL.
- После выбора chart load через существующие:
  - `GET /api/v1/instruments/by-ticker/:ticker`
  - `GET /api/v1/instruments/:uid/candles`
  - `GET /api/v1/instruments/:uid/indicators/fibonacci-pivots`

**EN.**

- Prefer a single in-request pass over futures + specs (avoid chatty N+1 to the broker). Fixture provider must support the same path for tests/dev without a token.
- Partial spec failures for individual UIDs: skip that contract, continue; log a warning.
- No Redis/cache in MVP. Optional short in-memory TTL can follow later.
- Chart load after selection reuses existing:
  - `GET /api/v1/instruments/by-ticker/:ticker`
  - `GET /api/v1/instruments/:uid/candles`
  - `GET /api/v1/instruments/:uid/indicators/fibonacci-pivots`

## UI (`PriceChartApp`)

**RU.** Контролы в header графика (рядом с timeframe):

1. **Category** `<select>` — четыре подписи (Товарные / Индексные / Валютные / На акции) → API categories. Default: `commodity`.
2. **Instrument** `<select>` с `<optgroup>` per `family`; подписи `NG-11.26 · near` / `NG-12.26 · next`.
3. Смена category — fetch списка; сохранить текущий ticker, если есть в новом списке, иначе first family `near`.
4. Смена instrument → `/charts/:ticker` и существующий refresh (candles + pivots).
5. Free-text ticker как fallback / deep-link. После успешного Load и наличия ticker в списке — синхронизировать instrument `<select>`.

Состояния: loading list, empty families, list error — короткое сообщение; canvas не падает.

Нет четырёх панелей терминала и колонок market stats в этом MVP.

**EN.** Controls in the chart header (alongside timeframe):

1. **Category** `<select>` — four labels (Товарные / Индексные / Валютные / На акции) mapped to API categories. Default: `commodity`.
2. **Instrument** `<select>` with `<optgroup>` per `family`; options labeled like `NG-11.26 · near` / `NG-12.26 · next`.
3. Changing category fetches the list for that category; prefer keeping the current ticker if it exists in the new list, otherwise select first family's `near`.
4. Changing instrument updates the path to `/charts/:ticker` and runs the existing refresh (candles + pivots).
5. Keep the free-text ticker input as fallback / deep-link support. When Load succeeds and the ticker appears in the current list, sync the instrument `<select>` to that contract.

States: list loading, empty families, list error — short message; do not crash the chart canvas.

No four-panel terminal layout and no market stats columns in this MVP.

## Pure logic / Чистая логика

**RU.** Выделить `selectFrontNextByFamily(contracts)` для route:

- Input: active futures одной категории с `family`, `expirationAt`, identity fields.
- Output: families с 1–2 role-tagged contracts.
- Детерминированная сортировка по `expirationAt`; tie-break ticker ASC.

**EN.** Extract `selectFrontNextByFamily(contracts)` (name flexible) used by the route:

- Input: active futures in one category with `family`, `expirationAt`, identity fields.
- Output: families with 1–2 role-tagged contracts.
- Deterministic sort by `expirationAt`; tie-break by ticker ascending for stability.

## Tests / Тесты

**RU.**

- Unit: 3+ series в family → near/next; one series → near only; порядок сортировки; skip missing expiry/family.
- API: каждая category фильтруется; invalid category → 400; empty → `families: []`.
- Web: смена category грузит list; смена instrument → Load с выбранным ticker (client или component test как у chart tests).

**EN.**

- Unit: three+ series in a family → near/next; one series → near only; sort order; skip missing expiry/family.
- API: each category filters correctly; invalid category → 400; empty → `families: []`.
- Web: category change loads list; instrument change triggers Load with the chosen ticker (client test or lightweight component test consistent with existing chart tests).

## Future hooks (not in this change) / Будущие точки расширения (не в этом change)

**RU.**

- Near/far hedge UI/runtime с `role: near | next`.
- Durable history import из того же picker.
- Overlays цен / turnover / Δ% как у брокерского терминала.

**EN.**

- Near/far hedge strategy UI/runtime consuming `role: near | next`.
- Durable history import triggered from the same picker.
- Prices / turnover / Δ% overlays like the broker terminal.

## Acceptance / Критерии приёмки

**RU.**

- Оператор меняет category, видит near/next по семьям, выбирает контракт и получает candles + Fibonacci pivots без ввода тикера (ручной ввод по-прежнему работает).
- Списки разделены по category; без Indicatives и inactive contracts.
- Postgres candle import не требуется для работы фичи.

**EN.**

- Operator can switch category, see family-grouped near/next contracts, pick one, and see candles + Fibonacci pivots for that ticker without typing the ticker (typing still works).
- Lists are category-separated and do not mix Indicatives or inactive contracts.
- No Postgres candle import is required for the feature to work.
