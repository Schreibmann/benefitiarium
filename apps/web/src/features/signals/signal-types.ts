export type SignalDirection = 'buy' | 'sell' | 'neutral';

export type SignalLifecycle = 'active' | 'expired' | 'cancelled' | 'converted';

export type SignalListItem = {
  id: string;
  ticker: string;
  instrumentName: string;
  timeframe: string;
  strategyName: string;
  direction: SignalDirection;
  reason: string;
  createdAtIso: string;
  lifecycle: SignalLifecycle;
};

export type SignalFilters = {
  tickerQuery: string;
  strategyQuery: string;
  direction: 'all' | SignalDirection;
  timeframe: 'all' | string;
  lifecycle: 'all' | SignalLifecycle;
};

export function createDefaultSignalFilters(): SignalFilters {
  return {
    tickerQuery: '',
    strategyQuery: '',
    direction: 'all',
    timeframe: 'all',
    lifecycle: 'all',
  };
}

export function signalDirectionLabel(direction: SignalDirection): string {
  switch (direction) {
    case 'buy':
      return 'BUY';
    case 'sell':
      return 'SELL';
    case 'neutral':
      return 'NEUTRAL';
  }
}

export function signalLifecycleLabel(lifecycle: SignalLifecycle): string {
  switch (lifecycle) {
    case 'active':
      return 'ACTIVE';
    case 'expired':
      return 'EXPIRED';
    case 'cancelled':
      return 'CANCELLED';
    case 'converted':
      return 'CONVERTED';
  }
}

export function matchesSignalFilters(item: SignalListItem, filters: SignalFilters): boolean {
  const tickerQ = filters.tickerQuery.trim().toLowerCase();
  if (tickerQ.length > 0) {
    const haystack = `${item.ticker} ${item.instrumentName}`.toLowerCase();
    if (!haystack.includes(tickerQ)) {
      return false;
    }
  }

  const strategyQ = filters.strategyQuery.trim().toLowerCase();
  if (strategyQ.length > 0 && !item.strategyName.toLowerCase().includes(strategyQ)) {
    return false;
  }

  if (filters.direction !== 'all' && item.direction !== filters.direction) {
    return false;
  }

  if (filters.timeframe !== 'all' && item.timeframe !== filters.timeframe) {
    return false;
  }

  if (filters.lifecycle !== 'all' && item.lifecycle !== filters.lifecycle) {
    return false;
  }

  return true;
}

export function filterSignals(
  items: readonly SignalListItem[],
  filters: SignalFilters,
): SignalListItem[] {
  return items.filter((item) => matchesSignalFilters(item, filters));
}

export type SignalsListTab = 'active' | 'history';

export function matchesSignalsTab(item: SignalListItem, tab: SignalsListTab): boolean {
  if (tab === 'active') {
    return item.lifecycle === 'active';
  }
  return item.lifecycle !== 'active';
}

export function filterSignalsForTab(
  items: readonly SignalListItem[],
  filters: SignalFilters,
  tab: SignalsListTab,
): SignalListItem[] {
  return filterSignals(items, filters).filter((item) => matchesSignalsTab(item, tab));
}

export function signalDirectionTone(direction: SignalDirection): 'positive' | 'negative' | 'info' {
  switch (direction) {
    case 'buy':
      return 'positive';
    case 'sell':
      return 'negative';
    case 'neutral':
      return 'info';
  }
}

export function signalLifecycleTone(
  lifecycle: SignalLifecycle,
): 'brand' | 'neutral' | 'warning' | 'info' {
  switch (lifecycle) {
    case 'active':
      return 'brand';
    case 'expired':
      return 'neutral';
    case 'cancelled':
      return 'warning';
    case 'converted':
      return 'info';
  }
}
