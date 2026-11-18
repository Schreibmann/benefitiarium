import type { MarketDataProvider } from '@moex/contracts';
import type { Candle, InstrumentId } from '@moex/domain';
import { parseInstrumentId } from '@moex/domain';
import type { FavoriteRow } from '@moex/persistence';

export type FavoriteWithDayChange = FavoriteRow & {
  lastPrice: string | null;
  dayChangePct: number | null;
};

function tryInstrumentId(value: string): InstrumentId | null {
  try {
    return parseInstrumentId(value);
  } catch {
    return null;
  }
}

function parseFiniteNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeDayChange(
  candles: Candle[],
  lastPrice: string | null,
): { lastPrice: string | null; dayChangePct: number | null } {
  const sorted = [...candles].sort((left, right) => {
    if (left.timeStart < right.timeStart) {
      return -1;
    }
    if (left.timeStart > right.timeStart) {
      return 1;
    }
    return 0;
  });
  const latest = sorted.at(-1);
  if (latest === undefined) {
    return { lastPrice, dayChangePct: null };
  }

  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : undefined;
  const resolvedLast = lastPrice ?? latest.close;
  const last = parseFiniteNumber(resolvedLast);
  const baselineRaw = previous !== undefined ? previous.close : latest.open;
  const baseline = parseFiniteNumber(baselineRaw);
  if (last === null || baseline === null || baseline === 0) {
    return { lastPrice: resolvedLast, dayChangePct: null };
  }

  return {
    lastPrice: resolvedLast,
    dayChangePct: roundPct(((last - baseline) / baseline) * 100),
  };
}

/**
 * Attach last price and day change % (vs previous session close, or today's open).
 * Failures per instrument are swallowed — field stays null.
 */
export async function withFavoritesDayChange(
  items: FavoriteRow[],
  marketData: MarketDataProvider,
): Promise<FavoriteWithDayChange[]> {
  if (items.length === 0) {
    return [];
  }

  const ids: InstrumentId[] = [];
  const idByUid = new Map<string, InstrumentId>();
  for (const item of items) {
    const id = tryInstrumentId(item.instrumentUid);
    if (id !== null) {
      ids.push(id);
      idByUid.set(item.instrumentUid, id);
    }
  }

  const lastByUid = new Map<string, string>();
  if (ids.length > 0) {
    try {
      const prices = await marketData.getLastPrices(ids);
      for (const price of prices) {
        lastByUid.set(price.instrumentId, price.last);
      }
    } catch {
      // Keep favorites list usable even if last prices fail.
    }
  }

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  return Promise.all(
    items.map(async (item): Promise<FavoriteWithDayChange> => {
      const instrumentId = idByUid.get(item.instrumentUid);
      const lastPrice = lastByUid.get(item.instrumentUid) ?? null;
      if (instrumentId === undefined) {
        return { ...item, lastPrice, dayChangePct: null };
      }
      try {
        const candles = await marketData.getCandles({
          instrumentId,
          interval: '1d',
          from,
          to,
        });
        const change = computeDayChange(candles.items, lastPrice);
        return { ...item, lastPrice: change.lastPrice, dayChangePct: change.dayChangePct };
      } catch {
        return { ...item, lastPrice, dayChangePct: null };
      }
    }),
  );
}
