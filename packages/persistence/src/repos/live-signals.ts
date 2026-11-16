import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';

export type LiveSignalDirection = 'buy' | 'sell' | 'close' | 'hold';
export type LiveSignalStatus =
  | 'new'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'executed'
  | 'invalidated';

export type LiveSignalRow = {
  id: string;
  instrumentUid: string;
  ticker: string | null;
  intervalCode: string;
  eventKey: string;
  direction: LiveSignalDirection;
  status: LiveSignalStatus;
  referencePrice: string;
  reasons: unknown;
  features: unknown;
  sourceEventTime: string;
  createdAt: string;
};

export type NewLiveSignal = {
  id: string;
  instrumentUid: string;
  ticker?: string | null;
  intervalCode: string;
  eventKey: string;
  direction: LiveSignalDirection;
  status: LiveSignalStatus;
  referencePrice: string;
  reasons: unknown;
  features: unknown;
  sourceEventTime: string;
};

export type LiveSignalsRepository = {
  insert: (signal: NewLiveSignal) => Promise<LiveSignalRow>;
  listRecent: (limit: number) => Promise<LiveSignalRow[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDirection(value: unknown): value is LiveSignalDirection {
  return value === 'buy' || value === 'sell' || value === 'close' || value === 'hold';
}

function isStatus(value: unknown): value is LiveSignalStatus {
  return (
    value === 'new' ||
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'expired' ||
    value === 'executed' ||
    value === 'invalidated'
  );
}

function mapRow(value: unknown): LiveSignalRow {
  if (!isRecord(value)) {
    throw new Error('Invalid live_signals row');
  }
  const id = value.id;
  const instrumentUid = value.instrumentUid;
  const intervalCode = value.intervalCode;
  const eventKey = value.eventKey;
  const direction = value.direction;
  const status = value.status;
  const referencePrice = value.referencePrice;
  const sourceEventTime = value.sourceEventTime;
  const createdAt = value.createdAt;
  if (
    typeof id !== 'string' ||
    typeof instrumentUid !== 'string' ||
    typeof intervalCode !== 'string' ||
    typeof eventKey !== 'string' ||
    !isDirection(direction) ||
    !isStatus(status) ||
    typeof referencePrice !== 'string' ||
    typeof sourceEventTime !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    throw new Error('Invalid live_signals fields');
  }
  const ticker = value.ticker;
  return {
    id,
    instrumentUid,
    ticker: typeof ticker === 'string' ? ticker : null,
    intervalCode,
    eventKey,
    direction,
    status,
    referencePrice,
    reasons: value.reasons ?? [],
    features: value.features ?? {},
    sourceEventTime,
    createdAt,
  };
}

const SIGNAL_COLS = `
  id::text AS "id",
  instrument_uid AS "instrumentUid",
  ticker,
  interval_code AS "intervalCode",
  event_key AS "eventKey",
  direction,
  status,
  reference_price::text AS "referencePrice",
  reasons,
  features,
  source_event_time AS "sourceEventTime",
  created_at AS "createdAt"
`;

export function createLiveSignalsRepository(db: DbExecutor): LiveSignalsRepository {
  return {
    async insert(signal) {
      const row = await db.queryJsonValue(
        `
        WITH upserted AS (
          INSERT INTO live_signals (
            id, instrument_uid, ticker, interval_code, event_key, direction, status,
            reference_price, reasons, features, source_event_time
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8::numeric, $9::jsonb, $10::jsonb, $11::timestamptz
          )
          ON CONFLICT (instrument_uid, interval_code, event_key) DO UPDATE SET
            status = EXCLUDED.status,
            reference_price = EXCLUDED.reference_price,
            reasons = EXCLUDED.reasons,
            features = EXCLUDED.features
          RETURNING ${SIGNAL_COLS}
        )
        SELECT row_to_json(upserted) FROM upserted
        `.trim(),
        [
          signal.id,
          signal.instrumentUid,
          signal.ticker ?? null,
          signal.intervalCode,
          signal.eventKey,
          signal.direction,
          signal.status,
          signal.referencePrice,
          JSON.stringify(signal.reasons),
          JSON.stringify(signal.features),
          signal.sourceEventTime,
        ],
      );
      return mapRow(row);
    },

    async listRecent(limit) {
      const safeLimit = Math.max(1, Math.min(limit, 200));
      const rows = await db.queryJson(
        jsonAggSql(
          `SELECT ${SIGNAL_COLS} FROM live_signals ORDER BY created_at DESC LIMIT ${safeLimit}`,
        ),
      );
      return rows.map(mapRow);
    },
  };
}

export function createMemoryLiveSignalsRepository(): LiveSignalsRepository {
  const byKey = new Map<string, LiveSignalRow>();

  return {
    async insert(signal) {
      const key = `${signal.instrumentUid}|${signal.intervalCode}|${signal.eventKey}`;
      const row: LiveSignalRow = {
        id: signal.id,
        instrumentUid: signal.instrumentUid,
        ticker: signal.ticker ?? null,
        intervalCode: signal.intervalCode,
        eventKey: signal.eventKey,
        direction: signal.direction,
        status: signal.status,
        referencePrice: signal.referencePrice,
        reasons: signal.reasons,
        features: signal.features,
        sourceEventTime: signal.sourceEventTime,
        createdAt: new Date().toISOString(),
      };
      byKey.set(key, row);
      return row;
    },

    async listRecent(limit) {
      return [...byKey.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Math.max(1, Math.min(limit, 200)));
    },
  };
}
