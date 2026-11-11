# ADR-006: Signal is not an order / Сигнал — это не ордер

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Стратегии не должны торговать молча. Запись к брокеру требует независимой проверки рисков.

**EN.** Strategies must not silently trade. Broker writes need independent risk validation.

## Decision / Решение

**RU.** Строгая цепочка:

`Market Event → Feature/Indicator → Strategy → Signal → Trade Proposal → Risk Check → Order Command → Broker → Order/Fill Events`

У Strategy Worker нет учётных данных на запись к брокеру; он не может вызывать `PostOrder`. Execution Worker сам проверяет предложения и режим торговли.

**EN.** Strict chain:

`Market Event → Feature/Indicator → Strategy → Signal → Trade Proposal → Risk Check → Order Command → Broker → Order/Fill Events`

Strategy Worker has no broker write credentials and cannot call `PostOrder`. Execution Worker validates proposals and trading mode itself.

## Consequences / Последствия

**RU.** Чёткие границы процессов и пакетов; более безопасный путь к автоматизации позже.

**EN.** Clear process/package boundaries; safer automation path later.
