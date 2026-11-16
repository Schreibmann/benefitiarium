import { parseUuid } from '@moex/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DbClient } from '../db/client.js';
import { createPsqlDbClient } from '../db/psql-client.js';
import { createMarketSignalsRepository } from './market-signals.js';
import { createMemoryMarketSignalsStore } from './market-signals-memory.js';
import type { NewMarketSignal, NewNotificationForSignal } from './market-signals-types.js';

const SIGNAL_ID = parseUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0001');
const SIGNAL_ID_2 = parseUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0002');
const NOTIF_ID = parseUuid('bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeee0001');
const NOTIF_ID_2 = parseUuid('bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeee0002');

function sampleSignal(overrides: Partial<NewMarketSignal> = {}): NewMarketSignal {
  return {
    id: SIGNAL_ID,
    triggerId: 'fib_pivot_cross',
    triggerVersion: '1.0.0',
    instrumentUid: 'uid-1',
    ticker: 'NGZ6',
    timeframe: '5m',
    kind: 'cross',
    levelName: 'P',
    levelValue: '100',
    side: 'up',
    price: '100.5',
    previousPrice: '99.5',
    evalMode: 'close',
    periodId: 'valid:open',
    candleTime: '2026-11-14T10:00:00.000Z',
    payload: { reason: 'test' },
    dedupeKey: 'fib_pivot_cross:uid-1:5m:valid:open:P:up:2026-11-14T10:00:00.000Z',
    ...overrides,
  };
}

function sampleNotification(
  overrides: Partial<NewNotificationForSignal> = {},
): NewNotificationForSignal {
  return {
    id: NOTIF_ID,
    channel: 'telegram',
    target: '-100123',
    text: '<b>NGZ6</b> cross P',
    ...overrides,
  };
}

describe('BL-107 market signals memory store', () => {
  it('inserts signal with notification and dedupes by key', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:00:00.000Z'));
    const first = await store.insertSignalWithNotification({
      signal: sampleSignal(),
      notification: sampleNotification({ threadId: 42 }),
    });
    expect(first.inserted).toBe(true);
    expect(first.signal?.dedupeKey).toContain('fib_pivot_cross');
    expect(first.notification?.status).toBe('pending');
    expect(first.notification?.threadId).toBe(42);

    const second = await store.insertSignalWithNotification({
      signal: sampleSignal({ id: SIGNAL_ID_2 }),
      notification: sampleNotification({ id: NOTIF_ID_2 }),
    });
    expect(second.inserted).toBe(false);
    expect(store.snapshotNotifications()).toHaveLength(1);
  });

  it('enqueues log-only notifications without signal_id', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:00:00.000Z'));
    const row = await store.enqueueLogNotification({
      id: NOTIF_ID_2,
      channel: 'telegram',
      target: '-1001',
      threadId: 99,
      text: 'stream failed',
    });
    expect(row.signalId).toBeNull();
    expect(row.threadId).toBe(99);
    expect(row.text).toBe('stream failed');
    expect(store.snapshotSignals()).toHaveLength(0);
  });

  it('claims due notifications and marks sent/failed', async () => {
    let nowMs = Date.parse('2026-11-14T10:00:00.000Z');
    const store = createMemoryMarketSignalsStore(() => new Date(nowMs));
    await store.insertSignalWithNotification({
      signal: sampleSignal({ kind: 'approach', side: 'below', dedupeKey: 'a1' }),
      notification: sampleNotification(),
    });

    const claimed = await store.claimDueNotifications(10);
    expect(claimed).toHaveLength(1);
    const firstClaim = claimed[0];
    expect(firstClaim?.status).toBe('sending');
    expect(firstClaim?.attempts).toBe(1);
    if (firstClaim === undefined) {
      throw new Error('expected claimed notification');
    }

    const sent = await store.markSent(firstClaim.id, {
      providerMessageId: '42',
      sentAt: '2026-11-14T10:00:01.000Z',
    });
    expect(sent.status).toBe('sent');
    expect(sent.providerMessageId).toBe('42');

    await store.insertSignalWithNotification({
      signal: sampleSignal({
        id: SIGNAL_ID_2,
        dedupeKey: 'a2',
        candleTime: '2026-11-14T10:05:00.000Z',
      }),
      notification: sampleNotification({ id: NOTIF_ID_2 }),
    });
    const claimed2 = await store.claimDueNotifications(10);
    const secondClaim = claimed2[0];
    if (secondClaim === undefined) {
      throw new Error('expected second claimed notification');
    }
    const failed = await store.markFailed(secondClaim.id, {
      errorMessage: '429',
      retryAfterSeconds: 5,
    });
    expect(failed.status).toBe('pending');
    expect(failed.lastError).toBe('429');

    nowMs += 6000;
    const reclaimed = await store.claimDueNotifications(10);
    expect(reclaimed).toHaveLength(1);
    const thirdClaim = reclaimed[0];
    if (thirdClaim === undefined) {
      throw new Error('expected reclaimed notification');
    }

    const dead = await store.markFailed(thirdClaim.id, {
      errorMessage: '400 bad request',
      dead: true,
    });
    expect(dead.status).toBe('dead');
  });

  it('lists approach state for hysteresis restore', async () => {
    const store = createMemoryMarketSignalsStore();
    await store.insertSignalWithNotification({
      signal: sampleSignal({
        kind: 'approach',
        side: 'below',
        dedupeKey: 'ap1',
      }),
      notification: sampleNotification(),
    });
    const rows = await store.listActiveApproachState({
      instrumentUids: ['uid-1'],
      periodIds: ['valid:open'],
    });
    expect(rows).toEqual([
      {
        instrumentUid: 'uid-1',
        timeframe: '5m',
        periodId: 'valid:open',
        levelName: 'P',
        side: 'below',
      },
    ]);
  });
});

