import type { ReferencePeriodOHLC } from '@moex/indicators';
import { describe, expect, it } from 'vitest';
import { tradingPeriodsFromReference } from './reference-periods.js';

function source(day: string, nextDay: string): ReferencePeriodOHLC {
  return {
    instrumentUid: 'uid',
    timeframe: '1d',
    periodId: `1d:${day}`,
    start: new Date(day),
    end: new Date(nextDay),
    high: '1',
    low: '1',
    close: '1',
    isComplete: true,
    source: {
      provider: 't-invest',
      candleSource: 'EXCHANGE',
      interval: '1d',
      aggregationMethod: 'NATIVE',
      sourceHash: 'abc',
    },
  };
}

describe('tradingPeriodsFromReference', () => {
  it('maps each complete source to a valid window', () => {
    const periods = tradingPeriodsFromReference([
      source('2026-11-07T00:00:00.000Z', '2026-11-08T00:00:00.000Z'),
      source('2026-11-08T00:00:00.000Z', '2026-11-09T00:00:00.000Z'),
    ]);
    expect(periods).toHaveLength(2);
    expect(periods[1]?.periodId).toBe('valid:1d:2026-11-08T00:00:00.000Z');
  });

  it('appends an open period through requestedTo after the last close', () => {
    const periods = tradingPeriodsFromReference(
      [source('2026-11-08T00:00:00.000Z', '2026-11-09T00:00:00.000Z')],
      { openPeriodEnd: new Date('2026-11-09T18:00:00.000Z') },
    );
    expect(periods).toHaveLength(2);
    const open = periods[1];
    expect(open?.periodId).toBe('valid:open');
    expect(open?.start.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(open?.end.toISOString()).toBe('2026-11-09T18:00:00.000Z');
  });

  it('does not append open period when requestedTo is not after last close', () => {
    const periods = tradingPeriodsFromReference(
      [source('2026-11-08T00:00:00.000Z', '2026-11-09T00:00:00.000Z')],
      { openPeriodEnd: new Date('2026-11-09T00:00:00.000Z') },
    );
    expect(periods).toHaveLength(1);
  });
});
