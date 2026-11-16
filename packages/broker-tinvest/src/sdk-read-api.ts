import type { CandleInterval } from '@moex/domain';
import {
  InstrumentStatus,
  LastPriceType,
  CandleInterval as TinvestCandleInterval,
} from '@ttech-pub/grpc-node-client';
import { InstrumentExchangeType } from '@ttech-pub/grpc-node-client/compiled/instruments.js';
import {
  GetCandlesCommand,
  GetFuturesCommand,
  GetIndicativesCommand,
  GetLastPricesCommand,
  GetSharesCommand,
  type InvestNodeSDK,
} from '@ttech-pub/invest-sdk-node';
import { buildGetFavoritesCommand, mapFavoritesResponse } from './get-favorites-command.js';
import { buildGetLastTradesCommand, mapLastTradesResponse } from './get-last-trades-command.js';
import {
  buildGetTechAnalysisCommand,
  mapTechAnalysisResponse,
} from './get-tech-analysis-command.js';
import { mapCandleIntervalToTinvest } from './mappers/candles.js';
import { optionalQuotationToDecimalString, quotationToDecimalString } from './mappers/quotation.js';
import type {
  TinvestCandleRaw,
  TinvestFutureRaw,
  TinvestIndicativeRaw,
  TinvestLastPriceRaw,
  TinvestShareRaw,
} from './raw.js';
import type { TinvestReadApi } from './read-api.js';
import { createTtlSingleflightCache } from './ttl-singleflight-cache.js';

/** Instrument catalogs change rarely; cache protects against GetFutures RESOURCE_EXHAUSTED. */
const CATALOG_TTL_MS = 15 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/** Missing flag → null (callers choose default). Explicit boolean is preserved. */
function readOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readAssetTypeLabel(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  // AssetType enum numeric wire values → Future.asset_type vocabulary.
  if (value === 2) {
    return 'commodity';
  }
  if (value === 3) {
    return 'index';
  }
  if (value === 1) {
    return 'currency';
  }
  if (value === 4) {
    return 'security';
  }
  return null;
}

function decimalToString(value: unknown, field: string): string {
  return quotationToDecimalString(value, field);
}

function toSdkInterval(interval: CandleInterval): TinvestCandleInterval {
  const name = mapCandleIntervalToTinvest(interval);
  const value = TinvestCandleInterval[name as keyof typeof TinvestCandleInterval];
  if (typeof value !== 'number') {
    throw new Error(`Unsupported T-Invest candle interval mapping: ${name}`);
  }
  return value;
}

function mapShare(raw: unknown): TinvestShareRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const uid = readString(raw, 'uid');
  const ticker = readString(raw, 'ticker');
  const name = readString(raw, 'name');
  const classCode = readString(raw, 'classCode');
  const currency = readString(raw, 'currency');
  if (uid === null || ticker === null || name === null || classCode === null || currency === null) {
    return null;
  }
  return {
    uid,
    figi: readString(raw, 'figi'),
    ticker,
    name,
    classCode,
    currency,
    lot: typeof raw.lot === 'number' ? raw.lot : Number(raw.lot ?? 0),
    minPriceIncrement: decimalToString(raw.minPriceIncrement ?? '0.01', 'minPriceIncrement'),
    apiTradeAvailableFlag: Boolean(raw.apiTradeAvailableFlag),
    forQualInvestorFlag: Boolean(raw.forQualInvestorFlag),
    first1dayCandleDate: isoOrNull(raw.first1dayCandleDate),
    first1minCandleDate: isoOrNull(raw.first1minCandleDate),
    exchange: readString(raw, 'exchange'),
  };
}

