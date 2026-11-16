-- Independent Live Mode universe + runtime desired state + lightweight live signals.
-- Chart realtime stays separate (CHART leases). Live uses STRATEGY leases on favorites.

CREATE TABLE favorites (
  instrument_uid TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  figi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX favorites_created_idx ON favorites (created_at DESC);

CREATE TABLE live_runtime_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  desired_status TEXT NOT NULL CHECK (desired_status IN ('STOPPED', 'RUNNING')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO live_runtime_state (id, desired_status)
VALUES ('default', 'STOPPED')
ON CONFLICT (id) DO NOTHING;

-- Live signal store (avoids heavy strategy_versions/instruments FK until those are wired).
CREATE TABLE live_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_uid TEXT NOT NULL,
  ticker TEXT,
  interval_code TEXT NOT NULL,
  event_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell', 'close', 'hold')),
  status TEXT NOT NULL CHECK (status IN ('new', 'accepted', 'rejected', 'expired', 'executed', 'invalidated')),
  reference_price NUMERIC(28, 12) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instrument_uid, interval_code, event_key)
);

CREATE INDEX live_signals_feed_idx ON live_signals (created_at DESC, status);
