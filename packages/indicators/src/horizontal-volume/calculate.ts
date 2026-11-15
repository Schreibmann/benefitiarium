import { add, compare, divide, multiply, roundToTick, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import {
  type CalculateHorizontalVolumeInput,
  HORIZONTAL_VOLUME_ALGORITHM_ID,
  HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  HORIZONTAL_VOLUME_DEFAULT_VALUE_AREA_RATIO,
  HORIZONTAL_VOLUME_MAX_LEVELS,
  HORIZONTAL_VOLUME_SOURCE_KIND,
  type HorizontalVolumeCalculation,
  type HorizontalVolumeCandle,
  type HorizontalVolumeLevel,
} from './types.js';

function asDecimal(value: DecimalString | string, field: string): DecimalString {
  try {
    return parseDecimalString(typeof value === 'string' ? value : String(value));
  } catch {
    throw new Error(`Invalid horizontal-volume ${field}`);
  }
}

function emptyResult(
  tickSize: DecimalString,
  rowSizeInTicks: number,
  rowSize: DecimalString,
  valueAreaRatio: DecimalString,
  quality: 'EMPTY' | 'DEGENERATE',
): HorizontalVolumeCalculation {
  return {
    levels: [],
    totalVolume: parseDecimalString('0'),
    poc: null,
    vah: null,
    val: null,
    tickSize,
    rowSizeInTicks,
    rowSize,
    valueAreaRatio,
    sourceKind: HORIZONTAL_VOLUME_SOURCE_KIND,
    quality,
    algorithmId: HORIZONTAL_VOLUME_ALGORITHM_ID,
    algorithmVersion: HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  };
}

function parseCandle(candle: HorizontalVolumeCandle): {
  high: DecimalString;
  low: DecimalString;
  volume: DecimalString;
} {
  const high = asDecimal(candle.high, 'high');
  const low = asDecimal(candle.low, 'low');
  const volume = asDecimal(candle.volume, 'volume');
  if (compare(high, low) < 0) {
    throw new Error('Invalid horizontal-volume candle: high < low');
  }
  if (compare(volume, '0') < 0) {
    throw new Error('Invalid horizontal-volume candle: volume < 0');
  }
  return { high, low, volume };
}

function ticksBetweenInclusive(
  low: DecimalString,
  high: DecimalString,
  step: DecimalString,
): number {
  if (compare(high, low) < 0) {
    return 0;
  }
  const span = divide(subtract(high, low), step);
  const asNumber = Number(span);
  if (!Number.isFinite(asNumber) || asNumber < 0) {
    throw new Error('Invalid horizontal-volume price span');
  }
  const count = Math.floor(asNumber) + 1;
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('Invalid horizontal-volume level count');
  }
  return count;
}

function resolveRowSizeInTicks(
  candles: readonly { high: DecimalString; low: DecimalString; volume: DecimalString }[],
  tickSize: DecimalString,
  requested: number | undefined,
): number {
  if (requested !== undefined) {
    if (!Number.isInteger(requested) || requested < 1) {
      throw new Error('rowSizeInTicks must be a positive integer');
    }
    return requested;
  }

  let minLow: DecimalString | null = null;
  let maxHigh: DecimalString | null = null;
  for (const candle of candles) {
    if (compare(candle.volume, '0') === 0) {
      continue;
    }
    if (minLow === null || compare(candle.low, minLow) < 0) {
      minLow = candle.low;
    }
    if (maxHigh === null || compare(candle.high, maxHigh) > 0) {
      maxHigh = candle.high;
    }
  }
  if (minLow === null || maxHigh === null) {
    return 1;
  }

  const flooredLow = roundToTick(minLow, tickSize, 'roundFloor');
  const ceiledHigh = roundToTick(maxHigh, tickSize, 'roundCeil');
  const tickCount = ticksBetweenInclusive(flooredLow, ceiledHigh, tickSize);
  if (tickCount <= HORIZONTAL_VOLUME_MAX_LEVELS) {
    return 1;
  }
  return Math.ceil(tickCount / HORIZONTAL_VOLUME_MAX_LEVELS);
}

function nextPrice(price: DecimalString, step: DecimalString): DecimalString {
  return add(price, step);
}

