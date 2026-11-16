import type { CandleInterval, InstrumentId } from '@moex/domain';
import type { EngineDirection, StrategyId } from '../types.js';

export type SignalDedupInput = {
  instrumentId: InstrumentId;
  strategy: StrategyId;
  direction: EngineDirection;
  setupId: string;
  triggerCandleTimestamp: number;
  algorithmVersion: string;
};

/**
 * Stable deduplication key for a confirmed/candidate signal identity.
 * Spec §19.3: symbol, strategy, direction, setup ID, trigger candle, algorithm version.
 */
export function buildSignalDeduplicationKey(input: SignalDedupInput): string {
  return [
    input.instrumentId,
    input.strategy,
    input.direction,
    input.setupId,
    String(input.triggerCandleTimestamp),
    input.algorithmVersion,
  ].join('|');
}

export type ProcessedEventKeyInput = {
  eventId: string;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
};

export function buildProcessedEventRecordId(input: ProcessedEventKeyInput): string {
  return `${input.instrumentId}|${input.timeframe}|${input.eventId}`;
}
