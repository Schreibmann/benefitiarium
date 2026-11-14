# MOEX Trading Platform — Technical Backlog & Implementation Blueprint / Технический backlog и план реализации

**RU.** **Версия:** 1.2  
**EN.** **Version:** 1.2  

**RU.** **Дата:** 8 ноября 2026 г.  
**EN.** **Date:** 8 November 2026  

**RU.** **Изменения v1.2:** добавлен Sandbox Account Management Service и защищённый Admin UI; описаны account lifecycle, обнаружение пропавших счетов, безопасное пополнение/закрытие, Admin API, авторизация, аудит, операции, UI-маршруты и E2E-критерии. Изменения v1.1 по истории товарных и индексных фьючерсов сохранены.  
**EN.** **v1.2 changes:** added Sandbox Account Management Service and protected Admin UI; account lifecycle, missing-account detection, safe fund/close, Admin API, authorization, audit, operations, UI routes, and E2E criteria. v1.1 commodity/index futures history changes retained.  

**RU.** **Базовый документ:** `moex_trading_platform_roadmap.md`  
**EN.** **Base document:** `moex_trading_platform_roadmap.md`  

**RU.** **Назначение:** исполняемый backlog для разработки Cursor/AI-агентом и контроля результата человеком.  
**EN.** **Purpose:** executable backlog for Cursor/AI agent delivery with human verification.  

**RU.** **Рекомендуемый стек:** TypeScript, Node.js, React + Vite, Fastify, pnpm workspaces, Turborepo, PostgreSQL, Drizzle ORM, Vitest, Playwright.  
**EN.** **Recommended stack:** TypeScript, Node.js, React + Vite, Fastify, pnpm workspaces, Turborepo, PostgreSQL, Drizzle ORM, Vitest, Playwright.

**RU.** **История версий:**  
**EN.** **Version history:**

- `v1.0` — базовый implementation blueprint / base implementation blueprint.
- `v1.1` — уточнена загрузка истории товарных и индексных фьючерсов, MOEX AlgoPack и coverage spike / commodity & index futures history, MOEX AlgoPack, coverage spike.
- `v1.2` — добавлен Sandbox account lifecycle, Admin API и защищённый Sandbox Admin UI / Sandbox account lifecycle, Admin API, protected Sandbox Admin UI.

> **RU.** Документ описывает технический план, а не инвестиционную рекомендацию. Автоматическая торговля несёт риск потери капитала. Наличие успешных тестов, backtest или Sandbox не доказывает прибыльность стратегии и не гарантирует исполнение по ожидаемой цене.
>
> **EN.** This document is a technical plan, not investment advice. Automated trading risks capital loss. Passing tests, backtests, or Sandbox use does not prove strategy profitability or expected execution prices.

---

## 0. How to use this document / Как использовать этот документ

**RU.**

Документ предназначен для последовательной реализации небольшими задачами. Не поручать AI-агенту реализовать весь проект одним запросом. Одна задача backlog = один изолированный change set с тестами, миграциями (если нужны), документацией и понятным результатом.

**EN.** Implement sequentially in small tasks. Do not ask an AI agent to build the entire project in one request. One backlog item = one isolated change set with tests, migrations (if needed), documentation, and a clear outcome.

### Agent workflow for Cursor / Рабочий цикл для Cursor/AI-агента

**RU.**

1. Прочитать этот документ полностью, затем открыть только релевантные разделы и исходные API-контракты.
2. Проверить текущее состояние репозитория: `git status`, структуру каталогов, зависимости, существующие ADR и миграции. Не перезаписывать работающий код ради совпадения со структурой из документа.
3. Выбрать одну задачу по ID, проверить её зависимости и критерии приёмки.
4. До реализации перечислить план изменения файлов, риски и тесты. Если API/SDK контракт не подтверждён документацией или типами установленного пакета — сначала сделать spike/POC, не придумывать сигнатуры.
5. Реализовать только выбранную задачу. Не расширять scope без необходимости.
6. Запустить typecheck, lint, unit/integration tests, проверить миграции и обновить документацию.
7. В ответе сообщить: что сделано, какие файлы изменены, какие проверки запущены и прошли, какие ограничения остались.
8. Не отмечать задачу выполненной, если критерии приёмки не проверены.

**EN.**

1. Read this document in its entirety, then open only the relevant sections and source API contracts.
2. Check the current state of the repository: `git status`, directory structure, dependencies, existing ADRs and migrations. Do not rewrite working code to match the structure from the document.
3. Select one task by ID, check its dependencies and acceptance criteria.
4. Before implementation, list the file change plan, risks and tests. If the API/SDK contract is not confirmed by the documentation or the types of the installed package, first make a spike/POC, do not come up with signatures.
5. Implement only the selected task. Don't expand scope unnecessarily.
6. Run typecheck, lint, unit/integration tests, check migrations and update documentation.
7. In your response, indicate: what has been done, what files have been changed, what checks have been run and passed, what restrictions remain.
8. Do not mark a task as completed if the acceptance criteria have not been verified.

### Task request template / Шаблон запроса для каждой задачи

```text
Работай по задаче <ID> из docs/TECHNICAL_BACKLOG.md.

Сначала изучи текущую реализацию и зависимости задачи. Не переписывай соседние модули.
Соблюдай архитектурные границы и правила безопасности документа.
Перед изменениями кратко перечисли план и файлы.
Реализуй задачу полностью, добавь/обнови тесты и документацию.
Запусти релевантные проверки. Не имитируй внешние API: используй sandbox, contract fixtures
или явно помеченные test doubles. Не используй реальные торговые токены.
В конце укажи выполненные критерии приёмки, команды проверок и незакрытые вопросы.
Если внешний контракт не подтверждён, остановись на минимальном spike и зафиксируй факт.
```

### Task statuses / Статусы задач

**RU.**

- `TODO` — не начиналась.
- `IN_PROGRESS` — выполняется.
- `BLOCKED` — заблокирована внешним доступом/решением.
- `IN_REVIEW` — код готов, ожидает review.
- `DONE` — все acceptance criteria подтверждены тестами или демонстрацией.

**EN.**

- `TODO` - did not start.
- `IN_PROGRESS` - running.
- `BLOCKED` - blocked by external access/solution.
- `IN_REVIEW` - the code is ready, awaiting review.
- `DONE` - all acceptance criteria are confirmed by tests or demonstration.

**RU.** Рекомендуется вести статусы в GitHub/GitLab Issues или в `docs/STATUS.md`. Не менять статусы только по сообщению агента без проверки CI.

**EN.** It is recommended to maintain statuses in GitHub/GitLab Issues or in `docs/STATUS.md`. Do not change statuses only by agent message without CI check.

---

## 1. Продуктовая цель и границы MVP

### 1.1. What we are building / Что строим

**RU.** Персональную исследовательско-торговую платформу для инструментов MOEX с четырьмя независимыми контурами:

**EN.** Personal research and trading platform for MOEX instruments with four independent circuits:

**RU.**

1. **Market Data:** каталог инструментов, исторические свечи, realtime-потоки, контроль качества и происхождения данных.
2. **Research:** графики, индикаторы, features, исследование и версионирование стратегий.
3. **Signals & Backtesting:** воспроизводимые сигналы, event-driven simulation, комиссии и проскальзывание.
4. **Trading:** ручные поручения через брокерский API, затем PAPER/Sandbox и только после прохождения gate — ограниченный LIVE.

**EN.**

1. **Market Data:** catalog of instruments, historical candles, realtime streams, quality control and data origin.
2. **Research:** charts, indicators, features, research and versioning of strategies.
3. **Signals & Backtesting:** reproducible signals, event-driven simulation, commissions and slippage.
4. **Trading:** manual orders through the broker API, then PAPER/Sandbox and only after passing the gate - limited LIVE.

### 1.2. Data sources and adapter responsibilities / Источники и ответственность адаптеров

| Source / Источник | Responsibility / Ответственность | Do not use for / Не использовать для |
|---|---|---|
| T-Invest API | The premier brokerage source for historical candlesticks for stocks and futures; catalog `Futures`/`FutureBy`, specifications, flows, accounts, positions, orders, transactions, Sandbox / Основной брокерский источник исторических свечей для акций и фьючерсов; каталог `Futures`/`FutureBy`, спецификации, потоки, счета, позиции, заявки, сделки, Sandbox | Assume that there is a history for each contract and for the entire period of its exchange circulation / Предполагать, что история есть для каждого контракта и за весь срок его биржевого обращения |
| MOEX ISS / AlgoPack | Exchange structure and independent source; AlgoPack documents OHLCV endpoint for FORTS futures / Биржевая структура и независимый источник; в AlgoPack документирован OHLCV endpoint для FORTS futures | Consider free issuance as a full history or use it as a brokerage execution channel / Считать бесплатную выдачу полной историей или использовать как брокерский канал исполнения |
| Internal storage / Внутреннее хранилище | Canonical normalized model, provenance, dataset snapshots, audit / Каноническая нормализованная модель, provenance, dataset snapshots, аудит | Mixing data from different sources and different quality without an explicit rule / Смешивания данных с разными источниками и разным quality без явного правила |
| Paper broker | Simulation of applications for realtime feed / Симуляция заявок на realtime feed | Substitution of actual execution or liquidity assessment / Подмены фактического исполнения или оценки ликвидности |

**RU.**

**Уточнение по фьючерсам:** реальные торгуемые контракты (включая товарные и контракты на индексы) должны загружаться через T-Invest `Futures`/`FutureBy` и `GetCandles` по `instrument_uid`. Не путать их с `Indicatives`: этот метод возвращает базовые индикативные инструменты, например сам индекс IMOEX или нефть, которые не являются фьючерсными контрактами. Для таких индикативов T-Invest также разрешает строить свечи через `GetCandles`, но их нельзя подменять контрактной историей.

**EN.**

**Futures clarification:** Actual traded contracts (including commodity and index contracts) must be downloaded via T-Invest `Futures`/`FutureBy` and `GetCandles` by `instrument_uid`. Not to be confused with `Indicatives`: this method returns underlying indicative instruments, such as the IMOEX index itself or oil, which are not futures contracts. For such indicators, T-Invest also allows you to build candles through `GetCandles`, but they cannot be replaced with contract history.

**RU.**

T-Invest документирует `first_1min_candle_date` и `first_1day_candle_date` для определения начала доступной истории. Отдельный архив минутных свечей доступен по году, но история собрана не для всех инструментов и не обязательно с начала торгов; наличие архива нужно проверять по каждому `instrument_uid`/контракту. В документации History MD приведён пример фьючерсного инструмента `CRZ5_SPBFUT` в скрипте загрузки архивов. Для минутных архивов History MD указан лимит до 30 файлов в минуту с одного IP.

**EN.**

T-Invest documents `first_1min_candle_date` and `first_1day_candle_date` to determine the start of available history. A separate archive of minute candles is available by year, but the history is not collected for all instruments and not necessarily from the beginning of trading; The presence of the archive must be checked for each `instrument_uid`/contract. The History MD documentation provides an example of a futures instrument `CRZ5_SPBFUT` in an archive loading script. For History MD minute archives, the limit is up to 30 files per minute from one IP.

**RU.**

**Ограничения доступа:** MOEX AlgoPack документирует futures candles endpoint `/iss/engines/futures/markets/forts/boards/rfud/securities/:ticker/candles.json`: без авторизации ответ идёт через ISS с задержкой 15 минут, при авторизованном доступе через apim — real-time. Доступность диапазона истории, тариф/права и лимиты для нужных периодов необходимо подтвердить spike-тестом. Исторические данные MOEX `/iss/history` в документации ISS отмечены как subscriber-only (за исключением индексов). Поэтому MOEX не считать обязательной заменой T-Invest для backfill.

**EN.**

**Access restrictions:** MOEX AlgoPack documents futures candles endpoint `/iss/engines/futures/markets/forts/boards/rfud/securities/:ticker/candles.json`: without authorization, the response goes through ISS with a delay of 15 minutes, with authorized access via apim - real-time. The availability of the history range, tariff/rights and limits for the required periods must be confirmed with a spike test. MOEX historical data `/iss/history` is marked as subscriber-only in the ISS documentation (except for indexes). Therefore, MOEX should not be considered a mandatory replacement for T-Invest for backfill.

**RU.**

**Sandbox account lifecycle:** для управления счетами использовать методы `SandboxService`: `OpenSandboxAccount`, `GetSandboxAccounts`, `SandboxPayIn`, `CloseSandboxAccount`, `GetSandboxPortfolio`, `GetSandboxPositions`, `GetSandboxOperations`. Не использовать production `GetAccounts` как замену списка sandbox-счетов. Официальная документация указывает, что sandbox-счета могут быть удалены в любое время и хранятся три месяца с даты последнего использования; пропавший счёт создаётся заново, а не восстанавливается под прежним ID. Пополнение — только положительная сумма в RUB, ограничение 30 000 000 RUB; уменьшить баланс/вывести средства через Sandbox API нельзя. В Sandbox упрощены расчёты margin/liquidity, а исполнение заявок зависит от последних биржевых сделок — результаты не эквивалентны реальному исполнению.

**EN.**

**Sandbox account lifecycle:** to manage accounts, use the `SandboxService` methods: `OpenSandboxAccount`, `GetSandboxAccounts`, `SandboxPayIn`, `CloseSandboxAccount`, `GetSandboxPortfolio`, `GetSandboxPositions`, `GetSandboxOperations`. Do not use production `GetAccounts` as a replacement for a list of sandbox accounts. Official documentation indicates that sandbox accounts can be deleted at any time and are stored for three months from the date of last use; the missing account is created anew, rather than restored under the previous ID. Replenishment - only a positive amount in RUB, limit 30,000,000 RUB; You cannot reduce your balance/withdraw funds via the Sandbox API. Sandbox simplifies margin/liquidity calculations, and the execution of orders depends on the latest exchange transactions - the results are not equivalent to real execution.

**RU.**

Лимиты T-Invest `GetCandles` зависят от интервала: например, 1m — запрос максимум примерно за день (limit до 2400), 5m — до недели, 1h — до трёх месяцев, 1d — до шести лет. Историю загружать порциями и не трактовать лимит одного запроса как ограничение общей глубины. Точный контракт T-Invest SDK сверять с установленной версией пакетов и текущей документацией, не копировать предположительные imports из старых примеров.

**EN.**

T-Invest `GetCandles` limits depend on the interval: for example, 1m - a request for a maximum of about a day (limit up to 2400), 5m - up to a week, 1h - up to three months, 1d - up to six years. Load the history in portions and do not interpret the limit of one request as a limitation of the overall depth. Check the exact T-Invest SDK contract with the installed version of the packages and current documentation, do not copy supposed imports from old examples.

### 1.3. In MVP scope / В MVP входит

**RU.**

- одна среда backend + одна web-панель;
- каталог акций и фьючерсов;
- нормализованные спецификации и provider ID mapping;
- импорт дневных и доступных минутных свечей, включая commodity futures и index futures (по отдельным контрактам);
- идемпотентный backfill с checkpoint и журналом data gaps;
- realtime last price и bar stream минимум для выбранных инструментов;
- график, EMA/RSI/ATR и две простые стратегии;
- воспроизводимый backtest с издержками;
- отдельный Sandbox Account Management Service для создания, синхронизации, пополнения и закрытия тестовых счетов;
- защищённая административная UI-панель для управления Sandbox-счетами и просмотра их состояния;
- ручное размещение тестовых заявок в выбранном T-Invest Sandbox account;
- журнал заявок/сделок и восстановление состояния после рестарта.

**EN.**

- one backend environment + one web panel;
- catalog of stocks and futures;
- normalized specifications and provider ID mapping;
- import of daily and available minute candles, including commodity futures and index futures (for individual contracts);
- idempotent backfill with checkpoint and data gaps log;
- realtime last price and bar stream minimum for selected instruments;
- chart, EMA/RSI/ATR and two simple strategies;
- reproducible backtest with overhead;
- separate Sandbox Account Management Service for creating, synchronizing, replenishing and closing test accounts;
- secure administrative UI panel for managing Sandbox accounts and viewing their status;
- manual placement of test applications in the selected T-Invest Sandbox account;
- log of orders/transactions and restoration of state after restart.

### 1.4. Out of MVP scope / Не входит в MVP

**RU.**

- HFT, colocation, прямой MOEX FIX/FAST;
- размещение токена в браузере;
- live-автоторговля;
- полноценный исторический order book/tick replay, если права и источник ещё не подтверждены;
- ML/LLM, которые принимают торговые решения или самостоятельно определяют размер позиции;
- multi-user SaaS, мультиброкерский routing и сложная portfolio optimization.

**EN.**

- HFT, colocation, direct MOEX FIX/FAST;
- placing the token in the browser;
- live auto trading;
- a full historical order book/tick replay, if the rights and source have not yet been confirmed;
- ML/LLM who make trading decisions or independently determine the position size;
- multi-user SaaS, multi-broker routing and complex portfolio optimization.

### 1.5. Primary MVP user scenario / Основной пользовательский сценарий MVP

**RU.**

1. Пользователь выбирает ликвидную акцию и конкретный контракт фьючерса.
2. Система синхронизирует метаданные и спецификации; для фьючерса сохраняет UID конкретной серии, тип базового актива и экспирацию.
3. Импортирует минимум 12 месяцев дневной истории (если она доступна у источника) и максимально доступную внутридневную историю; для товарного и индексного фьючерса отдельно проверяет первую доступную свечу, наличие годовых архивов и гэпы; фактические границы фиксирует в UI и отчёте.
4. Пользователь открывает график, видит источник, время и качество данных.
5. Движок рассчитывает EMA(20), EMA(50), RSI(14), ATR(14).
6. Стратегия создаёт сигнал с объяснением, сроком действия и ссылками на входные данные.
7. Пользователь запускает backtest на фиксированной версии датасета и стратегии.
8. Через Admin → Sandbox пользователь создаёт тестовый счёт, синхронизирует его состояние и при необходимости пополняет виртуальный баланс.
9. Пользователь выбирает конкретный Sandbox account, создаёт order preview и подтверждает тестовую заявку.
10. Приложение получает статус/исполнение, сохраняет события и сверяет локальную модель с брокером.

**EN.**

1. The user selects a liquid stock and a specific futures contract.
2. The system synchronizes metadata and specifications; for futures, saves the UID of a specific series, the type of underlying asset and expiration.
3. Imports a minimum of 12 months of daily history (if available from the source) and the maximum available intraday history; for commodity and index futures, it separately checks the first available candle, the presence of annual archives and gaps; actual boundaries are recorded in the UI and report.
4. The user opens the chart, sees the source, time and quality of the data.
5. The engine calculates EMA(20), EMA(50), RSI(14), ATR(14).
6. The strategy creates a signal with an explanation, expiration date and links to input data.
7. The user runs a backtest on a fixed version of the dataset and strategy.
8. Through Admin → Sandbox, the user creates a test account, synchronizes its status and, if necessary, tops up the virtual balance.
9. The user selects a specific Sandbox account, creates an order preview and confirms the test request.
10. The application receives status/execution, stores events and checks the local model with the broker.

---

## 2. Архитектурные решения (фиксируем до реализации)

### ADR-001. Modular monolith instead of microservices / Модульный монолит вместо микросервисов

**RU.**

На старте — один monorepo и несколько независимо запускаемых Node.js процессов. Общая доменная модель и persistence-пакеты разделяются по слоям, но отдельные сервисы/деплойменты выносятся только при измеримой необходимости.

**EN.**

At the start there is one monorepo and several independently launched Node.js processes. The common domain model and persistence packages are separated into layers, but individual services/deployments are carried out only when measurably necessary.

**RU.** **Причина:** личный проект, один основной разработчик, много предметной логики и высокая цена распределённых транзакций в торговом контуре.

**EN.** **Reason:** personal project, one main developer, a lot of domain logic and the high cost of distributed transactions in the trading circuit.

### ADR-002. React SPA + Fastify API

**RU.**

- Frontend: React + TypeScript + Vite; SPA, без SSR на первой версии.
- API: Fastify + schema validation (Zod/TypeBox — выбрать один подход и применять последовательно).
- Realtime UI: WebSocket; SSE допустим для однонаправленных событий, но не смешивать транспортные решения без необходимости.
- Вся брокерская авторизация и write operations — только backend.

**EN.**

- Frontend: React + TypeScript + Vite; SPA, without SSR on the first version.
- API: Fastify + schema validation (Zod/TypeBox - choose one approach and apply consistently).
- Realtime UI: WebSocket; SSE is acceptable for unidirectional events, but do not mix transport solutions unnecessarily.
- All brokerage authorization and write operations are backend only.

### ADR-003. pnpm + Turborepo

**RU.**

- `pnpm-workspace.yaml` — workspace.
- Turborepo — orchestration задач `build`, `lint`, `typecheck`, `test`.
- Единая версия Node LTS, зафиксированная в `.nvmrc`/`.node-version` и CI.
- Версии зависимостей фиксировать lock-файлом. Не использовать плавающие диапазоны для SDK и финансовых библиотек.

**EN.**

- `pnpm-workspace.yaml` — workspace.
- Turborepo - orchestration of tasks `build`, `lint`, `typecheck`, `test`.
- Single version of Node LTS, captured in `.nvmrc`/`.node-version` and CI.
- Dependency versions are recorded with a lock file. Do not use floating ranges for SDKs and financial libraries.

### ADR-004. PostgreSQL as source of truth / PostgreSQL как источник истины

**RU.**

