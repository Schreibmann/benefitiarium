import type { CandleInterval, DecimalString, InstrumentId } from '@moex/domain';
import type { ReasonCode } from './reason-codes.js';

export type EngineDirection = 'LONG' | 'SHORT';

export type EngineCandleStatus = 'OPEN' | 'CLOSED' | 'CORRECTED';

export type EngineMarketEventKind = 'CANDLE_UPDATE' | 'CANDLE_CLOSED' | 'CANDLE_CORRECTED';

export type EngineSessionProfile = 'CONTINUOUS' | 'SESSION_BASED' | 'CUSTOM';

export type VolumeProfileQualityLabel = 'EXACT' | 'APPROXIMATE' | 'INSUFFICIENT';

export type VolumeProfileScope =
  | 'CURRENT_SESSION'
  | 'PREVIOUS_SESSION'
  | 'ROLLING'
  | 'ANCHORED'
  | 'EXPLICIT_WINDOW';

export type EngineLifecycleState =
  | 'SETUP_APPROACHING'
  | 'SETUP_FORMING'
  | 'SIGNAL_CANDIDATE'
  | 'SIGNAL_CONFIRMED'
  | 'SIGNAL_INVALIDATED'
  | 'SIGNAL_EXPIRED'
  | 'POSITION_OPENED'
  | 'POSITION_UPDATED'
  | 'POSITION_EXIT_CANDIDATE'
  | 'POSITION_CLOSED';

export type StrategyId =
  | 'TREND_PULLBACK'
  | 'BREAKOUT_RETEST'
  | 'FAILED_BREAKOUT'
  | 'RANGE_REVERSAL';

export type EngineCandle = {
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  /** UTC epoch ms: candle open. */
  timestamp: number;
  /** UTC epoch ms: expected candle close. */
  closeTimestamp: number;
  open: DecimalString;
  high: DecimalString;
  low: DecimalString;
  close: DecimalString;
  volume: DecimalString;
  status: EngineCandleStatus;
  /** Monotonic per (instrumentId, timeframe, timestamp). */
  revision: number;
  sourceEventId: string;
};

export type EngineInstrumentSpec = {
  instrumentId: InstrumentId;
  exchange: string;
  tickSize: DecimalString;
  lotSize: number;
  pointValue: DecimalString;
  minQuantity: number;
  quantityStep: number;
  quoteCurrency: string | null;
  priceCurrency: string | null;
  tradingCalendarId: string | null;
  sessionProfile: EngineSessionProfile;
};

export type EngineMarketEvent = {
  eventId: string;
  sequence?: number;
  receivedAt: number;
  eventTimestamp: number;
  kind: EngineMarketEventKind;
  candle: EngineCandle;
};

export type ValidationIssue = {
  reasonCode: ReasonCode;
  message: string;
  path?: string;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

export type QuarantinedEvent = {
  event: EngineMarketEvent;
  issues: ValidationIssue[];
  quarantinedAt: number;
};

export type PivotLevelId = 'P' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3' | string;

export type EnginePivotLevel = {
  id: PivotLevelId;
  price: DecimalString;
};

export type EnginePivotSet = {
  method: 'FIBONACCI_PIVOT_POINTS';
  version: string;
  anchorPeriod: CandleInterval;
  anchorStart: number;
  anchorEnd: number;
  calculationTimestamp: number;
  sourceOHLC: {
    high: DecimalString;
    low: DecimalString;
    close: DecimalString;
  };
  levels: EnginePivotLevel[];
  isComplete: boolean;
  quality: 'ok' | 'DEGENERATE_RANGE';
};

export type EngineVolumeProfileBin = {
  price: DecimalString;
  volume: DecimalString;
  buyVolume: DecimalString;
  sellVolume: DecimalString;
};

export type EngineVolumeProfile = {
  scope: VolumeProfileScope;
  from: number;
  to: number;
  qualityLabel: VolumeProfileQualityLabel;
  reasonCodes: ReasonCode[];
  algorithmId: string;
  algorithmVersion: string;
  poc: DecimalString | null;
  vah: DecimalString | null;
  val: DecimalString | null;
  bins: EngineVolumeProfileBin[];
  totalVolume: DecimalString;
  isDeveloping: boolean;
};

export type CandleBarKey = string;

export function candleBarKey(
  instrumentId: InstrumentId,
  timeframe: CandleInterval,
  timestamp: number,
): CandleBarKey {
  return `${instrumentId}|${timeframe}|${timestamp}`;
}
