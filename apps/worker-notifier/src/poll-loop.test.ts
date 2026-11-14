import { parseUuid } from '@moex/domain';
import { createMemoryMarketSignalsStore } from '@moex/persistence';
import { describe, expect, it, vi } from 'vitest';
import { createNotifierPollLoop } from './poll-loop.js';
import { TelegramHttpError } from './telegram-client.js';

const SIGNAL_ID = parseUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0001');
const NOTIF_ID = parseUuid('bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeee0001');

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('createNotifierPollLoop', () => {
  it('sends pending notifications and marks them sent', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:00:00.000Z'));
    await store.insertSignalWithNotification({
      signal: {
        id: SIGNAL_ID,
        triggerId: 'fib_pivot_cross',
        triggerVersion: '1.0.0',
        instrumentUid: 'uid',
        ticker: 'NGZ6',
        timeframe: '5m',
        kind: 'cross',
        levelName: 'P',
        levelValue: '100',
        side: 'up',
        price: '101',
        previousPrice: '99',
        evalMode: 'close',
        periodId: 'valid:open',
        candleTime: '2026-11-14T10:00:00.000Z',
        payload: {},
        dedupeKey: 'k1',
      },
      notification: {
        id: NOTIF_ID,
        channel: 'telegram',
        target: '-1001',
        text: 'hello',
      },
    });

    const sendMessage = vi.fn(async () => ({ messageId: '55' }));
    const waiters: Array<() => void> = [];
    const loop = createNotifierPollLoop({
      repo: store,
      telegram: { sendMessage },
      pollIntervalMs: 50,
      throttleMs: 1,
      sleep: () =>
        new Promise((resolve) => {
          waiters.push(resolve);
        }),
    });

    await loop.start();
    await flush();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(store.snapshotNotifications()[0]?.status).toBe('sent');
    expect(store.snapshotNotifications()[0]?.providerMessageId).toBe('55');
    await loop.stop();
  });

  it('marks 429 as retryable pending and 400 as dead', async () => {
    const retryStore = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:00:00.000Z'));
    await retryStore.insertSignalWithNotification({
      signal: {
        id: SIGNAL_ID,
        triggerId: 'fib_pivot_cross',
        triggerVersion: '1.0.0',
        instrumentUid: 'uid',
        ticker: 'NGZ6',
        timeframe: '5m',
        kind: 'cross',
        levelName: 'P',
        levelValue: '100',
        side: 'up',
        price: '101',
        previousPrice: '99',
        evalMode: 'close',
        periodId: 'valid:open',
        candleTime: '2026-11-14T10:00:00.000Z',
        payload: {},
        dedupeKey: 'k2',
      },
      notification: {
        id: NOTIF_ID,
        channel: 'telegram',
        target: '-1001',
        text: 'hello',
      },
    });

    const retryLoop = createNotifierPollLoop({
      repo: retryStore,
      telegram: {
        sendMessage: async () => {
          throw new TelegramHttpError({
            status: 429,
            message: 'rate',
            retryAfterSeconds: 3,
          });
        },
      },
      pollIntervalMs: 50,
      throttleMs: 1,
      sleep: async () => undefined,
    });
    await retryLoop.start();
    await flush();
    expect(retryStore.snapshotNotifications()[0]?.status).toBe('pending');
    expect(retryStore.snapshotNotifications()[0]?.lastError).toBe('rate');
    await retryLoop.stop();

    const deadStore = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:00:00.000Z'));
    await deadStore.insertSignalWithNotification({
      signal: {
        id: SIGNAL_ID,
        triggerId: 'fib_pivot_cross',
        triggerVersion: '1.0.0',
        instrumentUid: 'uid',
        ticker: 'NGZ6',
        timeframe: '5m',
        kind: 'cross',
        levelName: 'P',
        levelValue: '100',
        side: 'up',
        price: '101',
        previousPrice: '99',
        evalMode: 'close',
        periodId: 'valid:open',
        candleTime: '2026-11-14T10:00:00.000Z',
        payload: {},
        dedupeKey: 'k3',
      },
      notification: {
        id: NOTIF_ID,
        channel: 'telegram',
        target: '-1001',
        text: 'hello',
      },
    });
    const deadLoop = createNotifierPollLoop({
      repo: deadStore,
      telegram: {
        sendMessage: async () => {
          throw new TelegramHttpError({ status: 400, message: 'bad' });
        },
      },
      pollIntervalMs: 50,
      throttleMs: 1,
      sleep: async () => undefined,
    });
    await deadLoop.start();
    await flush();
    expect(deadStore.snapshotNotifications()[0]?.status).toBe('dead');
    await deadLoop.stop();
  });
});
