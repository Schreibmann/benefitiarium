# Benefitiarium Development Roadmap / Roadmap разработки Benefitiarium

**RU.** **Версия документа:** 1.1
**EN.** **Document version:** 1.1
**RU.** **Дата исследования:** 8 ноября 2026 г.
**EN.** **Research date:** 8 November 2026
**RU.** **Статусы этапов обновлены:** 10 ноября 2026 г. (синхронизация с `docs/STATUS.md`)
**EN.** **Stage statuses updated:** 10 November 2026 (synced with `docs/STATUS.md`)
**RU.** **Основной стек:** TypeScript / Node.js, React, PostgreSQL
**EN.** **Primary stack:** TypeScript / Node.js, React, PostgreSQL
**RU.** **Брокерский API для исполнения:** T-Invest API (Т‑Банк)
**EN.** **Broker API for execution:** T-Invest API (T‑Bank)
**RU.** **Дополнительный источник биржевых данных:** MOEX ISS
**EN.** **Additional exchange data source:** MOEX ISS

---

## 1. Goal and project scope / Цель и границы проекта

**RU.** Разработать собственную торговую платформу, которая объединяет четыре контура:
**EN.** Develop your own trading platform that combines four circuits:

**RU.** 1. **Market data:** получение, нормализация и хранение исторических и текущих рыночных данных по инструментам Московской биржи.
**EN.** 1. **Market data:** obtaining, normalizing and storing historical and current market data on Moscow Exchange instruments.
**RU.** 2. **Research & analytics:** технический и статистический анализ, индикаторы, поиск рыночных ситуаций, исследование гипотез.
**EN.** 2. **Research & analytics:** technical and statistical analysis, indicators, search for market situations, hypothesis research.
**RU.** 3. **Signals & backtesting:** формирование объяснимых сигналов, проверка торговых стратегий на истории и оценка их качества.
**EN.** 3. **Signals & backtesting:** generating explainable signals, checking trading strategies against history and assessing their quality.
**RU.** 4. **Trading:** ручное выставление заявок из интерфейса и постепенный переход к автоматическому исполнению по утверждённым стратегиям.
**EN.** 4. **Trading:** manual placement of orders from the interface and a gradual transition to automatic execution according to approved strategies.

**RU.** Это не высокочастотный торговый терминал. Первая версия должна быть пригодна для личной систематической торговли, анализа акций и фьючерсов, тестирования стратегий и контролируемого исполнения через брокера.
**EN.** This is not a high frequency trading terminal. The first version should be suitable for personal systematic trading, analysis of stocks and futures, testing strategies and controlled execution through a broker.

### 1.1. Key architecture decision / Ключевое архитектурное решение

**RU.** Необходимо разделить **биржевой источник данных** и **брокерский канал исполнения**:
**EN.** It is necessary to separate **exchange data source** and **broker execution channel**:

**RU.** - **T-Invest API** — интерфейс Т‑Банка. Через него приложение получает инструменты, котировки, свечи, стакан, сделки, портфель и отправляет брокерские поручения.
**EN.** - **T-Invest API** - T-Bank interface. Through it, the application receives instruments, quotes, candles, order book, transactions, portfolio and sends brokerage orders.
**RU.** - **MOEX ISS** — информационно-статистический HTTP API Московской биржи. Он даёт структуру рынков и инструментов, свечи, сделки, котировки и исторические данные. Доступность и задержка рыночной информации зависят от подписки и условий доступа.
**EN.** - **MOEX ISS** - information and statistical HTTP API of the Moscow Exchange. It gives the structure of markets and instruments, candles, trades, quotes and historical data. Availability and latency of market information depends on subscription and access conditions.
**RU.** - **Исполнение заявок** в предлагаемой первой версии выполняется через T-Invest API. MOEX ISS не следует считать публичным API для отправки розничных заявок.
**EN.** - **Execution of orders** in the proposed first version is performed through the T-Invest API. MOEX ISS should not be considered a public API for submitting retail orders.

**RU.** Такое разделение позволяет загружать историю из MOEX ISS, использовать брокерские realtime-потоки T‑Банка, а торговые поручения направлять через брокерский счёт. При необходимости провайдера данных или брокера можно заменить без переписывания стратегий.
**EN.** This separation allows you to download history from MOEX ISS, use T‑Bank brokerage realtime streams, and send trading orders through a brokerage account. If necessary, the data provider or broker can be replaced without rewriting strategies.

**RU.** > Важно: T-Invest API — API брокера, а не прямой интерфейс к торговому ядру MOEX. Для прямого биржевого подключения MOEX описывает отдельные интерфейсы, включая FAST для market data и FIX для transactional/trading задач. Это другой класс подключения, с отдельными условиями доступа и инфраструктуры, и для первой версии персонального торгового приложения он не нужен.
**EN.** > Important: T-Invest API is a broker API, not a direct interface to the MOEX trading core. For direct exchange connection, MOEX describes separate interfaces, including FAST for market data and FIX for transactional/trading tasks. This is a different connection class, with separate access and infrastructure conditions, and is not needed for the first version of the personal trading application.

---

## 2. What the studied APIs and SDKs provide / Что дают изученные API и SDK

### 2.1. T-Invest API / T-Invest API

**RU.** По документации T‑Банка API поддерживает gRPC, gRPC-Web, REST-прокси и WebSocket. Основной endpoint production — `invest-public-api.tbank.ru:443`, тестовый — `sandbox-invest-public-api.tbank.ru:443`.
**EN.** According to T‑Bank documentation, the API supports gRPC, gRPC-Web, REST proxy and WebSocket. The main production endpoint is `invest-public-api.tbank.ru:443`, the test endpoint is `sandbox-invest-public-api.tbank.ru:443`.

**RU.** Основные сервисы, которые понадобятся проекту:
**EN.** The main services that the project will need:

| Область | Сервис / методы | Применение |
|---|---|---|
| Инструменты | `InstrumentsService`: поиск инструмента, акции, фьючерсы, спецификации, расписания торгов | Каталог активов, идентификаторы, лоты, шаг цены, срок фьючерса |
| История и котировки | `MarketDataService`: `GetCandles`, `GetLastPrices`, `GetLastTrades`, `GetOrderBook`, `GetTradingStatus`, `GetTechAnalysis` | История, realtime snapshot, стакан, сделки, статус инструмента |
| Потоки рынка | `MarketDataStreamService` | Свечи, стакан, обезличенные сделки, last price и статусы |
| Заявки | `OrdersService`: `PostOrder`, `PostOrderAsync`, `GetOrders`, `GetOrderState`, `CancelOrder`, `ReplaceOrder` | Ручная и автоматическая торговля |
| Потоки заявок | `OrdersStreamService`: `OrderStateStream`, `TradesStream` | Отслеживание статуса заявок и сделок без постоянного polling |
| Счета и портфель | `UsersService`, `OperationsService`, соответствующие stream-сервисы | Баланс, позиции, доступность операций, история операций |
| Условные поручения | `StopOrdersService` | Стоп-заявки, если они поддерживаются для выбранного инструмента и режима |
| Тестирование | `SandboxService` | Проверка сценариев отправки и сопровождения заявок без реальных денег |


**EN.**
| Area | Service / methods | Use |
|---|---|---|
| Instruments | `InstrumentsService`: instrument search, shares, futures, specs, trading schedules | Asset catalog, identifiers, lots, tick size, futures expiration |
| History and quotes | `MarketDataService`: `GetCandles`, `GetLastPrices`, `GetLastTrades`, `GetOrderBook`, `GetTradingStatus`, `GetTechAnalysis` | History, realtime snapshot, order book, trades, instrument status |
| Market streams | `MarketDataStreamService` | Candles, order book, anonymous trades, last price and statuses |
| Orders | `OrdersService`: `PostOrder`, `PostOrderAsync`, `GetOrders`, `GetOrderState`, `CancelOrder`, `ReplaceOrder` | Manual and automated trading |
| Order streams | `OrdersStreamService`: `OrderStateStream`, `TradesStream` | Track order and trade status without constant polling |
| Accounts and portfolio | `UsersService`, `OperationsService`, related stream services | Balance, positions, operation availability, operations history |
| Conditional orders | `StopOrdersService` | Stop orders when supported for the instrument and mode |
| Testing | `SandboxService` | Test order submit/lifecycle scenarios without real money |

**RU.** **Исторические свечи `GetCandles`.** Запрос принимает `from` и `to` в UTC, `instrumentId`, интервал, опциональный `limit` и тип источника свечей. В API доступны интервалы от 5 секунд до месяца, но глубина периода и максимальное количество свечей зависят от интервала и могут отличаться по инструментам.
**EN.** **Historical candles `GetCandles`.** The request accepts `from` and `to` in UTC, `instrumentId`, interval, optional `limit` and candle source type. Intervals from 5 seconds to a month are available in the API, but the depth of the period and the maximum number of candles depend on the interval and may differ by instrument.

**RU.** Текущие ориентиры из документации:
**EN.** Current guidelines from the documentation:

| Интервал | Ориентир максимального `limit` | Глубина одного запроса |
|---|---:|---|
| 5 секунд | 2500 | до 200 минут |
| 10 секунд | 1250 | до 200 минут |
| 30 секунд | 2500 | до 20 часов |
| 1 минута | 2400 | до 1 дня |
| 2 минуты | 1200 | до 1 дня |
| 3 минуты | 750 | до 1 дня |
| 5 минут | 2400 | до недели |
| 10 минут | 1200 | до недели |
| 15 минут | 2400 | до 3 недель |
| 30 минут | 1200 | до 3 недель |
| 1 час | 2400 | до 3 месяцев |
| 2 часа | 2400 | до 3 месяцев |
| 4 часа | 700 | до 3 месяцев |
| 1 день | 2400 | до 6 лет |
| 1 неделя | 300 | до 5 лет |
| 1 месяц | 120 | до 10 лет |


**EN.**
| Interval | Approximate max `limit` | Single-request depth |
|---|---:|---|
| 5 seconds | 2500 | up to 200 minutes |
| 10 seconds | 1250 | up to 200 minutes |
| 30 seconds | 2500 | up to 20 hours |
| 1 minute | 2400 | up to 1 day |
| 2 minutes | 1200 | up to 1 day |
| 3 minutes | 750 | up to 1 day |
| 5 minutes | 2400 | up to 1 week |
| 10 minutes | 1200 | up to 1 week |
| 15 minutes | 2400 | up to 3 weeks |
| 30 minutes | 1200 | up to 3 weeks |
| 1 hour | 2400 | up to 3 months |
| 2 hours | 2400 | up to 3 months |
| 4 hours | 700 | up to 3 months |
| 1 day | 2400 | up to 6 years |
| 1 week | 300 | up to 5 years |
| 1 month | 120 | up to 10 years |

**RU.** Для секундных свечей доступна только история примерно за последний месяц. Данные о первой доступной минутной и дневной свече можно получить из методов сервиса инструментов (`first_1min_candle_date`, `first_1day_candle_date`). Не предполагать, что история всех инструментов начинается в одну дату.
**EN.** For second candles, only the history for approximately the last month is available. Data about the first available minute and daily candle can be obtained from the tools service methods (`first_1min_candle_date`, `first_1day_candle_date`). Do not assume that the history of all instruments begins on the same date.

**RU.** **Архив истории.** T‑Банк также описывает отдельный REST-метод `GET https://invest-public-api.tbank.ru/history-data` для ZIP-архивов минутных свечей за год. Запрос выполняется с Bearer-токеном и `instrument_id` (либо устаревшим `figi`) и `year`. Архивы обновляются раз в день, обычно ночью; текущего торгового дня в архиве ещё нет. Внутри присутствуют идентификатор инструмента, UTC-время, OHLC и объём в лотах. Это удобно для первичной загрузки и дозаполнения истории, но текущую сессию нужно получать отдельно.
**EN.** **History archive.** T‑Bank also describes a separate REST method `GET https://invest-public-api.tbank.ru/history-data` for ZIP archives of minute candles for the year. Запрос выполняется с Bearer-токеном и `instrument_id` (либо устаревшим `figi`) и `year`. Архивы обновляются раз в день, обычно ночью; текущего торгового дня в архиве ещё нет. Внутри присутствуют идентификатор инструмента, UTC-время, OHLC и объём в лотах. This is convenient for the initial download and updating the history, but the current session must be obtained separately.

### 2.2. MOEX ISS / MOEX ISS

**RU.** MOEX ISS — HTTP API, предоставляющий данные рынков Московской биржи: структуру торговых движков и рынков, режимы торгов, инструменты, описания, свечи, обезличенные сделки, котировки и исторические результаты.
**EN.** MOEX ISS is an HTTP API that provides data from the Moscow Exchange markets: the structure of trading engines and markets, trading modes, instruments, descriptions, candles, anonymous transactions, quotes and historical results.

**RU.** Практическая роль MOEX ISS в проекте:
**EN.** Practical role of MOEX ISS in the project:

**RU.** - независимый источник биржевых данных для истории и сверки с брокерскими данными;
**EN.** - an independent source of exchange data for history and reconciliation with broker data;
**RU.** - получение справочников `engine / market / board / security`;
**EN.** - obtaining directories `engine/market/board/security`;
**RU.** - загрузка данных по инструментам, которые неудобно или невозможно полностью покрыть через брокерскую историю;
**EN.** - downloading data on instruments that are inconvenient or impossible to fully cover through the brokerage history;
**RU.** - подготовка собственных исторических выборок для исследований и бэктестинга.
**EN.** - preparing your own historical samples for research and backtesting.

**RU.** В документации MOEX отмечено, что часть рыночной информации без подписки доступна с задержкой; realtime-доступ и отдельные наборы исторических данных зависят от подписки и условий предоставления данных. В developer manual ISS отдельно указано, что исторические данные в пространстве `/iss/history` (кроме индексов) доступны подписчикам, а анонимный доступ к текущим данным обычно имеет задержку 15 минут; стакан также может требовать подписки. Эти условия нужно проверить по текущему договору и конкретному market/board перед проектированием загрузки. Не строить стратегию, требующую актуальной котировки, на бесплатном delayed feed.
**EN.** MOEX documentation notes that some unsubscribed market information is available with a delay; realtime access and individual historical data sets are subject to subscription and data provision terms. The ISS developer manual specifically states that historical data in the `/iss/history` space (except for indexes) is available to subscribers, and anonymous access to current data usually has a delay of 15 minutes; the glass may also require a subscription. These conditions must be checked against the current contract and the specific market/board before designing the download. Do not build a strategy that requires current quotes on free delayed feed.

**RU.** Общая форма запросов — REST/HTTP с JSON-ответом. Интроспекцию нужно делать от общего к частному:
**EN.** The general form of requests is REST/HTTP with a JSON response. Introspection must be done from the general to the specific:

```text
https://iss.moex.com/iss/engines.json
https://iss.moex.com/iss/engines/{engine}/markets.json
https://iss.moex.com/iss/engines/{engine}/markets/{market}/boards.json
https://iss.moex.com/iss/engines/{engine}/markets/{market}/boards/{board}/securities/{SECID}.json
```

**RU.** Исторические выборки и свечи запрашивать по соответствующему пространству `/iss/history` и/или объекту `/candles` согласно интерактивному справочнику ISS для конкретного рынка. В запросах использовать период `from` / `till`, а также пагинацию `start`. Важно читать список `columns` из каждого блока ответа, а не полагаться на фиксированный порядок полей в JSON-массиве.
**EN.** Historical selections and candles should be requested using the appropriate `/iss/history` space and/or `/candles` object according to the ISS online reference for a specific market. In requests, use the period `from` / `till`, as well as pagination `start`. It is important to read the list of `columns` from each response block rather than relying on a fixed order of fields in the JSON array.

**RU.** У MOEX инструмент не должен идентифицироваться только тикером. Нужен контекст торгового режима: как минимум `engine`, `market`, `board`, `SECID`.
**EN.** At MOEX, an instrument should not be identified only by a ticker. You need a trading mode context: at least `engine`, `market`, `board`, `SECID`.

### 2.3. SDK `invest-js`: what to use / SDK `invest-js`: что использовать

**RU.** Ссылка пользователя ведёт на новый репозиторий T‑Банка `invest-js`. Важно не перепутать его со старым пакетом `@tinkoff/invest-js`, который опубликован давно и имеет другую API-модель.
**EN.** The user's link leads to the new T‑Bank repository `invest-js`. It is important not to confuse it with the old package `@tinkoff/invest-js`, which was published a long time ago and has a different API model.

