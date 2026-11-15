import type { ChartXWindow } from './chart-viewport.js';
import type { HorizontalVolumeApiResponse, VolumeProfileSegment } from './types.js';

const HISTOGRAM_WIDTH_RATIO = 0.2;

function toFiniteNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function inClosedRange(price: number, low: number | null, high: number | null): boolean {
  if (low === null || high === null) {
    return false;
  }
  return price >= low && price <= high;
}

/**
 * Maps API horizontal-volume levels into right-anchored buy/sell rects
 * (sell left, buy right) plus POC / VAH / VAL guides spanning the visible x window.
 */
export function toVolumeProfileSegments(
  response: HorizontalVolumeApiResponse,
  xWindow: ChartXWindow,
): VolumeProfileSegment[] {
  const windowStart = Math.min(xWindow.start, xWindow.end);
  const windowEnd = Math.max(xWindow.start, xWindow.end);
  const span = Math.max(windowEnd - windowStart, 1);
  const maxBarWidth = span * HISTOGRAM_WIDTH_RATIO;
  const rowSize = Number(response.rowSize);
  const halfRow = Number.isFinite(rowSize) && rowSize > 0 ? rowSize / 2 : 0;
  const val = toFiniteNumber(response.val);
  const vah = toFiniteNumber(response.vah);

  let maxVolume = 0;
  for (const level of response.levels) {
    const volume = Number(level.volume);
    if (Number.isFinite(volume) && volume > maxVolume) {
      maxVolume = volume;
    }
  }

  const segments: VolumeProfileSegment[] = [];

  if (maxVolume > 0) {
    for (const level of response.levels) {
      const price = Number(level.price);
      const volume = Number(level.volume);
      const buyVolume = Number(level.buyVolume);
      const sellVolume = Number(level.sellVolume);
      if (!Number.isFinite(price) || !Number.isFinite(volume) || volume <= 0) {
        continue;
      }
      const safeBuy = Number.isFinite(buyVolume) && buyVolume > 0 ? buyVolume : 0;
      const safeSell = Number.isFinite(sellVolume) && sellVolume > 0 ? sellVolume : 0;
      const totalW = (volume / maxVolume) * maxBarWidth;
      const buyW = volume > 0 ? (safeBuy / volume) * totalW : 0;
      const sellW = volume > 0 ? (safeSell / volume) * totalW : 0;
      const y1 = price - halfRow;
      const y2 = price + halfRow;
      const inValueArea = inClosedRange(price, val, vah);

      if (sellW > 0) {
        segments.push({
          id: `hv-sell:${level.price}`,
          kind: 'sell',
          x1: windowEnd - totalW,
          x2: windowEnd - totalW + sellW,
          y1,
          y2,
          inValueArea,
        });
      }
      if (buyW > 0) {
        segments.push({
          id: `hv-buy:${level.price}`,
          kind: 'buy',
          x1: windowEnd - buyW,
          x2: windowEnd,
          y1,
          y2,
          inValueArea,
        });
      }
      // Unspecified remainder (volume not tagged buy/sell) fills toward the right edge.
      const tagged = sellW + buyW;
      if (tagged + 1e-12 < totalW) {
        segments.push({
          id: `hv-buy-rest:${level.price}`,
          kind: 'buy',
          x1: windowEnd - totalW + sellW,
          x2: windowEnd - buyW,
          y1,
          y2,
          inValueArea,
        });
      }
    }
  }

  const guides: Array<{ kind: 'poc' | 'vah' | 'val'; raw: string | null }> = [
    { kind: 'poc', raw: response.poc },
    { kind: 'vah', raw: response.vah },
    { kind: 'val', raw: response.val },
  ];
  for (const guide of guides) {
    const y = toFiniteNumber(guide.raw);
    if (y === null) {
      continue;
    }
    segments.push({
      id: `hv-guide:${guide.kind}`,
      kind: guide.kind,
      x1: windowStart,
      x2: windowEnd,
      y1: y,
      y2: y,
      inValueArea: guide.kind !== 'poc',
    });
  }

  return segments;
}
