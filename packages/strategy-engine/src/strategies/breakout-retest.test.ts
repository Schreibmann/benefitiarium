import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle } from '../types.js';
import { updateBreakoutRetestSetup } from './breakout-retest.js';

const instrumentId = parseInstrumentId('14141414-1414-4141-8141-141414141414');

function candle(
  index: number,
  open: string,
  high: string,
  low: string,
  close: string,
  volume = '20',
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
    volume: parseDecimalString(volume),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `br-${index}`,
  };
}

describe('updateBreakoutRetestSetup', () => {
  it('tracks breakout then retest confirmation for LONG', () => {
    // Fill RVOL baseline with 20 quiet candles, then breakout + retest
    const baseline = Array.from({ length: 20 }, (_, index) =>
      candle(index, '100', '101', '99', '100', '10'),
    );
    const breakout = candle(20, '101', '108', '100', '107', '30');
    const retest = candle(21, '106', '107', '104.5', '106.5', '15');

    const first = updateBreakoutRetestSetup({
      instrumentId,
      setupTimeframe: '5m',
      direction: 'LONG',
      now: breakout.closeTimestamp,
      candles: [...baseline, breakout],
      atr: '5',
      tickSize: '0.01',
      boundary: '105',
      config: { minBreakoutRvol: 1.0 },
    });
    expect(first.state.breakoutAt).not.toBeNull();
    expect(['APPROACHING', 'FORMING', 'TRIGGERED']).toContain(first.update?.setup.status);
    expect(first.update?.setup.reasonCodes).toContain('BREAKOUT_CONFIRMED');

    const second = updateBreakoutRetestSetup({
      instrumentId,
      setupTimeframe: '5m',
      direction: 'LONG',
      now: retest.closeTimestamp,
      candles: [...baseline, breakout, retest],
      atr: '5',
      tickSize: '0.01',
      boundary: '105',
      state: first.state,
      existing: first.update?.setup ?? null,
      config: { minBreakoutRvol: 1.0 },
    });

    expect(['FORMING', 'TRIGGERED', 'APPROACHING']).toContain(second.update?.setup.status);
    expect(second.update?.setup.strategy).toBe('BREAKOUT_RETEST');
  });
});
