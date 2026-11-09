import type { AuditLogRepository } from './repository.js';
import type { AuditEntry, NewAuditEntry } from './types.js';

/**
 * Application-facing audit API (BL-023).
 * Writes are append-only; secrets are redacted inside the repository.
 */
export type AuditLogService = {
  record: (entry: NewAuditEntry) => Promise<AuditEntry>;
  listByCorrelationId: (correlationId: string) => Promise<AuditEntry[]>;
  listByTarget: (targetType: string, targetId: string, limit?: number) => Promise<AuditEntry[]>;
};

export function createAuditLogService(repository: AuditLogRepository): AuditLogService {
  return {
    record: (entry) => {
      if (entry.action.trim().length === 0) {
        return Promise.reject(new Error('audit action is required'));
      }
      if (entry.correlationId.trim().length === 0) {
        return Promise.reject(new Error('audit correlationId is required'));
      }
      return repository.append(entry);
    },
    listByCorrelationId: (correlationId) => repository.listByCorrelationId(correlationId),
    listByTarget: (targetType, targetId, limit) =>
      repository.listByTarget(targetType, targetId, limit),
  };
}
