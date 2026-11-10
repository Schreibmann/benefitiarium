# ADR-004: PostgreSQL as source of truth / PostgreSQL как источник истины

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Нужно долговечное хранилище для инструментов, свечей, сигналов, ордеров, аудита и бэктестов.

**EN.** Need durable storage for instruments, candles, signals, orders, audit, and backtests.

## Decision / Решение

**RU.** PostgreSQL хранит доменные данные. Drizzle ORM отвечает за типизированный доступ и SQL-миграции (с BL-020). TimescaleDB — опционально после оценки объёма и задержек. Фоновые задачи MVP могут использовать очереди на PostgreSQL; Redis — только при доказанной необходимости.

**EN.** PostgreSQL stores domain data. Drizzle ORM owns typed access and SQL migrations (from BL-020). TimescaleDB is optional after measuring volume/latency. MVP background jobs may use PostgreSQL-backed queues; Redis only when proven necessary.

## Consequences / Последствия

**RU.** Один операционный datastore для MVP. Партиционирование и hypertables откладываются до измеримой боли.

**EN.** Single operational datastore for MVP. Partitioning/hypertables deferred until measured pain.
