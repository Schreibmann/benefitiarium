import type { StreamCandleSource } from './map-stream-candle.js';
import type { StreamCandleInterval } from './map-subscription-interval.js';

export type ProviderSubscriptionKey = {
  instrumentUid: string;
  interval: StreamCandleInterval;
  candleSource: Extract<StreamCandleSource, 'EXCHANGE'>;
  waitingClose: boolean;
};

export function formatProviderSubscriptionKey(key: ProviderSubscriptionKey): string {
  return [
    key.instrumentUid,
    key.interval,
    key.candleSource,
    key.waitingClose ? 'close' : 'intrabar',
  ].join('|');
}

export function parseProviderSubscriptionKey(raw: string): ProviderSubscriptionKey | null {
  const parts = raw.split('|');
  if (parts.length !== 4) {
    return null;
  }
  const [instrumentUid, interval, candleSource, waiting] = parts;
  if (
    instrumentUid === undefined ||
    interval === undefined ||
    candleSource !== 'EXCHANGE' ||
    (waiting !== 'close' && waiting !== 'intrabar')
  ) {
    return null;
  }
  if (
    interval !== '1m' &&
    interval !== '2m' &&
    interval !== '3m' &&
    interval !== '5m' &&
    interval !== '10m' &&
    interval !== '15m' &&
    interval !== '30m' &&
    interval !== '1h' &&
    interval !== '2h' &&
    interval !== '4h' &&
    interval !== '1d' &&
    interval !== '1w' &&
    interval !== '1M'
  ) {
    return null;
  }
  return {
    instrumentUid,
    interval,
    candleSource: 'EXCHANGE',
    waitingClose: waiting === 'close',
  };
}
