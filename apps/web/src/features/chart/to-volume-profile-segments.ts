import type { ChartXWindow } from './chart-viewport.js';
import type { HorizontalVolumeApiResponse, VolumeProfileSegment } from './types.js';

const HISTOGRAM_WIDTH_RATIO = 0.18;

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

/**
 * Maps API horizontal-volume levels into right-anchored histogram links
 * plus POC / VAH / VAL guides spanning the visible x window.
 */
export function toVolumeProfileSegments(
  response: HorizontalVolumeApiResponse,
  xWindow: ChartXWindow,
): VolumeProfileSegment[] {
  const windowStart = Math.min(xWindow.start, xWindow.end);
  const windowEnd = Math.max(xWindow.start, xWindow.end);
  const span = Math.max(windowEnd - windowStart, 1);
  const maxBarWidth = span * HISTOGRAM_WIDTH_RATIO;

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
      if (!Number.isFinite(price) || !Number.isFinite(volume) || volume <= 0) {
        continue;
      }
      const width = (volume / maxVolume) * maxBarWidth;
      segments.push({
        id: `hv-bar:${level.price}`,
        kind: 'histogram',
        x1: windowEnd - width,
        x2: windowEnd,
        y1: price,
        y2: price,
      });
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
    });
  }

  return segments;
}
