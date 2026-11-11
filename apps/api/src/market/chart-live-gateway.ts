import type { IncomingMessage, Server } from 'node:http';
import {
  type CanonicalStreamCandle,
  formatProviderSubscriptionKey,
  isStreamCandleInterval,
  marketCandleEventTypeForBarState,
  type StreamCandleInterval,
  type StreamConnectionManager,
  type StreamSubscriptionAck,
  type SubscriptionRegistry,
} from '@moex/broker-tinvest';
import { attachInternalWebSocketServer, type InternalWebSocket } from './internal-websocket.js';

export type ChartLiveGateway = {
  attach: (server: Server) => void;
  handleCandle: (candle: CanonicalStreamCandle) => void;
  handleSubscriptionAcks: (acks: StreamSubscriptionAck[]) => void;
  shutdown: () => Promise<void>;
};

type ClientSubscribe = {
  type: 'market.subscribe';
  requestId: string;
  instrumentId: string;
  interval: string;
};

type ClientUnsubscribe = {
  type: 'market.unsubscribe';
  requestId: string;
  subscriptionId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSubscribe(value: unknown): ClientSubscribe | null {
  if (!isRecord(value) || value.type !== 'market.subscribe') {
    return null;
  }
  const requestId = value.requestId;
  const instrumentId = value.instrumentId;
  const interval = value.interval;
  if (
    typeof requestId !== 'string' ||
    typeof instrumentId !== 'string' ||
    typeof interval !== 'string'
  ) {
    return null;
  }
  return {
    type: 'market.subscribe',
    requestId,
    instrumentId,
    interval,
  };
}

function parseUnsubscribe(value: unknown): ClientUnsubscribe | null {
  if (!isRecord(value) || value.type !== 'market.unsubscribe') {
    return null;
  }
  const requestId = value.requestId;
  const subscriptionId = value.subscriptionId;
  if (typeof requestId !== 'string' || typeof subscriptionId !== 'string') {
    return null;
  }
  return { type: 'market.unsubscribe', requestId, subscriptionId };
}

function sendJson(socket: InternalWebSocket, payload: unknown): void {
  socket.send(JSON.stringify(payload));
}

function toStreamInterval(interval: string): StreamCandleInterval | null {
  if (!isStreamCandleInterval(interval)) {
    return null;
  }
  return interval;
}

export function createChartLiveGateway(input: {
  streamManager: StreamConnectionManager;
  registry: SubscriptionRegistry;
}): ChartLiveGateway {
  const sockets = new Map<string, InternalWebSocket>();
  const seenEventIds = new Set<string>();

  const syncProvider = async (): Promise<void> => {
    await input.streamManager.syncDesiredSubscriptions(input.registry.desiredProviderKeys());
  };

  const handleCandle = (candle: CanonicalStreamCandle): void => {
    const streamInterval = toStreamInterval(candle.interval);
    if (streamInterval === null) {
      return;
    }
    const providerKey = formatProviderSubscriptionKey({
      instrumentUid: candle.instrumentUid,
      interval: streamInterval,
      candleSource: 'EXCHANGE',
      waitingClose: candle.waitingClose,
    });
    const leases = input.registry.listActiveLeasesForProvider(providerKey);
    const eventType = marketCandleEventTypeForBarState(candle.barState);
    const eventId = candle.eventHash;
    if (seenEventIds.has(eventId)) {
      return;
    }
    seenEventIds.add(eventId);
    if (seenEventIds.size > 5_000) {
      seenEventIds.clear();
    }

    for (const lease of leases) {
      if (lease.status !== 'ACTIVE' && lease.status !== 'DEGRADED') {
        continue;
      }
      const socket = sockets.get(lease.connectionId);
      if (socket === undefined) {
        continue;
      }
      sendJson(socket, {
        type: eventType,
        subscriptionId: lease.leaseId,
        instrumentId: lease.key.instrumentUid,
        interval: lease.key.interval,
        eventId,
        occurredAt: candle.timeStart,
        receivedAt: candle.receivedAt,
        payload: candle,
      });
    }
  };

  const handleSubscriptionAcks = (acks: StreamSubscriptionAck[]): void => {
    for (const ack of acks) {
      if (ack.interval === null) {
        continue;
      }
      const providerKey = formatProviderSubscriptionKey({
        instrumentUid: ack.instrumentUid,
        interval: ack.interval,
        candleSource: 'EXCHANGE',
        waitingClose: ack.waitingClose ?? false,
      });
      if (ack.status === 'SUCCESS') {
        input.registry.setProviderStatus(providerKey, 'ACTIVE', ack.subscriptionId);
      } else {
        input.registry.setProviderStatus(providerKey, 'REJECTED', ack.subscriptionId);
      }
      for (const lease of input.registry.listActiveLeasesForProvider(providerKey)) {
        const socket = sockets.get(lease.connectionId);
        if (socket === undefined) {
          continue;
        }
        const refreshed = input.registry.getLease(lease.leaseId);
        if (refreshed === null) {
          continue;
        }
        sendJson(socket, {
          type: 'market.subscription.state',
          requestId: refreshed.requestId,
          subscriptionId: refreshed.leaseId,
          instrumentId: refreshed.key.instrumentUid,
          interval: refreshed.key.interval,
          status: refreshed.status,
          reason: refreshed.status === 'REJECTED' ? 'PROVIDER_REJECTED' : undefined,
          updatedAt: refreshed.updatedAt,
        });
      }
    }
  };

  async function handleSubscribe(
    socket: InternalWebSocket,
    message: ClientSubscribe,
  ): Promise<void> {
    const interval = toStreamInterval(message.interval);
    if (interval === null) {
      sendJson(socket, {
        type: 'market.subscription.state',
        requestId: message.requestId,
        subscriptionId: '',
        instrumentId: message.instrumentId,
        interval: message.interval,
        status: 'REJECTED',
        reason: 'UNSUPPORTED_INTERVAL',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const result = input.registry.acquire({
      connectionId: socket.connectionId,
      requestId: message.requestId,
      consumer: {
        consumerType: 'CHART',
        consumerId: `conn:${socket.connectionId}`,
      },
      key: {
        instrumentUid: message.instrumentId,
        interval,
        candleSource: 'EXCHANGE',
        waitingClose: false,
      },
    });

    if (!result.ok) {
      sendJson(socket, {
        type: 'market.subscription.state',
        requestId: message.requestId,
        subscriptionId: result.lease?.leaseId ?? '',
        instrumentId: message.instrumentId,
        interval: message.interval,
        status:
          result.reason === 'DUPLICATE_REQUEST' ? (result.lease?.status ?? 'REJECTED') : 'REJECTED',
        reason:
          result.reason === 'PROVIDER_LIMIT'
            ? 'PROVIDER_LIMIT'
            : result.reason === 'RATE_LIMITED'
              ? 'RATE_LIMITED'
              : undefined,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    sendJson(socket, {
      type: 'market.subscription.state',
      requestId: message.requestId,
      subscriptionId: result.lease.leaseId,
      instrumentId: message.instrumentId,
      interval: message.interval,
      status: result.lease.status,
      updatedAt: result.lease.updatedAt,
    });

    try {
      await syncProvider();
    } catch (error: unknown) {
      input.registry.setLeaseStatus(
        result.lease.leaseId,
        'REJECTED',
        error instanceof Error ? error.message : 'INTERNAL_ERROR',
      );
      sendJson(socket, {
        type: 'market.subscription.state',
        requestId: message.requestId,
        subscriptionId: result.lease.leaseId,
        instrumentId: message.instrumentId,
        interval: message.interval,
        status: 'REJECTED',
        reason: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'subscribe failed',
        updatedAt: new Date().toISOString(),
      });
      input.registry.release(result.lease.leaseId);
      await syncProvider();
    }
  }

  function handleUnsubscribe(socket: InternalWebSocket, message: ClientUnsubscribe): void {
    const lease = input.registry.getLease(message.subscriptionId);
    if (lease !== null && lease.connectionId !== socket.connectionId) {
      sendJson(socket, {
        type: 'market.subscription.state',
        requestId: message.requestId,
        subscriptionId: message.subscriptionId,
        instrumentId: lease.key.instrumentUid,
        interval: lease.key.interval,
        status: 'REJECTED',
        reason: 'UNAUTHORIZED',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const released = input.registry.release(message.subscriptionId);
    sendJson(socket, {
      type: 'market.subscription.state',
      requestId: message.requestId,
      subscriptionId: message.subscriptionId,
      instrumentId: released.lease?.key.instrumentUid ?? '',
      interval: released.lease?.key.interval ?? '',
      status: 'INACTIVE',
      updatedAt: new Date().toISOString(),
    });
    if (released.shouldUnsubscribeProvider) {
      void syncProvider();
    }
  }

  return {
    handleCandle,
    handleSubscriptionAcks,
    attach(server: Server): void {
      attachInternalWebSocketServer(server, {
        path: '/ws/market-data',
        onConnection(socket: InternalWebSocket, _request: IncomingMessage) {
          sockets.set(socket.connectionId, socket);
          sendJson(socket, {
            type: 'market.connection.ready',
            connectionId: socket.connectionId,
            updatedAt: new Date().toISOString(),
          });
        },
        onMessage(socket, text) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            sendJson(socket, {
              type: 'market.error',
              message: 'invalid JSON',
              updatedAt: new Date().toISOString(),
            });
            return;
          }

          const subscribe = parseSubscribe(parsed);
          if (subscribe !== null) {
            void handleSubscribe(socket, subscribe);
            return;
          }
          const unsubscribe = parseUnsubscribe(parsed);
          if (unsubscribe !== null) {
            handleUnsubscribe(socket, unsubscribe);
            return;
          }
          sendJson(socket, {
            type: 'market.error',
            message: 'unknown message type',
            updatedAt: new Date().toISOString(),
          });
        },
        onClose(socket) {
          sockets.delete(socket.connectionId);
          const released = input.registry.releaseAllForConnection(socket.connectionId);
          if (released.some((item) => item.shouldUnsubscribeProvider)) {
            void syncProvider();
          }
        },
      });
    },
    async shutdown(): Promise<void> {
      for (const socket of sockets.values()) {
        socket.close(1001, 'server shutdown');
      }
      sockets.clear();
      await input.streamManager.shutdown();
    },
  };
}