**RU.** В актуальной линейке пакетов `@ttech-pub/*` на дату исследования присутствуют:
**EN.** The current line of `@ttech-pub/*` packages as of the research date includes:

| Пакет | Назначение | Рекомендация |
|---|---|---|
| `@ttech-pub/invest-sdk-node` | Высокоуровневый SDK для Node.js | **Основной выбор для backend и worker-процессов** |
| `@ttech-pub/invest-sdk-web` | SDK для браузера через gRPC-Web | Только для безопасных read-only сценариев; торговые операции лучше проксировать через backend |
| `@ttech-pub/invest-core` | Общая доменная логика, `Decimal`, конвертеры цен и общие типы | Использовать при расчётах денежных и ценовых величин |
| `@ttech-pub/grpc-node-client` | Низкоуровневый gRPC Node.js-клиент | Нужен, если требуется доступ ниже уровня команд SDK или middleware |
| `@ttech-pub/grpc-web-client` | Низкоуровневый gRPC-Web-клиент | Для браузерной интеграции на низком уровне |
| `@ttech-pub/invest-rest-client` | HTTP/JSON REST-клиент | Альтернатива gRPC там, где REST удобнее или доступнее |
| `@ttech-pub/invest-engine-node` | Движок стратегий и бэктестинга для Node.js | Оценить и протестировать до решения: использовать целиком или только отдельные компоненты |


**EN.**
| Package | Purpose | Recommendation |
|---|---|---|
| `@ttech-pub/invest-sdk-node` | High-level SDK for Node.js | **Primary choice for backend and worker processes** |
| `@ttech-pub/invest-sdk-web` | Browser SDK via gRPC-Web | Read-only browser scenarios only; proxy trading through the backend |
| `@ttech-pub/invest-core` | Shared domain logic, `Decimal`, price converters and common types | Use for money and price calculations |
| `@ttech-pub/grpc-node-client` | Low-level gRPC Node.js client | When you need access below SDK commands or middleware |
| `@ttech-pub/grpc-web-client` | Low-level gRPC-Web client | For low-level browser integration |
| `@ttech-pub/invest-rest-client` | HTTP/JSON REST client | REST alternative where it is simpler or available |
| `@ttech-pub/invest-engine-node` | Strategy and backtesting engine for Node.js | Evaluate before deciding to use whole package or parts only |

**RU.** На дату исследования опубликованные страницы npm показывают версию `1.61.0` для пакетов этой линейки; это снимок на 8 ноября 2026 г., а не обещание, что версия останется последней к моменту установки. Перед разработкой проверить `npm view` и release notes, после чего зафиксировать согласованные версии. Новая SDK-линейка ориентирована на TypeScript: команды с типизированными входами/выходами, RxJS `Observable` для stream-подписок и `Decimal` вместо вычислений цен в обычном `number`. В документации пакета для web-варианта есть примеры команд `GetSharesCommand`, `GetCandlesCommand`, `GetOrderBookCommand`, `GetMarketdataStreamCommand`, `CreateOrderCommand` и `GetPositionsCommand`; Node.js-вариант предназначен для серверного использования и дополнительно содержит поддержку sandbox и сертификатов УЦ Минцифры.
**EN.** As of the date of research, the published npm pages show version `1.61.0` for packages in this line; this is a snapshot as of November 8, 2026, not a promise that the version will remain up to date at the time of installation. Before development, check the `npm view` and release notes, and then commit the agreed upon versions. The new SDK line is focused on TypeScript: commands with typed inputs/outputs, RxJS `Observable` for stream subscriptions and `Decimal` instead of calculating prices in the usual `number`. The package documentation for the web version contains examples of the commands `GetSharesCommand`, `GetCandlesCommand`, `GetOrderBookCommand`, `GetMarketdataStreamCommand`, `CreateOrderCommand` and `GetPositionsCommand`; The Node.js version is intended for server use and additionally contains support for sandbox and certificates from the Ministry of Digital Development.

**RU.** **Рекомендуемая стратегия интеграции:** обернуть SDK собственным интерфейсом `BrokerGateway`. Не использовать T‑Bank классы напрямую в стратегиях, UI и таблицах базы данных. Тогда переход на новую версию SDK или другого брокера не затронет доменную модель приложения.
**EN.** **Recommended integration strategy:** wrap the SDK with its own `BrokerGateway` interface. Do not use T‑Bank classes directly in strategies, UI and database tables. Then the transition to a new version of the SDK or another broker will not affect the domain model of the application.

**RU.** Пример установки (сверить peer dependencies и совместимость версий по README выбранного релиза):
**EN.** Installation example (check peer dependencies and version compatibility according to the README of the selected release):

```bash
pnpm add @ttech-pub/invest-sdk-node @ttech-pub/invest-core
```

**RU.** Если выбранная версия Node SDK требует отдельный transport package, установить согласованную версию `@ttech-pub/grpc-node-client`. Все пакеты `@ttech-pub/*` фиксировать одной совместимой версией, lock-файл хранить в Git. Не обновлять SDK автоматически без регрессионных тестов.
**EN.** If the selected Node SDK version requires a separate transport package, install the consistent version of `@ttech-pub/grpc-node-client`. All packages `@ttech-pub/*` should be fixed in one compatible version, the lock file should be stored in Git. Don't update the SDK automatically without regression tests.

**RU.** **Ключевые выводы по выбору SDK:**
**EN.** **Key takeaways for choosing an SDK:**

**RU.** - Для сервера брать `invest-sdk-node`, а не web-клиент.
**EN.** - For the server, use `invest-sdk-node`, and not the web client.
**RU.** - Не класть full-access токен в React/Vite bundle, `VITE_*`, localStorage или браузерные переменные.
**EN.** - Do not put full-access token in React/Vite bundle, `VITE_*`, localStorage or browser variables.
**RU.** - `Decimal` использовать на всём финансовом пути: котировка → расчёт размера позиции → округление по шагу цены → заявка → PnL.
**EN.** - `Decimal` used throughout the financial path: quote → position size calculation → rounding by price step → order → PnL.
**RU.** - `invest-engine-node` рассматривать как готовый модуль-кандидат. До принятия проверить: какие типы данных он ожидает, как реализованы комиссии/проскальзывание/частичные исполнения, как сериализуются версии стратегий и поддерживается ли воспроизводимый replay. Наличие названия «backtesting engine» само по себе не гарантирует корректный для MOEX учёт фьючерсов, сессий и брокерских комиссий.
**EN.** - `invest-engine-node` should be considered as a ready-made candidate module. Before accepting, check: what types of data it expects, how commissions/slippage/partial executions are implemented, how strategy versions are serialized, and whether replay is supported. The presence of the name “backtesting engine” does not in itself guarantee correct accounting of futures, sessions and brokerage commissions for MOEX.

---

## 3. Proposed architecture / Предлагаемая архитектура

**RU.** Начинать с **модульного монолита на TypeScript**, а не с десятка микросервисов. Разделить процессы по назначению и оставить общие доменные пакеты. При росте нагрузки отдельные worker-процессы можно вынести независимо.
**EN.** Start with a **modular TypeScript monolith**, not a dozen microservices. Separate processes by purpose and leave common domain packages. As the load increases, individual worker processes can be carried out independently.

```text
┌─────────────────────────────────────────────────────────┐
│                    React Web UI                         │
│ watchlists · charts · signals · orders · portfolio      │
└───────────────────────────┬─────────────────────────────┘
                            │ REST + WebSocket/SSE
┌───────────────────────────▼─────────────────────────────┐
│                Backend API (Fastify/Nest)                │
│ auth · query API · command API · user settings           │
└─────────┬────────────────┬───────────────────┬───────────┘
          │                │                   │
┌─────────▼──────┐ ┌───────▼────────┐ ┌────────▼─────────┐
│ Market Data    │ │ Strategy       │ │ Execution        │
│ collector      │ │ worker         │ │ worker           │
│ T-Invest       │ │ indicators     │ │ risk checks      │
│ MOEX ISS       │ │ signals        │ │ order lifecycle  │
└─────────┬──────┘ └───────┬────────┘ └────────┬─────────┘
          │                │                   │
          └────────────────┼───────────────────┘
                           │
               ┌───────────▼───────────┐
               │ Persistence & Events  │
               │ PostgreSQL/Timescale  │
               │ Redis (optional)      │
               │ raw files / Parquet   │
               └───────────────────────┘

External providers:
  T-Invest API  ← market data, account, orders, streams
  MOEX ISS      ← exchange metadata, history, verification
```

### 3.1. Components / Компоненты

**RU.** **Frontend — React + TypeScript.** Экран наблюдения за рынком, графики, список инструментов, лента сигналов, форма ручной заявки, позиции, активные поручения, журнал сделок и состояние автоторговли. Frontend не должен иметь прямого доступа к full-access API-токену.
**EN.** **Frontend - React + TypeScript.** Market monitoring screen, charts, list of instruments, signal feed, manual order form, positions, active orders, trade log and auto trading status. Frontend should not have direct access to the full-access API token.

**RU.** **Backend API — Fastify или NestJS.** Авторизация пользователя, REST endpoints для UI, трансляция обновлений через WebSocket/SSE, управление настройками стратегий и торговыми режимами. Для небольшого проекта Fastify проще; NestJS удобен, если требуется строгая модульная структура и DI.
**EN.** **Backend API - Fastify or NestJS.** User authorization, REST endpoints for the UI, broadcasting updates via WebSocket/SSE, managing strategy settings and trading modes. For a small project, Fastify is easier; NestJS is useful if you need a strict modular structure and DI.

**RU.** **Market Data Worker.** Историческая загрузка, realtime-подписки, проверка пропусков, нормализация, дедупликация и сохранение данных.
**EN.** **Market Data Worker.** Historical loading, realtime subscriptions, gap checking, normalization, deduplication and data storage.

**RU.** **Strategy Worker.** Пересчёт индикаторов, обработка закрытых свечей/рыночных событий, запуск стратегий и создание сигналов.
**EN.** **Strategy Worker.** Recalculation of indicators, processing of closed candles/market events, launching strategies and creating signals.

**RU.** **Execution Worker.** Единственная часть системы, имеющая право отправлять реальные заявки. Проверяет риски и торговые ограничения, отправляет поручение, отслеживает его статус и синхронизирует сделки.
**EN.** **Execution Worker.** The only part of the system that has the right to send real orders. Checks risks and trading restrictions, sends an order, tracks its status and synchronizes transactions.

**RU.** **Хранилище.**
**EN.** **Storage.**

**RU.** - PostgreSQL + TimescaleDB — инструменты, свечи, сигналы, заявки, сделки, позиции, настройки, результаты бэктестинга. На старте допустим обычный PostgreSQL с партиционированием по времени.
**EN.** - PostgreSQL + TimescaleDB - instruments, candles, signals, orders, deals, positions, settings, backtesting results. At the start, we will accept regular PostgreSQL with time partitioning.
**RU.** - Redis — кэш последних котировок, блокировки, очереди задач (например, BullMQ), краткоживущие состояния stream-соединений. В MVP можно начать без Redis.
**EN.** - Redis - cache of latest quotes, blocking, task queues (for example, BullMQ), short-lived states of stream connections. MVP can be started without Redis.
**RU.** - Объектное хранилище (MinIO/S3) или файловое хранилище с Parquet — опционально для raw-архивов, крупных trade/orderbook-серий и датасетов бэктестинга.
**EN.** - Object storage (MinIO/S3) or file storage with Parquet - optional for raw archives, large trade/orderbook series and backtesting datasets.

### 3.2. Example monorepo layout / Пример структуры monorepo

```text
apps/
  api/                    # HTTP API и realtime gateway для UI
  web/                    # React-приложение
  worker-market-data/     # загрузка истории и streaming
  worker-strategy/        # индикаторы, стратегии, сигналы
  worker-execution/       # risk checks и отправка заявок
  worker-backtest/        # фоновые прогоны стратегий

packages/
  domain/                 # Instrument, Candle, Signal, Order, Position
  broker-tinvest/         # адаптер к @ttech-pub/invest-sdk-node
  marketdata-moex-iss/    # адаптер к MOEX ISS
  marketdata/             # нормализация, валидация, backfill
  analytics/              # индикаторы и статистика
  strategy-engine/        # интерфейсы и runtime стратегий
  risk-engine/            # sizing, лимиты, pre-trade controls
  execution/              # order state machine и reconciliation
  backtest/               # event-driven simulator
  persistence/            # repositories, migrations, queries
  config/                 # env schema и runtime config
  observability/          # logs, metrics, tracing

infra/
  docker-compose.yml
  migrations/
  grafana/
  prometheus/
```

---

## 4. Domain model and instrument identifiers / Доменная модель и идентификаторы инструментов

**RU.** Это один из самых важных разделов. Типовая ошибка — использовать только `ticker` и считать его глобально уникальным.
**EN.** This is one of the most important sections. A common mistake is to use only `ticker` and treat it as globally unique.

### 4.1. Normalized instrument / Нормализованный инструмент

**RU.** Создать собственную сущность `Instrument`, не равную структуре конкретного API:
**EN.** Create your own `Instrument` entity, not equal to the structure of a specific API:

```ts
export type Instrument = {
  id: string;                    // внутренний стабильный UUID
  assetType: 'share' | 'bond' | 'etf' | 'future' | 'currency' | 'index';
  ticker: string;
  name: string;
  exchange: 'MOEX';
  currency?: string;
  lotSize: number;
  minPriceIncrement: string;     // Decimal string
  priceType: 'currency' | 'point';
  brokerUid?: string;            // T-Invest instrument_uid
  brokerPositionUid?: string;
  figi?: string;                 // только совместимость / legacy
  isin?: string;
  moexEngine?: string;
  moexMarket?: string;
  moexBoard?: string;
  moexSecid?: string;
  tradingStatus?: string;
  expirationDate?: string;       // для срочных инструментов
  underlyingInstrumentId?: string;
  contractValue?: string;        // хранить как Decimal string
  metadata: Record<string, unknown>;
};
```

**RU.** T‑Банк рекомендует использовать `uid`; FIGI отмечен как устаревающий идентификатор. Комбинация `ticker + class_code` важна для определения торговой позиции в API Т‑Банка. В MOEX ISS существенны `engine`, `market`, `board`, `SECID`. Хранить все идентификаторы отдельно и связывать через таблицу `instrument_provider_ids`.
**EN.** T‑Bank recommends using `uid`; FIGI is marked as a deprecated identifier. The combination `ticker + class_code` is important for determining the trading position in the T‑Bank API. In MOEX ISS, `engine`, `market`, `board`, `SECID` are essential. Store all identifiers separately and link them through the `instrument_provider_ids` table.

### 4.2. Catalog tables / Таблицы каталога

**RU.** `instruments` — внутренняя сущность инструмента.
**EN.** `instruments` is the internal entity of the instrument.
**RU.** `instrument_provider_ids` — соответствия `provider`, `provider_instrument_id`, `class_code`, `board`, `market`, `engine`.
**EN.** `instrument_provider_ids` - matches `provider`, `provider_instrument_id`, `class_code`, `board`, `market`, `engine`.
**RU.** `instrument_specs` — история спецификаций с `valid_from` / `valid_to`: lot size, tick size, currency, multiplier, futures price type.
**EN.** `instrument_specs` - history of specifications with `valid_from` / `valid_to`: lot size, tick size, currency, multiplier, futures price type.
**RU.** `trading_sessions` — торговые сессии и календарь для рынка/инструмента.
**EN.** `trading_sessions` — trading sessions and calendar for the market/instrument.

**RU.** Не перезаписывать спецификацию без истории. Лотность, шаг цены, параметры фьючерса и торговые статусы могут меняться; исторические расчёты должны использовать параметры, актуальные на дату сделки.
**EN.** Don't rewrite a specification without a history. Lot sizes, price increments, futures parameters and trading statuses may change; historical calculations must use parameters current at the date of the transaction.

### 4.3. Futures specifics / Особенности фьючерсов

**RU.** Для фьючерсного контракта дополнительно хранить:
**EN.** For a futures contract, additionally store:

