# Project Status

**Updated:** 2026-11-08  
**Current milestone:** M0 — Foundation (**DONE**)  
**Active task:** none (next: BL-010)  
**Next task:** BL-010 — domain value objects (EPIC E1)

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status | Notes                    |
| -------------------- | ------ | ------------------------ |
| M0 — Foundation      | DONE   | EPIC E0 verified locally |
| M1 — Providers       | TODO   | after M0 gate            |
| M2 — Historical Data | TODO   |                          |
| M3 — Realtime        | TODO   |                          |
| M4 — Signals         | TODO   |                          |
| M5 — Backtesting     | TODO   |                          |
| M6 — Manual Sandbox  | TODO   |                          |
| M7 — Paper           | TODO   |                          |
| M8 — Guarded Live    | TODO   |                          |

## EPIC E0 task board

| ID     | Status | Notes                                                        |
| ------ | ------ | ------------------------------------------------------------ |
| BL-001 | DONE   | pnpm + Turborepo + lockfile                                  |
| BL-002 | DONE   | TS strict + ESLint + Prettier + Vitest                       |
| BL-003 | DONE   | apps/\* and packages/\* skeletons                            |
| BL-004 | DONE   | `@moex/config` Zod schema + `.env.example`                   |
| BL-005 | DONE   | `docker-compose.yml` Postgres 16 + healthcheck (files ready) |
| BL-006 | DONE   | GitHub Actions CI                                            |
| BL-007 | DONE   | ADR-001…009 + STATUS + SECURITY                              |

## Verification (M0 gate)

Locally verified:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `pnpm db:migrate` (explicit no-op stub until BL-020)

Environment note: Docker Desktop engine was not running on the implementer machine at verification time (`dockerDesktopLinuxEngine` pipe missing). Compose file and healthcheck are in repo; start Postgres with `docker compose up -d` when Docker is available.

## Next after M0

BL-010 — domain value objects (start of EPIC E1).
