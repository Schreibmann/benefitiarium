import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle, EngineInstrumentSpec } from '../types.js';
import { managePaperPositions } from './manage.js';

const instrumentId = parseInstrumentId('16161616-1616-4161-8161-161616161616');

const instrument: EngineInstrumentSpec = {
  instrumentId,
  exchange: 'MOEX',
  tickSize: parseDecimalString('0.01'),
  lotSize: 1,
  pointValue: parseDecimalString('1'),
  minQuantity: 1,
  quantityStep: 1,
  quoteCurrency: 'RUB',
  priceCurrency: 'RUB',
  tradingCalendarId: null,
  sessionProfile: 'SESSION_BASED',
};

function candle(overrides: Partial<EngineCandle> = {}): EngineCandle {
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: 1_000,
    closeTimestamp: 1_300,
    open: parseDecimalString('100'),
    high: parseDecimalString('101'),
    low: parseDecimalString('99'),
    close: parseDecimalString('100.5'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: 'src',
    ...overrides,
  };
}

describe('managePaperPositions', () => {
  it('opens a paper position from a confirmed entry and later closes on stop', () => {
    const opened = managePaperPositions({
      openPositions: [],
      entriesToOpen: [
        {
          positionId: 'pos-1',
          signalId: 'sig-1',
          instrumentId,
          timeframe: '5m',
          strategy: 'TREND_PULLBACK',
          direction: 'LONG',
          timestamp: 1_000,
          referencePrice: '100',
          tickSize: '0.01',
          stop: '95',
          targets: ['110', '120', '130'],
          quantity: 10,
          pointValue: '1',
          feePerUnit: '0.1',
          algorithmVersion: '1.0.0',
          configVersion: 'cfg-1',
          fillConfig: { halfSpreadTicks: 0, slippageTicks: 0 },
        },
      ],
      candle: candle(),
      atr: '2',
      instrument,
      feePerUnit: '0.1',
      timestamp: 1_000,
    });

    expect(opened.events.some((event) => event.eventType === 'POSITION_OPENED')).toBe(true);
    expect(opened.positions[0]?.status).toBe('OPEN');
    expect(opened.positions[0]?.averageEntryPrice).toBe(parseDecimalString('100'));

    const closed = managePaperPositions({
      openPositions: opened.positions,
      candle: candle({
        timestamp: 2_000,
        low: parseDecimalString('94'),
        high: parseDecimalString('100'),
        close: parseDecimalString('95'),
      }),
      atr: '2',
      instrument,
      feePerUnit: '0.1',
      timestamp: 2_000,
    });

    expect(closed.positions[0]?.status).toBe('CLOSED');
    expect(closed.evaluations).toHaveLength(1);
    expect(closed.evaluations[0]?.exitReason).toBe('STOP_LOSS');
    expect(closed.evaluations[0]?.hitStopBeforeTarget).toBe(true);
    expect(closed.events.some((event) => event.eventType === 'POSITION_CLOSED')).toBe(true);
  });

  it('records MFE/MAE on the evaluation after a winning partial path', () => {
    const opened = managePaperPositions({
      openPositions: [],
      entriesToOpen: [
        {
          positionId: 'pos-2',
          signalId: 'sig-2',
          instrumentId,
          timeframe: '5m',
          strategy: 'TREND_PULLBACK',
          direction: 'LONG',
          timestamp: 1_000,
          referencePrice: '100',
          tickSize: '0.01',
          stop: '95',
          targets: ['110'],
          quantity: 2,
          pointValue: '1',
          feePerUnit: '0',
          algorithmVersion: '1.0.0',
          configVersion: 'cfg-1',
          fillConfig: { halfSpreadTicks: 0, slippageTicks: 0 },
        },
      ],
      candle: candle(),
      atr: '2',
      instrument,
      feePerUnit: '0',
      timestamp: 1_000,
    });

    const closed = managePaperPositions({
      openPositions: opened.positions,
      candle: candle({
        timestamp: 2_000,
        low: parseDecimalString('99'),
        high: parseDecimalString('111'),
        close: parseDecimalString('110'),
      }),
      atr: '2',
      instrument,
      feePerUnit: '0',
      timestamp: 2_000,
      policy: { fractions: [1] },
    });

    expect(closed.evaluations[0]?.exitReason).toBe('TAKE_PROFIT');
    expect(closed.evaluations[0]?.mfeR).not.toBeNull();
    expect((closed.evaluations[0]?.mfeR ?? 0) > 0).toBe(true);
  });
});
