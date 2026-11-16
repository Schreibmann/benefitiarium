import { parseIsoDateTime, parseUuid, type UUID } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import type {
  ApproachStateRow,
  InsertSignalWithNotificationResult,
  MarketSignal,
  MarketSignalEvalMode,
  MarketSignalKind,
  MarketSignalSide,
  NewLogNotification,
  NewMarketSignal,
  NewNotificationForSignal,
  Notification,
  NotificationChannel,
  NotificationStatus,
} from './market-signals-types.js';

export type MarketSignalsRepository = {
  insertSignalWithNotification: (input: {
    signal: NewMarketSignal;
    notification: NewNotificationForSignal;
  }) => Promise<InsertSignalWithNotificationResult>;
  enqueueLogNotification: (notification: NewLogNotification) => Promise<Notification>;
  listActiveApproachState: (input?: {
    instrumentUids?: readonly string[];
    periodIds?: readonly string[];
  }) => Promise<ApproachStateRow[]>;
  claimDueNotifications: (limit?: number) => Promise<Notification[]>;
  markSent: (
    id: UUID,
    input: { providerMessageId: string; sentAt: string },
  ) => Promise<Notification>;
  markFailed: (
    id: UUID,
    input: {
      errorMessage: string;
      retryAfterSeconds?: number;
      dead?: boolean;
      maxAttempts?: number;
    },
  ) => Promise<Notification>;
};

const SIGNAL_JSON = `
  id::text AS "id",
  trigger_id AS "triggerId",
  trigger_version AS "triggerVersion",
  instrument_uid AS "instrumentUid",
  ticker,
  timeframe,
  kind,
  level_name AS "levelName",
  level_value::text AS "levelValue",
  side,
  price::text AS "price",
  previous_price::text AS "previousPrice",
  eval_mode AS "evalMode",
  period_id AS "periodId",
  candle_time AS "candleTime",
  payload,
  dedupe_key AS "dedupeKey",
  created_at AS "createdAt"
`;

const NOTIFICATION_JSON = `
  id::text AS "id",
  channel,
  target,
  signal_id::text AS "signalId",
  thread_id AS "threadId",
  status,
  attempts,
  next_attempt_at AS "nextAttemptAt",
  last_error AS "lastError",
  text,
  provider_message_id AS "providerMessageId",
  created_at AS "createdAt",
  sent_at AS "sentAt"
`;

/** Qualified for UPDATE … FROM due (avoids ambiguous id). */
const NOTIFICATION_JSON_FROM_N = `
  n.id::text AS "id",
  n.channel,
  n.target,
  n.signal_id::text AS "signalId",
  n.thread_id AS "threadId",
  n.status,
  n.attempts,
  n.next_attempt_at AS "nextAttemptAt",
  n.last_error AS "lastError",
  n.text,
  n.provider_message_id AS "providerMessageId",
  n.created_at AS "createdAt",
  n.sent_at AS "sentAt"
`;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${key}`);
  }
  return value;
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string|null field ${key}`);
  }
  return value;
}

function requiredNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected number field ${key}`);
  }
  return value;
}

function parseKind(value: string): MarketSignalKind {
  if (
    value === 'approach' ||
    value === 'cross' ||
    value === 'consolidation' ||
    value === 'entry_confirm'
  ) {
    return value;
  }
  throw new Error(`Invalid market signal kind: ${value}`);
}

function optionalNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected number|null field ${key}`);
  }
  return value;
}

function parseSide(value: string): MarketSignalSide {
  if (value === 'above' || value === 'below' || value === 'up' || value === 'down') {
    return value;
  }
  throw new Error(`Invalid market signal side: ${value}`);
}

function parseEvalMode(value: string): MarketSignalEvalMode {
  if (value === 'close' || value === 'intrabar') {
    return value;
  }
  throw new Error(`Invalid eval mode: ${value}`);
}

function parseChannel(value: string): NotificationChannel {
  if (value === 'telegram') {
    return value;
  }
  throw new Error(`Invalid notification channel: ${value}`);
}

function parseStatus(value: string): NotificationStatus {
  if (value === 'pending' || value === 'sending' || value === 'sent' || value === 'dead') {
    return value;
  }
  throw new Error(`Invalid notification status: ${value}`);
}

