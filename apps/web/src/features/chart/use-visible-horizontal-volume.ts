import { useEffect, useRef, useState } from 'react';
import type { ChartApiClient } from './api-client.js';
import type { ChartTimeRange, ChartXWindow } from './chart-viewport.js';
import { timeRangeFromXWindow } from './chart-viewport.js';
import type { SessionCandleRow } from './session-scale.js';
import type { ChartTimeframe, HorizontalVolumeApiResponse } from './types.js';
import { chartTimeRangeToIso, visibleVolumeFetchKey } from './visible-volume-range.js';

const VISIBLE_VOLUME_DEBOUNCE_MS = 250;

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  return err instanceof Error && err.name === 'AbortError';
}

type Args = {
  client: ChartApiClient;
  instrumentUid: string | null;
  timeframe: ChartTimeframe;
  sessionCandles: readonly SessionCandleRow[];
  xWindow: ChartXWindow;
};

/**
 * Loads tick VP for the visible wall-clock range after pan/zoom settles.
 * Skips refetch when UTC day set is unchanged; aborts in-flight requests.
 */
export function useVisibleHorizontalVolume(args: Args): HorizontalVolumeApiResponse | null {
  const { client, instrumentUid, timeframe, sessionCandles, xWindow } = args;
  const [horizontalVolume, setHorizontalVolume] = useState<HorizontalVolumeApiResponse | null>(
    null,
  );
  const lastFetchKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scopeKey = `${instrumentUid ?? ''}|${timeframe}`;

  useEffect(() => {
    lastFetchKeyRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setHorizontalVolume(null);
    // scopeKey intentionally drives reset on instrument/timeframe change.
    void scopeKey;
  }, [scopeKey]);

  useEffect(() => {
    if (instrumentUid === null || sessionCandles.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      const range: ChartTimeRange | null = timeRangeFromXWindow(sessionCandles, xWindow);
      if (range === null) {
        return;
      }

      const fetchKey = visibleVolumeFetchKey({
        instrumentUid,
        timeframe,
        range,
      });
      if (fetchKey === lastFetchKeyRef.current) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const iso = chartTimeRangeToIso(range);

      void (async () => {
        try {
          const response = await client.getHorizontalVolume({
            instrumentUid,
            timeframe,
            from: iso.from,
            to: iso.to,
            signal: controller.signal,
          });
          if (controller.signal.aborted) {
            return;
          }
          lastFetchKeyRef.current = fetchKey;
          setHorizontalVolume(response);
        } catch (err: unknown) {
          if (isAbortError(err) || controller.signal.aborted) {
            return;
          }
          console.error('Visible horizontal volume failed', err);
        }
      })();
    }, VISIBLE_VOLUME_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [client, instrumentUid, timeframe, sessionCandles, xWindow]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  return horizontalVolume;
}
