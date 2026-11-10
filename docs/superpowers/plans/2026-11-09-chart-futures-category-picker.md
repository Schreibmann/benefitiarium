# Chart Futures Category Picker Implementation Plan / План: выбор категории фьючерсов на графике

> **RU.** **Для agentic workers:** ОБЯЗАТЕЛЬНЫЙ SUB-SKILL: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для пошаговой реализации. Шаги используют checkbox (`- [ ]`) для трекинга.
>
> **EN.** **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**RU.** **Цель:** Списки фьючерсов с фильтром по категориям (near+next на семью) и подключение к picker на странице графика, чтобы оператор мог загружать свечи/pivots без ввода тикеров.

**EN.** **Goal:** Add category-filtered futures lists (near+next per family) and wire them into the chart page picker so operators can load candles/pivots without typing tickers.

**RU.** **Архитектура:** Чистый `selectFrontNextByFamily` + API service, объединяющий catalog/specs `MarketDataProvider`; новый `GET /api/v1/instruments/futures?category=…`; web chart client и селекты category/instrument с существующим Load flow.

**EN.** **Architecture:** Pure `selectFrontNextByFamily` + API service that joins `MarketDataProvider` catalog/specs; new `GET /api/v1/instruments/futures?category=…`; web chart client + category/instrument selects that reuse existing Load flow.

**RU.** **Стек:** TypeScript, Fastify, Vitest, React/Vite chart app, существующий `@moex/contracts` `MarketDataProvider`.

**EN.** **Tech Stack:** TypeScript, Fastify, Vitest, React/Vite chart app, existing `@moex/contracts` `MarketDataProvider`.

## Global Constraints / Глобальные ограничения

**RU.**

- Без durable candle import / workers.
- Без `any` и type assertions.
- Категории: только `commodity` | `equity_index` | `currency` | `share`.
- Только активные фьючерсы; пропуск при отсутствии `contractFamily` или `expirationAt`.
- На семью не более двух контрактов: `near`, `next` по возрастанию `expirationAt` (tie-break ticker ASC).
- Spec: `docs/superpowers/specs/2026-11-09-chart-futures-category-picker-design.md`.
- Не коммитить без запроса пользователя (user rule перекрывает частые commit-шаги ниже).

**EN.**

- No durable candle import / workers.
- No `any` / type assertions.
- Categories: `commodity` | `equity_index` | `currency` | `share` only.
- Active futures only; skip missing `contractFamily` or `expirationAt`.
- Per family at most two contracts: `near`, `next` by ascending `expirationAt` (tie-break ticker ASC).
- Spec: `docs/superpowers/specs/2026-11-09-chart-futures-category-picker-design.md`.
- Do not commit unless the user asks (user rule overrides frequent-commit steps below).

---

### Task 1: Pure front/next selector / Задача 1: Чистый селектор front/next

**Files:**

- Create: `apps/api/src/market/select-front-next-by-family.ts`
- Test: `apps/api/src/market/select-front-next-by-family.test.ts`

**Interfaces:**

- Produces:
  - `FuturesContractCandidate` `{ ticker, instrumentUid, name, classCode, isActive, family, underlyingAssetName, expirationAt: string }`
  - `FuturesFamilyDto` `{ family, underlyingAssetName, contracts: Array<{ role: 'near'|'next', ticker, instrumentUid, name, expirationAt, classCode, isActive }> }`
  - `selectFrontNextByFamily(candidates: FuturesContractCandidate[]): FuturesFamilyDto[]`

**RU.**

- [ ] **Шаг 1:** Падающие unit tests — 3+ серии → near/next; 1 серия → только near; сортировка + ticker tie-break; пустую family обрабатывает caller.

- [ ] **Шаг 2:** Реализовать selector — group by family, sort by `expirationAt` then `ticker`, take 2, assign roles, sort families ASC by name.

- [ ] **Шаг 3:** Запуск `pnpm --filter @moex/api test -- select-front-next-by-family` — ожидается PASS.

**EN.**

