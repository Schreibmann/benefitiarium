# ADR-002: React SPA + Fastify API / React SPA и Fastify API

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Нужен локальный/веб-интерфейс для графиков, сигналов и ручной торговли плюс типизированный бэкенд, владеющий учётными данными брокера.

**EN.** Need a local/web UI for charts, signals, and manual trading plus a typed backend that owns broker credentials.

## Decision / Решение

**RU.**

- Frontend: React + TypeScript + Vite SPA (без SSR в v1).
- API: Fastify со схемной валидацией Zod (один подход к валидации, последовательно).
- Realtime UI: WebSocket (SSE — только если позже понадобится однонаправленная лента).
- Вся авторизация у брокера и операции записи — только на бэкенде.

**EN.**

- Frontend: React + TypeScript + Vite SPA (no SSR in v1).
- API: Fastify with Zod schema validation (one validation approach, applied consistently).
- Realtime UI: WebSocket (SSE only if a unidirectional feed needs it later).
- All broker auth and write operations stay on the backend.

## Consequences / Последствия

**RU.** Простая история развёртывания; UI никогда не хранит токены с полным доступом. Для границ env и HTTP в M0+ выбрана валидация через Zod.

**EN.** Simple deployment story; UI never holds full-access tokens. Validation library choice is Zod for env and HTTP boundaries in M0+.
