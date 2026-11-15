import { parseInstrumentId } from '@moex/domain';
import {
  calculateHorizontalVolumeFromTrades,
  type HorizontalVolumeAlgorithmId,
  type HorizontalVolumeCalculation,
  type HorizontalVolumeSourceKind,
} from '@moex/indicators';
import type { ChartMarketDataDeps } from './fibonacci-pivot-service.js';

export type HorizontalVolumeLevelDto = {
  price: string;
  volume: string;
  buyVolume: string;
  sellVolume: string;
};

export type HorizontalVolumeResponseDto = {
  instrumentUid: string;
  chartTimeframe: '1m' | '5m' | '1h';
  levels: HorizontalVolumeLevelDto[];
  totalVolume: string;
  volumeUnit: 'lots';
  poc: string | null;
  vah: string | null;
  val: string | null;
  tickSize: string;
  rowSizeInTicks: number;
  rowSize: string;
  valueAreaRatio: string;
  sourceKind: HorizontalVolumeSourceKind;
  quality: HorizontalVolumeCalculation['quality'];
  algorithm: {
    id: HorizontalVolumeAlgorithmId;
    version: string;
  };
  meta: {
    requestedFrom: string;
    requestedTo: string;
    effectiveFrom: string;
    effectiveTo: string;
    tradeCount: number;
    historyTradeDays: string[];
    missingDays: string[];
    lastTradesIncluded: boolean;
    tradesSource: 'history_trades' | 'last_trades' | 'mixed';
    calculatedAt: string;
  };
};

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
  const instrumentId = parseInstrumentId(input.instrumentUid);
  const [tradesResult, spec] = await Promise.all([
    deps.marketData.getTrades({
      instrumentId,
      from: input.from,
      to: input.to,
    }),
    deps.marketData.getInstrumentSpec(input.instrumentUid),
  ]);

  const calculated = calculateHorizontalVolumeFromTrades({
    trades: tradesResult.items.map((trade) => ({
      price: trade.price,
      quantity: trade.quantity,
      direction: trade.direction,
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
      buyVolume: level.buyVolume,
      sellVolume: level.sellVolume,
    })),
    totalVolume: calculated.totalVolume,
    volumeUnit: 'lots',
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
      effectiveFrom: tradesResult.effectiveFrom,
      effectiveTo: tradesResult.effectiveTo,
      tradeCount: tradesResult.items.length,
      historyTradeDays: tradesResult.historyTradeDays,
      missingDays: tradesResult.missingDays,
      lastTradesIncluded: tradesResult.lastTradesIncluded,
      tradesSource: tradesResult.source,
      calculatedAt: new Date().toISOString(),
    },
  };
}
