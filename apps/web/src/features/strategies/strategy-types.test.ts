import { describe, expect, it } from 'vitest';
import {
  createDefaultStrategyFilters,
  createEmptyStrategyDraft,
  filterStrategies,
  type StrategyListItem,
  strategyModeLabel,
  strategyModeTone,
  strategyStatusLabel,
  strategyStatusTone,
  validateStrategyDraft,
} from './strategy-types.js';

const sample: StrategyListItem = {
  id: 'st-1',
  name: 'Breakout A',
  ticker: 'SBER',
  timeframe: '15m',
  mode: 'monitoring',
  status: 'running',
  lastEvent: 'Signal emitted',
  updatedAtIso: '2026-11-11T09:00:00.000Z',
};

const livePaused: StrategyListItem = {
  id: 'st-2',
  name: 'Mean Reversion',
  ticker: 'GAZP',
  timeframe: '1h',
  mode: 'live',
  status: 'paused',
  lastEvent: 'Paused by user',
  updatedAtIso: '2026-11-10T09:00:00.000Z',
};

describe('strategy-types', () => {
  it('labels modes and statuses', () => {
    expect(strategyModeLabel('sandbox')).toBe('SANDBOX');
    expect(strategyModeLabel('live')).toBe('LIVE');
    expect(strategyStatusLabel('running')).toBe('RUNNING');
    expect(strategyStatusLabel('error')).toBe('ERROR');
  });

  it('maps modes and statuses to badge tones', () => {
    expect(strategyModeTone('monitoring')).toBe('brand');
    expect(strategyModeTone('sandbox')).toBe('info');
    expect(strategyModeTone('live')).toBe('warning');
    expect(strategyStatusTone('running')).toBe('positive');
    expect(strategyStatusTone('error')).toBe('negative');
  });

  it('filters by name ticker mode and status', () => {
    const items = [sample, livePaused];
    expect(
      filterStrategies(items, {
        ...createDefaultStrategyFilters(),
        nameQuery: 'mean',
      }),
    ).toEqual([livePaused]);
    expect(
      filterStrategies(items, {
        ...createDefaultStrategyFilters(),
        mode: 'monitoring',
        status: 'running',
      }),
    ).toEqual([sample]);
  });

  it('validates create draft without inventing strategy records', () => {
    expect(validateStrategyDraft(createEmptyStrategyDraft())).toEqual({
      ok: false,
      nameError: 'Укажите название стратегии',
      tickerError: 'Укажите тикер',
    });
    expect(
      validateStrategyDraft({
        name: 'Breakout A',
        ticker: 'SBER',
        timeframe: '15m',
        mode: 'paper',
      }),
    ).toEqual({ ok: true });
  });
});
