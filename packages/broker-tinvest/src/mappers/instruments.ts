import type { InstrumentSpecInput, ProviderInstrument } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import type { TinvestFutureRaw, TinvestIndicativeRaw, TinvestShareRaw } from '../raw.js';
import { deriveContractFamily, mapTinvestUnderlyingAssetType } from './underlying.js';

function normalizeCurrency(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return normalized.length === 3 ? normalized : null;
}

export function mapShareToProviderInstrument(share: TinvestShareRaw): ProviderInstrument {
  return {
    provider: 't-invest',
    providerInstrumentId: share.uid,
    assetType: 'share',
    ticker: share.ticker,
    name: share.name,
    currency: normalizeCurrency(share.currency),
    classCode: share.classCode.length > 0 ? share.classCode : null,
    engine: null,
    market: null,
    board: null,
    secid: null,
    isActive: share.apiTradeAvailableFlag,
  };
}

export function mapFutureToProviderInstrument(future: TinvestFutureRaw): ProviderInstrument {
  return {
    provider: 't-invest',
    providerInstrumentId: future.uid,
    assetType: 'future',
    ticker: future.ticker,
    name: future.name,
    currency: normalizeCurrency(future.currency),
    classCode: future.classCode.length > 0 ? future.classCode : null,
    engine: null,
    market: null,
    board: null,
    secid: null,
    isActive: future.apiTradeAvailableFlag,
  };
}

/**
 * Indicatives are underlying market series (index/commodity spot), not futures contracts.
 * Catalog rows use assetType `index` so they stay distinct from `future`.
 */
export function mapIndicativeToProviderInstrument(
  indicative: TinvestIndicativeRaw,
): ProviderInstrument {
  return {
    provider: 't-invest',
    providerInstrumentId: indicative.uid,
    assetType: 'index',
    ticker: indicative.ticker,
    name: indicative.name,
    currency: normalizeCurrency(indicative.currency),
    classCode: indicative.classCode.length > 0 ? indicative.classCode : null,
    engine: null,
    market: null,
    board: null,
    secid: null,
    isActive: indicative.buyAvailableFlag || indicative.sellAvailableFlag,
  };
}

export function mapShareToInstrumentSpecInput(share: TinvestShareRaw): InstrumentSpecInput {
  const validFrom = parseIsoDateTime(share.first1dayCandleDate ?? '1970-01-01T00:00:00.000Z');
  return {
    providerInstrumentId: share.uid,
    validFrom,
    validTo: null,
    lotSize: share.lot,
    minPriceIncrement: parseDecimalString(share.minPriceIncrement),
    priceCurrency: normalizeCurrency(share.currency),
    priceType: 'currency',
    contractMultiplier: null,
    expirationAt: null,
    marginInitial: null,
    underlyingProviderPositionUid: null,
    underlyingAssetType: null,
    underlyingAssetName: null,
    contractFamily: null,
    priceUnit: null,
    minPriceIncrementAmount: null,
    raw: {
      figi: share.figi,
      classCode: share.classCode,
      exchange: share.exchange,
      forQualInvestorFlag: share.forQualInvestorFlag,
      first1minCandleDate: share.first1minCandleDate,
      first1dayCandleDate: share.first1dayCandleDate,
    },
  };
}

export function mapFutureToInstrumentSpecInput(future: TinvestFutureRaw): InstrumentSpecInput {
  const underlyingAssetType = mapTinvestUnderlyingAssetType(future.assetType);
  const validFrom = parseIsoDateTime(
    future.first1dayCandleDate ?? future.first1minCandleDate ?? '1970-01-01T00:00:00.000Z',
  );
  return {
    providerInstrumentId: future.uid,
    validFrom,
    validTo: null,
    lotSize: future.lot,
    minPriceIncrement: parseDecimalString(future.minPriceIncrement),
    priceCurrency: normalizeCurrency(future.currency),
    priceType: 'points',
    contractMultiplier: null,
    expirationAt: future.expirationDate ? parseIsoDateTime(future.expirationDate) : null,
    marginInitial: future.initialMarginOnBuy
      ? parseDecimalString(future.initialMarginOnBuy)
      : null,
    underlyingProviderPositionUid: future.basicAssetPositionUid,
    underlyingAssetType,
    underlyingAssetName: future.basicAsset,
    contractFamily: deriveContractFamily(future.ticker),
    priceUnit: 'points',
    minPriceIncrementAmount: future.minPriceIncrementAmount
      ? parseDecimalString(future.minPriceIncrementAmount)
      : null,
    raw: {
      figi: future.figi,
      classCode: future.classCode,
      basicAsset: future.basicAsset,
      basicAssetPositionUid: future.basicAssetPositionUid,
      assetType: future.assetType,
      futuresType: future.futuresType,
      first1minCandleDate: future.first1minCandleDate,
      first1dayCandleDate: future.first1dayCandleDate,
    },
  };
}

export function mapIndicativeToInstrumentSpecInput(
  indicative: TinvestIndicativeRaw,
): InstrumentSpecInput {
  return {
    providerInstrumentId: indicative.uid,
    validFrom: parseIsoDateTime('1970-01-01T00:00:00.000Z'),
    validTo: null,
    lotSize: 1,
    minPriceIncrement: parseDecimalString('0.01'),
    priceCurrency: normalizeCurrency(indicative.currency),
    priceType: 'points',
    contractMultiplier: null,
    expirationAt: null,
    marginInitial: null,
    underlyingProviderPositionUid: null,
    underlyingAssetType: null,
    underlyingAssetName: null,
    contractFamily: null,
    priceUnit: null,
    minPriceIncrementAmount: null,
    raw: {
      kind: 'indicative',
      figi: indicative.figi,
      classCode: indicative.classCode,
      exchange: indicative.exchange,
    },
  };
}
