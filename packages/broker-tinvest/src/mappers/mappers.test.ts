import { describe, expect, it } from 'vitest';
import { createFixtureTinvestReadApi } from '../fixture-read-api.js';
import { mapTinvestAccount, mapTinvestOrder, mapTinvestPosition } from './broker.js';
import { mapCandleIntervalToTinvest, mapTinvestCandleToDomain } from './candles.js';
import {
  mapFutureToInstrumentSpecInput,
  mapFutureToProviderInstrument,
  mapIndicativeToProviderInstrument,
  mapShareToInstrumentSpecInput,
  mapShareToProviderInstrument,
} from './instruments.js';
import { mapTinvestLastPriceToDomain } from './market.js';
import { deriveContractFamily, mapTinvestUnderlyingAssetType } from './underlying.js';

describe('T-Invest mappers', () => {
  it('maps share, commodity/index futures and keeps indicatives separate', async () => {
    const api = createFixtureTinvestReadApi();
    const [share] = await api.listShares();
    const futures = await api.listFutures();
    const indicatives = await api.listIndicatives();
    if (!share || futures.length === 0 || indicatives.length === 0) {
      throw new Error('fixtures missing share/futures/indicatives');
    }

    const shareRow = mapShareToProviderInstrument(share);
    expect(shareRow.ticker).toBe('SBER');
    expect(shareRow.currency).toBe('RUB');
    expect(shareRow.provider).toBe('t-invest');

    const commodity = futures.find((item) => item.ticker === 'BRH6');
    const indexFuture = futures.find((item) => item.ticker === 'MXH6');
    const expired = futures.find((item) => item.ticker === 'CRZ5');
    if (!commodity || !indexFuture || !expired) {
      throw new Error('expected commodity/index/expired fixtures');
    }

    expect(mapFutureToProviderInstrument(commodity).assetType).toBe('future');
    const commoditySpec = mapFutureToInstrumentSpecInput(commodity);
    expect(commoditySpec.underlyingAssetType).toBe('commodity');
    expect(commoditySpec.underlyingAssetName).toBe('Brent');
    expect(commoditySpec.contractFamily).toBe('BR');
    expect(commoditySpec.priceType).toBe('points');
    expect(commoditySpec.raw.first1minCandleDate).toBe('2025-08-01T00:00:00.000Z');

    const indexSpec = mapFutureToInstrumentSpecInput(indexFuture);
    expect(indexSpec.underlyingAssetType).toBe('equity_index');
    expect(indexSpec.underlyingProviderPositionUid).toBe('imoex-indicative-pos-uid-0001');

    const expiredSpec = mapFutureToInstrumentSpecInput(expired);
    expect(expiredSpec.expirationAt).toBe('2025-12-18T00:00:00.000Z');
    expect(mapFutureToProviderInstrument(expired).isActive).toBe(false);

    const [imoex] = indicatives;
    if (!imoex) {
      throw new Error('missing indicative');
    }
    const indicativeRow = mapIndicativeToProviderInstrument(imoex);
    expect(indicativeRow.assetType).toBe('index');
    expect(indicativeRow.ticker).toBe('IMOEX');
    // Must not look like a futures contract series.
    expect(indicativeRow.assetType).not.toBe('future');

    const shareSpec = mapShareToInstrumentSpecInput(share);
    expect(shareSpec.lotSize).toBe(10);
    expect(shareSpec.minPriceIncrement).toBe('0.01');
    expect(shareSpec.priceType).toBe('currency');
    expect(shareSpec.underlyingAssetType).toBeNull();
  });

  it('maps underlying asset type labels and contract family', () => {
    expect(mapTinvestUnderlyingAssetType('commodity')).toBe('commodity');
    expect(mapTinvestUnderlyingAssetType('TYPE_COMMODITY')).toBe('commodity');
    expect(mapTinvestUnderlyingAssetType('index')).toBe('equity_index');
    expect(mapTinvestUnderlyingAssetType('TYPE_INDEX')).toBe('equity_index');
    expect(mapTinvestUnderlyingAssetType('currency')).toBe('currency');
    expect(mapTinvestUnderlyingAssetType('TYPE_CURRENCY')).toBe('currency');
    expect(mapTinvestUnderlyingAssetType('share')).toBe('share');
    expect(mapTinvestUnderlyingAssetType('weird')).toBe('other');
    expect(deriveContractFamily('BRH6')).toBe('BR');
    expect(deriveContractFamily('CRZ5')).toBe('CR');
    expect(deriveContractFamily('SiH6')).toBe('Si');
  });

  it('maps candles and last price', async () => {
    expect(mapCandleIntervalToTinvest('1d')).toBe('CANDLE_INTERVAL_DAY');
    const api = createFixtureTinvestReadApi();
    const candles = await api.getCandles({
      instrumentUid: 'e6123145-9665-43e0-8413-cd61b8aa9b13',
      interval: '1d',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-08T00:00:00.000Z'),
    });
    const first = candles[0];
    if (!first) {
      throw new Error('missing candle');
    }
    const candle = mapTinvestCandleToDomain({
      candle: first,
      instrumentId: '11111111-1111-4111-8111-111111111111',
      interval: '1d',
    });
    expect(candle.open).toBe('300.10');
    expect(candle.timeEnd).toBe('2026-11-07T00:00:00.000Z');
    expect(candle.provider).toBe('t-invest');

    const [lastRaw] = await api.getLastPrices(['e6123145-9665-43e0-8413-cd61b8aa9b13']);
    if (!lastRaw) {
      throw new Error('missing last price');
    }
    const mapped = mapTinvestLastPriceToDomain(
      lastRaw,
      new Map([[lastRaw.instrumentUid, '11111111-1111-4111-8111-111111111111']]),
      '2026-11-08T12:35:00.000Z',
    );
    expect(mapped?.last).toBe('302.55');
  });

  it('maps accounts, positions and orders', async () => {
    const api = createFixtureTinvestReadApi();
    const [account] = await api.listAccounts();
    if (!account) {
      throw new Error('missing account');
    }
    expect(mapTinvestAccount(account, true).isSandbox).toBe(true);

    const [position] = await api.getPositions('sandbox-account-1');
    if (!position) {
      throw new Error('missing position');
    }
    const mappedPosition = mapTinvestPosition(
      position,
      'sandbox-account-1',
      new Map([[position.instrumentUid, '11111111-1111-4111-8111-111111111111']]),
    );
    expect(mappedPosition.quantity).toBe('20');
    expect(mappedPosition.instrumentId).toBe('11111111-1111-4111-8111-111111111111');

    const [order] = await api.getOrders('sandbox-account-1');
    if (!order) {
      throw new Error('missing order');
    }
    const mappedOrder = mapTinvestOrder(
      order,
      'sandbox-account-1',
      new Map([[order.instrumentUid, '11111111-1111-4111-8111-111111111111']]),
      '2026-11-08T12:00:00.000Z',
    );
    expect(mappedOrder.side).toBe('buy');
    expect(mappedOrder.status).toBe('partially_filled');
    expect(mappedOrder.clientOrderId).toBe('44444444-4444-4444-8444-444444444444');
  });
});
