import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { roundProtectiveStop } from '../features/distance.js';
import { toNumber } from '../features/math.js';
import type { EngineCandle, EngineDirection, EngineInstrumentSpec } from '../types.js';
import type { ExitReason, TradingPosition } from './types.js';

export type PartialExitPolicy = {
  /** Fraction of initial quantity per target index (sums should be <= 1). */
  fractions: number[];
  /** Move stop to break-even after this R multiple. */
  breakEvenAfterR: number;
  trailBufferAtrMultiple: number;
  timeStopBars: number;
};

export const DEFAULT_PARTIAL_EXIT_POLICY: PartialExitPolicy = {
  fractions: [0.4, 0.3, 0.3],
  breakEvenAfterR: 1,
  trailBufferAtrMultiple: 0.15,
  timeStopBars: 48,
};

export type BarExitAction =
  | {
      kind: 'CLOSE';
      quantity: number;
      fillPrice: DecimalString;
      exitReason: ExitReason;
      reasonCodes: string[];
    }
  | {
      kind: 'PARTIAL';
      quantity: number;
      fillPrice: DecimalString;
      targetIndex: number;
      targetId: string;
      exitReason: 'TAKE_PROFIT';
      reasonCodes: string[];
    }
  | {
      kind: 'UPDATE_STOP';
      nextStop: DecimalString;
      reasonCodes: string[];
    }
  | {
      kind: 'WARNING';
      reasonCodes: string[];
    };

export type EvaluateBarExitsInput = {
  position: TradingPosition;
  candle: EngineCandle;
  atr: DecimalString | string;
  instrument: EngineInstrumentSpec;
  policy?: Partial<PartialExitPolicy>;
  oppositeConfirmedSignal?: boolean;
  structureInvalidated?: boolean;
  profileAcceptanceReversed?: boolean;
  sessionBlocksHold?: boolean;
  dailyRiskBreached?: boolean;
};

function roundQtyDown(quantity: number, step: number, minQuantity: number): number {
  if (step <= 0) {
    return 0;
  }
  const rounded = Math.floor(quantity / step) * step;
  if (rounded < minQuantity) {
    return 0;
  }
  return rounded;
}

function stopHit(
  direction: EngineDirection,
  low: DecimalString,
  high: DecimalString,
  stop: DecimalString,
): boolean {
  return direction === 'LONG' ? compare(low, stop) <= 0 : compare(high, stop) >= 0;
}

function targetHit(
  direction: EngineDirection,
  low: DecimalString,
  high: DecimalString,
  target: DecimalString,
): boolean {
  return direction === 'LONG' ? compare(high, target) >= 0 : compare(low, target) <= 0;
}

function markForDirection(direction: EngineDirection, candle: EngineCandle): DecimalString {
  return direction === 'LONG' ? candle.high : candle.low;
}

function unrealizedR(position: TradingPosition, mark: DecimalString): number | null {
  const entry = position.averageEntryPrice;
  if (entry === null || compare(position.initialRiskPerUnit, '0') <= 0) {
    return null;
  }
  const move = position.direction === 'LONG' ? subtract(mark, entry) : subtract(entry, mark);
  return toNumber(divide(move, position.initialRiskPerUnit));
}

function nextUnreachedTarget(
  position: TradingPosition,
): { index: number; price: DecimalString } | null {
  for (let index = 0; index < position.targets.length; index += 1) {
    const targetId = `TP${index + 1}`;
    if (position.reachedTargets.includes(targetId)) {
      continue;
    }
    const price = position.targets[index];
    if (price === undefined) {
      continue;
    }
    return { index, price };
  }
  return null;
}

function protectiveTrailStop(input: {
  direction: EngineDirection;
  candle: EngineCandle;
  atr: DecimalString;
  tickSize: DecimalString;
  bufferMultiple: number;
}): DecimalString {
  const buffer = multiply(input.atr, String(input.bufferMultiple));
  if (input.direction === 'LONG') {
    const raw = subtract(input.candle.low, buffer);
    return roundProtectiveStop(raw, input.tickSize, 'LONG');
  }
  const raw = add(input.candle.high, buffer);
  return roundProtectiveStop(raw, input.tickSize, 'SHORT');
}

