# ADR-011: Independent Live Runtime + shared candle stream / Независимый Live Runtime и общий поток свечей

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Ранний MVP «Live» на графике (WebSocket `/ws/market-data` + CHART leases) умирал вместе с вкладкой браузера и не анализировал вселенную инструментов. Нужен независимый 24/7 Live Mode по избранному с публикацией сигналов (Telegram позже), без второго подключения к T-Invest для того же `instrumentUid+interval`.

**EN.** The early chart “Live” MVP (WebSocket `/ws/market-data` + CHART leases) died with the browser tab and did not analyze an instrument universe. We need an independent 24/7 Live Mode over favorites with signal publishing (Telegram later), without a second T-Invest subscription for the same `instrumentUid+interval`.

## Decision / Решение

**RU.**

- **Live Mode ≠ chart realtime.** Live — durable backend-сессия (`LiveRuntime`); график — эфемерный display-consumer.
- Один **`MarketStreamHub`** владеет `StreamConnectionManager` + `SubscriptionRegistry` в процессе API (MVP).
- Потребители: `CHART` (gateway) и `STRATEGY` (LiveRuntime) делят ref-count провайдерских ключей.
- Вселенная Live = T-Invest `GetFavorites` (не ручной CRUD); start/stop через `/api/v1/live/*` и UI на dashboard.
- Сигналы → `live_signals` + outbox `signal.telegram`; `TelegramNotifier` пока stub (токен/channel id позже).
- Отложено: перенос hub → `worker-market-data`, Live → `worker-strategy`, autostart после деплоя, реальные Telegram credentials.

**EN.**

- **Live Mode ≠ chart realtime.** Live is a durable backend session (`LiveRuntime`); the chart is an ephemeral display consumer.
- One **`MarketStreamHub`** owns `StreamConnectionManager` + `SubscriptionRegistry` in the API process (MVP).
- Consumers: `CHART` (gateway) and `STRATEGY` (LiveRuntime) share provider-key ref-counts.
- Live universe = T-Invest `GetFavorites` (not manual CRUD); start/stop via `/api/v1/live/*` and dashboard UI.
- Signals → `live_signals` + outbox `signal.telegram`; `TelegramNotifier` is a stub for now (bot token/channel id later).
- Deferred: move hub → `worker-market-data`, Live → `worker-strategy`, post-deploy autostart, real Telegram credentials.

## Consequences / Последствия

**RU.** Остановка Live не рвёт CHART leases; закрытие графика не останавливает Live. Один provider subscription на ключ при одновременном Live+chart. Полный TSE strategy loop ещё подключается через `ClosedBarEvaluator` port; сейчас closed-bar hold monitor + stub Telegram.

**EN.** Stopping Live does not drop CHART leases; closing the chart does not stop Live. One provider subscription per key when Live and chart overlap. Full TSE strategy loop still plugs in via `ClosedBarEvaluator`; current path is closed-bar hold monitor + Telegram stub.
