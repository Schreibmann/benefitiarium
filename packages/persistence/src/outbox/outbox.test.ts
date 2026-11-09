import { parseIsoDateTime, parseUuid } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createMemoryOutboxStore } from './memory.js';
import {
  createIdempotentOutboxHandler,
  createMemorySeenEventStore,
  createOutboxPublisher,
} from './publisher.js';

describe('BL-022 transaction outbox', () => {
  it('writes aggregate change and outbox event atomically (rolls back together)', async () => {
    const store = createMemoryOutboxStore();
    const eventId = parseUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    store.setFailAfterEnqueue(true);

    await expect(
      store.withAggregateChange(async (outbox) => {
        await outbox.enqueue({
          id: eventId,
          aggregateType: 'sandbox_account_operation',
          aggregateId: 'op-1',
          eventType: 'sandbox.operation.queued',
          payload: { operationId: 'op-1' },
          createdAt: parseIsoDateTime('2026-11-09T00:00:00.000Z'),
        });
        return 'ok';
      }),
    ).rejects.toThrow(/simulated aggregate failure/);

    expect(store.snapshot()).toHaveLength(0);
    expect(await store.listPending()).toHaveLength(0);
  });

  it('publishes pending events and retries after transient delivery failure', async () => {
    const store = createMemoryOutboxStore();
    const eventId = parseUuid('11111111-1111-4111-8111-111111111111');
    await store.enqueue({
      id: eventId,
      aggregateType: 'sandbox_account',
      aggregateId: 'acc-1',
      eventType: 'sandbox.account.created',
      payload: { accountId: 'acc-1' },
    });

    let attempts = 0;
    const publisher = createOutboxPublisher({
      repository: store,
      delivery: {
        publish: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('broker bus unavailable');
          }
        },
      },
      now: () => new Date('2026-11-09T01:00:00.000Z'),
    });

    const first = await publisher.publishPending();
    expect(first).toEqual({ published: 0, failed: 1 });
    expect((await store.getById(eventId))?.attempts).toBe(1);
    expect((await store.getById(eventId))?.publishedAt).toBeNull();

    const second = await publisher.publishPending();
    expect(second).toEqual({ published: 1, failed: 0 });
    expect((await store.getById(eventId))?.publishedAt).toBe('2026-11-09T01:00:00.000Z');
    expect(await store.listPending()).toHaveLength(0);
  });

  it('does not duplicate consumer side effects when the same eventId is redelivered', async () => {
    const seen = createMemorySeenEventStore();
    const applied: string[] = [];
    const delivery = createIdempotentOutboxHandler({
      seen,
      handle: async (event) => {
        applied.push(event.id);
      },
    });
    const event = {
      id: parseUuid('22222222-2222-4222-8222-222222222222'),
      aggregateType: 'sandbox_account_operation',
      aggregateId: 'op-2',
      eventType: 'sandbox.operation.succeeded',
      payload: { status: 'succeeded' },
      createdAt: parseIsoDateTime('2026-11-09T02:00:00.000Z'),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    };

    await delivery.publish(event);
    await delivery.publish(event);
    expect(applied).toEqual([event.id]);
  });
});
