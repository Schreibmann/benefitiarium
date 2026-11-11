# Shared UI primitives (UI-004) / Общие UI-примитивы (UI-004)

**RU.** **Дата:** 2026-11-11  
**EN.** **Date:** 2026-11-11

**RU.** **Ветка:** `cursor/ui-004-shared-primitives`  
**EN.** **Branch:** `cursor/ui-004-shared-primitives`

**RU.** Примитивы живут в `apps/web/src/shared/ui` и используют только design tokens (`html[data-theme]`).  
**EN.** Primitives live in `apps/web/src/shared/ui` and use design tokens only (`html[data-theme]`).

## Components / Компоненты

| Component                                      | Purpose / Назначение                                        |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `Button`                                       | Primary / secondary / ghost / danger; button or `href` link |
| `Badge` / `DemoDataBadge`                      | Status chips; explicit DEMO DATA marker                     |
| `Card` / `CardHeader` / `CardBody`             | Surface panels                                              |
| `EmptyState`                                   | Title + reason + primary CTA                                |
| `ErrorState`                                   | Alert + optional retry action                               |
| `LoadingState` / `LoadingSkeleton` / `Spinner` | Loading feedback; respects reduced motion                   |
| `Input` / `FormField`                          | Labeled controls with hint/error                            |
| `ConfirmDialog`                                | Accessible alertdialog (Esc, focus)                         |
| `Table` / `NumericCell`                        | Semantic table + mono numeric cells                         |
| `MarketStatusBadge`                            | REALTIME / DELAYED / STALE / OFFLINE / CONNECTING           |

## Rules / Правила

**RU.**

1. Не хардкодить цвета вне tokens.
2. DEMO DATA только через `DemoDataBadge`, не смешивать с live данными.
3. Empty/Error/Loading должны быть визуально различимы.
4. Без стороннего UI kit.

**EN.**

1. Do not hardcode colors outside tokens.
2. DEMO DATA only via `DemoDataBadge`; never mix with live data.
3. Empty/Error/Loading must be visually distinct.
4. No third-party UI kit.

## Acceptance / Критерии

**RU.**

- [x] Buttons, inputs, cards, badges, table, dialog, empty/loading/error.
- [x] Home + Dashboard overview переведены на примитивы.
- [x] Unit tests for market status helpers.
- [x] Lint + typecheck pass.

**EN.**

- [x] Buttons, inputs, cards, badges, table, dialog, empty/loading/error.
- [x] Home + Dashboard overview use the primitives.
- [x] Unit tests for market status helpers.
- [x] Lint + typecheck pass.
