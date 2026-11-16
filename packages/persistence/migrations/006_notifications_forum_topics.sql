-- Forum topics + Live alert kinds. Log/error notifications may omit signal_id.

ALTER TABLE market_signals
  DROP CONSTRAINT IF EXISTS market_signals_kind_check;

ALTER TABLE market_signals
  ADD CONSTRAINT market_signals_kind_check
  CHECK (kind IN ('approach', 'cross', 'consolidation', 'entry_confirm'));

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS thread_id INTEGER NULL;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_signal_id_fkey;

ALTER TABLE notifications
  ALTER COLUMN signal_id DROP NOT NULL;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_signal_id_fkey
  FOREIGN KEY (signal_id) REFERENCES market_signals (id);
