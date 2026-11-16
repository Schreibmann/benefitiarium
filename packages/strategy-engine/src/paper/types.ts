import type { CandleInterval, DecimalString, InstrumentId } from '@moex/domain';
import type { EngineDirection, StrategyId } from '../types.js';

export type PositionStatus = 'PENDING_ENTRY' | 'OPEN' | 'PARTIALLY_CLOSED' | 'CLOSED' | 'CANCELLED';

export type ExitReason =
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'STRUCTURE_INVALIDATED'
  | 'OPPOSITE_CONFIRMED_SIGNAL'
  | 'PROFILE_ACCEPTANCE_REVERSED'
  | 'TIME_STOP'
  | 'RISK_LIMIT'
  | 'SESSION_POLICY'
  | 'MANUAL_PAPER_CLOSE';

export type TradingPosition = {
  id: string;
  signalId: string;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  strategy: StrategyId;
  direction: EngineDirection;
  status: PositionStatus;
  openedAt: number | null;
  closedAt: number | null;
  averageEntryPrice: DecimalString | null;
  initialQuantity: number;
  openQuantity: number;
  realizedPnl: DecimalString;
  unrealizedPnl: DecimalString;
  initialStop: DecimalString;
  currentStop: DecimalString;
  /** Initial 1R distance |entry - initialStop|. */
  initialRiskPerUnit: DecimalString;
  targets: DecimalString[];
  reachedTargets: string[];
  exitReason: ExitReason | null;
  feesPaid: DecimalString;
  slippagePaid: DecimalString;
  pointValue: DecimalString;
  /** Extreme favorable excursion price since open. */
  mfePrice: DecimalString | null;
  /** Extreme adverse excursion price since open. */
  maePrice: DecimalString | null;
  barsOpen: number;
  configVersion: string;
  algorithmVersion: string;
};

export type TradeEvaluation = {
  positionId: string;
  signalId: string;
  instrumentId: InstrumentId;
  strategy: StrategyId;
  direction: EngineDirection;
  openedAt: number;
  closedAt: number;
  timeInTradeMs: number;
  barsOpen: number;
  netPnl: DecimalString;
  rMultiple: number | null;
  mfeR: number | null;
  maeR: number | null;
  exitReason: ExitReason;
  hitStopBeforeTarget: boolean;
  reachedTargetIds: string[];
  feesPaid: DecimalString;
  slippagePaid: DecimalString;
  qualityFlags: string[];
};

export type PositionLifecycleEventType =
  | 'POSITION_OPENED'
  | 'POSITION_UPDATED'
  | 'POSITION_EXIT_WARNING'
  | 'POSITION_CLOSED';

export type PositionLifecycleEvent = {
  id: string;
  positionId: string;
  signalId: string;
  eventType: PositionLifecycleEventType;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  strategy: StrategyId;
  direction: EngineDirection;
  timestamp: number;
  status: PositionStatus;
  reasonCodes: string[];
  payload: Readonly<Record<string, string | number | boolean | null>>;
  algorithmVersion: string;
  configVersion: string;
};