**RU.** - уникальный UID конкретного контракта и код серии (`ticker + class_code`, для T‑Invest class_code обычно `SPBFUT`);
**EN.** - unique UID of a specific contract and series code (`ticker + class_code`, for T‑Invest class_code is usually `SPBFUT`);
**RU.** - базовый актив (`basic_asset` / `basic_asset_position_uid` в модели T‑Банка);
**EN.** - basic asset (`basic_asset` / `basic_asset_position_uid` in the T‑Bank model);
**RU.** - категорию базового актива: `commodity` | `equity_index` | `currency` | `share` | `other`;
**EN.** - underlying asset category: `commodity` | `equity_index` | `currency` | `share` | `other`;
**RU.** - дату экспирации и дату последнего обращения;
**EN.** - expiration date and date of last call;
**RU.** - границы доступной истории (`first_1min_candle_date`, `first_1day_candle_date`);
**EN.** - boundaries of available history (`first_1min_candle_date`, `first_1day_candle_date`);
**RU.** - цену в пунктах или валюте расчёта (`priceType`);
**EN.** - price in points or payment currency (`priceType`);
**RU.** - стоимость пункта / контрактный мультипликатор (`minPriceIncrementAmount`);
**EN.** - point value / contract multiplier (`minPriceIncrementAmount`);
**RU.** - размер лота и требования по гарантийному обеспечению, если они предоставляются;
**EN.** - lot size and warranty requirements, if provided;
**RU.** - открытый интерес, если он доступен в потоке;
**EN.** - open interest, if it is available in the stream;
**RU.** - правила перехода на следующий контракт (roll schedule).
**EN.** - rules for moving to the next contract (roll schedule).

**RU.** `Indicatives` (например индекс IMOEX) — отдельные неисполняемые ряды базового актива. Их свечи нельзя подменять историей фьючерсного контракта. Историю commodity/index futures загружать по `instrument_uid` конкретного контракта; покрытие фиксировать в coverage matrix (BL-039). Дополнительный источник свечей FORTS — MOEX AlgoPack (`boards/rfud/.../candles.json`), не блокер T‑Invest ingestion.
**EN.** `Indicatives` (for example, the IMOEX index) are individual non-executable series of the underlying asset. Their candlesticks cannot be replaced by the history of the futures contract. Load the history of commodity/index futures using the `instrument_uid` of a specific contract; Fix the coating in the coverage matrix (BL-039). An additional source of FORTS candles is MOEX AlgoPack (`boards/rfud/.../candles.json`), not a T‑Invest ingestion blocker.

**RU.** Не объединять разные серии фьючерсов в один временной ряд без явной roll-логики. Непрерывный back-adjusted ряд годится для отдельных видов анализа, но не является исполнимым инструментом. В заявке указывать конкретный контракт.
**EN.** Do not combine different series of futures into one time series without explicit roll logic. A continuous back-adjusted series is suitable for certain types of analysis, but is not an executable tool. Please indicate the specific contract in your application.

**RU.** Для конвертации стоимости фьючерсных и облигационных цен использовать подходящие конвертеры SDK (`FuturesPriceConverter`, `BondsPriceConverter`) либо собственную реализацию, прошедшую unit-тесты на спецификациях. Нельзя предполагать, что цена фьючерса в пунктах равна денежной цене контракта.
**EN.** To convert the cost of futures and bond prices, use suitable SDK converters (`FuturesPriceConverter`, `BondsPriceConverter`) or your own implementation that has passed unit tests on the specifications. It cannot be assumed that the futures price in points is equal to the cash price of the contract.

---

## 5. Market data collection and storage / Сбор и хранение рыночных данных

### 5.1. Datasets / Наборы данных

**RU.** Не пытаться собирать всё в первой итерации. Сначала нужны свечи и спецификации; далее — last price, trades и order book.
**EN.** Don't try to assemble everything in the first iteration. First you need spark plugs and specifications; further - last price, trades and order book.

| Набор | Зачем нужен | Приоритет |
|---|---|---|
| Инструменты и спецификации | Каталог, tick size, lot size, contract specs | P0 |
| OHLCV candles | Графики, индикаторы, backtesting | P0 |
| Last price / best bid-ask | Контроль актуальности цены и исполнение | P0 |
| Trading status / schedule | Запрет торгов вне разрешённого режима | P0 |
| Портфель и позиции | Проверка размера позиции и риска | P0 для торговли |
| Trades | Анализ потока сделок, объёмов и импульса | P1 |
| Order book | Спред, ликвидность, глубина рынка | P1 |
| Open interest (фьючерсы) | Анализ срочного рынка | P1 |
| Полный tick/orderbook history | Микроструктура и точный replay | P2 |


**EN.**
| Dataset | Why needed | Priority |
|---|---|---|
| Instruments and specifications | Catalog, tick size, lot size, contract specs | P0 |
| OHLCV candles | Charts, indicators, backtesting | P0 |
| Last price / best bid-ask | Price freshness checks and execution | P0 |
| Trading status / schedule | Block trading outside allowed mode | P0 |
| Portfolio and positions | Position size and risk checks | P0 for trading |
| Trades | Trade flow, volume and impulse analysis | P1 |
| Order book | Spread, liquidity, market depth | P1 |
| Open interest (futures) | Derivatives market analysis | P1 |
| Full tick/order book history | Microstructure and precise replay | P2 |

### 5.2. Candle shape / Структура свечи

**RU.** Нормализовать все источники в единый контракт:
**EN.** Normalize all sources into a single contract:

```ts
export type Candle = {
  instrumentId: string;
  provider: 't-invest' | 'moex-iss';
  interval: '5s' | '10s' | '30s' | '1m' | '5m' | '15m' |
            '30m' | '1h' | '2h' | '4h' | '1d' | '1w' | '1M';
  timeStart: string;             // ISO UTC
  timeEnd: string;               // ISO UTC
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  volumeUnit: 'lots' | 'contracts' | 'shares' | 'unknown';
  turnover?: string;
  isClosed: boolean;
  sourceRevision?: string;
};
```

**RU.** Цены и денежные суммы хранить строкой Decimal либо в точном decimal/numeric типе БД. Не использовать IEEE-754 `number` в качестве источника истины для цены и денег. Все внутренние временные метки хранить в UTC; для отображения использовать `Europe/Moscow` и учитывать реальные расписания торговых сессий.
**EN.** Store prices and monetary amounts in the Decimal string or in the exact decimal/numeric database type. Don't use IEEE-754 `number` as the source of truth for price and money. Store all internal timestamps in UTC; For display use `Europe/Moscow` and take into account real trading session schedules.

### 5.3. Historical loading / Историческая загрузка

**RU.** Реализовать единый интерфейс загрузчика:
**EN.** Implement a unified bootloader interface:

```ts
interface HistoricalMarketDataProvider {
  getCandles(input: {
    instrumentId: string;
    interval: Candle['interval'];
    from: Date;
    to: Date;
  }): Promise<Candle[]>;
}
```

**RU.** Реализовать два адаптера:
**EN.** Implement two adapters:

**RU.** - `TInvestHistoricalProvider` — `GetCandles` и, где полезно, годовые архивы `history-data`.
**EN.** - `TInvestHistoricalProvider` - `GetCandles` and, where useful, annual archives `history-data`.
**RU.** - `MoexIssHistoricalProvider` — MOEX ISS JSON, пагинация, справочники и доступные исторические свечи.
**EN.** - `MoexIssHistoricalProvider` - MOEX ISS JSON, pagination, reference books and available historical candles.

**RU.** Алгоритм начальной загрузки для каждого инструмента:
**EN.** Bootstrap algorithm for each tool:

**RU.** 1. Получить и сохранить спецификацию и идентификаторы у обоих провайдеров.
**EN.** 1. Obtain and store the specification and identifiers from both providers.
**RU.** 2. Определить доступную глубину истории по конкретному интервалу.
**EN.** 2. Determine the available history depth for a specific interval.
**RU.** 3. Создать `history_import_job` с диапазоном дат и контрольной точкой.
**EN.** 3. Create a `history_import_job` with a date range and checkpoint.
**RU.** 4. Разбить диапазон на окна, не превышающие ограничения соответствующего API.
**EN.** 4. Divide the range into windows that do not exceed the limitations of the corresponding API.
**RU.** 5. Запросить каждый диапазон с rate limiter и retry/backoff на временные ошибки.
**EN.** 5. Request each range with a rate limiter and retry/backoff for temporary errors.
**RU.** 6. Преобразовать данные в общий формат, проверить поля и нормализовать время.
**EN.** 6. Convert the data to a common format, check the fields and normalize the time.
**RU.** 7. Выполнить upsert по уникальному ключу `(instrument_id, interval, time_start, provider)`.
**EN.** 7. Perform an upsert using the unique key `(instrument_id, interval, time_start, provider)`.
**RU.** 8. Сверить число свечей и границы периода, сохранить cursor/checkpoint.
**EN.** 8. Check the number of candles and period boundaries, save cursor/checkpoint.
**RU.** 9. Записать пропуски в `data_gaps`, а не создавать искусственные свечи с нулевым объёмом.
**EN.** 9. Write gaps in `data_gaps`, rather than creating artificial candles with zero volume.
**RU.** 10. Повторно пройти небольшое окно на границе импорта, чтобы исправить неполные/поздно обновлённые данные.
**EN.** 10. Re-go through the small window at the import border to correct incomplete/late updated data.

**RU.** Для T-Invest `GetCandles` ограничен интервалом и `limit`, поэтому историческую глубину нужно загружать циклом из непересекающихся или контролируемо перекрывающихся окон. Не запрашивать один огромный диапазон в надежде получить все записи.
**EN.** For T-Invest, `GetCandles` is limited by interval and `limit`, so the historical depth must be loaded in a loop of non-overlapping or controlled overlapping windows. Don't query one huge range in hopes of getting all the records.

**RU.** Для MOEX ISS использовать `start` для пагинации, пока API возвращает записи; метаданные `columns` должны использоваться для сопоставления значений. Доступность `/iss/history` по конкретному рынку/инструменту проверить заранее — не считать, что исторические данные доступны без подписки для всех инструментов.
**EN.** For MOEX ISS use `start` for pagination while the API returns records; `columns` metadata should be used to match values. Check the availability of `/iss/history` for a specific market/instrument in advance - do not assume that historical data is available without a subscription for all instruments.

### 5.4. Current-day catch-up / Догрузка текущего дня

**RU.** Исторический ZIP-архив Т‑Банка не содержит текущий торговый день. Поэтому настроить два независимых потока:
**EN.** The T‑Bank historical ZIP archive does not contain the current trading day. Therefore, set up two independent threads:

**RU.** - ночная/периодическая задача — скачивание архивов и backfill за завершённые дни;
**EN.** - nightly/periodic task - downloading archives and backfill for completed days;
**RU.** - realtime stream — получение актуальных данных в течение сессии.
**EN.** - realtime stream - receiving current data during the session.

**RU.** После завершения сессии сделать reconciliation: сравнить последнюю realtime-свечу с историческим источником и обновить свечу, если источник исправил данные. Не считать свечу окончательной до её закрытия; для стратегий по закрытию бара передавать `waitingClose: true` либо самостоятельно проверять интервал.
**EN.** After the session is completed, do a reconciliation: compare the last realtime candle with the historical source and update the candle if the source has corrected the data. Do not consider the candle final until it closes; for bar closing strategies, pass `waitingClose: true` or check the interval yourself.

### 5.5. Quality validation / Валидация качества

**RU.** Для каждой загрузки проверять:
**EN.** For each download, check:

**RU.** - `low <= open <= high` и `low <= close <= high`;
**EN.** - `low <= open <= high` and `low <= close <= high`;
**RU.** - неотрицательный объём;
**EN.** - non-negative volume;
**RU.** - отсутствие дубликатов по ключу;
**EN.** - absence of duplicates by key;
**RU.** - хронологический порядок;
**EN.** - chronological order;
**RU.** - корректное соответствие timestamp торговой сессии;
**EN.** - correct correspondence to the timestamp of the trading session;
**RU.** - разумность гэпов и скачков относительно предыдущей свечи;
**EN.** - reasonableness of gaps and jumps relative to the previous candle;
**RU.** - источники и версии спецификаций;
**EN.** - sources and versions of specifications;
**RU.** - наличие пропусков, которые объясняются неторговым временем, и пропусков, которые требуют backfill.
**EN.** - the presence of gaps that are explained by non-trading time, and gaps that require backfill.

**RU.** Если данные из T‑Invest и MOEX ISS различаются, хранить их раздельно и вести статистику расхождений. Не смешивать значения без правила приоритета. Для backtesting выбрать один источник как канонический на уровне конкретной стратегии/датасета.
**EN.** If data from T‑Invest and MOEX ISS differ, store them separately and keep statistics of discrepancies. Don't mix values ​​without a precedence rule. For backtesting, select one source as canonical at the level of a specific strategy/dataset.

---

## 6. Realtime market data / Realtime market data

### 6.1. Streams / Потоки

**RU.** В первую очередь реализовать одну службу управления market-data subscriptions. Она должна централизованно управлять подписками, а не создавать по соединению на каждый экран UI.
**EN.** First of all, implement one management service, market-data subscriptions. It should manage subscriptions centrally, rather than creating a connection for each UI screen.

**RU.** Рекомендуемые типы подписок T‑Invest:
**EN.** Recommended types of T‑Invest subscriptions:

**RU.** - свечи для выбранного набора инструментов и таймфреймов;
**EN.** - candles for the selected set of instruments and timeframes;
**RU.** - обезличенные сделки;
**EN.** - impersonal transactions;
**RU.** - стакан с нужной глубиной;
**EN.** - a glass with the required depth;
- last price;
**RU.** - изменение статуса инструмента.
**EN.** - change of instrument status.

**RU.** У T‑Invest есть ограничения на число одновременных stream-соединений и подписок. В актуальной таблице лимитов указаны, в частности, лимит 300 одновременных подписок на свечи/стаканы/сделки в одном market-data stream и ограничение частоты отправки отдельных типов сообщений (для стакана и свечей — интервал порядка 100 мс на подписку). Планировать подписки с запасом, объединять инструменты в потоки и не подписываться заново при каждом рендере интерфейса.
**EN.** T‑Invest has restrictions on the number of simultaneous stream connections and subscriptions. The current table of limits indicates, in particular, a limit of 300 simultaneous subscriptions to candles/glasses/trades in one market-data stream and a limitation on the frequency of sending certain types of messages (for glass and candles - an interval of about 100 ms per subscription). Plan subscriptions with reserve, combine tools into threads and do not re-subscribe every time the interface is rendered.

### 6.2. Stream connection reliability / Надёжность stream-соединения

**RU.** Stream manager должен иметь следующие состояния:
**EN.** Stream manager must have the following states:

`DISCONNECTED → CONNECTING → CONNECTED → DEGRADED → RECONNECTING`.

**RU.** Обязательные функции:
**EN.** Required features:

**RU.** - reconnect с exponential backoff и jitter;
**EN.** - reconnect with exponential backoff and jitter;
**RU.** - ping/heartbeat и контроль последнего события;
**EN.** - ping/heartbeat and control of the last event;
**RU.** - восстановление подписок после reconnect;
**EN.** - restoration of subscriptions after reconnect;
**RU.** - обнаружение stale data;
**EN.** - detection of stale data;
**RU.** - запись последнего sequence/timestamp, если он доступен;
**EN.** - record the last sequence/timestamp, if available;
**RU.** - запуск backfill после пропуска событий;
**EN.** - running backfill after missing events;
**RU.** - метрики задержки, количества reconnect и числа потерянных/дублированных событий.
**EN.** - metrics for latency, number of reconnects and number of lost/duplicated events.

**RU.** На стороне потребителя все события должны быть идемпотентными. Для свечей ключ — инструмент + интервал + время начала. Для сделок использовать id/номер сделки, если он предоставлен источником; если уникального идентификатора нет, использовать осторожный составной ключ и сохранять raw event.
**EN.** On the consumer side, all events must be idempotent. For candles, the key is instrument + interval + start time. For transactions, use the transaction id/number if it is provided by the source; if there is no unique identifier, use a careful composite key and store the raw event.

### 6.3. UI data presentation / Данные в интерфейсе

**RU.** Показывать не только цену, но и качество данных:
**EN.** Show not only the price, but also the quality of the data:

**RU.** - timestamp последнего обновления;
**EN.** - timestamp of last update;
**RU.** - источник цены;
**EN.** - source of price;
**RU.** - статус stream;
**EN.** - stream status;
**RU.** - флаг задержки/stale;
**EN.** - delay flag/stale;
**RU.** - текущий торговый статус;
**EN.** - current trading status;
**RU.** - индикатор reconnect/data gap.
**EN.** - reconnect/data gap indicator.

