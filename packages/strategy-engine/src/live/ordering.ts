import type { EngineMarketEvent } from '../types.js';

/**
 * Deterministic event order for a partition when provider sequence is absent.
 * Prefer sequence when both sides have it; otherwise eventTimestamp → candle
 * timestamp → revision → eventId.
 */
export function compareMarketEvents(a: EngineMarketEvent, b: EngineMarketEvent): number {
  const aSeq = a.sequence;
  const bSeq = b.sequence;
  if (aSeq !== undefined && bSeq !== undefined && aSeq !== bSeq) {
    return aSeq < bSeq ? -1 : 1;
  }

  if (a.eventTimestamp !== b.eventTimestamp) {
    return a.eventTimestamp < b.eventTimestamp ? -1 : 1;
  }

  if (a.candle.timestamp !== b.candle.timestamp) {
    return a.candle.timestamp < b.candle.timestamp ? -1 : 1;
  }

  if (a.candle.revision !== b.candle.revision) {
    return a.candle.revision < b.candle.revision ? -1 : 1;
  }

  if (a.eventId === b.eventId) {
    return 0;
  }
  return a.eventId < b.eventId ? -1 : 1;
}

export function sortMarketEvents(events: readonly EngineMarketEvent[]): EngineMarketEvent[] {
  return [...events].sort(compareMarketEvents);
}

/**
 * A late event arrives with a lower order than the last accepted confirmed bar
 * timestamp for the partition (excluding same-bar revisions/corrections).
 */
export function isLateConfirmedEvent(
  event: EngineMarketEvent,
  latestConfirmedCandleTimestamp: number | null,
): boolean {
  if (latestConfirmedCandleTimestamp === null) {
    return false;
  }
  if (event.kind === 'CANDLE_UPDATE') {
    return false;
  }
  if (event.candle.timestamp >= latestConfirmedCandleTimestamp) {
    return false;
  }
  return event.kind === 'CANDLE_CLOSED' || event.candle.status === 'CLOSED';
}
