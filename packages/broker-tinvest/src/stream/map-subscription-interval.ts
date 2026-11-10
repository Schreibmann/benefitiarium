import type { CandleInterval } from '@moex/domain';
import { SubscriptionInterval } from '@ttech-pub/grpc-node-client';

const TO_SDK: Partial<Record<CandleInterval, SubscriptionInterval>> = {
  '1m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE,
  '2m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_2_MIN,
  '3m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_3_MIN,
  '5m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIVE_MINUTES,
  '10m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_10_MIN,
  '15m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIFTEEN_MINUTES,
  '30m': SubscriptionInterval.SUBSCRIPTION_INTERVAL_30_MIN,
  '1h': SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_HOUR,
  '2h': SubscriptionInterval.SUBSCRIPTION_INTERVAL_2_HOUR,
  '4h': SubscriptionInterval.SUBSCRIPTION_INTERVAL_4_HOUR,
  '1d': SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_DAY,
  '1w': SubscriptionInterval.SUBSCRIPTION_INTERVAL_WEEK,
  '1M': SubscriptionInterval.SUBSCRIPTION_INTERVAL_MONTH,
};

/** Intervals supported by MarketDataStream SubscriptionInterval (no 5s/10s/30s). */
export type StreamCandleInterval = Exclude<CandleInterval, '5s' | '10s' | '30s'>;

export function isStreamCandleInterval(interval: string): interval is StreamCandleInterval {
  switch (interval) {
    case '1m':
    case '2m':
    case '3m':
    case '5m':
    case '10m':
    case '15m':
    case '30m':
    case '1h':
    case '2h':
    case '4h':
    case '1d':
    case '1w':
    case '1M':
      return true;
    default:
      return false;
  }
}

export function mapIntervalToSubscriptionInterval(
  interval: StreamCandleInterval,
): SubscriptionInterval {
  const mapped = TO_SDK[interval];
  if (mapped === undefined) {
    throw new Error(`Unsupported stream candle interval: ${interval}`);
  }
  return mapped;
}

export function mapSubscriptionIntervalToCandleInterval(
  interval: SubscriptionInterval,
): StreamCandleInterval | null {
  switch (interval) {
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE:
      return '1m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_2_MIN:
      return '2m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_3_MIN:
      return '3m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIVE_MINUTES:
      return '5m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_10_MIN:
      return '10m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIFTEEN_MINUTES:
      return '15m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_30_MIN:
      return '30m';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_HOUR:
      return '1h';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_2_HOUR:
      return '2h';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_4_HOUR:
      return '4h';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_DAY:
      return '1d';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_WEEK:
      return '1w';
    case SubscriptionInterval.SUBSCRIPTION_INTERVAL_MONTH:
      return '1M';
    default:
      return null;
  }
}
