import { describe, expect, it } from 'vitest';
import {
  chartTimeRangeToIso,
  utcDayKeysFromTimeRange,
  visibleVolumeFetchKey,
} from './visible-volume-range.js';

describe('utcDayKeysFromTimeRange', () => {
  it('returns a single UTC day for an intra-day range', () => {
    expect(
      utcDayKeysFromTimeRange({
        fromMs: Date.UTC(2026, 10, 15, 8, 0, 0),
        toMs: Date.UTC(2026, 10, 15, 18, 30, 0),
      }),
    ).toEqual(['2026-11-15']);
  });

  it('includes every UTC day spanning the range', () => {
    expect(
      utcDayKeysFromTimeRange({
        fromMs: Date.UTC(2026, 10, 14, 22, 0, 0),
        toMs: Date.UTC(2026, 10, 16, 2, 0, 0),
      }),
    ).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
  });
});

describe('visibleVolumeFetchKey', () => {
  it('is stable for the same instrument, timeframe, and UTC days', () => {
    const a = visibleVolumeFetchKey({
      instrumentUid: 'uid-1',
      timeframe: '5m',
      range: {
        fromMs: Date.UTC(2026, 10, 15, 9, 0, 0),
        toMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      },
    });
    const b = visibleVolumeFetchKey({
      instrumentUid: 'uid-1',
      timeframe: '5m',
      range: {
        fromMs: Date.UTC(2026, 10, 15, 10, 0, 0),
        toMs: Date.UTC(2026, 10, 15, 16, 0, 0),
      },
    });
    expect(a).toBe(b);
    expect(a).toBe('uid-1|5m|2026-11-15');
  });

  it('changes when the UTC day set changes', () => {
    const sameDay = visibleVolumeFetchKey({
      instrumentUid: 'uid-1',
      timeframe: '5m',
      range: {
        fromMs: Date.UTC(2026, 10, 15, 9, 0, 0),
        toMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      },
    });
    const nextDay = visibleVolumeFetchKey({
      instrumentUid: 'uid-1',
      timeframe: '5m',
      range: {
        fromMs: Date.UTC(2026, 10, 15, 20, 0, 0),
        toMs: Date.UTC(2026, 10, 16, 2, 0, 0),
      },
    });
    expect(nextDay).not.toBe(sameDay);
    expect(nextDay).toBe('uid-1|5m|2026-11-15,2026-11-16');
  });
});

describe('chartTimeRangeToIso', () => {
  it('orders from/to ascending', () => {
    expect(
      chartTimeRangeToIso({
        fromMs: Date.UTC(2026, 10, 15, 18, 0, 0),
        toMs: Date.UTC(2026, 10, 15, 8, 0, 0),
      }),
    ).toEqual({
      from: '2026-11-15T08:00:00.000Z',
      to: '2026-11-15T18:00:00.000Z',
    });
  });
});
