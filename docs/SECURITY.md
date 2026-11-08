# Security notes (MVP stub)

Full checklist: [`TECHNICAL_BACKLOG.md`](TECHNICAL_BACKLOG.md) §12.

## Hard rules for M0+

- Never commit `.env`, tokens, or broker credentials.
- Do not put full-access T-Invest tokens in the web app, `VITE_*`, or browser storage.
- `LIVE_TRADING_ENABLED` defaults to `false`; live stays off until a human gate.
- Only `worker-execution` may receive broker write credentials (later milestones).
- Sandbox and production credentials stay in separate env configs.
- Logs must never contain Authorization headers or raw tokens.

## Local secrets

1. Copy `.env.example` → `.env`
2. Fill sandbox token locally
3. Keep `.env` gitignored
