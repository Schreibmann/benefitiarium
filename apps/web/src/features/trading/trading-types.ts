export type TradingExecutionMode = 'sandbox' | 'paper' | 'live';

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'market' | 'limit';

export type OrderLifecycle = 'new' | 'working' | 'filled' | 'cancelled' | 'rejected';

export type OrderDraft = {
  ticker: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: string;
  limitPrice: string;
};

export type OrderListItem = {
  id: string;
  ticker: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: string;
  limitPrice: string | null;
  lifecycle: OrderLifecycle;
  mode: TradingExecutionMode;
  createdAtIso: string;
};

export type PositionListItem = {
  id: string;
  ticker: string;
  quantity: string;
  avgPrice: string;
  mode: TradingExecutionMode;
};

export type PortfolioSummarySlots = {
  equityAvailable: boolean;
  cashAvailable: boolean;
  pnlAvailable: boolean;
};

export function createEmptyOrderDraft(): OrderDraft {
  return {
    ticker: '',
    side: 'buy',
    orderType: 'limit',
    quantity: '',
    limitPrice: '',
  };
}

export function tradingModeLabel(mode: TradingExecutionMode): string {
  switch (mode) {
    case 'sandbox':
      return 'SANDBOX';
    case 'paper':
      return 'PAPER';
    case 'live':
      return 'LIVE';
  }
}

export function tradingModeTone(mode: TradingExecutionMode): 'info' | 'neutral' | 'warning' {
  switch (mode) {
    case 'sandbox':
      return 'info';
    case 'paper':
      return 'neutral';
    case 'live':
      return 'warning';
  }
}

export function orderSideLabel(side: OrderSide): string {
  return side === 'buy' ? 'BUY' : 'SELL';
}

export function orderSideTone(side: OrderSide): 'positive' | 'negative' {
  return side === 'buy' ? 'positive' : 'negative';
}

export function orderLifecycleLabel(lifecycle: OrderLifecycle): string {
  switch (lifecycle) {
    case 'new':
      return 'NEW';
    case 'working':
      return 'WORKING';
    case 'filled':
      return 'FILLED';
    case 'cancelled':
      return 'CANCELLED';
    case 'rejected':
      return 'REJECTED';
  }
}

export type OrderDraftValidation = {
  ok: boolean;
  tickerError?: string;
  quantityError?: string;
  priceError?: string;
};

export function validateOrderDraft(draft: OrderDraft): OrderDraftValidation {
  const result: OrderDraftValidation = { ok: true };
  if (draft.ticker.trim().length === 0) {
    result.ok = false;
    result.tickerError = 'Укажите тикер';
  }
  if (draft.quantity.trim().length === 0) {
    result.ok = false;
    result.quantityError = 'Укажите количество';
  }
  if (draft.orderType === 'limit' && draft.limitPrice.trim().length === 0) {
    result.ok = false;
    result.priceError = 'Для LIMIT укажите цену';
  }
  return result;
}

export function buildLiveConfirmDescription(draft: OrderDraft, mode: TradingExecutionMode): string {
  const pricePart =
    draft.orderType === 'limit' ? `limit ${draft.limitPrice.trim()}` : 'market price';
  return [
    `Режим: ${tradingModeLabel(mode)}.`,
    `${orderSideLabel(draft.side)} ${draft.quantity.trim()} ${draft.ticker.trim().toUpperCase()} @ ${pricePart}.`,
    'Это реальное торговое действие. Подтвердите только если осознаёте риск потери капитала.',
  ].join(' ');
}

export function emptyPortfolioSummary(): PortfolioSummarySlots {
  return {
    equityAvailable: false,
    cashAvailable: false,
    pnlAvailable: false,
  };
}