async function canReachPostgres(db: DbClient): Promise<boolean> {
  try {
    await db.queryJsonValue(`SELECT to_json(1)`);
    return true;
  } catch {
    return false;
  }
}

describe('BL-107 market signals (Postgres)', () => {
  let db: DbClient;
  let available = false;

  beforeAll(async () => {
    db = createPsqlDbClient();
    available = await canReachPostgres(db);
  });

  beforeEach(async () => {
    if (!available) {
      return;
    }
    await db.execute(`
      TRUNCATE notifications, market_signals RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (db.close !== undefined) {
      await db.close();
    }
  });

  it('atomically inserts signal+notification and ignores duplicates', async () => {
    if (!available) {
      return;
    }
    const repo = createMarketSignalsRepository(db);
    const first = await repo.insertSignalWithNotification({
      signal: sampleSignal(),
      notification: sampleNotification(),
    });
    expect(first.inserted).toBe(true);
    expect(first.notification?.signalId).toBe(first.signal?.id);

    const dup = await repo.insertSignalWithNotification({
      signal: sampleSignal({ id: SIGNAL_ID_2 }),
      notification: sampleNotification({ id: NOTIF_ID_2 }),
    });
    expect(dup.inserted).toBe(false);
  });

  it('claims due rows with sending status and markSent', async () => {
    if (!available) {
      return;
    }
    const repo = createMarketSignalsRepository(db);
    await repo.insertSignalWithNotification({
      signal: sampleSignal(),
      notification: sampleNotification(),
    });
    const claimed = await repo.claimDueNotifications(5);
    expect(claimed).toHaveLength(1);
    const firstClaim = claimed[0];
    expect(firstClaim?.status).toBe('sending');
    if (firstClaim === undefined) {
      throw new Error('expected claimed notification');
    }
    const sent = await repo.markSent(firstClaim.id, {
      providerMessageId: '99',
      sentAt: new Date().toISOString(),
    });
    expect(sent.status).toBe('sent');
  });
});
