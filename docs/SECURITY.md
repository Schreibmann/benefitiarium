# Security notes (MVP stub)

Full checklist: [`TECHNICAL_BACKLOG.md`](TECHNICAL_BACKLOG.md) §12.

## Hard rules for M0+

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

## Local secrets

1. Copy `.env.example` → `.env`
2. Fill `TINVEST_SANDBOX_TOKEN` and/or `TINVEST_READ_ONLY_TOKEN` locally
3. Keep `.env` gitignored
