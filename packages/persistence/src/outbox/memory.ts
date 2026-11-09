import { parseIsoDateTime } from '@moex/domain';
import type { OutboxRepository } from './repository.js';
import type { NewOutboxEvent, OutboxEvent } from './types.js';

/**
 * In-memory outbox for unit tests and local dry-runs.
 * `withAggregateChange` models same-transaction aggregate + outbox writes.
 */
export type MemoryOutboxStore = OutboxRepository & {
  withAggregateChange: <T>(fn: (repo: OutboxRepository) => Promise<T>) => Promise<T>;
  /** Test helper: force-fail the next withAggregateChange callback after enqueue. */
  setFailAfterEnqueue: (fail: boolean) => void;
  snapshot: () => OutboxEvent[];
};

export function createMemoryOutboxStore(): MemoryOutboxStore {
  const byId = new Map<string, OutboxEvent>();
  let failAfterEnqueue = false;

  const repo: OutboxRepository = {
    enqueue: async (event: NewOutboxEvent) => {
      if (byId.has(event.id)) {
        throw new Error(`Duplicate outbox eventId: ${event.id}`);
      }
      const row: OutboxEvent = {
        id: event.id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: { ...event.payload },
        createdAt: event.createdAt ?? parseIsoDateTime(new Date().toISOString()),
        publishedAt: null,
        attempts: 0,
        lastError: null,
      };
      byId.set(row.id, row);
      return { ...row, payload: { ...row.payload } };
    },

    getById: async (id) => {
      const row = byId.get(id);
      return row === undefined ? null : { ...row, payload: { ...row.payload } };
    },

    listPending: async (limit = 100) =>
      [...byId.values()]
        .filter((row) => row.publishedAt === null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit)
        .map((row) => ({ ...row, payload: { ...row.payload } })),

    markPublished: async (id, publishedAt) => {
      const row = byId.get(id);
      if (row === undefined) {
        throw new Error(`Outbox event not found: ${id}`);
      }
      const updated: OutboxEvent = {
        ...row,
        publishedAt: parseIsoDateTime(publishedAt),
        lastError: null,
      };
      byId.set(id, updated);
      return { ...updated, payload: { ...updated.payload } };
    },

    markAttemptFailed: async (id, errorMessage) => {
      const row = byId.get(id);
      if (row === undefined) {
        throw new Error(`Outbox event not found: ${id}`);
      }
      const updated: OutboxEvent = {
        ...row,
        attempts: row.attempts + 1,
        lastError: errorMessage,
      };
      byId.set(id, updated);
      return { ...updated, payload: { ...updated.payload } };
    },
  };

  return {
    ...repo,
    setFailAfterEnqueue: (fail) => {
      failAfterEnqueue = fail;
    },
    snapshot: () => [...byId.values()].map((row) => ({ ...row, payload: { ...row.payload } })),
    withAggregateChange: async (fn) => {
      const before = new Map(
        [...byId.entries()].map(([key, value]) => [
          key,
          { ...value, payload: { ...value.payload } },
        ]),
      );
      try {
        const result = await fn(repo);
        if (failAfterEnqueue) {
          failAfterEnqueue = false;
          throw new Error('simulated aggregate failure after outbox enqueue');
        }
        return result;
      } catch (error: unknown) {
        byId.clear();
        for (const [key, value] of before) {
          byId.set(key, value);
        }
        throw error;
      }
    },
  };
}