**RU.** Автоматическая торговля должна быть запрещена, если критическая цена устарела, соединение потеряно, инструмент приостановлен или статус торгов неизвестен.
**EN.** Automated trading should be disabled if the critical price is out of date, the connection is lost, the instrument is paused or the trading status is unknown.

---

## 7. Analytics and signals / Аналитика и сигналы

### 7.1. Analytics layers / Слои аналитики

**RU.** Не смешивать расчёт индикаторов, интерпретацию рынка и генерацию заявки.
**EN.** Do not mix indicator calculations, market interpretation and order generation.

**RU.** 1. **Features:** технические признаки (returns, volatility, volume ratio, ATR, spread, open interest delta).
**EN.** 1. **Features:** technical features (returns, volatility, volume ratio, ATR, spread, open interest delta).
**RU.** 2. **Indicators:** SMA, EMA, RSI, MACD, ATR, Bollinger Bands, VWAP, OBV и т. д.
**EN.** 2. **Indicators:** SMA, EMA, RSI, MACD, ATR, Bollinger Bands, VWAP, OBV, etc.
**RU.** 3. **Market context:** тренд/флэт, волатильность, ликвидность, сессия, календарные события.
**EN.** 3. **Market context:** trend/flat, volatility, liquidity, session, calendar events.
**RU.** 4. **Strategy rules:** условия входа/выхода и отмены сценария.
**EN.** 4. **Strategy rules:** conditions for entry/exit and cancellation of the scenario.
**RU.** 5. **Signal:** объяснимое событие с направлением, ценовыми уровнями, сроком действия и причинами.
**EN.** 5. **Signal:** an explainable event with direction, price levels, expiration date and reasons.
**RU.** 6. **Trade proposal:** предложение сделки с рассчитанным объёмом и риском.
**EN.** 6. **Trade proposal:** proposal of a transaction with a calculated volume and risk.
**RU.** 7. **Execution:** реальное брокерское поручение, выполняемое только после риск-проверок.
**EN.** 7. **Execution:** real brokerage order, executed only after risk checks.

### 7.2. Signal contract / Контракт сигнала

```ts
export type TradingSignal = {
  id: string;
  strategyId: string;
  strategyVersion: string;
  instrumentId: string;
  timeframe: string;
  direction: 'buy' | 'sell' | 'close' | 'hold';
  status: 'new' | 'accepted' | 'rejected' | 'expired' | 'executed';
  createdAt: string;
  validUntil: string;
  referencePrice: string;
  entryZone?: { min: string; max: string };
  stopLoss?: string;
  takeProfit?: string[];
  confidence?: number;          // оценка модели, не вероятность прибыли
  reasons: string[];
  features: Record<string, string | number | boolean>;
  dataQuality: 'good' | 'delayed' | 'stale' | 'incomplete';
};
```

**RU.** Сигнал должен содержать **почему** он появился и **при каких условиях перестанет быть актуальным**. Сигнал не должен напрямую вызывать `PostOrder`.
**EN.** The signal must contain **why** it appeared and **under what conditions it will cease to be relevant**. The signal should not directly call `PostOrder`.

### 7.3. Starter strategies / Стартовые стратегии

**RU.** Для первой версии достаточно нескольких прозрачных алгоритмов:
**EN.** For the first version, several transparent algorithms are sufficient:

| Стратегия | Условие-пример | Что проверять |
|---|---|---|
| Moving average crossover | EMA(short) пересекает EMA(long) | Фильтр тренда, ложные пересечения во флэте |
| RSI mean reversion | RSI выходит из экстремальной зоны и подтверждает возврат | Не торговать против сильного тренда без фильтра |
| Breakout | Закрытие выше/ниже максимума/минимума lookback-периода | Фильтр объёма и волатильности, ложный пробой |
| Volume anomaly | Объём значительно выше rolling baseline | Сравнивать одинаковые фазы торговой сессии |
| ATR stop / trailing exit | Стоп на расстоянии k × ATR | Gap risk, tick size и исполнимость стопа |


**EN.**
| Strategy | Example condition | What to verify |
|---|---|---|
| Moving average crossover | EMA(short) crosses EMA(long) | Trend filter, false crosses in ranges |
| RSI mean reversion | RSI leaves extreme zone and confirms reversion | Do not fade strong trends without a filter |
| Breakout | Close above/below lookback high/low | Volume/volatility filter, false breakout |
| Volume anomaly | Volume well above rolling baseline | Compare same session phases |
| ATR stop / trailing exit | Stop at k × ATR distance | Gap risk, tick size and stop feasibility |

**RU.** Индикатор — это признак, а не готовая стратегия. Для каждого правила задавать таймфрейм, момент вычисления (закрытая свеча/каждое событие), фильтры, правила выхода и риск-параметры.
**EN.** An indicator is a sign, not a ready-made strategy. For each rule, set the time frame, calculation moment (closed candle/each event), filters, exit rules and risk parameters.

### 7.4. Signal explanation / Объяснение сигнала

**RU.** Для пользователя генерировать структурированное пояснение:
**EN.** For the user to generate a structured explanation:

**RU.** - какие условия сработали;
**EN.** - what conditions worked;
**RU.** - какие фильтры прошли/не прошли;
**EN.** - which filters passed/failed;
**RU.** - цена и timestamp данных, на которых построен сигнал;
**EN.** - price and timestamp of the data on which the signal is based;
**RU.** - ожидаемая зона входа;
**EN.** - expected entry area;
- invalidation level;
**RU.** - расчётный стоп, цель и риск/прибыль;
**EN.** - calculated stop, target and risk/profit;
**RU.** - известные ограничения (спред, низкая ликвидность, близость экспирации, delayed data).
**EN.** - known restrictions (spread, low liquidity, proximity to expiration, delayed data).

**RU.** AI/LLM можно добавить как слой объяснения и суммаризации рыночного контекста. Не поручать LLM самостоятельно выбирать количество лотов или напрямую отправлять заявки. Критические правила риска должны быть детерминированными и тестируемыми.
**EN.** AI/LLM can be added as a layer of explanation and summarization of market context. Do not instruct LLMs to independently select the number of lots or submit applications directly. Critical risk rules must be deterministic and testable.

---

## 8. Backtesting and strategy evaluation / Backtesting и оценка стратегии

**RU.** Бэктестинг — отдельный обязательный контур. Исторические свечи не становятся корректным бэктестом автоматически.
**EN.** Backtesting is a separate mandatory circuit. Historical candles do not automatically become valid backtests.

### 8.1. Simulator requirements / Требования к симулятору

**RU.** Симулятор должен учитывать:
**EN.** The simulator must take into account:

**RU.** - точное время появления сигнала и доступность данных в этот момент;
**EN.** - exact time of signal appearance and data availability at this moment;
**RU.** - исполнение не раньше следующего возможного торгового события;
**EN.** - execution no earlier than the next possible trading event;
**RU.** - шаг цены и размер лота;
**EN.** - price step and lot size;
**RU.** - bid/ask spread и проскальзывание;
**EN.** - bid/ask spread and slippage;
**RU.** - комиссии брокера/биржи и иные применимые издержки;
**EN.** - broker/exchange commissions and other applicable costs;
**RU.** - частичное исполнение и отсутствие ликвидности;
**EN.** - partial execution and lack of liquidity;
**RU.** - торговые сессии, аукционы, перерывы и неторговые дни;
**EN.** - trading sessions, auctions, breaks and non-trading days;
**RU.** - stop execution при гэпе через уровень;
**EN.** - stop execution when there is a gap through the level;
**RU.** - лимитные заявки, которые могли не исполниться, даже если свеча касалась цены;
**EN.** - limit orders that could not be executed even if the candle touched the price;
**RU.** - корректные спецификации инструмента на дату события;
**EN.** - correct instrument specifications on the date of the event;
**RU.** - экспирацию и перекладку фьючерсов;
**EN.** - expiration and transfer of futures;
**RU.** - корпоративные действия для акций, если они влияют на ряд.
**EN.** - corporate actions for shares if they affect the series.

**RU.** **Не допускать look-ahead bias:** сигнал на закрытии свечи нельзя исполнить по цене закрытия этой же свечи, если в реальности цена стала известна лишь после её завершения. Для внутрисвечных стопов OHLC недостаточно, чтобы достоверно знать очередность high/low; нужен консервативный сценарий или tick/orderflow данные.
**EN.** **Do not allow look-ahead bias:** a signal at the closing of a candle cannot be executed at the closing price of the same candle, if in reality the price became known only after its completion. For intracandlestick stops, OHLC is not enough to reliably know the high/low order; need a conservative script or tick/orderflow data.

### 8.2. Metrics / Метрики

**RU.** Обязательные метрики результата:
**EN.** Required outcome metrics:

**RU.** - net PnL после комиссий и проскальзывания;
**EN.** - net PnL after commissions and slippage;
**RU.** - максимальная просадка и длительность восстановления;
**EN.** - maximum drawdown and recovery duration;
**RU.** - Sharpe / Sortino (с оговоркой о частоте данных и корректности annualization);
**EN.** - Sharpe / Sortino (with a reservation about the frequency of data and the correctness of annualization);
- profit factor;
**RU.** - expectancy на сделку;
**EN.** - expectancy for a deal;
**RU.** - win rate и average win/loss;
**EN.** - win rate and average win/loss;
**RU.** - количество сделок, оборот, market exposure;
**EN.** - number of transactions, turnover, market exposure;
**RU.** - комиссии как доля gross PnL;
**EN.** - commissions as a share of gross PnL;
**RU.** - результат по инструменту, направлению, дню недели и рыночному режиму.
**EN.** - result by instrument, direction, day of week and market regime.

### 8.3. Testing methodology / Методика тестирования

**RU.** 1. Разделить историю на train / validation / out-of-sample по времени.
**EN.** 1. Divide the history into train / validation / out-of-sample by time.
**RU.** 2. Использовать walk-forward тестирование.
**EN.** 2. Use walk-forward testing.
**RU.** 3. Не подбирать сотни параметров на одном и том же тестовом участке.
**EN.** 3. Do not select hundreds of parameters on the same test area.
**RU.** 4. Сравнивать с простым benchmark (например, buy-and-hold или нулевая стратегия).
**EN.** 4. Compare with a simple benchmark (for example, buy-and-hold or zero strategy).
**RU.** 5. Сохранять неизменяемую версию стратегии, конфигурацию и ID датасета для каждого прогона.
**EN.** 5. Save an unchangeable version of the strategy, configuration and dataset ID for each run.
**RU.** 6. Выполнять тест устойчивости: изменять комиссии, slippage и входные параметры в разумных пределах.
**EN.** 6. Perform a stability test: change commissions, slippage and input parameters within reasonable limits.
**RU.** 7. После исторического теста перейти к paper trading на новых данных, которые не использовались при разработке стратегии.
**EN.** 7. After the historical test, move on to paper trading using new data that was not used when developing the strategy.

**RU.** `@ttech-pub/invest-engine-node` стоит проверить как возможную основу движка стратегий/бэктеста. Если его симулятор не учитывает все перечисленные особенности, использовать его для индикаторов/правил или прототипа, а execution simulator реализовать самостоятельно. API T‑Банка предоставляет исторические котировки и торговые методы; методологию проверки торговой гипотезы приложение должно реализовать само.
**EN.** `@ttech-pub/invest-engine-node` is worth checking out as a possible basis for a strategy/backtest engine. If its simulator does not take into account all the listed features, use it for indicators/rules or a prototype, and implement the execution simulator yourself. T‑Bank API provides historical quotes and trading methods; The application must implement the methodology for testing the trading hypothesis itself.

---

## 9. Manual trading / Ручная торговля

**RU.** Ручная торговля должна быть реализована раньше автоматической и стать базой для общего механизма исполнения.
**EN.** Manual trading should be implemented before automatic trading and become the basis for a general execution mechanism.

### 9.1. Primary workflow / Основной workflow

**RU.** 1. Пользователь выбирает инструмент из каталога.
**EN.** 1. The user selects a tool from the catalog.
**RU.** 2. UI показывает цену, время последнего обновления, bid/ask, спред, торговый статус и позиции.
**EN.** 2. UI shows price, last updated time, bid/ask, spread, trading status and positions.
**RU.** 3. Пользователь создаёт ордер или открывает предложение из сигнала.
**EN.** 3. The user creates an order or opens an offer from a signal.
**RU.** 4. Backend получает актуальную спецификацию, состояние счёта и текущие рыночные данные.
**EN.** 4. Backend receives the latest specification, account status and current market data.
**RU.** 5. Risk Engine рассчитывает допустимый объём и валидирует заявку.
**EN.** 5. Risk Engine calculates the allowable volume and validates the application.
**RU.** 6. UI показывает preview: направление, тип, цена, количество лотов, ориентировочная сумма, стоп/риск, комиссия/оговорки.
**EN.** 6. UI shows preview: direction, type, price, number of lots, estimated amount, stop/risk, commission/reservations.
**RU.** 7. Пользователь подтверждает действие явно.
**EN.** 7. The user confirms the action explicitly.
**RU.** 8. Execution Worker отправляет заявку через T‑Invest API и сохраняет `order_id`.
**EN.** 8. Execution Worker sends the request via T‑Invest API and saves `order_id`.
**RU.** 9. Статус отслеживается через `OrderStateStream`/`TradesStream`, а при необходимости — через `GetOrderState` и `GetOrders`.
**EN.** 9. The status is tracked through `OrderStateStream`/`TradesStream`, and, if necessary, through `GetOrderState` and `GetOrders`.
**RU.** 10. После сделки обновляются позиции, PnL и журнал исполнения.
**EN.** 10. After the transaction, positions, PnL and execution log are updated.

### 9.2. Order types / Типы заявок

**RU.** T‑Invest API документирует лимитную, рыночную и заявку «лучшая цена», а также time-in-force варианты `DAY`, `FILL_AND_KILL`, `FILL_OR_KILL` (с ограничениями по отдельным режимам/инструментам). Отдельный `StopOrdersService` отвечает за стоп-поручения.
**EN.** T‑Invest API documents limit, market and best price orders, as well as time-in-force options `DAY`, `FILL_AND_KILL`, `FILL_OR_KILL` (with restrictions on individual modes/instruments). A separate `StopOrdersService` is responsible for stop orders.

**RU.** Рекомендации для интерфейса:
**EN.** Recommendations for the interface:

**RU.** - по умолчанию предлагать **лимитную** заявку;
**EN.** - by default offer a **limit** order;
**RU.** - рыночную заявку помечать как потенциально опасную по проскальзыванию;
**EN.** - mark a market order as potentially dangerous due to slippage;
**RU.** - до подтверждения показывать spread и доступную ликвидность стакана;
**EN.** - before confirmation, show the spread and available liquidity of the order book;
**RU.** - не обещать исполнение стоп-цены при гэпе или недостатке встречной ликвидности;
**EN.** - do not promise execution of the stop price in the event of a gap or lack of counter liquidity;
**RU.** - для фьючерсов явно отображать цену в пунктах/валюте, стоимость пункта и размер контракта.
**EN.** - for futures, explicitly display the price in points/currency, point value and contract size.

**RU.** Документация T‑Банка предупреждает, что рыночная заявка может исполниться по нескольким уровням стакана и по менее выгодной цене, если ликвидности на лучшем уровне недостаточно. Следовательно, рыночная заявка не должна считаться гарантированным исполнением по last price.
**EN.** T‑Bank documentation warns that a market order may be executed at several order book levels and at a less favorable price if there is insufficient liquidity at the best level. Therefore, a market order should not be considered a guaranteed execution at the last price.

### 9.3. Order state machine / Order state machine

**RU.** Хранить состояние заявки как собственную машину состояний:
**EN.** Store the request state as its own state machine:

```text
CREATED
  └─> SUBMITTING
        ├─> NEW / ACTIVE
        │     ├─> PARTIALLY_FILLED
        │     │     ├─> FILLED
        │     │     └─> CANCELLED
        │     ├─> FILLED
        │     ├─> CANCEL_PENDING ─> CANCELLED
        │     ├─> REJECTED
        │     └─> EXPIRED
        └─> UNKNOWN  # таймаут / неизвестен результат отправки
```

