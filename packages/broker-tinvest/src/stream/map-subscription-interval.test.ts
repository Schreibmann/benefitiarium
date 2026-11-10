import { SubscriptionInterval } from '@ttech-pub/grpc-node-client';
import { describe, expect, it } from 'vitest';
import {
  isStreamCandleInterval,
  mapIntervalToSubscriptionInterval,
  mapSubscriptionIntervalToCandleInterval,
} from './map-subscription-interval.js';

describe('map-subscription-interval', () => {
  it('maps supported intervals both ways', () => {
    expect(mapIntervalToSubscriptionInterval('5m')).toBe(
      SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIVE_MINUTES,
    );
    expect(mapIntervalToSubscriptionInterval('1h')).toBe(
      SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_HOUR,
    );
    expect(
      mapSubscriptionIntervalToCandleInterval(
        SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIVE_MINUTES,
      ),
    ).toBe('5m');
  });

  it('rejects sub-minute historical intervals for stream', () => {
    expect(isStreamCandleInterval('5s')).toBe(false);
    expect(isStreamCandleInterval('5m')).toBe(true);
  });
});
