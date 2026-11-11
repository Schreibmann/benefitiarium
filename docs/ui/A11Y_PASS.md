# Accessibility pass (UI-016) / A11y-проход (UI-016)

**RU.** **Дата:** 2026-11-11  
**EN.** **Date:** 2026-11-11

**RU.** **Ветка:** `cursor/ui-016-a11y-pass`  
**EN.** **Branch:** `cursor/ui-016-a11y-pass`

**RU.** Source of truth: [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md) §12.6.  
**EN.** Source of truth: [`docs/benefitiarium_visual_concept.md`](../benefitiarium_visual_concept.md) §12.6.

## Checklist / Чеклист

| Criterion / Критерий      | Status | Notes / Примечания                                                                 |
| ------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Keyboard navigation       | DONE   | Skip links; Esc closes drawers/menus; Signals tabs ArrowLeft/Right                 |
| Visible focus             | DONE   | Global `:focus-visible` via tokens `--focus`; mouse focus not forced               |
| Icon-only aria-labels     | DONE   | Menu, collapse, theme switch, notifications, landing menu                          |
| Contrast / not color-only | DONE   | Modes/status use text labels + badges (SANDBOX/PAPER/LIVE, BUY/SELL)               |
| `prefers-reduced-motion`  | DONE   | Base, shell drawer, landing header, skip-link, spinners                            |
| Tables captions           | DONE   | `Table` supports visually-hidden caption (no dense data tables on these pages yet) |
| LIVE confirm readable     | DONE   | ConfirmDialog alertdialog + mobile full-width actions (UI-015)                     |
| Drawer a11y               | DONE   | `inert` when closed on ≤1279; `aria-expanded` / `aria-controls` on menu            |

## Surfaces / Поверхности

**RU.**

- [x] Landing — SkipLink → `#landing-main`; Esc закрывает mobile nav; `aria-controls`.
- [x] App shell — SkipLink → `#app-main`; Esc/toggle drawer; sidebar `inert` в drawer-режиме.
- [x] Signals — tablist/tab/tabpanel + roving tabindex + стрелки.
- [x] Trading LIVE — ConfirmDialog (Esc, focus на Cancel).

**EN.**

- [x] Landing — SkipLink → `#landing-main`; Esc closes mobile nav; `aria-controls`.
- [x] App shell — SkipLink → `#app-main`; Esc/toggle drawer; sidebar `inert` in drawer mode.
- [x] Signals — tablist/tab/tabpanel + roving tabindex + arrows.
- [x] Trading LIVE — ConfirmDialog (Esc, focus on Cancel).

## Out of scope / Вне скоупа

**RU.** Полный axe/CI gate; UI-017 screenshot regression; instrument chart a11y (UI-008).  
**EN.** Full axe/CI gate; UI-017 screenshot regression; instrument chart a11y (UI-008).
