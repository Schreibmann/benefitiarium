import { parseIsoDateTime, type UUID } from '@moex/domain';
import type { OutboxRepository } from './repository.js';
import type { OutboxEvent } from './types.js';

export type OutboxDelivery = {
  /** Transport sink (bus/queue/webhook). May be called more than once for the same event. */
  publish: (event: OutboxEvent) => Promise<void>;
};

export type OutboxPublisher = {
  /** Drain pending outbox rows; retries failed deliveries without blind success. */
  publishPending: (limit?: number) => Promise<{ published: number; failed: number }>;
};

export type OutboxPublisherOptions = {
  repository: OutboxRepository;
  delivery: OutboxDelivery;
  now?: () => Date;
};

export type SeenEventStore = {
  has: (eventId: UUID) => boolean;
  add: (eventId: UUID) => void;
};

export function createOutboxPublisher(options: OutboxPublisherOptions): OutboxPublisher {
  const now = options.now ?? (() => new Date());
  return {
    publishPending: async (limit = 100) => {
      const pending = await options.repository.listPending(limit);
      let published = 0;
      let failed = 0;
      for (const event of pending) {
        try {
          await options.delivery.publish(event);
          await options.repository.markPublished(event.id, parseIsoDateTime(now().toISOString()));
          published += 1;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          await options.repository.markAttemptFailed(event.id, message);
          failed += 1;
        }
      }
      return { published, failed };
    },
  };
}

/**
 * Consumer-side idempotency: redelivery of the same `eventId` does not re-apply side effects.
 */
export function createIdempotentOutboxHandler(options: {
  seen: SeenEventStore;
  handle: (event: OutboxEvent) => Promise<void>;
}): OutboxDelivery {
  return {
    publish: async (event) => {
      if (options.seen.has(event.id)) {
        return;
      }
      await options.handle(event);
      options.seen.add(event.id);
    },
  };
}

export function createMemorySeenEventStore(): SeenEventStore {
  const seen = new Set<string>();
  return {
    has: (eventId) => seen.has(eventId),
    add: (eventId) => {
      seen.add(eventId);
    },
  };
}
