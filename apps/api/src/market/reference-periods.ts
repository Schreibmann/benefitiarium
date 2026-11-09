import { createHash } from 'node:crypto';
import type { Candle } from '@moex/domain';
import type { ReferencePeriodOHLC, ReferenceTimeframe, TradingPeriod } from '@moex/indicators';

/**
 * Treat complete native DAY/WEEK candles as trading periods (UI-slice calendar policy).
 * Period bounds come from candle timeStart/timeEnd (half-open).
 */
export function referencePeriodsFromCandles(input: {
  instrumentUid: string;
  timeframe: ReferenceTimeframe;
  candles: readonly Candle[];
}): ReferencePeriodOHLC[] {
  const complete = input.candles
    .filter((candle) => candle.isClosed)
    .slice()
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));

  return complete.map((candle) => {
    const start = new Date(candle.timeStart);
    const end = new Date(candle.timeEnd);
    const periodId = `${input.timeframe}:${candle.timeStart}`;
    const sourceHash = createHash('sha256')
      .update(
        JSON.stringify({
          periodId,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          interval: candle.interval,
          provider: candle.provider,
        }),
      )
      .digest('hex')
      .slice(0, 16);

    return {
      instrumentUid: input.instrumentUid,
      timeframe: input.timeframe,
      periodId,
      start,
      end,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      isComplete: true as const,
      source: {
        provider: candle.provider,
        candleSource: 'EXCHANGE',
        interval: candle.interval,
        aggregationMethod: 'NATIVE' as const,
        sourceHash,
      },
    };
  });
}

export function tradingPeriodsFromReference(
  sources: readonly ReferencePeriodOHLC[],
): TradingPeriod[] {
  return sources.map((source) => ({
    periodId: `valid:${source.periodId}`,
    start: source.start,
    end: source.end,
  }));
}
