# ADR-001: Modular monolith instead of microservices / Модульный монолит вместо микросервисов

## Status / Статус

Accepted (принято)

## Context / Контекст

**RU.** Личная исследовательско-торговая платформа MOEX с одним основным разработчиком и плотной доменной логикой: рыночные данные, исследования, сигналы, торговля.

**EN.** Personal MOEX research/trading platform with one primary developer and heavy domain logic across market data, research, signals, and trading.

## Decision / Решение

**RU.** Один монорепозиторий с несколькими независимо запускаемыми процессами Node.js, разделяющими доменные и persistence-пакеты. Выделять отдельно разворачиваемые сервисы — только когда метрики докажут необходимость.

**EN.** Ship one monorepo with several independently runnable Node.js processes sharing domain/persistence packages. Split into separately deployed services only when metrics prove the need.

## Consequences / Последствия

**RU.** Ниже стоимость распределённых транзакций на ранней стадии; общие типы и миграции остаются согласованными. Границы процессов по-прежнему изолируют запись к брокеру в `worker-execution`.

**EN.** Lower distributed-transaction cost early; shared types and migrations stay coherent. Process boundaries still isolate broker write access in `worker-execution`.
