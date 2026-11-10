# Project Status / Статус проекта

**RU.** **Обновлено:** 2026-11-10  
**EN.** **Updated:** 2026-11-10

**RU.** **Версия backlog:** TECHNICAL_BACKLOG **v1.2**  
**EN.** **Backlog version:** TECHNICAL_BACKLOG **v1.2**

**RU.** **Текущий milestone:** M6 — Manual Sandbox (E7A DONE на main) · UI foundation (visual concept)  
**EN.** **Current milestone:** M6 — Manual Sandbox (E7A DONE on main) · UI foundation (visual concept)

**RU.** **Активная задача:** `cursor/ui-002-design-tokens` — DONE (этот коммит)  
**EN.** **Active task:** `cursor/ui-002-design-tokens` — DONE (this commit)

**RU.** **Следующая задача:** UI-003 App Shell (`cursor/ui-003-app-shell`)  
**EN.** **Next task:** UI-003 App Shell (`cursor/ui-003-app-shell`)

**RU.** Статусы живут здесь. Не считайте сообщения агента в чате источником истины без CI/верификации.  
**EN.** Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone / Вехи

| Milestone            | Status / Статус | Notes / Примечания                        |
| -------------------- | --------------- | ----------------------------------------- |
| M0 — Foundation      | DONE            | EPIC E0 verified locally                  |
| M1 — Providers       | IN_PROGRESS     | E1 nearly complete; BL-017 done           |
| M2 — Historical Data | TODO            | needs BL-039 live matrix + BL-031         |
| M3 — Realtime        | TODO on main    | Work continues on realtime feature branch |
| M4 — Signals         | TODO            | —                                         |
| M5 — Backtesting     | TODO            | —                                         |
| M6 — Manual Sandbox  | DONE (E7A)      | BL-078…089 on main                        |
| M7 — Paper           | TODO            | —                                         |
| M8 — Guarded Live    | TODO            | —                                         |
| UI foundation        | IN_PROGRESS     | UI-001/002 done; next App Shell (UI-003)  |

## EPIC E7A (v1.2) / EPIC E7A (v1.2)

| ID     | Status / Статус | Notes / Примечания                                                  |
| ------ | --------------- | ------------------------------------------------------------------- |
| BL-078 | DONE            | Durable command request bodies                                      |
| BL-079 | DONE            | Discovery sync + ACCOUNT_STATUS_ALL                                 |
| BL-087 | DONE            | Safe fund/close                                                     |
| BL-088 | DONE            | Admin API + Postgres durable stores (auto/memory fallback)          |
| BL-089 | DONE            | Admin UI + Playwright e2e (auth gate, create queued, no optimistic) |

## UI design backlog / UI design backlog

**RU.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md)  
**EN.** Spec: [`docs/benefitiarium_visual_concept.md`](benefitiarium_visual_concept.md) · Audit: [`docs/ui/FRONTEND_AUDIT.md`](ui/FRONTEND_AUDIT.md)

| ID     | Status / Статус | Notes / Примечания                      |
| ------ | --------------- | --------------------------------------- |
| UI-001 | DONE            | Frontend audit; no duplicate UI kit     |
| UI-002 | DONE            | Tokens + ThemeProvider + FOUC bootstrap |
| UI-003 | TODO            | App shell (sidebar/topbar)              |
| UI-004 | TODO            | Shared UI primitives                    |
| UI-005 | TODO            | Landing Page                            |
| UI-006 | TODO            | Dashboard Overview                      |
| UI-007 | TODO            | Empty/onboarding Dashboard              |

## Notes / Заметки

**RU.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`

**EN.**

- E2E: `pnpm --filter @moex/web test:e2e` (CI installs Chromium)
- Admin stores: `SANDBOX_ADMIN_STORE=auto|memory|postgres`
- Quality: Biome + `pnpm precommit`

## Next / Дальше

**RU.**

1. UI-003 — App Shell (sidebar / topbar / responsive)
2. UI-004 — shared primitives
3. UI-005 / UI-006 — Landing + Dashboard empty states

**EN.**

1. UI-003 — App Shell (sidebar / topbar / responsive)
2. UI-004 — shared primitives
3. UI-005 / UI-006 — Landing + Dashboard empty states
