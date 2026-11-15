import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle } from '../types.js';
import { computeConfirmedAtrSeries, trueRange } from './atr.js';

const instrumentId = parseInstrumentId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

function candle(
  index: number,
  high: string,
  low: string,
  close: string,
  open: string = close,
): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z') + index * 300_000;
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: start,
    closeTimestamp: start + 300_000,
    open: parseDecimalString(open),
    high: parseDecimalString(high),
    low: parseDecimalString(low),
    close: parseDecimalString(close),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `c-${index}`,
  };
}

describe('trueRange', () => {
  it('uses high-low when previous close is null', () => {
    expect(trueRange(candle(0, '12', '10', '11'), null)).toBe('2');
  });

  it('includes gaps from previous close', () => {
    expect(trueRange(candle(1, '15', '14', '14.5'), parseDecimalString('10'))).toBe('5');
  });
});

describe('computeConfirmedAtrSeries', () => {
  it('warms up with the mean of the first n TR values', () => {
    const candles = [
      candle(0, '11', '10', '10.5'),
      candle(1, '11.5', '10.5', '11'),
      candle(2, '12', '11', '11.5'),
    ];
    const series = computeConfirmedAtrSeries(candles, 3);
    expect(series).toHaveLength(3);
    expect(series[0]?.atr).toBeNull();
    expect(series[1]?.atr).toBeNull();
    expect(series[2]?.atr).toBe('1');
  });

  it('applies Wilder smoothing after warm-up', () => {
    const candles = [
      candle(0, '11', '10', '10.5'),
      candle(1, '11.5', '10.5', '11'),
      candle(2, '12', '11', '11.5'),
      candle(3, '20', '10', '15'),
    ];
    const series = computeConfirmedAtrSeries(candles, 3);
    // ATR3 = ((3-1)*1 + 10) / 3 = 12/3 = 4
    expect(series[3]?.atr).toBe('4');
  });
});
