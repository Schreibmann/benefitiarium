import { parseIsoDateTime } from '@moex/domain';
import { redactAuditPayload } from './redact.js';
import type { AuditLogRepository } from './repository.js';
import type { AuditEntry, NewAuditEntry } from './types.js';

export type MemoryAuditLogStore = AuditLogRepository & {
  snapshot: () => AuditEntry[];
};

export function createMemoryAuditLogStore(): MemoryAuditLogStore {
  const rows: AuditEntry[] = [];
  let seq = 0;

  const repo: AuditLogRepository = {
    append: async (entry: NewAuditEntry) => {
      seq += 1;
      const created: AuditEntry = {
        id: String(seq),
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        correlationId: entry.correlationId,
        result: entry.result,
        reason: entry.reason ?? null,
        payload: redactAuditPayload(entry.payload ?? {}),
        createdAt: entry.createdAt ?? parseIsoDateTime(new Date().toISOString()),
      };
      rows.push(created);
      return { ...created, payload: { ...created.payload } };
    },

    listByCorrelationId: async (correlationId) =>
      rows
        .filter((row) => row.correlationId === correlationId)
        .map((row) => ({ ...row, payload: { ...row.payload } })),

    listByTarget: async (targetType, targetId, limit = 100) =>
      rows
        .filter((row) => row.targetType === targetType && row.targetId === targetId)
        .slice()
        .reverse()
        .slice(0, limit)
        .map((row) => ({ ...row, payload: { ...row.payload } })),
  };

  return {
    ...repo,
    snapshot: () => rows.map((row) => ({ ...row, payload: { ...row.payload } })),
  };
}
