-- Market trigger alerts (not trading signals) + Telegram/email delivery queue.
-- Instruments are identified by provider instrument_uid (T-Invest), not instruments.id.

CREATE TABLE market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id TEXT NOT NULL,
  trigger_version TEXT NOT NULL,
  instrument_uid TEXT NOT NULL,
  ticker TEXT,
  timeframe TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('approach', 'cross')),
  level_name TEXT NOT NULL,
  level_value NUMERIC(28, 12) NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('above', 'below', 'up', 'down')),
  price NUMERIC(28, 12) NOT NULL,
  previous_price NUMERIC(28, 12),
  eval_mode TEXT NOT NULL CHECK (eval_mode IN ('close', 'intrabar')),
  period_id TEXT NOT NULL,
  candle_time TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);

CREATE INDEX market_signals_feed_idx
  ON market_signals (created_at DESC);

CREATE INDEX market_signals_approach_state_idx
  ON market_signals (instrument_uid, timeframe, period_id, kind)
  WHERE kind = 'approach';

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('telegram')),
  target TEXT NOT NULL,
  signal_id UUID NOT NULL REFERENCES market_signals(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  text TEXT NOT NULL,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX notifications_due_idx
  ON notifications (next_attempt_at ASC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX notifications_signal_idx
  ON notifications (signal_id);