- [ ] **Step 1: Write failing unit tests** covering 3+ series → near/next; 1 series → near only; sort + ticker tie-break; skip empty family handled by caller (candidates always have family).

- [ ] **Step 2: Implement selector** — group by family, sort by `expirationAt` then `ticker`, take 2, assign roles, sort families by family name ASC.

- [ ] **Step 3: Run** `pnpm --filter @moex/api test -- select-front-next-by-family` — expect PASS.

---

### Task 2: List futures by category service + route / Задача 2: Сервис списка по категории + route

**Files:**

- Create: `apps/api/src/market/list-futures-by-category.ts`
- Modify: `apps/api/src/market/market-routes.ts`
- Modify: `apps/api/src/market/market-routes.test.ts`
- Optional fixture: `packages/broker-tinvest/src/fixtures/futures.json` — add second BR (e.g. `BRJ6`) for richer live/fixture demos

**Interfaces:**

- Consumes: `ChartMarketDataDeps`, `selectFrontNextByFamily`
- Produces: `listFuturesByCategory(deps, category): Promise<{ category, families: FuturesFamilyDto[] }>`
- Route: `GET /api/v1/instruments/futures?category=`

**RU.**

- [ ] **Шаг 1:** Падающие API tests — invalid category 400; commodity возвращает BR near/next из mock specs; inactive пропускаются; пустые families `[]`.

- [ ] **Шаг 2:** Реализовать service — catalog → active futures → `getInstrumentSpec` per uid (try/catch skip) → filter `underlyingAssetType === category` и non-null family/expiry → `selectFrontNextByFamily`.

- [ ] **Шаг 3:** Зарегистрировать route; `pnpm --filter @moex/api test -- market-routes` — PASS.

**EN.**

- [ ] **Step 1: Failing API tests** — invalid category 400; commodity returns BR near/next from mock specs; inactive skipped; empty families `[]`.

- [ ] **Step 2: Implement service** — catalog → active futures → `getInstrumentSpec` per uid (try/catch skip) → filter `underlyingAssetType === category` and non-null family/expiry → `selectFrontNextByFamily`.

- [ ] **Step 3: Register route**; run `pnpm --filter @moex/api test -- market-routes` — PASS.

---

### Task 3: Web chart picker / Задача 3: Web chart picker

**Files:**

- Modify: `apps/web/src/features/chart/types.ts`
- Modify: `apps/web/src/features/chart/api-client.ts`
- Create: `apps/web/src/features/chart/api-client.futures.test.ts` (or extend existing client tests if any)
- Modify: `apps/web/src/features/chart/PriceChartApp.tsx`

**Interfaces:**

- `ChartApiClient.listFuturesByCategory(category): Promise<FuturesCategoryResponse>`
- UI: category select + instrument optgroup select; on change → URL + existing `refresh`

**RU.**

- [ ] **Шаг 1:** Types + client method + parse test

- [ ] **Шаг 2:** Подключить `PriceChartApp` — default category `commodity`; load list on mount/category change; keep ticker if present else first near; instrument change updates ticker + refresh; сохранить manual ticker input.

- [ ] **Шаг 3:** `pnpm --filter @moex/web test` и `pnpm --filter @moex/api test` — PASS. Также `pnpm typecheck` / `pnpm lint` на затронутых packages.

**EN.**

- [ ] **Step 1: Types + client method + parse test**

- [ ] **Step 2: Wire `PriceChartApp`** — default category `commodity`; load list on mount/category change; keep ticker if present else first near; instrument change updates ticker + refresh; keep manual ticker input.

- [ ] **Step 3: Run** `pnpm --filter @moex/web test` and `pnpm --filter @moex/api test` — PASS. Also `pnpm typecheck` / `pnpm lint` on touched packages.

---

## Spec coverage / Покрытие spec

| Spec item                        | Task |
| -------------------------------- | ---- |
| Category query param + 400       | 2    |
| Active + underlying filter       | 2    |
| Family near/next                 | 1–2  |
| Empty → `families: []`           | 2    |
| Chart UI selects + Load          | 3    |
| Manual ticker fallback           | 3    |
| No DB import / no terminal stats | all  |
