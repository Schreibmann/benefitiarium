import type { CandleInterval } from '@moex/domain';
import { parseInstrumentId } from '@moex/domain';
import {
  calculateHorizontalVolume,
  type HORIZONTAL_VOLUME_ALGORITHM_ID,
  type HORIZONTAL_VOLUME_ALGORITHM_VERSION,
  type HORIZONTAL_VOLUME_SOURCE_KIND,
  type HorizontalVolumeCalculation,
} from '@moex/indicators';
import type { ChartMarketDataDeps } from './fibonacci-pivot-service.js';
import { getChartCandles } from './fibonacci-pivot-service.js';

export type HorizontalVolumeLevelDto = {
  price: string;
  volume: string;
};

export type HorizontalVolumeResponseDto = {
  instrumentUid: string;
  chartTimeframe: '1m' | '5m' | '1h';
  levels: HorizontalVolumeLevelDto[];
  totalVolume: string;
  volumeUnit: string;
  poc: string | null;
  vah: string | null;
  val: string | null;
  tickSize: string;
  rowSizeInTicks: number;
  rowSize: string;
  valueAreaRatio: string;
  sourceKind: typeof HORIZONTAL_VOLUME_SOURCE_KIND;
  quality: HorizontalVolumeCalculation['quality'];
  algorithm: {
    id: typeof HORIZONTAL_VOLUME_ALGORITHM_ID;
    version: typeof HORIZONTAL_VOLUME_ALGORITHM_VERSION;
  };
  meta: {
    requestedFrom: string;
    requestedTo: string;
    candleCount: number;
    calculatedAt: string;
  };
};

const CHART_INTERVALS = new Set<CandleInterval>(['1m', '5m', '1h']);

export async function getHorizontalVolume(
  deps: ChartMarketDataDeps,
  input: {
    instrumentUid: string;
    chartTimeframe: '1m' | '5m' | '1h';
    from: Date;
    to: Date;
    rowSizeInTicks?: number;
    valueAreaRatio?: string;
  },
): Promise<HorizontalVolumeResponseDto> {
  if (!CHART_INTERVALS.has(input.chartTimeframe)) {
    throw new Error('timeframe must be 1m, 5m, or 1h');
  }

  parseInstrumentId(input.instrumentUid);
  const [candles, spec] = await Promise.all([
    getChartCandles(deps, {
      instrumentUid: input.instrumentUid,
      interval: input.chartTimeframe,
      from: input.from,
      to: input.to,
    }),
    deps.marketData.getInstrumentSpec(input.instrumentUid),
  ]);

  const volumeUnit = candles[0]?.volumeUnit ?? 'lots';
  const calculated = calculateHorizontalVolume({
    candles: candles.map((candle) => ({
      high: candle.high,
      low: candle.low,
      volume: candle.volume,
    })),
    tickSize: spec.minPriceIncrement,
    ...(input.rowSizeInTicks !== undefined ? { rowSizeInTicks: input.rowSizeInTicks } : {}),
    ...(input.valueAreaRatio !== undefined ? { valueAreaRatio: input.valueAreaRatio } : {}),
  });

  return {
    instrumentUid: input.instrumentUid,
    chartTimeframe: input.chartTimeframe,
    levels: calculated.levels.map((level) => ({
      price: level.price,
      volume: level.volume,
    })),
    totalVolume: calculated.totalVolume,
    volumeUnit,
    poc: calculated.poc,
    vah: calculated.vah,
    val: calculated.val,
    tickSize: calculated.tickSize,
    rowSizeInTicks: calculated.rowSizeInTicks,
    rowSize: calculated.rowSize,
    valueAreaRatio: calculated.valueAreaRatio,
    sourceKind: calculated.sourceKind,
    quality: calculated.quality,
    algorithm: {
      id: calculated.algorithmId,
      version: calculated.algorithmVersion,
    },
    meta: {
      requestedFrom: input.from.toISOString(),
      requestedTo: input.to.toISOString(),
      candleCount: candles.length,
      calculatedAt: new Date().toISOString(),
    },
  };
}
