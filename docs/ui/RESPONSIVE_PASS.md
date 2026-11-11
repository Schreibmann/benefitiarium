# Responsive pass (UI-015) / Адаптивный проход (UI-015)

**RU.** **Дата:** 2026-11-11  
**EN.** **Date:** 2026-11-11

**RU.** **Ветка:** `cursor/ui-015-responsive-pass`  
**EN.** **Branch:** `cursor/ui-015-responsive-pass`

**RU.** Source of truth: [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md) §13.  
**EN.** Source of truth: [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md) §13.

## Breakpoints / Брейкпоинты

| Band / Диапазон | Width / Ширина | Behavior / Поведение                                              |
| --------------- | -------------- | ----------------------------------------------------------------- |
| Mobile          | ≤ 767 px       | Single column; compact topbar; drawer nav; full-width LIVE dialog |
| Tablet          | 768–1279 px    | Drawer nav; feature layouts stack; 2-up cards/filters             |
| Desktop         | ≥ 1280 px      | Persistent sidebar; 12-col dashboard; side-by-side panels         |

**RU.** Константы зафиксированы в `apps/web/src/shared/styles/breakpoints.ts` и зеркалятся в CSS `@media`.  
**EN.** Constants live in `apps/web/src/shared/styles/breakpoints.ts` and are mirrored in CSS `@media`.

## QA widths / Ширины QA (UI-015)

| Width | Band    | Landing | Shell drawer | Dashboard 12-col | Feature 1-col stack |
| ----- | ------- | ------- | ------------ | ---------------- | ------------------- |
| 375   | mobile  | yes     | yes          | no               | yes                 |
| 768   | tablet  | yes     | yes          | no               | yes                 |
| 1024  | tablet  | yes     | yes          | no               | yes                 |
| 1440  | desktop | multi   | no           | yes              | no                  |

## Surfaces checked / Проверенные поверхности

**RU.**

- [x] Landing (`/`) — hero/cards/steps в одну колонку ≤1279; compact padding.
- [x] App shell — drawer ≤1279; menu button; compact topbar ≤767; `overflow-x: clip`.
- [x] Dashboard overview — 12-col только ≥1280; snapshot 3-up на tablet, 1-col на mobile.
- [x] Signals / Strategies / Backtesting / Trading / Portfolio — list+detail stack ≤1279; filters 2-up на tablet, 1-col на mobile.
- [x] ConfirmDialog (LIVE) — bottom sheet-like на mobile, full-width actions.
- [x] Нет page-level horizontal scroll (box-sizing + overflow-x clip + minmax(0,1fr) grids).

**EN.**

- [x] Landing (`/`) — hero/cards/steps single column ≤1279; compact padding.
- [x] App shell — drawer ≤1279; menu button; compact topbar ≤767; `overflow-x: clip`.
- [x] Dashboard overview — 12-col only ≥1280; snapshot 3-up on tablet, 1-col on mobile.
- [x] Signals / Strategies / Backtesting / Trading / Portfolio — list+detail stack ≤1279; filters 2-up on tablet, 1-col on mobile.
- [x] ConfirmDialog (LIVE) — bottom sheet-like on mobile, full-width actions.
- [x] No page-level horizontal scroll (box-sizing + overflow-x clip + minmax(0,1fr) grids).

## Out of scope / Вне скоупа

**RU.** UI-008 Instrument chart layout; UI-016 a11y audit; screenshot visual regression (UI-017).  
**EN.** UI-008 Instrument chart layout; UI-016 a11y audit; screenshot visual regression (UI-017).