function mapSignalRow(row: unknown): MarketSignal {
  if (!isPlainObject(row)) {
    throw new Error('Invalid market_signals row');
  }
  const payload = row.payload;
  if (!isPlainObject(payload)) {
    throw new Error('Invalid market_signals payload');
  }
  return {
    id: parseUuid(requiredString(row, 'id')),
    triggerId: requiredString(row, 'triggerId'),
    triggerVersion: requiredString(row, 'triggerVersion'),
    instrumentUid: requiredString(row, 'instrumentUid'),
    ticker: optionalString(row, 'ticker'),
    timeframe: requiredString(row, 'timeframe'),
    kind: parseKind(requiredString(row, 'kind')),
    levelName: requiredString(row, 'levelName'),
    levelValue: requiredString(row, 'levelValue'),
    side: parseSide(requiredString(row, 'side')),
    price: requiredString(row, 'price'),
    previousPrice: optionalString(row, 'previousPrice'),
    evalMode: parseEvalMode(requiredString(row, 'evalMode')),
    periodId: requiredString(row, 'periodId'),
    candleTime: parseIsoDateTime(requiredString(row, 'candleTime')),
    payload,
    dedupeKey: requiredString(row, 'dedupeKey'),
    createdAt: parseIsoDateTime(requiredString(row, 'createdAt')),
  };
}

function mapNotificationRow(row: unknown): Notification {
  if (!isPlainObject(row)) {
    throw new Error('Invalid notifications row');
  }
  const signalIdRaw = optionalString(row, 'signalId');
  return {
    id: parseUuid(requiredString(row, 'id')),
    channel: parseChannel(requiredString(row, 'channel')),
    target: requiredString(row, 'target'),
    signalId: signalIdRaw === null ? null : parseUuid(signalIdRaw),
    threadId: optionalNumber(row, 'threadId'),
    status: parseStatus(requiredString(row, 'status')),
    attempts: requiredNumber(row, 'attempts'),
    nextAttemptAt: parseIsoDateTime(requiredString(row, 'nextAttemptAt')),
    lastError: optionalString(row, 'lastError'),
    text: requiredString(row, 'text'),
    providerMessageId: optionalString(row, 'providerMessageId'),
    createdAt: parseIsoDateTime(requiredString(row, 'createdAt')),
    sentAt: (() => {
      const sentAt = optionalString(row, 'sentAt');
      return sentAt === null ? null : parseIsoDateTime(sentAt);
    })(),
  };
}

function mapApproachStateRow(row: unknown): ApproachStateRow {
  if (!isPlainObject(row)) {
    throw new Error('Invalid approach state row');
  }
  const side = requiredString(row, 'side');
  if (side !== 'above' && side !== 'below') {
    throw new Error(`Invalid approach side: ${side}`);
  }
  return {
    instrumentUid: requiredString(row, 'instrumentUid'),
    timeframe: requiredString(row, 'timeframe'),
    periodId: requiredString(row, 'periodId'),
    levelName: requiredString(row, 'levelName'),
    side,
  };
}

