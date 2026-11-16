# ADR-012: Market trigger signals and notifications / Рыночные триггер-сигналы и уведомления

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Нужны расширяемые триггеры по свечам (сначала приближение и пересечение уровней Fibonacci на 5m/1h) и доставка алертов в Telegram. Существующая таблица `signals` завязана на `strategy_versions` и внутренние `instruments.id`, тогда как realtime-поток идентифицирует инструмент через T-Invest `instrumentUid`. Торговые сигналы (ADR-006) остаются отдельной цепочкой.

**EN.** We need extensible candle triggers (first: Fibonacci level approach/cross on 5m/1h) and Telegram alert delivery. The existing `signals` table is tied to `strategy_versions` and internal `instruments.id`, while the realtime stream identifies instruments by T-Invest `instrumentUid`. Trading signals (ADR-006) remain a separate chain.

## Decision / Решение

**RU.**

1. Ввести пакет `@moex/signal-triggers` с интерфейсом `Trigger` / `TriggerRegistry`; первые триггеры — `fib_pivot_approach` и `fib_pivot_cross`.
2. Хранить алерты в `market_signals` (ключ дедупа) и очередь доставки в `notifications`; атомарная запись signal+notification.
3. `apps/worker-signals` потребляет favorites-свечи (отдельный T-Invest stream, режим `close` по умолчанию или `intrabar` из env) и пишет в Postgres.
4. `apps/worker-notifier` поллит `notifications` и шлёт через **Grammy** (`sendMessage` + `message_thread_id`) в forum group: topics **alerts** / **logs** / **errors**.
5. Live Mode пишет alerts/`entry_confirm` в ту же очередь (`thread_id` = alerts); ops → logs; platform errors → errors (`signal_id` nullable).
6. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ALERTS|LOGS|ERRORS` (legacy `TELEGRAM_CHANNEL_ID` как alias).
7. Триггеры не являются ордерами и не вызывают брокера.

**EN.**

1. Introduce `@moex/signal-triggers` with a `Trigger` / `TriggerRegistry` interface; first triggers are `fib_pivot_approach` and `fib_pivot_cross`.
2. Persist alerts in `market_signals` (dedupe key) and a delivery queue in `notifications`; write signal+notification atomically.
3. `apps/worker-signals` consumes favorites candles (separate T-Invest stream, default `close` or env `intrabar`) and writes to Postgres.
4. `apps/worker-notifier` polls `notifications` and sends via **Grammy** (`sendMessage` + `message_thread_id`) into a forum group: **alerts** / **logs** / **errors** topics.
5. Live Mode enqueues alerts/`entry_confirm` on the same queue (`thread_id` = alerts); ops → logs; platform errors → errors (`signal_id` nullable).
6. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ALERTS|LOGS|ERRORS` (legacy `TELEGRAM_CHANNEL_ID` alias).
7. Triggers are not orders and never call the broker.

## Consequences / Последствия

**RU.** M4 получает explainable market alerts независимо от strategy-engine. Расширение списка триггеров — регистрация новых `Trigger` без смены воркера. Telegram-перебои не теряют события благодаря durable queue. Цена: отдельная схема таблиц и отдельный stream-процесс (избегает конфликта LIVE vs WAITING_CLOSE на одном соединении).

**EN.** M4 gets explainable market alerts independent of the strategy-engine. Extending triggers means registering new `Trigger`s without changing the worker. Telegram outages do not drop events thanks to the durable queue. Trade-off: separate tables and a dedicated stream process (avoids LIVE vs WAITING_CLOSE clash on one connection).
