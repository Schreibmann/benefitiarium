# ADR-008: Data source and version are part of analysis results / Источник данных и версия — часть результатов анализа

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Смешивание свечей MOEX ISS и T-Invest без происхождения данных ломает воспроизводимость и QA.

**EN.** Mixing MOEX ISS and T-Invest candles without provenance breaks reproducibility and QA.

## Decision / Решение

**RU.** Каждая свеча несёт метаданные провайдера/источника. Бэктесты привязаны к фиксированному снимку/ревизии датасета, версии стратегии, параметрам и модели издержек. Не сливать провайдеров в одну серию без явного решения.

**EN.** Every candle carries provider/source metadata. Backtests bind to fixed dataset snapshot/revision, strategy version, parameters, and cost model. Do not silently merge providers in one series.

## Consequences / Последствия

**RU.** Уникальность в схеме включает провайдера; версионирование датасета обязательно до серьёзных бэктестов.

**EN.** Schema uniqueness includes provider; dataset versioning is required before serious backtests.