**RU.** `UNKNOWN` принципиально важен. Если вызов `PostOrder` завершился timeout, нельзя вслепую повторять запрос — первая заявка могла быть принята. Сначала сверить `order_id`, активные заявки, состояние заявки и события stream.
**EN.** `UNKNOWN` is fundamentally important. If the `PostOrder` call has timeoutd, you cannot blindly repeat the request - the first request could have been accepted. First, check `order_id`, active orders, order status and stream events.

**RU.** Для запроса `PostOrder` генерировать уникальный UID `orderId` и хранить его до подтверждения результата. В API это поле используется для идемпотентности; максимальная длина — 36 символов. На уровне БД дополнительно обеспечить уникальность внутреннего `clientOrderId`.
**EN.** For a `PostOrder` request, generate a unique UID `orderId` and store it until the result is confirmed. In the API, this field is used for idempotency; maximum length is 36 characters. At the database level, additionally ensure the uniqueness of the internal `clientOrderId`.

---

## 10. Controlled automated trading / Контролируемая автоматическая торговля

**RU.** Автоматическое исполнение включать только после прохождения backtesting, sandbox и paper trading. Strategy Worker **не должен иметь права на отправку заявок**. Он публикует `TradeProposal`; Execution Worker принимает его и самостоятельно проводит все проверки.
**EN.** Enable automatic execution only after backtesting, sandbox and paper trading. Strategy Worker **must not have permission to submit applications**. It publishes `TradeProposal`; Execution Worker accepts it and carries out all checks independently.

### 10.1. Run modes / Уровни запуска

| Режим | Что происходит | Требование |
|---|---|---|
| `RESEARCH` | История, индикаторы, сигналы | Нет брокерских заявок |
| `MANUAL` | Сигналы → предложение → подтверждение пользователем | Основной безопасный рабочий режим |
| `PAPER` | Симуляция заявок на realtime-данных | Сверка с реалистичным исполнением |
| `SANDBOX` | Отправка заявок в sandbox T‑Банка | Проверка API/order lifecycle, не качества реальной ликвидности |
| `LIVE_GUARDED` | Реальная торговля с ограниченными параметрами и контролем | Разрешённый whitelist, низкий лимит объёма, kill switch |
| `LIVE` | Автоматическое исполнение в рамках утверждённых лимитов | Только после отдельной оценки рисков и длительного paper-теста |


**EN.**
| Mode | What happens | Requirement |
|---|---|---|
| `RESEARCH` | History, indicators, signals | No broker orders |
| `MANUAL` | Signals → proposal → user confirmation | Primary safe operating mode |
| `PAPER` | Simulate orders on realtime data | Compare with realistic fills |
| `SANDBOX` | Send orders to T‑Bank sandbox | Validate API/order lifecycle, not real liquidity quality |
| `LIVE_GUARDED` | Live trading with tight limits and controls | Allowed whitelist, low size cap, kill switch |
| `LIVE` | Auto execution within approved limits | Only after risk review and extended paper test |

**RU.** В production начинать с `LIVE_GUARDED`: одна стратегия, один-два инструмента, минимальный объём, лимит потерь и ручной контроль.
**EN.** In production, start with `LIVE_GUARDED`: one strategy, one or two tools, minimum volume, loss limit and manual control.

### 10.2. Pre-trade Risk Engine / Pre-trade Risk Engine

**RU.** Перед каждой заявкой проверить:
**EN.** Before each application, check:

**RU.** 1. Глобальный `kill switch` выключен.
**EN.** 1. Global `kill switch` is disabled.
**RU.** 2. Разрешён ли live-режим для данной стратегии, счёта и инструмента.
**EN.** 2. Is live mode allowed for this strategy, account and instrument?
**RU.** 3. Сигнал не просрочен и не исполнен ранее.
**EN.** 3. The signal is not expired and has not been executed earlier.
**RU.** 4. Рыночные данные свежие; отсутствует stale flag и активные data gaps.
**EN.** 4. Market data is fresh; There is no stale flag and active data gaps.
**RU.** 5. Торговый статус инструмента позволяет операцию.
**EN.** 5. The trading status of the instrument allows the operation.
**RU.** 6. Текущая сессия открыта для соответствующего режима.
**EN.** 6. The current session is open for the corresponding mode.
**RU.** 7. Инструмент соответствует whitelist и спецификация не устарела.
**EN.** 7. The tool complies with the whitelist and the specification is not outdated.
**RU.** 8. Цена соответствует шагу цены и допустимым ценовым границам.
**EN.** 8. The price corresponds to the price step and acceptable price limits.
**RU.** 9. Количество кратно лоту и не превышает лимит заявки.
**EN.** 9. The quantity is a multiple of the lot and does not exceed the application limit.
**RU.** 10. Достаточно денег/активов/маржи; текущие позиции и активные заявки учтены.
**EN.** 10. Sufficient cash/assets/margin; current positions and active orders are taken into account.
**RU.** 11. Не превышены лимиты по инструменту, стратегии, счёту и дневному риску.
**EN.** 11. Limits for instrument, strategy, account and daily risk have not been exceeded.
**RU.** 12. Нет другой конфликтующей заявки или открывающей операции по тому же инструменту.
**EN.** 12. There is no other conflicting order or opening transaction for the same instrument.
**RU.** 13. Оценочный spread/slippage не превышает установленный порог.
**EN.** 13. The estimated spread/slippage does not exceed the established threshold.
**RU.** 14. Есть доступное соединение с брокерским API и корректная авторизация.
**EN.** 14. There is an available connection to the broker API and correct authorization.

**RU.** Пример абстрактного расчёта размера позиции:
**EN.** An example of an abstract position size calculation:

```text
riskBudget = accountEquity × maxRiskPerTrade
lossPerLot = abs(entryPrice - stopPrice) × valuePerPricePointPerLot
             + estimatedFeesPerLot + estimatedSlippagePerLot
quantityLots = floor(riskBudget / lossPerLot)
quantityLots = min(quantityLots, maxLotsByRisk, maxLotsByExposure,
                   maxLotsByBrokerLimits)
```

**RU.** Для акций и фьючерсов `valuePerPricePointPerLot` рассчитывается по спецификации конкретного инструмента. Для срочного рынка дополнительно проверять гарантийное обеспечение и риск-параметры счёта. Не использовать условную формулу стоимости контракта, одинаковую для всех фьючерсов.
**EN.** For stocks and futures, `valuePerPricePointPerLot` is calculated according to the specification of a particular instrument. For the derivatives market, additionally check the guarantee and risk parameters of the account. Do not use a conditional contract value formula that is the same for all futures.

### 10.3. Global and local limits / Глобальные и локальные лимиты

**RU.** Рекомендуемые параметры конфигурации (значения задать отдельно, не зашивать в код):
**EN.** Recommended configuration parameters (set the values ​​separately, do not include them in the code):

- max risk per trade;
- max daily loss;
- max total drawdown;
- max open positions;
- max notional / max lots per instrument;
- max orders per minute;
- max order value;
- max spread and slippage;
- min liquidity / min book depth;
- allowed trading sessions;
- allowed instruments and strategies;
- max consecutive losses;
- cooldown after rejection, disconnect or abnormal slippage.

**RU.** При срабатывании критического лимита система должна прекратить открытие новых позиций, отправить уведомление и перейти в безопасный режим. Отдельно определить политику по уже открытым позициям: оставить без действий, закрывать вручную или выполнять заранее согласованный сценарий. Автоматическое закрытие при сбое может быть не менее опасным, чем отсутствие действия.
**EN.** When a critical limit is triggered, the system must stop opening new positions, send a notification and go into safe mode. Separately define a policy for already open positions: leave without action, close manually, or execute a pre-agreed scenario. Automatic failure closure can be just as dangerous as no action.

### 10.4. Sandbox: what it validates and what it does not / Sandbox: что он проверяет, а что нет

**RU.** Sandbox T‑Банка — тестовый контур с виртуальными счетами и без влияния на реальные средства. Он полезен для проверки авторизации, методов, форматов заявок, обработки статусов и логики приложения.
**EN.** T‑Bank's Sandbox is a test circuit with virtual accounts and no influence on real funds. It is useful for checking authorization, methods, application formats, status processing and application logic.

**RU.** Однако в документации есть ограничения: в sandbox не рассчитываются некоторые реальные показатели счёта, ставки риска, гарантийное обеспечение и ликвидность портфеля. Счета могут удаляться, хранятся ограниченный срок после последнего использования. Поэтому успешная работа в sandbox **не доказывает**, что стратегия прибыльна или что реальные ордера будут исполняться с тем же качеством.
**EN.** However, the documentation has limitations: the sandbox does not calculate some real account metrics, risk rates, margins, and portfolio liquidity. Accounts can be deleted and are stored for a limited period after their last use. Therefore, successful work in the sandbox **does not prove** that the strategy is profitable or that real orders will be executed with the same quality.

**RU.** Полноценный PAPER-режим на live market data обязателен отдельно от sandbox.
**EN.** A full-fledged PAPER mode on live market data is required separately from sandbox.

---

## 11. API limits, retries, and deduplication / Лимиты API, ретраи и защита от дублирования

**RU.** В актуальной документации T‑Банка есть лимиты unary-вызовов, отдельных торговых методов и stream-подписок. Примеры опубликованных лимитов: сервис котировок — до 600 unary-запросов/мин, сервис инструментов — до 200/мин, сервис ордеров — до 100/мин; для `PostOrder` указан лимит до 15 запросов/сек, для `CancelOrder` — до 300/мин, для `ReplaceOrder` — до 300/мин, для `PostOrderAsync` — до 600/мин. Фактические ограничения могут зависеть от метода, типа клиента и нагрузки; перед production перепроверить актуальную таблицу.
**EN.** The current T‑Bank documentation contains limits on unary calls, individual trading methods and stream subscriptions. Examples of published limits: quote service - up to 600 unary requests/min, instrument service - up to 200/min, order service - up to 100/min; for `PostOrder` the limit is up to 15 requests/sec, for `CancelOrder` - up to 300/min, for `ReplaceOrder` - up to 300/min, for `PostOrderAsync` - up to 600/min. Actual limits may vary by method, client type, and workload; Before production, double-check the current table.

**RU.** Реализовать:
**EN.** Implement:

**RU.** - отдельный rate limiter на каждый класс API;
**EN.** - separate rate limiter for each API class;
**RU.** - очередь задач на исторические загрузки;
**EN.** - queue of tasks for historical downloads;
**RU.** - exponential backoff с jitter для `429`, `5xx` и временных сетевых ошибок;
**EN.** - exponential backoff with jitter for `429`, `5xx` and temporary network errors;
**RU.** - circuit breaker для деградировавшего провайдера;
**EN.** - circuit breaker for a degraded provider;
**RU.** - ограничение числа параллельных запросов;
**EN.** - limiting the number of parallel requests;
**RU.** - приоритет realtime/исполнения над backfill;
**EN.** - priority of realtime/execution over backfill;
**RU.** - отдельные retry policy для read и write методов.
**EN.** - separate retry policy for read and write methods.

**RU.** **Нельзя автоматически ретраить запись как обычный GET.** При timeout после `PostOrder` результат неизвестен. Сначала reconciliation по client order ID, данным активных заявок и order stream, затем решение об отправке.
**EN.** **You cannot automatically retrace a record like a normal GET.** With timeout after `PostOrder` the result is unknown. First, reconciliation based on client order ID, data from active requests and order stream, then the decision to send.

---

## 12. Security / Безопасность

**RU.** 1. Создать отдельный read-only токен для загрузчика/аналитики, если это соответствует текущим правам аккаунта.
**EN.** 1. Create a separate read-only token for the downloader/analytics, if this corresponds to the current account rights.
**RU.** 2. Full-access токен держать только в backend execution worker. Не передавать его в frontend и не логировать.
**EN.** 2. Keep the full-access token only in the backend execution worker. Do not pass it to the frontend and do not log it.
**RU.** 3. Хранить секреты в secret manager или как минимум в защищённых environment variables вне репозитория.
**EN.** 3. Store secrets in a secret manager or at least in protected environment variables outside the repository.
**RU.** 4. Развести sandbox и production credentials, URL и конфигурации.
**EN.** 4. Separate sandbox and production credentials, URLs and configurations.
**RU.** 5. По возможности ограничить токен конкретным счётом.
**EN.** 5. If possible, limit the token to a specific account.
**RU.** 6. Ограничить доступ к интерфейсу управления live trading: сильная аутентификация, аудит действий, защита от CSRF и контроль сессий.
**EN.** 6. Restrict access to the live trading management interface: strong authentication, activity auditing, CSRF protection and session control.
**RU.** 7. Записывать каждое действие: пользователь, стратегия, входящий сигнал, risk checks, payload поручения (без токена), broker order ID, изменения статусов.
**EN.** 7. Record every action: user, strategy, incoming signal, risk checks, payload orders (without token), broker order ID, status changes.
**RU.** 8. Сделать аварийную кнопку остановки новых заявок, а не только скрытие кнопки в UI. Kill switch должен проверяться backend-ом перед каждой отправкой.
**EN.** 8. Make an emergency button to stop new requests, and not just hide the button in the UI. The kill switch must be checked by the backend before each send.
**RU.** 9. Периодически проверять актуальность сертификатов и сетевых требований T‑Банка. В документации отдельно упоминается необходимость сертификатов УЦ Минцифры РФ для некоторых конфигураций подключения.
**EN.** 9. Periodically check the relevance of T‑Bank certificates and network requirements. The documentation specifically mentions the need for CA certificates from the Ministry of Digital Development of the Russian Federation for some connection configurations.
**RU.** 10. Защитить резервные копии БД и секреты; ограничить доступ к логам и выгрузкам портфеля.
**EN.** 10. Protect database backups and secrets; restrict access to logs and portfolio uploads.

---

## 13. Application UI / Интерфейс приложения

### 13.1. Main sections / Основные разделы

**RU.** **1. Dashboard** — индекс/инструменты watchlist, состояние рынка, PnL, риск-показатели, последние сигналы, статус источников данных.
**EN.** **1. Dashboard** - index/watchlist tools, market status, PnL, risk indicators, latest signals, status of data sources.

**RU.** **2. Market Watch** — таблица инструментов: тикер, цена, изменение, bid/ask, spread, объём, статус, время последнего обновления.
**EN.** **2. Market Watch** - table of instruments: ticker, price, change, bid/ask, spread, volume, status, time of last update.

**RU.** **3. Instrument page** — свечной график, объёмы, индикаторы, сделки/стакан, фундаментальные/контрактные параметры, сигналы и история инструмента.
**EN.** **3. Instrument page** - candlestick chart, volumes, indicators, trades/order of book, fundamental/contract parameters, signals and instrument history.

**RU.** **4. Signals** — лента новых сигналов, фильтры по стратегиям/таймфреймам/инструментам, причины, entry/stop/target, актуальность, состояние исполнения.
**EN.** **4. Signals** - a feed of new signals, filters by strategy/timeframe/instrument, reasons, entry/stop/target, relevance, execution status.

**RU.** **5. Strategy Lab** — настройки стратегии, версия, параметры, запуск backtest, сравнение прогонов, equity curve, drawdown, отчёт.
**EN.** **5. Strategy Lab** - strategy settings, version, parameters, running backtest, comparison of runs, equity curve, drawdown, report.

**RU.** **6. Trading** — форма заявки, preview, активные заявки, история поручений, отмена/изменение, лог исполнения.
**EN.** **6. Trading** — application form, preview, active orders, order history, cancellation/change, execution log.

**RU.** **7. Portfolio & Risk** — деньги, позиции, средняя цена, нереализованный/реализованный PnL, exposure, margin и risk limits.
**EN.** **7. Portfolio & Risk** - money, positions, average price, unrealized/realized PnL, exposure, margin and risk limits.

**RU.** **8. Automation** — режим системы, разрешённые стратегии/инструменты, торговые лимиты, последнее событие, kill switch.
**EN.** **8. Automation** — system mode, allowed strategies/instruments, trading limits, last event, kill switch.

**RU.** **9. Data Health** — статус подключений, задержка, ошибки, пропуски истории, статистика расхождения источников.
**EN.** **9. Data Health** - connection status, latency, errors, history omissions, source discrepancy statistics.

### 13.2. UI is not a safety barrier / UI не является защитным барьером

**RU.** Запрет торговли, лимиты и проверка допустимости операции должны выполняться на сервере. Скрыть кнопку, отключить форму или проверять лимиты только в React недостаточно.
**EN.** Trading prohibition, limits and transaction validity checks must be performed on the server. Hiding a button, disabling a form, or checking limits in React alone is not enough.

