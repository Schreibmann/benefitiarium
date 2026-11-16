import { createMemoryMarketSignalsStore, createMemoryOutboxStore } from '@moex/persistence';
import { describe, expect, it, vi } from 'vitest';
import { createQueueTelegramNotifier, createStubTelegramNotifier } from './telegram-notifier.js';

describe('createQueueTelegramNotifier', () => {
  it('enqueues level alert into market_signals + notifications with alerts thread', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-16T12:00:00.000Z'));
    const outbox = createMemoryOutboxStore();
    let n = 0;
    const info = vi.fn();
    const notifier = createQueueTelegramNotifier({
      marketSignals: store,
      outbox,
      chatId: '-1001',
      topicAlerts: 7,
      logger: { info },
      createId: () => `00000000-0000-4000-8000-00000000000${++n}`,
    });

    await notifier.publishLevelAlert({
      kind: 'APPROACH',
      levelId: 'FIB:P',
      levelPrice: '100',
      levelSources: ['FIB_PIVOT'],
      distanceAtr: '0.1',
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      referencePrice: '100.5',
    });

    const signals = store.snapshotSignals();
    const notifications = store.snapshotNotifications();
    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe('approach');
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.threadId).toBe(7);
    expect(notifications[0]?.target).toBe('-1001');
    expect(notifications[0]?.text).toContain('BRH6');

    const pending = await outbox.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.eventType).toBe('signal.telegram');
    expect(pending[0]?.payload).toMatchObject({
      delivery: 'notifications_queue',
      threadId: 7,
      inserted: true,
    });
  });

  it('dedupes repeated level alerts by key', async () => {
    const store = createMemoryMarketSignalsStore();
    const outbox = createMemoryOutboxStore();
    let n = 0;
    const notifier = createQueueTelegramNotifier({
      marketSignals: store,
      outbox,
      chatId: '-1001',
      topicAlerts: 7,
      logger: { info: () => undefined },
      createId: () => `00000000-0000-4000-8000-00000000001${n++}`,
    });
    const alert = {
      kind: 'CROSS' as const,
      levelId: 'FIB:R1',
      levelPrice: '110',
      levelSources: ['FIB_PIVOT'],
      distanceAtr: '0',
      instrumentUid: 'uid-1',
      ticker: 'SBER',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:05:00.000Z',
      referencePrice: '110',
    };
    await notifier.publishLevelAlert(alert);
    await notifier.publishLevelAlert(alert);
    expect(store.snapshotSignals()).toHaveLength(1);
    expect(store.snapshotNotifications()).toHaveLength(1);
  });
});

describe('createStubTelegramNotifier', () => {
  it('still writes audit-only outbox stub', async () => {
    const outbox = createMemoryOutboxStore();
    const notifier = createStubTelegramNotifier({
      outbox,
      logger: { info: () => undefined },
    });
    await notifier.publishLevelAlert({
      kind: 'APPROACH',
      levelId: 'FIB:P',
      levelPrice: '100',
      levelSources: ['FIB_PIVOT'],
      distanceAtr: '0.1',
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      referencePrice: '100.5',
    });
    const pending = await outbox.listPending();
    expect(pending[0]?.payload).toMatchObject({ delivery: 'stub' });
  });
});