function buildValueArea(
  levels: readonly HorizontalVolumeLevel[],
  pocIndex: number,
  totalVolume: DecimalString,
  valueAreaRatio: DecimalString,
): { vah: DecimalString; val: DecimalString } {
  const target = multiply(totalVolume, valueAreaRatio);
  let cumulative = levels[pocIndex]?.volume ?? parseDecimalString('0');
  let lowIndex = pocIndex;
  let highIndex = pocIndex;

  while (compare(cumulative, target) < 0 && (lowIndex > 0 || highIndex < levels.length - 1)) {
    const below = lowIndex > 0 ? (levels[lowIndex - 1]?.volume ?? parseDecimalString('0')) : null;
    const above =
      highIndex < levels.length - 1
        ? (levels[highIndex + 1]?.volume ?? parseDecimalString('0'))
        : null;

    if (below !== null && above !== null) {
      if (compare(above, below) >= 0) {
        highIndex += 1;
        cumulative = add(cumulative, above);
      } else {
        lowIndex -= 1;
        cumulative = add(cumulative, below);
      }
      continue;
    }
    if (above !== null) {
      highIndex += 1;
      cumulative = add(cumulative, above);
      continue;
    }
    if (below !== null) {
      lowIndex -= 1;
      cumulative = add(cumulative, below);
      continue;
    }
    break;
  }

  const val = levels[lowIndex]?.price;
  const vah = levels[highIndex]?.price;
  if (val === undefined || vah === undefined) {
    throw new Error('Value area indices out of range');
  }
  return { vah, val };
}

/**
 * Pure horizontal volume (volume profile) from OHLCV candles.
 * Distributes each bar's volume uniformly across tick/row prices in [low, high].
 * Not exchange-true volume-at-price — use GetLastTrades when available.
 */
export function calculateHorizontalVolume(
  input: CalculateHorizontalVolumeInput,
): HorizontalVolumeCalculation {
  const tickSize = asDecimal(input.tickSize, 'tickSize');
  if (compare(tickSize, '0') <= 0) {
    throw new Error('tickSize must be positive');
  }

  const valueAreaRatio = asDecimal(
    input.valueAreaRatio ?? HORIZONTAL_VOLUME_DEFAULT_VALUE_AREA_RATIO,
    'valueAreaRatio',
  );
  if (compare(valueAreaRatio, '0') <= 0 || compare(valueAreaRatio, '1') > 0) {
    throw new Error('valueAreaRatio must be in (0, 1]');
  }

  const parsed = input.candles.map(parseCandle);
  const rowSizeInTicks = resolveRowSizeInTicks(parsed, tickSize, input.rowSizeInTicks);
  const rowSize = multiply(tickSize, String(rowSizeInTicks));

  const volumeByPrice = new Map<string, DecimalString>();
  let totalVolume = parseDecimalString('0');

  for (const candle of parsed) {
    if (compare(candle.volume, '0') === 0) {
      continue;
    }

    const lowRow = roundToTick(candle.low, rowSize, 'roundFloor');
    const highRow = roundToTick(candle.high, rowSize, 'roundCeil');
    const levelCount = ticksBetweenInclusive(lowRow, highRow, rowSize);
    const share = divide(candle.volume, String(levelCount));

    let price = lowRow;
    for (let i = 0; i < levelCount; i += 1) {
      const key = String(price);
      const previous = volumeByPrice.get(key) ?? parseDecimalString('0');
      volumeByPrice.set(key, add(previous, share));
      price = nextPrice(price, rowSize);
    }
    totalVolume = add(totalVolume, candle.volume);
  }

  if (volumeByPrice.size === 0 || compare(totalVolume, '0') === 0) {
    return emptyResult(tickSize, rowSizeInTicks, rowSize, valueAreaRatio, 'EMPTY');
  }

  const levels: HorizontalVolumeLevel[] = [...volumeByPrice.entries()]
    .map(([price, volume]) => ({
      price: parseDecimalString(price),
      volume,
    }))
    .sort((left, right) => compare(left.price, right.price));

  if (levels.length === 1) {
    const only = levels[0];
    if (only === undefined) {
      return emptyResult(tickSize, rowSizeInTicks, rowSize, valueAreaRatio, 'DEGENERATE');
    }
    return {
      levels,
      totalVolume,
      poc: only.price,
      vah: only.price,
      val: only.price,
      tickSize,
      rowSizeInTicks,
      rowSize,
      valueAreaRatio,
      sourceKind: HORIZONTAL_VOLUME_SOURCE_KIND,
      quality: 'DEGENERATE',
      algorithmId: HORIZONTAL_VOLUME_ALGORITHM_ID,
      algorithmVersion: HORIZONTAL_VOLUME_ALGORITHM_VERSION,
    };
  }

  let pocIndex = 0;
  let pocVolume = levels[0]?.volume ?? parseDecimalString('0');
  for (let i = 1; i < levels.length; i += 1) {
    const level = levels[i];
    if (level === undefined) {
      continue;
    }
    if (compare(level.volume, pocVolume) > 0) {
      pocVolume = level.volume;
      pocIndex = i;
    }
  }

  const poc = levels[pocIndex]?.price ?? null;
  const { vah, val } = buildValueArea(levels, pocIndex, totalVolume, valueAreaRatio);

  return {
    levels,
    totalVolume,
    poc,
    vah,
    val,
    tickSize,
    rowSizeInTicks,
    rowSize,
    valueAreaRatio,
    sourceKind: HORIZONTAL_VOLUME_SOURCE_KIND,
    quality: 'ok',
    algorithmId: HORIZONTAL_VOLUME_ALGORITHM_ID,
    algorithmVersion: HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  };
}
