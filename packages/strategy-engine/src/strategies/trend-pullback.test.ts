import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import type { MarketStructureSnapshot } from '../analyzers/market-structure.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import type { EngineCandle } from '../types.js';
import { updateTrendPullbackSetup } from './trend-pullback.js';

const instrumentId = parseInstrumentId('13131313-1313-4131-8131-131313131313');

function candle(index: number, close: string, low = '99', high = '101'): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z') + index * 300_000;
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: start,
    closeTimestamp: start + 300_000,
    open: parseDecimalString(close),
    high: parseDecimalString(high),
    low: parseDecimalString(low),
    close: parseDecimalString(close),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `tp-${index}`,
  };
}

function fibLevel(): AnalyzedPriceLevel {
  return {
    id: 'FIB_PIVOT:S1',
    source: 'FIB_PIVOT',
    sourceId: 'S1',
    price: parseDecimalString('100'),
    zoneLow: parseDecimalString('99'),
    zoneHigh: parseDecimalString('101'),
    distanceAtr: parseDecimalString('0.1'),
    contextualRole: 'SUPPORT_CANDIDATE',
    isConfirmed: true,
  };
}

function vpLevel(): AnalyzedPriceLevel {
  return {
    id: 'VOLUME_PROFILE:vp:POC',
    source: 'VOLUME_PROFILE',
    sourceId: 'POC',
    price: parseDecimalString('100.2'),
    zoneLow: parseDecimalString('99.2'),
    zoneHigh: parseDecimalString('101.2'),
    distanceAtr: parseDecimalString('0.1'),
    contextualRole: 'NEUTRAL',
    isConfirmed: true,
  };
}

const zone: ConfluenceZone = {
  id: 'CONF:1:0',
  low: parseDecimalString('99'),
  high: parseDecimalString('101.2'),
  center: parseDecimalString('100.1'),
  members: [fibLevel(), vpLevel()],
  familyCount: 2,
  familyStrength: { FIBONACCI: 0.8, VOLUME_PROFILE: 0.7 },
  overallStrength: 0.9,
  createdAt: 1,
  invalidatedAt: null,
};

const bullishStructure: MarketStructureSnapshot = {
  regime: 'BULLISH_TREND',
  confidence: 0.8,
  swings: [],
  lastHigherHigh: null,
  lastHigherLow: {
    id: 'L:1',
    kind: 'LOW',
    price: parseDecimalString('95'),
    candleTimestamp: 1,
    confirmedAt: 2,
    confirmationBars: 2,
    prominence: parseDecimalString('2'),
    method: 'CONFIRMED_PIVOT_LR',
    label: 'HL',
  },
  lastLowerHigh: null,
  lastLowerLow: null,
  lastBullishBos: null,
  lastBearishBos: null,
  rangeHigh: null,
  rangeLow: null,
  reasonCodes: ['REGIME_BULLISH'],
  method: 'CONFIRMED_PIVOT_LR',
  methodVersion: '1.0.0',
};

describe('updateTrendPullbackSetup', () => {
  it('forms a LONG setup near confluence in a bullish regime', () => {
    const result = updateTrendPullbackSetup({
      instrumentId,
      setupTimeframe: '5m',
      direction: 'LONG',
      now: Date.parse('2026-11-14T11:00:00.000Z'),
      candles: [
        candle(0, '101', '98', '103'),
        candle(1, '100.5', '98.5', '102'),
        // Rejection: low into zone, close near high
        candle(2, '102', '99', '103'),
      ],
      atr: '5',
      tickSize: '0.01',
      marketStructure: bullishStructure,
      zones: [zone],
    });

    expect(result).not.toBeNull();
    expect(result?.setup.strategy).toBe('TREND_PULLBACK');
    expect(result?.setup.zoneId).toBe(zone.id);
    expect(['APPROACHING', 'FORMING', 'TRIGGERED']).toContain(result?.setup.status);
    expect(result?.setup.reasonCodes).toContain('SETUP_CONFLUENCE_FOUND');
  });

  it('does not open against an opposing regime', () => {
    const result = updateTrendPullbackSetup({
      instrumentId,
      setupTimeframe: '5m',
      direction: 'LONG',
      now: 1,
      candles: [candle(0, '100')],
      atr: '5',
      tickSize: '0.01',
      marketStructure: { ...bullishStructure, regime: 'BEARISH_TREND' },
      zones: [zone],
    });
    expect(result).toBeNull();
  });
});
