import { describe, expect, it } from 'vitest';
import { createLevelAlertEngine } from './level-alert-engine.js';

describe('createLevelAlertEngine', () => {
  it('emits APPROACH once inside dedup window', () => {
    const engine = createLevelAlertEngine({
      approachAtr: 0.15,
      dedupMs: 5 * 60_000,
      crossWindowMs: 15 * 60_000,
      crossCountForChop: 3,
      quietMs: 15 * 60_000,
    });
    engine.setLevels('uid-1', [{ id: 'P', price: '100', sources: ['FIB_PIVOT'] }], '10');

    const first = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '100.5',
      low: '100.4',
      high: '100.6',
      nowMs: 1_000,
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.kind).toBe('APPROACH');

    const second = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '100.4',
      low: '100.3',
      high: '100.5',
      nowMs: 2_000,
    });
    expect(second).toHaveLength(0);
  });

  it('emits CROSS on side flip and LEVEL_CONSOLIDATION after repeated crosses', () => {
    const engine = createLevelAlertEngine({
      approachAtr: 0.15,
      dedupMs: 1,
      crossWindowMs: 15 * 60_000,
      crossCountForChop: 3,
      quietMs: 15 * 60_000,
    });
    engine.setLevels('uid-1', [{ id: 'P', price: '100', sources: ['FIB_PIVOT'] }], '10');

    // Seed side below, far from approach band (ATR=10 → 0.15*10=1.5).
    expect(
      engine.evaluate({
        instrumentUid: 'uid-1',
        ticker: 'BRH6',
        intervalCode: '5m',
        barTimeStart: '2026-11-16T10:00:00.000Z',
        price: '90',
        low: '89.5',
        high: '90.2',
        nowMs: 1_000,
      }),
    ).toEqual([]);

    const cross1 = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '110',
      low: '99.5',
      high: '110.2',
      nowMs: 2_000,
    });
    expect(cross1.map((a) => a.kind)).toContain('CROSS');

    const cross2 = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '90',
      low: '89.8',
      high: '100.5',
      nowMs: 3_000,
    });
    expect(cross2.map((a) => a.kind)).toContain('CROSS');

    const chop = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '110',
      low: '99.5',
      high: '110.1',
      nowMs: 4_000,
    });
    expect(chop.map((a) => a.kind)).toContain('LEVEL_CONSOLIDATION');

    const suppressed = engine.evaluate({
      instrumentUid: 'uid-1',
      ticker: 'BRH6',
      intervalCode: '5m',
      barTimeStart: '2026-11-16T10:00:00.000Z',
      price: '90',
      low: '89.9',
      high: '100.2',
      nowMs: 5_000,
    });
    expect(suppressed.map((a) => a.kind)).not.toContain('CROSS');
    expect(suppressed.map((a) => a.kind)).not.toContain('APPROACH');
  });
});
