import { describe, expect, it } from 'vitest';
import {
  createDefaultSignalFilters,
  filterSignals,
  filterSignalsForTab,
  matchesSignalFilters,
  type SignalListItem,
  signalDirectionLabel,
  signalDirectionTone,
  signalLifecycleLabel,
  signalLifecycleTone,
} from './signal-types.js';

const sample: SignalListItem = {
  id: 'sig-1',
  ticker: 'SBER',
  instrumentName: 'Sberbank',
  timeframe: '15m',
  strategyName: 'Breakout A',
  direction: 'buy',
  reason: 'Close above resistance',
  createdAtIso: '2026-11-11T08:00:00.000Z',
  lifecycle: 'active',
};

const sellExpired: SignalListItem = {
  id: 'sig-2',
  ticker: 'SBER',
  instrumentName: 'Sberbank',
  timeframe: '1h',
  strategyName: 'Breakout A',
  direction: 'sell',
  reason: 'Failed breakout',
  createdAtIso: '2026-11-10T08:00:00.000Z',
  lifecycle: 'expired',
};

describe('signal-types', () => {
  it('labels direction and lifecycle', () => {
    expect(signalDirectionLabel('buy')).toBe('BUY');
    expect(signalDirectionLabel('sell')).toBe('SELL');
    expect(signalLifecycleLabel('active')).toBe('ACTIVE');
    expect(signalLifecycleLabel('converted')).toBe('CONVERTED');
  });

  it('matches ticker and strategy queries case-insensitively', () => {
    const filters = {
      ...createDefaultSignalFilters(),
      tickerQuery: 'sber',
      strategyQuery: 'break',
    };
    expect(matchesSignalFilters(sample, filters)).toBe(true);
    expect(
      matchesSignalFilters(sample, {
        ...filters,
        strategyQuery: 'mean-reversion',
      }),
    ).toBe(false);
  });

  it('filters by direction timeframe and lifecycle', () => {
    const items = [sample, sellExpired];
    expect(
      filterSignals(items, {
        ...createDefaultSignalFilters(),
        direction: 'sell',
      }),
    ).toEqual([sellExpired]);
    expect(
      filterSignals(items, {
        ...createDefaultSignalFilters(),
        timeframe: '15m',
        lifecycle: 'active',
      }),
    ).toEqual([sample]);
  });

  it('splits active and history tabs', () => {
    const items = [sample, sellExpired];
    expect(filterSignalsForTab(items, createDefaultSignalFilters(), 'active')).toEqual([sample]);
    expect(filterSignalsForTab(items, createDefaultSignalFilters(), 'history')).toEqual([
      sellExpired,
    ]);
  });

  it('maps direction and lifecycle to badge tones', () => {
    expect(signalDirectionTone('buy')).toBe('positive');
    expect(signalDirectionTone('sell')).toBe('negative');
    expect(signalLifecycleTone('active')).toBe('brand');
    expect(signalLifecycleTone('cancelled')).toBe('warning');
  });
});
