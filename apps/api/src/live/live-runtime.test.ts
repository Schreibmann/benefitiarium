import { randomUUID } from 'node:crypto';
import {
  type CanonicalStreamCandle,
  formatProviderSubscriptionKey,
  SubscriptionRegistry,
} from '@moex/broker-tinvest';
import {
  createMemoryFavoritesRepository,
  createMemoryLiveRuntimeStateRepository,
  createMemoryLiveSignalsRepository,
  createMemoryOutboxStore,
} from '@moex/persistence';
import { describe, expect, it, vi } from 'vitest';
import type { MarketStreamHub } from '../market/market-stream-hub.js';
import { createCloseEmittedHoldEvaluator } from './closed-bar-evaluator.js';
import { createLiveRuntime, LIVE_RUNTIME_CONNECTION_ID } from './live-runtime.js';
import { createStubTelegramNotifier } from './telegram-notifier.js';

function createTestHub(registry: SubscriptionRegistry): {
  hub: MarketStreamHub;
  emitCandle: (candle: CanonicalStreamCandle) => void;
} {
  const candleHandlers = new Set<(candle: CanonicalStreamCandle) => void>();
  const hub: MarketStreamHub = {
    registry,
    acquire: (input) => registry.acquire(input),
    release: (leaseId) => registry.release(leaseId),
    releaseAllForConnection: (connectionId) => registry.releaseAllForConnection(connectionId),
    subscribeCandles: (handler) => {
      candleHandlers.add(handler);
      return () => {
        candleHandlers.delete(handler);
      };
    },
    subscribeAcks: () => () => undefined,
    syncDesired: async () => undefined,
    providerRefCount: (providerKey) => registry.providerRefCount(providerKey),
    listLeasesByConsumerType: (consumerType) =>
      registry.listActiveLeasesByConsumerType(consumerType),
    shutdown: async () => undefined,
  };
  return {
    hub,
    emitCandle: (candle) => {
      for (const handler of candleHandlers) {
        handler(candle);
      }
    },
  };
}

function closedCandle(partial: {
  instrumentUid: string;
  eventHash: string;
}): CanonicalStreamCandle {
  return {
    instrumentUid: partial.instrumentUid,
    interval: '5m',
    timeStart: '2026-11-16T10:00:00.000Z',
    open: '100',
    high: '101',
    low: '99',
    close: '100.5',
    volumeLots: '10',
    volumeBuyLots: null,
    volumeSellLots: null,
    deliveryMode: 'LIVE_UPDATES',
    barState: 'CLOSE_EMITTED',
    waitingClose: false,
    candleSource: 'EXCHANGE',
    lastTradeTs: null,
    figi: null,
    ticker: 'SBER',
    classCode: null,
    receivedAt: '2026-11-16T10:05:00.000Z',
    revision: 1,
    eventHash: partial.eventHash,
    historicalProviderIsComplete: null,
  };
}

