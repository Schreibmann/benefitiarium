import { parseInstrumentId, parseUuid } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createFixtureTinvestReadApi } from './fixture-read-api.js';
import type { InstrumentUidResolver } from './read-api.js';
import { createTinvestBrokerGateway } from './tinvest-broker-gateway.js';
import { createTinvestMarketDataProvider } from './tinvest-market-data-provider.js';

const instrumentId = parseInstrumentId('11111111-1111-4111-8111-111111111111');
const shareUid = 'e6123145-9665-43e0-8413-cd61b8aa9b13';

const resolver: InstrumentUidResolver = {
  toProviderUid: (id) => (id === instrumentId ? shareUid : null),
  toInstrumentId: (uid) => (uid === shareUid ? instrumentId : null),
};

describe('T-Invest adapters (fixture-backed)', () => {
  it('exposes MarketDataProvider catalog/spec/candles/last prices', async () => {
    const api = createFixtureTinvestReadApi();
    const provider = createTinvestMarketDataProvider({
      api,
      resolver,
      now: () => new Date('2026-11-08T12:35:00.000Z'),
    });

    const catalog = await provider.getInstrumentCatalog();
    const tickers = catalog.map((item) => item.ticker).sort();
    expect(tickers).toContain('SBER');
    expect(tickers).toContain('BRH6');
    expect(tickers).toContain('MXH6');
    expect(tickers).toContain('CRZ5');
    expect(tickers).toContain('IMOEX');
    expect(catalog.filter((item) => item.assetType === 'future').length).toBeGreaterThanOrEqual(5);
    expect(catalog.filter((item) => item.assetType === 'index').map((item) => item.ticker)).toEqual(
      expect.arrayContaining(['IMOEX', 'RTSI']),
    );

    const futureSpec = await provider.getInstrumentSpec('br-active-uid-0001-0000-000000000001');
    expect(futureSpec.underlyingAssetType).toBe('commodity');
    expect(futureSpec.contractFamily).toBe('BR');

    const indicativeSpec = await provider.getInstrumentSpec('imoex-indicative-uid-000000000001');
    expect(indicativeSpec.raw.kind).toBe('indicative');
    expect(indicativeSpec.underlyingAssetType).toBeNull();

    const spec = await provider.getInstrumentSpec(shareUid);
    expect(spec.lotSize).toBe(10);
    expect(spec.priceCurrency).toBe('RUB');

    const candles = await provider.getCandles({
      instrumentId,
      interval: '1d',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-08T00:00:00.000Z'),
    });
    expect(candles.items).toHaveLength(2);
    expect(candles.items[0]?.close).toBe('304.20');

    const prices = await provider.getLastPrices([instrumentId]);
    expect(prices[0]?.last).toBe('302.55');
  });

  it('exposes BrokerGateway read methods and blocks writes', async () => {
    const api = createFixtureTinvestReadApi();
    const gateway = createTinvestBrokerGateway({
      api,
      resolver,
      isSandbox: true,
      now: () => new Date('2026-11-08T12:00:00.000Z'),
    });

    const accounts = await gateway.listAccounts();
    expect(accounts[0]?.providerAccountId).toBe('sandbox-account-1');
    expect(accounts[0]?.isSandbox).toBe(true);

    const positions = await gateway.getPositions('sandbox-account-1');
    expect(positions[0]?.quantity).toBe('20');

    const orders = await gateway.getOrders('sandbox-account-1');
    expect(orders[0]?.status).toBe('partially_filled');

    const order = await gateway.getOrderState('sandbox-account-1', 'broker-order-abc');
    expect(order.brokerOrderId).toBe('broker-order-abc');

    await expect(
      gateway.placeOrder({
        accountId: 'sandbox-account-1',
        instrumentId,
        providerInstrumentId: shareUid,
        clientOrderId: parseUuid('44444444-4444-4444-8444-444444444444'),
        side: 'buy',
        orderType: 'limit',
        quantityLots: 1,
        limitPrice: null,
      }),
    ).rejects.toThrow(/disabled/);
  });
});
