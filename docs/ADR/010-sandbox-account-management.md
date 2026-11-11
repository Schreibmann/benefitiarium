# ADR-010: Sandbox account management and Admin UI / Управление sandbox-счётами и Admin UI

## Status / Статус

Accepted (TECHNICAL_BACKLOG v1.2) (принято; TECHNICAL_BACKLOG v1.2)

## Context / Контекст

**RU.** Sandbox-счета T-Invest эфемерны (могут исчезнуть; держатся ~3 месяца с последнего использования). Продакшен `GetAccounts` не должен подменять листинг sandbox. Пополнение — одностороннее в RUB с документированным лимитом; close/create — внешние побочные эффекты записи, требующие долговечного учёта операций.

**EN.** T-Invest Sandbox accounts are ephemeral (may disappear; kept ~3 months from last use). Production `GetAccounts` must not substitute sandbox account listing. Funding is one-way RUB top-up with a documented cap; close/create are external write side effects that need durable operation tracking.

## Decision / Решение

**RU.**

- Жизненный цикл sandbox в `packages/sandbox-management` (`SandboxAccountService`).
- RPC провайдера только в `packages/broker-tinvest` через **sandbox-only** фабрику клиента (фиксированный хост `sandbox-invest-public-api.tbank.ru:443` + `TINVEST_SANDBOX_TOKEN`).
- create/fund/close выполняются только в `worker-execution`; API ставит в очередь долговечные команды.
- Admin UI под `/admin/sandbox` общается только с нашим Admin API; видимость пункта меню — не авторизация.
- `MISSING` — локальный диагностический статус после сверки с `GetSandboxAccounts`, не статус брокера. Пропавшие счета никогда не пересоздаются автоматически с тем же ID.

**EN.**

- Own sandbox lifecycle in `packages/sandbox-management` (`SandboxAccountService`).
- Provider RPCs live only in `packages/broker-tinvest` via a **sandbox-only** client factory (fixed host `sandbox-invest-public-api.tbank.ru:443` + `TINVEST_SANDBOX_TOKEN`).
- Write create/fund/close run only in `worker-execution`; API enqueues durable commands.
- Admin UI under `/admin/sandbox` talks only to our Admin API; menu visibility is not authorization.
- `MISSING` is a local diagnostic status after reconciliation with `GetSandboxAccounts`, not a broker status. Missing accounts are never auto-recreated under the same ID.

## Consequences / Последствия

**RU.** Раздельные учётные данные и эндпоинты Sandbox и продакшена навсегда. Журнал операций и ключи идемпотентности обязательны до write-маршрутов Admin API. Таблицы персистентности — с BL-020; до этого сервис использует in-memory journal для unit/contract-тестов.

**EN.** Separate Sandbox vs production credentials/endpoints permanently. Operation journal + idempotency keys are required before Admin API write routes. Persistence tables land with BL-020; until then the service uses an in-memory journal for unit/contract tests.
