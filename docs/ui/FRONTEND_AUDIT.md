# Frontend audit (UI-001) / Аудит frontend (UI-001)

**RU.** **Дата:** 2026-11-10  
**EN.** **Date:** 2026-11-10

**RU.** **Ветка:** `cursor/ui-001-frontend-audit`  
**EN.** **Branch:** `cursor/ui-001-frontend-audit`

**RU.** **Source of truth для UI/UX:** [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md)  
**EN.** **UI/UX source of truth:** [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md)

---

## Stack / Стек

| Area / Область  | Current / Сейчас                                              | Decision / Решение                                                                                                                                                  |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App package     | `apps/web` (`@moex/web`)                                      | Keep / Оставить                                                                                                                                                     |
| Bundler         | Vite 7                                                        | Keep / Оставить                                                                                                                                                     |
| UI framework    | React 19                                                      | Keep / Оставить                                                                                                                                                     |
| Router          | Manual `window.location.pathname` checks in `App.tsx`         | Keep until shell needs multi-route layout; no new router library / Пока оставить; без новой router-библиотеки                                                       |
| State           | Local React state; session token store for Admin              | Prefer local state / small modules; do not add a global state library for tokens/shell / Локальный state; без новой state-библиотеки для tokens/shell               |
| Charts          | Not on `main` yet (lives on realtime branch)                  | Reuse TanStack Charts when chart route merges; do not add a second chart lib / Когда chart попадёт в `main` — TanStack Charts; вторую chart-библиотеку не добавлять |
| CSS             | Plain CSS per feature (`sandbox-admin.css`); no design tokens | Introduce shared tokens (UI-002); no CSS-in-JS / CSS Modules framework / Общие tokens (UI-002); без CSS-in-JS                                                       |
| UI kit          | None                                                          | Build shared primitives in `apps/web/src/shared/ui` (UI-004); do not add Material/Chakra/etc. / Примитивы в `shared/ui` (UI-004); сторонний UI kit не подключать    |
| Tests           | Vitest unit + Playwright e2e (Admin)                          | Keep / Оставить                                                                                                                                                     |
| Package manager | pnpm workspace + turbo                                        | Keep / Оставить                                                                                                                                                     |

**RU.** Дублирующая UI-библиотека не нужна: текущий стек достаточен для design tokens, App Shell и Landing/Dashboard.  
**EN.** No duplicate UI library is required: the current stack is enough for design tokens, App Shell, and Landing/Dashboard.

---

## Routing map (main) / Карта маршрутов (main)

| Path                        | Surface / Экран  | Notes / Примечания                                                                                             |
| --------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                         | Placeholder home | Will become Landing (UI-005) / Станет Landing (UI-005)                                                         |
| `/admin/sandbox` (+ nested) | Sandbox Admin UI | Feature-local CSS; keep behind ADMIN token / Feature-CSS; только с ADMIN token                                 |
| `/charts/:ticker`           | Not on `main`    | Present on realtime branch; later Instrument page (UI-008) / Есть на realtime-ветке; позже Instrument (UI-008) |

**RU.** Auth для пользовательского dashboard пока отсутствует; Sandbox Admin использует отдельный server-side ADMIN token.  
**EN.** End-user dashboard auth is not present yet; Sandbox Admin uses a separate server-side ADMIN token.

---

## Conventions to preserve / Сохраняемые соглашения

**RU.**

1. Browser talks only to app backend (`/api`, `/ws` via Vite proxy) — never to T-Invest directly.
2. No optimistic success for broker write commands (Admin UI pattern).
3. No fake market quotes, portfolio values, or signal counts — Empty States instead.
4. TypeScript without `any` and without type assertions (project agent rules).
5. Biome lint + `pnpm typecheck` before commit.

**EN.**

1. Browser talks only to app backend (`/api`, `/ws` via Vite proxy) — never to T-Invest directly.
2. No optimistic success for broker write commands (Admin UI pattern).
3. No fake market quotes, portfolio values, or signal counts — Empty States instead.
4. TypeScript without `any` and without type assertions (project agent rules).
5. Biome lint + `pnpm typecheck` before commit.

---

## Target folder shape (incremental) / Целевая структура (поэтапно)

**RU.** Визуальная концепция предлагает Feature-Sliced layout. На `main` пока только `features/admin/sandbox`. Новые UI-слои добавлять постепенно, не переписывая Admin заново.  
**EN.** The visual concept proposes a Feature-Sliced layout. On `main` only `features/admin/sandbox` exists. Add new UI layers incrementally; do not rewrite Admin from scratch.

```text
apps/web/src/
  app/            # providers, layouts (UI-002+)
  pages/          # landing, dashboard, … (UI-005+)
  widgets/        # sidebar, topbar, overview cards (UI-003+)
  features/       # theme-switch, admin/sandbox, … (existing + new)
  shared/         # ui primitives, styles/tokens, lib (UI-002 / UI-004)
```

---

## Gaps vs visual concept / Разрывы относительно визуальной концепции

| Gap / Разрыв                         | Tracked as / Задача                                   |
| ------------------------------------ | ----------------------------------------------------- |
| No design tokens / Dark·Light theme  | UI-002                                                |
| No App Shell (sidebar/topbar)        | UI-003                                                |
| No shared UI primitives              | UI-004                                                |
| No Landing Page                      | UI-005                                                |
| No Dashboard overview + empty states | UI-006 / UI-007                                       |
| Chart/instrument not on `main`       | UI-008 / UI-009 (after merge or re-port)              |
| Visual concept body mostly RU-only   | Follow-up bilingual pass / Последующий bilingual pass |

---

## Acceptance (UI-001) / Критерии приёмки (UI-001)

**RU.**

- [x] Зафиксированы стек, routing, CSS approach, testing.
- [x] Решение: не добавлять сторонний UI kit / вторую chart-библиотеку.
- [x] Спецификация UI приложена в `docs/benefitiarium_visual_concept.md`.
- [x] Следующий этап — UI-002 Design tokens.

**EN.**

- [x] Stack, routing, CSS approach, and testing are recorded.
- [x] Decision: do not add a third-party UI kit or a second chart library.
- [x] UI specification is in `docs/benefitiarium_visual_concept.md`.
- [x] Next stage — UI-002 Design tokens.