- PostgreSQL для доменных данных, задач импорта, signals, orders, fills, audit и backtest results.
- Drizzle ORM для типизированного доступа и SQL migrations.
- Критичные запросы/ограничения разрешено писать SQL вручную.
- TimescaleDB не является обязательной зависимостью MVP: сначала измерить объём и latency; затем принять решение об hypertables/retention/compression.
- Для фоновых задач в MVP можно использовать PostgreSQL-backed queue (например, pg-boss). Redis добавлять только при доказанной потребности в fan-out/cache/stream coordination.

**EN.**

- PostgreSQL for domain data, import tasks, signals, orders, fills, audit and backtest results.
- Drizzle ORM for typed access and SQL migrations.
- Critical queries/constraints are allowed to write SQL manually.
- TimescaleDB is not a mandatory MVP dependency: first measure volume and latency; then decide on hypertables/retention/compression.
- For background tasks in MVP, you can use PostgreSQL-backed queue (for example, pg-boss). Add Redis only if there is a proven need for fan-out/cache/stream coordination.

### ADR-005. Exact financial quantities / Точные финансовые величины

**RU.**

- Цены, деньги, комиссии, стоимость пункта, маржа и расчёты количества — decimal.
- На границе SDK значения Decimal преобразуются в внутреннее представление через строку/точное десятичное число.
- В PostgreSQL — `NUMERIC`, в API — decimal strings.
- JS `number` допустим только для графических/статистических расчётов, если точность и диапазон осознанно определены; не использовать его как источник истины для ордера или PnL.

**EN.**

- Prices, money, commissions, point value, margin and quantity calculations - decimal.
- At the SDK boundary, Decimal values ​​are converted to an internal representation via string/exact decimal number.
- In PostgreSQL - `NUMERIC`, in the API - decimal strings.
- JS `number` is only valid for graphical/statistical calculations if the precision and range are deliberately defined; do not use it as a source of truth for a warrant or PnL.

### ADR-006. A signal is not an order / Сигнал не равен поручению

**RU.** Цепочка строго разделена:

**EN.** The chain is strictly divided:

`Market Event → Feature/Indicator → Strategy → Signal → Trade Proposal → Risk Check → Order Command → Broker → Order/Fill Events`.

**RU.** Strategy Worker не имеет broker write credentials и не может вызвать `PostOrder`. Execution Worker самостоятельно валидирует предложение и режим торговли.

**EN.** Strategy Worker does not have broker write credentials and cannot call `PostOrder`. Execution Worker independently validates the offer and trading mode.

### ADR-007. External broker writes only via durable command workflow / Запись во внешний broker API — только через durable command workflow

**RU.**

До отправки persist-ить локальный order intent и уникальный `client_order_id`. Для T-Invest передавать этот UID как `order_id` согласно контракту API. Timeout после отправки переводит локальную заявку в `UNKNOWN`; автоматический повтор запрещён до reconciliation. Для всех write-команд — аудит и корреляционный ID.

**EN.**

Before sending, persist the local order intent and unique `client_order_id`. For T-Invest to pass this UID as `order_id` according to the API contract. Timeout after sending transfers the local request to `UNKNOWN`; automatic replay is prohibited until reconciliation. For all write commands - audit and correlation ID.

### ADR-008. Data source and version are part of analysis output / Источник и версия данных — часть результата анализа

**RU.**

Каждая свеча несёт provider/source metadata. Backtest привязывается к фиксированному dataset snapshot/revision, strategy version, параметрам и модели издержек. Нельзя тихо смешивать MOEX ISS и T-Invest данные в одном ряду.

**EN.**

Each candle carries provider/source metadata. Backtest is tied to a fixed dataset snapshot/revision, strategy version, parameters and cost model. You cannot quietly mix MOEX ISS and T-Invest data in the same series.

### ADR-009. Futures — separate domain model / Futures — отдельная предметная модель

**RU.**

Фьючерсный контракт идентифицируется конкретной серией с датой экспирации и исторической спецификацией. Для каждого контракта сохраняются `instrument_uid`, `ticker + class_code`, `basic_asset_position_uid`/связь с базовым активом, категория базового актива (`commodity`, `equity_index`, `currency`, `other`), дата экспирации, шаг и стоимость шага цены, единица котирования, множитель и параметры ГО. `Indicatives` — отдельные неисполняемые рыночные ряды базовых индексов/товаров; это не сами фьючерсы.

**EN.**

A futures contract is identified by a specific series with an expiration date and historical specification. For each contract, `instrument_uid`, `ticker + class_code`, `basic_asset_position_uid`/relationship with the underlying asset, category of the underlying asset (`commodity`, `equity_index`, `currency`, `other`), expiration date, price step and price step cost, quotation unit, multiplier and GO parameters are saved. `Indicatives` - individual non-executable market series of basic indices/commodities; these are not the futures themselves.

**RU.**

Continuous contract — отдельный синтетический ряд для анализа, не исполнимый инструмент. В заявках и в контрактной исторической серии всегда используется реальный контракт. Нельзя склеивать два срока экспирации в один ряд без явной roll policy и метки синтетического ряда.

**EN.**

Continuous contract is a separate synthetic series for analysis, not an executable tool. Applications and the Contract History Series always use the actual contract. You cannot glue two expiration dates into one series without an explicit roll policy and a synthetic series label.

### ADR-010. Sandbox account management and Admin UI — separate application module / Sandbox account management и Admin UI — отдельный application module

- Управление тестовыми счетами выполняется отдельным `SandboxAccountService` внутри модульного монолита; это не отдельный микросервис.
- T-Invest Sandbox adapter использует отдельную конфигурацию endpoint/credential и фиксированный allowlisted host `sandbox-invest-public-api.tbank.ru:443`. Frontend не может передавать base URL или token.
- Admin UI размещается в существующем `apps/web` под `/admin/sandbox`; все команды проходят через защищённый backend API. Скрытие пункта меню не является механизмом авторизации.
- Состояние брокерского счёта сверяется с `GetSandboxAccounts`; `MISSING` — локальное диагностическое состояние, а не статус брокера. Пропавший счёт не «восстанавливается» с тем же ID: новый счёт создаётся только по явной команде пользователя, старый локальный журнал сохраняется.
- Все create/fund/close команды имеют durable operation record, idempotency key, correlation ID и audit trail. Timeout после write-команды переводит операцию в `UNKNOWN`; повтор запрещён до reconciliation.
- Sandbox и production — разные execution environments. Ни UI, ни обычная настройка режима приложения не могут переключить Sandbox adapter на production endpoint.

---

## 3. Структура monorepo