export function createMarketSignalsRepository(db: DbExecutor): MarketSignalsRepository {
  return {
    insertSignalWithNotification: async ({ signal, notification }) => {
      const createdAt = signal.createdAt ?? parseIsoDateTime(new Date().toISOString());
      const payloadJson = JSON.stringify(signal.payload);
      const row = await db.queryJsonValue(
        `
        WITH inserted_signal AS (
          INSERT INTO market_signals (
            id, trigger_id, trigger_version, instrument_uid, ticker, timeframe,
            kind, level_name, level_value, side, price, previous_price, eval_mode,
            period_id, candle_time, payload, dedupe_key, created_at
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6,
            $7, $8, $9::numeric, $10, $11::numeric, $12::numeric, $13,
            $14, $15::timestamptz, $16::jsonb, $17, $18::timestamptz
          )
          ON CONFLICT (dedupe_key) DO NOTHING
          RETURNING ${SIGNAL_JSON}
        ),
        inserted_notification AS (
          INSERT INTO notifications (
            id, channel, target, signal_id, thread_id, status, attempts, next_attempt_at, text, created_at
          )
          SELECT
            $19::uuid, $20, $21, inserted_signal.id::uuid, $23, 'pending', 0, $18::timestamptz, $22, $18::timestamptz
          FROM inserted_signal
          RETURNING ${NOTIFICATION_JSON}
        )
        SELECT json_build_object(
          'signal', (SELECT row_to_json(inserted_signal) FROM inserted_signal),
          'notification', (SELECT row_to_json(inserted_notification) FROM inserted_notification)
        )
        `.trim(),
        [
          signal.id,
          signal.triggerId,
          signal.triggerVersion,
          signal.instrumentUid,
          signal.ticker,
          signal.timeframe,
          signal.kind,
          signal.levelName,
          signal.levelValue,
          signal.side,
          signal.price,
          signal.previousPrice,
          signal.evalMode,
          signal.periodId,
          signal.candleTime,
          payloadJson,
          signal.dedupeKey,
          createdAt,
          notification.id,
          notification.channel,
          notification.target,
          notification.text,
          notification.threadId ?? null,
        ],
      );

      if (!isPlainObject(row)) {
        throw new Error('Invalid insertSignalWithNotification result');
      }
      const signalRaw = row.signal;
      const notificationRaw = row.notification;
      if (signalRaw === null || signalRaw === undefined) {
        return { inserted: false, signal: null, notification: null };
      }
      return {
        inserted: true,
        signal: mapSignalRow(signalRaw),
        notification:
          notificationRaw === null || notificationRaw === undefined
            ? null
            : mapNotificationRow(notificationRaw),
      };
    },

    enqueueLogNotification: async (notification) => {
      const createdAt = parseIsoDateTime(new Date().toISOString());
      const row = await db.queryJsonValue(
        `
        WITH inserted AS (
          INSERT INTO notifications (
            id, channel, target, signal_id, thread_id, status, attempts, next_attempt_at, text, created_at
          ) VALUES (
            $1::uuid, $2, $3, NULL, $4, 'pending', 0, $5::timestamptz, $6, $5::timestamptz
          )
          RETURNING ${NOTIFICATION_JSON}
        )
        SELECT row_to_json(inserted) FROM inserted
        `.trim(),
        [
          notification.id,
          notification.channel,
          notification.target,
          notification.threadId,
          createdAt,
          notification.text,
        ],
      );
      return mapNotificationRow(row);
    },

    listActiveApproachState: async (input = {}) => {
      const instrumentUidsJson = JSON.stringify(input.instrumentUids ?? []);
      const periodIdsJson = JSON.stringify(input.periodIds ?? []);
      const rows = await db.queryJson(
        jsonAggSql(
          `
          SELECT DISTINCT
            instrument_uid AS "instrumentUid",
            timeframe,
            period_id AS "periodId",
            level_name AS "levelName",
            side
          FROM market_signals
          WHERE kind = 'approach'
            AND side IN ('above', 'below')
            AND (
              jsonb_array_length($1::jsonb) = 0
              OR instrument_uid IN (SELECT jsonb_array_elements_text($1::jsonb))
            )
            AND (
              jsonb_array_length($2::jsonb) = 0
              OR period_id IN (SELECT jsonb_array_elements_text($2::jsonb))
            )
          `.trim(),
        ),
        [instrumentUidsJson, periodIdsJson],
      );
      return rows.map(mapApproachStateRow);
    },

    claimDueNotifications: async (limit = 20) => {
      const rows = await db.queryJson(
        `
        WITH due AS (
          SELECT id
          FROM notifications
          WHERE status = 'pending'
            AND next_attempt_at <= now()
          ORDER BY next_attempt_at ASC, created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        ),
        updated AS (
          UPDATE notifications n
          SET status = 'sending',
              attempts = attempts + 1
          FROM due
          WHERE n.id = due.id
          RETURNING ${NOTIFICATION_JSON_FROM_N}
        )
        SELECT COALESCE(json_agg(row_to_json(updated)), '[]'::json) FROM updated
        `.trim(),
        [limit],
      );
      return rows.map(mapNotificationRow);
    },

    markSent: async (id, input) => {
      const row = await db.queryJsonValue(
        `
        WITH updated AS (
          UPDATE notifications
          SET status = 'sent',
              provider_message_id = $2,
              sent_at = $3::timestamptz,
              last_error = NULL
          WHERE id = $1::uuid
          RETURNING ${NOTIFICATION_JSON}
        )
        SELECT row_to_json(updated) FROM updated
        `.trim(),
        [id, input.providerMessageId, input.sentAt],
      );
      return mapNotificationRow(row);
    },

    markFailed: async (id, input) => {
      const maxAttempts = input.maxAttempts ?? 10;
      const dead = input.dead === true;
      const retryAfterSeconds = input.retryAfterSeconds;
      const row = await db.queryJsonValue(
        `
        WITH updated AS (
          UPDATE notifications n
          SET
            status = CASE
              WHEN $2::boolean OR n.attempts >= $3::int THEN 'dead'
              ELSE 'pending'
            END,
            last_error = $4,
            next_attempt_at = CASE
              WHEN $2::boolean OR n.attempts >= $3::int THEN n.next_attempt_at
              ELSE now() + make_interval(secs => COALESCE($5::int, LEAST(300, power(2, n.attempts)::int)))
            END
          WHERE n.id = $1::uuid
          RETURNING ${NOTIFICATION_JSON}
        )
        SELECT row_to_json(updated) FROM updated
        `.trim(),
        [
          id,
          dead,
          maxAttempts,
          input.errorMessage,
          retryAfterSeconds === undefined ? null : retryAfterSeconds,
        ],
      );
      return mapNotificationRow(row);
    },
  };
}
