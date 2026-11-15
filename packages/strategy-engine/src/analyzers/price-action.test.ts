import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { ConfluenceZone } from '../confluence/confluence.js';
import type { EngineCandle } from '../types.js';
import { analyzePriceAction } from './price-action.js';

const instrumentId = parseInstrumentId('12121212-1212-4121-8121-121212121212');

function candle(
  index: number,
  open: string,
  high: string,
  low: string,
  close: string,
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
    sourceEventId: `pa-${index}`,
  };
}

const zone: ConfluenceZone = {
  id: 'z1',
  low: parseDecimalString('99'),
  high: parseDecimalString('101'),
  center: parseDecimalString('100'),
  members: [],
  familyCount: 1,
  familyStrength: { FIBONACCI: 0.8 },
  overallStrength: 0.8,
  createdAt: 1,
  invalidatedAt: null,
};

describe('analyzePriceAction', () => {
  it('detects bullish engulfing', () => {
    const evidence = analyzePriceAction({
      candles: [candle(0, '105', '106', '100', '101'), candle(1, '100', '108', '99', '107')],
      tickSize: '0.01',
    });
    expect(evidence.some((item) => item.pattern === 'BULLISH_ENGULFING')).toBe(true);
  });

  it('detects bullish rejection at a zone', () => {
    const evidence = analyzePriceAction({
      candles: [candle(0, '102', '103', '98', '102.5')],
      zones: [zone],
      tickSize: '0.01',
    });
    expect(evidence.some((item) => item.pattern === 'BULLISH_REJECTION')).toBe(true);
  });

  it('detects breakout close through a level', () => {
    const evidence = analyzePriceAction({
      candles: [candle(0, '100', '106', '99', '105')],
      breakoutLevel: parseDecimalString('100'),
      breakoutDirection: 'LONG',
      breakoutBuffer: '1',
      tickSize: '0.01',
    });
    expect(evidence.some((item) => item.pattern === 'BULLISH_BREAKOUT_CLOSE')).toBe(true);
  });
});
