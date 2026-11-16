import { randomUUID } from 'node:crypto';
import {
  type CanonicalStreamCandle,
  formatProviderSubscriptionKey,
  isStreamCandleInterval,
  type StreamCandleInterval,
} from '@moex/broker-tinvest';
import type {
  FavoritesRepository,
  LiveRuntimeStateRepository,
  LiveSignalsRepository,
} from '@moex/persistence';
import type { MarketStreamHub } from '../market/market-stream-hub.js';
import {
  type ClosedBarEvaluator,
  createNullClosedBarEvaluator,
  type LiveSignalCandidate,
} from './closed-bar-evaluator.js';
import type { TelegramNotifier } from './telegram-notifier.js';

export type LiveRuntimeStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'DEGRADED';

export const LIVE_RUNTIME_CONNECTION_ID = 'live-runtime';

export type LiveRuntimeSnapshot = {
  status: LiveRuntimeStatus;
  desiredStatus: 'STOPPED' | 'RUNNING';
  favoriteCount: number;
  strategyLeaseCount: number;
  analysisIntervals: StreamCandleInterval[];
  lastError: string | null;
  updatedAt: string;
};

export type LiveRuntime = {
  getSnapshot: () => Promise<LiveRuntimeSnapshot>;
  start: () => Promise<LiveRuntimeSnapshot>;
  stop: () => Promise<LiveRuntimeSnapshot>;
  /** Re-sync STRATEGY leases from current favorites while RUNNING. */
  resyncFavorites: () => Promise<void>;
  shutdown: () => Promise<void>;
};

export type CreateLiveRuntimeInput = {
  hub: MarketStreamHub;
  favorites: FavoritesRepository;
  runtimeState: LiveRuntimeStateRepository;
  signals: LiveSignalsRepository;
  telegram: TelegramNotifier;
  analysisIntervals?: StreamCandleInterval[];
  evaluateClosedBar?: ClosedBarEvaluator;
  createId?: () => string;
};

function leaseRequestId(instrumentUid: string, interval: StreamCandleInterval): string {
  return `strategy:${instrumentUid}:${interval}`;
}

/**
 * Independent Live Mode runtime: durable STRATEGY leases over favorites, not tied to chart WS.
 */
