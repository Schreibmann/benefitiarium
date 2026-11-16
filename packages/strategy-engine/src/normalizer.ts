import { candleBarKey, type EngineMarketEvent, type QuarantinedEvent } from './types.js';
import { validateOhlcv } from './validate.js';

export type NormalizeMarketEventResult =
  | { status: 'accepted'; event: EngineMarketEvent }
  | { status: 'duplicate'; eventId: string }
  | { status: 'quarantined'; quarantined: QuarantinedEvent };

export type MarketEventNormalizerState = {
  seenEventIds: Set<string>;
  latestRevisionByBar: Map<string, number>;
};

export function createMarketEventNormalizerState(): MarketEventNormalizerState {
  return {
    seenEventIds: new Set(),
    latestRevisionByBar: new Map(),
  };
}

/**
 * Validates OHLCV, enforces eventId idempotency, and monotonic revision per bar key.
 * Does not invent sequence IDs when the provider does not supply them.
 */
export function normalizeMarketEvent(
  state: MarketEventNormalizerState,
  event: EngineMarketEvent,
  quarantinedAt: number = Date.now(),
): NormalizeMarketEventResult {
  if (state.seenEventIds.has(event.eventId)) {
    return { status: 'duplicate', eventId: event.eventId };
  }

  const ohlcv = validateOhlcv(event.candle);
  if (!ohlcv.ok) {
    return {
      status: 'quarantined',
      quarantined: {
        event,
        issues: ohlcv.issues,
        quarantinedAt,
      },
    };
  }

  const barKey = candleBarKey(
    event.candle.instrumentId,
    event.candle.timeframe,
    event.candle.timestamp,
  );
  const previousRevision = state.latestRevisionByBar.get(barKey);

  if (previousRevision !== undefined && event.candle.revision < previousRevision) {
    return {
      status: 'quarantined',
      quarantined: {
        event,
        issues: [
          {
            reasonCode: 'DATA_REVISION_NON_MONOTONIC',
            message: `revision ${event.candle.revision} is less than previous ${previousRevision}`,
            path: 'candle.revision',
          },
        ],
        quarantinedAt,
      },
    };
  }

  if (previousRevision !== undefined && event.candle.revision === previousRevision) {
    return {
      status: 'quarantined',
      quarantined: {
        event,
        issues: [
          {
            reasonCode: 'DATA_DUPLICATE_EVENT',
            message: `revision ${event.candle.revision} already applied for bar ${barKey}`,
            path: 'candle.revision',
          },
        ],
        quarantinedAt,
      },
    };
  }

  state.seenEventIds.add(event.eventId);
  state.latestRevisionByBar.set(barKey, event.candle.revision);

  return { status: 'accepted', event };
}