describe('LiveRuntime', () => {
  it('start acquires STRATEGY leases for favorites; stop releases only STRATEGY', async () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });
    const { hub } = createTestHub(registry);
    const favorites = createMemoryFavoritesRepository([
      {
        instrumentUid: 'uid-1',
        ticker: 'SBER',
        figi: null,
        createdAt: '2026-11-16T09:00:00.000Z',
      },
    ]);

    // Chart already holds the same provider key.
    registry.acquire({
      connectionId: 'ws-1',
      requestId: 'chart-r1',
      consumer: { consumerType: 'CHART', consumerId: 'conn:ws-1' },
      key: {
        instrumentUid: 'uid-1',
        interval: '5m',
        candleSource: 'EXCHANGE',
        waitingClose: false,
      },
    });

    const outboxStore = createMemoryOutboxStore();
    const runtime = createLiveRuntime({
      hub,
      favorites,
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      telegram: createStubTelegramNotifier({
        outbox: outboxStore,
        logger: { info: () => undefined },
      }),
      analysisIntervals: ['5m'],
    });

    const started = await runtime.start();
    expect(started.status).toBe('RUNNING');
    expect(started.strategyLeaseCount).toBe(1);
    expect(started.favoriteCount).toBe(1);

    const providerKey = formatProviderSubscriptionKey({
      instrumentUid: 'uid-1',
      interval: '5m',
      candleSource: 'EXCHANGE',
      waitingClose: false,
    });
    expect(registry.providerRefCount(providerKey)).toBe(2);

    const stopped = await runtime.stop();
    expect(stopped.status).toBe('STOPPED');
    expect(stopped.strategyLeaseCount).toBe(0);
    expect(registry.providerRefCount(providerKey)).toBe(1);
    expect(registry.listActiveLeasesByConsumerType('CHART')).toHaveLength(1);
  });

  it('publishes live level alerts on UPDATING candles', async () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });
    const { hub, emitCandle } = createTestHub(registry);
    const favorites = createMemoryFavoritesRepository([
      {
        instrumentUid: 'uid-1',
        ticker: 'BRH6',
        figi: null,
        createdAt: '2026-11-16T09:00:00.000Z',
      },
    ]);
    const outbox = createMemoryOutboxStore();
    const info = vi.fn();

    const runtime = createLiveRuntime({
      hub,
      favorites,
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      telegram: createStubTelegramNotifier({ outbox, logger: { info } }),
      analysisIntervals: ['5m'],
      evaluateLiveAlerts: () => [
        {
          kind: 'APPROACH',
          levelId: 'FIB:P',
          levelPrice: '100',
          levelSources: ['FIB_PIVOT'],
          distanceAtr: '0.1',
          instrumentUid: 'uid-1',
          ticker: 'BRH6',
          name: 'Нефть Brent',
          intervalCode: '5m',
          barTimeStart: '2026-11-16T10:00:00.000Z',
          referencePrice: '100.5',
        },
      ],
      createId: () => randomUUID(),
    });

    await runtime.start();
    emitCandle({
      ...closedCandle({ instrumentUid: 'uid-1', eventHash: 'hash-live-1' }),
      barState: 'UPDATING',
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const pending = await outbox.listPending();
    expect(
      pending.some(
        (event) =>
          event.eventType === 'signal.telegram' && event.aggregateType === 'live_level_alert',
      ),
    ).toBe(true);
  });

  it('publishes accepted closed-bar signals via telegram stub outbox', async () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });
    const { hub, emitCandle } = createTestHub(registry);
    const favorites = createMemoryFavoritesRepository([
      {
        instrumentUid: 'uid-1',
        ticker: 'SBER',
        figi: null,
        createdAt: '2026-11-16T09:00:00.000Z',
      },
    ]);
    const outbox = createMemoryOutboxStore();
    const info = vi.fn();

    const runtime = createLiveRuntime({
      hub,
      favorites,
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      telegram: createStubTelegramNotifier({ outbox, logger: { info } }),
      analysisIntervals: ['5m'],
      evaluateClosedBar: createCloseEmittedHoldEvaluator(),
      createId: () => randomUUID(),
    });

    await runtime.start();
    emitCandle(closedCandle({ instrumentUid: 'uid-1', eventHash: 'hash-1' }));

    // allow async analyze path
    await new Promise((resolve) => setTimeout(resolve, 20));

    const pending = await outbox.listPending();
    expect(pending.some((event) => event.eventType === 'signal.telegram')).toBe(true);
    expect(info).toHaveBeenCalled();
    expect(
      registry
        .listActiveLeasesByConsumerType('STRATEGY')
        .every((lease) => lease.connectionId === LIVE_RUNTIME_CONNECTION_ID),
    ).toBe(true);
  });

  it('resyncFavorites adds leases when favorites grow while RUNNING', async () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });
    const { hub } = createTestHub(registry);
    const favorites = createMemoryFavoritesRepository();
    const runtime = createLiveRuntime({
      hub,
      favorites,
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      telegram: {
        publishSignal: async () => undefined,
        publishLevelAlert: async () => undefined,
      },
      analysisIntervals: ['5m'],
    });

    await runtime.start();
    expect((await runtime.getSnapshot()).strategyLeaseCount).toBe(0);

    await favorites.upsert({ instrumentUid: 'uid-2', ticker: 'GAZP' });
    await runtime.resyncFavorites();
    expect((await runtime.getSnapshot()).strategyLeaseCount).toBe(1);
  });
});
