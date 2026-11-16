import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle, EngineInstrumentSpec } from '../types.js';
import { applyExitActions, evaluateBarExits } from './exits.js';
import type { TradingPosition } from './types.js';

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

function position(overrides: Partial<TradingPosition> = {}): TradingPosition {
  return {
    id: 'pos-1',
    signalId: 'sig-1',
    instrumentId,
    timeframe: '5m',
    strategy: 'TREND_PULLBACK',
    direction: 'LONG',
    status: 'OPEN',
    openedAt: 1,
    closedAt: null,
    averageEntryPrice: parseDecimalString('100'),
    initialQuantity: 10,
    openQuantity: 10,
    realizedPnl: parseDecimalString('0'),
    unrealizedPnl: parseDecimalString('0'),
    initialStop: parseDecimalString('95'),
    currentStop: parseDecimalString('95'),
    initialRiskPerUnit: parseDecimalString('5'),
    targets: [parseDecimalString('110'), parseDecimalString('120'), parseDecimalString('130')],
    reachedTargets: [],
    exitReason: null,
    feesPaid: parseDecimalString('0'),
    slippagePaid: parseDecimalString('0'),
    pointValue: parseDecimalString('1'),
    mfePrice: parseDecimalString('100'),
    maePrice: parseDecimalString('100'),
    barsOpen: 1,
    configVersion: 'cfg-1',
    algorithmVersion: '1.0.0',
    ...overrides,
  };
}

function candle(
  overrides: Partial<EngineCandle> & Pick<EngineCandle, 'low' | 'high' | 'close'>,
): EngineCandle {
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: 1000,
    closeTimestamp: 1300,
    open: parseDecimalString('100'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: 'src',
    ...overrides,
  };
}

describe('evaluateBarExits', () => {
  it('prefers stop over target when both trade in the same bar', () => {
    const actions = evaluateBarExits({
      position: position(),
      candle: candle({
        low: parseDecimalString('94'),
        high: parseDecimalString('111'),
        close: parseDecimalString('105'),
      }),
      atr: '2',
      instrument,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe('CLOSE');
    if (actions[0]?.kind === 'CLOSE') {
      expect(actions[0].exitReason).toBe('STOP_LOSS');
    }
  });

  it('takes a lot-safe partial at TP1', () => {
    const actions = evaluateBarExits({
      position: position(),
      candle: candle({
        low: parseDecimalString('99'),
        high: parseDecimalString('111'),
        close: parseDecimalString('110'),
      }),
      atr: '2',
      instrument,
    });
    expect(actions.some((action) => action.kind === 'PARTIAL')).toBe(true);
    const partial = actions.find((action) => action.kind === 'PARTIAL');
    if (partial?.kind === 'PARTIAL') {
      expect(partial.quantity).toBe(4);
      expect(partial.targetId).toBe('TP1');
    }
  });

  it('never widens the stop when trailing', () => {
    const open = position({
      barsOpen: 2,
      currentStop: parseDecimalString('100'),
    });
    const actions = evaluateBarExits({
      position: open,
      candle: candle({
        low: parseDecimalString('108'),
        high: parseDecimalString('112'),
        close: parseDecimalString('110'),
      }),
      atr: '2',
      instrument,
      policy: { breakEvenAfterR: 1, trailBufferAtrMultiple: 0.15 },
    });
    const update = actions.find((action) => action.kind === 'UPDATE_STOP');
    if (update?.kind === 'UPDATE_STOP') {
      expect(Number(String(update.nextStop))).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('applyExitActions', () => {
  it('never over-closes quantity on partials', () => {
    const result = applyExitActions({
      position: position({ openQuantity: 3, initialQuantity: 10 }),
      actions: [
        {
          kind: 'PARTIAL',
          quantity: 4,
          fillPrice: parseDecimalString('110'),
          targetIndex: 0,
          targetId: 'TP1',
          exitReason: 'TAKE_PROFIT',
          reasonCodes: ['TAKE_PROFIT_HIT'],
        },
      ],
      pointValue: '1',
      feePerUnit: '0.1',
      timestamp: 50,
    });
    expect(result.position.openQuantity).toBe(0);
    expect(result.closed).toBe(true);
  });
});
