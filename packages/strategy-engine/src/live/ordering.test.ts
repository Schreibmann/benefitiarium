import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle, EngineMarketEvent } from '../types.js';
import { compareMarketEvents, isLateConfirmedEvent, sortMarketEvents } from './ordering.js';

const instrumentId = parseInstrumentId('16161616-1616-4161-8161-161616161616');

function candle(
  overrides: Partial<EngineCandle> & Pick<EngineCandle, 'timestamp' | 'revision'>,
): EngineCandle {
  return {
    instrumentId,
    timeframe: '5m',
    closeTimestamp: overrides.timestamp + 300_000,
    open: parseDecimalString('100'),
    high: parseDecimalString('101'),
    low: parseDecimalString('99'),
    close: parseDecimalString('100.5'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    sourceEventId: 'src',
    ...overrides,
  };
}

function event(
  overrides: Partial<EngineMarketEvent> & Pick<EngineMarketEvent, 'eventId' | 'candle'>,
): EngineMarketEvent {
  return {
    receivedAt: 1,
    eventTimestamp: overrides.candle.timestamp,
    kind: 'CANDLE_CLOSED',
    ...overrides,
  };
}

describe('compareMarketEvents', () => {
  it('prefers provider sequence when both sides have it', () => {
    const a = event({
      eventId: 'a',
      sequence: 2,
      candle: candle({ timestamp: 1000, revision: 1 }),
    });
    const b = event({
      eventId: 'b',
      sequence: 1,
      candle: candle({ timestamp: 2000, revision: 1 }),
    });
    expect(compareMarketEvents(a, b)).toBeGreaterThan(0);
  });

  it('falls back to timestamps, revision, then eventId', () => {
    const sorted = sortMarketEvents([
      event({
        eventId: 'c',
        eventTimestamp: 10,
        candle: candle({ timestamp: 100, revision: 2 }),
      }),
      event({
        eventId: 'a',
        eventTimestamp: 10,
        candle: candle({ timestamp: 100, revision: 1 }),
      }),
      event({
        eventId: 'b',
        eventTimestamp: 5,
        candle: candle({ timestamp: 50, revision: 1 }),
      }),
    ]);
    expect(sorted.map((item) => item.eventId)).toEqual(['b', 'a', 'c']);
  });
});

describe('isLateConfirmedEvent', () => {
  it('detects closed candles older than the latest confirmed bar', () => {
    const late = event({
      eventId: 'late',
      candle: candle({ timestamp: 100, revision: 1, status: 'CLOSED' }),
    });
    expect(isLateConfirmedEvent(late, 200)).toBe(true);
    expect(isLateConfirmedEvent(late, null)).toBe(false);
  });

  it('ignores live updates', () => {
    const live = event({
      eventId: 'live',
      kind: 'CANDLE_UPDATE',
      candle: candle({ timestamp: 100, revision: 1, status: 'OPEN' }),
    });
    expect(isLateConfirmedEvent(live, 200)).toBe(false);
  });
});
