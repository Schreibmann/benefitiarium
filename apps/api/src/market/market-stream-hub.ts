import {
  type CanonicalStreamCandle,
  type ChartLease,
  type ConsumerRef,
  formatProviderSubscriptionKey,
  isStreamCandleInterval,
  type ProviderSubscriptionKey,
  StreamConnectionManager,
  type StreamConnectionManagerOptions,
  type StreamSubscriptionAck,
  SubscriptionRegistry,
} from '@moex/broker-tinvest';
import { createLiveCandleStreamLog, type LiveCandleStreamLog } from './live-candle-stream-log.js';

export type CandleHandler = (candle: CanonicalStreamCandle) => void;
export type AckHandler = (acks: StreamSubscriptionAck[]) => void;

export type MarketStreamHub = {
  registry: SubscriptionRegistry;
  acquire: (input: {
    connectionId: string;
    requestId: string;
    consumer: ConsumerRef;
    key: ProviderSubscriptionKey;
  }) =>
    | { ok: true; lease: ChartLease; providerCreated: boolean }
    | {
        ok: false;
        reason: 'PROVIDER_LIMIT' | 'DUPLICATE_REQUEST' | 'RATE_LIMITED';
        lease: ChartLease | null;
      };
  release: (leaseId: string) => {
    lease: ChartLease | null;
    providerKey: string | null;
    providerRefCount: number;
    shouldUnsubscribeProvider: boolean;
  };
  releaseAllForConnection: (connectionId: string) => Array<{
    lease: ChartLease;
    providerKey: string;
    shouldUnsubscribeProvider: boolean;
  }>;
  subscribeCandles: (handler: CandleHandler) => () => void;
  subscribeAcks: (handler: AckHandler) => () => void;
  syncDesired: () => Promise<void>;
  providerRefCount: (providerKey: string) => number;
  listLeasesByConsumerType: (consumerType: ConsumerRef['consumerType']) => ChartLease[];
  shutdown: () => Promise<void>;
};

export type CreateMarketStreamHubInput = {
  client: StreamConnectionManagerOptions['client'];
  streamLog?: LiveCandleStreamLog;
  registry?: SubscriptionRegistry;
};

/**
 * Single T-Invest stream + subscription registry shared by chart (CHART) and Live (STRATEGY).
 */
export function createMarketStreamHub(input: CreateMarketStreamHubInput): MarketStreamHub {
  const registry = input.registry ?? new SubscriptionRegistry();
  const candleHandlers = new Set<CandleHandler>();
  const ackHandlers = new Set<AckHandler>();
  const streamLog =
    input.streamLog ??
    createLiveCandleStreamLog({
      enabled: false,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      },
    });

  const streamManager = new StreamConnectionManager({
    client: input.client,
    handlers: {
      onCandle: (candle) => {
        if (isStreamCandleInterval(candle.interval)) {
          const providerKey = formatProviderSubscriptionKey({
            instrumentUid: candle.instrumentUid,
            interval: candle.interval,
            candleSource: 'EXCHANGE',
            waitingClose: candle.waitingClose,
          });
          streamLog.candle(candle, {
            leaseCount: registry.listActiveLeasesForProvider(providerKey).length,
          });
        }
        for (const handler of candleHandlers) {
          handler(candle);
        }
      },
      onSubscriptionAck: (acks) => {
        streamLog.subscriptionAcks(acks);
        for (const handler of ackHandlers) {
          handler(acks);
        }
      },
    },
  });

  const syncDesired = async (): Promise<void> => {
    await streamManager.syncDesiredSubscriptions(registry.desiredProviderKeys());
  };

  return {
    registry,
    acquire(acquireInput) {
      return registry.acquire(acquireInput);
    },
    release(leaseId) {
      return registry.release(leaseId);
    },
    releaseAllForConnection(connectionId) {
      return registry.releaseAllForConnection(connectionId);
    },
    subscribeCandles(handler) {
      candleHandlers.add(handler);
      return () => {
        candleHandlers.delete(handler);
      };
    },
    subscribeAcks(handler) {
      ackHandlers.add(handler);
      return () => {
        ackHandlers.delete(handler);
      };
    },
    syncDesired,
    providerRefCount(providerKey) {
      return registry.providerRefCount(providerKey);
    },
    listLeasesByConsumerType(consumerType) {
      return registry.listActiveLeasesByConsumerType(consumerType);
    },
    async shutdown() {
      candleHandlers.clear();
      ackHandlers.clear();
      await streamManager.shutdown();
    },
  };
}