---

## 14. Application API / API приложения

**RU.** Пример внешнего REST API для UI (это собственные endpoints приложения, не T‑Invest API):
**EN.** An example of an external REST API for the UI (these are the application’s own endpoints, not the T‑Invest API):

```text
GET    /api/instruments
GET    /api/instruments/:id
GET    /api/market/:instrumentId/candles?interval=5m&from=...&to=...
GET    /api/market/:instrumentId/orderbook
GET    /api/market/:instrumentId/trades
GET    /api/signals
GET    /api/signals/:id
POST   /api/signals/:id/accept
POST   /api/signals/:id/reject

GET    /api/strategies
POST   /api/strategies
POST   /api/strategies/:id/backtests
GET    /api/backtests/:id

GET    /api/trading/accounts
GET    /api/trading/positions
GET    /api/trading/orders
POST   /api/trading/order-preview
POST   /api/trading/orders
POST   /api/trading/orders/:id/cancel
POST   /api/trading/orders/:id/replace

GET    /api/automation/status
POST   /api/automation/mode
POST   /api/automation/kill-switch
GET    /api/system/data-health
```

**RU.** Запрос `POST /api/trading/orders` должен требовать явного подтверждения и повторно выполнять server-side risk checks. В режиме `MANUAL` сервер не принимает торговое поручение без подтверждающего действия пользователя. В `LIVE_GUARDED` заявки инициируются только через отдельный внутренний интерфейс с разрешёнными стратегиями.
**EN.** The `POST /api/trading/orders` request must require explicit confirmation and re-run server-side risk checks. In `MANUAL` mode, the server does not accept a trade order without a confirming user action. In `LIVE_GUARDED` orders are initiated only through a separate internal interface with allowed strategies.

**RU.** Для WebSocket/SSE публиковать события UI: `quote.updated`, `candle.closed`, `signal.created`, `order.updated`, `trade.executed`, `position.updated`, `data.health.changed`, `automation.state.changed`.
**EN.** For WebSocket/SSE, publish UI events: `quote.updated`, `candle.closed`, `signal.created`, `order.updated`, `trade.executed`, `position.updated`, `data.health.changed`, `automation.state.changed`.

---

## 15. Development plan by stages / План разработки по этапам

**RU.** Оценки ниже — ориентир для одного разработчика с опытом TypeScript/React, а не обещание календарного срока. Этапы можно корректировать после технического прототипа.
**EN.** The estimates below are a guideline for a single developer with TypeScript/React experience, not a promise of a calendar date. The steps can be adjusted after the technical prototype.

**RU.** **Индикация готовности** (синхронизируется с [`docs/STATUS.md`](STATUS.md), срез 2026-11-10):
**EN.** **Readiness indication** (synchronized with [`docs/STATUS.md`](STATUS.md), slice 2026-11-10):

**RU.** - у этапа — строка `Статус: DONE | PARTIAL | IN_PROGRESS | TODO`;
**EN.** - the stage has the line `Status: DONE | PARTIAL | IN_PROGRESS | TODO`;
**RU.** - у задач — `[x]` сделано, `[~]` частично / MVP, `[ ]` не начато.
**EN.** - for tasks - `[x]` done, `[~]` partially / MVP, `[ ]` not started.

### Stage 0. Integration readiness and validation / Этап 0. Подготовка и проверка интеграций

**RU.** **Статус:** DONE
**EN.** **Status:** DONE

**RU.** **Цель:** доказать, что все внешние интеграции доступны и правильно поняты.
**EN.** **Goal:** prove that all external integrations are accessible and properly understood.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [x] создать репозиторий и pnpm workspace;
**EN.** - [x] create a repository and pnpm workspace;
**RU.** - [x] настроить TypeScript strict, Biome, Vitest (вместо ESLint/Prettier);
**EN.** - [x] configure TypeScript strict, Biome, Vitest (instead of ESLint/Prettier);
**RU.** - [x] убедиться, что открыт и идентифицирован брокерский счёт, доступный для T-Invest API;
**EN.** - [x] make sure that a brokerage account accessible to the T-Invest API is opened and identified;
**RU.** - [x] получить read-only и sandbox tokens (env schema + `.env.example`);
**EN.** - [x] get read-only and sandbox tokens (env schema + `.env.example`);
**RU.** - [x] установить `@ttech-pub/invest-sdk-node` и согласованные зависимости;
**EN.** - [x] install `@ttech-pub/invest-sdk-node` and consistent dependencies;
**RU.** - [x] сделать POC запросов: список акций, список фьючерсов, спецификация инструмента, `GetCandles`, last price, GetAccounts;
**EN.** - [x] make POC requests: list of stocks, list of futures, instrument specification, `GetCandles`, last price, GetAccounts;
**RU.** - [~] проверить stream-соединение и восстановление после disconnect (полный stream-контур — этап 3);
**EN.** - [~] check the stream connection and recovery after disconnect (full stream circuit - stage 3);
**RU.** - [x] сделать один запрос к MOEX ISS для структуры рынка, одного инструмента и исторических свечей;
**EN.** - [x] make one request to MOEX ISS for market structure, one instrument and historical candles;
**RU.** - [x] проверить сертификаты и доступ к API из целевой среды выполнения;
**EN.** - [x] check certificates and API access from the target runtime;
**RU.** - [ ] изучить исходники/README `invest-engine-node` и сделать мини-бенчмарк его возможностей.
**EN.** - [ ] study the sources/README `invest-engine-node` and make a mini-benchmark of its capabilities.

**RU.** **Результат:** небольшой CLI/скрипт, который получает каталог, историю, текущую цену и демонстрирует тестовое подключение к sandbox.
**EN.** **Result:** a small CLI/script that gets the catalog, history, current price and demonstrates a test connection to the sandbox.

**RU.** **Критерии приёмки:** нет токенов в Git; все запросы имеют типизированные ответы; цены корректно представлены Decimal; известна глубина истории по тестовому списку инструментов; документированы ограничения sandbox и rate limits.
**EN.** **Acceptance criteria:** no tokens in Git; all requests have typed responses; prices are correctly presented by Decimal; the depth of history from the test list of instruments is known; sandbox and rate limits are documented.

### Stage 1. Instrument catalog and provider layer / Этап 1. Каталог инструментов и слой провайдеров

**RU.** **Статус:** PARTIAL
**EN.** **Status:** PARTIAL

**RU.** **Цель:** единая идентификация инструментов при нескольких источниках.
**EN.** **Goal:** uniform identification of instruments across multiple sources.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [x] спроектировать `Instrument`, `InstrumentSpec`, `ProviderInstrumentId`;
**EN.** - [x] design `Instrument`, `InstrumentSpec`, `ProviderInstrumentId`;
**RU.** - [x] реализовать `BrokerGateway` и `MarketDataProvider` интерфейсы;
**EN.** - [x] implement `BrokerGateway` and `MarketDataProvider` interfaces;
**RU.** - [x] реализовать адаптер T‑Invest API;
**EN.** - [x] implement the T‑Invest API adapter;
**RU.** - [x] реализовать MOEX ISS adapter для структуры рынков/режимов/инструментов;
**EN.** - [x] implement MOEX ISS adapter for the structure of markets/regimes/instruments;
**RU.** - [~] сопоставить broker UID с `SECID/BOARDID` (базовый mapping есть; полное покрытие режимов — нет);
**EN.** - [~] map broker UID to `SECID/BOARDID` (basic mapping is available; full mode coverage is not);
**RU.** - [~] обновлять каталог по расписанию и хранить историю изменений спецификации (futures catalog snapshot/cache-first; полное schedule/versioning — нет);
**EN.** - [~] update the catalog on a schedule and store the history of specification changes (futures catalog snapshot/cache-first; full schedule/versioning - no);
**RU.** - [~] добавить фильтры: акции, фьючерсы, облигации, валюты, активные/истёкшие (futures picker по категориям на chart UI; полный multi-asset catalog UI — нет).
**EN.** - [~] add filters: stocks, futures, bonds, currencies, active/expired (futures picker by category on chart UI; full multi-asset catalog UI - no).

**RU.** **Критерии приёмки:** выбранные инструменты можно найти по тикеру, UID, FIGI (legacy), SECID и биржевому режиму; неоднозначный тикер не приводит к выбору неправильного инструмента.
**EN.** **Acceptance criteria:** selected instruments can be found by ticker, UID, FIGI (legacy), SECID and exchange mode; an ambiguous ticker does not lead to the selection of the wrong instrument.

### Stage 2. Historical data and storage / Этап 2. Исторические данные и хранилище

**RU.** **Статус:** PARTIAL
**EN.** **Status:** PARTIAL

**RU.** **Цель:** надёжный импорт и повторяемая история.
**EN.** **Goal:** reliable import and repeatable history.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [x] поднять PostgreSQL и миграции;
**EN.** - [x] raise PostgreSQL and migrations;
**RU.** - [~] создать таблицы каталога, свечей, import jobs и data gaps (каталог/admin persistence есть; полный candle store + jobs/gaps — нет);
**EN.** - [~] create catalog tables, candles, import jobs and data gaps (catalog/admin persistence is present; full candle store + jobs/gaps is not);
**RU.** - [~] реализовать `GetCandles` с оконной загрузкой и rate limiter (on-read через T-Invest для chart; durable windowed import — нет);
**EN.** - [~] implement `GetCandles` with window loading and rate limiter (on-read via T-Invest for chart; durable windowed import - no);
**RU.** - [ ] реализовать загрузку годовых ZIP-архивов, если она покрывает целевой инструмент;
**EN.** - [ ] implement downloading of annual ZIP archives if it covers the target tool;
**RU.** - [~] реализовать MOEX ISS history/candles с пагинацией (client/path helpers есть; полный history import — нет);
**EN.** - [~] implement MOEX ISS history/candles with pagination (client/path helpers are present; full history import is not);
**RU.** - [x] нормализовать времена к UTC и значения к Decimal;
**EN.** - [x] normalize times to UTC and values ​​to Decimal;
**RU.** - [ ] добавить backfill и nightly reconciliation;
**EN.** - [ ] add backfill and nightly reconciliation;
**RU.** - [x] создать API чтения свечей и страницу графика (`/charts`, TF `1m|5m|1h`, Fibonacci pivots overlay, session X-scale, zoom/pan).
**EN.** - [x] create an API for reading candles and a chart page (`/charts`, TF `1m|5m|1h`, Fibonacci pivots overlay, session X-scale, zoom/pan).

**RU.** **Критерии приёмки:** повторный импорт не создаёт дубликаты; пропуски видны; импорт может продолжиться после перезапуска; объём и интервалы проверены на ручной выборке; можно построить дневной и внутридневной график.
**EN.** **Acceptance criteria:** re-import does not create duplicates; gaps are visible; import may continue after restart; volume and intervals were checked using manual sampling; You can build a daily and intraday chart.

### Stage 3. Realtime quotes and data health / Этап 3. Realtime-котировки и здоровье данных

**RU.** **Статус:** IN_PROGRESS
**EN.** **Status:** IN_PROGRESS

**RU.** **Цель:** стабильное получение текущей рыночной информации.
**EN.** **Goal:** stable receipt of current market information.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [x] создать единый stream manager (`StreamConnectionManager` + reconnect backoff);
**EN.** - [x] create a single stream manager (`StreamConnectionManager` + reconnect backoff);
**RU.** - [~] реализовать подписку на last price, свечи, trades, book и trading status (candle stream MVP; остальные каналы — нет);
**EN.** - [~] implement subscription to last price, candles, trades, book and trading status (candle stream MVP; other channels - none);
**RU.** - [x] восстановление stream-подписок (`SubscriptionRegistry`);
**EN.** - [x] restoration of stream subscriptions (`SubscriptionRegistry`);
- [ ] stale data detection / feed health (RT-07);
**RU.** - [ ] backfill после reconnect / gap backfill (RT-06);
**EN.** - [ ] backfill after reconnect / gap backfill (RT-06);
**RU.** - [~] отдачу данных в UI через WebSocket (`/ws/market-data` в API process; chart auto-live + history REST fallback; host в `worker-market-data` — нет);
**EN.** - [~] sending data to the UI via WebSocket (`/ws/market-data` in API process; chart auto-live + history REST fallback; host in `worker-market-data` - no);
**RU.** - [ ] мониторинг задержек и статуса источников;
**EN.** - [ ] monitoring of delays and source status;
**RU.** - [ ] durable DB upsert stream-свечей (RT-04 deferred).
**EN.** - [ ] durable DB upsert stream candles (RT-04 deferred).

**RU.** **Критерии приёмки:** после отключения сети соединение восстанавливается и подписки возвращаются; пропуски не маскируются; UI показывает источник и время обновления; автоматическая торговля не может использовать stale data.
**EN.** **Acceptance criteria:** after the network is disconnected, the connection is restored and subscriptions are returned; omissions are not masked; UI shows the source and time of the update; automatic trading cannot use stale data.

### Stage 4. Indicators and signals / Этап 4. Индикаторы и сигналы

**RU.** **Статус:** PARTIAL
**EN.** **Status:** PARTIAL

**RU.** **Цель:** реализовать прозрачный аналитический контур.
**EN.** **Goal:** implement a transparent analytical loop.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [~] выбрать библиотеку/собственную реализацию индикаторов (`@moex/indicators`: Fibonacci Pivot Points; классические SMA/RSI/… — stubs);
**EN.** - [~] select a library/custom implementation of indicators (`@moex/indicators`: Fibonacci Pivot Points; classic SMA/RSI/… - stubs);
**RU.** - [x] написать unit-тесты на контрольных наборах данных (для Fibonacci pivots);
**EN.** - [x] write unit tests on control data sets (for Fibonacci pivots);
**RU.** - [ ] реализовать SMA/EMA, RSI, MACD, ATR, Bollinger, VWAP и volume statistics;
**EN.** - [ ] implement SMA/EMA, RSI, MACD, ATR, Bollinger, VWAP and volume statistics;
**RU.** - [x] Fibonacci Pivot Points overlay на chart (5m→1D / 1h→1W; on-read API);
**EN.** - [x] Fibonacci Pivot Points overlay on chart (5m→1D / 1h→1W; on-read API);
**RU.** - [ ] сделать единый интерфейс Strategy;
**EN.** - [ ] make a unified Strategy interface;
**RU.** - [ ] реализовать 2–3 baseline-стратегии;
**EN.** - [ ] implement 2–3 baseline strategies;
**RU.** - [ ] сохранять версии стратегии и входные параметры;
**EN.** - [ ] save strategy versions and input parameters;
**RU.** - [ ] формировать сигналы с объяснениями, временем действия и data-quality;
**EN.** - [ ] generate signals with explanations, action time and data-quality;
**RU.** - [ ] добавить UI списка сигналов и детализации.
**EN.** - [ ] add UI list of signals and details.

**RU.** **Критерии приёмки:** одинаковый набор данных и одна версия стратегии дают одинаковый результат; сигнал объясним; повторное получение одной и той же свечи не создаёт дублирующий сигнал.
**EN.** **Acceptance criteria:** the same set of data and one version of the strategy give the same result; the signal is explainable; Receiving the same candle repeatedly does not create a duplicate signal.

### Stage 5. Backtesting and Strategy Lab / Этап 5. Backtesting и Strategy Lab

**RU.** **Статус:** TODO
**EN.** **Status:** TODO

**RU.** **Цель:** отделить гипотезу от результата симуляции.
**EN.** **Goal:** Separate the hypothesis from the simulation result.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [ ] проверить `invest-engine-node` по чек-листу раздела 8;
**EN.** - [ ] check `invest-engine-node` using the checklist in section 8;
**RU.** - [ ] выбрать: использовать готовый engine, адаптировать или написать simulator;
**EN.** - [ ] choose: use a ready-made engine, adapt or write a simulator;
**RU.** - [ ] реализовать модель комиссий, slippage, lot size, tick size, расписание торгов;
**EN.** - [ ] implement a commission model, slippage, lot size, tick size, trading schedule;
**RU.** - [ ] реализовать исполнение на следующем доступном событии;
**EN.** - [ ] implement execution on the next available event;
**RU.** - [ ] сохранить результаты и dataset version;
**EN.** - [ ] save results and dataset version;
**RU.** - [ ] создать отчёт с equity, drawdown, PnL и торговой статистикой;
**EN.** - [ ] create a report with equity, drawdown, PnL and trading statistics;
**RU.** - [ ] добавить out-of-sample и walk-forward сценарии.
**EN.** - [ ] add out-of-sample and walk-forward scenarios.

