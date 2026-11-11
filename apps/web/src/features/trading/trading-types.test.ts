import { describe, expect, it } from 'vitest';
import {
  buildLiveConfirmDescription,
  createEmptyOrderDraft,
  emptyPortfolioSummary,
  orderSideLabel,
  tradingModeLabel,
  tradingModeTone,
  validateOrderDraft,
} from './trading-types.js';

describe('trading-types', () => {
  it('labels modes and sides', () => {
    expect(tradingModeLabel('sandbox')).toBe('SANDBOX');
    expect(tradingModeLabel('live')).toBe('LIVE');
    expect(tradingModeTone('live')).toBe('warning');
    expect(orderSideLabel('sell')).toBe('SELL');
  });

  it('validates order draft fields', () => {
    expect(validateOrderDraft(createEmptyOrderDraft())).toEqual({
      ok: false,
      tickerError: 'Укажите тикер',
      quantityError: 'Укажите количество',
      priceError: 'Для LIMIT укажите цену',
    });
    expect(
      validateOrderDraft({
        ticker: 'SBER',
        side: 'buy',
        orderType: 'market',
        quantity: '10',
        limitPrice: '',
      }),
    ).toEqual({ ok: true });
  });

  it('builds LIVE confirmation copy with instrument details', () => {
    const text = buildLiveConfirmDescription(
      {
        ticker: 'sber',
        side: 'buy',
        orderType: 'limit',
        quantity: '5',
        limitPrice: '250.5',
      },
      'live',
    );
    expect(text).toContain('LIVE');
    expect(text).toContain('BUY 5 SBER');
    expect(text).toContain('limit 250.5');
  });

  it('keeps portfolio summary slots empty by default', () => {
    expect(emptyPortfolioSummary()).toEqual({
      equityAvailable: false,
      cashAvailable: false,
      pnlAvailable: false,
    });
  });
});
