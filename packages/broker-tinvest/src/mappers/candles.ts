import type { CandleInterval } from '@moex/domain';
import {
  parseDecimalString,
  parseInstrumentId,
  parseIsoDateTime,
  type Candle,
  type InstrumentId,
} from '@moex/domain';
import type { TinvestCandleRaw } from '../raw.js';

const INTERVAL_MS: Record<CandleInterval, number | null> = {
  '5s': 5_000,
  '10s': 10_000,
  '30s': 30_000,
  '1m': 60_000,
  '2m': 120_000,
  '3m': 180_000,
  '5m': 300_000,
  '10m': 600_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
  '1M': null,
};

export function mapCandleIntervalToTinvest(interval: CandleInterval): string {
  switch (interval) {
    case '5s':
      return 'CANDLE_INTERVAL_5_SEC';
    case '10s':
      return 'CANDLE_INTERVAL_10_SEC';
    case '30s':
      return 'CANDLE_INTERVAL_30_SEC';
    case '1m':
      return 'CANDLE_INTERVAL_1_MIN';
    case '2m':
      return 'CANDLE_INTERVAL_2_MIN';
    case '3m':
      return 'CANDLE_INTERVAL_3_MIN';
    case '5m':
      return 'CANDLE_INTERVAL_5_MIN';
    case '10m':
      return 'CANDLE_INTERVAL_10_MIN';
    case '15m':
      return 'CANDLE_INTERVAL_15_MIN';
    case '30m':
      return 'CANDLE_INTERVAL_30_MIN';
    case '1h':
      return 'CANDLE_INTERVAL_HOUR';
    case '2h':
      return 'CANDLE_INTERVAL_2_HOUR';
    case '4h':
      return 'CANDLE_INTERVAL_4_HOUR';
    case '1d':
      return 'CANDLE_INTERVAL_DAY';
    case '1w':
      return 'CANDLE_INTERVAL_WEEK';
    case '1M':
      return 'CANDLE_INTERVAL_MONTH';
    default: {
      const exhaustive: never = interval;
      throw new Error(`Unsupported candle interval: ${String(exhaustive)}`);
    }
  }
}

function addInterval(timeStartIso: string, interval: CandleInterval): string {
  const startMs = Date.parse(timeStartIso);
  if (Number.isNaN(startMs)) {
    throw new Error(`Invalid candle time: ${timeStartIso}`);
  }
  const duration = INTERVAL_MS[interval];
  if (duration === null) {
    const start = new Date(startMs);
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
    );
    return end.toISOString();
  }
  return new Date(startMs + duration).toISOString();
}

export function mapTinvestCandleToDomain(input: {
  candle: TinvestCandleRaw;
  instrumentId: InstrumentId | string;
  interval: CandleInterval;
}): Candle {
  const timeStart = parseIsoDateTime(input.candle.time);
  const timeEnd = parseIsoDateTime(addInterval(input.candle.time, input.interval));
  return {
    instrumentId: parseInstrumentId(String(input.instrumentId)),
    provider: 't-invest',
    interval: input.interval,
    timeStart,
    timeEnd,
    open: parseDecimalString(input.candle.open),
    high: parseDecimalString(input.candle.high),
    low: parseDecimalString(input.candle.low),
    close: parseDecimalString(input.candle.close),
    volume: parseDecimalString(input.candle.volume),
    volumeUnit: 'lots',
    turnover: null,
    isClosed: input.candle.isComplete,
    quality: 'good',
    sourceRevision: null,
  };
}
