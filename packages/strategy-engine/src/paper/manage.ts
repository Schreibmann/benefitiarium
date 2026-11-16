import type { DecimalString } from '@moex/domain';
import type { EngineCandle, EngineInstrumentSpec } from '../types.js';
import { buildTradeEvaluation, markUnrealizedPnl, updateExcursions } from './evaluation.js';
import { applyExitActions, evaluateBarExits, type PartialExitPolicy } from './exits.js';
import { type OpenPaperPositionInput, openPaperPosition } from './open-position.js';
import type { PositionLifecycleEvent, TradeEvaluation, TradingPosition } from './types.js';

export type ManagePaperPositionsInput = {
  openPositions: readonly TradingPosition[];
  /** New confirmed entries to open this bar (after signal confirmation). */
  entriesToOpen?: readonly OpenPaperPositionInput[];
  candle: EngineCandle;
  atr: DecimalString | string;
  instrument: EngineInstrumentSpec;
  feePerUnit: DecimalString | string;
  timestamp: number;
  policy?: Partial<PartialExitPolicy>;
  oppositeConfirmedSignal?: boolean;
  structureInvalidated?: boolean;
  profileAcceptanceReversed?: boolean;
  sessionBlocksHold?: boolean;
  dailyRiskBreached?: boolean;
};

export type ManagePaperPositionsResult = {
  positions: TradingPosition[];
  events: PositionLifecycleEvent[];
  evaluations: TradeEvaluation[];
};

function toUpdatedEvent(
  position: TradingPosition,
  timestamp: number,
  reasonCodes: string[],
): PositionLifecycleEvent {
  return {
    id: `${position.id}:UPDATED:${timestamp}`,
    positionId: position.id,
    signalId: position.signalId,
    eventType: 'POSITION_UPDATED',
    instrumentId: position.instrumentId,
    timeframe: position.timeframe,
    strategy: position.strategy,
    direction: position.direction,
    timestamp,
    status: position.status,
    reasonCodes,
    payload: {
      openQuantity: position.openQuantity,
      currentStop: String(position.currentStop),
      realizedPnl: String(position.realizedPnl),
    },
    algorithmVersion: position.algorithmVersion,
    configVersion: position.configVersion,
  };
}

function toClosedEvent(position: TradingPosition, timestamp: number): PositionLifecycleEvent {
  return {
    id: `${position.id}:CLOSED:${timestamp}`,
    positionId: position.id,
    signalId: position.signalId,
    eventType: 'POSITION_CLOSED',
    instrumentId: position.instrumentId,
    timeframe: position.timeframe,
    strategy: position.strategy,
    direction: position.direction,
    timestamp,
    status: 'CLOSED',
    reasonCodes: position.exitReason === null ? [] : [position.exitReason],
    payload: {
      exitReason: position.exitReason,
      realizedPnl: String(position.realizedPnl),
      openQuantity: 0,
    },
    algorithmVersion: position.algorithmVersion,
    configVersion: position.configVersion,
  };
}

function toWarningEvent(
  position: TradingPosition,
  timestamp: number,
  reasonCodes: string[],
): PositionLifecycleEvent {
  return {
    id: `${position.id}:WARN:${timestamp}:${reasonCodes.join(',')}`,
    positionId: position.id,
    signalId: position.signalId,
    eventType: 'POSITION_EXIT_WARNING',
    instrumentId: position.instrumentId,
    timeframe: position.timeframe,
    strategy: position.strategy,
    direction: position.direction,
    timestamp,
    status: position.status,
    reasonCodes,
    payload: {},
    algorithmVersion: position.algorithmVersion,
    configVersion: position.configVersion,
  };
}

/**
 * Open new paper entries and advance existing positions on a confirmed candle.
 */
export function managePaperPositions(input: ManagePaperPositionsInput): ManagePaperPositionsResult {
  const positions: TradingPosition[] = [];
  const events: PositionLifecycleEvent[] = [];
  const evaluations: TradeEvaluation[] = [];

  for (const entry of input.entriesToOpen ?? []) {
    const opened = openPaperPosition(entry);
    positions.push(opened.position);
    events.push(opened.event);
  }

  for (const existing of input.openPositions) {
    if (existing.status === 'CLOSED' || existing.status === 'CANCELLED') {
      positions.push(existing);
      continue;
    }

    let position = updateExcursions(existing, input.candle);
    position = {
      ...position,
      barsOpen: position.barsOpen + 1,
    };
    position = markUnrealizedPnl(position, input.candle.close);

    const actions = evaluateBarExits({
      position,
      candle: input.candle,
      atr: input.atr,
      instrument: input.instrument,
      ...(input.policy === undefined ? {} : { policy: input.policy }),
      ...(input.oppositeConfirmedSignal === undefined
        ? {}
        : { oppositeConfirmedSignal: input.oppositeConfirmedSignal }),
      ...(input.structureInvalidated === undefined
        ? {}
        : { structureInvalidated: input.structureInvalidated }),
      ...(input.profileAcceptanceReversed === undefined
        ? {}
        : { profileAcceptanceReversed: input.profileAcceptanceReversed }),
      ...(input.sessionBlocksHold === undefined
        ? {}
        : { sessionBlocksHold: input.sessionBlocksHold }),
      ...(input.dailyRiskBreached === undefined
        ? {}
        : { dailyRiskBreached: input.dailyRiskBreached }),
    });

    if (actions.length === 0) {
      positions.push(position);
      continue;
    }

    const applied = applyExitActions({
      position,
      actions,
      pointValue: position.pointValue,
      feePerUnit: input.feePerUnit,
      timestamp: input.timestamp,
    });

    for (const warning of applied.warnings) {
      events.push(toWarningEvent(applied.position, input.timestamp, [warning]));
    }

    if (applied.closed) {
      events.push(toClosedEvent(applied.position, input.timestamp));
      evaluations.push(buildTradeEvaluation(applied.position));
      positions.push(applied.position);
      continue;
    }

    const reasonCodes = actions.flatMap((action) =>
      action.kind === 'UPDATE_STOP' || action.kind === 'PARTIAL' || action.kind === 'WARNING'
        ? action.reasonCodes
        : action.reasonCodes,
    );
    events.push(toUpdatedEvent(applied.position, input.timestamp, reasonCodes));
    positions.push(applied.position);
  }

  return { positions, events, evaluations };
}
