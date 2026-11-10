import { CandleSource, SubscriptionInterval } from '@ttech-pub/grpc-node-client';
import { describe, expect, it } from 'vitest';
import { mapStreamCandle, marketCandleEventTypeForBarState } from './map-stream-candle.js';

describe('mapStreamCandle (v1.3)', () => {
  it('maps quotation OHLC and int64 volume without reading stream is_complete', () => {
    const mapped = mapStreamCandle(
      {
        instrumentUid: 'uid-1',
        interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_FIVE_MINUTES,
        time: new Date('2026-11-10T10:00:00.000Z'),
        open: { units: 100, nano: 500_000_000 },
        high: { units: 101, nano: 0 },
        low: { units: 99, nano: 250_000_000 },
        close: { units: 100, nano: 750_000_000 },
        volume: 12_345n,
        // Poison field: stream Candle must ignore this even if present in a fixture.
        isComplete: true,
        candleSourceType: CandleSource.CANDLE_SOURCE_EXCHANGE,
      },
      { receivedAt: '2026-11-10T10:00:01.000Z', waitingClose: false },
    );

    expect(mapped).not.toBeNull();
    if (mapped === null) {
      return;
    }
    expect(mapped.interval).toBe('5m');
    expect(mapped.open).toBe('100.5');
    expect(mapped.high).toBe('101');
    expect(mapped.low).toBe('99.25');
    expect(mapped.close).toBe('100.75');
    expect(mapped.volumeLots).toBe('12345');
    expect(mapped.deliveryMode).toBe('LIVE_UPDATES');
    expect(mapped.barState).toBe('UPDATING');
    expect(mapped.waitingClose).toBe(false);
    expect(mapped.historicalProviderIsComplete).toBeNull();
    expect(mapped.candleSource).toBe('EXCHANGE');
    expect(mapped.receivedAt).toBe('2026-11-10T10:00:01.000Z');
    expect(Object.hasOwn(mapped, 'isComplete')).toBe(false);
  });

  it('marks WAITING_CLOSE deliveries as CLOSE_EMITTED from subscription config', () => {
    const mapped = mapStreamCandle(
      {
        instrumentUid: 'uid-1',
        interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE,
        time: new Date('2026-11-10T10:00:00.000Z'),
        open: { units: 1, nano: 0 },
        high: { units: 1, nano: 0 },
        low: { units: 1, nano: 0 },
        close: { units: 1, nano: 0 },
        volume: 1,
        candleSourceType: CandleSource.CANDLE_SOURCE_EXCHANGE,
      },
      { waitingClose: true },
    );
    expect(mapped?.deliveryMode).toBe('WAITING_CLOSE');
    expect(mapped?.barState).toBe('CLOSE_EMITTED');
    expect(marketCandleEventTypeForBarState(mapped?.barState ?? 'UNKNOWN')).toBe(
      'market.candle.close_emitted',
    );
  });
});
