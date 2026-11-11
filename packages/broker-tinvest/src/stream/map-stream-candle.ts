import type { CandleInterval } from '@moex/domain';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import { CandleSource } from '@ttech-pub/grpc-node-client';
import { mapSubscriptionIntervalToCandleInterval } from './map-subscription-interval.js';

/** Canonical candle source labels (WEEKEND_INCLUDED maps SDK DEALER_WEEKEND). */
export type StreamCandleSource = 'EXCHANGE' | 'WEEKEND_INCLUDED' | 'UNSPECIFIED' | 'UNKNOWN';

export type StreamDeliveryMode = 'LIVE_UPDATES' | 'WAITING_CLOSE';

export type RealtimeBarState =
  | 'UPDATING'
  | 'CLOSE_EMITTED'
  | 'FINALIZED_BY_SCHEDULE'
  | 'CORRECTED'
  | 'UNKNOWN';

export type CanonicalStreamCandle = {
  instrumentUid: string;
  interval: CandleInterval;
  timeStart: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volumeLots: string;
  volumeBuyLots: string | null;
  volumeSellLots: string | null;
  /** Derived from subscription config — never from stream payload `is_complete`. */
  deliveryMode: StreamDeliveryMode;
  barState: RealtimeBarState;
  waitingClose: boolean;
  candleSource: StreamCandleSource;
  lastTradeTs: string | null;
  figi: string | null;
  ticker: string | null;
  classCode: string | null;
  receivedAt: string;
  revision: number;
  eventHash: string;
  /** Only for HistoricCandle / GetCandles — always null for stream Candle. */
  historicalProviderIsComplete: null;
};

export type MapStreamCandleOptions = {
  receivedAt?: string;
  /** From SubscriptionRegistry / subscribe request — not from Candle payload. */
  waitingClose?: boolean;
  revision?: number;
  previousEventHash?: string | null;
};

function quotationToDecimalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return parseDecimalString(String(value));
  }
  if (typeof value !== 'object') {
    return null;
  }
  if ('toString' in value && typeof value.toString === 'function') {
    const asString = value.toString();
    if (typeof asString === 'string' && asString.length > 0 && asString !== '[object Object]') {
      return parseDecimalString(asString);
    }
  }
  if ('units' in value || 'nano' in value) {
    const unitsRaw = 'units' in value ? value.units : 0;
    const nanoRaw = 'nano' in value ? value.nano : 0;
    const units =
      typeof unitsRaw === 'number' || typeof unitsRaw === 'string' || typeof unitsRaw === 'bigint'
        ? BigInt(unitsRaw)
        : null;
    const nano =
      typeof nanoRaw === 'number' || typeof nanoRaw === 'string' || typeof nanoRaw === 'bigint'
        ? Number(nanoRaw)
        : Number.NaN;
    if (units !== null && Number.isFinite(nano)) {
      const negative = units < 0n || nano < 0;
      const absUnits = units < 0n ? -units : units;
      const absNano = Math.abs(Math.trunc(nano));
      const fraction = String(absNano).padStart(9, '0').replace(/0+$/, '');
      const body = fraction.length > 0 ? `${absUnits.toString()}.${fraction}` : absUnits.toString();
      return parseDecimalString(negative ? `-${body}` : body);
    }
  }
  return null;
}

function timestampToIso(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return parseIsoDateTime(value);
  }
  if (typeof value === 'object' && 'seconds' in value) {
    const secondsRaw = value.seconds;
    const nanosRaw = 'nanos' in value ? value.nanos : 0;
    const seconds =
      typeof secondsRaw === 'number' ||
      typeof secondsRaw === 'string' ||
      typeof secondsRaw === 'bigint'
        ? Number(secondsRaw)
        : Number.NaN;
    const nanos =
      typeof nanosRaw === 'number' || typeof nanosRaw === 'string' || typeof nanosRaw === 'bigint'
        ? Number(nanosRaw)
        : 0;
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000 + Math.trunc(nanos / 1_000_000)).toISOString();
    }
  }
  return null;
}

function mapCandleSource(value: unknown): StreamCandleSource {
  if (value === CandleSource.CANDLE_SOURCE_EXCHANGE || value === 'CANDLE_SOURCE_EXCHANGE') {
    return 'EXCHANGE';
  }
  if (
    value === CandleSource.CANDLE_SOURCE_DEALER_WEEKEND ||
    value === 'CANDLE_SOURCE_DEALER_WEEKEND' ||
    value === 'CANDLE_SOURCE_INCLUDE_WEEKEND'
  ) {
    return 'WEEKEND_INCLUDED';
  }
  if (value === CandleSource.CANDLE_SOURCE_UNSPECIFIED || value === 'CANDLE_SOURCE_UNSPECIFIED') {
    return 'UNSPECIFIED';
  }
  return 'UNKNOWN';
}

function int64ToVolumeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function readStringField(obj: object, key: string): string | null {
  if (!(key in obj)) {
    return null;
  }
  const value = Reflect.get(obj, key);
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}

export function buildStreamCandleEventHash(input: {
  instrumentUid: string;
  interval: CandleInterval;
  timeStart: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volumeLots: string;
  candleSource: StreamCandleSource;
  deliveryMode: StreamDeliveryMode;
}): string {
  return [
    input.instrumentUid,
    input.interval,
    input.timeStart,
    input.open,
    input.high,
    input.low,
    input.close,
    input.volumeLots,
    input.candleSource,
    input.deliveryMode,
  ].join('|');
}

export function deliveryModeFromWaitingClose(waitingClose: boolean): StreamDeliveryMode {
  return waitingClose ? 'WAITING_CLOSE' : 'LIVE_UPDATES';
}

