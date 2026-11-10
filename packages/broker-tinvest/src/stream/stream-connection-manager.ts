import { type NodeApiClient, SubscriptionAction } from '@ttech-pub/grpc-node-client';
import { type CanonicalStreamCandle, mapStreamCandle } from './map-stream-candle.js';
import {
  mapIntervalToSubscriptionInterval,
  mapSubscriptionIntervalToCandleInterval,
} from './map-subscription-interval.js';
import { mapSubscriptionStatus } from './map-subscription-status.js';
import type { ProviderSubscriptionKey } from './provider-subscription-key.js';
import { PushableAsyncIterable } from './pushable-async-iterable.js';
import {
  DEFAULT_RECONNECT_POLICY,
  nextReconnectDelayMs,
  type ReconnectPolicy,
} from './reconnect-policy.js';

export type StreamConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'SHUTTING_DOWN'
  | 'FAILED';

export type StreamSubscriptionAck = {
  instrumentUid: string;
  interval: ProviderSubscriptionKey['interval'] | null;
  status: ReturnType<typeof mapSubscriptionStatus>;
  subscriptionId: string | null;
  waitingClose: boolean | null;
};

export type StreamConnectionManagerHandlers = {
  onStateChange?: (state: StreamConnectionState) => void;
  onCandle?: (candle: CanonicalStreamCandle) => void;
  onSubscriptionAck?: (acks: StreamSubscriptionAck[]) => void;
  onError?: (error: unknown) => void;
};

export type StreamConnectionManagerOptions = {
  client: NodeApiClient;
  handlers?: StreamConnectionManagerHandlers;
  reconnectPolicy?: ReconnectPolicy;
  sleep?: (ms: number) => Promise<void>;
};

