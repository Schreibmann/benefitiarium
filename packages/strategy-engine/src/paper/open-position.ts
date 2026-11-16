import { multiply, subtract } from '@moex/decimal';
import type { CandleInterval, InstrumentId } from '@moex/domain';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { absDecimal } from '../features/math.js';
import type { EngineDirection, StrategyId } from '../types.js';
import { type PaperFillConfig, simulatePaperFill } from './fill-simulator.js';
import type { PositionLifecycleEvent, TradingPosition } from './types.js';

export type OpenPaperPositionInput = {
  positionId: string;
  signalId: string;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  strategy: StrategyId;
  direction: EngineDirection;
  timestamp: number;
  referencePrice: DecimalString | string;
  tickSize: DecimalString | string;
  stop: DecimalString | string;
  targets: readonly (DecimalString | string)[];
  quantity: number;
  pointValue: DecimalString | string;
  feePerUnit: DecimalString | string;
  algorithmVersion: string;
  configVersion: string;
  fillConfig?: Partial<PaperFillConfig>;
};

export type OpenPaperPositionResult = {
  position: TradingPosition;
  event: PositionLifecycleEvent;
};

/**
 * Open a paper position from a confirmed signal using a conservative fill.
 */
export function openPaperPosition(input: OpenPaperPositionInput): OpenPaperPositionResult {
  if (input.quantity <= 0) {
    throw new Error('quantity must be > 0');
  }

  const fill = simulatePaperFill({
    direction: input.direction,
    referencePrice: input.referencePrice,
    tickSize: input.tickSize,
    ...(input.fillConfig === undefined ? {} : { config: input.fillConfig }),
  });

  const stop = parseDecimalString(String(input.stop));
  const entry = fill.fillPrice;
  const initialRiskPerUnit = absDecimal(subtract(entry, stop));
  const feesPaid = multiply(String(input.feePerUnit), String(input.quantity));

  const position: TradingPosition = {
    id: input.positionId,
    signalId: input.signalId,
    instrumentId: input.instrumentId,
    timeframe: input.timeframe,
    strategy: input.strategy,
    direction: input.direction,
    status: 'OPEN',
    openedAt: input.timestamp,
    closedAt: null,
    averageEntryPrice: entry,
    initialQuantity: input.quantity,
    openQuantity: input.quantity,
    realizedPnl: parseDecimalString('0'),
    unrealizedPnl: parseDecimalString('0'),
    initialStop: stop,
    currentStop: stop,
    initialRiskPerUnit,
    targets: input.targets.map((target) => parseDecimalString(String(target))),
    reachedTargets: [],
    exitReason: null,
    feesPaid,
    slippagePaid: fill.slippagePaid,
    pointValue: parseDecimalString(String(input.pointValue)),
    mfePrice: entry,
    maePrice: entry,
    barsOpen: 0,
    configVersion: input.configVersion,
    algorithmVersion: input.algorithmVersion,
  };

  const event: PositionLifecycleEvent = {
    id: `${input.positionId}:OPENED`,
    positionId: position.id,
    signalId: position.signalId,
    eventType: 'POSITION_OPENED',
    instrumentId: position.instrumentId,
    timeframe: position.timeframe,
    strategy: position.strategy,
    direction: position.direction,
    timestamp: input.timestamp,
    status: 'OPEN',
    reasonCodes: fill.reasonCodes,
    payload: {
      fillPrice: String(entry),
      quantity: input.quantity,
      stop: String(stop),
    },
    algorithmVersion: input.algorithmVersion,
    configVersion: input.configVersion,
  };

  return { position, event };
}
