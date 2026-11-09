import type { IsoDateTime, UUID } from '@moex/domain';

/** Durable outbox row (`outbox_events`). `id` is the stable `eventId` for consumers. */
export type OutboxEvent = {
  id: UUID;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: IsoDateTime;
  publishedAt: IsoDateTime | null;
  attempts: number;
  lastError: string | null;
};

export type NewOutboxEvent = {
  id: UUID;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt?: IsoDateTime;
};
