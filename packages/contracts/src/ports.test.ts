import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDecimalString, parseInstrumentId, parseIsoDateTime, parseUuid } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type {
  BrokerGateway,
  MarketDataProvider,
  PlaceOrderCommand,
  ProviderInstrument,
} from './index.js';

const instrumentId = parseInstrumentId('11111111-1111-4111-8111-111111111111');
const clientOrderId = parseUuid('44444444-4444-4444-8444-444444444444');

function createMarketDataMock(catalog: ProviderInstrument[]): MarketDataProvider {
  return {
    getInstrumentCatalog: async () => catalog,
    getInstrumentSpec: async (providerInstrumentId) => ({
      providerInstrumentId,
      lotSize: 1,
      minPriceIncrement: parseDecimalString('0.01'),
      priceCurrency: 'RUB',
      priceType: 'currency',
      contractMultiplier: null,
      expirationAt: null,
      marginInitial: null,
      raw: {},
      validFrom: parseIsoDateTime('2026-01-01T00:00:00.000Z'),
      validTo: null,
    }),
    getLastPrices: async (instrumentIds) =>
      instrumentIds.map((id) => ({
        instrumentId: id,
        provider: 'paper',
        last: parseDecimalString('100.0'),
        eventTime: parseIsoDateTime('2026-11-08T12:00:00.000Z'),
        receivedAt: parseIsoDateTime('2026-11-08T12:00:00.050Z'),
        quality: 'good',
      })),
    getCandles: async () => ({ items: [] }),
    getTrades: async () => ({
      items: [],
      effectiveFrom: parseIsoDateTime('2026-11-08T11:00:00.000Z'),
      effectiveTo: parseIsoDateTime('2026-11-08T12:00:00.000Z'),
      historyTradeDays: [],
      missingDays: [],
      lastTradesIncluded: false,
      source: 'history_trades',
    }),
  };
}

function createBrokerMock(): BrokerGateway {
  return {
    listAccounts: async () => [
      {
        providerAccountId: 'sandbox-1',
        accountType: 'broker',
        currency: 'RUB',
        isSandbox: true,
        name: 'Sandbox',
      },
    ],
    getPositions: async () => [],
    getOrders: async () => [],
    getOrderState: async () => {
      throw new Error('not found');
    },
    placeOrder: async (command: PlaceOrderCommand) => ({
      brokerOrderId: 'broker-order-1',
      clientOrderId: command.clientOrderId,
      status: 'new',
    }),
    cancelOrder: async ({ brokerOrderId }) => ({
      brokerOrderId,
      status: 'cancelled',
    }),
    replaceOrder: async (command) => ({
      brokerOrderId: command.brokerOrderId,
      clientOrderId: command.clientOrderId,
      status: 'active',
    }),
  };
}

function readDependencies(packageJsonPath: string): string[] {
  const raw: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('package.json must be an object');
  }
  const record = raw;
  const dependencies =
    'dependencies' in record && typeof record.dependencies === 'object' && record.dependencies
      ? record.dependencies
      : {};
  const devDependencies =
    'devDependencies' in record &&
    typeof record.devDependencies === 'object' &&
    record.devDependencies
      ? record.devDependencies
      : {};
  return [...Object.keys(dependencies), ...Object.keys(devDependencies)];
}

describe('provider ports', () => {
  it('allows in-memory MarketDataProvider mock without SDK types', async () => {
    const provider = createMarketDataMock([
      {
        provider: 't-invest',
        providerInstrumentId: 'uid-sber',
        assetType: 'share',
        ticker: 'SBER',
        name: 'Sberbank',
        currency: 'RUB',
        classCode: 'TQBR',
        engine: null,
        market: null,
        board: null,
        secid: null,
        isActive: true,
      },
    ]);

    const catalog = await provider.getInstrumentCatalog();
    const prices = await provider.getLastPrices([instrumentId]);
    expect(catalog[0]?.ticker).toBe('SBER');
    expect(prices[0]?.last).toBe('100.0');
  });

  it('allows in-memory BrokerGateway mock for order lifecycle', async () => {
    const gateway = createBrokerMock();
    const placed = await gateway.placeOrder({
      accountId: 'sandbox-1',
      instrumentId,
      providerInstrumentId: 'uid-sber',
      clientOrderId,
      side: 'buy',
      orderType: 'limit',
      quantityLots: 1,
      limitPrice: parseDecimalString('100.5'),
    });
    expect(placed.status).toBe('new');
    expect(placed.clientOrderId).toBe(clientOrderId);
  });

  it('does not depend on T-Invest SDK packages', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(here, '..', 'package.json');
    const deps = readDependencies(packageJsonPath);
    const forbidden = deps.filter(
      (name) => name.startsWith('@ttech-pub/') || name.includes('invest-sdk'),
    );
    expect(forbidden).toEqual([]);
  });
});
