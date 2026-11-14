import type { CanonicalStreamCandle } from '@moex/broker-tinvest';
import { type Candle, parseDecimalString, parseInstrumentId, parseIsoDateTime } from '@moex/domain';
import { createMemoryMarketSignalsStore } from '@moex/persistence';
import type { LevelSet } from '@moex/signal-triggers';
import { describe, expect, it, vi } from 'vitest';
import { createPreviousPriceStore } from './previous-price-store.js';
import { createTriggerEvaluator } from './trigger-evaluator.js';

const levelSet: LevelSet = {
  source: 'fibonacci_pivot',
  periodId: 'valid:open',
  quality: 'ok',
  levels: [{ name: 'P', value: '100' }],
};

function candle(overrides: Partial<CanonicalStreamCandle> = {}): CanonicalStreamCandle {
  return {
    instrumentUid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    interval: '5m',
    timeStart: '2026-11-14T10:00:00.000Z',
    open: '99',
    high: '101',
    low: '98',
    close: '100.5',
    volumeLots: '1',
    volumeBuyLots: null,
    volumeSellLots: null,
    deliveryMode: 'WAITING_CLOSE',
    barState: 'CLOSE_EMITTED',
    waitingClose: true,
    candleSource: 'EXCHANGE',
    lastTradeTs: null,
    figi: null,
    ticker: 'NGZ6',
    classCode: null,
    receivedAt: '2026-11-14T10:05:00.000Z',
    revision: 1,
    eventHash: 'hash-1',
    historicalProviderIsComplete: null,
    ...overrides,
  };
}

describe('createTriggerEvaluator', () => {
  it('persists cross hits and skips corrections', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-14T10:05:00.000Z'));
    const previousPrices = createPreviousPriceStore();
    previousPrices.seed('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', '5m', '99');

    let ids = 0;
    const evaluator = createTriggerEvaluator({
      marketData: {
        getCandles: vi.fn(async () => ({ items: [] })),
        getInstrumentCatalog: async () => [],
        getInstrumentSpec: async () => {
          throw new Error('unused');
        },
        getLastPrices: async () => [],
        getTrades: async () => ({
          items: [],
          effectiveFrom: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          effectiveTo: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          historyTradeDays: [],
          missingDays: [],
          lastTradesIncluded: false,
          source: 'history_trades' as const,
        }),
      },
      levelCache: {
        getLevelSet: async () => levelSet,
        clear: () => undefined,
      },
      previousPrices,
      signalsRepo: store,
      evalMode: 'close',
      triggers: ['fib_pivot_cross'],
      approachPctByTimeframe: { '5m': '0.15', '1h': '0.4' },
      telegramChannelId: '-1001',
      timeZone: 'Europe/Moscow',
      createId: () => {
        ids += 1;
        return `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee${String(ids).padStart(4, '0')}`;
      },
    });

    await evaluator.handleCandle(candle());
    expect(store.snapshotSignals()).toHaveLength(1);
    expect(store.snapshotNotifications()).toHaveLength(1);
    expect(store.snapshotNotifications()[0]?.text).toContain('NGZ6');

    await evaluator.handleCandle(candle({ barState: 'CORRECTED', eventHash: 'hash-2' }));
    expect(store.snapshotSignals()).toHaveLength(1);
  });

  it('ignores intrabar updates when evalMode is close', async () => {
    const store = createMemoryMarketSignalsStore();
    const previousPrices = createPreviousPriceStore();
    previousPrices.seed('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', '5m', '99');
    const skipped: string[] = [];
    const evaluator = createTriggerEvaluator({
      marketData: {
        getCandles: async () => ({ items: [] }),
        getInstrumentCatalog: async () => [],
        getInstrumentSpec: async () => {
          throw new Error('unused');
        },
        getLastPrices: async () => [],
        getTrades: async () => ({
          items: [],
          effectiveFrom: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          effectiveTo: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          historyTradeDays: [],
          missingDays: [],
          lastTradesIncluded: false,
          source: 'history_trades' as const,
        }),
      },
      levelCache: {
        getLevelSet: async () => levelSet,
        clear: () => undefined,
      },
      previousPrices,
      signalsRepo: store,
      evalMode: 'close',
      triggers: ['fib_pivot_cross'],
      approachPctByTimeframe: { '5m': '0.15', '1h': '0.4' },
      telegramChannelId: '-1001',
      timeZone: 'Europe/Moscow',
      onSkipped: (reason) => {
        skipped.push(reason);
      },
    });

    await evaluator.handleCandle(
      candle({
        deliveryMode: 'LIVE_UPDATES',
        barState: 'UPDATING',
        waitingClose: false,
      }),
    );
    expect(store.snapshotSignals()).toHaveLength(0);
    expect(skipped).toContain('not_closed');
  });

  it('seeds previous price from historical candles once', async () => {
    const store = createMemoryMarketSignalsStore();
    const previousPrices = createPreviousPriceStore();
    const seedCandle: Candle = {
      instrumentId: parseInstrumentId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
      provider: 't-invest',
      interval: '5m',
      timeStart: parseIsoDateTime('2026-11-14T09:55:00.000Z'),
      timeEnd: parseIsoDateTime('2026-11-14T10:00:00.000Z'),
      open: parseDecimalString('98'),
      high: parseDecimalString('99'),
      low: parseDecimalString('97'),
      close: parseDecimalString('99'),
      volume: parseDecimalString('1'),
      volumeUnit: 'lots',
      turnover: null,
      isClosed: true,
      quality: 'good',
      sourceRevision: null,
    };
    const getCandles = vi.fn(async () => ({ items: [seedCandle] }));

    const evaluator = createTriggerEvaluator({
      marketData: {
        getCandles,
        getInstrumentCatalog: async () => [],
        getInstrumentSpec: async () => {
          throw new Error('unused');
        },
        getLastPrices: async () => [],
        getTrades: async () => ({
          items: [],
          effectiveFrom: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          effectiveTo: parseIsoDateTime('2026-11-14T00:00:00.000Z'),
          historyTradeDays: [],
          missingDays: [],
          lastTradesIncluded: false,
          source: 'history_trades' as const,
        }),
      },
      levelCache: {
        getLevelSet: async () => levelSet,
        clear: () => undefined,
      },
      previousPrices,
      signalsRepo: store,
      evalMode: 'close',
      triggers: ['fib_pivot_cross'],
      approachPctByTimeframe: { '5m': '0.15', '1h': '0.4' },
      telegramChannelId: '-1001',
      timeZone: 'Europe/Moscow',
      createId: (() => {
        let n = 0;
        return () => {
          n += 1;
          return `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee${String(n).padStart(4, '0')}`;
        };
      })(),
    });

    await evaluator.handleCandle(candle({ close: '100.2' }));
    expect(getCandles).toHaveBeenCalledOnce();
    expect(store.snapshotSignals()).toHaveLength(1);
  });
});