function neverWidenStop(
  direction: EngineDirection,
  current: DecimalString,
  candidate: DecimalString,
): DecimalString {
  if (direction === 'LONG') {
    return compare(candidate, current) > 0 ? candidate : current;
  }
  return compare(candidate, current) < 0 ? candidate : current;
}

/**
 * Evaluate a single closed candle against an open paper position.
 * Spec §17.3: when stop and target both tradeable in the same OHLC bar, stop wins.
 */
export function evaluateBarExits(input: EvaluateBarExitsInput): BarExitAction[] {
  const policy: PartialExitPolicy = {
    ...DEFAULT_PARTIAL_EXIT_POLICY,
    ...input.policy,
  };
  const position = input.position;
  if (
    position.status === 'CLOSED' ||
    position.status === 'CANCELLED' ||
    position.openQuantity <= 0
  ) {
    return [];
  }
  if (position.averageEntryPrice === null) {
    return [];
  }

  const actions: BarExitAction[] = [];
  const atr = parseDecimalString(String(input.atr));
  const tick = input.instrument.tickSize;
  const low = input.candle.low;
  const high = input.candle.high;

  if (input.dailyRiskBreached === true) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'RISK_LIMIT',
      reasonCodes: ['DAILY_RISK_LIMIT_REACHED'],
    });
    return actions;
  }

  if (input.sessionBlocksHold === true) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'SESSION_POLICY',
      reasonCodes: ['SESSION_ENTRY_BLOCKED'],
    });
    return actions;
  }

  const hitStop = stopHit(position.direction, low, high, position.currentStop);
  const nextTarget = nextUnreachedTarget(position);
  const hitTarget =
    nextTarget === null ? false : targetHit(position.direction, low, high, nextTarget.price);

  // Conservative ambiguity: stop before target in the same bar.
  if (hitStop && hitTarget) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: position.currentStop,
      exitReason: 'STOP_LOSS',
      reasonCodes: ['STOP_LOSS_HIT'],
    });
    return actions;
  }

  if (hitStop) {
    const trailActive = compare(position.currentStop, position.initialStop) !== 0;
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: position.currentStop,
      exitReason: trailActive ? 'TRAILING_STOP' : 'STOP_LOSS',
      reasonCodes: trailActive ? ['TRAILING_STOP_UPDATED', 'STOP_LOSS_HIT'] : ['STOP_LOSS_HIT'],
    });
    return actions;
  }

  if (hitTarget && nextTarget !== null) {
    const fraction = policy.fractions[nextTarget.index] ?? 0;
    const rawQty = position.initialQuantity * fraction;
    let qty = roundQtyDown(rawQty, input.instrument.quantityStep, input.instrument.minQuantity);
    if (qty > position.openQuantity) {
      qty = position.openQuantity;
    }
    if (qty <= 0) {
      actions.push({
        kind: 'WARNING',
        reasonCodes: ['POSITION_SIZE_BELOW_MINIMUM'],
      });
    } else if (qty >= position.openQuantity) {
      actions.push({
        kind: 'CLOSE',
        quantity: position.openQuantity,
        fillPrice: nextTarget.price,
        exitReason: 'TAKE_PROFIT',
        reasonCodes: ['TAKE_PROFIT_HIT'],
      });
      return actions;
    } else {
      actions.push({
        kind: 'PARTIAL',
        quantity: qty,
        fillPrice: nextTarget.price,
        targetIndex: nextTarget.index,
        targetId: `TP${nextTarget.index + 1}`,
        exitReason: 'TAKE_PROFIT',
        reasonCodes: ['TAKE_PROFIT_HIT'],
      });
    }
  }

  if (input.structureInvalidated === true) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'STRUCTURE_INVALIDATED',
      reasonCodes: ['STRUCTURE_INVALIDATED'],
    });
    return actions;
  }

  if (input.oppositeConfirmedSignal === true) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'OPPOSITE_CONFIRMED_SIGNAL',
      reasonCodes: ['OPPOSITE_SIGNAL_CONFIRMED'],
    });
    return actions;
  }

  if (input.profileAcceptanceReversed === true) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'PROFILE_ACCEPTANCE_REVERSED',
      reasonCodes: ['PROFILE_ACCEPTANCE_REVERSED'],
    });
    return actions;
  }

  if (position.barsOpen >= policy.timeStopBars) {
    actions.push({
      kind: 'CLOSE',
      quantity: position.openQuantity,
      fillPrice: input.candle.close,
      exitReason: 'TIME_STOP',
      reasonCodes: ['TIME_STOP_TRIGGERED'],
    });
    return actions;
  }

  const mark = markForDirection(position.direction, input.candle);
  const rNow = unrealizedR(position, mark);
  if (rNow !== null && rNow >= policy.breakEvenAfterR) {
    const entry = position.averageEntryPrice;
    let candidate = roundProtectiveStop(entry, tick, position.direction);
    const trail = protectiveTrailStop({
      direction: position.direction,
      candle: input.candle,
      atr,
      tickSize: tick,
      bufferMultiple: policy.trailBufferAtrMultiple,
    });
    candidate = neverWidenStop(position.direction, candidate, trail);
    candidate = neverWidenStop(position.direction, position.currentStop, candidate);
    if (compare(candidate, position.currentStop) !== 0) {
      actions.push({
        kind: 'UPDATE_STOP',
        nextStop: candidate,
        reasonCodes: ['TRAILING_STOP_UPDATED'],
      });
    }
  }

  return actions;
}

