# ADR-007: Durable command workflow for broker writes / Долговечный workflow команд записи к брокеру

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Сетевые таймауты после `PostOrder` делают слепые повторы опасными (дублирование ордеров).

**EN.** Network timeouts after `PostOrder` make blind retries dangerous (duplicate orders).

## Decision / Решение

**RU.** Сохранять локальное намерение ордера и уникальный `client_order_id` до сетевой отправки. Передавать этот UID как `order_id` T-Invest по контракту API. Таймаут → локальный `UNKNOWN`; без автоматической повторной отправки до сверки. Аудит и correlation ID на каждой команде записи.

**EN.** Persist local order intent and unique `client_order_id` before network send. Pass that UID as T-Invest `order_id` per API contract. Timeout → local `UNKNOWN`; no automatic resubmit until reconciliation. Audit + correlation ID on every write command.

## Consequences / Последствия

**RU.** Машина состояний ордера должна включать `UNKNOWN`. Сверка обязательна после перезапуска worker.

**EN.** Order state machine must include `UNKNOWN`. Reconciliation is mandatory after worker restart.
