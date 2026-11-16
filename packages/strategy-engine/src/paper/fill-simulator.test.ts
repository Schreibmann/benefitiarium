import { parseDecimalString } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { simulatePaperFill } from './fill-simulator.js';

describe('simulatePaperFill', () => {
  it('fills LONG worse than reference (spread + slippage, round up)', () => {
    const result = simulatePaperFill({
      direction: 'LONG',
      referencePrice: '100.00',
      tickSize: '0.01',
      config: { halfSpreadTicks: 1, slippageTicks: 1 },
    });
    expect(result.fillPrice).toBe(parseDecimalString('100.02'));
    expect(result.adverseTicks).toBe(2);
    expect(Number(String(result.slippagePaid))).toBeGreaterThan(0);
  });

  it('fills SHORT worse than reference (spread + slippage, round down)', () => {
    const result = simulatePaperFill({
      direction: 'SHORT',
      referencePrice: '100.00',
      tickSize: '0.01',
      config: { halfSpreadTicks: 1, slippageTicks: 1 },
    });
    expect(result.fillPrice).toBe(parseDecimalString('99.98'));
  });

  it('never improves on the reference price', () => {
    const longFill = simulatePaperFill({
      direction: 'LONG',
      referencePrice: '50',
      tickSize: '0.5',
      config: { halfSpreadTicks: 0, slippageTicks: 0 },
    });
    const shortFill = simulatePaperFill({
      direction: 'SHORT',
      referencePrice: '50',
      tickSize: '0.5',
      config: { halfSpreadTicks: 0, slippageTicks: 0 },
    });
    expect(longFill.fillPrice).toBe(parseDecimalString('50'));
    expect(shortFill.fillPrice).toBe(parseDecimalString('50'));
  });
});
