# ADR-005: Exact financial quantities / Точные финансовые величины

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Цены, деньги, комиссии, тик, вариационная маржа, маржа и размер позиции не должны использовать IEEE-754 `number` как источник истины.

**EN.** Prices, money, fees, tick value, margin, and sizing must not use IEEE-754 `number` as source of truth.

## Decision / Решение

**RU.** Десятичные типы на всём пути: Decimal-хелперы в коде приложения, `NUMERIC` в PostgreSQL, десятичные строки в API. JS `number` — только для графиков и статистики, когда точность явно допустима.

**EN.** Use decimal types end-to-end: Decimal helpers in app code, `NUMERIC` in PostgreSQL, decimal strings in API. JS `number` only for charting/stats when precision is explicitly acceptable.

## Consequences / Последствия

**RU.** Нужен пакет `@moex/decimal` и преобразование на границах SDK через строки / точные десятичные значения.

**EN.** Requires a dedicated `@moex/decimal` package and mapping at SDK boundaries via string/exact decimal values.
