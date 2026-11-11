# Futures catalog fast path + chart readability / Быстрый каталог фьючерсов и читаемость графика

> **RU.** **Для agentic workers:** ОБЯЗАТЕЛЬНЫЙ SUB-SKILL: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для пошаговой реализации. Шаги используют checkbox (`- [ ]`) для трекинга.
>
> **EN.** **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**RU.** **Цель:** Прогрев списка фьючерсов ≈200 ms с полным каталогом и персистентным клиентским store; график цены читаем как в терминале биржи (ось сессии, пивоты текущего дня, корректные свечи).

**EN.** **Goal:** Warm futures list ≈200ms with full catalog + client persistent store; make the price chart readable like an exchange terminal (session axis, current-day pivots, proper candles).

**RU.** **Архитектура:** Cache-first `GET /futures` из Postgres с фоновым refresh брокера; web nanostores persistent catalog и локальный фильтр по категории. График мапит свечи на плотный session index (без гэпов выходных), продлевает pivot targets через открытый период, задаёт толщину тел свечей через `barY`.

**EN.** **Architecture:** Cache-first `GET /futures` from Postgres with background broker refresh; web nanostores persistent catalog and local category filter. Chart maps candles to a dense session index (no weekend gaps), extends pivot targets through the open period, and sizes candle bodies with `barY`.

**RU.** **Стек:** Fastify API, `@moex/persistence` futures cache, T-Invest provider TTL cache, React + TanStack Charts, `nanostores` / `@nanostores/react` / `@nanostores/persistent`.

**EN.** **Tech Stack:** Fastify API, `@moex/persistence` futures cache, T-Invest provider TTL cache, React + TanStack Charts, `nanostores` / `@nanostores/react` / `@nanostores/persistent`.

## Global Constraints / Глобальные ограничения

**RU.**

- Установка только: `nanostores`, `@nanostores/react`, `@nanostores/persistent` в `apps/web`.
- Без `any` и type assertions.
- Один логический change set на текущей ветке; коммит только по запросу пользователя (user rule), если workspace rule о завершении stage не требует иного после STATUS.

**EN.**

- Install only: `nanostores`, `@nanostores/react`, `@nanostores/persistent` in `apps/web`.
- No `any` / type assertions.
- One logical change set on current branch; commit only if user asks (repo user rule) unless stage-complete workspace rule applies after STATUS.

---

### Task 1: Current open pivot period (server) / Задача 1: Открытый пивот-период (сервер)

**Files:** `apps/api/src/market/reference-periods.ts`, tests, `fibonacci-pivot-service.ts` if wiring needed.

**RU.**

- [ ] Добавить helper: синтетическая trading target от последнего полного `end` → `requestedTo`, если интервал непустой.
- [ ] Unit tests: только завершённые дни → без изменений; `to` после last close → один доп. valid period на «сегодня».
- [ ] Убедиться, что `getFibonacciPivots` использует helper, чтобы Monday 5m candles получали уровни от Sunday/Friday source.

**EN.**

- [ ] Add helper that appends a synthetic trading target from last complete source `end` → `requestedTo` when that span is non-empty.
- [ ] Unit tests: complete days only → unchanged; with `to` after last close → one extra valid period covering “today”.
- [ ] Confirm `getFibonacciPivots` uses it so Monday 5m candles get levels from Sunday/Friday source.

### Task 2: Session axis + candle readability (web) / Задача 2: Ось сессии и читаемость свечей (web)

**Files:** `apps/web/src/features/chart/build-chart-definition.ts`, new `session-scale.ts` (+ tests), `to-pivot-segments.ts` as needed.

**RU.**

- [ ] Маппинг свечей на contiguous `index` 0..n-1; pivot `x1/x2` на first/last candle index, пересекающий каждый valid period (clamp к концу графика для open period).
- [ ] X scale linear/point по index; формат тиков из `Date` свечи.
- [ ] Y domain от high/low свечей (+ padding), не от исторических экстремумов pivot.
- [ ] Сохранить тела `barY` + тонкие цветные фитили; подстроить `maxThickness` под упаковку сессии.

**EN.**

- [ ] Map candles to contiguous `index` 0..n-1; map pivot `x1/x2` onto first/last candle index overlapping each valid period (clamp to chart end for open period).
- [ ] X scale linear/point on index; tick format from candle `Date`.
- [ ] Y domain from candle high/low (+ padding), not historical pivot extremes.
- [ ] Keep `barY` bodies + thin colored wicks; tune `maxThickness` for session packing.

### Task 3: Full catalog cache-first API / Задача 3: Полный каталог cache-first API

**Files:** `list-futures-by-category.ts` → rename/extend to full catalog, `market-routes.ts`, persistence repo, tests.

**RU.**

- [ ] `GET /api/v1/instruments/futures` возвращает `{ syncedAt, categories[4] }` (без обязательного `category`).
- [ ] Warm path: сбор из DB `listActive`, немедленный ответ; singleflight background live refresh + `replaceAll`.
- [ ] Cold path: один await live при пустом cache.
- [ ] Миграция API tests.

**EN.**

- [ ] `GET /api/v1/instruments/futures` returns `{ syncedAt, categories[4] }` (no required `category`).
- [ ] Warm path: build from DB `listActive`, return immediately; singleflight background live refresh + `replaceAll`.
- [ ] Cold path: await live once when cache empty.
- [ ] Migrate API tests.

### Task 4: Web nanostores + local category filter / Задача 4: Web nanostores и локальный фильтр категорий

**Files:** `apps/web/package.json` (install three packages), new store module, `api-client.ts`, `PriceChartApp.tsx`, tests.

**RU.**

- [ ] Persistent store для полного каталога; фоновый refresh при открытии графика.
- [ ] Смена категории — только локальный фильтр; без fetch списка.
- [ ] Parser/tests для полного payload.

**EN.**

- [ ] Persistent store for full catalog; background refresh on chart open.
- [ ] Category change filters locally; no list fetch.
- [ ] Parser/tests for full payload.

### Task 5: Verification / Задача 5: Верификация

**RU.**

- [ ] `pnpm lint` / `pnpm typecheck` / релевантные vitest suites.
- [ ] Вручную: плотные свечи, pivots поверх последней сессии; warm список фьючерсов ≪ 7s.

**EN.**

- [ ] `pnpm lint` / `pnpm typecheck` / relevant vitest suites.
- [ ] Manual: chart has dense candles, pivots over latest session; futures list warm ≪ 7s.
