import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineInstrumentSpec } from '../types.js';
import { sizePosition } from './position-sizing.js';

const instrument: EngineInstrumentSpec = {
  instrumentId: parseInstrumentId('15151515-1515-4151-8151-151515151515'),
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

describe('sizePosition', () => {
  it('sizes quantity from equity risk budget', () => {
    const result = sizePosition({
      equity: '100000',
      entry: '100',
      stop: '95',
      pointValue: '1',
      costPerUnit: '0',
      instrument,
      config: { riskPerTradePct: 0.005 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // riskBudget=500, riskPerUnit=5 → raw=100
    expect(result.quantity).toBe(100);
  });

  it('rejects when rounded quantity is below minimum', () => {
    const result = sizePosition({
      equity: '10',
      entry: '100',
      stop: '90',
      pointValue: '1',
      costPerUnit: '0',
      instrument,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reasonCodes).toContain('POSITION_SIZE_BELOW_MINIMUM');
  });
});
