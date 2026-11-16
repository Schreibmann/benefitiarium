import { add, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';
import { absDecimal, maxDecimal, weightedAverage } from './math.js';

export const DEFAULT_ATR_PERIOD = 14;

export type AtrPoint = {
  timestamp: number;
  closeTimestamp: number;
  tr: DecimalString;
  atr: DecimalString | null;
};

/**
 * True Range for candle `t` given previous close.
 * TR = max(H-L, |H-Cprev|, |L-Cprev|)
 */
export function trueRange(
  candle: EngineCandle,
  previousClose: DecimalString | null,
): DecimalString {
  const highLow = subtract(candle.high, candle.low);
  if (previousClose === null) {
    return highLow;
  }
  return maxDecimal(
    highLow,
    absDecimal(subtract(candle.high, previousClose)),
    absDecimal(subtract(candle.low, previousClose)),
  );
}

/**
 * Wilder ATR series over ordered closed candles.
 * Initial ATR = mean of first `period` TR values; then
 * ATR_t = ((n-1)*ATR_{t-1} + TR_t) / n
 */
export function computeConfirmedAtrSeries(
  candles: readonly EngineCandle[],
  period: number = DEFAULT_ATR_PERIOD,
): AtrPoint[] {
  if (!(Number.isInteger(period) && period > 0)) {
    throw new Error('ATR period must be a positive integer');
  }

  const closed = candles.filter(isClosedCandleEligibleForConfirmation);
  const points: AtrPoint[] = [];
  const trWindow: DecimalString[] = [];
  let previousClose: DecimalString | null = null;
  let previousAtr: DecimalString | null = null;

  for (const candle of closed) {
    const tr = trueRange(candle, previousClose);
    previousClose = candle.close;

    let atr: DecimalString | null = null;
    if (previousAtr === null) {
      trWindow.push(tr);
      if (trWindow.length === period) {
        atr = weightedAverage(trWindow);
        previousAtr = atr;
      }
    } else {
      const n = parseDecimalString(String(period));
      atr = divide(add(multiply(subtract(n, '1'), previousAtr), tr), n);
      previousAtr = atr;
    }

    points.push({
      timestamp: candle.timestamp,
      closeTimestamp: candle.closeTimestamp,
      tr,
      atr,
    });
  }

  return points;
}

export function latestConfirmedAtr(
  candles: readonly EngineCandle[],
  period: number = DEFAULT_ATR_PERIOD,
): DecimalString | null {
  const series = computeConfirmedAtrSeries(candles, period);
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point?.atr !== null && point?.atr !== undefined) {
      return point.atr;
    }
  }
  return null;
}
