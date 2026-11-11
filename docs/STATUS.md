# Project Status / Статус проекта

**RU.** **Обновлено:** 2026-11-11  
**EN.** **Updated:** 2026-11-11

**RU.** **Версия backlog:** TECHNICAL_BACKLOG **v1.2**  
**EN.** **Backlog version:** TECHNICAL_BACKLOG **v1.2**

**RU.** **Текущий milestone:** M6 — Manual Sandbox (E7A DONE на main) · UI foundation (visual concept)  
**EN.** **Current milestone:** M6 — Manual Sandbox (E7A DONE on main) · UI foundation (visual concept)

**RU.** **Активная задача:** `cursor/ui-015-responsive-pass` — DONE (этот коммит)  
**EN.** **Active task:** `cursor/ui-015-responsive-pass` — DONE (this commit)

**RU.** **Следующая задача:** UI-016 a11y pass (UI-008/009 — после chart на main)  
**EN.** **Next task:** UI-016 a11y pass (UI-008/009 after chart on main)

**RU.** Статусы живут здесь. Не считайте сообщения агента в чате источником истины без CI/верификации.  
**EN.** Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone / Вехи

| Milestone            | Status / Статус | Notes / Примечания                             |
| -------------------- | --------------- | ---------------------------------------------- |
| M0 — Foundation      | DONE            | EPIC E0 verified locally                       |
| M1 — Providers       | IN_PROGRESS     | E1 nearly complete; BL-017 done                |
| M2 — Historical Data | TODO            | needs BL-039 live matrix + BL-031              |
| M3 — Realtime        | TODO on main    | Work continues on realtime feature branch      |
| M4 — Signals         | TODO            | —                                              |
| M5 — Backtesting     | TODO            | —                                              |
| M6 — Manual Sandbox  | DONE (E7A)      | BL-078…089 on main                             |
| M7 — Paper           | TODO            | —                                              |
| M8 — Guarded Live    | TODO            | —                                              |
| UI foundation        | IN_PROGRESS     | UI-001…007, UI-010…013, UI-015 done; next a11y |

## EPIC E7A (v1.2) / EPIC E7A (v1.2)

| ID     | Status / Статус | Notes / Примечания                                                  |
| ------ | --------------- | ------------------------------------------------------------------- |
| BL-078 | DONE            | Durable command request bodies                                      |
| BL-079 | DONE            | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE            | Safe fund/close                                                     |
| BL-088 | DONE            | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE            | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## UI design backlog / UI design backlog

**RU.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md) · Primitives: [`docs/ui/SHARED_PRIMITIVES.md`](ui/SHARED_PRIMITIVES.md) · Responsive: [`docs/ui/RESPONSIVE_PASS.md`](ui/RESPONSIVE_PASS.md)  
**EN.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md) · Primitives: [`docs/ui/SHARED_PRIMITIVES.md`](ui/SHARED_PRIMITIVES.md) · Responsive: [`docs/ui/RESPONSIVE_PASS.md`](ui/RESPONSIVE_PASS.md)

| ID     | Status / Статус | Notes / Примечания                            |
| ------ | --------------- | --------------------------------------------- |
| UI-001 | DONE            | Frontend audit; no duplicate UI kit           |
| UI-002 | DONE            | Tokens + ThemeProvider + FOUC bootstrap       |
| UI-003 | DONE            | App shell sidebar/topbar + `/app` routes      |
| UI-004 | DONE            | Shared Button/Card/Badge/Empty/Dialog         |
| UI-005 | DONE            | Landing Page sections + risk disclaimer       |
| UI-006 | DONE            | Dashboard overview empty widgets + layout     |
| UI-007 | DONE            | Welcome + onboarding checklist (localStorage) |
| UI-010 | DONE            | Signals filters/list/detail; signal ≠ order   |
| UI-011 | DONE            | Strategies create/settings/mode/status shells |
| UI-012 | DONE            | Backtesting params/progress/metrics/compare   |
| UI-013 | DONE            | Trading+Portfolio modes; LIVE confirm; empty  |
| UI-015 | DONE            | Breakpoints 767/1279/1280; QA 375–1440        |

## Notes / Заметки

**RU.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Web: `/` Landing · `/app` overview · `/app/signals` · `/app/strategies` · `/app/backtesting` · `/app/trading` · `/app/portfolio` · `/admin/sandbox` Admin

**EN.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`
- Web: `/` Landing · `/app` overview · `/app/signals` · `/app/strategies` · `/app/backtesting` · `/app/trading` · `/app/portfolio` · `/admin/sandbox` Admin

## Next / Дальше

**RU.**

1. UI-016 — accessibility pass
2. UI-008 / UI-009 — Instrument page + realtime lease UI (нужен chart на main)
3. UI-017 visual regression (после ключевых страниц)

**EN.**

1. UI-016 — accessibility pass
2. UI-008 / UI-009 — Instrument page + realtime lease UI (needs chart on main)
3. UI-017 visual regression (after key pages)
