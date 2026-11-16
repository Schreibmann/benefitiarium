import { describe, expect, it } from 'vitest';
import { createTriggerRegistry } from './registry.js';
import { createInMemoryTriggerStateStore } from './state.js';
import type { LevelSet, TriggerContext } from './types.js';

function levelSet(overrides: Partial<LevelSet> = {}): LevelSet {
  return {
    source: 'fibonacci_pivot',
    periodId: 'valid:open',
    quality: 'ok',
    levels: [
      { name: 'P', value: '100' },
      { name: 'R1', value: '110' },
      { name: 'S1', value: '90' },
    ],
    ...overrides,
  };
}

function ctx(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    instrumentUid: 'uid-1',
    ticker: 'NGZ6',
    timeframe: '5m',
    price: '100',
    previousPrice: '99',
    evalMode: 'close',
    candleTimeStart: '2026-11-14T10:00:00.000Z',
    levelSet: levelSet(),
    approachPctByTimeframe: { '5m': '0.15', '1h': '0.4' },
    ...overrides,
  };
}

describe('fib pivot cross', () => {
  it('emits up cross when price moves through a level', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_cross'],
      ctx({ previousPrice: '99', price: '100' }),
      state,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.kind).toBe('cross');
    expect(hits[0]?.side).toBe('up');
    expect(hits[0]?.levelName).toBe('P');
    expect(hits[0]?.dedupeKey).toContain('fib_pivot_cross:uid-1:5m:valid:open:P:up:');
  });

  it('emits down cross when price moves through a level', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_cross'],
      ctx({ previousPrice: '101', price: '100' }),
      state,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.side).toBe('down');
  });

  it('emits one hit per crossed level in the same candle', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_cross'],
      ctx({
        previousPrice: '89',
        price: '111',
        levelSet: levelSet({
          levels: [
            { name: 'S1', value: '90' },
            { name: 'P', value: '100' },
            { name: 'R1', value: '110' },
          ],
        }),
      }),
      state,
    );
    expect(hits.map((hit) => hit.levelName).sort()).toEqual(['P', 'R1', 'S1']);
  });

  it('skips cross when previousPrice is missing', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_cross'],
      ctx({ previousPrice: null, price: '100' }),
      state,
    );
    expect(hits).toEqual([]);
  });

  it('skips degenerate level sets', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_cross'],
      ctx({ levelSet: levelSet({ quality: 'DEGENERATE_RANGE' }) }),
      state,
    );
    expect(hits).toEqual([]);
  });
});

describe('fib pivot approach', () => {
  it('emits approach when within pct and not crossing', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    // 0.15% of 100 = 0.15; price 99.9 is 0.1% below P
    const hits = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({ previousPrice: '99.8', price: '99.9' }),
      state,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.kind).toBe('approach');
    expect(hits[0]?.side).toBe('below');
    expect(hits[0]?.levelName).toBe('P');
  });

  it('suppresses approach on the same event as a cross', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_approach', 'fib_pivot_cross'],
      ctx({ previousPrice: '99.8', price: '100.05' }),
      state,
    );
    expect(hits.every((hit) => hit.kind === 'cross')).toBe(true);
    expect(hits.some((hit) => hit.kind === 'approach')).toBe(false);
  });

  it('applies hysteresis until price leaves 2x band', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const first = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        previousPrice: '99.8',
        price: '99.9',
        candleTimeStart: '2026-11-14T10:00:00.000Z',
      }),
      state,
    );
    expect(first).toHaveLength(1);

    const second = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        previousPrice: '99.9',
        price: '99.92',
        candleTimeStart: '2026-11-14T10:05:00.000Z',
      }),
      state,
    );
    expect(second).toEqual([]);

    // Leave 2 * 0.15% = 0.3% band (price 99.6 → 0.4% away)
    const leave = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        previousPrice: '99.92',
        price: '99.6',
        candleTimeStart: '2026-11-14T10:10:00.000Z',
      }),
      state,
    );
    expect(leave).toEqual([]);

    const reentry = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        previousPrice: '99.6',
        price: '99.9',
        candleTimeStart: '2026-11-14T10:15:00.000Z',
      }),
      state,
    );
    expect(reentry).toHaveLength(1);
  });

  it('works in intrabar eval mode the same as close for distance checks', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    const hits = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        evalMode: 'intrabar',
        previousPrice: '99.8',
        price: '99.9',
      }),
      state,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.features.evalMode).toBe('intrabar');
  });

  it('uses 1h approach pct for 1h timeframe', () => {
    const registry = createTriggerRegistry();
    const state = createInMemoryTriggerStateStore();
    // 0.3% away — outside 5m 0.15% but inside 1h 0.4%
    const hits = registry.evaluate(
      ['fib_pivot_approach'],
      ctx({
        timeframe: '1h',
        previousPrice: '99.5',
        price: '99.7',
      }),
      state,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.features.approachPct).toBe('0.4');
  });
});
