# ADR-003: pnpm + Turborepo

## Status

Accepted

## Context

Many apps and packages need consistent install, build, lint, typecheck, and test orchestration.

## Decision

- `pnpm-workspace.yaml` for workspaces.
- Turborepo for `build`, `lint`, `typecheck`, `test`.
- Pin Node LTS via `.node-version` and CI.
- Lockfile is required; no floating ranges for SDK/financial libraries.

## Consequences

Reproducible installs and CI. Package scripts must be real (no dummy scripts).