export function applyExitActions(input: {
  position: TradingPosition;
  actions: readonly BarExitAction[];
  pointValue: DecimalString | string;
  feePerUnit: DecimalString | string;
  timestamp: number;
}): {
  position: TradingPosition;
  closed: boolean;
  warnings: string[];
} {
  let position: TradingPosition = {
    ...input.position,
    targets: [...input.position.targets],
    reachedTargets: [...input.position.reachedTargets],
  };
  const warnings: string[] = [];
  const pointValue = parseDecimalString(String(input.pointValue));
  const feePerUnit = parseDecimalString(String(input.feePerUnit));
  const entry = position.averageEntryPrice;

  for (const action of input.actions) {
    if (action.kind === 'WARNING') {
      warnings.push(...action.reasonCodes);
      continue;
    }
    if (action.kind === 'UPDATE_STOP') {
      position = {
        ...position,
        currentStop: action.nextStop,
      };
      continue;
    }

    if (entry === null) {
      continue;
    }

    const qty = Math.min(action.quantity, position.openQuantity);
    if (qty <= 0) {
      continue;
    }

    const priceMove =
      position.direction === 'LONG'
        ? subtract(action.fillPrice, entry)
        : subtract(entry, action.fillPrice);
    const gross = multiply(multiply(priceMove, pointValue), String(qty));
    const fees = multiply(feePerUnit, String(qty));
    const net = subtract(gross, fees);

    position = {
      ...position,
      openQuantity: position.openQuantity - qty,
      realizedPnl: add(position.realizedPnl, net),
      feesPaid: add(position.feesPaid, fees),
    };

    if (action.kind === 'PARTIAL') {
      position = {
        ...position,
        reachedTargets: [...position.reachedTargets, action.targetId],
        status: position.openQuantity > 0 ? 'PARTIALLY_CLOSED' : 'CLOSED',
      };
    }

    if (action.kind === 'CLOSE' || position.openQuantity <= 0) {
      position = {
        ...position,
        openQuantity: 0,
        status: 'CLOSED',
        closedAt: input.timestamp,
        exitReason: action.exitReason,
        unrealizedPnl: parseDecimalString('0'),
      };
      return { position, closed: true, warnings };
    }
  }

  return { position, closed: false, warnings };
}