function mapFuture(raw: unknown): TinvestFutureRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const uid = readString(raw, 'uid');
  const ticker = readString(raw, 'ticker');
  const name = readString(raw, 'name');
  const classCode = readString(raw, 'classCode');
  const currency = readString(raw, 'currency');
  if (uid === null || ticker === null || name === null || classCode === null || currency === null) {
    return null;
  }
  return {
    uid,
    figi: readString(raw, 'figi'),
    ticker,
    name,
    classCode,
    currency,
    lot: typeof raw.lot === 'number' ? raw.lot : Number(raw.lot ?? 0),
    minPriceIncrement: decimalToString(raw.minPriceIncrement ?? '0.01', 'minPriceIncrement'),
    minPriceIncrementAmount: optionalQuotationToDecimalString(
      raw.minPriceIncrementAmount,
      'minPriceIncrementAmount',
    ),
    assetType: readAssetTypeLabel(raw.assetType),
    sector: readString(raw, 'sector'),
    basicAsset: readString(raw, 'basicAsset'),
    basicAssetPositionUid: readString(raw, 'basicAssetPositionUid'),
    expirationDate: isoOrNull(raw.expirationDate),
    first1minCandleDate: isoOrNull(raw.first1minCandleDate),
    first1dayCandleDate: isoOrNull(raw.first1dayCandleDate),
    initialMarginOnBuy: optionalQuotationToDecimalString(
      raw.initialMarginOnBuy,
      'initialMarginOnBuy',
    ),
    futuresType: readString(raw, 'futuresType'),
    // Live payloads sometimes omit the flag; treat missing as tradeable so catalogs are usable.
    apiTradeAvailableFlag: readOptionalBoolean(raw.apiTradeAvailableFlag) ?? true,
  };
}

function mapIndicative(raw: unknown): TinvestIndicativeRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const uid = readString(raw, 'uid');
  const ticker = readString(raw, 'ticker');
  const name = readString(raw, 'name');
  const classCode = readString(raw, 'classCode');
  const currency = readString(raw, 'currency');
  if (uid === null || ticker === null || name === null || classCode === null || currency === null) {
    return null;
  }
  return {
    uid,
    figi: readString(raw, 'figi'),
    ticker,
    name,
    classCode,
    currency,
    exchange: readString(raw, 'exchange'),
    buyAvailableFlag: Boolean(raw.buyAvailableFlag),
    sellAvailableFlag: Boolean(raw.sellAvailableFlag),
  };
}

function mapCandle(raw: unknown): TinvestCandleRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const time = isoOrNull(raw.time);
  if (time === null) {
    return null;
  }
  return {
    time,
    open: decimalToString(raw.open, 'open'),
    high: decimalToString(raw.high, 'high'),
    low: decimalToString(raw.low, 'low'),
    close: decimalToString(raw.close, 'close'),
    volume: decimalToString(raw.volume ?? '0', 'volume'),
    isComplete: Boolean(raw.isComplete),
  };
}

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (isRecord(value)) {
    const seconds = value.seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      const nanos = typeof value.nanos === 'number' ? value.nanos : 0;
      return new Date(seconds * 1000 + nanos / 1_000_000).toISOString();
    }
    if (typeof seconds === 'bigint') {
      const nanos = typeof value.nanos === 'number' ? value.nanos : 0;
      return new Date(Number(seconds) * 1000 + nanos / 1_000_000).toISOString();
    }
  }
  return null;
}

/**
 * Live TinvestReadApi backed by InvestNodeSDK (server-side only).
 * Write/account methods are intentionally unsupported on this read path.
 * Catalog RPCs are TTL + singleflight cached to avoid InstrumentsService RESOURCE_EXHAUSTED.
 */
