# Futures catalog fast path + chart readability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warm futures list ≈200ms with full catalog + client persistent store; make the price chart readable like an exchange terminal (session axis, current-day pivots, proper candles).

**Architecture:** Cache-first `GET /futures` from Postgres with background broker refresh; web nanostores persistent catalog and local category filter. Chart maps candles to a dense session index (no weekend gaps), extends pivot targets through the open period, and sizes candle bodies with `barY`.

**Tech Stack:** Fastify API, `@moex/persistence` futures cache, T-Invest provider TTL cache, React + TanStack Charts, `nanostores` / `@nanostores/react` / `@nanostores/persistent`.

## Global Constraints

- Install only: `nanostores`, `@nanostores/react`, `@nanostores/persistent` in `apps/web`.
- No `any` / type assertions.
- One logical change set on current branch; commit only if user asks (repo user rule) unless stage-complete workspace rule applies after STATUS.

---

### Task 1: Current open pivot period (server)

**Files:** `apps/api/src/market/reference-periods.ts`, tests, `fibonacci-pivot-service.ts` if wiring needed.

- [ ] Add helper that appends a synthetic trading target from last complete source `end` → `requestedTo` when that span is non-empty.
- [ ] Unit tests: complete days only → unchanged; with `to` after last close → one extra valid period covering “today”.
- [ ] Confirm `getFibonacciPivots` uses it so Monday 5m candles get levels from Sunday/Friday source.

### Task 2: Session axis + candle readability (web)

**Files:** `apps/web/src/features/chart/build-chart-definition.ts`, new `session-scale.ts` (+ tests), `to-pivot-segments.ts` as needed.

- [ ] Map candles to contiguous `index` 0..n-1; map pivot `x1/x2` onto first/last candle index overlapping each valid period (clamp to chart end for open period).
- [ ] X scale linear/point on index; tick format from candle `Date`.
- [ ] Y domain from candle high/low (+ padding), not historical pivot extremes.
- [ ] Keep `barY` bodies + thin colored wicks; tune `maxThickness` for session packing.

### Task 3: Full catalog cache-first API

**Files:** `list-futures-by-category.ts` → rename/extend to full catalog, `market-routes.ts`, persistence repo, tests.

- [ ] `GET /api/v1/instruments/futures` returns `{ syncedAt, categories[4] }` (no required `category`).
- [ ] Warm path: build from DB `listActive`, return immediately; singleflight background live refresh + `replaceAll`.
- [ ] Cold path: await live once when cache empty.
- [ ] Migrate API tests.

### Task 4: Web nanostores + local category filter

**Files:** `apps/web/package.json` (install three packages), new store module, `api-client.ts`, `PriceChartApp.tsx`, tests.

- [ ] Persistent store for full catalog; background refresh on chart open.
- [ ] Category change filters locally; no list fetch.
- [ ] Parser/tests for full payload.

### Task 5: Verification

- [ ] `pnpm lint` / `pnpm typecheck` / relevant vitest suites.
- [ ] Manual: chart has dense candles, pivots over latest session; futures list warm ≪ 7s.
