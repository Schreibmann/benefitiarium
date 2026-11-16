import type { CandleInterval, InstrumentId } from '@moex/domain';

/** Stable processing partition: one actor / lock key per instrument+timeframe. */
export type PartitionKey = string;

export function partitionKey(instrumentId: InstrumentId, timeframe: CandleInterval): PartitionKey {
  return `${instrumentId}|${timeframe}`;
}

export function parsePartitionKey(key: PartitionKey): {
  instrumentId: string;
  timeframe: string;
} {
  const separator = key.indexOf('|');
  if (separator <= 0 || separator === key.length - 1) {
    throw new Error(`Invalid partition key: ${key}`);
  }
  return {
    instrumentId: key.slice(0, separator),
    timeframe: key.slice(separator + 1),
  };
}
