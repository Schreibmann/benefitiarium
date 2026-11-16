import { createMemoryMarketSignalsStore, createMemoryOutboxStore } from '@moex/persistence';
import { describe, expect, it, vi } from 'vitest';
import { createQueueTelegramNotifier, createStubTelegramNotifier } from './telegram-notifier.js';

describe('createQueueTelegramNotifier', () => {
  it('enqueues level alert with Russian name and 2-decimal levels', async () => {
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
      levelPrice: '107.35666666666667',
      levelSources: ['FIB_PIVOT'],
      distanceAtr: '0.66666666666667',
      instrumentUid: 'uid-1',
      ticker: 'NBISperpA',
      name: 'Акции NVIDIA',
      crossDirection: null,
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      referencePrice: '107.35',
    });

    const signals = store.snapshotSignals();
    const notifications = store.snapshotNotifications();
    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe('approach');
    expect(signals[0]?.levelValue).toBe('107.36');
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.threadId).toBe(7);
    expect(notifications[0]?.target).toBe('-1001');
    expect(notifications[0]?.text).toContain('NBISperpA');
    expect(notifications[0]?.text).toContain('Акции NVIDIA');
    expect(notifications[0]?.text).toContain('<code>107.36</code>');
    expect(notifications[0]?.text).toContain('ATR dist <code>0.67</code>');
    expect(notifications[0]?.text).not.toContain('107.356666');

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
      name: null,
      crossDirection: 'up' as const,
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
      name: null,
      crossDirection: null,
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      referencePrice: '100.5',
    });
    const pending = await outbox.listPending();
    expect(pending[0]?.payload).toMatchObject({ delivery: 'stub' });
  });

  it('formats CROSS with direction arrow emoji', async () => {
    const store = createMemoryMarketSignalsStore();
    const outbox = createMemoryOutboxStore();
    const notifier = createQueueTelegramNotifier({
      marketSignals: store,
      outbox,
      chatId: '-1001',
      topicAlerts: 7,
      logger: { info: () => undefined },
      createId: () => '00000000-0000-4000-8000-000000000077',
    });
    await notifier.publishLevelAlert({
      kind: 'CROSS',
      levelId: 'FIB:S3',
      levelPrice: '100',
      levelSources: ['FIB_PIVOT'],
      distanceAtr: '0',
      instrumentUid: 'uid-1',
      ticker: 'CEZ6',
      name: null,
      crossDirection: 'down',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      referencePrice: '99',
    });
    expect(store.snapshotNotifications()[0]?.text).toContain('CROSS ⬇️');
  });
});
