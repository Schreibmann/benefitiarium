# ADR-002: React SPA + Fastify API

## Status

Accepted

## Context

Need a local/web UI for charts, signals, and manual trading plus a typed backend that owns broker credentials.

## Decision

- Frontend: React + TypeScript + Vite SPA (no SSR in v1).
- API: Fastify with Zod schema validation (one validation approach, applied consistently).
- Realtime UI: WebSocket (SSE only if a unidirectional feed needs it later).
- All broker auth and write operations stay on the backend.

## Consequences

Simple deployment story; UI never holds full-access tokens. Validation library choice is Zod for env and HTTP boundaries in M0+.