**RU.** **Критерии приёмки:** симулятор не использует будущие данные; комиссии и проскальзывание учтены; одинаковый запуск воспроизводим; есть тесты на gap, partial fill, expiry и no-liquidity случаи.
**EN.** **Acceptance Criteria:** The simulator does not use future data; commissions and slippage are taken into account; we reproduce the same launch; There are tests for gap, partial fill, expiry and no-liquidity cases.

### Stage 6. Manual trading / Этап 6. Ручная торговля

**RU.** **Статус:** PARTIAL
**EN.** **Status:** PARTIAL

**RU.** **Цель:** безопасно отправлять поручения по подтверждению пользователя.
**EN.** **Purpose:** Securely send instructions upon user confirmation.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [~] подключить accounts, positions, order state и operations (Sandbox Admin reads; live order ticket — нет);
**EN.** - [~] connect accounts, positions, order state and operations (Sandbox Admin reads; live order ticket - no);
**RU.** - [ ] реализовать preview заявки (торговый preview; close-preview для sandbox accounts есть);
**EN.** - [ ] implement preview applications (trade preview; close-preview for sandbox accounts available);
**RU.** - [ ] реализовать серверные pre-trade checks для ордеров;
**EN.** - [ ] implement server-side pre-trade checks for orders;
**RU.** - [ ] интегрировать `PostOrder`, `GetOrderState`, `GetOrders`, `CancelOrder`, `ReplaceOrder`;
**EN.** - [ ] integrate `PostOrder`, `GetOrderState`, `GetOrders`, `CancelOrder`, `ReplaceOrder`;
**RU.** - [ ] подписаться на order/trade streams;
**EN.** - [ ] subscribe to order/trade streams;
**RU.** - [~] реализовать state machine и `UNKNOWN` state (для sandbox durable ops / timeout→unknown; не полный order SM);
**EN.** - [~] implement state machine and `UNKNOWN` state (for sandbox durable ops / timeout→unknown; not full order SM);
**RU.** - [x] добавить журнал операций и аудита (Sandbox Admin);
**EN.** - [x] add operation and audit log (Sandbox Admin);
**RU.** - [~] протестировать частичное исполнение, отказ, timeout и cancel race (sandbox fund/close/timeout paths; не live orders).
**EN.** - [~] test partial execution, failure, timeout and cancel race (sandbox fund/close/timeout paths; not live orders).

**RU.** **Критерии приёмки:** пользователь видит подтверждённый статус; timeout не приводит к дублирующей заявке; количество лотов/цена валидируются; торговля недоступна при stale quote/закрытом рынке/недостатке лимита.
**EN.** **Acceptance criteria:** the user sees the confirmed status; timeout does not result in a duplicate request; number of lots/price are validated; Trading is not available when there is a stale quote/closed market/limit limit.

### Stage 7. Paper and Sandbox / Этап 7. Paper и Sandbox

**RU.** **Статус:** PARTIAL
**EN.** **Status:** PARTIAL

**RU.** **Цель:** проверить весь pipeline без риска реальными средствами.
**EN.** **Goal:** test the entire pipeline without risk using real means.

**RU.** Задачи:
**EN.** Tasks:

**RU.** - [ ] реализовать PAPER broker simulator на live data;
**EN.** - [ ] implement PAPER broker simulator on live data;
**RU.** - [x] реализовать sandbox gateway / Sandbox Admin (E7A: create/sync/fund/close, durable journal/outbox/audit, Admin UI + e2e);
**EN.** - [x] implement sandbox gateway / Sandbox Admin (E7A: create/sync/fund/close, durable journal/outbox/audit, Admin UI + e2e);
**RU.** - [ ] прогнать стратегии не менее нескольких торговых недель;
**EN.** - [ ] run strategies for at least several trading weeks;
**RU.** - [ ] сравнить ожидаемые и фактические сигналы;
**EN.** - [ ] compare expected and actual signals;
**RU.** - [~] проверить reconnect, restart, database outage, provider outage (частично на sandbox/admin и stream MVP);
**EN.** - [~] check reconnect, restart, database outage, provider outage (partially on sandbox/admin and stream MVP);
**RU.** - [~] протестировать kill switch и дневные лимиты (env defaults safe; полный runtime enforcement — нет);
**EN.** - [~] test kill switch and daily limits (env defaults safe; full runtime enforcement - no);
**RU.** - [ ] построить отчёт об ошибках и расхождениях исполнения;
**EN.** - [ ] build a report on errors and execution discrepancies;
**RU.** - [ ] worker outbox drain для sandbox writes.
**EN.** - [ ] worker outbox drain for sandbox writes.

**RU.** **Критерии приёмки:** система устойчиво переживает сетевые сбои; заявки не дублируются; все изменения состояния аудируются; paper-результаты не зависят от повторного чтения одного event.
**EN.** **Acceptance criteria:** the system can withstand network failures; applications are not duplicated; all status changes are audited; paper results do not depend on repeated reading of one event.

### Stage 8. Limited LIVE / Этап 8. Ограниченный LIVE

**RU.** **Статус:** TODO
**EN.** **Status:** TODO

**RU.** **Цель:** реальное исполнение одной проверенной стратегии в ограниченных условиях.
**EN.** **Goal:** Real execution of one proven strategy under limited conditions.

**RU.** Предусловия:
**EN.** Preconditions:

**RU.** - [ ] стратегия заморожена и версионирована;
**EN.** - [ ] strategy frozen and versioned;
**RU.** - [ ] есть out-of-sample результаты и paper trading track record;
**EN.** - [ ] there are out-of-sample results and paper trading track record;
**RU.** - [ ] определены max daily loss / per-trade risk / allowed instruments;
**EN.** - [ ] defined max daily loss / per-trade risk / allowed instruments;
**RU.** - [ ] проверены спецификации и маржинальные показатели;
**EN.** - [ ] specifications and margins were checked;
**RU.** - [ ] есть аварийное отключение и уведомления;
**EN.** - [ ] there is an emergency shutdown and notifications;
**RU.** - [ ] настроены backup, мониторинг, health checks и reconciliation;
**EN.** - [ ] configured backup, monitoring, health checks and reconciliation;
**RU.** - [ ] live-токен существует только в Execution Worker.
**EN.** - [ ] live token exists only in Execution Worker.

**RU.** Начать с минимально допустимого объёма и ограниченного whitelist. В первые недели не включать автоматическое увеличение позиции, усреднение и сложные мультиинструментальные сценарии. После каждого отклонения от ожидаемого исполнения проводить review.
**EN.** Start with the minimum allowable volume and limited whitelist. In the first weeks, do not enable automatic position increases, averaging, and complex multi-instrument scenarios. After each deviation from the expected performance, conduct a review.

### Stage 9. Expansion / Этап 9. Расширение

**RU.** **Статус:** TODO
**EN.** **Status:** TODO

**RU.** После стабилизации core:
**EN.** After core stabilization:

**RU.** - [ ] фьючерсные roll-стратегии и анализ open interest;
**EN.** - [ ] futures roll strategies and open interest analysis;
**RU.** - [ ] расширенные order-flow features;
**EN.** - [ ] extended order-flow features;
**RU.** - [ ] portfolio-level risk и корреляции;
**EN.** - [ ] portfolio-level risk and correlations;
**RU.** - [ ] дополнительные broker adapters;
**EN.** - [ ] additional broker adapters;
**RU.** - [ ] ML-модели для классификации режимов рынка/поиска аномалий;
**EN.** - [ ] ML models for classifying market modes/searching for anomalies;
**RU.** - [ ] Telegram/email уведомления;
**EN.** - [ ] Telegram/email notifications;
**RU.** - [ ] multi-account и multi-strategy orchestration.
**EN.** - [ ] multi-account and multi-strategy orchestration.

**RU.** ML добавлять после того, как собраны качественные данные, определены baseline-метрики и есть воспроизводимый benchmark. Нейросеть не должна обходить risk engine.
**EN.** ML is added after high-quality data has been collected, baseline metrics have been determined, and there is a reproducible benchmark. The neural network should not bypass the risk engine.

---

## 16. Recommended tests / Рекомендуемые тесты

### Unit tests

**RU.** - Decimal арифметика и округление к min price increment;
**EN.** - Decimal arithmetic and rounding to min price increment;
**RU.** - расчёт лотов и стоимости пункта;
**EN.** - calculation of lots and item cost;
**RU.** - фьючерсная конвертация point/currency;
**EN.** - futures conversion point/currency;
**RU.** - индикаторы на эталонных сериях;
**EN.** - indicators on standard series;
**RU.** - стратегия на известном искусственном графике;
**EN.** - strategy on a known artificial chart;
**RU.** - переходы order state machine;
**EN.** - order state machine transitions;
**RU.** - risk limits и kill switch.
**EN.** - risk limits and kill switch.

### Integration tests

**RU.** - запросы к T‑Invest sandbox;
**EN.** - requests to T‑Invest sandbox;
**RU.** - корректный выбор production/sandbox URL;
**EN.** - correct choice of production/sandbox URL;
**RU.** - обработка 401/403/429/5xx;
**EN.** - processing 401/403/429/5xx;
**RU.** - stream reconnect и восстановление подписки;
**EN.** - stream reconnect and subscription restoration;
**RU.** - загрузка MOEX ISS с пагинацией;
**EN.** - download MOEX ISS with pagination;
**RU.** - сохранение и повторный импорт свечей;
**EN.** - saving and re-importing candles;
**RU.** - сверка позиций и заявок с брокером.
**EN.** - reconciliation of positions and orders with the broker.

### E2E / failure tests

**RU.** - создание предложения из сигнала → preview → подтверждение → заявка → исполнение;
**EN.** - creating a proposal from a signal → preview → confirmation → application → execution;
**RU.** - timeout после отправки заявки и последующая reconciliation;
**EN.** - timeout after sending the application and subsequent reconciliation;
**RU.** - частичное исполнение → отмена остатка;
**EN.** - partial execution → cancellation of the balance;
**RU.** - закрытие торгов/приостановка инструмента;
**EN.** - closing of trading/suspension of the instrument;
**RU.** - stale quote → блокировка торговли;
**EN.** - stale quote → trade blocking;
**RU.** - превышение дневного убытка → kill switch;
**EN.** - excess daily loss → kill switch;
**RU.** - перезапуск Execution Worker с активными заявками;
**EN.** - restarting Execution Worker with active orders;
**RU.** - потеря БД/Redis/интернет-соединения.
**EN.** - loss of database/Redis/Internet connection.

---

## 17. Operations and monitoring / Эксплуатация и мониторинг

**RU.** Минимальные метрики:
**EN.** Minimum metrics:

**RU.** - API request count, latency, error rate и rate-limit events;
**EN.** - API request count, latency, error rate and rate-limit events;
- stream connected/disconnected, reconnect count, last event age;
**RU.** - количество подписок, candles/trades/books per second;
**EN.** - number of subscriptions, candles/trades/books per second;
- import lag, jobs failed, data gaps, candle duplicates;
- signal count, rejected/expired signals;
- order submit latency, time-to-ack, partial fills, rejects, unknown order states;
- realized/unrealized PnL, daily loss, exposure, margin;
- worker health, DB connections, queue depth.

**RU.** Логи структурированные JSON с `correlationId`, `instrumentId`, `strategyId`, `signalId`, `clientOrderId`, `brokerOrderId`. Не записывать токены, секреты и полные приватные заголовки.
**EN.** Structured JSON logs with `correlationId`, `instrumentId`, `strategyId`, `signalId`, `clientOrderId`, `brokerOrderId`. Do not record tokens, secrets, or full private headers.

**RU.** Критические оповещения: недоступен broker API, stream потерян, превышен дневной риск, неизвестное состояние реальной заявки, расхождение локального и брокерского портфеля, массовые ошибки данных.
**EN.** Critical alerts: broker API unavailable, stream lost, daily risk exceeded, unknown status of real order, discrepancy between local and broker portfolio, massive data errors.

**RU.** Для live-режима предусмотреть ежедневную reconciliation:
**EN.** For live mode, provide daily reconciliation:

**RU.** 1. запросить активные заявки;
**EN.** 1. request active orders;
**RU.** 2. сверить статусы локальных заявок;
**EN.** 2. check the status of local requests;
**RU.** 3. загрузить сделки и операции;
**EN.** 3. download transactions and operations;
**RU.** 4. сверить позиции и остатки;
**EN.** 4. reconcile positions and balances;
**RU.** 5. обнаружить неизвестные/потерянные события;
**EN.** 5. detect unknown/lost events;
**RU.** 6. зафиксировать расхождения и запретить новые входы до разрешения критических несоответствий.
**EN.** 6. record discrepancies and prohibit new entries until critical discrepancies are resolved.

---

## 18. MVP: what to build in v1 / MVP: что сделать в первой версии

**RU.** Не нужно сразу строить универсальную платформу. Оптимальный MVP:
**EN.** There is no need to immediately build a universal platform. Optimal MVP:

**RU.** 1. Каталог MOEX-инструментов: акции + несколько выбранных фьючерсов.
**EN.** 1. Catalog of MOEX instruments: stocks + several selected futures.
**RU.** 2. T‑Invest API adapter и MOEX ISS adapter.
**EN.** 2. T‑Invest API adapter and MOEX ISS adapter.
**RU.** 3. Загрузка исторических дневных и минутных свечей.
**EN.** 3. Loading historical daily and minute candles.
**RU.** 4. PostgreSQL-хранилище и контроль качества данных.
**EN.** 4. PostgreSQL storage and data quality control.
**RU.** 5. Текущая цена, статус торгов и stream-подписка.
**EN.** 5. Current price, trading status and stream subscription.
**RU.** 6. График инструмента и базовые индикаторы.
**EN.** 6. Instrument chart and basic indicators.
**RU.** 7. 2 простые стратегии и объяснимые сигналы.
**EN.** 7. 2 simple strategies and explainable signals.
**RU.** 8. Backtest с комиссиями и проскальзыванием.
**EN.** 8. Backtest with commissions and slippage.
**RU.** 9. Ручная заявка с preview и подтверждением в sandbox.
**EN.** 9. Manual application with preview and confirmation in sandbox.
**RU.** 10. Журнал заявок, сделок и результатов.
**EN.** 10. Journal of orders, transactions and results.

**RU.** **Автоторговлю в MVP не включать.** Сначала доказать качество исторических данных и корректность ручного order lifecycle. Далее добавить PAPER и sandbox. Live automation — отдельный этап с самостоятельной приёмкой.
**EN.** **Do not include auto trading in the MVP.** First, prove the quality of historical data and the correctness of the manual order lifecycle. Next add PAPER and sandbox. Live automation is a separate stage with independent acceptance.

### MVP acceptance exercise / Проверочное задание для MVP

**RU.** Сделать сквозной сценарий:
**EN.** Make an end-to-end script:

**RU.** - выбрать один ликвидный инструмент MOEX и один фьючерс;
**EN.** - select one liquid MOEX instrument and one futures;
**RU.** - загрузить минимум 12 месяцев дневных свечей и доступную минутную историю;
**EN.** - download at least 12 months of daily candles and available minute history;
**RU.** - построить график, EMA(20), EMA(50), RSI(14), ATR(14);
**EN.** - build a chart, EMA(20), EMA(50), RSI(14), ATR(14);
**RU.** - сформировать сигнал на пересечении EMA с фильтром RSI/ATR;
**EN.** - generate a signal at the intersection of EMA with the RSI/ATR filter;
**RU.** - прогнать стратегию на истории с комиссиями и slippage;
**EN.** - run the strategy on history with commissions and slippage;
**RU.** - при появлении нового сигнала в realtime создать trade proposal;
**EN.** - when a new signal appears in real time, create a trade proposal;
**RU.** - в UI показать объяснение, рассчитанный объём и риск;
**EN.** - show explanation, calculated volume and risk in the UI;
**RU.** - вручную подтвердить тестовую заявку в sandbox;
**EN.** - manually confirm the test application in the sandbox;
**RU.** - отследить статус и сохранить результат в журнале.
**EN.** - track the status and save the result in a log.

**RU.** Результат такого задания проверяет большинство архитектурных узлов и может стать демонстрационным сценарием проекта.
**EN.** The result of such a task tests most architectural nodes and can become a demo script for the project.

---

## 19. Key technical decisions and anti-patterns / Ключевые технические решения и анти-паттерны

