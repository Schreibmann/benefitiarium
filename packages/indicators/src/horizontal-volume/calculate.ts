import { add, compare, divide, multiply, roundToTick, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import {
  type CalculateHorizontalVolumeFromTradesInput,
  type CalculateHorizontalVolumeInput,
  HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  HORIZONTAL_VOLUME_DEFAULT_VALUE_AREA_RATIO,
  HORIZONTAL_VOLUME_MAX_LEVELS,
  HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID,
  HORIZONTAL_VOLUME_SOURCE_KIND,
  HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID,
  type HorizontalVolumeAlgorithmId,
  type HorizontalVolumeCalculation,
  type HorizontalVolumeCandle,
  type HorizontalVolumeLevel,
  type HorizontalVolumeSourceKind,
  type HorizontalVolumeTrade,
} from './types.js';

function asDecimal(value: DecimalString | string, field: string): DecimalString {
  try {
    return parseDecimalString(typeof value === 'string' ? value : String(value));
  } catch {
    throw new Error(`Invalid horizontal-volume ${field}`);
  }
}

function emptyResult(input: {
  tickSize: DecimalString;
  rowSizeInTicks: number;
  rowSize: DecimalString;
  valueAreaRatio: DecimalString;
  quality: 'EMPTY' | 'DEGENERATE';
  sourceKind: HorizontalVolumeSourceKind;
  algorithmId: HorizontalVolumeAlgorithmId;
}): HorizontalVolumeCalculation {
  return {
    levels: [],
    totalVolume: parseDecimalString('0'),
    poc: null,
    vah: null,
    val: null,
    tickSize: input.tickSize,
    rowSizeInTicks: input.rowSizeInTicks,
    rowSize: input.rowSize,
    valueAreaRatio: input.valueAreaRatio,
    sourceKind: input.sourceKind,
    quality: input.quality,
    algorithmId: input.algorithmId,
    algorithmVersion: HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  };
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

function nextPrice(price: DecimalString, step: DecimalString): DecimalString {
  return add(price, step);
}

function resolveRowSizeInTicksFromSpan(
  minLow: DecimalString | null,
  maxHigh: DecimalString | null,
  tickSize: DecimalString,
  requested: number | undefined,
): number {
  if (requested !== undefined) {
    if (!Number.isInteger(requested) || requested < 1) {
      throw new Error('rowSizeInTicks must be a positive integer');
    }
    return requested;
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

type AccLevel = {
  volume: DecimalString;
  buyVolume: DecimalString;
  sellVolume: DecimalString;
};

function finalizeLevels(
  volumeByPrice: Map<string, AccLevel>,
  totalVolume: DecimalString,
  meta: {
    tickSize: DecimalString;
    rowSizeInTicks: number;
    rowSize: DecimalString;
    valueAreaRatio: DecimalString;
    sourceKind: HorizontalVolumeSourceKind;
    algorithmId: HorizontalVolumeAlgorithmId;
  },
): HorizontalVolumeCalculation {
  if (volumeByPrice.size === 0 || compare(totalVolume, '0') === 0) {
    return emptyResult({ ...meta, quality: 'EMPTY' });
  }

  const levels: HorizontalVolumeLevel[] = [...volumeByPrice.entries()]
    .map(([price, acc]) => ({
      price: parseDecimalString(price),
      volume: acc.volume,
      buyVolume: acc.buyVolume,
      sellVolume: acc.sellVolume,
    }))
    .sort((left, right) => compare(left.price, right.price));

  if (levels.length === 1) {
    const only = levels[0];
    if (only === undefined) {
      return emptyResult({ ...meta, quality: 'DEGENERATE' });
    }
    return {
      levels,
      totalVolume,
      poc: only.price,
      vah: only.price,
      val: only.price,
      ...meta,
      quality: 'DEGENERATE',
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
  const { vah, val } = buildValueArea(levels, pocIndex, totalVolume, meta.valueAreaRatio);

  return {
    levels,
    totalVolume,
    poc,
    vah,
    val,
    ...meta,
    quality: 'ok',
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

/**
 * Pure horizontal volume from OHLCV candles (uniform H–L distribution).
 * Prefer {@link calculateHorizontalVolumeFromTrades} for exchange-true VP.
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
  let minLow: DecimalString | null = null;
  let maxHigh: DecimalString | null = null;
  for (const candle of parsed) {
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

  const rowSizeInTicks = resolveRowSizeInTicksFromSpan(
    minLow,
    maxHigh,
    tickSize,
    input.rowSizeInTicks,
  );
  const rowSize = multiply(tickSize, String(rowSizeInTicks));
  const meta = {
    tickSize,
    rowSizeInTicks,
    rowSize,
    valueAreaRatio,
    sourceKind: HORIZONTAL_VOLUME_SOURCE_KIND.ohlcvUniformApproximation,
    algorithmId: HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID,
  };

  const volumeByPrice = new Map<string, AccLevel>();
  let totalVolume = parseDecimalString('0');
  const zero = parseDecimalString('0');

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
      const previous = volumeByPrice.get(key) ?? {
        volume: zero,
        buyVolume: zero,
        sellVolume: zero,
      };
      volumeByPrice.set(key, {
        volume: add(previous.volume, share),
        buyVolume: previous.buyVolume,
        sellVolume: previous.sellVolume,
      });
      price = nextPrice(price, rowSize);
    }
    totalVolume = add(totalVolume, candle.volume);
  }

  return finalizeLevels(volumeByPrice, totalVolume, meta);
}

/**
 * True volume profile from anonymized trades (price + lots + direction).
 */
export function calculateHorizontalVolumeFromTrades(
  input: CalculateHorizontalVolumeFromTradesInput,
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

  const trades: Array<{
    price: DecimalString;
    quantity: DecimalString;
    direction: 'buy' | 'sell' | 'unspecified';
  }> = [];
  for (const trade of input.trades) {
    const price = asDecimal(trade.price, 'price');
    const quantity = asDecimal(trade.quantity, 'quantity');
    if (compare(quantity, '0') < 0) {
      throw new Error('Invalid horizontal-volume trade: quantity < 0');
    }
    if (compare(quantity, '0') === 0) {
      continue;
    }
    const direction = trade.direction ?? 'unspecified';
    trades.push({ price, quantity, direction });
  }

  let minPrice: DecimalString | null = null;
  let maxPrice: DecimalString | null = null;
  for (const trade of trades) {
    if (minPrice === null || compare(trade.price, minPrice) < 0) {
      minPrice = trade.price;
    }
    if (maxPrice === null || compare(trade.price, maxPrice) > 0) {
      maxPrice = trade.price;
    }
  }

  const rowSizeInTicks = resolveRowSizeInTicksFromSpan(
    minPrice,
    maxPrice,
    tickSize,
    input.rowSizeInTicks,
  );
  const rowSize = multiply(tickSize, String(rowSizeInTicks));
  const meta = {
    tickSize,
    rowSizeInTicks,
    rowSize,
    valueAreaRatio,
    sourceKind: HORIZONTAL_VOLUME_SOURCE_KIND.lastTrades,
    algorithmId: HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID,
  };

  const volumeByPrice = new Map<string, AccLevel>();
  let totalVolume = parseDecimalString('0');
  const zero = parseDecimalString('0');

  for (const trade of trades) {
    const priceRow = roundToTick(trade.price, rowSize, 'roundHalfUp');
    const key = String(priceRow);
    const previous = volumeByPrice.get(key) ?? {
      volume: zero,
      buyVolume: zero,
      sellVolume: zero,
    };
    const next: AccLevel = {
      volume: add(previous.volume, trade.quantity),
      buyVolume: previous.buyVolume,
      sellVolume: previous.sellVolume,
    };
    if (trade.direction === 'buy') {
      next.buyVolume = add(previous.buyVolume, trade.quantity);
    } else if (trade.direction === 'sell') {
      next.sellVolume = add(previous.sellVolume, trade.quantity);
    }
    volumeByPrice.set(key, next);
    totalVolume = add(totalVolume, trade.quantity);
  }

  return finalizeLevels(volumeByPrice, totalVolume, meta);
}

/** @deprecated Prefer calculateHorizontalVolumeFromTrades for exchange VP. */
export type { HorizontalVolumeTrade };
