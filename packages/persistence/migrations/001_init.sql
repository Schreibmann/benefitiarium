-- BL-020 / TECHNICAL_BACKLOG v1.2 — initial schema
-- Sourced from docs/TECHNICAL_BACKLOG.md §5.2
-- Append-only migrations; do not rewrite after apply.

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
