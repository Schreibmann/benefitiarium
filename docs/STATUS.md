# Project Status

**Updated:** 2026-11-09  
**Backlog version:** TECHNICAL_BACKLOG **v1.2**  
**Current milestone:** M6 — Manual Sandbox (E7A)  
**Active task:** BL-089 Sandbox Admin UI (branch `cursor/bl-089-admin-ui`)  
**Next task:** Wire API composition root + Playwright E2E (when installs allowed)

Statuses live here. Do not treat agent chat messages as source of truth without CI/verification.

## Milestone

| Milestone            | Status      | Notes                             |
| -------------------- | ----------- | --------------------------------- |
| M0 — Foundation      | DONE        | EPIC E0 verified locally          |
| M1 — Providers       | IN_PROGRESS | E1 nearly complete; BL-017 done   |
| M2 — Historical Data | TODO        | needs BL-039 live matrix + BL-031 |
| M3 — Realtime        | TODO        |                                   |
| M4 — Signals         | TODO        |                                   |
| M5 — Backtesting     | TODO        |                                   |
| M6 — Manual Sandbox  | IN_PROGRESS | E7A Admin API + Admin UI scaffold |
| M7 — Paper           | TODO        |                                   |
| M8 — Guarded Live    | TODO        |                                   |

## EPIC E2

| ID     | Status | Notes                                                                               |
| ------ | ------ | ----------------------------------------------------------------------------------- |
| BL-020 | DONE   | Migrations applied on local Docker Postgres                                         |
| BL-021 | DONE   | Repositories + psql/docker `DbClient`                                               |
| BL-022 | DONE   | Outbox repository + publisher + eventId consumer idempotency                        |
| BL-023 | DONE   | Append-only audit service + secret redaction; migration `002_audit_append_only.sql` |

## EPIC E7A (v1.2)

| ID     | Status  | Notes                                                                                                                               |
| ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| BL-078 | DONE    | Durable command request bodies; hash conflict rejection                                                                             |
| BL-079 | DONE    | Global durable sync; ACCOUNT_STATUS_ALL; missing recovery hint                                                                      |
| BL-087 | DONE    | Close preview + open-risk ack; fund no-withdraw; timeout → unknown                                                                  |
| BL-088 | DONE    | Admin sandbox routes + bearer auth; POST → 202 + audit/outbox                                                                       |
| BL-089 | PARTIAL | `/admin/sandbox` UI: overview/accounts/detail/ops, fund/close confirms, no optimistic success; Playwright E2E deferred (no install) |

## Notes

- Admin UI lives under `apps/web/src/features/admin/sandbox`
- Playwright E2E blocked by `never install` rule — unit tests cover routing/fund validation
- Quality: Biome + `pnpm precommit`

## Next

1. Wire `@moex/api` composition root to Postgres + sandbox provider
2. Add Playwright E2E when dependency installs are allowed
