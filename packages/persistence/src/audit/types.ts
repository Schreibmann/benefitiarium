import type { IsoDateTime } from '@moex/domain';

export type AuditActorType = 'operator' | 'system' | 'worker' | 'api';

export type AuditResult = 'accepted' | 'rejected' | 'succeeded' | 'failed' | 'unknown';

export type AuditEntry = {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  correlationId: string;
  result: AuditResult;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: IsoDateTime;
};

export type NewAuditEntry = {
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  correlationId: string;
  result: AuditResult;
  reason?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: IsoDateTime;
};
