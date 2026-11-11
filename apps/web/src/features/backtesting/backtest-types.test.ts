import { describe, expect, it } from 'vitest';
import {
  type BacktestRunSummary,
  backtestStatusLabel,
  backtestStatusTone,
  compareRunIdsForSelection,
  createDefaultBacktestFilters,
  createDefaultBacktestParams,
  filterBacktestRuns,
  validateBacktestParams,
} from './backtest-types.js';

const runA: BacktestRunSummary = {
  id: 'bt-1',
  strategyName: 'Breakout A',
  ticker: 'SBER',
  timeframe: '15m',
  fromDate: '2024-01-01',
  toDate: '2024-06-01',
  status: 'succeeded',
  createdAtIso: '2026-11-11T10:00:00.000Z',
  progressPercent: 100,
  metricsAvailable: true,
};

const runB: BacktestRunSummary = {
  id: 'bt-2',
  strategyName: 'Mean Reversion',
  ticker: 'GAZP',
  timeframe: '1h',
  fromDate: '2024-01-01',
  toDate: '2024-03-01',
  status: 'running',
  createdAtIso: '2026-11-11T11:00:00.000Z',
  progressPercent: 42,
  metricsAvailable: false,
};

describe('backtest-types', () => {
  it('labels statuses and tones', () => {
    expect(backtestStatusLabel('running')).toBe('RUNNING');
    expect(backtestStatusTone('succeeded')).toBe('positive');
    expect(backtestStatusTone('failed')).toBe('negative');
  });

  it('filters runs by strategy ticker and status', () => {
    expect(
      filterBacktestRuns([runA, runB], {
        ...createDefaultBacktestFilters(),
        status: 'running',
      }),
    ).toEqual([runB]);
    expect(
      filterBacktestRuns([runA, runB], {
        ...createDefaultBacktestFilters(),
        strategyQuery: 'break',
        tickerQuery: 'sber',
      }),
    ).toEqual([runA]);
  });

  it('validates params without inventing metrics', () => {
    expect(validateBacktestParams(createDefaultBacktestParams())).toEqual({
      ok: false,
      strategyError: 'Укажите стратегию',
      tickerError: 'Укажите тикер',
    });
    expect(
      validateBacktestParams({
        strategyName: 'Breakout A',
        ticker: 'SBER',
        timeframe: '15m',
        fromDate: '2024-06-01',
        toDate: '2024-01-01',
        initialCash: '',
      }),
    ).toEqual({
      ok: false,
      rangeError: 'Дата начала должна быть не позже даты окончания',
    });
  });

  it('toggles compare selection with a max of two runs', () => {
    expect(compareRunIdsForSelection([], 'bt-1', 2)).toEqual(['bt-1']);
    expect(compareRunIdsForSelection(['bt-1'], 'bt-2', 2)).toEqual(['bt-1', 'bt-2']);
    expect(compareRunIdsForSelection(['bt-1', 'bt-2'], 'bt-3', 2)).toEqual(['bt-2', 'bt-3']);
    expect(compareRunIdsForSelection(['bt-1', 'bt-2'], 'bt-1', 2)).toEqual(['bt-2']);
  });
});
