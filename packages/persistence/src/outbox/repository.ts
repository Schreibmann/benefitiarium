import { parseIsoDateTime, parseUuid, type UUID } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import type { NewOutboxEvent, OutboxEvent } from './types.js';

export type OutboxRepository = {
  enqueue: (event: NewOutboxEvent) => Promise<OutboxEvent>;
  getById: (id: UUID) => Promise<OutboxEvent | null>;
  listPending: (limit?: number) => Promise<OutboxEvent[]>;
  markPublished: (id: UUID, publishedAt: string) => Promise<OutboxEvent>;
  markAttemptFailed: (id: UUID, errorMessage: string) => Promise<OutboxEvent>;
};

const OUTBOX_JSON = `
  id::text AS "id",
  aggregate_type AS "aggregateType",
  aggregate_id AS "aggregateId",
  event_type AS "eventType",
  payload AS "payload",
  created_at AS "createdAt",
  published_at AS "publishedAt",
  attempts,
  last_error AS "lastError"
`;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapOutboxRow(row: unknown): OutboxEvent {
  if (!isPlainObject(row)) {
    throw new Error('Invalid outbox row');
  }
  const {
    id,
    aggregateType,
    aggregateId,
    eventType,
    payload,
    createdAt,
    publishedAt,
    attempts,
    lastError,
  } = row;
  if (
    typeof id !== 'string' ||
    typeof aggregateType !== 'string' ||
    typeof aggregateId !== 'string' ||
    typeof eventType !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof attempts !== 'number' ||
    (publishedAt !== null && typeof publishedAt !== 'string') ||
    (lastError !== null && typeof lastError !== 'string') ||
    !isPlainObject(payload)
  ) {
    throw new Error('Invalid outbox row shape');
  }
  return {
    id: parseUuid(id),
    aggregateType,
    aggregateId,
    eventType,
    payload,
    createdAt: parseIsoDateTime(createdAt),
    publishedAt: publishedAt === null ? null : parseIsoDateTime(publishedAt),
    attempts,
    lastError,
  };
}

export function createOutboxRepository(db: DbExecutor): OutboxRepository {
  return {
    enqueue: async (event) => {
      const createdAt = event.createdAt ?? parseIsoDateTime(new Date().toISOString());
      const payloadJson = JSON.stringify(event.payload);
      const row = await db.queryJsonValue(
        `
        WITH inserted AS (
          INSERT INTO outbox_events (
            id, aggregate_type, aggregate_id, event_type, payload, created_at
          ) VALUES (
            $1::uuid, $2, $3, $4, $5::jsonb, $6::timestamptz
          )
          RETURNING ${OUTBOX_JSON}
        )
        SELECT row_to_json(inserted) FROM inserted
        `.trim(),
        [event.id, event.aggregateType, event.aggregateId, event.eventType, payloadJson, createdAt],
      );
      return mapOutboxRow(row);
    },

    getById: async (id) => {
      const rows = await db.queryJson(
        jsonAggSql(`SELECT ${OUTBOX_JSON} FROM outbox_events WHERE id = $1::uuid`),
        [id],
      );
      const first = rows[0];
      return first === undefined ? null : mapOutboxRow(first);
    },

    listPending: async (limit = 100) => {
      const rows = await db.queryJson(
        jsonAggSql(
          `SELECT ${OUTBOX_JSON} FROM outbox_events
           WHERE published_at IS NULL
           ORDER BY created_at ASC
           LIMIT $1`,
        ),
        [limit],
      );
      return rows.map(mapOutboxRow);
    },

    markPublished: async (id, publishedAt) => {
      const row = await db.queryJsonValue(
        `
        WITH updated AS (
          UPDATE outbox_events
          SET published_at = $2::timestamptz, last_error = NULL
          WHERE id = $1::uuid
          RETURNING ${OUTBOX_JSON}
        )
        SELECT row_to_json(updated) FROM updated
        `.trim(),
        [id, publishedAt],
      );
      return mapOutboxRow(row);
    },

    markAttemptFailed: async (id, errorMessage) => {
      const row = await db.queryJsonValue(
        `
        WITH updated AS (
          UPDATE outbox_events
          SET attempts = attempts + 1, last_error = $2
          WHERE id = $1::uuid
          RETURNING ${OUTBOX_JSON}
        )
        SELECT row_to_json(updated) FROM updated
        `.trim(),
        [id, errorMessage],
      );
      return mapOutboxRow(row);
    },
  };
}
