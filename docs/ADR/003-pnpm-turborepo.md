# ADR-003: pnpm + Turborepo / pnpm и Turborepo

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Много приложений и пакетов требуют согласованной установки, сборки, lint, typecheck и оркестрации тестов.

**EN.** Many apps and packages need consistent install, build, lint, typecheck, and test orchestration.

## Decision / Решение

**RU.**

- `pnpm-workspace.yaml` для workspaces.
- Turborepo для `build`, `lint`, `typecheck`, `test`.
- Закрепить Node LTS через `.node-version` и CI.
- Lockfile обязателен; без плавающих диапазонов для SDK и финансовых библиотек.

**EN.**

- `pnpm-workspace.yaml` for workspaces.
- Turborepo for `build`, `lint`, `typecheck`, `test`.
- Pin Node LTS via `.node-version` and CI.
- Lockfile is required; no floating ranges for SDK/financial libraries.

## Consequences / Последствия

**RU.** Воспроизводимые установки и CI. Скрипты пакетов должны быть реальными (без заглушек).

**EN.** Reproducible installs and CI. Package scripts must be real (no dummy scripts).
