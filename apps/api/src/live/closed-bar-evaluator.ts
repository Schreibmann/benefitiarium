import type { CanonicalStreamCandle } from '@moex/broker-tinvest';
import type { LiveSignalDirection } from '@moex/persistence';

export type LiveSignalCandidate = {
  instrumentUid: string;
  ticker: string | null;
  intervalCode: string;
  eventKey: string;
  direction: LiveSignalDirection;
  status: 'accepted' | 'rejected';
  referencePrice: string;
  reasons: string[];
  features: Record<string, unknown>;
  sourceEventTime: string;
};

/**
 * Pluggable closed-bar decision port. Full TSE strategy wiring plugs in here.
 * Default returns null (no spam); inject for tests or future engine adapters.
 */
export type ClosedBarEvaluator = (
  candle: CanonicalStreamCandle,
) => LiveSignalCandidate | null | Promise<LiveSignalCandidate | null>;

export function createNullClosedBarEvaluator(): ClosedBarEvaluator {
  return () => null;
}

/**
 * Deterministic test/dev evaluator: accepts CLOSE_EMITTED bars as hold monitors.
 * Useful until full strategy-engine live loop is wired.
 */
export function createCloseEmittedHoldEvaluator(): ClosedBarEvaluator {
  return (candle) => {
    if (candle.barState !== 'CLOSE_EMITTED' && candle.barState !== 'FINALIZED_BY_SCHEDULE') {
      return null;
    }
    return {
      instrumentUid: candle.instrumentUid,
      ticker: candle.ticker,
      intervalCode: candle.interval,
      eventKey: `close:${candle.eventHash}`,
      direction: 'hold',
      status: 'accepted',
      referencePrice: candle.close,
      reasons: ['CLOSED_BAR_MONITOR'],
      features: {
        barState: candle.barState,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volumeLots: candle.volumeLots,
      },
      sourceEventTime: candle.timeStart,
    };
  };
}