| Делать | Не делать |
|---|---|
| Хранить внутренний instrument UUID и mapping каждого провайдера | Использовать один ticker как уникальный ключ |
| Использовать `Decimal` для цены, денег, комиссий | Делать финансовые расчёты в JS `number` |
| Отделять Signal от TradeProposal и Order | Отправлять заявку непосредственно из стратегии |
| Отдельный Execution Worker с full-access токеном | Давать full-access токен браузеру |
| Ретраить чтение с backoff; для записи делать reconciliation | Повторять `PostOrder` автоматически после любого timeout |
| Учитывать step price, lot size и фьючерсную спецификацию | Считать, что все инструменты торгуются одинаково |
| Хранить источник данных и timestamp | Склеивать разные feed без маркировки происхождения |
| Учитывать задержку и stale data | Торговать по цене, не зная её возраста |
| Проверять стратегию out-of-sample и paper | Считать прибыльный in-sample backtest достаточным основанием для live |
| Проверять sandbox вместе с отдельным PAPER режимом | Приравнивать sandbox fills к реальным условиям рынка |
| Иметь kill switch на сервере | Считать скрытую UI-кнопку защитой от торговли |


**EN.**
| Do | Don't |
|---|---|
| Keep internal instrument UUID and per-provider mapping | Use one ticker as the global unique key |
| Use `Decimal` for prices, money, fees | Do financial math in JS `number` |
| Separate Signal from TradeProposal and Order | Submit orders directly from a strategy |
| Dedicated Execution Worker with full-access token | Give full-access token to the browser |
| Retry reads with backoff; reconcile writes | Auto-retry `PostOrder` after any timeout |
| Respect step price, lot size and futures specs | Assume all instruments trade the same way |
| Store data source and timestamp | Merge feeds without provenance labels |
| Account for delay and stale data | Trade on a price without knowing its age |
| Validate out-of-sample and paper | Treat profitable in-sample backtest as enough for live |
| Use sandbox together with separate PAPER mode | Equate sandbox fills to real market conditions |
| Enforce kill switch on the server | Treat a hidden UI button as trading protection |

---

## 20. Initial technical backlog / Первичный технический backlog

**RU.** Ниже — порядок задач, с которого можно начинать реализацию.
**EN.** Below is the order of tasks from which you can begin implementation.

### Foundation / Foundation

**RU.** - [x] Создать monorepo `apps/*` и `packages/*`.
**EN.** - [x] Create monorepo `apps/*` and `packages/*`.
**RU.** - [x] Настроить TypeScript strict, lint, format, unit tests.
**EN.** - [x] Set up TypeScript strict, lint, format, unit tests.
**RU.** - [x] Поднять PostgreSQL и миграции. _(Compose + SQL migrations via `@moex/persistence`)_
**EN.** - [x] Raise PostgreSQL and migrations. _(Compose + SQL migrations via `@moex/persistence`)_
**RU.** - [x] Описать env schema для T‑Invest production/sandbox и MOEX ISS.
**EN.** - [x] Describe env schema for T‑Invest production/sandbox and MOEX ISS.
**RU.** - [x] Добавить секреты в локальный `.env`, исключить его из Git. _(`.env.example` + gitignore; local `.env` is operator-owned)_
**EN.** - [x] Add secrets to local `.env`, exclude it from Git. _(`.env.example` + gitignore; local `.env` is operator-owned)_
**RU.** - [x] Реализовать `Decimal` helpers и unit tests. _(BL-011)_
**EN.** - [x] Implement `Decimal` helpers and unit tests. _(BL-011)_

### Providers / Providers

**RU.** - [x] Реализовать `BrokerGateway` интерфейс.
**EN.** - [x] Implement `BrokerGateway` interface.
**RU.** - [x] Подключить `@ttech-pub/invest-sdk-node`.
**EN.** - [x] Connect `@ttech-pub/invest-sdk-node`.
**RU.** - [x] Получить аккаунты и каталог акций/фьючерсов.
**EN.** - [x] Get accounts and a catalog of stocks/futures.
**RU.** - [~] Реализовать получение спецификации и торгового статуса. _(spec mapping есть; trading status stream — нет)_
**EN.** - [~] Implement obtaining specifications and trading status. _(spec mapping yes; trading status stream — no)_
**RU.** - [x] Реализовать `MoexIssClient` с timeout, pagination и retry.
**EN.** - [x] Implement `MoexIssClient` with timeout, pagination and retry.
**RU.** - [~] Сделать mapping `instrument_uid ↔ SECID/BOARD/engine/market/board`.
**EN.** - [~] Make mapping `instrument_uid ↔ SECID/BOARD/engine/market/board`.

### Data / Data

**RU.** - [~] Создать schema для instruments/specs/candles/jobs/gaps. _(instruments/specs/admin; candles jobs/gaps — нет)_
**EN.** - [~] Create schema for instruments/specs/candles/jobs/gaps. _(instruments/specs/admin; candles jobs/gaps - none)_
**RU.** - [~] Реализовать импорт `GetCandles` с оконной загрузкой. _(on-read chart path; durable import — нет)_
**EN.** - [~] Implement `GetCandles` import with window loading. _(on-read chart path; durable import - no)_
**RU.** - [ ] Реализовать импорт годовых архивов, если доступен нужный инструмент.
**EN.** - [ ] Implement import of annual archives, if the necessary tool is available.
**RU.** - [~] Реализовать MOEX ISS history/candles.
**EN.** - [~] Implement MOEX ISS history/candles.
**RU.** - [ ] Добавить идемпотентный upsert и data quality checks.
**EN.** - [ ] Add idempotent upsert and data quality checks.
**RU.** - [x] Построить API и график истории. _(`/charts`, pivots, live WS MVP)_
**EN.** - [x] Build an API and history graph. _(`/charts`, pivots, live WS MVP)_

### Analysis / Analysis

**RU.** - [~] Реализовать базовые индикаторы. _(Fibonacci Pivot Points DONE; classic set — нет)_
**EN.** - [~] Implement basic indicators. _(Fibonacci Pivot Points DONE; classic set - no)_
**RU.** - [ ] Добавить baseline strategy interface.
**EN.** - [ ] Add baseline strategy interface.
**RU.** - [ ] Добавить signal store и дедупликацию.
**EN.** - [ ] Add signal store and deduplication.
**RU.** - [ ] Сделать signal detail в UI.
**EN.** - [ ] Make signal detail in the UI.
**RU.** - [ ] Создать первый report backtest.
**EN.** - [ ] Create the first report backtest.

### Trading / Trading

**RU.** - [~] Подключить positions, orders, order state и trades streams. _(Sandbox Admin reads)_
**EN.** - [~] Connect positions, orders, order state and trades streams. _(Sandbox Admin reads)_
**RU.** - [ ] Реализовать `OrderPreview` и risk checks.
**EN.** - [ ] Implement `OrderPreview` and risk checks.
**RU.** - [~] Реализовать ручные заявки только в sandbox. _(Sandbox Admin account lifecycle; order ticket — нет)_
**EN.** - [~] Implement manual requests only in sandbox. _(Sandbox Admin account lifecycle; order ticket - no)_
**RU.** - [~] Реализовать state machine и reconciliation. _(sandbox ops UNKNOWN/timeout)_
**EN.** - [~] Implement state machine and reconciliation. _(sandbox ops UNKNOWN/timeout)_
**RU.** - [ ] Реализовать PAPER executor.
**EN.** - [ ] Implement PAPER executor.
**RU.** - [x] Добавить kill switch defaults и журнал аудита. _(env + Sandbox Admin audit)_
**EN.** - [x] Add kill switch defaults and audit log. _(env + Sandbox Admin audit)_

---

## 21. References and sources used / Ссылки и использованные источники

**RU.** Дата проверки документации — 8 ноября 2026 г. Внешние API и лимиты могут меняться; перед реализацией конкретного метода сверять его контракт с текущим справочником.
**EN.** Document review date: November 8, 2026. External APIs and limits are subject to change; Before implementing a specific method, check its contract with the current reference book.

### T-Invest API — official documentation / T-Invest API — официальная документация

**RU.** - [Начало работы и общая модель T-Invest API](https://developer.tbank-online.com/invest/intro/intro/)
**EN.** - [Getting started and the general model of the T-Invest API](https://developer.tbank-online.com/invest/intro/intro/)
**RU.** - [Документация всех сервисов API](https://developer.tbank-online.com/invest/api)
**EN.** - [Documentation of all API services](https://developer.tbank-online.com/invest/api)
**RU.** - [Исторические котировки и ограничения GetCandles](https://developer.tbank-online.com/invest/intro/intro/load_history)
**EN.** - [Historical quotes and restrictions GetCandles](https://developer.tbank-online.com/invest/intro/intro/load_history)
**RU.** - [GetCandles — контракт запроса](https://developer.tbank-online.com/invest/api/market-data-service-get-candles)
**EN.** - [GetCandles - request contract](https://developer.tbank-online.com/invest/api/market-data-service-get-candles)
**RU.** - [Архив исторических рыночных данных](https://developer.tbank-online.com/invest/services/quotes/get_history)
**EN.** - [Archive of historical market data](https://developer.tbank-online.com/invest/services/quotes/get_history)
**RU.** - [Идентификация торговых инструментов](https://developer.tbank-online.com/invest/intro/intro/faq_identification)
**EN.** - [Identification of trading instruments](https://developer.tbank-online.com/invest/intro/intro/faq_identification)
**RU.** - [Лимиты API и stream-подписок](https://developer.tbank-online.com/invest/intro/intro/limits)
**EN.** - [API and stream subscription limits](https://developer.tbank-online.com/invest/intro/intro/limits)
**RU.** - [Доступные протоколы: gRPC, gRPC-Web, REST, WebSocket](https://developer.tbank-online.com/invest/intro/developer/protocols/)
**EN.** - [Available protocols: gRPC, gRPC-Web, REST, WebSocket](https://developer.tbank-online.com/invest/intro/developer/protocols/)
**RU.** - [Токены и их права](https://developer.tbank-online.com/invest/intro/intro/token)
**EN.** - [Tokens and their rights](https://developer.tbank-online.com/invest/intro/intro/token)
- [Sandbox T-Invest API](https://developer.tbank-online.com/invest/intro/developer/sandbox/)
**RU.** - [Алгоритм и особенности исполнения поручений](https://developer.tbank-online.com/invest/intro/intro/orders_details)
**EN.** - [Algorithm and features of order execution](https://developer.tbank-online.com/invest/intro/intro/orders_details)
**RU.** - [Примеры типовых сценариев](https://developer.tbank-online.com/invest/intro/intro/cases)
**EN.** - [Examples of typical scenarios](https://developer.tbank-online.com/invest/intro/intro/cases)
- [MarketDataService](https://developer.tbank-online.com/invest/api/market-data-service)
- [OrdersService](https://developer.tbank-online.com/invest/api/orders-service)
- [MarketDataServerSideStream](https://developer.tbank-online.com/invest/api/market-data-stream-service-market-data-server-side-stream)
- [OrderStateStream](https://developer.tbank-online.com/invest/api/orders-stream-service-order-state-stream)
**RU.** - [PostOrder — создание поручения](https://developer.tbank-online.com/invest/api/orders-service-post-order)
**EN.** - [PostOrder - creating an order](https://developer.tbank-online.com/invest/api/orders-service-post-order)
**RU.** - [GetOrderState — проверка статуса поручения](https://developer.tbank-online.com/invest/api/orders-service-get-order-state)
**EN.** - [GetOrderState - checking order status](https://developer.tbank-online.com/invest/api/orders-service-get-order-state)
**RU.** - [JS SDK в документации T‑Банка](https://developer.tbank-online.com/invest/sdk/faq_js)
**EN.** - [JS SDK in T‑Bank documentation](https://developer.tbank-online.com/invest/sdk/faq_js)

### SDK `invest-js` / SDK `invest-js`

**RU.** - [Репозиторий T‑Банка invest-js](https://opensource.tbank.ru/invest/invest-js)
**EN.** - [T‑Bank invest-js repository](https://opensource.tbank.ru/invest/invest-js)
**RU.** - [Пакет `@ttech-pub/invest-sdk-web` и его README/API usage](https://www.npmjs.com/package/@ttech-pub/invest-sdk-web)
**EN.** - [Package `@ttech-pub/invest-sdk-web` and its README/API usage](https://www.npmjs.com/package/@ttech-pub/invest-sdk-web)
**RU.** - [Профиль npm с пакетами `@ttech-pub/*`](https://www.npmjs.com/~ttech-pub?activeTab=packages)
**EN.** - [npm profile with packages `@ttech-pub/*`](https://www.npmjs.com/~ttech-pub?activeTab=packages)
**RU.** - [Официальная публикация T‑Банка о новой JS/TS SDK-линейке](https://www.tbank.ru/invest/social/profile/T_InvestAPI/e1c40aaa-72d3-4c75-9e2a-f55491f89a37/)
**EN.** - [Official publication of T‑Bank about the new JS/TS SDK line](https://www.tbank.ru/invest/social/profile/T_InvestAPI/e1c40aaa-72d3-4c75-9e2a-f55491f89a37/)
**RU.** - [Старый пакет `@tinkoff/invest-js` — не путать с новым SDK](https://www.npmjs.com/package/@tinkoff/invest-js)
**EN.** - [Old package `@tinkoff/invest-js` - not to be confused with the new SDK](https://www.npmjs.com/package/@tinkoff/invest-js)

### MOEX / MOEX

**RU.** - [MOEX ISS — официальное описание API](https://www.moex.com/a8531)
**EN.** - [MOEX ISS - official API description](https://www.moex.com/a8531)
- [MOEX Programming interface to the ISS](https://www.moex.com/a2920)
**RU.** - [MOEX Interfaces — ISS, FAST и другие интерфейсы](https://www.moex.com/a7939)
**EN.** - [MOEX Interfaces - ISS, FAST and other interfaces](https://www.moex.com/a7939)
**RU.** - [MOEX Trading API / интерфейсы transactional connectivity](https://www.moex.com/a8589)
**EN.** - [MOEX Trading API / transactional connectivity interfaces](https://www.moex.com/a8589)
- [MOEX ISS interactive API reference](https://iss.moex.com/iss/reference/)

---

## 22. Final recommendation / Итоговая рекомендация

**RU.** Для первой рабочей версии оптимальна следующая связка:
**EN.** For the first working version, the following combination is optimal:

**RU.** - **TypeScript / Node.js backend** — бизнес-логика и все брокерские операции.
**EN.** - **TypeScript / Node.js backend** - business logic and all brokerage operations.
**RU.** - **`@ttech-pub/invest-sdk-node` + `@ttech-pub/invest-core`** — основной клиент T‑Invest API и точные расчёты.
**EN.** - **`@ttech-pub/invest-sdk-node` + `@ttech-pub/invest-core`** - the main client of the T‑Invest API and accurate calculations.
**RU.** - **MOEX ISS adapter** — дополнительная история, биржевая структура и независимая сверка данных.
**EN.** - **MOEX ISS adapter** - additional history, exchange structure and independent data reconciliation.
**RU.** - **PostgreSQL/TimescaleDB** — каталог, свечи, сигналы, заявки, сделки, позиции и backtest results.
**EN.** - **PostgreSQL/TimescaleDB** — catalog, candles, signals, orders, deals, positions and backtest results.
**RU.** - **React UI** — market watch, графики, аналитика, сигналы, ручная торговля и мониторинг.
**EN.** - **React UI** - market watch, charts, analytics, signals, manual trading and monitoring.
**RU.** - **Отдельные Strategy и Execution Workers** — стратегия только создаёт предложение, execution отдельно валидирует риск и отправляет поручение.
**EN.** - **Separate Strategy and Execution Workers** - the strategy only creates an offer, execution separately validates the risk and sends the order.

**RU.** Рекомендуемый порядок: **история и каталог → realtime → аналитика и сигналы → backtesting → ручная торговля → paper/sandbox → ограниченный live**. Не начинать с автоматической торговли. Качественные данные, правильные спецификации инструментов и воспроизводимый order lifecycle важнее количества индикаторов и сложности стратегии.
**EN.** Recommended order: **history and catalog → realtime → analytics and signals → backtesting → manual trading → paper/sandbox → limited live**. Don't start with automated trading. Quality data, correct tool specifications and a repeatable order lifecycle are more important than the number of indicators and the complexity of the strategy.