```text
**RU.**

moex-trading-platform/
├── apps/
│   ├── api/                         # Fastify REST + WebSocket gateway; protected admin routes
│   ├── web/                         # React + Vite SPA; /admin/sandbox route group
│   ├── worker-market-data/          # исторический импорт + realtime feed
│   ├── worker-strategy/             # features, indicators, strategy runtime
│   ├── worker-execution/            # единственный процесс с broker write access; order + Sandbox account commands
│   └── worker-backtest/             # фоновые воспроизводимые backtest jobs
│
├── packages/
│   ├── domain/                      # сущности, value objects, события, enums
│   ├── contracts/                   # REST/event schemas, DTO, validation
│   ├── config/                      # env/config schemas; no secret values
│   ├── decimal/                     # Decimal wrapper, rounding, tick/lot math
│   ├── broker-tinvest/              # @ttech-pub SDK adapter; separate sandbox/prod clients
│   ├── sandbox-management/          # account lifecycle, recovery, funding, operation state machine
│   ├── marketdata-moex-iss/         # MOEX ISS HTTP client + mapping
│   ├── marketdata/                  # canonical models, import, QA, aggregation
│   ├── persistence/                 # Drizzle schema, repositories, migrations
│   ├── indicators/                  # deterministic indicator calculations
│   ├── strategy-engine/              # strategy contracts and runner
│   ├── risk-engine/                  # pre-trade policy and sizing
│   ├── execution/                   # order state machine, commands, reconciliation
│   ├── backtest/                    # event-driven simulator and cost models
│   ├── observability/               # logger, metrics, tracing conventions
│   ├── test-fixtures/                # deterministic market/broker fixtures
│   └── ui-kit/                      # shared UI primitives (only if needed)
│
├── infra/
│   ├── docker/                      # Dockerfiles and local container config
│   ├── grafana/                     # dashboards, later stage
│   └── prometheus/                  # scrape config, later stage
│
├── docs/
│   ├── TECHNICAL_BACKLOG.md         # this document
│   ├── ADR/                         # architecture decision records
│   ├── API_CONTRACTS.md             # external contract notes + tested examples
│   ├── RUNBOOK.md                   # operational procedures
│   ├── SECURITY.md                  # secrets and trading safety
│   └── STATUS.md                    # current milestone and task state
│
├── .github/workflows/               # or .gitlab-ci.yml, depending on repository
├── .env.example
├── .gitignore
├── .npmrc
├── .node-version
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md

**EN.**

moex-trading-platform/
├── apps/
│   ├── api/                         # Fastify REST + WebSocket gateway; protected admin routes
│   ├── web/                         # React + Vite SPA; /admin/sandbox route group
│   ├── worker-market-data/          # исторический импорт + realtime feed
│   ├── worker-strategy/             # features, indicators, strategy runtime
│   ├── worker-execution/            # единственный процесс с broker write access; order + Sandbox account commands
│   └── worker-backtest/             # фоновые воспроизводимые backtest jobs
│
├── packages/
│   ├── domain/                      # сущности, value objects, события, enums
│   ├── contracts/                   # REST/event schemas, DTO, validation
│   ├── config/                      # env/config schemas; no secret values
│   ├── decimal/                     # Decimal wrapper, rounding, tick/lot math
│   ├── broker-tinvest/              # @ttech-pub SDK adapter; separate sandbox/prod clients
│   ├── sandbox-management/          # account lifecycle, recovery, funding, operation state machine
│   ├── marketdata-moex-iss/         # MOEX ISS HTTP client + mapping
│   ├── marketdata/                  # canonical models, import, QA, aggregation
│   ├── persistence/                 # Drizzle schema, repositories, migrations
│   ├── indicators/                  # deterministic indicator calculations
│   ├── strategy-engine/              # strategy contracts and runner
│   ├── risk-engine/                  # pre-trade policy and sizing
│   ├── execution/                   # order state machine, commands, reconciliation
│   ├── backtest/                    # event-driven simulator and cost models
│   ├── observability/               # logger, metrics, tracing conventions
│   ├── test-fixtures/                # deterministic market/broker fixtures
│   └── ui-kit/                      # shared UI primitives (only if needed)
│
├── infra/
│   ├── docker/                      # Dockerfiles and local container config
│   ├── grafana/                     # dashboards, later stage
│   └── prometheus/                  # scrape config, later stage
│
├── docs/
│   ├── TECHNICAL_BACKLOG.md         # this document
│   ├── ADR/                         # architecture decision records
│   ├── API_CONTRACTS.md             # external contract notes + tested examples
│   ├── RUNBOOK.md                   # operational procedures
│   ├── SECURITY.md                  # secrets and trading safety
│   └── STATUS.md                    # current milestone and task state
│
├── .github/workflows/               # or .gitlab-ci.yml, depending on repository
├── .env.example
├── .gitignore
├── .npmrc
├── .node-version
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### 3.1. Dependency rules

Allowed direction:

```text
apps/* → packages/* → domain/contracts
broker-tinvest → domain + contracts + decimal
marketdata-moex-iss → domain + contracts + decimal
strategy-engine → domain + indicators
backtest → domain + indicators + strategy-engine + marketdata
execution → domain + risk-engine + broker port (interface)
sandbox-management → domain + persistence ports + sandbox broker ports (interfaces only)
worker-execution → execution + sandbox-management + broker-tinvest
risk-engine → domain + decimal
persistence → domain + contracts (must not import apps/* or broker SDK)
```

Forbidden:

- `domain` imports React, Fastify, Drizzle, T-Invest SDK or MOEX HTTP client.
- Strategy imports concrete broker SDK or submits orders.
- `sandbox-management` imports the concrete `broker-tinvest` SDK client or performs raw network calls.
- Admin API handlers call Sandbox write methods directly; they persist a command/outbox record and return an operation ID instead.
- Frontend imports broker SDK secret config or direct write client.
- Persistence imports application services.
- Provider-specific DTO leaks into public API or strategy interface.

### 3.1.1. Sandbox management placement

- `packages/broker-tinvest` — только низкоуровневая интеграция и provider DTO mapping; sandbox/prod clients создаются разными factory functions с разными credentials/endpoints.
- `packages/sandbox-management` — application use cases, account state model, idempotent command journal, sync/recovery policies; не импортирует React и не выполняет сетевые вызовы напрямую.
- `apps/worker-execution` — единственный процесс, который выполняет Sandbox create/fund/close и торговые write-команды; он потребляет durable commands/outbox и использует Sandbox-only client.
- `apps/api/src/modules/admin/sandbox` — REST handlers, validation, auth guard, rate limits и response DTO; POST-команды только enqueue, не вызывают брокера inline.
- `apps/web/src/features/admin/sandbox` — Admin UI pages/components/forms; браузер общается только с нашим API.
- Не создавать `apps/admin` или отдельный микросервис для первого релиза: это внутренняя функция модульного монолита.

### 3.2. Package conventions

Each package must expose `src/index.ts` and have scripts `build`, `typecheck`, `test`, `lint` where applicable. Public exports are explicit; avoid deep imports from another package's `src` path. Use workspace dependencies `workspace:*` and avoid circular dependencies.

### 3.3. Root scripts (target)

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel --filter=@moex/api --filter=@moex/web",
    "dev:worker-execution": "pnpm --filter @moex/worker-execution dev",
    "dev:worker-market-data": "pnpm --filter @moex/worker-market-data dev",
    "dev:worker-strategy": "pnpm --filter @moex/worker-strategy dev",
    "dev:worker-backtest": "pnpm --filter @moex/worker-backtest dev",
    "dev:workers": "turbo run dev --parallel --filter=@moex/worker-*",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "db:generate": "pnpm --filter @moex/persistence db:generate",
    "db:migrate": "pnpm --filter @moex/persistence db:migrate",
    "db:status": "pnpm --filter @moex/persistence db:status"
  }
}
```

**RU.** Команды адаптировать под реальную структуру пакетов. Не добавлять фиктивные scripts: каждая команда должна реально работать.

**EN.** Adapt commands to the actual package structure. Don't add dummy scripts: each command must actually work.

---

## 4. Доменные контракты и границы интеграции

### 4.1. Core value objects / Основные value objects

```ts
export type UUID = string & { readonly __brand: 'UUID' };
export type DecimalString = string & { readonly __brand: 'DecimalString' };
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };
export type InstrumentId = UUID;

export type AssetType = 'share' | 'bond' | 'etf' | 'future' | 'currency' | 'index';
export type CandleInterval =
| '5s' | '10s' | '30s' | '1m' | '2m' | '3m' | '5m' |
| '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w' |

export type DataProvider = 't-invest' | 'moex-iss' | 'paper' | 'manual-import';

export interface Instrument {
  id: InstrumentId;
  assetType: AssetType;
  ticker: string;
  name: string;
  exchange: 'MOEX';
  currency: string | null;
  isActive: boolean;
}

export interface InstrumentProviderId {
  instrumentId: InstrumentId;
  provider: DataProvider;
  providerInstrumentId: string;
  engine?: string | null;
  market?: string | null;
  board?: string | null;
  secid?: string | null;
  classCode?: string | null;
  isPrimary: boolean;
}

export interface InstrumentSpec {
  instrumentId: InstrumentId;
  validFrom: IsoDateTime;
  validTo: IsoDateTime | null;
  lotSize: number;
  minPriceIncrement: DecimalString;
  priceCurrency: string | null;
  priceType: 'currency' | 'points' | 'percent';
  contractMultiplier: DecimalString | null;
  expirationAt: IsoDateTime | null;
  marginInitial: DecimalString | null;
  // Futures metadata; null for non-futures.
  underlyingProviderPositionUid?: string | null;
  underlyingAssetType?: 'commodity' | 'equity_index' | 'currency' | 'share' | 'other' | null;
  underlyingAssetName?: string | null;
  contractFamily?: string | null;
  priceUnit?: string | null;
  minPriceIncrementAmount?: DecimalString | null;
  raw: Record<string, unknown>;
}

export interface Candle {
  instrumentId: InstrumentId;
  provider: DataProvider;
  interval: CandleInterval;
  timeStart: IsoDateTime;
  timeEnd: IsoDateTime;
  open: DecimalString;
  high: DecimalString;
  low: DecimalString;
  close: DecimalString;
  volume: DecimalString;
  volumeUnit: 'lots' | 'contracts' | 'shares' | 'currency' | 'unknown';
  turnover: DecimalString | null;
  isClosed: boolean;
  quality: 'good' | 'delayed' | 'incomplete' | 'suspect';
  sourceRevision: string | null;
}

export interface MarketDataContext {
  provider: DataProvider;
  receivedAt: IsoDateTime;
  eventTime: IsoDateTime;
  isDelayed: boolean;
  isStale: boolean;
  correlationId: string;
}
```

**RU.**

**Контракт:** decimal в API и persistence всегда сериализуется строкой. `timeStart` / `timeEnd` — ISO 8601 UTC. В UI timezone отображения — `Europe/Moscow`; источник времени не должен зависеть от локальной timezone сервера.

**EN.**

`timeEnd` — ISO 8601 UTC. В UI timezone отображения — `Europe/Moscow`; источник времени не должен зависеть от локальной timezone сервера.

### 4.2. Port interfaces

```ts
export interface HistoricalMarketDataProvider {
  getCandles(input: {
    instrumentId: InstrumentId;
    interval: CandleInterval;
    from: Date;
    to: Date;
    cursor?: string;
  }): Promise<{ items: Candle[]; nextCursor?: string }>;
}

export interface MarketDataProvider extends HistoricalMarketDataProvider {
  getInstrumentCatalog(): Promise<ProviderInstrument[]>;
  getInstrumentSpec(providerInstrumentId: string): Promise<InstrumentSpecInput>;
  getLastPrices(instrumentIds: InstrumentId[]): Promise<LastPrice[]>;
}

export interface BrokerGateway {
  listAccounts(): Promise<BrokerAccount[]>;
  getPositions(accountId: string): Promise<BrokerPosition[]>;
  getOrders(accountId: string): Promise<BrokerOrder[]>;
  getOrderState(accountId: string, brokerOrderId: string): Promise<BrokerOrder>;
  placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderResult>;
  cancelOrder(command: CancelOrderCommand): Promise<CancelOrderResult>;
  replaceOrder(command: ReplaceOrderCommand): Promise<ReplaceOrderResult>;
  // Streams exposed through separately typed observable/event interfaces.
}

export type SandboxProviderAccountStatus = 'new' | 'open' | 'closed' | 'unknown';
export type SandboxLocalAccountStatus =
| 'new' | 'active' | 'closed' | 'missing' |
export type SandboxOperationType = 'create' | 'sync' | 'fund' | 'close';
export type SandboxOperationStatus =
| 'queued' | 'running' | 'succeeded' | 'failed' |

export interface SandboxAccount {
  id: UUID;
  providerAccountId: string;
  environment: 'sandbox';
  displayName: string | null;
  providerStatus: SandboxProviderAccountStatus;
  localStatus: SandboxLocalAccountStatus;
  openedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
  lastVerifiedAt: IsoDateTime | null;
}

export interface SandboxAccountProvider {
  listAccounts(): Promise<SandboxAccount[]>;
  openAccount(input: { name: string }): Promise<{ providerAccountId: string }>;
  closeAccount(input: { providerAccountId: string }): Promise<void>;
  payIn(input: { providerAccountId: string; amount: DecimalString; currency: 'RUB' }): Promise<void>;
  getPortfolio(providerAccountId: string): Promise<SandboxPortfolio>;
  getPositions(providerAccountId: string): Promise<SandboxPosition[]>;
  getOrders(providerAccountId: string): Promise<SandboxOrder[]>;
  getOperations(providerAccountId: string): Promise<SandboxOperation[]>;
}

export interface SandboxAccountOperation {
  id: UUID;
  accountId: UUID | null;
  type: SandboxOperationType;
  status: SandboxOperationStatus;
  idempotencyKey: string;
  correlationId: string;
  createdAt: IsoDateTime;
  completedAt: IsoDateTime | null;
}
```

**RU.**

Это внутренние интерфейсы, не обещание точных сигнатур конкретной версии `invest-js`. Типы `SandboxPortfolio`, `SandboxPosition`, `SandboxOrder` и `SandboxOperation` уточняются по фактическим protobuf/SDK контрактам в BL-013/BL-078. Адаптер обязан преобразовать реальные response types в доменные типы и покрыть mapping tests.

**EN.**

These are internal interfaces, not a promise of exact signatures of a specific version of `invest-js`. The `SandboxPortfolio`, `SandboxPosition`, `SandboxOrder` and `SandboxOperation` types are specified by the actual protobuf/SDK contracts in BL-013/BL-078. The adapter must convert real response types into domain types and cover mapping tests.

### 4.3. Identification principles / Принципы идентификации

**RU.**

- Внутренний UUID `instrument_id` — основной ключ системы.
- T-Invest `instrument_uid` — актуальный брокерский идентификатор; FIGI держать только для совместимости, если он ещё встречается в API/старых данных.
- MOEX ISS — составной контекст `engine + market + board + SECID`.
- Тикер сам по себе не уникален и не является FK.
- Смена лота, шага цены, экспирации, множителя или валюты создаёт новую строку `instrument_specs` с временной валидностью, а не перезаписывает историю.

**EN.**

- Internal UUID `instrument_id` - the main system key.
- T-Invest `instrument_uid` — current broker identifier; Keep FIGI only for compatibility if it is still found in the API/old data.
- MOEX ISS - composite context `engine + market + board + SECID`.
- The ticker itself is not unique and is not FK.
- Changing a lot, price step, expiration, multiplier or currency creates a new `instrument_specs` string with time validity, rather than overwriting history.

---

## 5. PostgreSQL schema blueprint / PostgreSQL schema blueprint

**RU.**

Ниже — логическая схема и базовые DDL-фрагменты. Реальные миграции нужно разделить на несколько файлов, проверить под выбранную версию PostgreSQL и дополнить FK/constraints. Не создавать все таблицы одним огромным миграционным файлом.

**EN.**

Below is a logical diagram and basic DDL fragments. Real migrations need to be divided into several files, checked for the selected version of PostgreSQL and supplemented with FK/constraints. Don't create all tables in one huge migration file.

### 5.1. Required tables / Обязательные таблицы

| Table / Таблица | Purpose / Назначение | Key constraints / Ключевые ограничения |
|---|---|---|
| `instruments` | Internal directory / Внутренний каталог | UUID PK; ticker is not unique globally / UUID PK; ticker не unique глобально |
| `instrument_provider_ids` | Mapping UID/FIGI/SECID/board | unique(provider, provider_instrument_id); unique provider + exchange context |
| `instrument_specs` | Specification history including expiry/underlying/price unit for futures / История спецификаций, включая expiry/underlying/price unit для futures | valid_from/valid_to; checking for non-overlapping intervals in service/migration / valid_from/valid_to; проверка непересекающихся интервалов в service/migration |
| `trading_sessions` | Trading sessions calendar / Календарь торговых сессий | market/board + session date + session type |
| `candles` | OHLCV from selected providers / OHLCV от отдельных провайдеров | unique(instrument, provider, interval, time_start) |
| `data_gaps` | Detected gaps / Обнаруженные пропуски | unique open gap by instrument/provider/interval/range / уникальный открытый gap по instrument/provider/interval/range |
| `history_import_jobs` | History Loading Tasks / Задачи загрузки истории | checkpoint/cursor; resume-safe |
| `dataset_versions` | Fixing the composition of data for research / Фиксация состава данных для исследований | immutable metadata/hash and watermark / immutable metadata/hash и watermark |
| `strategies` | Logical strategy / Логическая стратегия | stable ID |
| `strategy_versions` | Strategy code/config version / Версия кода/конфига стратегии | immutable version + code hash |
| `strategy_runs` | Launching a Data Strategy / Запуск стратегии на данных | version + dataset + parameters |
| `signals` | Signals and their lifecycle / Сигналы и их lifecycle | dedupe key; valid_until |
| `trade_proposals` | Proposal for execution / Предложение к исполнению | link to signal; status / ссылка на signal; status |
| `broker_accounts` | Broker and environment accounts / Счета брокера и окружения | unique(provider, environment, provider_account_id); provider/local status are stored separately / unique(provider, environment, provider_account_id); provider/local status хранятся отдельно |
| `sandbox_account_operations` | Durable journal Sandbox create/sync/fund/close | idempotency key unique; UNKNOWN requires reconciliation / idempotency key unique; UNKNOWN требует reconciliation |
| `account_snapshots` | Periodic snapshot of money/margin / Периодический snapshot денег/маржи | account + timestamp |
| `position_snapshots` | Status of positions at a point in time / Состояние позиций на момент времени | account + instrument + timestamp |
| `orders` | Local lifecycle applications / Локальный lifecycle заявки | unique client_order_id; broker order ID index |
| `order_events` | Append-only state history / Append-only история состояний | event ID unique; received_at |
| `fills` | Executed trades/partial fills / Исполненные сделки/частичные fills | unique broker execution ID if available / unique broker execution ID при наличии |
| `risk_policies` | Limits for account/strategy/instrument / Лимиты для account/strategy/instrument | immutable revisions |
| `automation_sessions` | Current/historical auto trading mode / Текущий/исторический режим автоторговли | explicit mode + enabled flag |
| `audit_log` | Critical commands and decisions / Критичные команды и решения | append-only, actor + action + correlation ID |
| `backtest_runs` | Run result / Результат прогона | immutable config + dataset + strategy version |
| `backtest_trades` | Simulator transactions / Сделки симулятора | FK backtest run |
| `backtest_equity_points` | Equity curve | run + timestamp |
| `outbox_events` | Reliable delivery of internal events / Надёжная доставка внутренних событий | event ID unique; published_at |

### 5.2. SQL — base skeleton / SQL — базовый каркас

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('share','bond','etf','future','currency','index')),
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'MOEX',
  currency CHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX instruments_ticker_idx ON instruments (ticker);
CREATE INDEX instruments_asset_type_idx ON instruments (asset_type, is_active);

CREATE TABLE instrument_provider_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL CHECK (provider IN ('t-invest','moex-iss','manual-import')),
  provider_instrument_id TEXT NOT NULL,
  engine TEXT,
  market TEXT,
  board TEXT,
  secid TEXT,
  class_code TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_instrument_id)
);
CREATE INDEX instrument_provider_context_idx
  ON instrument_provider_ids (provider, engine, market, board, secid);
CREATE INDEX instrument_provider_instrument_idx
  ON instrument_provider_ids (instrument_id, provider);

CREATE TABLE instrument_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  lot_size INTEGER NOT NULL CHECK (lot_size > 0),
  min_price_increment NUMERIC(28, 12) NOT NULL CHECK (min_price_increment > 0),
  price_currency CHAR(3),
  price_type TEXT NOT NULL CHECK (price_type IN ('currency','points','percent')),
  contract_multiplier NUMERIC(28, 12),
  expiration_at TIMESTAMPTZ,
  margin_initial NUMERIC(28, 12),
  underlying_provider_position_uid TEXT,
  underlying_asset_type TEXT CHECK (underlying_asset_type IS NULL OR underlying_asset_type IN ('commodity','equity_index','currency','share','other')),
  underlying_asset_name TEXT,
  contract_family TEXT,
  price_unit TEXT,
  min_price_increment_amount NUMERIC(28, 12),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX instrument_specs_lookup_idx
  ON instrument_specs (instrument_id, valid_from DESC);

CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL DEFAULT 'MOEX',
  engine TEXT,
  market TEXT,
  board TEXT,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled','open','closed','suspended','unknown')),
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (closes_at > opens_at),
  UNIQUE (exchange, engine, market, board, session_date, session_type)
);
CREATE INDEX trading_sessions_lookup_idx
  ON trading_sessions (session_date, engine, market, board);

CREATE TABLE candles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL CHECK (provider IN ('t-invest','moex-iss','manual-import')),
  interval_code TEXT NOT NULL,
  time_start TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ NOT NULL,
  open NUMERIC(28, 12) NOT NULL,
  high NUMERIC(28, 12) NOT NULL,
  low NUMERIC(28, 12) NOT NULL,
  close NUMERIC(28, 12) NOT NULL,
  volume NUMERIC(28, 8) NOT NULL DEFAULT 0 CHECK (volume >= 0),
  volume_unit TEXT NOT NULL DEFAULT 'unknown',
  turnover NUMERIC(28, 8),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  quality TEXT NOT NULL DEFAULT 'good'
    CHECK (quality IN ('good','delayed','incomplete','suspect')),
  source_revision TEXT,
  raw_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (time_end > time_start),
  CHECK (low <= high AND low <= open AND low <= close AND high >= open AND high >= close),
  UNIQUE (instrument_id, provider, interval_code, time_start)
);
CREATE INDEX candles_query_idx
  ON candles (instrument_id, interval_code, time_start DESC);
CREATE INDEX candles_provider_query_idx
  ON candles (provider, instrument_id, interval_code, time_start DESC);

CREATE TABLE history_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  interval_code TEXT NOT NULL,
  requested_from TIMESTAMPTZ NOT NULL,
  requested_to TIMESTAMPTZ NOT NULL,
  cursor JSONB,
  checkpoint_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','partial','failed','cancelled')),
  rows_received BIGINT NOT NULL DEFAULT 0,
  rows_inserted BIGINT NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requested_to > requested_from)
);
CREATE INDEX history_import_jobs_status_idx ON history_import_jobs (status, created_at);

CREATE TABLE data_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  provider TEXT NOT NULL,
  interval_code TEXT NOT NULL,
  gap_from TIMESTAMPTZ NOT NULL,
  gap_to TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','accepted_non_trading')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CHECK (gap_to > gap_from)
);
CREATE INDEX data_gaps_open_idx ON data_gaps (instrument_id, interval_code, gap_from)
  WHERE status = 'open';

CREATE TABLE dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_policy JSONB NOT NULL,
  instrument_ids UUID[] NOT NULL,
  intervals TEXT[] NOT NULL,
  from_at TIMESTAMPTZ NOT NULL,
  to_at TIMESTAMPTZ NOT NULL,
  source_watermarks JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (to_at > from_at)
);

CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  version TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  config_schema JSONB NOT NULL,
  default_config JSONB NOT NULL,
  entrypoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, version)
);
CREATE TABLE strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  dataset_version_id UUID NOT NULL REFERENCES dataset_versions(id),
  parameters JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result_summary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  interval_code TEXT NOT NULL,
  event_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy','sell','close','hold')),
  status TEXT NOT NULL CHECK (status IN ('new','accepted','rejected','expired','executed','invalidated')),
  reference_price NUMERIC(28, 12) NOT NULL,
  entry_min NUMERIC(28, 12),
  entry_max NUMERIC(28, 12),
  stop_loss NUMERIC(28, 12),
  take_profit JSONB,
  confidence NUMERIC(8, 6),
  reasons JSONB NOT NULL,
  features JSONB NOT NULL,
  data_quality TEXT NOT NULL,
  source_event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  UNIQUE (strategy_version_id, instrument_id, interval_code, event_key)
);
CREATE INDEX signals_feed_idx ON signals (created_at DESC, status);

CREATE TABLE trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signals(id),
  account_id UUID NOT NULL,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('limit','market','best_price','stop')),
  quantity_lots INTEGER NOT NULL CHECK (quantity_lots > 0),
  limit_price NUMERIC(28, 12),
  stop_price NUMERIC(28, 12),
  estimated_risk NUMERIC(28, 8),
  risk_snapshot JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','rejected','expired','submitted')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broker_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 't-invest',
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  provider_account_id TEXT NOT NULL,
  display_name TEXT,
  provider_status TEXT,
  local_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (local_status IN ('new','active','closed','missing','unknown')),
  account_type TEXT,
  currency CHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, environment, provider_account_id)
);
CREATE INDEX broker_accounts_environment_status_idx
  ON broker_accounts (provider, environment, local_status, updated_at DESC);

-- Durable command journal. account_id is nullable for CREATE: provider ID is
-- unknown before OpenSandboxAccount returns successfully.
CREATE TABLE sandbox_account_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 't-invest',
  account_id UUID REFERENCES broker_accounts(id),
  provider_account_id TEXT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create','sync','fund','close')),
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','unknown')),
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  amount NUMERIC(28, 8),
  currency CHAR(3),
  correlation_id TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (provider, idempotency_key)
);
CREATE INDEX sandbox_account_operations_account_time_idx
  ON sandbox_account_operations (account_id, created_at DESC);
CREATE INDEX sandbox_account_operations_status_idx
  ON sandbox_account_operations (status, created_at DESC);
ALTER TABLE trade_proposals
  ADD CONSTRAINT trade_proposals_account_fk
  FOREIGN KEY (account_id) REFERENCES broker_accounts(id);

CREATE TABLE account_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  captured_at TIMESTAMPTZ NOT NULL,
  currency CHAR(3) NOT NULL,
  total_value NUMERIC(28, 8),
  cash NUMERIC(28, 8),
  blocked NUMERIC(28, 8),
  margin_used NUMERIC(28, 8),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX account_snapshots_latest_idx ON account_snapshots (account_id, captured_at DESC);

CREATE TABLE position_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  captured_at TIMESTAMPTZ NOT NULL,
  quantity NUMERIC(28, 8) NOT NULL,
  average_price NUMERIC(28, 12),
  current_price NUMERIC(28, 12),
  unrealized_pnl NUMERIC(28, 8),
  currency CHAR(3),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX position_snapshots_latest_idx
  ON position_snapshots (account_id, instrument_id, captured_at DESC);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  proposal_id UUID REFERENCES trade_proposals(id),
  client_order_id UUID NOT NULL UNIQUE,
  broker_order_id TEXT,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  order_type TEXT NOT NULL,
  quantity_lots INTEGER NOT NULL CHECK (quantity_lots > 0),
  limit_price NUMERIC(28, 12),
  status TEXT NOT NULL CHECK (status IN (
    'created','submitting','unknown','new','active','partially_filled',
    'cancel_pending','filled','cancelled','rejected','expired'
  )),
  mode TEXT NOT NULL CHECK (mode IN ('manual','paper','sandbox','live_guarded','live')),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_last_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (account_id, broker_order_id)
);
CREATE INDEX orders_account_status_idx ON orders (account_id, status, updated_at DESC);
CREATE INDEX orders_instrument_idx ON orders (instrument_id, submitted_at DESC);

CREATE TABLE order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  event_time TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX order_events_order_time_idx ON order_events (order_id, received_at);

CREATE TABLE fills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  broker_execution_id TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  quantity_lots NUMERIC(28, 8) NOT NULL,
  price NUMERIC(28, 12) NOT NULL,
  commission NUMERIC(28, 8),
  currency CHAR(3),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX fills_order_execution_unique_idx
  ON fills (order_id, broker_execution_id) WHERE broker_execution_id IS NOT NULL;

CREATE TABLE risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global','account','strategy','instrument')),
  scope_id TEXT,
  version INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limits JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, version)
);
CREATE TABLE automation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES broker_accounts(id),
  mode TEXT NOT NULL CHECK (mode IN ('research','manual','paper','sandbox','live_guarded','live')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_strategies UUID[] NOT NULL DEFAULT '{}',
  allowed_instruments UUID[] NOT NULL DEFAULT '{}',
  risk_policy_id UUID REFERENCES risk_policies(id),
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  correlation_id TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_target_idx ON audit_log (target_type, target_id, created_at DESC);
CREATE INDEX audit_log_correlation_idx ON audit_log (correlation_id);

CREATE TABLE backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  dataset_version_id UUID NOT NULL REFERENCES dataset_versions(id),
  parameters JSONB NOT NULL,
  cost_model JSONB NOT NULL,
  execution_model JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metrics JSONB,
  result_hash TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE backtest_trades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  side TEXT NOT NULL,
  quantity_lots NUMERIC(28, 8) NOT NULL,
  entry_price NUMERIC(28, 12) NOT NULL,
  exit_price NUMERIC(28, 12),
  gross_pnl NUMERIC(28, 8),
  fees NUMERIC(28, 8),
  slippage NUMERIC(28, 8),
  net_pnl NUMERIC(28, 8)
);
CREATE TABLE backtest_equity_points (
  backtest_run_id UUID NOT NULL REFERENCES backtest_runs(id),
  event_time TIMESTAMPTZ NOT NULL,
  equity NUMERIC(28, 8) NOT NULL,
  drawdown NUMERIC(12, 8) NOT NULL,
  PRIMARY KEY (backtest_run_id, event_time)
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX outbox_pending_idx ON outbox_events (created_at)
  WHERE published_at IS NULL;
```

### 5.3. Schema design notes

**RU.**

1. **`candles` unique key includes provider.** Это позволяет хранить разные версии одного периода от ISS и T-Invest и сравнивать расхождения. Канонический источник выбирается политикой dataset, а не потерей исходной записи.
2. **Таблицы истории неизменяемы по смыслу.** Исправление свечи обновляет provider-specific row только по явному reconciliation, меняет `updated_at/raw_hash`, а версия dataset фиксирует использованные watermark/hash.
3. **Большие временные таблицы партиционировать после измерения.** Для PostgreSQL declarative partitioning ключ должен соответствовать уникальным ограничениям; при TimescaleDB проверить ограничения hypertable/composite primary key.
4. **Не использовать `NUMERIC` для количества миллисекунд или простых счётчиков.** Numeric нужен финансовым значениям; временные поля — `TIMESTAMPTZ`, счётчики — integer/bigint.
5. **История позиций — snapshots, не mutable truth.** Операции и fills используются для восстановления ledger; брокерский snapshot — сверка внешнего состояния.
6. **JSONB только для provider raw payload/config metadata.** Основные поля, по которым фильтруют/сортируют/связывают данные, должны быть нормализованы.
7. **Статусы и переходы валидировать в application layer + тестах.** CHECK constraint защищает от неизвестных статусов, но не заменяет полноценную state machine.
8. **UUID заявки формировать до вызова брокера.** `client_order_id` генерируется один раз и не меняется при retry/reconciliation.
9. **Не хранить API token в БД.** Секреты берутся из secret store / environment, а в audit сохраняются только безопасные метаданные.
10. **Migrations — append-only.** Исправления — новая миграция; destructive migration требует backup, review и отдельного согласования.
11. **Environment вместо двусмысленного `is_sandbox`.** В целевой схеме `broker_accounts.environment` обязателен (`sandbox`/`production`) и входит в unique key. Если БД уже создана по v1.1, выполнить forward migration: добавить `environment`, заполнить его из `is_sandbox`, создать новый unique index, переключить readers/writers, затем удалить старое поле отдельной миграцией только после проверки. Не менять старую миграцию задним числом.
12. **Sandbox account operation journal.** `sandbox_account_operations` хранит create/sync/fund/close команды, idempotency key, request hash, результат и статус `unknown`; оно не заменяет `audit_log`, а фиксирует retry/reconciliation lifecycle.

**EN.**

1. **`candles` unique key includes provider.** This allows you to store different versions of the same period from ISS and T-Invest and compare differences. The canonical source is chosen by the dataset policy rather than by losing the original record.
2. **History tables are immutable in meaning.** The candle correction updates the provider-specific row only by explicit reconciliation, changes `updated_at/raw_hash`, and the dataset version fixes the watermark/hash used.
3. **Large temporary tables are partitioned after measurement.** For PostgreSQL declarative partitioning, the key must comply with unique constraints; with TimescaleDB, check hypertable/composite primary key restrictions.
4. **Don't use `NUMERIC` for number of milliseconds or simple counters.** Numeric is needed for financial values; temporary fields - `TIMESTAMPTZ`, counters - integer/bigint.
5. **Position history is snapshots, not mutable truth.** Operations and fills are used to restore the ledger; broker snapshot - external state verification.
6. **JSONB only for provider raw payload/config metadata.** The main fields by which data is filtered/sorted/linked must be normalized.
7. **Validate statuses and transitions in application layer + tests.** CHECK constraint protects against unknown statuses, but does not replace a full-fledged state machine.
8. **UUID of the order is generated before calling the broker.** `client_order_id` is generated once and does not change during retry/reconciliation.
environment, а в audit сохраняются только безопасные метаданные.
10. **Migrations - append-only.** Corrections - new migration; destructive migration requires backup, review and separate approval.
11. **Environment instead of the ambiguous `is_sandbox`.** In the target schema, `broker_accounts.environment` is required (`sandbox`/`production`) and is included in the unique key. If the database has already been created using v1.1, perform forward migration: add `environment`, fill it from `is_sandbox`, create a new unique index, switch readers/writers, then delete the old field with a separate migration only after checking. Do not retroactively change the old migration.
12. **Sandbox account operation journal.** `sandbox_account_operations` stores create/sync/fund/close commands, idempotency key, request hash, result and status `unknown`; it does not replace `audit_log`, but captures the retry/reconciliation lifecycle.

### 5.4. Additional tables deferred until needed / Дополнительные таблицы, отложенные до появления функции

**RU.**

- `raw_market_events` — сырой поток trades/orderbook, если появится задача микроструктурного анализа.
- `continuous_futures` / `futures_roll_events` — синтетические ряды и roll mapping.
- `corporate_actions` — дивиденды, сплиты и иные корректировки исторических акций.
- `notifications` — Telegram/email/push delivery queue.
- `users`, `sessions`, `api_keys` — полноценная multi-user модель остаётся за пределами MVP; до её появления Admin API должен быть закрыт существующей server-side auth/private-network policy и не может быть публичным анонимным endpoint.

**EN.**

- `raw_market_events` - raw trades/orderbook flow, if a microstructural analysis task appears.
- `continuous_futures` / `futures_roll_events` - synthetic series and roll mapping.
- `corporate_actions` - dividends, splits and other adjustments to historical shares.
- `notifications` — Telegram/email/push delivery queue.
- `users`, `sessions`, `api_keys` - a full-fledged multi-user model remains outside the MVP; Before it appears, the Admin API must be closed by the existing server-side auth/private-network policy and cannot be a public anonymous endpoint.

---

## 6. Внутренний API приложения

**RU.**

Контракт API — собственный, не проксирование protobuf. Все ответы проходят runtime validation. Decimal возвращаются строками, время — UTC ISO 8601. Ошибки имеют стабильный `code`, человекочитаемый `message`, `correlationId`.

**EN.**

The API contract is proprietary, not proxyed by protobuf. All answers undergo runtime validation. Decimal is returned as strings, time is UTC ISO 8601. Errors have a stable `code`, human readable `message`, `correlationId`.

### 6.1. Read endpoints

| Method | Route | Purpose / Назначение |
|---|---|---|
| GET | `/api/v1/health` | liveness/readiness without secrets / liveness/readiness без секретов |
| GET | `/api/v1/instruments` | catalog filter, asset type, active / фильтр каталога, asset type, active |
| GET | `/api/v1/instruments/:id` | card and current specification / карточка и актуальная спецификация |
| GET | `/api/v1/instruments/:id/specs` | specification history / история спецификаций |
| GET | `/api/v1/market/:id/candles` | candles; interval/from/to/provider |
| GET | `/api/v1/market/:id/last` | last price + receivedAt + age / последняя цена + receivedAt + age |
| GET | `/api/v1/market/:id/orderbook` | glass with timestamp/quality / стакан с timestamp/quality |
| GET | `/api/v1/signals` | signal tape with filters / лента сигналов с фильтрами |
| GET | `/api/v1/signals/:id` | signal + explanation + inputs metadata / сигнал + объяснение + inputs metadata |
| GET | `/api/v1/strategies` | list of strategies and versions / список стратегий и versions |
| GET | `/api/v1/backtests/:id` | backtest status and metrics / статус и метрики backtest |
| GET | `/api/v1/trading/accounts` | broker accounts without tokens / broker accounts без токенов |
| GET | `/api/v1/trading/positions` | positions snapshot |
| GET | `/api/v1/trading/orders` | order log / журнал заявок |
| GET | `/api/v1/system/data-health` | stream state, gaps, freshness |
| GET | `/api/v1/automation/status` | current mode, enabled, kill switch / текущий mode, enabled, kill switch |
| GET | `/api/v1/admin/sandbox/overview` | Sandbox endpoint status, last synchronization time, account statuses and unfinished operations counters / состояние Sandbox endpoint, время последней синхронизации, счётчики account statuses и незавершённых операций |
| GET | `/api/v1/admin/sandbox/accounts` | list of local and Sandbox accounts found with the broker with status filters / список локальных и найденных у брокера Sandbox-счетов с фильтрами status |
| GET | `/api/v1/admin/sandbox/accounts/:id` | account card, portfolio/positions/orders and timestamps / карточка счёта, portfolio/positions/orders и timestamps |
| GET | `/api/v1/admin/sandbox/operations` | log create/sync/fund/close operations, statuses and sanitized errors / журнал create/sync/fund/close операций, статусы и sanitized errors |
| GET | `/api/v1/admin/sandbox/accounts/:id/audit` | audit trail of commands and changes one count at a time / audit trail команд и изменений по одному счёту |

### 6.2. Command endpoints

| Method | Route | Conditions / Условия |
|---|---|---|
| POST | `/api/v1/data/imports` | admin/local user; async job / админ/локальный пользователь; async job |
| POST | `/api/v1/strategies/:id/backtests` | immutable config + dataset ID |
| POST | `/api/v1/signals/:id/accept` | creates a Trade Proposal, not an Order / создаёт Trade Proposal, не Order |
| POST | `/api/v1/signals/:id/reject` | audit reason |
| POST | `/api/v1/trading/order-preview` | without broker write side effects / без broker write side effects |
| POST | `/api/v1/trading/orders` | MANUAL mode, explicit confirm token, repeated server-side risk validation / MANUAL mode, явное confirm token, повторная server-side risk validation |
| POST | `/api/v1/trading/orders/:id/cancel` | ownership/status check and audit / проверка ownership/status и audit |
| POST | `/api/v1/trading/orders/:id/replace` | preview of new price/quantity, audit / preview новой цены/количества, audit |
| POST | `/api/v1/automation/mode` | only allowed transitions, mode confirmation / только разрешённые transitions, подтверждение режима |
| POST | `/api/v1/automation/kill-switch` | emergency operation; backend-enforced / аварийная операция; backend-enforced |
| POST | `/api/v1/admin/sandbox/accounts` | create a Sandbox account; required `Idempotency-Key`, server name/alias / создать Sandbox account; обязательный `Idempotency-Key`, серверное имя/alias |
| POST | `/api/v1/admin/sandbox/accounts/:id/sync` | synchronize account status/portfolio/positions/applications / синхронизировать статус/портфель/позиции/заявки счёта |
| POST | `/api/v1/admin/sandbox/accounts/:id/fund` | top up your virtual RUB balance; positive sum, explicit confirmation and idempotency key / пополнить виртуальный RUB-баланс; положительная сумма, explicit confirmation и idempotency key |
| POST | `/api/v1/admin/sandbox/accounts/:id/close` | close the test account after preview/preflight and explicit confirmation / закрыть тестовый счёт после preview/preflight и explicit confirmation |

**RU.**

**Admin API invariants:** все routes требуют server-side `ADMIN` permission (или эквивалентной защищённой single-operator policy); проверка только в React/router недостаточна. Endpoint и token выбираются серверной конфигурацией, никогда не приходят от клиента. Каждый write-command сначала создаёт `sandbox_account_operations` и `audit_log` запись. Повтор того же `Idempotency-Key` с тем же request hash возвращает исходную операцию; тот же key с другим payload отклоняется. Timeout после команды даёт `unknown`, а не автоматический повтор. POST возвращает `202 Accepted` с `operationId`, `status` и polling URL; UI получает обновления через WebSocket или polling. Decimal суммы принимаются строкой. API никогда не возвращает секреты и Authorization headers.

**EN.**

**Admin API invariants:** all routes require server-side `ADMIN` permission (or an equivalent protected single-operator policy); checking only in React/router is not enough. The endpoint and token are selected by the server configuration and never come from the client. Each write-command first creates a `sandbox_account_operations` and `audit_log` entry. Repeating the same `Idempotency-Key` with the same request hash returns the original operation; the same key with a different payload is rejected. Timeout after the command gives `unknown`, not automatic retry. POST returns `202 Accepted` with `operationId`, `status` and polling URL; The UI receives updates via WebSocket or polling. Decimal amounts are accepted by the string. The API never returns secrets or Authorization headers.

### 6.3. Order confirmation

**RU.**

Order Preview должен возвращать `previewId`, `expiresAt`, `instrumentSpecVersion`, `quoteTimestamp`, `dataAgeMs`, нормализованные цену/лотность/оценочные издержки и список risk checks. Подтверждение ссылается на `previewId`; backend повторно проверяет, что цена/спецификация/лимиты не изменились за время preview. Не принимать сумму из браузера как authoritative input.

**EN.**

Order Preview should return `previewId`, `expiresAt`, `instrumentSpecVersion`, `quoteTimestamp`, `dataAgeMs`, normalized price/lot/estimated costs and a list of risk checks. The confirmation references `previewId`; backend re-checks that the price/specification/limits have not changed during the preview. Do not accept the amount from the browser as authoritative input.

### 6.4. WebSocket events

**RU.** Минимальные типы:

**EN.** Minimum types:

**RU.**

- `market.last_price.updated`
- `market.candle.updated`
- `market.data_health.changed`
- `signal.created`, `signal.updated`
- `order.updated`, `trade.executed`
- `portfolio.position.updated`
- `automation.state.changed`
- `sandbox.account.updated`
- `sandbox.account.operation.updated` (operationId, operationType, status, accountId, correlationId; без secrets и raw auth payloads)

**EN.**

- `market.last_price.updated`
- `market.candle.updated`
- `market.data_health.changed`
- `signal.created`, `signal.updated`
- `order.updated`, `trade.executed`
- `portfolio.position.updated`
- `automation.state.changed`
- `sandbox.account.updated`
- `sandbox.account.operation.updated` (operationId, operationType, status, accountId, correlationId; without secrets and raw auth payloads)

**RU.** События содержат `eventId`, `occurredAt`, `correlationId`, `schemaVersion`, `payload`. Повторная доставка допустима; UI и backend consumers должны обрабатывать дубликаты безопасно.

**EN.** Events contain `eventId`, `occurredAt`, `correlationId`, `schemaVersion`, `payload`. Re-delivery is acceptable; UI and backend consumers must handle duplicates safely.

---

## 7. Полный технический backlog

**RU.**

**Оценка:** S = до 0.5 рабочего дня, M = 1–2 дня, L = 3–5 дней, XL = больше 5 дней / разбить на subtasks. Оценка относится к реализации и тестам одним разработчиком, не включает ожидание внешних доступов и review. Не считать календарным обещанием.

**EN.**

разбить на subtasks. Оценка относится к реализации и тестам одним разработчиком, не включает ожидание внешних доступов и review. Не считать календарным обещанием.

**RU.** Приоритеты: `P0` — блокирует MVP/безопасность; `P1` — MVP feature; `P2` — после MVP; `P3` — исследовательское расширение.

**EN.** Priorities: `P0` - blocks MVP/security; `P1` — MVP feature; `P2` - after MVP; `P3` is a research extension.

### EPIC E0 — Repository foundation & engineering standards

**RU.** **Результат:** репозиторий воспроизводимо устанавливается, собирается и проверяется в CI.

**EN.** **Result:** репозиторий воспроизводимо устанавливается, собирается и проверяется в CI.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-001 | P0 / M | Create pnpm monorepo and turborepo / Создать pnpm monorepo и Turborepo | — | `pnpm install` passes with lockfile; workspace sees all packages; root scripts `build/typecheck/lint/test` work; CI repeats these commands / `pnpm install` проходит с lockfile; workspace видит все пакеты; root scripts `build/typecheck/lint/test` работают; CI повторяет эти команды |
| BL-002 | P0 / M | Fix TypeScript and code style / Зафиксировать TypeScript и code style | BL-001 | `strict: true`; unified ESLint/Prettier rules; there are no implicit `any` in production packages; formatting is checked by CI / `strict: true`; единые ESLint/Prettier правила; нет неявных `any` в production packages; форматирование проверяется CI |
| BL-003 | P0 / M | Create skeleton apps/packages / Создать skeleton apps/packages | BL-001 | Created empty entrypoints for API/web/worker processes and basic packages; no circular deps; package exports work / Созданы пустые entrypoints для API/web/worker процессов и базовых packages; нет circular deps; package exports работают |
| BL-004 | P0 / S | Configuration validation and `.env.example` / Валидация конфигурации и `.env.example` | BL-001 | Zod/TypeBox schema validates required envs; the application crashes with a clear error when a key is missing; secrets are not committed; `.env.example` does not contain real values / Zod/TypeBox schema валидирует обязательные env; приложение падает с понятной ошибкой при пропущенном ключе; секреты не коммитятся; `.env.example` не содержит реальных значений |
| BL-005 | P0 / M | Local Docker Compose | BL-001, BL-004 | `docker compose up` picks up PostgreSQL and local dependencies; healthchecks work; data is saved in volume; README contains reset/migrate commands / `docker compose up` поднимает PostgreSQL и локальные зависимости; healthchecks работают; данные сохраняются в volume; README содержит команды reset/migrate |
| BL-006 | P0 / M | CI pipeline | BL-001–BL-005 | The PR pipeline runs install, lint, typecheck, tests, build; migrations are checked on a clean database; CI secrets are not printed to the log / PR pipeline запускает install, lint, typecheck, tests, build; миграции проверяются на чистой БД; секреты CI не печатаются в лог |
| BL-007 | P0 / S | ADR and STATUS documents / Документы ADR и STATUS | BL-001 | ADR-001...ADR-010 were created (or decisions/deviations were recorded); STATUS contains the selected milestone and active task / Созданы ADR-001…ADR-010 (или зафиксированы решения/отклонения); STATUS содержит выбранный milestone и активную задачу |

### EPIC E1 — Domain model & provider adapters

**RU.** **Результат:** внутренние сущности не зависят от структур SDK или MOEX ISS.

**EN.** **Result:** внутренние сущности не зависят от структур SDK или MOEX ISS.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-010 | P0 / M | Implement domain value objects / Реализовать domain value objects | BL-003 | There is Instrument, InstrumentSpec, Candle, Quote, Order, Fill, Signal; decimal/time/id types are validated; unit tests for boundary values / Есть Instrument, InstrumentSpec, Candle, Quote, Order, Fill, Signal; decimal/time/id типы валидируются; unit tests на граничные значения |
| BL-011 | P0 / M | Implement decimal package / Реализовать decimal package | BL-010 | There is parse/format/compare/add/multiply/divide/roundToTick/quantityToLots; no `number` arithmetic for money/prices; tests for fractional ticks and rounding / Есть parse/format/compare/add/multiply/divide/roundToTick/quantityToLots; нет арифметики `number` для денег/цен; тесты на дробные тики и округление |
| BL-012 | P0 / M | Define MarketDataProvider and BrokerGateway ports / Определить порты MarketDataProvider и BrokerGateway | BL-010 | Contracts do not import the SDK; mocks can be implemented in tests; methods documented; absence of provider type leakage is confirmed by dependency check / Контракты не импортируют SDK; mocks можно реализовать в тестах; methods documented; отсутствие provider type leakage подтверждается dependency check |
| BL-013 | P0 / L | Make T-Invest Node SDK spike / Сделать T-Invest Node SDK spike | BL-012 | A separate team/test connects to Sandbox and receives accounts, instrument metadata, candles and market stream; `GetCandles` are necessarily checked for one commodity and one index futures (and not just for stocks); real UIDs, intervals, dates of the first candle, volume/price units, package version and runtime requirements are recorded; raw SDK types do not exit the adapter / Отдельная команда/тест подключается к Sandbox и получает accounts, instrument metadata, candles и market stream; обязательно проверены `GetCandles` для одного товарного и одного индексного фьючерса (а не только для акции); зафиксированы реальные UID, интервалы, даты первой свечи, volume/price units, версия пакетов и runtime requirements; raw SDK types не выходят из адаптера |
| BL-014 | P0 / L | Implement `broker-tinvest` adapter / Реализовать `broker-tinvest` adapter | BL-013 | Implemented list accounts, `Futures`/`FutureBy`, `Indicatives` (as a separate type of the base instrument), get specs, get candles/last price, positions/orders reads; candles are requested by `instrument_uid`; mapping tests check commodity/index futures and do not mix them with the underlying indicator; server-side only token / Реализованы list accounts, `Futures`/`FutureBy`, `Indicatives` (как отдельный тип базового инструмента), get specs, get candles/last price, positions/orders reads; свечи запрашиваются по `instrument_uid`; mapping tests проверяют commodity/index futures и не смешивают их с underlying indicative; токен только server-side |
| BL-015 | P0 / L | Implement `marketdata-moex-iss` HTTP client / Реализовать `marketdata-moex-iss` HTTP client | BL-012 | Timeout, abort, retry policy for GET, pagination, `columns` mapping, response validation; unit tests on fixtures; logging without personal data / Timeout, abort, retry policy для GET, pagination, `columns` mapping, response validation; unit tests на fixtures; логирование без персональных данных |
| BL-016 | P0 / L | Instrument catalog and cross-provider mapping / Инструментальный каталог и cross-provider mapping | BL-014, BL-015 | On selected stocks, at least two commodity futures and two index futures, the internal UUID, broker UID and available ISS engine/market/board/SECID are associated; basic asset/underlying and expiry are preserved; active and at least one expired contract are checked separately; ambiguous tickers are not mapped automatically; unresolved pairs are shown as unmatched / На выбранных акциях, минимум двух товарных фьючерсах и двух фьючерсах на индексы связаны внутренний UUID, broker UID и доступный ISS engine/market/board/SECID; сохранены basic asset/underlying и expiry; активные и хотя бы один истёкший контракт проверены отдельно; неоднозначные тикеры не мапятся автоматически; неразрешённые пары показываются как unmatched |
| BL-017 | P0 / M | Versioning specifications / Версионирование спецификаций | BL-010, BL-016 | Changing lot/tick/multiplier/expiry creates a new entry; historical specification is selected by `valid_from/valid_to`; unit tests on period boundaries / Изменение lot/tick/multiplier/expiry создаёт новую запись; историческая спецификация выбирается по `valid_from/valid_to`; unit tests на границах периода |
| BL-018 | P1 / M | Trading schedule adapter | BL-014, BL-015 | For an instrument, you can define open/closed mode and trading session; absence of data is interpreted as UNKNOWN, not OPEN / Для инструмента можно определить открытый/закрытый режим и торговую сессию; отсутствие данных трактуется как UNKNOWN, а не OPEN |

### EPIC E2 — Persistence & data governance

**RU.** **Результат:** надёжное хранилище, миграции, происхождение и аудит.

**EN.** **Result:** надёжное хранилище, миграции, происхождение и аудит.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-020 | P0 / L | Create PostgreSQL migrations v1 / Создать PostgreSQL migrations v1 | BL-005, BL-010 | Catalog tables, specs, candles, jobs, gaps, signals, orders, fills, audit, backtest, `broker_accounts.environment` and `sandbox_account_operations` exist; FK/check/unique constraints enabled; migrations are applied to an empty database / Таблицы каталога, specs, candles, jobs, gaps, signals, orders, fills, audit, backtest, `broker_accounts.environment` и `sandbox_account_operations` существуют; FK/check/unique constraints включены; миграции применяются на пустой БД |
| BL-021 | P0 / M | Create repositories / Создать repositories | BL-020 | There are interfaces and PostgreSQL implementations for the main entities; the domain is independent of Drizzle; transaction boundary is documented / Для основных сущностей есть интерфейсы и PostgreSQL реализации; домен не зависит от Drizzle; transaction boundary документирован |
| BL-022 | P0 / M | Implement transaction outbox / Реализовать transaction outbox | BL-020, BL-021 | The event and the aggregate change are written in one transaction; publisher repeats sending; redelivery does not generate a duplicate by `eventId` / Событие и изменение агрегата пишутся одной транзакцией; publisher повторяет отправку; повторная доставка не порождает дубликат по `eventId` |
| BL-023 | P0 / M | Implement audit log service / Реализовать audit log service | BL-020 | Critical commands write actor/action/target/correlation/result; update/delete audit are prohibited for application DB role; secrets redacted / Критичные команды пишут actor/action/target/correlation/result; update/delete audit запрещены для application DB role; secrets redacted |
| BL-024 | P1 / M | Dataset versioning | BL-020, BL-021 | Backtest dataset records provider policy, range, intervals, instrument set, watermark/hash; rerun uses the same data set or explicitly reports a change / Backtest dataset фиксирует provider policy, диапазон, интервалы, instrument set, watermark/hash; повторный запуск использует тот же набор данных или явно сообщает об изменении |
| BL-025 | P1 / M | Retention, backup and restore procedure / Retention, backup и restore procedure | BL-020 | Verified backup/restore runbook; recovery takes place in a clean environment; secrets are not dumped unnecessarily / Проверенный backup/restore runbook; восстановление проходит на чистом окружении; секреты не попадают в dump без необходимости |

### EPIC E3 — Historical market data pipeline

**RU.** **Результат:** повторяемая загрузка истории, продолжение после рестарта и прозрачные пропуски.

**EN.** **Result:** повторяемая загрузка истории, продолжение после рестарта и прозрачные пропуски.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-030 | P0 / M | Candle canonicalization | BL-010, BL-020 | Same mapping timestamp/volume/price for both providers; unit tests for timezone, volume unit, closed/open candle; for futures, prices in points and volume in lots were checked / Одинаковый mapping timestamp/volume/price для обоих provider; unit tests на timezone, volume unit, закрытую/открытую свечу; для futures проверены цены в пунктах и объём в лотах |
| BL-039 | P0 / L | Futures history coverage spike (commodity + index) | BL-013, BL-016 | A verifiable coverage matrix has been created for at least 2 commodity and 2 index futures, including active series and at least 1 expired series: broker UID, ticker/class_code, underlying, expiry, `first_1min_candle_date`, `first_1day_candle_date`, `GetCandles` availability for 1m/5m/1h/1d, availability of archives for each year, row count and gaps. One example of an archived future is checked against the documented `CRZ5_SPBFUT`; the absence of an archive is recorded as `unavailable`, and not as zero market volume. The result is `docs/FUTURES_HISTORY_COVERAGE.md` with sanitized API samples and reproducible queries / Создана проверяемая coverage matrix минимум для 2 товарных и 2 индексных фьючерсов, включая активные серии и не менее 1 истёкшей серии: broker UID, ticker/class_code, underlying, expiry, `first_1min_candle_date`, `first_1day_candle_date`, доступность `GetCandles` по 1m/5m/1h/1d, наличие архивов по каждому году, row count и гэпы. Один пример архивного фьючерса сверяется с документированным `CRZ5_SPBFUT`; отсутствие архива фиксируется как `unavailable`, а не как нулевой объём рынка. Результат — `docs/FUTURES_HISTORY_COVERAGE.md` с sanitized API samples и воспроизводимыми запросами |
| BL-031 | P0 / L | T-Invest GetCandles importer | BL-014, BL-020, BL-030, BL-039 | Imports real commodity and index futures by `instrument_uid`; requests a range in portions based on interval/limit restrictions (for example, 1m up to 1 day/2400 bars, 5m up to a week, 1h up to 3 months, 1d up to 6 years/2400 bars); rate limited; checkpoint after each window; takes into account `is_complete`, `candle_source_type`, dates of the first available candle and UTC timezone; re-import is idempotent; tests include active and expired contract / Импортирует реальные товарные и индексные фьючерсы по `instrument_uid`; запрашивает диапазон порциями по ограничениям interval/limit (например, 1m до 1 дня/2400 баров, 5m до недели, 1h до 3 месяцев, 1d до 6 лет/2400 баров); rate limited; checkpoint после каждого окна; учитывает `is_complete`, `candle_source_type`, даты первой доступной свечи и timezone UTC; повторный импорт идемпотентен; тесты включают активный и истёкший контракт |
| BL-032 | P1 / L | T-Invest annual archive importer | BL-014, BL-020, BL-030, BL-039 | For selected futures, checks the availability of minute ZIP by UID/year, downloads/unpacks/validates available archives and imports OHLCV; a missed year/contract is reflected as a coverage gap; zip errors and missing year are reflected in job; the current day is not considered to be covered by the archive; archive limits are taken into account / Для выбранных фьючерсов проверяет наличие минутного ZIP по UID/year, скачивает/распаковывает/валидирует доступные архивы и импортирует OHLCV; пропущенный год/контракт отражается как coverage gap; zip errors и missing year отражаются в job; текущий день не считается покрытым архивом; лимиты архива учитываются |
| BL-033 | P1 / L | MOEX ISS/AlgoPack futures candles adapter | BL-015, BL-020, BL-030, BL-039 | Separately checked FORTS endpoint `/iss/engines/futures/markets/forts/boards/rfud/securities/:ticker/candles.json` with from/till/interval; the available range, intervals, delay/authorization and access conditions are recorded; import saves provider separately; this is an additional source/reconciliation, not a blocker T-Invest history ingestion / Отдельно проверен FORTS endpoint `/iss/engines/futures/markets/forts/boards/rfud/securities/:ticker/candles.json` с from/till/interval; зафиксированы доступный диапазон, интервалы, задержка/авторизация и условия доступа; импорт сохраняет provider отдельно; это дополнительный источник/reconciliation, не блокер T-Invest history ingestion |
| BL-034 | P0 / M | Import job orchestration | BL-031, BL-035 | You can create a job, continue after restart, cancel, repeat failed range; checkpoint is not lost; there are summary rows received/inserted/failed / Можно создать job, продолжить после рестарта, отменить, повторить failed range; checkpoint не теряется; есть summary rows received/inserted/failed |
| BL-035 | P0 / M | Data quality validator + gap detection | BL-030, BL-034 | OHLC, volume, duplicate, chronology, session gaps are checked; gaps in a trading session are created in `data_gaps`; no artificial zero candles are created / Проверяются OHLC, volume, duplicate, chronology, session gaps; гэпы в торговой сессии создаются в `data_gaps`; не создаются искусственные нулевые свечи |
| BL-036 | P1 / M | Reconciliation of two sources / Reconciliation двух источников | BL-031, BL-033, BL-035 | For the same contract and matching interval/session/source, a report on OHLC/volume/time discrepancies was built; delayed and realtime series are not compared without watermark alignment; the original lines are not overwritten; dataset policy selects one source explicitly / Для одного и того же контракта и совпадающих interval/session/source построен отчёт по расхождениям OHLC/volume/time; задержанные и realtime ряды не сравниваются без выравнивания watermark; исходные строки не затираются; dataset policy выбирает один source explicitly |
| BL-037 | P0 / M | Market history query API | BL-020, BL-030 | `GET /candles` correctly filters interval/from/to/provider; returns UTC, decimal strings, source metadata; pagination limits response size / `GET /candles` корректно фильтрует interval/from/to/provider; отдаёт UTC, decimal strings, source metadata; пагинация ограничивает размер ответа |
| BL-038 | P1 / M | Historical import CLI | BL-034 | CLI triggers import by ticker/internal ID and interval/date range; dry-run displays a window plan; resume command supports job ID / CLI запускает импорт по ticker/internal ID и interval/date range; dry-run выводит план окон; команда возобновления поддерживает job ID |

### EPIC E4 — Realtime market data & data health

**RU.** **Результат:** единый stream manager с восстановлением, stale detection и UI health.

**EN.** **Result:** единый stream manager с восстановлением, stale detection и UI health.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-040 | P0 / L | Stream connection manager | BL-014 | State machine DISCONNECTED/CONNECTING/CONNECTED/DEGRADED/RECONNECTING; exponential backoff + jitter; heartbeat/last event age; reconnect test |
| BL-041 | P0 / M | Subscription registry | BL-040 | Subscriptions are aggregated by instrument and data type; reconnect restores the necessary subscriptions; UI does not create broker subscription directly / Подписки агрегируются по инструментам и типам данных; reconnect восстанавливает нужные подписки; UI не создаёт broker subscription напрямую |
| BL-042 | P0 / L | Realtime event normalization | BL-040, BL-030 | Market streams mapped to canonical LastPrice/Candle/Trade/Book; event time and receive time are saved; repeated events are deduplicated / Market streams mapped to canonical LastPrice/Candle/Trade/Book; сохраняются event time и receive time; повторные события дедуплицируются |
| BL-043 | P0 / M | Data freshness and health service | BL-042 | For each instrument/feed, age/stale/delayed/unknown is available; stale thresholds are configured by feed/interval; unknown quality prohibits live order / Для каждого instrument/feed доступен age/stale/delayed/unknown; stale thresholds конфигурируются по feed/interval; неизвестное качество запрещает live order |
| BL-044 | P1 / M | Realtime fan-out to UI | BL-037, BL-042 | The WebSocket API returns signed events; reconnect client restores subscriptions; UI shows receivedAt, eventTime, provider and stale badge / API WebSocket отдаёт подписанные события; reconnect клиента восстанавливает subscriptions; UI показывает receivedAt, eventTime, provider и stale badge |
| BL-045 | P1 / M | Gap backfill after reconnect | BL-034, BL-040, BL-043 | After stream is restored, the backfill is launched from the checkpoint; no double signal from an overlapping window; data gaps are resolved only after verification / После восстановления stream запускается backfill с контрольной точки; нет двойного сигнала от перекрывающегося окна; data gaps резолвятся только после проверки |

### EPIC E5 — Analytics, indicators & signals

**RU.** **Результат:** детерминированные признаки и объяснимые сигналы, которые не могут торговать сами.

**EN.** **Result:** детерминированные признаки и объяснимые сигналы, которые не могут торговать сами.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-050 | P0 / M | SMA/EMA indicators / Индикаторы SMA/EMA | BL-030 | Formulas and warm-up periods are documented; reference fixtures; no look-ahead; repeatability on the same input / Формулы и warm-up periods задокументированы; эталонные fixtures; нет look-ahead; повторяемость на одинаковом input |
| BL-051 | P1 / M | Indicators RSI/ATR/MACD/Bollinger / Индикаторы RSI/ATR/MACD/Bollinger | BL-050 | Correct warmup/null handling; flat/up/down series tests; the result coincides with the reference calculation in the tolerance / Корректные warmup/null handling; тесты на flat/up/down series; результат совпадает с эталонным расчётом в допуске |
| BL-052 | P1 / M | Volume/VWAP features | BL-030 | The volume unit is explicitly set; VWAP is not calculated for an unknown volume unit without warning; intraday session reset tests / Явно задаётся volume unit; VWAP не вычисляется при неизвестной единице объёма без предупреждения; внутридневные session reset тесты |
| BL-053 | P0 / M | Strategy interface + deterministic runner (Benefit TSE Phase 1) / Интерфейс стратегии + детерминированный runner (Benefit TSE Phase 1) | BL-050 | `@moex/strategy-engine`: typed contracts, config versioning, candle normalizer, instrument/pivot/VP adapters wrapping `@moex/indicators`; no broker SDK; same input/version/config → same output. Spec: `docs/BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`. / `@moex/strategy-engine`: типизированные контракты, versioning config, candle normalizer, адаптеры instrument/pivot/VP поверх `@moex/indicators`; без broker SDK; same input/version/config → same output. Spec: `docs/BENEFITIARIUM_TRADING_SIGNAL_ENGINE_SPEC.md`. |
| BL-054 | P1 / M | Baseline EMA crossover strategy | BL-053 | There are entry/exit rules, direction, timeframe, invalidation, config schema; artificial graphs cover signal/no-signal scenarios / Есть entry/exit rules, direction, timeframe, invalidation, config schema; искусственные графики покрывают signal/no-signal сценарии |
| BL-055 | P1 / M | RSI filter / ATR risk strategy | BL-051, BL-053 | The signal includes the filter reason, stop/target as proposal metadata; calculation does not send order; the tool specification is taken into account for sizing in the next step / Сигнал включает причину фильтра, стоп/цель как proposal metadata; расчёт не отправляет order; спецификация инструмента учтена для sizing на следующем этапе |
| BL-056 | P0 / M | Signal persistence and deduplication | BL-020, BL-053 | Unique event key prevents a repeat signal on a repeat candle; strategy version, source time, data quality, features/reasons, valid_until are saved / Unique event key предотвращает повторный signal на повторной свече; сохраняется strategy version, source time, data quality, features/reasons, valid_until |
| BL-057 | P1 / M | Signal REST API + UI | BL-037, BL-056 | There are filters/status/detail; UI shows price/time/source/reasons/expiration date; delayed/stale signal is visually marked / Есть filters/status/detail; UI показывает цену/время/источник/причины/срок действия; delayed/stale signal визуально помечен |
| BL-058 | P2 / M | Feature research export | BL-024, BL-052 | Uploading dataset + features is tied to version and range; leakage-sensitive fields are excluded or explicitly marked / Выгрузка dataset + features привязана к версии и диапазону; leakage-sensitive поля исключены или явно маркированы |

### EPIC E6 — Backtesting & Strategy Lab

**RU.** **Результат:** event-driven simulator, учитывающий временную доступность данных и торговые издержки.

**EN.** **Result:** event-driven simulator, учитывающий временную доступность данных и торговые издержки.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-060 | P0 / M | Check `invest-engine-node` spike / Проверить `invest-engine-node` spike | BL-013, BL-053 | The report shows supported event types, fees, slippage, partial fills, futures, sessions, data format; use/adapt/replace solution fixed by ADR / Отчёт показывает поддерживаемые event types, fees, slippage, partial fills, futures, sessions, data format; решение use/adapt/replace зафиксировано ADR |
| BL-061 | P0 / L | Event-driven backtest core | BL-024, BL-053 | Events are played strictly in time; order fills do not occur before the signal/availability event; fixed seed and dataset give the same result / События проигрываются строго по времени; order fills не происходят раньше сигнала/доступности события; фиксированный seed и dataset дают одинаковый результат |
| BL-062 | P0 / L | Cost & execution model | BL-061, BL-017 | Commission, spread/slippage, tick/lot, next-event fill, market session taken into account; gap-through-stop and no-liquidity scenarios are covered by tests / Учтены commission, spread/slippage, tick/lot, next-event fill, market session; сценарии gap-through-stop и no-liquidity покрыты тестами |
| BL-063 | P1 / M | Backtest metrics and report | BL-061, BL-062 | There is net/gross PnL, max drawdown, profit factor, expectancy, win rate, avg win/loss, exposure, fees share; formulas are documented / Есть net/gross PnL, max drawdown, profit factor, expectancy, win rate, avg win/loss, exposure, fees share; формулы документированы |
| BL-064 | P1 / M | Backtest job + immutable result | BL-024, BL-061 | Launch asynchronous; strategy version/config/dataset/cost model/result hash are saved; the completed run does not change when the strategy is subsequently changed / Запуск асинхронный; сохраняются strategy version/config/dataset/cost model/result hash; завершённый run не меняется при последующем изменении стратегии |
| BL-065 | P1 / M | Strategy Lab UI | BL-063, BL-064 | You can select version/dataset/period/config, run the run, open equity/drawdown/trades/metrics; data limitations and execution models are visible / Можно выбрать version/dataset/period/config, запустить прогон, открыть equity/drawdown/trades/metrics; видны ограничения данных и модели исполнения |
| BL-066 | P1 / M | Walk-forward / OOS evaluation | BL-064 | Train/validation/test intervals are specified in time and do not overlap; the report does not use future data when selecting parameters; sample boundaries are preserved / Train/validation/test интервалы заданы по времени и не пересекаются; отчет не использует будущие данные при выборе параметров; сохраняются границы выборок |

### EPIC E7 — Manual trading & order lifecycle

**RU.** **Результат:** пользователь вручную подтверждает заявку на выбранном Sandbox-счёте; система надёжно отслеживает order/fill lifecycle. Управление тестовыми счетами вынесено в отдельный E7A.

**EN.** **Result:** пользователь вручную подтверждает заявку на выбранном Sandbox-счёте; система надёжно отслеживает order/fill lifecycle. Управление тестовыми счетами вынесено в отдельный E7A.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-070 | P0 / M | Broker account/positions sync | BL-014, BL-020 | Accounts and positions are saved by snapshots; broker IDs are matched; state `last_synced_at` available; discrepancy does not erase history / Аккаунты и позиции сохраняются snapshot-ами; broker IDs сопоставлены; состояние `last_synced_at` доступно; расхождение не затирает историю |
| BL-071 | P0 / M | Order preview service | BL-017, BL-043, BL-070 | The preview contains tick/lot checks, quote age, trading status, estimate costs, account state; preview expires; no broker write call / В preview есть tick/lot checks, quote age, trading status, estimate costs, account state; preview expires; нет broker write call |
| BL-072 | P0 / L | Server-side Risk Engine v1 | BL-011, BL-017, BL-071 | Account/instrument/order size, allowed mode, quote freshness, trading status, cash/margin checks limits are implemented and covered by unit tests; UNKNOWN status always fail-closed / Лимиты account/instrument/order size, allowed mode, quote freshness, trading status, cash/margin checks реализованы и покрыты unit tests; UNKNOWN status всегда fail-closed |
| BL-073 | P0 / L | Order aggregate + state machine | BL-020, BL-023 | Transitions are validated; `UNKNOWN` is a separate state; order_events append-only; duplicate event does not duplicate transition/fill / Переходы валидируются; `UNKNOWN` есть отдельным состоянием; order_events append-only; duplicate event does not duplicate transition/fill |
| BL-074 | P0 / L | Sandbox submit/cancel adapter | BL-014, BL-072, BL-073 | The request uses a previously created unique client order ID; timeout does not cause blind retry; successful/rejected applications are recorded in the state machine; tests Sandbox only / В запросе используется заранее созданный уникальный client order ID; timeout не вызывает blind retry; успешные/отклонённые заявки мапятся в state machine; tests только Sandbox |
| BL-075 | P0 / L | Order streams + reconciliation | BL-074 | OrderStateStream/TradesStream update local orders; when disconnect/worker restart, `GetOrders`/`GetOrderState`/fills reconciliation is done; unknown order ID blocks new openings until allowed / OrderStateStream/TradesStream обновляют локальные заявки; при disconnect/worker restart делается `GetOrders`/`GetOrderState`/fills reconciliation; неизвестный order ID блокирует новые открытия до разрешения |
| BL-076 | P1 / M | Manual trading UI | BL-071, BL-075 | Limit order form, preview, explicit confirmation; the market order has a warning; UI displays partial fill/cancel/reject/unknown; sandbox/live are clearly different; the selected account selector shows `SANDBOX` and the full account ID, changing the account requires an explicit selection and is confirmed in order preview / Форма limit order, preview, явное подтверждение; рыночная заявка имеет предупреждение; UI отображает partial fill/cancel/reject/unknown; sandbox/live явно различаются; выбранный account selector показывает `SANDBOX` и полный account ID, смена счёта требует явного выбора и подтверждается в order preview |
| BL-077 | P1 / M | Replace/cancel race handling | BL-073–BL-076 | Cancel/replace are allowed only from valid states; competing events are processed idempotently; UI does not approve cancellation until broker confirmation / Cancel/replace допускаются только из валидных состояний; конкурирующие события обрабатываются идемпотентно; UI не утверждает отмену до подтверждения broker |

### EPIC E7A — Sandbox account management & Admin UI

**RU.**

**Результат:** пользователь управляет жизненным циклом тестовых счетов через защищённую административную панель; Sandbox endpoint и credential изолированы от production. Этот эпик можно реализовывать после E1/E2 и до включения ручного trading workflow.

**EN.**

**RU.**

**Result:** пользователь управляет жизненным циклом тестовых счетов через защищённую административную панель; Sandbox endpoint и credential изолированы от production. Этот эпик можно реализовывать после E1/E2 и до включения ручного trading workflow.

**EN.**

**Result:** пользователь управляет жизненным циклом тестовых счетов через защищённую административную панель; Sandbox endpoint и credential изолированы от production. Этот эпик можно реализовывать после E1/E2 и до включения ручного trading workflow.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-078 | P0 / L | SandboxAccountService + separate Sandbox provider client / SandboxAccountService + отдельный Sandbox provider client | BL-012, BL-014, BL-020 | Application service implements `listAccounts`, `openAccount`, `closeAccount`, `payIn`, `getPortfolio`, `getPositions`, `getOrders`, `getOperations`; provider client is strictly tied to Sandbox endpoint and sandbox credential; production client cannot be passed/replaced via UI or request DTO; internal models do not depend on SDK DTO; create/fund/close write calls are executed only by `worker-execution`, the API only writes command + outbox; unit/contract tests cover success, validation, 401/403, 429, timeout and 5xx / Application service реализует `listAccounts`, `openAccount`, `closeAccount`, `payIn`, `getPortfolio`, `getPositions`, `getOrders`, `getOperations`; provider client жёстко привязан к Sandbox endpoint и sandbox credential; production client не может быть передан/подменён через UI или request DTO; внутренние модели не зависят от SDK DTO; create/fund/close write calls выполняются только `worker-execution`, API только пишет command + outbox; unit/contract tests покрывают success, validation, 401/403, 429, timeout и 5xx |
| BL-079 | P0 / M | Sandbox account discovery, sync & recovery | BL-078, BL-021, BL-023 | `GetSandboxAccounts` requests `ACCOUNT_STATUS_ALL` (if the enum is supported by the established contract); provider statuses NEW/OPEN/CLOSED are saved separately from local `missing/unknown`; temporary API error does not mark all accounts as missing; a missing account is not deleted or replaced automatically; The UI/API suggests creating a new one while preserving the old history; periodic sync is started by scheduler/job queue and executed by `worker-execution`; manual sync puts the same durable command; synchronization is idempotent / `GetSandboxAccounts` запрашивает `ACCOUNT_STATUS_ALL` (если enum поддержан установленным контрактом); provider statuses NEW/OPEN/CLOSED сохраняются отдельно от локальных `missing/unknown`; временная ошибка API не помечает все счета как missing; пропавший счёт не удаляется и не заменяется автоматически; UI/API предлагает создать новый, сохраняя старую историю; периодический sync запускается scheduler/job queue и выполняется `worker-execution`; ручной sync ставит такую же durable command; синхронизация идемпотентна |
| BL-087 | P0 / M | Safe Sandbox funding & close workflows | BL-078, BL-079, BL-020, BL-023 | Replenishment only accepts a positive amount in RUB, checks the documented limit of 30 million RUB and provider validation; The UI/API warns that it is not possible to write off/withdraw funds through SandboxPayIn; before write persist idempotency key/request hash; app-level idempotency prevents the same command from being issued again, but is not considered provider-side idempotency; timeout → `unknown` and reconciliation through available account/operation/portfolio reads, without blind retry; if the result of `OpenSandboxAccount` cannot be uniquely matched, the operation requires manual resolution; closing requires preview and re-confirmation; open orders and positions are shown before closing; broker result/error is saved, local history is not deleted / Пополнение принимает только положительную сумму в RUB, проверяет документированное ограничение 30 млн RUB и provider validation; UI/API предупреждает, что списать/вывести средства через SandboxPayIn нельзя; до write persist-ятся idempotency key/request hash; app-level idempotency предотвращает повторную постановку той же команды, но не считается provider-side idempotency; timeout → `unknown` и reconciliation через доступные account/operation/portfolio reads, без blind retry; если результат `OpenSandboxAccount` нельзя однозначно сопоставить, операция требует ручного разрешения; закрытие требует preview и повторного подтверждения; перед закрытием показываются открытые заявки и позиции; broker result/error сохраняется, локальная история не удаляется |
| BL-088 | P0 / L | Sandbox Admin API + server-side authorization | BL-078, BL-079, BL-087, BL-021, BL-023 | Implemented read/command routes from section 6; all admin endpoints require server-side ADMIN authorization or a closed single-operator auth policy; public anonymous access is not possible; GET returns read models, POST creates a durable command + outbox and returns `202 Accepted` with operation ID; worker-execution executes write; schema validation, rate limit, idempotency, audit, correlation ID and sanitized errors are required; contract tests check for absence of production base URL and token leaks / Реализованы read/command routes из раздела 6; все admin endpoints требуют server-side ADMIN authorization либо закрытой single-operator auth policy; публичный anonymous доступ невозможен; GET возвращает read models, POST создаёт durable command + outbox и возвращает `202 Accepted` с operation ID; worker-execution выполняет write; schema validation, rate limit, idempotency, audit, correlation ID и sanitized errors обязательны; contract tests проверяют отсутствие production base URL и утечек токена |
| BL-089 | P1 / L | Sandbox Admin UI in `apps/web` / Sandbox Admin UI в `apps/web` | BL-088 | There is a protected group of routes `/admin/sandbox`: overview, accounts list, account detail and operations history; The UI allows you to create an account, open a card, perform sync, top up your balance, close an account, view portfolio/positions/orders/operations; for funding/close there is a separate confirmation dialog with the amount/invoice/irreversibility; loading/empty/error/unknown/missing/closed states are visible; after the command, the UI expects a confirmed backend status and does not show success optimistically; Playwright E2E covers basic workflows and access denial / Есть защищённая группа маршрутов `/admin/sandbox`: overview, accounts list, account detail и operations history; UI позволяет создать счёт, открыть карточку, выполнить sync, пополнить баланс, закрыть счёт, просматривать portfolio/positions/orders/operations; для funding/close есть отдельный confirmation dialog с суммой/счётом/необратимостью; видны loading/empty/error/unknown/missing/closed states; после команды UI ожидает подтверждённый backend status и не показывает success оптимистично; Playwright E2E покрывает основные workflows и отказ доступа |

**RU.** #### UX / экранная спецификация Admin UI

**EN.** #### UX / Admin UI screen specification

**RU.** **Навигация:** пункт `Admin → Sandbox` доступен только пользователю с административным разрешением. Прямой переход по URL также проверяется сервером; отсутствие пункта меню не считается защитой.

**EN.** **Navigation:** The `Admin → Sandbox` item is available only to a user with administrative permission. Direct URL navigation is also checked by the server; the absence of a menu item is not considered a defense.

**RU.**

**1. `/admin/sandbox` — Overview**
- Environment badge `SANDBOX` и фиксированный hostname без показа токена.
- Статус подключения: `CONNECTED / DEGRADED / DISCONNECTED`, время последней успешной проверки.
- Счётчики `OPEN / NEW / CLOSED / MISSING / UNKNOWN`, число операций `QUEUED / RUNNING / UNKNOWN / FAILED`.
- Действия `Sync all` и `Create account`; никаких кнопок перехода в LIVE.

**EN.**

**RU.**

**1. `/admin/sandbox` — Overview**
- Environment badge `SANDBOX` and fixed hostname without showing the token.
DISCONNECTED`, время последней успешной проверки.
FAILED`.
- Actions `Sync all` and `Create account`; no buttons to go to LIVE.

**EN.**

**1. `/admin/sandbox` — Overview**
- Environment badge `SANDBOX` and fixed hostname without showing the token.
DISCONNECTED`, время последней успешной проверки.
FAILED`.
- Actions `Sync all` and `Create account`; no buttons to go to LIVE.

**RU.**

**2. `/admin/sandbox/accounts` — Accounts**
- Таблица: alias/name, provider account ID (маскировать при необходимости), provider/local status, валюта, cash/portfolio value, число позиций/активных заявок, last synced/verified.
- Фильтры по статусу; отдельное выделение `MISSING` и `UNKNOWN`; ручное обновление списка.
- `Create account` открывает короткую форму имени/alias; стартовый баланс не предполагается автоматически.

**EN.**

**2. `/admin/sandbox/accounts` — Accounts**
- Table: alias/name, provider account ID (mask if necessary), provider/local status, currency, cash/portfolio value, number of positions/active orders, last synced/verified.
- Filters by status; separate selection of `MISSING` and `UNKNOWN`; manual list update.
- `Create account` opens a short name/alias form; the starting balance is not automatically assumed.

**RU.**

**3. `/admin/sandbox/accounts/:id` — Account detail**
- Summary: ID, alias, opened/closed dates, provider status, local status, last verified.
- Tabs: `Portfolio`, `Positions`, `Orders`, `Operations`, `Audit`.
- Actions: `Sync`, `Fund`, `Close`; для `MISSING` — явное предложение создать новый счёт, не «восстановить» прежний ID.

**EN.**

**3. `/admin/sandbox/accounts/:id` — Account detail**
- Summary: ID, alias, opened/closed dates, provider status, local status, last verified.
- Tabs: `Portfolio`, `Positions`, `Orders`, `Operations`, `Audit`.
- Actions: `Sync`, `Fund`, `Close`; for `MISSING` - an explicit proposal to create a new account, not to “restore” the previous ID.

**RU.**

**4. Funding dialog**
- Поле суммы как decimal string; валюта фиксирована `RUB`; только `amount > 0`, верхняя проверка соответствует документированному ограничению 30 000 000 RUB.
- До подтверждения показывается предупреждение: пополнение виртуальное и не может быть отменено/выведено через Sandbox API.
- Double-confirm для большой суммы (порог конфигурируемый); после submit показывается operation ID и фактический статус.

**EN.**

**4. Funding dialog**
- Amount field as decimal string; currency is fixed `RUB`; only `amount > 0`, the upper check corresponds to the documented limit of 30,000,000 RUB.
- A warning is shown before confirmation: the deposit is virtual and cannot be canceled/withdrawn via the Sandbox API.
- Double-confirm for a large amount (configurable threshold); after submit the operation ID and actual status are shown.

**RU.**

**5. Close dialog**
- Перед запросом UI загружает активные заявки и позиции; отображает предупреждение о незавершённых объектах.
- Закрытие требует ввода/подтверждения имени счёта или ID; нет каскадного удаления локальных orders/fills/audit.
- После команды статус `CLOSED` показывается только после подтверждения брокера или последующей reconciliation.

**EN.**

**5. Close dialog**
- Before the request, the UI loads active orders and positions; displays a warning about unfinished objects.
- Closing requires entering/confirming the account name or ID; no cascading deletion of local orders/fills/audit.
- After the command, the `CLOSED` status is shown only after confirmation by the broker or subsequent reconciliation.

**RU.**

**6. Operations history**
- Тип, account, initiatedAt, completedAt, status, amount, correlation ID и безопасное описание ошибки.
- Для `UNKNOWN` доступно действие `Reconcile`; повторная отправка исходной write-команды недоступна до разрешения неопределённого состояния.

**EN.**

**6. Operations history**
- Type, account, initiatedAt, completedAt, status, amount, correlation ID and secure description of the error.
- For `UNKNOWN` the action `Reconcile` is available; resending of the original write command is not available until the undefined state is resolved.

**RU.**

**UI implementation notes:** компоненты и формы — `apps/web/src/features/admin/sandbox/`; API handlers — `apps/api/src/modules/admin/sandbox/`; use-cases/state machine — `packages/sandbox-management/`; provider RPC — только `packages/broker-tinvest/`; DTO — `packages/contracts/`. Не создавать отдельный микрофронтенд или микросервис на этом этапе.

**EN.**

**UI implementation notes:** components and forms - `apps/web/src/features/admin/sandbox/`; API handlers - `apps/api/src/modules/admin/sandbox/`; use-cases/state machine - `packages/sandbox-management/`; provider RPC - only `packages/broker-tinvest/`; DTO - `packages/contracts/`. Do not create a separate microfrontend or microservice at this stage.

### EPIC E8 — Paper trading, automation controls & failure handling

**RU.** **Результат:** полная стратегия работает на realtime данных без отправки реальных поручений; контроль режима защищён backend-ом.

**EN.** **Result:** полная стратегия работает на realtime данных без отправки реальных поручений; контроль режима защищён backend-ом.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-080 | P0 / L | Paper broker simulator | BL-042, BL-061, BL-073 | Order status, partial fill, cancel, spread/slippage are simulated; each fill has a source market event; repeating one event does not create a new fill / Симулируются order status, partial fill, cancel, spread/slippage; каждый fill имеет source market event; повтор одного события не создаёт новый fill |
| BL-081 | P0 / M | Trading mode state machine | BL-072, BL-073 | There is RESEARCH/MANUAL/PAPER/SANDBOX/LIVE_GUARDED/LIVE; allowed transitions are described; dangerous transitions require explicit confirmation and auditing / Есть RESEARCH/MANUAL/PAPER/SANDBOX/LIVE_GUARDED/LIVE; разрешённые transitions описаны; опасные transitions требуют явного подтверждения и аудита |
| BL-082 | P0 / M | Global kill switch | BL-072, BL-081 | Kill switch is stored backend-side; checked immediately before each shipment; cannot be reset with just one UI manipulation; restart maintains a safe state / Kill switch хранится backend-side; проверяется непосредственно перед каждой отправкой; нельзя сбросить одной UI манипуляцией; restart сохраняет безопасное состояние |
| BL-083 | P0 / M | Risk policies and loss limits | BL-072, BL-081 | Configurable max risk/trade, max daily loss, max exposure, max orders, max spread/slippage; when exceeded there are no new inputs; events are included in audit / Configurable max risk/trade, max daily loss, max exposure, max orders, max spread/slippage; при превышении новых входов нет; события попадают в audit |
| BL-084 | P1 / M | Automation orchestration | BL-053, BL-081–BL-083 | Strategy Worker sends proposal event; Execution Worker independently checks signal freshness, whitelist, policy, quote age and mode; no direct broker call from strategy / Strategy Worker отправляет proposal event; Execution Worker независимо проверяет signal freshness, whitelist, policy, quote age and mode; нет прямого вызова broker из стратегии |
| BL-085 | P0 / L | Failure/restart/chaos test suite | BL-075, BL-080–BL-084 | Network loss, API 429/5xx, DB restart, worker crash, duplicate events, stale feed, unknown order, kill switch checked; the system remains fail-closed / Проверены network loss, API 429/5xx, DB restart, worker crash, duplicate events, stale feed, unknown order, kill switch; система остаётся fail-closed |
| BL-086 | P1 / M | Paper monitoring report | BL-080, BL-084 | The report compares the signal, calculated and simulated fill, slippage, rejected proposals, data quality; period and dataset/live range are fixed / Отчёт сравнивает сигнал, расчётный и simulated fill, slippage, rejected proposals, data quality; период и dataset/live range фиксируются |

### EPIC E9 — Guarded live & operations

**RU.** **Результат:** строго ограниченный запуск реального исполнения после независимой проверки.

**EN.** **Result:** строго ограниченный запуск реального исполнения после независимой проверки.

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-090 | P0 / M | Live trading approval gate | BL-085, BL-086 | Есть документированный checklist и sign-off человеком; стратегия version/hash зафиксированы; live disabled by default; нет автоматического перехода из Sandbox в Live |
| BL-091 | P0 / M | Production preflight + daily reconciliation | BL-075, BL-082, BL-090 | Перед включением сверяются accounts/positions/orders/specs/market status; при mismatch новые заявки заблокированы; повторная сверка доступна и аудитируется |
| BL-092 | P0 / L | LIVE_GUARDED order path | BL-090, BL-091 | Разрешён whitelist account/strategy/instrument; ограничение объёма/частоты и дневного риска проверяется backend; отдельный production credential; kill switch протестирован в production-like environment |
| BL-093 | P0 / M | Runbook and operational alerts | BL-085, BL-091 | Есть инструкции API outage, stale feed, unknown order, mismatch portfolio, daily loss, credential rotation; health/metrics/alerts проверены тестовым incident |
| BL-094 | P1 / M | Deployment hardening | BL-093 | Non-root containers, secret injection, backup schedule, restore test, DB migration strategy, log redaction, dependency scanning; release has rollback procedure |

### EPIC E10 — Future extensions (non-blocking) / Future extensions (не блокируют MVP)

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-100 | P2 / L | Futures continuous series and roll logic | BL-017, BL-024 | Continuous series явно синтетический; метод roll/back-adjust описан; не подменяет contract ID в order flow; тесты на expiry boundary |
| BL-101 | P2 / L | Trades/orderbook analytics | BL-042 | Источник/подписка/глубина известны; timestamps и sequence handling validated; microstructure data не смешивается с OHLCV |
| BL-102 | P2 / L | Corporate actions adjustment | BL-030 | Raw и adjusted series хранятся отдельно; метод корректировки воспроизводим; backtest использует выбранный режим явно |
| BL-103 | P2 / XL | Portfolio-level risk | BL-070, BL-083 | Учитываются корреляции, совместное exposure, концентрация и сценарные потери; deterministic tests |
| BL-104 | P3 / XL | ML regime classifier / anomaly detector | BL-024, BL-066 | Есть time-based validation, leakage audit, baseline comparison, model versioning; ML не обходит risk engine |
| BL-105 | P3 / M | Notifications (Telegram/email) | BL-023, BL-093 | Retry, dedupe, delivery status, no credentials in payload; alerts имеют severity и action hint |

### EPIC E5B — Market trigger alerts + Telegram / Рыночные триггер-алерты + Telegram

| ID | Приоритет / размер | Task / Task / Задача | Dependencies / Dependencies / Зависимости | Acceptance criteria / Acceptance criteria / Критерии приёмки |
|---|---|---|---|---|
| BL-106 | P1 / M | Signal trigger framework + Fibonacci approach/cross | indicators fib pivots | `@moex/signal-triggers` registry; fib approach/cross with hysteresis; exact decimal math; unit tests; ADR-011 / Реестр триггеров; fib approach/cross с гистерезисом; точная decimal-арифметика; unit tests; ADR-011 |
| BL-107 | P1 / M | market_signals + notifications persistence | BL-106, BL-020 | Migration 004; atomic insert signal+notification; UNIQUE dedupe_key; claimDue SKIP LOCKED; memory + pg tests / Миграция 004; атомарная запись; UNIQUE dedupe_key; claimDue SKIP LOCKED; memory + pg tests |
| BL-108 | P1 / L | worker-signals favorites 5m/1h evaluator | BL-107, favorites stream sync | Separate stream; close (default) or intrabar eval; PivotLevelCache; Telegram HTML text; graceful shutdown / Отдельный stream; close (default) или intrabar; PivotLevelCache; HTML-текст; graceful shutdown |
| BL-109 | P1 / M | worker-notifier Telegram delivery | BL-107 | fetch Bot API; 429/5xx retry; 4xx dead; poll + throttle; no token in logs/payload / fetch Bot API; retry 429/5xx; dead на 4xx; poll + throttle; токен не в логах/payload |

---

## 8. Milestones, dependencies и release gates

| Milestone | Includes / Включает | Visible outcome / Видимый результат | Gate to advance / Gate для перехода |
|---|---|---|---|
| M0 — Foundation | E0 | Repository + CI + local DB / Репозиторий + CI + локальная БД | Clean clone builds and passes CI / Чистый clone собирается и проходит CI |
| M1 — Providers | E1 + part of E2 / E1 + часть E2 | Catalog/specs available via adapters / Каталог/спецификации доступны через adapters | Test instrument set mapped unambiguously; sandbox API works / Тестовый набор инструментов однозначно mapped; sandbox API работает |
| M2 — Historical Data | E2 + E3 | История акций, товарных фьючерсов и фьючерсов на индексы загружается, доступна через API и график | Coverage matrix пройдена минимум для 2 commodity + 2 index futures; активная и истёкшая серия проверены; повторный импорт идемпотентен; gaps и фактическая глубина истории видимы |
| M3 — Realtime | E4 | Live quote and health in UI / Живая котировка и health в UI | Reconnect/backfill/stale tests passed / Reconnect/backfill/stale test пройдены |
| M4 — Signals | E5 | First explainable signals / Первые объяснимые сигналы | Deterministic replay yields identical results / Deterministic replay даёт идентичные результаты |
| M5 — Backtesting | E6 | Strategy Lab + report / Strategy Lab + отчёт | No look-ahead; fees/slippage included; OOS held out / Нет look-ahead; fees/slippage учтены; OOS выделен |
| M6 — Sandbox Management | E7A | Защищённая Admin UI создаёт/синхронизирует/пополняет/закрывает Sandbox-счета | Lifecycle, auth, idempotency/UNKNOWN recovery, and UI E2E passed / Lifecycle, auth, idempotency/UNKNOWN recovery и UI E2E пройдены |
| M7 — Manual Sandbox | E7 | Manual order on selected sandbox account and journal / Ручная заявка на выбранный sandbox account и журнал | Timeout/retry/partial fill/reconcile tests passed / Timeout/retry/partial fill/reconcile tests пройдены |
| M8 — Paper | E8 | Full pipeline without real money / Полный pipeline без реальных денег | Failure tests, kill switch, risk policies passed; paper period documented / Failure tests, kill switch, risk policies пройдены; paper период документирован |
| M9 — Guarded Live | E9 | Limited live trading / Ограниченная live торговля | Human sign-off; preflight and rollback plan; strategy frozen / Человеческий sign-off; preflight и rollback plan; стратегия зафиксирована |

**RU.**

**Порядок выполнения:** E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7A → E7 → E8 → E9. Часть UI можно развивать параллельно с backend после готовности контрактов, но не делать UI прототипом вместо backend security rules.

**EN.**

**Execution order:** E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7A → E7 → E8 → E9. Part of the UI can be developed in parallel with the backend after the contracts are ready, but do not make the UI a prototype instead of backend security rules.

### 8.1. Gate before first Sandbox order / Gate перед первым Sandbox order

**RU.**

- [ ] Sandbox account создан/обнаружен через SandboxAccountService; account status синхронизирован и `last_verified_at` актуален.
- [ ] Admin UI и Admin API защищены server-side authorization; anonymous access невозможен.
- [ ] Используется отдельный sandbox endpoint/credential/account.
- [ ] В runtime невозможно выбрать production случайным `NODE_ENV` без отдельного explicit config.
- [ ] Preview показывает account, instrument, side, type, quantity, price, quote age и spec version.
- [ ] Сервер повторно проверяет лимиты перед отправкой.
- [ ] `client_order_id` сохранён до network call.
- [ ] Timeout переводит заявку в `UNKNOWN`; повторный submit блокируется.
- [ ] `OrderStateStream`/reconciliation обновляют состояние.
- [ ] Все события записаны в audit log.
- [ ] Создание/пополнение/закрытие счёта проходит через durable operation journal и имеет idempotency key.
- [ ] UI корректно показывает `UNKNOWN` и не предлагает blind retry; пропавший счёт не заменяется автоматически.

**EN.**

- [ ] Sandbox account created/discovered via SandboxAccountService; account status is synchronized and `last_verified_at` is up to date.
- [ ] Admin UI and Admin API are protected by server-side authorization; anonymous access is not possible.
- [ ] A separate sandbox endpoint/credential/account is used.
- [ ] At runtime it is impossible to select production at random `NODE_ENV` without a separate explicit config.
- [ ] Preview shows account, instrument, side, type, quantity, price, quote age and spec version.
- [ ] The server rechecks the limits before sending.
- [ ] `client_order_id` saved to network call.
- [ ] Timeout transfers the request to `UNKNOWN`; resubmit is blocked.
- [ ] `OrderStateStream`/reconciliation update the state.
- [ ] All events are recorded in the audit log.
- [ ] Creating/replenishing/closing an account goes through a durable operation journal and has an idempotency key.
- [ ] UI correctly shows `UNKNOWN` and does not offer blind retry; a missing account is not automatically replaced.

### 8.2. Gate before PAPER / Gate перед PAPER

**RU.**

- [ ] Сигнал и proposal — разные сущности.
- [ ] У Strategy Worker нет брокерского write token.
- [ ] Feed freshness и session gate реализованы.
- [ ] Paper fills используют явную модель исполнения и source events.
- [ ] Repeated event не создаёт дубль signal/order/fill.
- [ ] Kill switch проверяется на backend.

**EN.**

- [ ] Signal and proposal are different entities.
- [ ] Strategy Worker does not have a broker write token.
- [ ] Feed freshness and session gate are implemented.
- [ ] Paper fills use an explicit execution model and source events.
- [ ] Repeated event does not create a duplicate signal/order/fill.
- [ ] Kill switch is checked on the backend.

### 8.3. Gate before LIVE_GUARDED / Gate перед LIVE_GUARDED

**RU.**

- [ ] Пройдено не менее 20 торговых сессий PAPER (порог для эксплуатационной проверки, не доказательство прибыльности).
- [ ] По каждой сессии есть отчёт по сигналам, simulated fills, rejected trades, data gaps и системным сбоям.
- [ ] Есть out-of-sample backtest на заранее зафиксированном участке.
- [ ] Комиссии и проскальзывание проверены консервативными сценариями.
- [ ] На практике проверены stop/market/limit semantics и ограничения конкретного инструмента.
- [ ] Риск-лимиты заданы до запуска, а не после первых убытков.
- [ ] Выполнена ручная сверка broker positions/orders с локальным state.
- [ ] Есть отдельное подтверждение пользователя/владельца системы.
- [ ] Live выключен по умолчанию и ограничен allowlist.

**EN.**

- [ ] At least 20 PAPER trading sessions have been completed (threshold for operational verification, not proof of profitability).
- [ ] For each session there is a report on signals, simulated fills, rejected trades, data gaps and system failures.
- [ ] There is an out-of-sample backtest on a pre-fixed section.
- [ ] Commissions and slippage tested with conservative scenarios.
- [ ] Stop/market/limit semantics and limitations of a specific tool have been tested in practice.
- [ ] Risk limits are set before launch, and not after the first losses.
- [ ] Manual verification of broker positions/orders with local state was performed.
- [ ] There is a separate confirmation of the user/owner of the system.
- [ ] Live is disabled by default and limited by allowlist.

---

## 9. Definition of Done (общий)

**RU.** Любая задача считается `DONE`, только если применимые пункты выполнены:

**EN.** Any task is considered `DONE` only if the applicable points are completed:

**RU.**

1. Код следует слоям monorepo; нет import cycle и provider leakage.
2. Типы публичных входов/выходов определены; runtime validation применяется к внешним данным.
3. Unit tests покрывают normal case, boundary case и error case.
4. Integration test использует sandbox или fixture; тест не может случайно отправить реальный ордер.
5. Для миграции проверены up и совместимость с существующей схемой; destructive SQL отдельно одобрен.
6. Логирование содержит correlation ID, но не token/authorization headers/секреты.
7. Обработаны timeout, отмена, retry policy и идемпотентность там, где они применимы.
8. Метрики/ошибки достаточны для диагностики.
9. README/API docs/ADR/STATUS обновлены, если контракт или поведение изменились.
10. CI `lint`, `typecheck`, `test`, `build` проходит.
11. В PR указаны выполненные критерии и ограничения.

**EN.**

1. The code follows monorepo layers; no import cycle and provider leakage.
2. Types of public entrances/exits are defined; runtime validation is applied to external data.
3. Unit tests cover normal case, boundary case and error case.
4. Integration test uses sandbox or fixture; the test cannot accidentally send a real order.
5. For migration, up and compatibility with the existing scheme are checked; destructive SQL is separately approved.
6. Logging contains correlation ID, but not token/authorization headers/secrets.
7. Handled timeout, cancellation, retry policy and idempotency where applicable.
8. Metrics/errors are sufficient for diagnosis.
9. README/API docs/ADR/STATUS updated if contract or behavior has changed.
10. CI `lint`, `typecheck`, `test`, `build` passes.
11. The PR specifies the criteria and limitations met.

### Additional DoD for financial/trading modules / Дополнительный DoD для финансовых/торговых модулей

**RU.**

- Цена/сумма/комиссия/маржа не проходят через небезопасный `number` pipeline.
- Tick/lot/specification version валидируются server-side.
- Нет side-effect от стратегии до отдельного proposal/risk/execute шага.
- Все внешние write requests имеют audit trail и idempotency key.
- Для неопределённого результата broker write — `UNKNOWN` и reconciliation, а не blind retry.
- При stale/unknown market data, неизвестном trading status, потере broker connection или превышении лимита — fail-closed.

**EN.**

- Price/amount/commission/margin do not go through the unsafe `number` pipeline.
- Tick/lot/specification version are validated server-side.
- There is no side-effect from the strategy to a separate proposal/risk/execute step.
- All external write requests have an audit trail and an idempotency key.
- For an undefined result, the broker write is `UNKNOWN` and reconciliation, not blind retry.
- In case of stale/unknown market data, unknown trading status, loss of broker connection or exceeding the limit - fail-closed.

---

## 10. Тестовая стратегия и fixtures

### 10.1. Unit tests

**RU.**

- Decimal parsing, rounding to tick, lot conversion, contract multiplier.
- Futures price/value converter на выбранных контрактах.
- Candle validation, timezone conversion, volume unit mapping.
- MOEX ISS `columns` mapping и pagination cursor.
- Provider DTO → canonical model mapping.
- Indicator warm-up, flat series, gaps, boundary calculations.
- Strategy deterministic replay и signal deduplication.
- Backtest next-event execution, commissions, slippage, gap-through-stop, no liquidity.
- Risk engine policy precedence, max quantity, stale quote, unknown session.
- Order state transitions, duplicate events, cancel/replace race, unknown timeout state.

**EN.**

- Decimal parsing, rounding to tick, lot conversion, contract multiplier.
- Futures price/value converter on selected contracts.
- Candle validation, timezone conversion, volume unit mapping.
- MOEX ISS `columns` mapping and pagination cursor.
- Provider DTO → canonical model mapping.
- Indicator warm-up, flat series, gaps, boundary calculations.
- Strategy deterministic replay and signal deduplication.
- Backtest next-event execution, commissions, slippage, gap-through-stop, no liquidity.
- Risk engine policy precedence, max quantity, stale quote, unknown session.
- Order state transitions, duplicate events, cancel/replace race, unknown timeout state.

### 10.2. Integration tests

- T-Invest Sandbox: `GetSandboxAccounts`, `OpenSandboxAccount`, `SandboxPayIn`, `CloseSandboxAccount`, portfolio/positions/orders/operations, instruments, post/cancel/status; account write calls are consumed by `worker-execution` and run only against sandbox endpoint.
- Sandbox Admin API: permission checks, idempotency key collisions, timeout → UNKNOWN, reconciliation and sanitized error handling.
- T-Invest market data: candles/last price/stream (read path).
- MOEX ISS: market structure and a small paginated history range.
- PostgreSQL: upsert, transaction/outbox, migration, dataset snapshot.
- Worker: restart during an import, resume from checkpoint.
- WebSocket: client disconnect/reconnect and event replay/deduplication.

### 10.3. E2E / failure scenarios

**RU.**

1. Полностью пройти use case: instrument sync → history import → chart → indicators → signal → backtest report.
2. Создать Sandbox order → partial fill/status event → cancel remaining → reconciliation.
3. Симулировать timeout после broker submit; убедиться, что новая заявка не отправляется автоматически.
4. Отключить feed на интервал выше threshold; убедиться, что новые proposals блокируются.
5. Перезапустить worker при активной заявке; проверить восстановление состояния.
6. Вызвать превышение daily loss; проверить отказ новых входов и audit record.
7. Включить kill switch в момент очереди на отправку; проверить, что команда не проходит.
8. Повторно доставить один market event/order event; проверить отсутствие дублей.
9. Admin UI: создать Sandbox account → sync → fund → portfolio/positions refresh → close; проверить audit/operation journal и подтверждение статусов только после ответа/reconciliation.
10. Удалить тестовый account на уровне provider fixture; sync должен показать `MISSING`, сохранить локальную историю и предложить создать новый account без автоматического переключения.
11. Попытаться открыть `/admin/sandbox` и вызвать Admin API без admin permission; UI/API должны отказать независимо друг от друга.

**EN.**

1. Completely go through the use case: instrument sync → history import → chart → indicators → signal → backtest report.
2. Create Sandbox order → partial fill/status event → cancel remaining → reconciliation.
3. Simulate timeout after broker submit; make sure that a new application is not sent automatically.
4. Disable feed for an interval above the threshold; make sure that new proposals are blocked.
5. Restart the worker with an active request; check state recovery.
6. Cause daily loss to exceed; check the failure of new inputs and audit record.
7. Turn on the kill switch during the queue for sending; check that the command fails.
8. Re-delive one market event/order event; check for duplicates.
9. Admin UI: create Sandbox account → sync → fund → portfolio/positions refresh → close; check the audit/operation journal and confirmation of statuses only after the response/reconciliation.
10. Delete the test account at the provider fixture level; sync should show `MISSING`, save local history and offer to create a new account without automatic switching.
11. Try to open `/admin/sandbox` and call the Admin API without admin permission; The UI/API must fail independently of each other.

### 10.4. Fixture set / Набор fixtures

**RU.** Хранить anonymized/static fixtures в `packages/test-fixtures`:

**EN.** Store anonymized/static fixtures in `packages/test-fixtures`:

**RU.**

- 1 liquid stock, at least 2 commodity futures and 2 index futures (active contracts), at least 1 expired futures contract, 1 instrument with changing spec;
- candles с обычной сессией, gap, duplicate, outlier, partial current bar;
- sample MOEX ISS response с `columns` в отличном от ожидаемого порядке;
- broker order lifecycle: accepted, rejected, partial, filled, cancelled, timeout/unknown;
- market stream disconnect/reconnect;
- commodity/index futures candle history, archive present/missing, 1m and 1d first-candle boundary;
- futures expiry/roll boundary and underlying mapping.

**EN.**

- 1 liquid stock, at least 2 commodity futures and 2 index futures (active contracts), at least 1 expired futures contract, 1 instrument with changing spec;
- candles with regular session, gap, duplicate, outlier, partial current bar;
- sample MOEX ISS response with `columns` in a different order from the expected one;
- broker order lifecycle: accepted, rejected, partial, filled, cancelled, timeout/unknown;
- market stream disconnect/reconnect;
- commodity/index futures candle history, archive present/missing, 1m and 1d first-candle boundary;
- futures expiry/roll boundary and underlying mapping.

**RU.** Fixtures должны быть небольшими, неизменяемыми и иметь README с источником/датой получения. Не коммитить реальные данные пользовательского портфеля или токены.

**EN.** Fixtures should be small, immutable, and have a README with the source/date of receipt. Do not commit real user portfolio data or tokens.

---

## 11. Инфраструктура, конфигурация и наблюдаемость

### 11.1. Environment variables (example names, not secret values) / Environment variables (пример имён, не секретные значения)

```dotenv
NODE_ENV=development
APP_TIMEZONE=Europe/Moscow
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moex

TINVEST_SANDBOX_BASE_URL=https://sandbox-invest-public-api.tbank.ru:443
TINVEST_SANDBOX_TOKEN=
TINVEST_SANDBOX_DEFAULT_ACCOUNT_ID=
TINVEST_PROD_BASE_URL=https://invest-public-api.tbank.ru:443
TINVEST_PROD_TOKEN=
TINVEST_PROD_ACCOUNT_ID=

MOEX_ISS_BASE_URL=https://iss.moex.com/iss
MOEX_ISS_AUTH_MODE=anonymous

TRADING_MODE=research
LIVE_TRADING_ENABLED=false
GLOBAL_KILL_SWITCH=true
LOG_LEVEL=info
```

**RU.**

Имена окончательно нормализовать (например, `TINVEST_*` uppercase); не поддерживать параллельные алиасы без причины. Production URL и token должны быть отдельными секретами; Sandbox adapter должен принимать только `TINVEST_SANDBOX_*`, а production adapter — только `TINVEST_PROD_*`. Hostname проверяется allowlist-ом; UI не может прислать endpoint. Окружение всегда задаётся из server-side account record и проверяется перед вызовом SDK; общего переключателя `TINVEST_ENV`/`TINVEST_DEFAULT_ENV` для write path нет. `.env.example` содержит только пустые значения/фейковые локальные значения.

**EN.**

Names are finally normalized (for example, `TINVEST_*` uppercase); Don't support parallel aliases without reason. The Production URL and token must be separate secrets; Sandbox adapter should only accept `TINVEST_SANDBOX_*`, and production adapter should only accept `TINVEST_PROD_*`. Hostname is checked by allowlist; UI cannot send endpoint. The environment is always set from the server-side account record and is checked before calling the SDK; There is no general switch `TINVEST_ENV`/`TINVEST_DEFAULT_ENV` for write path. `.env.example` contains only empty values/fake local values.

### 11.2. Rate limiting

**RU.** Разделить budgets по категориям:

**EN.** Divide budgets by category:

- catalog/instruments;
- historical candles/backfill;
- realtime stream subscriptions;
- account/portfolio reads;
- order reads;
- order write/cancel/replace.

**RU.**

Все числа лимитов хранить в provider adapter config и сверять с действующей официальной таблицей непосредственно перед релизом. Не переносить значения лимитов в strategy logic. Backfill имеет меньший приоритет, чем realtime и execution. Для GET использовать bounded exponential backoff + jitter; для POST order — reconciliation вместо автоматического повторения.

**EN.**

Store all limit numbers in provider adapter config and check them against the current official table immediately before release. Do not transfer limit values ​​to strategy logic. Backfill has lower priority than realtime and execution. For GET use bounded exponential backoff + jitter; for POST order - reconciliation instead of automatic repetition.

### 11.3. Minimum metrics / Минимальные метрики

**RU.**

- `provider_request_total{provider,method,status}` и latency histogram;
- `provider_rate_limit_total{provider,method}`;
- `stream_connection_state`, `stream_reconnect_total`, `market_event_age_ms`;
- `history_import_jobs{status}`, `history_rows_written`, `data_gaps_open`;
- `signals_created_total`, `signals_expired_total`, `signals_deduplicated_total`;
- `orders_by_status`, `order_submit_latency_ms`, `unknown_orders_total`, `fills_total`;
- `risk_rejections_total{reason}`, `kill_switch_state`;
- worker heartbeat, queue depth, DB pool saturation.

**EN.**

- `provider_request_total{provider,method,status}` and latency histogram;
- `provider_rate_limit_total{provider,method}`;
- `stream_connection_state`, `stream_reconnect_total`, `market_event_age_ms`;
- `history_import_jobs{status}`, `history_rows_written`, `data_gaps_open`;
- `signals_created_total`, `signals_expired_total`, `signals_deduplicated_total`;
- `orders_by_status`, `order_submit_latency_ms`, `unknown_orders_total`, `fills_total`;
- `risk_rejections_total{reason}`, `kill_switch_state`;
- worker heartbeat, queue depth, DB pool saturation.

### 11.4. Logging / Логирование

**RU.**

Все логи — JSON и по возможности содержат `correlationId`, `instrumentId`, `strategyVersionId`, `signalId`, `proposalId`, `clientOrderId`, `brokerOrderId`. Никогда не логировать токен, Authorization header, API secret, полные персональные данные аккаунта. Ошибки провайдера сохранять в редактированном виде с кодом и sanitized message.

**EN.**

All logs are JSON and, if possible, contain `correlationId`, `instrumentId`, `strategyVersionId`, `signalId`, `proposalId`, `clientOrderId`, `brokerOrderId`. Never log the token, Authorization header, API secret, or full personal account information. Provider errors are saved in edited form with code and sanitized message.

---

## 12. Security & trading safety checklist / Security & trading safety checklist

**RU.**

- [ ] Sandbox и production конфигурации/секреты хранятся отдельно; sandbox client не имеет доступа к production credential.
- [ ] Sandbox Admin API требует server-side ADMIN permission или закрытую single-operator auth policy; UI route guard не считается достаточным.
- [ ] Ни один браузерный bundle/API response/log не содержит T-Invest token, Authorization header или secret.
- [ ] Sandbox hostname фиксирован allowlist-ом; base URL нельзя переопределить request payload/query/header из браузера.
- [ ] На каждой Sandbox write-команде проверяются `environment='sandbox'` и допустимое account state; `production` account никогда не принимается Sandbox controller-ом.
- [ ] Funding требует подтверждения суммы и предупреждения о невозможности reverse/withdraw через Sandbox API.
- [ ] `sandbox_account_operations` + `audit_log` создаются до внешней write-команды; timeout сохраняется как `UNKNOWN` до reconciliation.
- [ ] В браузер не передаётся full-access token и не используется `VITE_*` для секретов.
- [ ] Только `worker-execution` имеет broker write credentials, включая Sandbox account create/fund/close; api/web/strategy не имеют их.
- [ ] По возможности отдельные токены/права для read и trade, если это поддержано T-Invest.
- [ ] Live выключен по умолчанию на уровне конфигурации и БД.
- [ ] Каждая live strategy/account/instrument комбинация находится в allowlist.
- [ ] Сброс kill switch требует явного backend action и аудита.
- [ ] Для ручного заказа нужен явный confirmation workflow; для автоматического — approved automation session.
- [ ] Неизвестная спецификация, неизвестный статус торгов, stale quote или неактуальная позиция → отказ.
- [ ] Timeout write call не приводит к повтору до reconciliation.
- [ ] При рестарте execution worker сначала reconcile active/unknown orders, потом разрешает новые открытия.
- [ ] Kill switch останавливает новые заявки; политика по открытым позициям задана отдельно и явно.
- [ ] Backups защищены; restore tested; credentials rotatable.
- [ ] Права на хранение и показ биржевых данных проверены по договору/лицензии MOEX и условиям брокера.

**EN.**

- [ ] Sandbox and production configurations/secrets are stored separately; sandbox client does not have access to production credential.
- [ ] Sandbox Admin API requires server-side ADMIN permission or private single-operator auth policy; UI route guard is not considered sufficient.
- [ ] No browser bundle/API response/log contains T-Invest token, Authorization header or secret.
- [ ] Sandbox hostname is fixed by the allowlist; base URL cannot be overridden by request payload/query/header from the browser.
- [ ] On each Sandbox write command, `environment='sandbox'` and a valid account state are checked; `production` account is never accepted by the Sandbox controller.
- [ ] Funding requires confirmation of the amount and a warning about the impossibility of reverse/withdraw via the Sandbox API.
- [ ] `sandbox_account_operations` + `audit_log` are created before the external write command; timeout is saved as `UNKNOWN` until reconciliation.
- [ ] The full-access token is not sent to the browser and `VITE_*` is not used for secrets.
- [ ] Only `worker-execution` has broker write credentials, including Sandbox account create/fund/close; api/web/strategy don't have them.
- [ ] If possible, separate tokens/permissions for read and trade, if supported by T-Invest.
- [ ] Live is disabled by default at the configuration and database level.
- [ ] Each live strategy/account/instrument combination is in the allowlist.
- [ ] Resetting a kill switch requires an explicit backend action and auditing.
- [ ] For a manual order, an explicit confirmation workflow is required; for automatic — approved automation session.
- [ ] Unknown specification, unknown bidding status, stale quote or irrelevant item → refusal.
- [ ] Timeout write call does not retry until reconciliation.
- [ ] When restarting, the execution worker first reconciles active/unknown orders, then allows new openings.
- [ ] Kill switch stops new requests; The policy for open positions is specified separately and explicitly.
- [ ] Backups are protected; restore tested; credentials rotatable.
- [ ] The rights to store and display exchange data have been verified under the MOEX agreement/license and the broker’s terms and conditions.

### 12.1. Sandbox Admin UI security checklist

**RU.**

- [ ] `/admin/sandbox` доступен только authenticated admin/operator; UI и backend независимо проверяют разрешение.
- [ ] Любая команда create/fund/close требует confirmation с отображением account ID, суммы/действия и environment.
- [ ] Для POST-команд используется idempotency key; повторный клик не создаёт повторное пополнение/закрытие.
- [ ] В интерфейсе всегда виден `SANDBOX` environment badge; нет переключателя host на production.
- [ ] В браузерном state/query cache не сохраняются tokens, secrets или сырые provider authorization payloads.
- [ ] Для `UNKNOWN` операция остаётся видимой и блокирующей до reconciliation.
- [ ] Для `MISSING` счёта UI сохраняет старую запись и историю; пользователь явно создаёт новый счёт и заново выбирает его для торговли.
- [ ] Ошибки API очищены от токенов и персональных данных; audit log содержит actor, target, command ID и reason.
- [ ] Для funding UI показывает предупреждение о неотменяемом пополнении и невозможности вывода средств через Sandbox API.

**EN.**

- [ ] `/admin/sandbox` is available only to authenticated admin/operator; The UI and backend independently check the resolution.
- [ ] Any create/fund/close command requires confirmation showing account ID, amount/action and environment.
- [ ] For POST commands, the idempotency key is used; a repeat click does not create a repeat top-up/close.
- [ ] The `SANDBOX` environment badge is always visible in the interface; there is no switch host to production.
- [ ] Tokens, secrets or raw provider authorization payloads are not stored in the browser state/query cache.
- [ ] For `UNKNOWN` the operation remains visible and blocking until reconciliation.
- [ ] For `MISSING` account, the UI saves the old entry and history; the user explicitly creates a new account and re-selects it for trading.
- [ ] API errors cleared of tokens and personal data; audit log contains actor, target, command ID and reason.
- [ ] For funding UI shows a warning about non-cancellable replenishment and the impossibility of withdrawing funds through the Sandbox API.

---

## 13. Практический порядок реализации — первые 15 задач

**RU.** Это рекомендуемая последовательность для Cursor, с фокусом на подтверждение архитектуры до массовой реализации.

**EN.** This is the recommended sequence for Cursor, with a focus on validating the architecture before mass implementation.

| Order / Порядок | ID | What to do / Что сделать | Concrete outcome for review / Конкретный результат для review |
|---:|---|---|---|
| 1 | BL-001 | pnpm + Turborepo skeleton | Empty monorepo with working root scripts / Пустой monorepo с рабочими root scripts |
| 2 | BL-002 | TS strict + lint | CI typecheck/lint on clean clone / CI typecheck/lint на чистом clone |
| 3 | BL-004 | Config schema | Startup validation and safe `.env.example` / Startup validation и безопасный `.env.example` |
| 4 | BL-005 | PostgreSQL local infra | `docker compose up` + healthcheck |
| 5 | BL-010 | Domain types | Independent entities and tests / Независимые сущности и tests |
| 6 | BL-011 | Decimal helpers | Exact tick/lot calculations / Точные tick/lot calculations |
| 7 | BL-013 | T-Invest SDK spike | Sandbox connection and first real API responses / Подключение к Sandbox и первые реальные API responses |
| 8 | BL-015 | MOEX ISS spike/client | One real ISS request + fixture tests / Один реальный ISS request + fixture tests |
| 9 | BL-012 | Provider ports | Independent internal interfaces / Независимые internal interfaces |
| 10 | BL-014 | T-Invest adapter | Catalog/specs/candles via adapter / Каталог/спеки/свечи через adapter |
| 11 | BL-016 | Instrument mapping | One share and one future linked in practice / На практике связаны один share и один future |
| 12 | BL-020 | Initial migrations | Database with core tables / База данных с core tables |
| 13 | BL-039 | Futures history coverage spike | Документированная доступность истории commodity/index futures по конкретным контрактам |
| 14 | BL-031 | T-Invest historical importer | First reproducible load and checkpoint for equity and both futures types / Первая воспроизводимая загрузка и checkpoint для акции и обоих типов futures |
| 15 | BL-037 | Candle query API | Frontend can fetch normalized candles / Frontend может получить нормализованные свечи |
| Optional | BL-033 | MOEX AlgoPack futures candles adapter | Additional source after access, latency, and coverage check / Дополнительный источник после проверки доступа, задержки и coverage |

**RU.** После задачи BL-015, до дальнейшей реализации provider adapters, сохранить реальные sanitized examples ответов и точные версии SDK в `docs/API_CONTRACTS.md`.

**EN.** After task BL-015, before further implementation of provider adapters, save real sanitized examples of answers and exact SDK versions in `docs/API_CONTRACTS.md`.

**RU.**

**Следующий вертикальный срез для Sandbox Admin (после E0/E1 и базовых миграций):** BL-078 → BL-079 → BL-087 → BL-088 → BL-089. Не объединять пять задач в один Cursor request: сначала provider/application service, затем operation journal и auth, затем API и UI. До BL-089 Admin UI может быть доступен только с test fixtures в локальной среде, но не в публичном окружении.

**EN.**

**Next vertical slice for Sandbox Admin (after E0/E1 and base migrations):** BL-078 → BL-079 → BL-087 → BL-088 → BL-089. Do not combine five tasks into one Cursor request: first provider/application service, then operation journal and auth, then API and UI. Prior to BL-089, the Admin UI could only be accessed with test fixtures in a local environment, but not in a public environment.

---

## 14. Риски, открытые вопросы и технические spikes

**RU.** Эти вопросы нужно закрыть проверкой/POC, а не предположением AI-агента:

**EN.** These questions need to be closed with a check/POC rather than an AI agent guess:

| Question / Вопрос | How to verify / Как проверить | Blocks / Блокирует |
|---|---|---|
| Which MOEX ISS history is available without subscription for target markets/boards? / Какие MOEX ISS истории доступны без подписки для целевых рынков/board? | Прямые запросы `/iss/history` на выбранных security; проверить политику доступа и условия договора | Final choice of source and history depth / Финальный выбор источника и глубины истории |
| Is T-Invest history/archive sufficient for required instruments? / Есть ли для нужных инструментов достаточная T-Invest история/архив? | Отдельная coverage matrix: минимум 2 commodity + 2 index futures, активная и истёкшая серия; `GetCandles` + годовой ZIP по UID/year; `first_1min_candle_date`, `first_1day_candle_date`, sample count и gaps | Importer plan and MVP coverage / План импортёра и MVP coverage |
| Что реально доступно по фьючерсным свечам на MOEX? | Проверить MOEX AlgoPack FORTS futures candles endpoint с авторизацией и без неё; сравнить интервалы, задержку и глубину с T-Invest | Решение о дополнительном source/reconciliation |
| Какова фактическая совместимость пакетов `@ttech-pub/*`? | Установить согласованные версии; проверить peer dependencies, Node compatibility, imports, runtime | BL-013/014 |
| Доступен ли `invest-engine-node` для требуемой модели fills/futures? | Spike с partial fills, commissions, sessions, expiry, event time | Решение о backtest engine |
| Как интерпретировать цену и объём выбранного фьючерса? | Сверить spec, converter и брокерский preview для 1–2 контрактов | Любой futures sizing/order |
| Можно ли применять stop orders для каждого типа инструмента/режима? | Проверить contract, trading status и ограничения брокера | UI и execution feature scope |
| Какие права на показ/сохранение/перераспространение данных? | Проверить условия MOEX и тариф брокера; при необходимости получить письменное подтверждение | Production и sharing |
| Нужна ли TimescaleDB? | Нагрузочный тест на ожидаемом объёме candles/query latency | Оптимизация хранения, не MVP |

### 14.1. Do not assume / Явно не предполагать

**RU.**

- Нельзя считать, что MOEX ISS/AlgoPack всегда отдаёт полный исторический период без авторизации; для FORTS candles отдельно проверять продукт AlgoPack, задержку и права.
- Нельзя считать, что GetCandles или годовой ZIP содержит историю каждого фьючерсного контракта с начала его обращения; для каждой серии обязательна coverage matrix.
- Нельзя считать, что одинаковый ticker у двух провайдеров гарантирует один инструмент/режим торгов.
- Нельзя считать, что Sandbox полностью эмулирует рыночную ликвидность, margin и реальные fills: документация указывает на упрощённый расчёт ликвидности/плеча, отсутствие расчёта ряда margin-показателей и исполнение на основе последних биржевых сделок.
- Нельзя считать, что Sandbox account будет существовать постоянно: T-Invest может удалить его; локальная система должна сохранять audit/order history и создавать новый account только по явной команде.
- Нельзя считать, что SandboxPayIn можно отменить/отозвать: API допускает только положительное пополнение RUB, а вывод/уменьшение баланса через этот метод недоступны.
- Нельзя считать, что стакан/сделки доступны с той же глубиной и задержкой, что и свечи.
- Нельзя считать, что timeout означает неуспешную заявку.
- Нельзя считать касание high/low внутри OHLC свечи доказательством исполнения лимитного/стоп ордера.
- Нельзя включать LIVE потому, что backtest показал положительный PnL.

**EN.**

- It cannot be assumed that MOEX ISS/AlgoPack always gives the full historical period without authorization; for FORTS candles, separately check the AlgoPack product, delay and rights.
- GetCandles or the annual ZIP cannot be considered to contain the history of each futures contract since its inception; A coverage matrix is ​​required for each series.
- It cannot be assumed that the same ticker for two providers guarantees one instrument/trading mode.
- It cannot be considered that Sandbox completely emulates market liquidity, margin and real fills: the documentation indicates a simplified calculation of liquidity/leverage, the absence of calculation of a number of margin indicators and execution based on the latest exchange transactions.
- It cannot be assumed that the Sandbox account will exist permanently: T-Invest can delete it; the local system should save audit/order history and create a new account only with an explicit command.
- SandboxPayIn cannot be considered cancelled/withdrawn: the API only allows positive RUB deposits, and withdrawals/decreases of balance through this method are not available.
- It cannot be assumed that the order book/trades are available with the same depth and delay as the candles.
- Timeout cannot be considered to mean an unsuccessful application.
- Touching the high/low inside the OHLC candle cannot be considered proof of the execution of a limit/stop order.
- You cannot turn on LIVE because the backtest showed a positive PnL.

### 14.2. Sandbox-specific constraints to encode in product

**RU.**

- Три месяца от последнего использования — ориентир срока хранения sandbox account в документации, но API не обещает retention/SLA; считать это cleanup policy брокера, не гарантией.
- При `GetSandboxAccounts` запрашивать `ACCOUNT_STATUS_ALL`, если этот enum присутствует в текущем protobuf/SDK; provider DTO хранить рядом с canonical status.
- Создание/пополнение/закрытие — внешние write side effects. Для timeout/504/connection reset не повторять вызов автоматически, сначала искать результат через GetSandboxAccounts, операции, portfolio/positions и локальный operation journal.
- `SandboxPayIn` — не платёжная система: разрешить только RUB и положительную сумму; в UI написать, что списание/вывод недоступны. Верхнюю границу 30 млн RUB реализовать как консервативную серверную валидацию и дополнительно сверить семантику лимита с актуальным контрактом/ответом API перед релизом.
- Перед CloseSandboxAccount показывать незавершённые заявки/позиции, требовать явное подтверждение. Не полагаться на недокументированные предположения о том, как брокер закрывает счёт с открытыми объектами.
- Sandbox market execution не эквивалентен биржевому fill simulation. Для проверки алгоритмов исполнения дополнять Sandbox собственным PAPER simulator и event-based тестами.

**EN.**

- Three months from the last use is a guideline for the shelf life of a sandbox account in the documentation, but the API does not promise retention/SLA; Consider this broker's cleanup policy not a guarantee.
- When `GetSandboxAccounts` request `ACCOUNT_STATUS_ALL` if this enum is present in the current protobuf/SDK; provider DTO should be stored next to canonical status.
- Creation/replenishment/closing - external write side effects. For timeout/504/connection reset not to retry the call automatically, first look for the result through GetSandboxAccounts, operations, portfolio/positions and the local operation journal.
- `SandboxPayIn` is not a payment system: allow only RUB and a positive amount; write in the UI that write-off/withdrawal is not available. Implement the upper limit of 30 million RUB as a conservative server-side validation and additionally check the semantics of the limit with the current contract/API response before release.
- Before CloseSandboxAccount, show unfinished applications/positions and require explicit confirmation. Do not rely on undocumented assumptions about how the broker closes an account with open objects.
- Sandbox market execution is not equivalent to stock fill simulation. To test execution algorithms, supplement Sandbox with your own PAPER simulator and event-based tests.


---

## 15. Решения, которые не нужно принимать заранее

**RU.** Чтобы не переусложнить первый релиз, отложить следующие вопросы до появления конкретной нагрузки/требования:

**EN.** To avoid overcomplicating the first release, defer the following questions until a specific workload/requirement arises:

**RU.**

1. TimescaleDB vs vanilla PostgreSQL partitioning — принять по результату измерений.
2. Redis — добавить при необходимости low-latency cache/fan-out/coordination; не добавлять «потому что так принято».
3. NestJS vs Fastify — выбрать Fastify для небольшого backend, но не менять framework ради предпочтений агента.
4. Большой charting package — выбрать после UX прототипа; не смешивать chart state с market data state.
5. `invest-engine-node` vs собственный simulator — принять после spike BL-060, а не по названию пакета.
6. LLM-анализ рынка — только отдельный advisory layer после появления базовых deterministic signals; никаких полномочий на order execution.
7. Микросервисы — только при независимом масштабировании/отказоустойчивости, подтверждённых метриками.

**EN.**

1. TimescaleDB vs vanilla PostgreSQL partitioning - accept based on measurement results.
2. Redis - add low-latency cache/fan-out/coordination if necessary; Don’t add “because it’s customary.”
3. NestJS vs Fastify - choose Fastify for a small backend, but do not change the framework for the sake of agent preferences.
4. Large charting package - choose after the UX prototype; Do not mix chart state with market data state.
5. `invest-engine-node` vs own simulator - accept after spike BL-060, and not by the package name.
6. LLM market analysis - only a separate advisory layer after the appearance of basic deterministic signals; no order execution powers.
7. Microservices - only with independent scaling/fault tolerance, confirmed by metrics.

---

## 16. Официальные источники и reference links

**RU.** Проверять перед каждой интеграцией: API-контракт, лимиты, доступность методов и семантику полей могут изменяться. Дата первоначальной сверки этого плана — 8 ноября 2026 г.

**EN.** Check before each integration: API contract, limits, method availability and field semantics may change. The initial reconciliation date for this plan is November 8, 2026.

### T-Invest API / T-Invest API

**RU.**

- [Начало работы](https://developer.tbank-online.com/invest/intro/intro/)
- [Каталог сервисов API](https://developer.tbank-online.com/invest/api)
- [MarketDataService — котировки, свечи и стакан](https://developer.tbank-online.com/invest/services/quotes/marketdata/)
- [OrdersService — выставление, отмена и статусы](https://developer.tbank-online.com/invest/api/orders-service)
- [Описание PostOrder и идемпотентный `order_id`](https://developer.tbank-online.com/invest/services/orders/head-orders/)
- [Лимиты API](https://developer.tbank-online.com/invest/intro/intro/limits)
- [Рекомендуемые deadlines запросов](https://developer.tbank-online.com/invest/intro/developer/deadlines)
- [Sandbox — обзор, ограничения и жизненный цикл счёта](https://developer.tbank.ru/invest/intro/developer/sandbox)
- [SandboxService — перечень методов](https://developer.tbank.ru/invest/intro/developer/sandbox/methods)
- [GetSandboxAccounts — статусы и список счетов](https://developer.tbank.ru/invest/api/sandbox-service-get-sandbox-accounts)
- [SandboxPayIn — пополнение](https://developer.tbank.ru/invest/api/sandbox-service-sandbox-pay-in)
- [Sandbox/prod endpoints и различия контуров](https://developer.tbank.ru/invest/intro/developer/sandbox/url_difference)
- [Sandbox FAQ — исполнение заявок и пропавший счёт](https://developer.tbank.ru/invest/intro/developer/sandbox/faq_sandbox/)
- [JS/TS SDK FAQ](https://developer.tbank-online.com/invest/sdk/faq_js)

**EN.**

- [Getting started](https://developer.tbank-online.com/invest/intro/intro/)
- [API Services Catalog](https://developer.tbank-online.com/invest/api)
- [MarketDataService - quotes, candles and order book](https://developer.tbank-online.com/invest/services/quotes/marketdata/)
- [OrdersService - issuing, canceling and statuses](https://developer.tbank-online.com/invest/api/orders-service)
- [Description of PostOrder and idempotent `order_id`](https://developer.tbank-online.com/invest/services/orders/head-orders/)
- [API limits](https://developer.tbank-online.com/invest/intro/intro/limits)
- [Recommended request deadlines](https://developer.tbank-online.com/invest/intro/developer/deadlines)
- [Sandbox - review, limitations and account life cycle](https://developer.tbank.ru/invest/intro/developer/sandbox)
- [SandboxService - list of methods](https://developer.tbank.ru/invest/intro/developer/sandbox/methods)
- [GetSandboxAccounts - statuses and list of accounts](https://developer.tbank.ru/invest/api/sandbox-service-get-sandbox-accounts)
- [SandboxPayIn - replenishment](https://developer.tbank.ru/invest/api/sandbox-service-sandbox-pay-in)
- [Sandbox/prod endpoints and contour differences](https://developer.tbank.ru/invest/intro/developer/sandbox/url_difference)
- [Sandbox FAQ - execution of orders and missing account](https://developer.tbank.ru/invest/intro/developer/sandbox/faq_sandbox/)
- [JS/TS SDK FAQ](https://developer.tbank-online.com/invest/sdk/faq_js)

### `invest-js` SDK / `invest-js` SDK

**RU.**

- [Репозиторий `invest-js`](https://opensource.tbank.ru/invest/invest-js)
- [npm profile `@ttech-pub`](https://www.npmjs.com/~ttech-pub)
- [Node SDK package](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node)
- [Core package](https://www.npmjs.com/package/@ttech-pub/invest-core)
- [Engine package](https://www.npmjs.com/package/@ttech-pub/invest-engine-node)

**EN.**

- [Repository `invest-js`](https://opensource.tbank.ru/invest/invest-js)
- [npm profile `@ttech-pub`](https://www.npmjs.com/~ttech-pub)
- [Node SDK package](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node)
- [Core package](https://www.npmjs.com/package/@ttech-pub/invest-core)
- [Engine package](https://www.npmjs.com/package/@ttech-pub/invest-engine-node)

### MOEX ISS / MOEX ISS

- [MOEX — Program interface for ISS](https://www.moex.com/a8531)
- [MOEX — Programming interface to the ISS](https://www.moex.com/a2920)
- [ISS interactive API reference](https://iss.moex.com/iss/reference/)

---

## 17. Источники и контракты для futures history (добавлено в v1.1)

**RU.** Перед реализацией адаптера сверять изменения документации и установленную версию SDK. Базовые официальные источники:

**EN.** Before implementing the adapter, check the documentation changes and the installed version of the SDK. Basic official sources:

**RU.**

- T-Invest — исторические котировки, `GetCandles`, интервалы и лимиты: https://developer.tbank-online.com/invest/intro/intro/load_history
- T-Invest — gRPC/REST методы Market Data, `GetCandlesRequest`, `instrument_id`, `candle_source_type`, `HistoricCandle`: https://developer.tbank-online.com/invest/services/quotes/marketdata/
- T-Invest — годовые ZIP-архивы минутных свечей: https://developer.tbank-online.com/invest/services/quotes/get_history
- T-Invest — History MD: доступность архивов не для всех инструментов, структура минутных свечей, лимит скачивания, пример `CRZ5_SPBFUT`: https://developer.tbank-online.com/invest/services/history-md/head-history-md
- T-Invest — каталог `Futures`/`FutureBy` и `Indicatives` как отдельной категории underlying: https://developer.tbank-online.com/invest/services/instruments/head-instruments
- MOEX AlgoPack — OHLCV candles для одного FORTS futures contract: https://moexalgo.github.io/docs/api/get-futures-candles/
- MOEX ISS Developer Manual — historical namespace `/iss/history`, свечи и ограничения доступа к historical data: https://www.moex.com/files/4be999zbzp80bx2bgmwayrtyx0

**EN.**

- T-Invest - historical quotes, `GetCandles`, intervals and limits: https://developer.tbank-online.com/invest/intro/intro/load_history
- T-Invest - gRPC/REST methods Market Data, `GetCandlesRequest`, `instrument_id`, `candle_source_type`, `HistoricCandle`: https://developer.tbank-online.com/invest/services/quotes/marketdata/
- T-Invest - annual ZIP archives of minute candles: https://developer.tbank-online.com/invest/services/quotes/get_history
- T-Invest - History MD: archive availability is not for all instruments, structure of minute candles, download limit, example `CRZ5_SPBFUT`: https://developer.tbank-online.com/invest/services/history-md/head-history-md
- T-Invest - catalog `Futures`/`FutureBy` and `Indicatives` as a separate underlying category: https://developer.tbank-online.com/invest/services/instruments/head-instruments
- MOEX AlgoPack - OHLCV candles for one FORTS futures contract: https://moexalgo.github.io/docs/api/get-futures-candles/
- MOEX ISS Developer Manual - historical namespace `/iss/history`, candles and access restrictions to historical data: https://www.moex.com/files/4be999zbzp80bx2bgmwayrtyx0

### Minimum manual smoke test before merging BL-031 / Минимальный ручной smoke test перед merge BL-031

**RU.**

1. Через T-Invest `Futures`/`FutureBy` выбрать один действующий commodity future и один действующий index future. Сохранить instrument UID, ticker/class code, underlying UID, expiry и instrument spec.
2. Через `GetCandles` запросить по каждому UID несколько дней `1m`, а также `1d` на более длинном периоде. Записать request window, response count, первую/последнюю свечу, `is_complete`, volume и currency/price unit.
3. Проверить даты `first_1min_candle_date` и `first_1day_candle_date`; не делать вывод о глубине истории по одному короткому ответу.
4. Для тех же UID проверить годовые ZIP-архивы. Отсутствие архива — допустимый результат API coverage, но должно отображаться как `unavailable`.
5. Проверить минимум один истёкший контракт. Если текущий `Futures` catalog его не возвращает, разрешить поиск по сохранённому UID и идентификатору `ticker + class_code`; не подменять его новым контрактом с похожим тикером.
6. Сверить один контракт с MOEX AlgoPack FORTS endpoint, если доступ к нему подключён. Сравнение допускается только после выравнивания источника, временной зоны, торговой сессии, интервала и задержки.

**EN.**

1. Through T-Invest `Futures`/`FutureBy` select one valid commodity future and one valid index future. Save instrument UID, ticker/class code, underlying UID, expiry and instrument spec.
2. Through `GetCandles`, request for each UID several days `1m`, as well as `1d` over a longer period. Write down the request window, response count, first/last candle, `is_complete`, volume and currency/price unit.
3. Check the dates `first_1min_candle_date` and `first_1day_candle_date`; Don't infer the depth of a story from one short answer.
4. For the same UIDs, check the annual ZIP archives. The absence of an archive is a valid result of API coverage, but should be displayed as `unavailable`.
5. Check at least one expired contract. If the current `Futures` catalog does not return it, allow searching by the saved UID and identifier `ticker + class_code`; do not replace it with a new contract with a similar ticker.
6. Check one contract with MOEX AlgoPack FORTS endpoint, if access to it is connected. Comparison is allowed only after aligning the source, time zone, trading session, interval and delay.

**RU.**

**Gate:** пока эти проверки не пройдены, нельзя заявлять поддержку «полной истории фьючерсов» и нельзя использовать непроверенную глубину данных для backtest. В UI показывать реальный coverage per contract/provider/interval, а не общий бейдж «история загружена».

**EN.**

**Gate:** Until these checks are passed, support for “full futures history” cannot be claimed and unverified data depth cannot be used for backtest. In the UI, show real coverage per contract/provider/interval, and not a general “history loaded” badge.

## 18. Итоговая рекомендуемая стратегия

**RU.** Реализовывать проект вертикальными срезами и закрывать качество данных до перехода к торговле:

**EN.** Implement the project in vertical slices and ensure data quality before moving on to trading:

**RU.**

1. **Сначала** monorepo, domain contracts, Decimal, provider adapters и mapping инструментов.
2. **Затем** PostgreSQL, исторические загрузчики, checkpoint/retry/data gaps и график истории.
3. **Далее** realtime streams, freshness checks, индикаторы и объяснимые сигналы.
4. **После** — event-driven backtest с fees/slippage и out-of-sample evaluation.
5. **Затем** — Sandbox Account Management Service и Admin UI: provision, sync/recovery, funding, close, audit и UI E2E.
6. **После этого** — ручные Sandbox orders, order state machine, idempotency и reconciliation.
7. **Только после длительного PAPER и отдельного sign-off** — ограниченный LIVE_GUARDED.

**EN.**

1. **First** monorepo, domain contracts, Decimal, provider adapters and mapping tools.
2. **Then** PostgreSQL, historical loaders, checkpoint/retry/data gaps and history graph.
3. **Next** realtime streams, freshness checks, indicators and explainable signals.
4. **After** - event-driven backtest with fees/slippage and out-of-sample evaluation.
5. **Then** - Sandbox Account Management Service and Admin UI: provision, sync/recovery, funding, close, audit and UI E2E.
6. **After that** - manual Sandbox orders, order state machine, idempotency and reconciliation.
7. **Only after a long PAPER and a separate sign-off** - limited LIVE_GUARDED.

### First action / Первое действие

**RU.**

Начать с **BL-001**. В первом PR не реализовывать брокерский API, индикаторы или Admin UI. Цель PR — получить чистую, воспроизводимую основу monorepo, на которой все последующие задачи можно безопасно выполнять и проверять.

**EN.**

Start with **BL-001**. The first PR does not implement the brokerage API, indicators or Admin UI. The goal of PR is to have a clean, reproducible monorepo base on which all subsequent tasks can be safely performed and tested.