export function initialBarStateForDelivery(deliveryMode: StreamDeliveryMode): RealtimeBarState {
  return deliveryMode === 'WAITING_CLOSE' ? 'CLOSE_EMITTED' : 'UPDATING';
}

/**
 * Map a provider MarketDataResponse.candle payload into a canonical stream candle.
 *
 * v1.3: stream `Candle` has no `is_complete` (unlike HistoricCandle from GetCandles).
 * Finality comes from subscription `waitingClose` and/or a local schedule finalizer.
 */
export function mapStreamCandle(
  candle: unknown,
  options: MapStreamCandleOptions = {},
): CanonicalStreamCandle | null {
  if (typeof candle !== 'object' || candle === null) {
    return null;
  }

  // Explicitly ignore any accidental isComplete / is_complete on stream payloads.
  // Reading them for lifecycle is a v1.3 contract defect.

  const instrumentUid =
    readStringField(candle, 'instrumentUid') ?? readStringField(candle, 'instrument_uid');
  if (instrumentUid === null) {
    return null;
  }

  const intervalRaw = 'interval' in candle ? Reflect.get(candle, 'interval') : undefined;
  const resolvedInterval =
    typeof intervalRaw === 'number' ? mapSubscriptionIntervalToCandleInterval(intervalRaw) : null;
  if (resolvedInterval === null) {
    return null;
  }

  const timeStart =
    timestampToIso('time' in candle ? Reflect.get(candle, 'time') : undefined) ??
    timestampToIso('timeStart' in candle ? Reflect.get(candle, 'timeStart') : undefined);
  if (timeStart === null) {
    return null;
  }

  const open = quotationToDecimalString('open' in candle ? Reflect.get(candle, 'open') : undefined);
  const high = quotationToDecimalString('high' in candle ? Reflect.get(candle, 'high') : undefined);
  const low = quotationToDecimalString('low' in candle ? Reflect.get(candle, 'low') : undefined);
  const close = quotationToDecimalString(
    'close' in candle ? Reflect.get(candle, 'close') : undefined,
  );
  if (open === null || high === null || low === null || close === null) {
    return null;
  }

  const volumeLots =
    int64ToVolumeString('volume' in candle ? Reflect.get(candle, 'volume') : undefined) ?? '0';
  const volumeBuyLots = int64ToVolumeString(
    'volumeBuy' in candle
      ? Reflect.get(candle, 'volumeBuy')
      : 'volume_buy' in candle
        ? Reflect.get(candle, 'volume_buy')
        : undefined,
  );
  const volumeSellLots = int64ToVolumeString(
    'volumeSell' in candle
      ? Reflect.get(candle, 'volumeSell')
      : 'volume_sell' in candle
        ? Reflect.get(candle, 'volume_sell')
        : undefined,
  );
  const lastTradeTs = timestampToIso(
    'lastTradeTs' in candle
      ? Reflect.get(candle, 'lastTradeTs')
      : 'last_trade_ts' in candle
        ? Reflect.get(candle, 'last_trade_ts')
        : undefined,
  );
  const candleSource = mapCandleSource(
    'candleSourceType' in candle
      ? Reflect.get(candle, 'candleSourceType')
      : 'candle_source_type' in candle
        ? Reflect.get(candle, 'candle_source_type')
        : undefined,
  );

  const waitingClose = options.waitingClose ?? false;
  const deliveryMode = deliveryModeFromWaitingClose(waitingClose);
  const eventHash = buildStreamCandleEventHash({
    instrumentUid,
    interval: resolvedInterval,
    timeStart,
    open,
    high,
    low,
    close,
    volumeLots,
    candleSource,
    deliveryMode,
  });
  const previousHash = options.previousEventHash ?? null;
  const baseRevision = options.revision ?? 1;
  const revision =
    previousHash !== null && previousHash !== eventHash ? baseRevision + 1 : baseRevision;
  let barState = initialBarStateForDelivery(deliveryMode);
  if (previousHash !== null && previousHash !== eventHash && deliveryMode === 'WAITING_CLOSE') {
    barState = 'CORRECTED';
  } else if (
    previousHash !== null &&
    previousHash !== eventHash &&
    deliveryMode === 'LIVE_UPDATES' &&
    baseRevision > 1
  ) {
    // Later updates while still open stay UPDATING; schedule finalizer owns FINALIZED/CORRECTED.
    barState = 'UPDATING';
  }

  return {
    instrumentUid,
    interval: resolvedInterval,
    timeStart,
    open,
    high,
    low,
    close,
    volumeLots,
    volumeBuyLots,
    volumeSellLots,
    deliveryMode,
    barState,
    waitingClose,
    candleSource,
    lastTradeTs,
    figi: readStringField(candle, 'figi'),
    ticker: readStringField(candle, 'ticker'),
    classCode: readStringField(candle, 'classCode') ?? readStringField(candle, 'class_code'),
    receivedAt: options.receivedAt ?? new Date().toISOString(),
    revision,
    eventHash,
    historicalProviderIsComplete: null,
  };
}

export function marketCandleEventTypeForBarState(
  barState: RealtimeBarState,
):
  | 'market.candle.updated'
  | 'market.candle.close_emitted'
  | 'market.candle.finalized'
  | 'market.candle.corrected' {
  switch (barState) {
    case 'CLOSE_EMITTED':
      return 'market.candle.close_emitted';
    case 'FINALIZED_BY_SCHEDULE':
      return 'market.candle.finalized';
    case 'CORRECTED':
      return 'market.candle.corrected';
    case 'UPDATING':
    case 'UNKNOWN':
      return 'market.candle.updated';
    default: {
      const exhaustive: never = barState;
      return exhaustive;
    }
  }
}