export function createSdkTinvestReadApi(sdk: InvestNodeSDK): TinvestReadApi {
  const sharesCache = createTtlSingleflightCache<TinvestShareRaw[]>({ ttlMs: CATALOG_TTL_MS });
  const futuresCache = createTtlSingleflightCache<TinvestFutureRaw[]>({ ttlMs: CATALOG_TTL_MS });
  const indicativesCache = createTtlSingleflightCache<TinvestIndicativeRaw[]>({
    ttlMs: CATALOG_TTL_MS,
  });
  const api: TinvestReadApi = {
    listShares: async () =>
      sharesCache.get(async () => {
        const response = await sdk.send(
          new GetSharesCommand({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE }),
        );
        const rows = Array.isArray(response.instruments) ? response.instruments : [];
        return rows.map(mapShare).filter((row): row is TinvestShareRaw => row !== null);
      }),
    listFutures: async () =>
      futuresCache.get(async () => {
        // Docs: Futures ← InstrumentsRequest; BASE + EXCHANGE_UNSPECIFIED.
        const response = await sdk.send(
          new GetFuturesCommand({
            instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE,
            instrumentExchange: InstrumentExchangeType.INSTRUMENT_EXCHANGE_UNSPECIFIED,
          }),
        );
        const rows = Array.isArray(response.instruments) ? response.instruments : [];
        return rows.map(mapFuture).filter((row): row is TinvestFutureRaw => row !== null);
      }),
    listIndicatives: async () =>
      indicativesCache.get(async () => {
        const response = await sdk.send(new GetIndicativesCommand({}));
        const rows = Array.isArray(response.instruments) ? response.instruments : [];
        return rows.map(mapIndicative).filter((row): row is TinvestIndicativeRaw => row !== null);
      }),
    listFavorites: async () => {
      const response = await sdk.send(buildGetFavoritesCommand());
      return mapFavoritesResponse(response);
    },
    getShareByUid: async (uid) => {
      const shares = await api.listShares();
      return shares.find((row) => row.uid === uid) ?? null;
    },
    getFutureByUid: async (uid) => {
      const futures = await api.listFutures();
      return futures.find((row) => row.uid === uid) ?? null;
    },
    getIndicativeByUid: async (uid) => {
      const indicatives = await api.listIndicatives();
      return indicatives.find((row) => row.uid === uid) ?? null;
    },
    getCandles: async (input) => {
      const response = await sdk.send(
        new GetCandlesCommand({
          instrumentId: input.instrumentUid,
          from: input.from,
          to: input.to,
          interval: toSdkInterval(input.interval),
        }),
      );
      const rows = Array.isArray(response.candles) ? response.candles : [];
      return rows.map(mapCandle).filter((row): row is TinvestCandleRaw => row !== null);
    },
    getLastPrices: async (instrumentUids) => {
      const response = await sdk.send(
        new GetLastPricesCommand({
          figi: [],
          instrumentId: instrumentUids,
          lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE,
        }),
      );
      const rows = Array.isArray(response.lastPrices) ? response.lastPrices : [];
      const mapped: TinvestLastPriceRaw[] = [];
      for (const row of rows) {
        if (!isRecord(row)) {
          continue;
        }
        const instrumentUid = readString(row, 'instrumentUid') ?? readString(row, 'instrumentId');
        const time = isoOrNull(row.time);
        if (instrumentUid === null || time === null) {
          continue;
        }
        mapped.push({
          instrumentUid,
          price: decimalToString(row.price, 'price'),
          time,
        });
      }
      return mapped;
    },
    getLastTrades: async (input) => {
      const response = await sdk.send(buildGetLastTradesCommand(input));
      return mapLastTradesResponse(response.trades);
    },
    getTechAnalysis: async (input) => {
      const response = await sdk.send(buildGetTechAnalysisCommand(input));
      return mapTechAnalysisResponse(response.technicalIndicators);
    },
    listAccounts: async () => {
      throw new Error('listAccounts is not available on the market-data read path');
    },
    getPositions: async () => {
      throw new Error('getPositions is not available on the market-data read path');
    },
    getOrders: async () => {
      throw new Error('getOrders is not available on the market-data read path');
    },
    getOrderById: async () => {
      throw new Error('getOrderById is not available on the market-data read path');
    },
  };
  return api;
}

export function createIdentityInstrumentUidResolver(): import('./read-api.js').InstrumentUidResolver {
  return {
    toProviderUid: (instrumentId) => instrumentId,
    toInstrumentId: (providerUid) => providerUid,
  };
}
