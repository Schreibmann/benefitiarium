import { parseIsoDateTime } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import { redactAuditPayload } from './redact.js';
import type { AuditActorType, AuditEntry, AuditResult, NewAuditEntry } from './types.js';

export type AuditLogRepository = {
  /** Append-only write. No update/delete API by design (BL-023). */
  append: (entry: NewAuditEntry) => Promise<AuditEntry>;
  listByCorrelationId: (correlationId: string) => Promise<AuditEntry[]>;
  listByTarget: (targetType: string, targetId: string, limit?: number) => Promise<AuditEntry[]>;
};

const AUDIT_JSON = `
  id::text AS "id",
  actor_type AS "actorType",
  actor_id AS "actorId",
  action,
  target_type AS "targetType",
  target_id AS "targetId",
  correlation_id AS "correlationId",
  result,
  reason,
  payload,
  created_at AS "createdAt"
`;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseActorType(value: unknown): AuditActorType {
  if (value === 'operator' || value === 'system' || value === 'worker' || value === 'api') {
    return value;
  }
  throw new Error(`Invalid audit actorType: ${String(value)}`);
}

function parseAuditResult(value: unknown): AuditResult {
  if (
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'succeeded' ||
    value === 'failed' ||
    value === 'unknown'
  ) {
    return value;
  }
  throw new Error(`Invalid audit result: ${String(value)}`);
}

function mapAuditRow(row: unknown): AuditEntry {
  if (!isPlainObject(row)) {
    throw new Error('Invalid audit row');
  }
  const {
    id,
    actorType,
    actorId,
    action,
    targetType,
    targetId,
    correlationId,
    result,
    reason,
    payload,
    createdAt,
  } = row;
  if (
    typeof id !== 'string' ||
    (actorId !== null && typeof actorId !== 'string') ||
    typeof action !== 'string' ||
    (targetType !== null && typeof targetType !== 'string') ||
    (targetId !== null && typeof targetId !== 'string') ||
    typeof correlationId !== 'string' ||
    (reason !== null && typeof reason !== 'string') ||
    !isPlainObject(payload) ||
    typeof createdAt !== 'string'
  ) {
    throw new Error('Invalid audit row shape');
  }
  return {
    id,
    actorType: parseActorType(actorType),
    actorId,
    action,
    targetType,
    targetId,
    correlationId,
    result: parseAuditResult(result),
    reason,
    payload,
    createdAt: parseIsoDateTime(createdAt),
  };
}

export function createAuditLogRepository(db: DbExecutor): AuditLogRepository {
  return {
    append: async (entry) => {
      const createdAt = entry.createdAt ?? parseIsoDateTime(new Date().toISOString());
      const payload = redactAuditPayload(entry.payload ?? {});
      const row = await db.queryJsonValue(
        `
        WITH inserted AS (
          INSERT INTO audit_log (
            actor_type, actor_id, action, target_type, target_id,
            correlation_id, result, reason, payload, created_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9::jsonb, $10::timestamptz
          )
          RETURNING ${AUDIT_JSON}
        )
        SELECT row_to_json(inserted) FROM inserted
        `.trim(),
        [
          entry.actorType,
          entry.actorId ?? null,
          entry.action,
          entry.targetType ?? null,
          entry.targetId ?? null,
          entry.correlationId,
          entry.result,
          entry.reason ?? null,
          JSON.stringify(payload),
          createdAt,
        ],
      );
      return mapAuditRow(row);
    },

    listByCorrelationId: async (correlationId) => {
      const rows = await db.queryJson(
        jsonAggSql(
          `SELECT ${AUDIT_JSON} FROM audit_log
           WHERE correlation_id = $1
           ORDER BY created_at ASC, id ASC`,
        ),
        [correlationId],
      );
      return rows.map(mapAuditRow);
    },

    listByTarget: async (targetType, targetId, limit = 100) => {
      const rows = await db.queryJson(
        jsonAggSql(
          `SELECT ${AUDIT_JSON} FROM audit_log
           WHERE target_type = $1 AND target_id = $2
           ORDER BY created_at DESC, id DESC
           LIMIT $3`,
        ),
        [targetType, targetId, limit],
      );
      return rows.map(mapAuditRow);
    },
  };
}
