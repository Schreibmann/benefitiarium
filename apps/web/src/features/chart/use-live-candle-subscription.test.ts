import { describe, expect, it } from 'vitest';
import type { CandleRow } from './types.js';
import { type LiveCandleEvent, upsertLiveCandle } from './use-live-candle-subscription.js';

function event(
  partial: Partial<LiveCandleEvent['payload']> & { timeStart: string },
  type: LiveCandleEvent['type'] = 'market.candle.updated',
): LiveCandleEvent {
  return {
    type,
    subscriptionId: 'lease-1',
    instrumentId: 'uid-1',
    interval: '5m',
    eventId: `e:${partial.timeStart}:${type}`,
    occurredAt: partial.timeStart,
    receivedAt: '2026-11-10T10:00:01.000Z',
    payload: {
      open: '1',
      high: '2',
      low: '0.5',
      close: '1.5',
      volumeLots: '10',
      deliveryMode: 'LIVE_UPDATES',
      barState: 'UPDATING',
      ...partial,
    },
  };
}

describe('upsertLiveCandle', () => {
  it('inserts a new bar and updates an existing bar in place', () => {
    const seed: CandleRow[] = [
      {
        Date: new Date('2026-11-10T09:55:00.000Z'),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
    ];
    const withNew = upsertLiveCandle(seed, event({ timeStart: '2026-11-10T10:00:00.000Z' }));
    expect(withNew).toHaveLength(2);
    expect(withNew[1]?.isClosed).toBe(false);
    const updated = upsertLiveCandle(
      withNew,
      event(
        {
          timeStart: '2026-11-10T10:00:00.000Z',
          close: '1.75',
          high: '2.1',
          barState: 'CLOSE_EMITTED',
          deliveryMode: 'WAITING_CLOSE',
        },
        'market.candle.close_emitted',
      ),
    );
    expect(updated).toHaveLength(2);
    expect(updated[1]?.Close).toBe(1.75);
    expect(updated[1]?.High).toBe(2.1);
    expect(updated[1]?.isClosed).toBe(true);
  });
});