export function createLiveRuntime(input: CreateLiveRuntimeInput): LiveRuntime {
  const analysisIntervals = input.analysisIntervals ?? ['5m'];
  const evaluate = input.evaluateClosedBar ?? createNullClosedBarEvaluator();
  const createId = input.createId ?? (() => randomUUID());

  let status: LiveRuntimeStatus = 'STOPPED';
  let lastError: string | null = null;
  let updatedAt = new Date().toISOString();
  const seenEventIds = new Set<string>();
  let unsubscribeCandles: (() => void) | null = null;

  const stamp = (): void => {
    updatedAt = new Date().toISOString();
  };

  const snapshot = async (): Promise<LiveRuntimeSnapshot> => {
    const desired = await input.runtimeState.get();
    const favorites = await input.favorites.list();
    return {
      status,
      desiredStatus: desired.desiredStatus,
      favoriteCount: favorites.length,
      strategyLeaseCount: input.hub.listLeasesByConsumerType('STRATEGY').length,
      analysisIntervals: [...analysisIntervals],
      lastError,
      updatedAt,
    };
  };

  const desiredKeys = async (): Promise<
    Array<{ instrumentUid: string; interval: StreamCandleInterval }>
  > => {
    const favorites = await input.favorites.list();
    const keys: Array<{ instrumentUid: string; interval: StreamCandleInterval }> = [];
    for (const favorite of favorites) {
      for (const interval of analysisIntervals) {
        keys.push({ instrumentUid: favorite.instrumentUid, interval });
      }
    }
    return keys;
  };

  const syncStrategyLeases = async (): Promise<void> => {
    const wanted = await desiredKeys();
    const wantedRequestIds = new Set(
      wanted.map((item) => leaseRequestId(item.instrumentUid, item.interval)),
    );

    for (const lease of input.hub.listLeasesByConsumerType('STRATEGY')) {
      if (!wantedRequestIds.has(lease.requestId)) {
        input.hub.release(lease.leaseId);
      }
    }

    const activeRequestIds = new Set(
      input.hub.listLeasesByConsumerType('STRATEGY').map((lease) => lease.requestId),
    );

    for (const item of wanted) {
      const requestId = leaseRequestId(item.instrumentUid, item.interval);
      if (activeRequestIds.has(requestId)) {
        continue;
      }
      const result = input.hub.acquire({
        connectionId: LIVE_RUNTIME_CONNECTION_ID,
        requestId,
        consumer: {
          consumerType: 'STRATEGY',
          consumerId: LIVE_RUNTIME_CONNECTION_ID,
        },
        key: {
          instrumentUid: item.instrumentUid,
          interval: item.interval,
          candleSource: 'EXCHANGE',
          waitingClose: false,
        },
      });
      if (!result.ok) {
        lastError = `lease acquire failed: ${result.reason}`;
        status = 'DEGRADED';
        stamp();
      }
    }

    await input.hub.syncDesired();
  };

  const publishCandidate = async (candidate: LiveSignalCandidate): Promise<void> => {
    const row = await input.signals.insert({
      id: createId(),
      instrumentUid: candidate.instrumentUid,
      ticker: candidate.ticker,
      intervalCode: candidate.intervalCode,
      eventKey: candidate.eventKey,
      direction: candidate.direction,
      status: candidate.status === 'accepted' ? 'accepted' : 'rejected',
      referencePrice: candidate.referencePrice,
      reasons: candidate.reasons,
      features: candidate.features,
      sourceEventTime: candidate.sourceEventTime,
    });
    if (row.status === 'accepted') {
      await input.telegram.publishSignal(row);
    }
  };

  const onCandle = (candle: CanonicalStreamCandle): void => {
    if (status !== 'RUNNING' && status !== 'DEGRADED') {
      return;
    }
    if (!isStreamCandleInterval(candle.interval)) {
      return;
    }
    if (!analysisIntervals.includes(candle.interval)) {
      return;
    }
    if (seenEventIds.has(candle.eventHash)) {
      return;
    }
    seenEventIds.add(candle.eventHash);
    if (seenEventIds.size > 10_000) {
      seenEventIds.clear();
    }

    // Leases are acquired with waitingClose:false to share the chart provider key.
    const providerKey = formatProviderSubscriptionKey({
      instrumentUid: candle.instrumentUid,
      interval: candle.interval,
      candleSource: 'EXCHANGE',
      waitingClose: false,
    });
    const hasStrategyLease = input.hub.registry
      .listActiveLeasesForProvider(providerKey)
      .some((lease) => lease.consumer.consumerType === 'STRATEGY');
    if (!hasStrategyLease) {
      return;
    }

    void Promise.resolve(evaluate(candle))
      .then(async (candidate) => {
        if (candidate === null) {
          return;
        }
        await publishCandidate(candidate);
      })
      .catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : 'analyze failed';
        status = 'DEGRADED';
        stamp();
      });
  };

  const ensureCandleSubscription = (): void => {
    if (unsubscribeCandles !== null) {
      return;
    }
    unsubscribeCandles = input.hub.subscribeCandles(onCandle);
  };

  return {
    getSnapshot: snapshot,

    async start() {
      if (status === 'RUNNING' || status === 'STARTING') {
        return snapshot();
      }
      status = 'STARTING';
      lastError = null;
      stamp();
      try {
        await input.runtimeState.setDesiredStatus('RUNNING');
        ensureCandleSubscription();
        await syncStrategyLeases();
        if (status === 'STARTING') {
          status = 'RUNNING';
        }
        stamp();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'start failed';
        status = 'DEGRADED';
        stamp();
      }
      return snapshot();
    },

    async stop() {
      if (status === 'STOPPED' || status === 'STOPPING') {
        await input.runtimeState.setDesiredStatus('STOPPED');
        return snapshot();
      }
      status = 'STOPPING';
      stamp();
      try {
        await input.runtimeState.setDesiredStatus('STOPPED');
        input.hub.releaseAllForConnection(LIVE_RUNTIME_CONNECTION_ID);
        await input.hub.syncDesired();
        status = 'STOPPED';
        lastError = null;
        stamp();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'stop failed';
        status = 'DEGRADED';
        stamp();
      }
      return snapshot();
    },

    async resyncFavorites() {
      if (status !== 'RUNNING' && status !== 'DEGRADED') {
        return;
      }
      await syncStrategyLeases();
      stamp();
    },

    async shutdown() {
      if (unsubscribeCandles !== null) {
        unsubscribeCandles();
        unsubscribeCandles = null;
      }
      input.hub.releaseAllForConnection(LIVE_RUNTIME_CONNECTION_ID);
      await input.hub.syncDesired();
      status = 'STOPPED';
      stamp();
    },
  };
}
