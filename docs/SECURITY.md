# Security notes (MVP stub) / Заметки по безопасности (MVP заготовка)

**RU.** Полный чеклист: [`TECHNICAL_BACKLOG.md`](TECHNICAL_BACKLOG.md) §12.

**EN.** Full checklist: [`TECHNICAL_BACKLOG.md`](TECHNICAL_BACKLOG.md) §12.

## Hard rules for M0+ / Жёсткие правила для M0+

**RU.**

- Никогда не коммитить `.env`, токены и учётные данные брокера.
- Не помещать full-access T-Invest токены в web app, `VITE_*` или browser storage.
- Разделять credentials по назначению:
  - `TINVEST_SANDBOX_TOKEN` — только sandbox URL / sandbox accounts (`createSandboxSdk` allowlists `sandbox-invest-public-api.tbank.ru`)
  - `TINVEST_READ_ONLY_TOKEN` — production/invest read paths (catalog, history, market data); никогда для записи заявок
  - `TINVEST_FULL_ACCESS_TOKEN` — зарезервирован для `worker-execution` позже; не загружать в api/web/strategy
  - `TINVEST_SANDBOX_ACCOUNT_ID` — sandbox account для вызовов SandboxService
- Записи create/fund/close sandbox: API ставит durable commands в очередь; только `worker-execution` может вызывать provider.
- Admin UI `/admin/sandbox` сам по себе не является авторизацией — нужна server-side ADMIN (или single-operator) policy (BL-088).
- `LIVE_TRADING_ENABLED` по умолчанию `false`; live остаётся выключен, пока человек явно не разрешит.
- Только `worker-execution` может получать broker write credentials (поздние milestones).
- Sandbox и production credentials хранятся в отдельных env configs.
- Логи никогда не должны содержать Authorization headers или сырые токены.

**EN.**

- Never commit `.env`, tokens, or broker credentials.
- Do not put full-access T-Invest tokens in the web app, `VITE_*`, or browser storage.
- Split credentials by purpose:
  - `TINVEST_SANDBOX_TOKEN` — sandbox URL / sandbox accounts only (`createSandboxSdk` allowlists `sandbox-invest-public-api.tbank.ru`)
  - `TINVEST_READ_ONLY_TOKEN` — production/invest read paths (catalog, history, market data); never for order writes
  - `TINVEST_FULL_ACCESS_TOKEN` — reserved for `worker-execution` later; do not load into api/web/strategy
  - `TINVEST_SANDBOX_ACCOUNT_ID` — sandbox account for SandboxService calls
- Sandbox create/fund/close writes: API enqueues durable commands; only `worker-execution` may call the provider.
- Admin UI `/admin/sandbox` is not authorization by itself — server-side ADMIN (or single-operator) policy required (BL-088).
- `LIVE_TRADING_ENABLED` defaults to `false`; live stays off until a human gate.
- Only `worker-execution` may receive broker write credentials (later milestones).
- Sandbox and production credentials stay in separate env configs.
- Logs must never contain Authorization headers or raw tokens.

## Local secrets / Локальные секреты

**RU.**

1. Скопировать `.env.example` → `.env`
2. Заполнить `TINVEST_SANDBOX_TOKEN` и/или `TINVEST_READ_ONLY_TOKEN` локально
3. Держать `.env` в gitignore

**EN.**

1. Copy `.env.example` → `.env`
2. Fill `TINVEST_SANDBOX_TOKEN` and/or `TINVEST_READ_ONLY_TOKEN` locally
3. Keep `.env` gitignored
