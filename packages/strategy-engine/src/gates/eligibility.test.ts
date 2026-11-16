import { parseDecimalString } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { evaluateDataGates, evaluateRewardRiskGate, isStopDistanceValid } from './eligibility.js';

describe('evaluateDataGates', () => {
  it('passes when all data inputs are healthy', () => {
    expect(
      evaluateDataGates({
        candleStale: false,
        hasGap: false,
        pivotAvailable: true,
        volumeProfileAvailable: true,
        instrumentSpecAvailable: true,
        eventOrderingTrusted: true,
        recoveringFromReplay: false,
      }).passed,
    ).toBe(true);
  });

  it('collects reason codes for failed data checks', () => {
    const result = evaluateDataGates({
      candleStale: true,
      hasGap: true,
      pivotAvailable: false,
      volumeProfileAvailable: false,
      instrumentSpecAvailable: false,
      eventOrderingTrusted: false,
      recoveringFromReplay: true,
    });
    expect(result.passed).toBe(false);
    expect(result.reasonCodes).toContain('DATA_STALE');
    expect(result.reasonCodes).toContain('PIVOT_SET_UNAVAILABLE');
  });
});

describe('evaluateRewardRiskGate', () => {
  it('accepts RR above the minimum', () => {
    const result = evaluateRewardRiskGate({
      entry: '100',
      stop: '95',
      target: '110',
      pointValue: '1',
      roundTripCostPerUnit: '0.1',
      minRewardRisk: 1.5,
    });
    expect(result.passed).toBe(true);
    expect(result.rewardRisk).toBeGreaterThan(1.5);
  });
});

describe('isStopDistanceValid', () => {
  it('rejects stops that are too tight', () => {
    const result = isStopDistanceValid({
      entry: parseDecimalString('100'),
      stop: parseDecimalString('99.99'),
      atr: '2',
      tickSize: '0.01',
      minStopDistanceTicks: 2,
      maxStopDistanceAtr: 3,
    });
    expect(result.passed).toBe(false);
    expect(result.reasonCodes).toContain('STOP_DISTANCE_TOO_SMALL');
  });
});
