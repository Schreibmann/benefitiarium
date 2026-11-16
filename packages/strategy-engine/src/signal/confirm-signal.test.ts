import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import type { MarketStructureSnapshot } from '../analyzers/market-structure.js';
import type { PriceActionEvidence } from '../analyzers/price-action.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineInstrumentSpec } from '../types.js';
import { confirmSignal } from './confirm-signal.js';

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

const zone: ConfluenceZone = {
  id: 'CONF:1',
  low: parseDecimalString('99'),
  high: parseDecimalString('101'),
  center: parseDecimalString('100'),
  members: [
    {
      id: 'FIB_PIVOT:S1',
      source: 'FIB_PIVOT',
      sourceId: 'S1',
      price: parseDecimalString('100'),
      zoneLow: parseDecimalString('99'),
      zoneHigh: parseDecimalString('101'),
      distanceAtr: parseDecimalString('0.1'),
      contextualRole: 'SUPPORT_CANDIDATE',
      isConfirmed: true,
    },
    {
      id: 'VOLUME_PROFILE:POC',
      source: 'VOLUME_PROFILE',
      sourceId: 'POC',
      price: parseDecimalString('100.2'),
      zoneLow: parseDecimalString('99.2'),
      zoneHigh: parseDecimalString('101.2'),
      distanceAtr: parseDecimalString('0.1'),
      contextualRole: 'NEUTRAL',
      isConfirmed: true,
    },
  ],
  familyCount: 2,
  familyStrength: { FIBONACCI: 0.8, VOLUME_PROFILE: 0.75 },
  overallStrength: 0.9,
  createdAt: 1,
  invalidatedAt: null,
};

const setup: TradingSetup = {
  id: 'setup-1',
  instrumentId,
  strategy: 'TREND_PULLBACK',
  direction: 'LONG',
  setupTimeframe: '5m',
  createdAt: 1,
  updatedAt: 2,
  status: 'TRIGGERED',
  zoneId: zone.id,
  triggerLevel: parseDecimalString('100'),
  invalidationLevel: parseDecimalString('95'),
  referencePrice: parseDecimalString('100'),
  referenceSwingIds: [],
  referenceProfileIds: [],
  referencePivotSetIds: ['S1'],
  reasonCodes: ['SETUP_PRICE_ACTION_CONFIRMED'],
  expiresAt: null,
};

const structure: MarketStructureSnapshot = {
  regime: 'BULLISH_TREND',
  confidence: 0.8,
  swings: [],
  lastHigherHigh: null,
  lastHigherLow: null,
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

const priceAction: PriceActionEvidence[] = [
  {
    pattern: 'BULLISH_REJECTION',
    direction: 'LONG',
    candleTimestamp: 1,
    zoneId: zone.id,
    strength: 1,
    features: {},
    confirmed: true,
  },
];

const target: AnalyzedPriceLevel = {
  id: 'R1',
  source: 'FIB_PIVOT',
  sourceId: 'R1',
  price: parseDecimalString('110'),
  zoneLow: parseDecimalString('109'),
  zoneHigh: parseDecimalString('111'),
  distanceAtr: parseDecimalString('1'),
  contextualRole: 'RESISTANCE_CANDIDATE',
  isConfirmed: true,
};

describe('confirmSignal', () => {
  it('accepts a fully explained LONG signal when score and gates pass', () => {
    const decision = confirmSignal({
      strategy: 'TREND_PULLBACK',
      setup,
      marketStructure: structure,
      zone,
      priceAction,
      rvol: 1.4,
      mtfAlignment: {
        direction: 'LONG',
        score: 1,
        contextRegime: 'BULLISH_TREND',
        setupRegime: 'BULLISH_TREND',
        blockedByContextOpposition: false,
        reasonCodes: [],
      },
      structuralTargets: [target],
      instrument,
      equity: '100000',
      costPerUnit: '0.1',
      atr: '5',
      confirmationClose: '100',
      signalTimestamp: 10,
      executionReferencePrice: '100.05',
      dataGates: {
        candleStale: false,
        hasGap: false,
        pivotAvailable: true,
        volumeProfileAvailable: true,
        instrumentSpecAvailable: true,
        eventOrderingTrusted: true,
        recoveringFromReplay: false,
      },
      duplicates: {
        hasDuplicateActiveSetup: false,
        hasOpenPositionForSymbol: false,
        cooldownActive: false,
      },
      configVersion: 'phase4-v1',
    });

    expect(decision.accepted).toBe(true);
    expect(decision.direction).toBe('LONG');
    expect(decision.stop).not.toBeNull();
    expect(decision.takeProfit?.selected.length).toBeGreaterThan(0);
    expect(decision.sizing?.ok).toBe(true);
    expect(decision.entry.executionReferencePrice).toBe('100.05');
    expect(decision.rewardRisk).toBeGreaterThan(1.5);
  });

  it('rejects when hard gates fail even with strong score inputs', () => {
    const decision = confirmSignal({
      strategy: 'TREND_PULLBACK',
      setup: { ...setup, status: 'TRIGGERED' },
      marketStructure: structure,
      zone,
      priceAction,
      rvol: 1.5,
      mtfAlignment: {
        direction: 'LONG',
        score: 1,
        contextRegime: 'BULLISH_TREND',
        setupRegime: 'BULLISH_TREND',
        blockedByContextOpposition: false,
        reasonCodes: [],
      },
      structuralTargets: [target],
      instrument,
      equity: '100000',
      costPerUnit: '0',
      atr: '5',
      confirmationClose: '100',
      signalTimestamp: 10,
      dataGates: {
        candleStale: true,
        hasGap: false,
        pivotAvailable: true,
        volumeProfileAvailable: true,
        instrumentSpecAvailable: true,
        eventOrderingTrusted: true,
        recoveringFromReplay: false,
      },
      duplicates: {
        hasDuplicateActiveSetup: false,
        hasOpenPositionForSymbol: false,
        cooldownActive: false,
      },
      configVersion: 'phase4-v1',
    });

    expect(decision.accepted).toBe(false);
    expect(decision.reasonCodes).toContain('DATA_STALE');
  });
});
