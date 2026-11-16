import { add, compare, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { analyzePriceAction, strongestDirectionalEvidence } from '../analyzers/price-action.js';
import { computeFallbackRvol } from '../features/candle-features.js';
import { normalizedDistanceToLevel } from '../features/distance.js';
import { maxDecimal, toNumber } from '../features/math.js';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';
import type { SetupUpdateResult, TradingSetup } from './types.js';

export type BreakoutRetestConfig = {
  retestWindowBars: number;
  minBreakoutRvol: number;
  maxBreakoutExtensionAtr: number;
  breakoutBufferAtrMultiple: number;
  invalidationBufferAtrMultiple: number;
};

export const DEFAULT_BREAKOUT_RETEST_CONFIG: BreakoutRetestConfig = {
  retestWindowBars: 10,
  minBreakoutRvol: 1.2,
  maxBreakoutExtensionAtr: 1,
  breakoutBufferAtrMultiple: 0.05,
  invalidationBufferAtrMultiple: 0.05,
};

export type BreakoutRetestState = {
  breakoutAt: number | null;
  breakoutCandleTimestamp: number | null;
  boundary: DecimalString;
};

export type BreakoutRetestInput = {
  instrumentId: TradingSetup['instrumentId'];
  setupTimeframe: TradingSetup['setupTimeframe'];
  direction: TradingSetup['direction'];
  now: number;
  candles: readonly EngineCandle[];
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  boundary: DecimalString | string;
  existing?: TradingSetup | null;
  state?: BreakoutRetestState | null;
  config?: Partial<BreakoutRetestConfig>;
};

export type BreakoutRetestResult = {
  update: SetupUpdateResult | null;
  state: BreakoutRetestState;
};

function bufferFromAtr(
  atr: DecimalString,
  tickSize: DecimalString,
  multiple: number,
): DecimalString {
  return maxDecimal(multiply(tickSize, '2'), multiply(atr, String(multiple)));
}

/**
 * BREAKOUT_RETEST detector — breakout → retest → confirmation lifecycle.
 */
export function updateBreakoutRetestSetup(input: BreakoutRetestInput): BreakoutRetestResult {
  const config: BreakoutRetestConfig = {
    ...DEFAULT_BREAKOUT_RETEST_CONFIG,
    ...input.config,
  };
  const closed = input.candles.filter(isClosedCandleEligibleForConfirmation);
  const candle = closed[closed.length - 1];
  const boundary = parseDecimalString(String(input.boundary));
  const atr = parseDecimalString(String(input.atr));
  const tick = parseDecimalString(String(input.tickSize));
  const breakoutBuffer = bufferFromAtr(atr, tick, config.breakoutBufferAtrMultiple);
  const invalidationBuffer = bufferFromAtr(atr, tick, config.invalidationBufferAtrMultiple);

  let state: BreakoutRetestState = input.state ?? {
    breakoutAt: null,
    breakoutCandleTimestamp: null,
    boundary,
  };
  state = { ...state, boundary };

  if (candle === undefined) {
    return { update: null, state };
  }

  const previousStatus = input.existing?.status ?? 'WATCHING';
  const rvol = computeFallbackRvol(candle, closed);

  const breakoutLevel =
    input.direction === 'LONG' ? add(boundary, breakoutBuffer) : subtract(boundary, breakoutBuffer);
  const isBreakoutClose =
    input.direction === 'LONG'
      ? compare(candle.close, breakoutLevel) > 0
      : compare(candle.close, breakoutLevel) < 0;

  if (state.breakoutAt === null && isBreakoutClose) {
    if (rvol !== null && rvol < config.minBreakoutRvol) {
      return { update: null, state };
    }
    const extension = toNumber(normalizedDistanceToLevel(candle.close, boundary, atr, tick));
    if (extension > config.maxBreakoutExtensionAtr) {
      return { update: null, state };
    }
    state = {
      breakoutAt: input.now,
      breakoutCandleTimestamp: candle.timestamp,
      boundary,
    };
  }

  const breakoutCandleTimestamp = state.breakoutCandleTimestamp;
  if (state.breakoutAt === null || breakoutCandleTimestamp === null) {
    return { update: null, state };
  }

  const barsSinceBreakout = closed.filter(
    (item) => item.timestamp > breakoutCandleTimestamp,
  ).length;

  if (barsSinceBreakout > config.retestWindowBars) {
    const setup = ensureSetup(input, state, {
      status: 'EXPIRED',
      reasonCodes: ['SETUP_EXPIRED'],
    });
    return {
      update: {
        setup,
        transitioned: previousStatus !== 'EXPIRED',
        previousStatus,
      },
      state,
    };
  }

  const invalidated =
    input.direction === 'LONG'
      ? compare(candle.close, subtract(boundary, invalidationBuffer)) < 0
      : compare(candle.close, add(boundary, invalidationBuffer)) > 0;

  if (invalidated) {
    const setup = ensureSetup(input, state, {
      status: 'INVALIDATED',
      reasonCodes: ['SETUP_INVALIDATED'],
    });
    return {
      update: {
        setup,
        transitioned: previousStatus !== 'INVALIDATED',
        previousStatus,
      },
      state,
    };
  }

  const touchedRetest =
    input.direction === 'LONG'
      ? compare(candle.low, add(boundary, breakoutBuffer)) <= 0 &&
        compare(candle.close, subtract(boundary, invalidationBuffer)) >= 0
      : compare(candle.high, subtract(boundary, breakoutBuffer)) >= 0 &&
        compare(candle.close, add(boundary, invalidationBuffer)) <= 0;

  const evidence = analyzePriceAction({
    candles: closed,
    breakoutLevel: boundary,
    breakoutDirection: input.direction,
    breakoutBuffer,
    tickSize: tick,
  });
  const confirmation = strongestDirectionalEvidence(evidence, input.direction);

  let status: TradingSetup['status'] = 'APPROACHING';
  const reasonCodes = ['BREAKOUT_CONFIRMED'];
  if (touchedRetest) {
    status = 'FORMING';
    reasonCodes.push('RETEST_CONFIRMED');
  }
  if (touchedRetest && confirmation !== null && barsSinceBreakout >= 1) {
    status = 'TRIGGERED';
    reasonCodes.push('SETUP_PRICE_ACTION_CONFIRMED');
  }

  const setup = ensureSetup(input, state, {
    status,
    reasonCodes,
    referencePrice: status === 'TRIGGERED' ? candle.close : null,
  });

  return {
    update: {
      setup,
      transitioned: previousStatus !== status || input.existing == null,
      previousStatus,
    },
    state,
  };
}

function ensureSetup(
  input: BreakoutRetestInput,
  state: BreakoutRetestState,
  options: {
    status: TradingSetup['status'];
    reasonCodes: string[];
    referencePrice?: DecimalString | null;
  },
): TradingSetup {
  const base: TradingSetup = input.existing ?? {
    id: `BREAKOUT_RETEST:${input.instrumentId}:${input.direction}:${state.boundary}:${state.breakoutAt}`,
    instrumentId: input.instrumentId,
    strategy: 'BREAKOUT_RETEST',
    direction: input.direction,
    setupTimeframe: input.setupTimeframe,
    createdAt: state.breakoutAt ?? input.now,
    updatedAt: input.now,
    status: 'WATCHING',
    zoneId: null,
    triggerLevel: state.boundary,
    invalidationLevel: state.boundary,
    referencePrice: null,
    referenceSwingIds: [],
    referenceProfileIds: [],
    referencePivotSetIds: [],
    reasonCodes: [],
    expiresAt: null,
  };

  return {
    ...base,
    updatedAt: input.now,
    status: options.status,
    triggerLevel: state.boundary,
    invalidationLevel: state.boundary,
    referencePrice: options.referencePrice ?? base.referencePrice,
    reasonCodes: options.reasonCodes,
  };
}