type OutboundStreamRequest = {
  subscribeCandlesRequest: {
    subscriptionAction: SubscriptionAction;
    instruments: Array<{ instrumentId: string; interval: number }>;
    waitingClose: boolean;
  };
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Owns one MarketDataStream bidi connection per credential/environment.
 * High-level GetMarketdataStreamCommand uses server-side stream only; this manager
 * uses NodeApiClient.marketdataStream.marketDataStream with a pushable request sink.
 */
export class StreamConnectionManager {
  private state: StreamConnectionState = 'DISCONNECTED';
  private readonly client: NodeApiClient;
  private readonly handlers: StreamConnectionManagerHandlers;
  private readonly reconnectPolicy: ReconnectPolicy;
  private readonly sleep: (ms: number) => Promise<void>;
  private requestSink: PushableAsyncIterable<OutboundStreamRequest> | null = null;
  private readLoop: Promise<void> | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: Promise<void> | null = null;
  private desired = new Map<string, ProviderSubscriptionKey>();
  private lastMessageAt: string | null = null;
  private readonly lastEventByBar = new Map<string, { eventHash: string; revision: number }>();

  constructor(options: StreamConnectionManagerOptions) {
    this.client = options.client;
    this.handlers = options.handlers ?? {};
    this.reconnectPolicy = options.reconnectPolicy ?? DEFAULT_RECONNECT_POLICY;
    this.sleep = options.sleep ?? defaultSleep;
  }

  getState(): StreamConnectionState {
    return this.state;
  }

  getLastMessageAt(): string | null {
    return this.lastMessageAt;
  }

  async ensureConnected(): Promise<void> {
    if (
      this.state === 'CONNECTED' ||
      this.state === 'CONNECTING' ||
      this.state === 'SHUTTING_DOWN'
    ) {
      return;
    }
    await this.connect();
  }

  async syncDesiredSubscriptions(keys: readonly ProviderSubscriptionKey[]): Promise<void> {
    const next = new Map<string, ProviderSubscriptionKey>();
    for (const key of keys) {
      next.set(
        `${key.instrumentUid}|${key.interval}|${key.candleSource}|${key.waitingClose ? 'c' : 'i'}`,
        key,
      );
    }

    const toSubscribe: ProviderSubscriptionKey[] = [];
    const toUnsubscribe: ProviderSubscriptionKey[] = [];
    for (const [id, key] of next) {
      if (!this.desired.has(id)) {
        toSubscribe.push(key);
      }
    }
    for (const [id, key] of this.desired) {
      if (!next.has(id)) {
        toUnsubscribe.push(key);
      }
    }
    this.desired = next;

    if (this.state !== 'CONNECTED') {
      await this.ensureConnected();
      if (this.desired.size > 0) {
        await this.sendSubscribe([...this.desired.values()]);
      }
      return;
    }

    if (toUnsubscribe.length > 0) {
      await this.sendUnsubscribe(toUnsubscribe);
    }
    if (toSubscribe.length > 0) {
      await this.sendSubscribe(toSubscribe);
    }
  }

  async shutdown(): Promise<void> {
    this.setState('SHUTTING_DOWN');
    this.requestSink?.end();
    this.requestSink = null;
    if (this.readLoop !== null) {
      try {
        await this.readLoop;
      } catch {
        // swallow on shutdown
      }
    }
    this.readLoop = null;
    this.setState('DISCONNECTED');
  }

  private setState(state: StreamConnectionState): void {
    this.state = state;
    this.handlers.onStateChange?.(state);
  }

  private async connect(): Promise<void> {
    if (this.state === 'CONNECTING' || this.state === 'CONNECTED') {
      return;
    }
    this.setState(this.reconnectAttempt > 0 ? 'RECONNECTING' : 'CONNECTING');
    const sink = new PushableAsyncIterable<OutboundStreamRequest>();
    this.requestSink = sink;

    try {
      const responses = this.client.marketdataStream.marketDataStream(toAsyncRequestIterable(sink));
      this.readLoop = this.consume(responses);
      this.setState('CONNECTED');
      this.reconnectAttempt = 0;
      if (this.desired.size > 0) {
        await this.sendSubscribe([...this.desired.values()]);
      }
    } catch (error: unknown) {
      this.handlers.onError?.(error);
      this.setState('FAILED');
      this.scheduleReconnect();
    }
  }

  private async consume(responses: AsyncIterable<unknown>): Promise<void> {
    try {
      for await (const response of responses) {
        this.lastMessageAt = new Date().toISOString();
        this.handleResponse(response);
      }
      if (this.state !== 'SHUTTING_DOWN') {
        this.setState('DISCONNECTED');
        this.scheduleReconnect();
      }
    } catch (error: unknown) {
      if (this.state === 'SHUTTING_DOWN') {
        return;
      }
      this.handlers.onError?.(error);
      this.setState('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private handleResponse(response: unknown): void {
    if (typeof response !== 'object' || response === null) {
      return;
    }

    if ('subscribeCandlesResponse' in response) {
      const ack = Reflect.get(response, 'subscribeCandlesResponse');
      if (typeof ack === 'object' && ack !== null && 'candlesSubscriptions' in ack) {
        const list = Reflect.get(ack, 'candlesSubscriptions');
        if (Array.isArray(list)) {
          const mapped: StreamSubscriptionAck[] = [];
          for (const item of list) {
            if (typeof item !== 'object' || item === null) {
              continue;
            }
            const instrumentUid =
              typeof Reflect.get(item, 'instrumentUid') === 'string'
                ? String(Reflect.get(item, 'instrumentUid'))
                : '';
            const statusRaw = Reflect.get(item, 'subscriptionStatus');
            const status =
              typeof statusRaw === 'number'
                ? mapSubscriptionStatus(statusRaw)
                : mapSubscriptionStatus(0);
            const intervalRaw = Reflect.get(item, 'interval');
            const interval =
              typeof intervalRaw === 'number'
                ? mapSubscriptionIntervalToCandleInterval(intervalRaw)
                : null;
            const subscriptionIdRaw = Reflect.get(item, 'subscriptionId');
            mapped.push({
              instrumentUid,
              interval,
              status,
              subscriptionId: typeof subscriptionIdRaw === 'string' ? subscriptionIdRaw : null,
              waitingClose:
                typeof Reflect.get(item, 'waitingClose') === 'boolean'
                  ? Boolean(Reflect.get(item, 'waitingClose'))
                  : null,
            });
          }
          this.handlers.onSubscriptionAck?.(mapped);
        }
      }
    }

    if ('candle' in response) {
      const raw = Reflect.get(response, 'candle');
      const waitingClose = this.resolveWaitingCloseForRawCandle(raw);
      const barKeyPreview = previewBarKey(raw, waitingClose);
      const previous = barKeyPreview === null ? undefined : this.lastEventByBar.get(barKeyPreview);
      const mapOptions: {
        waitingClose: boolean;
        revision: number;
        previousEventHash: string | null;
        receivedAt?: string;
      } = {
        waitingClose,
        revision: previous?.revision ?? 1,
        previousEventHash: previous?.eventHash ?? null,
      };
      if (this.lastMessageAt !== null) {
        mapOptions.receivedAt = this.lastMessageAt;
      }
      const candle = mapStreamCandle(raw, mapOptions);
      if (candle !== null) {
        const barKey = [
          candle.instrumentUid,
          candle.interval,
          candle.timeStart,
          candle.waitingClose ? 'c' : 'i',
        ].join('|');
        this.lastEventByBar.set(barKey, {
          eventHash: candle.eventHash,
          revision: candle.revision,
        });
        this.handlers.onCandle?.(candle);
      }
    }
  }

  private resolveWaitingCloseForRawCandle(raw: unknown): boolean {
    if (typeof raw !== 'object' || raw === null) {
      return false;
    }
    const instrumentUid =
      typeof Reflect.get(raw, 'instrumentUid') === 'string'
        ? String(Reflect.get(raw, 'instrumentUid'))
        : null;
    const intervalRaw = Reflect.get(raw, 'interval');
    const interval =
      typeof intervalRaw === 'number' ? mapSubscriptionIntervalToCandleInterval(intervalRaw) : null;
    if (instrumentUid === null || interval === null) {
      return false;
    }
    let foundLive = false;
    let foundClose = false;
    for (const key of this.desired.values()) {
      if (key.instrumentUid === instrumentUid && key.interval === interval) {
        if (key.waitingClose) {
          foundClose = true;
        } else {
          foundLive = true;
        }
      }
    }
    // Prefer LIVE_UPDATES when both modes are subscribed (ambiguous stream payload).
    if (foundLive) {
      return false;
    }
    return foundClose;
  }

  private async sendSubscribe(keys: ProviderSubscriptionKey[]): Promise<void> {
    await this.sendCandlesAction(SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE, keys);
  }

  private async sendUnsubscribe(keys: ProviderSubscriptionKey[]): Promise<void> {
    await this.sendCandlesAction(SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE, keys);
  }

  private async sendCandlesAction(
    action: SubscriptionAction,
    keys: ProviderSubscriptionKey[],
  ): Promise<void> {
    if (keys.length === 0 || this.requestSink === null) {
      return;
    }
    // waitingClose is part of the request, not per-instrument; group by waitingClose
    const byWaiting = new Map<boolean, ProviderSubscriptionKey[]>();
    for (const key of keys) {
      const group = byWaiting.get(key.waitingClose) ?? [];
      group.push(key);
      byWaiting.set(key.waitingClose, group);
    }
    for (const [waitingClose, group] of byWaiting) {
      this.requestSink.push({
        subscribeCandlesRequest: {
          subscriptionAction: action,
          instruments: group.map((key) => ({
            instrumentId: key.instrumentUid,
            interval: mapIntervalToSubscriptionInterval(key.interval),
          })),
          waitingClose,
          // candleSourceType omitted: SDK aliases CandleSource vs GetCandlesRequest_CandleSource;
          // EXCHANGE is enforced in our CanonicalStreamCandle mapping + registry keys.
        },
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.state === 'SHUTTING_DOWN' || this.reconnectTimer !== null) {
      return;
    }
    const attempt = this.reconnectAttempt;
    this.reconnectAttempt += 1;
    const delay = nextReconnectDelayMs(attempt, this.reconnectPolicy);
    this.reconnectTimer = this.sleep(delay).then(async () => {
      this.reconnectTimer = null;
      if (this.state === 'SHUTTING_DOWN') {
        return;
      }
      await this.connect();
    });
  }
}

function previewBarKey(raw: unknown, waitingClose: boolean): string | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const instrumentUid =
    typeof Reflect.get(raw, 'instrumentUid') === 'string'
      ? String(Reflect.get(raw, 'instrumentUid'))
      : null;
  const intervalRaw = Reflect.get(raw, 'interval');
  const interval =
    typeof intervalRaw === 'number' ? mapSubscriptionIntervalToCandleInterval(intervalRaw) : null;
  const timeRaw = Reflect.get(raw, 'time');
  let time: string | null = null;
  if (timeRaw instanceof Date) {
    time = timeRaw.toISOString();
  } else if (typeof timeRaw === 'string') {
    time = timeRaw;
  }
  if (instrumentUid === null || interval === null || time === null) {
    return null;
  }
  return `${instrumentUid}|${interval}|${time}|${waitingClose ? 'c' : 'i'}`;
}

/**
 * Adapt our typed outbound requests to the SDK DeepPartial request iterable
 * without asserting through an incompatible candleSource enum alias.
 */
async function* toAsyncRequestIterable(
  source: AsyncIterable<OutboundStreamRequest>,
): AsyncIterable<OutboundStreamRequest> {
  for await (const item of source) {
    yield item;
  }
}
