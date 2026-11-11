export type StrategyExecutionMode = 'monitoring' | 'paper' | 'sandbox' | 'live';

export type StrategyRunStatus = 'draft' | 'ready' | 'running' | 'paused' | 'error' | 'stopped';

export type StrategyListItem = {
  id: string;
  name: string;
  ticker: string;
  timeframe: string;
  mode: StrategyExecutionMode;
  status: StrategyRunStatus;
  lastEvent: string;
  updatedAtIso: string;
};

export type StrategyFilters = {
  nameQuery: string;
  tickerQuery: string;
  mode: 'all' | StrategyExecutionMode;
  status: 'all' | StrategyRunStatus;
};

export type StrategyDraft = {
  name: string;
  ticker: string;
  timeframe: string;
  mode: StrategyExecutionMode;
};

export function createDefaultStrategyFilters(): StrategyFilters {
  return {
    nameQuery: '',
    tickerQuery: '',
    mode: 'all',
    status: 'all',
  };
}

export function createEmptyStrategyDraft(): StrategyDraft {
  return {
    name: '',
    ticker: '',
    timeframe: '15m',
    mode: 'monitoring',
  };
}

export function strategyModeLabel(mode: StrategyExecutionMode): string {
  switch (mode) {
    case 'monitoring':
      return 'MONITORING';
    case 'paper':
      return 'PAPER';
    case 'sandbox':
      return 'SANDBOX';
    case 'live':
      return 'LIVE';
  }
}

export function strategyModeTone(
  mode: StrategyExecutionMode,
): 'brand' | 'neutral' | 'info' | 'warning' {
  switch (mode) {
    case 'monitoring':
      return 'brand';
    case 'paper':
      return 'neutral';
    case 'sandbox':
      return 'info';
    case 'live':
      return 'warning';
  }
}

export function strategyStatusLabel(status: StrategyRunStatus): string {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'ready':
      return 'READY';
    case 'running':
      return 'RUNNING';
    case 'paused':
      return 'PAUSED';
    case 'error':
      return 'ERROR';
    case 'stopped':
      return 'STOPPED';
  }
}

export function strategyStatusTone(
  status: StrategyRunStatus,
): 'neutral' | 'info' | 'positive' | 'warning' | 'negative' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'ready':
      return 'info';
    case 'running':
      return 'positive';
    case 'paused':
      return 'warning';
    case 'error':
      return 'negative';
    case 'stopped':
      return 'neutral';
  }
}

export function matchesStrategyFilters(item: StrategyListItem, filters: StrategyFilters): boolean {
  const nameQ = filters.nameQuery.trim().toLowerCase();
  if (nameQ.length > 0 && !item.name.toLowerCase().includes(nameQ)) {
    return false;
  }

  const tickerQ = filters.tickerQuery.trim().toLowerCase();
  if (tickerQ.length > 0 && !item.ticker.toLowerCase().includes(tickerQ)) {
    return false;
  }

  if (filters.mode !== 'all' && item.mode !== filters.mode) {
    return false;
  }

  if (filters.status !== 'all' && item.status !== filters.status) {
    return false;
  }

  return true;
}

export function filterStrategies(
  items: readonly StrategyListItem[],
  filters: StrategyFilters,
): StrategyListItem[] {
  return items.filter((item) => matchesStrategyFilters(item, filters));
}

export type StrategyDraftValidation = {
  ok: boolean;
  nameError?: string;
  tickerError?: string;
};

export function validateStrategyDraft(draft: StrategyDraft): StrategyDraftValidation {
  const name = draft.name.trim();
  const ticker = draft.ticker.trim();
  const result: StrategyDraftValidation = { ok: true };

  if (name.length === 0) {
    result.ok = false;
    result.nameError = 'Укажите название стратегии';
  }

  if (ticker.length === 0) {
    result.ok = false;
    result.tickerError = 'Укажите тикер';
  }

  return result;
}
