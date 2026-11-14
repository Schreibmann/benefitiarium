import { InstrumentType } from '@ttech-pub/grpc-node-client/compiled/common.js';
import type { TinvestFavoriteInstrumentRaw } from './raw.js';

export type GetFavoritesInput = {
  /** Optional favorites group id (InstrumentsService.GetFavorites.group_id). */
  groupId?: string;
};

export type GetFavoritesFn = (input?: GetFavoritesInput) => Promise<TinvestFavoriteInstrumentRaw[]>;

/** Narrow instruments port — only GetFavorites is required. */
export type GetFavoritesInstrumentsClient = {
  instruments: {
    getFavorites: (request: { groupId?: string }) => Promise<{
      favoriteInstruments?: readonly unknown[];
    }>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : fallback;
}

function mapInstrumentKind(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  switch (value) {
    case InstrumentType.INSTRUMENT_TYPE_UNSPECIFIED:
      return 'UNSPECIFIED';
    case InstrumentType.INSTRUMENT_TYPE_BOND:
      return 'BOND';
    case InstrumentType.INSTRUMENT_TYPE_SHARE:
      return 'SHARE';
    case InstrumentType.INSTRUMENT_TYPE_CURRENCY:
      return 'CURRENCY';
    case InstrumentType.INSTRUMENT_TYPE_ETF:
      return 'ETF';
    case InstrumentType.INSTRUMENT_TYPE_FUTURES:
      return 'FUTURES';
    case InstrumentType.INSTRUMENT_TYPE_SP:
      return 'SP';
    case InstrumentType.INSTRUMENT_TYPE_OPTION:
      return 'OPTION';
    case InstrumentType.INSTRUMENT_TYPE_CLEARING_CERTIFICATE:
      return 'CLEARING_CERTIFICATE';
    case InstrumentType.INSTRUMENT_TYPE_INDEX:
      return 'INDEX';
    case InstrumentType.INSTRUMENT_TYPE_COMMODITY:
      return 'COMMODITY';
    case InstrumentType.INSTRUMENT_TYPE_DFA:
      return 'DFA';
    default:
      return null;
  }
}

/**
 * Map a raw FavoriteInstrument (camelCase protobuf JS) into adapter raw shape.
 * Exported for unit tests without a live gRPC client.
 */
export function mapFavoriteInstrument(raw: unknown): TinvestFavoriteInstrumentRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const ticker = readString(raw, 'ticker');
  const classCode = readString(raw, 'classCode');
  if (ticker === null || classCode === null) {
    return null;
  }
  return {
    uid: readString(raw, 'uid'),
    figi: readString(raw, 'figi'),
    ticker,
    classCode,
    isin: readString(raw, 'isin'),
    name: readString(raw, 'name'),
    instrumentType: readString(raw, 'instrumentType'),
    instrumentKind: mapInstrumentKind(raw.instrumentKind),
    otcFlag: readBoolean(raw, 'otcFlag', false),
    apiTradeAvailableFlag: readBoolean(raw, 'apiTradeAvailableFlag', true),
  };
}

/**
 * Resolve MarketDataStream `instrumentId` for a favorites row.
 * Prefer uid (instrument_uid), then figi, then ticker_classCode.
 */
export function resolveFavoriteStreamInstrumentId(
  favorite: TinvestFavoriteInstrumentRaw,
): string | null {
  if (favorite.uid !== null && favorite.uid.trim().length > 0) {
    return favorite.uid.trim();
  }
  if (favorite.figi !== null && favorite.figi.trim().length > 0) {
    return favorite.figi.trim();
  }
  const ticker = favorite.ticker.trim();
  const classCode = favorite.classCode.trim();
  if (ticker.length === 0 || classCode.length === 0) {
    return null;
  }
  return `${ticker}_${classCode}`;
}

/**
 * Live GetFavorites via NodeApiClient.instruments (no high-level SDK command in 1.61).
 */
export function createGetFavorites(client: GetFavoritesInstrumentsClient): GetFavoritesFn {
  return async (input) => {
    const request =
      input?.groupId !== undefined && input.groupId.trim().length > 0
        ? { groupId: input.groupId.trim() }
        : {};
    const response = await client.instruments.getFavorites(request);
    const rows = Array.isArray(response.favoriteInstruments) ? response.favoriteInstruments : [];
    const mapped: TinvestFavoriteInstrumentRaw[] = [];
    for (const row of rows) {
      const favorite = mapFavoriteInstrument(row);
      if (favorite !== null) {
        mapped.push(favorite);
      }
    }
    return mapped;
  };
}
