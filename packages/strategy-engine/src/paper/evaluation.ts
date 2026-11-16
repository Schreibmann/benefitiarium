import { compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { toNumber } from '../features/math.js';
import type { EngineCandle } from '../types.js';
import type { TradeEvaluation, TradingPosition } from './types.js';

/**
 * Update MFE/MAE extreme prices from a candle's high/low.
 */
export function updateExcursions(position: TradingPosition, candle: EngineCandle): TradingPosition {
  if (position.averageEntryPrice === null) {
    return position;
  }
  if (position.direction === 'LONG') {
    const mfe =
      position.mfePrice === null || compare(candle.high, position.mfePrice) > 0
        ? candle.high
        : position.mfePrice;
    const mae =
      position.maePrice === null || compare(candle.low, position.maePrice) < 0
        ? candle.low
        : position.maePrice;
    return { ...position, mfePrice: mfe, maePrice: mae };
  }
  const mfe =
    position.mfePrice === null || compare(candle.low, position.mfePrice) < 0
      ? candle.low
      : position.mfePrice;
  const mae =
    position.maePrice === null || compare(candle.high, position.maePrice) > 0
      ? candle.high
      : position.maePrice;
  return { ...position, mfePrice: mfe, maePrice: mae };
}

function excursionR(
  position: TradingPosition,
  extreme: DecimalString | null,
  favorable: boolean,
): number | null {
  const entry = position.averageEntryPrice;
  if (entry === null || extreme === null || compare(position.initialRiskPerUnit, '0') <= 0) {
    return null;
  }
  const move = position.direction === 'LONG' ? subtract(extreme, entry) : subtract(entry, extreme);
  const r = toNumber(divide(move, position.initialRiskPerUnit));
  if (favorable) {
    return r;
  }
  return -Math.abs(r);
}

/**
 * Build an immutable trade evaluation for a closed paper position.
 */
export function buildTradeEvaluation(position: TradingPosition): TradeEvaluation {
  if (position.status !== 'CLOSED' || position.openedAt === null || position.closedAt === null) {
    throw new Error('Trade evaluation requires a closed position with open/close timestamps');
  }
  if (position.exitReason === null) {
    throw new Error('Closed position missing exitReason');
  }

  const entry = position.averageEntryPrice;
  let rMultiple: number | null = null;
  if (entry !== null && compare(position.initialRiskPerUnit, '0') > 0) {
    // Net PnL / (initialRisk * initialQty * pointValue) approximated via realized / risk budget unit
    const riskBudget = multiply(
      multiply(position.initialRiskPerUnit, position.pointValue),
      String(position.initialQuantity),
    );
    if (compare(riskBudget, '0') > 0) {
      rMultiple = toNumber(divide(position.realizedPnl, riskBudget));
    }
  }

  const hitStopBeforeTarget =
    position.exitReason === 'STOP_LOSS' || position.exitReason === 'TRAILING_STOP';

  const qualityFlags: string[] = [];
  if (position.reachedTargets.length > 0 && hitStopBeforeTarget) {
    qualityFlags.push('PARTIAL_THEN_STOP');
  }
  if (position.reachedTargets.length === 0 && position.exitReason === 'TAKE_PROFIT') {
    qualityFlags.push('FULL_TARGET_EXIT');
  }

  return {
    positionId: position.id,
    signalId: position.signalId,
    instrumentId: position.instrumentId,
    strategy: position.strategy,
    direction: position.direction,
    openedAt: position.openedAt,
    closedAt: position.closedAt,
    timeInTradeMs: position.closedAt - position.openedAt,
    barsOpen: position.barsOpen,
    netPnl: position.realizedPnl,
    rMultiple,
    mfeR: excursionR(position, position.mfePrice, true),
    maeR: excursionR(position, position.maePrice, false),
    exitReason: position.exitReason,
    hitStopBeforeTarget,
    reachedTargetIds: [...position.reachedTargets],
    feesPaid: position.feesPaid,
    slippagePaid: position.slippagePaid,
    qualityFlags,
  };
}

export function markUnrealizedPnl(
  position: TradingPosition,
  markPrice: DecimalString | string,
): TradingPosition {
  const entry = position.averageEntryPrice;
  if (entry === null || position.openQuantity <= 0) {
    return { ...position, unrealizedPnl: parseDecimalString('0') };
  }
  const mark = parseDecimalString(String(markPrice));
  const move = position.direction === 'LONG' ? subtract(mark, entry) : subtract(entry, mark);
  const unrealized = multiply(multiply(move, position.pointValue), String(position.openQuantity));
  return { ...position, unrealizedPnl: unrealized };
}
