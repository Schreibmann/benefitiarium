export type BacktestRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type BacktestParams = {
  strategyName: string;
  ticker: string;
  timeframe: string;
  fromDate: string;
  toDate: string;
  initialCash: string;
};

export type BacktestRunSummary = {
  id: string;
  strategyName: string;
  ticker: string;
  timeframe: string;
  fromDate: string;
  toDate: string;
  status: BacktestRunStatus;
  createdAtIso: string;
  progressPercent: number | null;
  metricsAvailable: boolean;
};

export type BacktestFilters = {
  strategyQuery: string;
  tickerQuery: string;
  status: 'all' | BacktestRunStatus;
};

export function createDefaultBacktestParams(): BacktestParams {
  return {
    strategyName: '',
    ticker: '',
    timeframe: '15m',
    fromDate: '',
    toDate: '',
    initialCash: '',
  };
}

export function createDefaultBacktestFilters(): BacktestFilters {
  return {
    strategyQuery: '',
    tickerQuery: '',
    status: 'all',
  };
}

export function backtestStatusLabel(status: BacktestRunStatus): string {
  switch (status) {
    case 'queued':
      return 'QUEUED';
    case 'running':
      return 'RUNNING';
    case 'succeeded':
      return 'SUCCEEDED';
    case 'failed':
      return 'FAILED';
    case 'cancelled':
      return 'CANCELLED';
  }
}

export function backtestStatusTone(
  status: BacktestRunStatus,
): 'info' | 'brand' | 'positive' | 'negative' | 'warning' {
  switch (status) {
    case 'queued':
      return 'info';
    case 'running':
      return 'brand';
    case 'succeeded':
      return 'positive';
    case 'failed':
      return 'negative';
    case 'cancelled':
      return 'warning';
  }
}

export function matchesBacktestFilters(
  item: BacktestRunSummary,
  filters: BacktestFilters,
): boolean {
  const strategyQ = filters.strategyQuery.trim().toLowerCase();
  if (strategyQ.length > 0 && !item.strategyName.toLowerCase().includes(strategyQ)) {
    return false;
  }

  const tickerQ = filters.tickerQuery.trim().toLowerCase();
  if (tickerQ.length > 0 && !item.ticker.toLowerCase().includes(tickerQ)) {
    return false;
  }

  if (filters.status !== 'all' && item.status !== filters.status) {
    return false;
  }

  return true;
}

export function filterBacktestRuns(
  items: readonly BacktestRunSummary[],
  filters: BacktestFilters,
): BacktestRunSummary[] {
  return items.filter((item) => matchesBacktestFilters(item, filters));
}

export type BacktestParamsValidation = {
  ok: boolean;
  strategyError?: string;
  tickerError?: string;
  rangeError?: string;
};

export function validateBacktestParams(params: BacktestParams): BacktestParamsValidation {
  const result: BacktestParamsValidation = { ok: true };
  const strategyName = params.strategyName.trim();
  const ticker = params.ticker.trim();

  if (strategyName.length === 0) {
    result.ok = false;
    result.strategyError = 'Укажите стратегию';
  }

  if (ticker.length === 0) {
    result.ok = false;
    result.tickerError = 'Укажите тикер';
  }

  if (params.fromDate.length > 0 && params.toDate.length > 0 && params.fromDate > params.toDate) {
    result.ok = false;
    result.rangeError = 'Дата начала должна быть не позже даты окончания';
  }

  return result;
}

export function compareRunIdsForSelection(
  selectedIds: readonly string[],
  runId: string,
  maxSelected: number,
): string[] {
  if (selectedIds.includes(runId)) {
    return selectedIds.filter((id) => id !== runId);
  }
  if (selectedIds.length >= maxSelected) {
    return [...selectedIds.slice(1), runId];
  }
  return [...selectedIds, runId];
}
