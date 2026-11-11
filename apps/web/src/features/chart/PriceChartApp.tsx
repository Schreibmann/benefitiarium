import { useStore } from '@nanostores/react';
import { Chart } from '@tanstack/charts/react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { type ChartApiClient, createChartApiClient } from './api-client';
import {
  buildPriceChartDefinition,
  type ChartTimeRange,
  type ChartXWindow,
  clampXWindow,
  defaultSessionXWindow,
  sessionXExtent,
  timeRangeFromXWindow,
  xWindowFromTimeRange,
} from './build-chart-definition';
import './chart.css';
import {
  findContractInCatalog,
  findTickerInFamilies,
  firstNearTicker,
  instrumentFromContract,
  pickTickerForCategory,
  shouldRefreshAfterCatalog,
} from './chart-instrument';
import {
  familiesForCategory,
  futuresCatalogPersistent,
  futuresCatalogStatus,
  refreshFuturesCatalog,
} from './futures-catalog-store';
import { toSessionCandles } from './session-scale';
import { toPivotSegments } from './to-pivot-segments';
import type {
  CandleRow,
  ChartTimeframe,
  FuturesListCategory,
  InstrumentLookup,
  PivotSegment,
} from './types';
import { useChartViewportGestures } from './use-chart-viewport-gestures';
import {
  type LiveCandleEvent,
  upsertLiveCandle,
  useLiveCandleSubscription,
} from './use-live-candle-subscription';

type Props = {
  client?: ChartApiClient;
  initialTicker?: string;
};

const CATEGORY_OPTIONS: Array<{ value: FuturesListCategory; label: string }> = [
  { value: 'commodity', label: 'Товарные' },
  { value: 'equity_index', label: 'Индексные' },
  { value: 'currency', label: 'Валютные' },
  { value: 'share', label: 'На акции' },
];

function isChartTimeframe(value: string): value is ChartTimeframe {
  return value === '1m' || value === '5m' || value === '1h';
}

function defaultRange(timeframe: ChartTimeframe): { from: string; to: string } {
  const to = new Date();
  const lookbackMs =
    timeframe === '1m'
      ? 1 * 24 * 60 * 60 * 1000
      : timeframe === '5m'
        ? 3 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  const from = new Date(to.getTime() - lookbackMs);
  return { from: from.toISOString(), to: to.toISOString() };
}

function updateChartPath(ticker: string): void {
  const path = `/charts/${encodeURIComponent(ticker)}`;
  window.history.pushState({}, '', path);
}

function formatCurrentPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toFixed(0);
  }
  if (abs >= 10) {
    return value.toFixed(2);
  }
  if (abs >= 1) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
}

export function PriceChartApp(props: Props) {
  const client = useMemo(() => props.client ?? createChartApiClient(), [props.client]);
  const initialTicker = props.initialTicker ?? 'NG-12.26';
  const persistedCatalog = useStore(futuresCatalogPersistent);
  const catalogStatus = useStore(futuresCatalogStatus);
  const [ticker, setTicker] = useState(initialTicker);
  const [category, setCategory] = useState<FuturesListCategory>('commodity');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('5m');
  const [instrument, setInstrument] = useState<InstrumentLookup | null>(null);
  const [candles, setCandles] = useState<CandleRow[]>([]);
  const [pivots, setPivots] = useState<PivotSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xWindow, setXWindow] = useState<ChartXWindow>({ start: -0.5, end: 0.5 });
  const [plotWidth, setPlotWidth] = useState(0);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const viewportOwnerRef = useRef<string | null>(null);
  const pendingTimeRangeRef = useRef<ChartTimeRange | null>(null);
  const historyFallbackRequestedRef = useRef(false);

  const families = useMemo(
    () => familiesForCategory(persistedCatalog.categories, category),
    [persistedCatalog.categories, category],
  );

  const listLoading = catalogStatus.status === 'loading';
  const listRefreshing = catalogStatus.status === 'refreshing';
  const listError = catalogStatus.error;

  const loadHistorical = useEffectEvent(
    async (lookedUp: InstrumentLookup, nextTimeframe: ChartTimeframe) => {
      const range = defaultRange(nextTimeframe);
      const [candleRows, pivotResponse] = await Promise.all([
        client.getCandles({
          instrumentUid: lookedUp.instrumentUid,
          interval: nextTimeframe,
          from: range.from,
          to: range.to,
        }),
        client.getFibonacciPivots({
          instrumentUid: lookedUp.instrumentUid,
          timeframe: nextTimeframe,
          from: range.from,
          to: range.to,
        }),
      ]);
      setCandles(candleRows);
      const sessionCandles = toSessionCandles(candleRows);
      setPivots(toPivotSegments(pivotResponse, sessionCandles));
    },
  );

  const refresh = useEffectEvent(
    async (
      nextTicker: string,
      nextTimeframe: ChartTimeframe,
      options?: { preserveViewport?: boolean },
    ) => {
      setLoading(true);
      setError(null);
      historyFallbackRequestedRef.current = false;
      try {
        const catalogContract = findContractInCatalog(
          futuresCatalogPersistent.get().categories,
          nextTicker,
        );
        const lookedUp =
          catalogContract !== null
            ? instrumentFromContract(catalogContract)
            : await client.lookupByTicker(nextTicker);

        if (options?.preserveViewport === true) {
          pendingTimeRangeRef.current = timeRangeFromXWindow(toSessionCandles(candles), xWindow);
        } else {
          pendingTimeRangeRef.current = null;
          viewportOwnerRef.current = null;
        }

        setInstrument(lookedUp);
        const matched = findTickerInFamilies(families, lookedUp.ticker);
        if (matched !== null) {
          setTicker(matched);
        }
        // Stream connects as soon as instrumentUid is set. Historical REST seeds
        // the chart and remains the fallback when the live subscription fails.
        await loadHistorical(lookedUp, nextTimeframe);
      } catch (err: unknown) {
        setInstrument(null);
        setCandles([]);
        setPivots([]);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    },
  );

  useEffect(() => {
    void (async () => {
      const cachedFamilies = familiesForCategory(
        futuresCatalogPersistent.get().categories,
        'commodity',
      );
      const cachedTicker = pickTickerForCategory(cachedFamilies, initialTicker);
      setTicker(cachedTicker);
      updateChartPath(cachedTicker);
      const earlyRefreshStarted = cachedFamilies.length > 0;
      if (earlyRefreshStarted) {
        void refresh(cachedTicker, '5m');
      }
      try {
        await refreshFuturesCatalog(client);
      } catch {
        // Status atom already holds the error when cache was empty.
      }
      const nextFamilies = familiesForCategory(
        futuresCatalogPersistent.get().categories,
        'commodity',
      );
      const nextTicker = pickTickerForCategory(nextFamilies, cachedTicker);
      setTicker(nextTicker);
      updateChartPath(nextTicker);
      if (
        shouldRefreshAfterCatalog({
          earlyRefreshStarted,
          cachedTicker,
          nextTicker,
        })
      ) {
        void refresh(nextTicker, '5m');
      }
    })();
  }, [client, initialTicker]);

  const sessionCandles = useMemo(() => toSessionCandles(candles), [candles]);
  const xExtent = useMemo(() => sessionXExtent(sessionCandles.length), [sessionCandles.length]);

  useEffect(() => {
    if (sessionCandles.length === 0) {
      return;
    }
    const owner = instrument?.instrumentUid ?? null;
    if (owner !== viewportOwnerRef.current) {
      viewportOwnerRef.current = owner;
      pendingTimeRangeRef.current = null;
      setXWindow(defaultSessionXWindow(sessionCandles.length, Number.POSITIVE_INFINITY));
      return;
    }
    const pending = pendingTimeRangeRef.current;
    if (pending !== null) {
      pendingTimeRangeRef.current = null;
      const remapped = xWindowFromTimeRange(sessionCandles, pending);
      setXWindow(
        remapped ?? defaultSessionXWindow(sessionCandles.length, Number.POSITIVE_INFINITY),
      );
      return;
    }
    setXWindow((prev) => clampXWindow(prev, xExtent));
  }, [sessionCandles, instrument?.instrumentUid, xExtent]);

  useEffect(() => {
    const el = plotRef.current;
    if (el === null || candles.length === 0) {
      return;
    }
    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) {
        setPlotWidth(next);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [candles.length]);

  useChartViewportGestures(plotRef, {
    enabled: candles.length > 0,
    xWindow,
    xExtent,
    onXWindowChange: setXWindow,
  });

  const onLiveCandle = useEffectEvent((event: LiveCandleEvent) => {
    setCandles((prev) => upsertLiveCandle(prev, event));
  });

  const live = useLiveCandleSubscription({
    instrumentUid: instrument?.instrumentUid ?? null,
    interval: timeframe,
    enabledByUser: instrument !== null,
    onCandleEvent: onLiveCandle,
  });

  useEffect(() => {
    if (instrument === null || historyFallbackRequestedRef.current) {
      return;
    }
    const streamFailed = live.status === 'REJECTED' || live.error !== null;
    if (!streamFailed) {
      return;
    }
    historyFallbackRequestedRef.current = true;
    void (async () => {
      try {
        setLoading(true);
        await loadHistorical(instrument, timeframe);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load historical candles');
      } finally {
        setLoading(false);
      }
    })();
  }, [instrument, live.status, live.error, timeframe]);

  const definition = useMemo(
    () =>
      buildPriceChartDefinition({
        candles: sessionCandles,
        pivots,
        xWindow,
      }),
    [sessionCandles, pivots, xWindow],
  );

  const selectedInstrumentValue =
    findTickerInFamilies(families, ticker) ?? firstNearTicker(families) ?? '';

  const currentPrice = candles.length > 0 ? candles[candles.length - 1]?.Close : undefined;
  const title = instrument !== null ? `${instrument.ticker} · ${instrument.name}` : 'Price chart';

  return (
    <main className="price-chart">
      <header className="price-chart__header">
        <div>
          <h1 className="price-chart__title">
            <span>{title}</span>
            {currentPrice !== undefined ? (
              <span className="price-chart__price">{formatCurrentPrice(currentPrice)}</span>
            ) : null}
          </h1>
          <p>
            <a href="/">Home</a>
            {' · '}
            <a href="/admin/sandbox">Sandbox Admin</a>
          </p>
        </div>
        <div className="price-chart__controls">
          <label>
            Категория
            <select
              value={category}
              aria-label="Futures category"
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value !== 'commodity' &&
                  value !== 'equity_index' &&
                  value !== 'currency' &&
                  value !== 'share'
                ) {
                  return;
                }
                setCategory(value);
                const nextFamilies = familiesForCategory(persistedCatalog.categories, value);
                const nextTicker = pickTickerForCategory(nextFamilies, ticker);
                setTicker(nextTicker);
                updateChartPath(nextTicker);
                void refresh(nextTicker, timeframe);
              }}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Инструмент
            <select
              value={selectedInstrumentValue}
              aria-label="Futures instrument"
              disabled={families.length === 0}
              onChange={(event) => {
                const nextTicker = event.target.value;
                if (nextTicker.length === 0) {
                  return;
                }
                setTicker(nextTicker);
                updateChartPath(nextTicker);
                void refresh(nextTicker, timeframe);
              }}
            >
              {families.length === 0 ? <option value="">Нет контрактов</option> : null}
              {families.map((family) => (
                <optgroup
                  key={family.family}
                  label={
                    family.underlyingAssetName !== null && family.underlyingAssetName.length > 0
                      ? `${family.family} · ${family.underlyingAssetName}`
                      : family.family
                  }
                >
                  {family.contracts.map((contract) => (
                    <option key={contract.instrumentUid} value={contract.ticker}>
                      {contract.ticker} · {contract.role}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Timeframe
            <select
              value={timeframe}
              aria-label="Chart timeframe"
              onChange={(event) => {
                const value = event.target.value;
                if (!isChartTimeframe(value)) {
                  return;
                }
                setTimeframe(value);
                void refresh(ticker, value, { preserveViewport: true });
              }}
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="1h">1h</option>
            </select>
          </label>
          <button
            type="button"
            disabled={sessionCandles.length === 0}
            onClick={() =>
              setXWindow(defaultSessionXWindow(sessionCandles.length, Number.POSITIVE_INFINITY))
            }
          >
            Reset zoom
          </button>
        </div>
      </header>

      {listError ? <p className="price-chart__error">{listError}</p> : null}
      {listLoading ? <p className="price-chart__meta">Loading futures list…</p> : null}
      {listRefreshing ? <p className="price-chart__meta">Updating futures list…</p> : null}

      {error ? <p className="price-chart__error">{error}</p> : null}
      {live.error ? (
        <p className="price-chart__error">
          Live: {live.error.code} — {live.error.message}
        </p>
      ) : null}

      <div className="price-chart__canvas">
        {loading ? <p className="price-chart__meta">Loading candles…</p> : null}
        {candles.length === 0 && !loading ? (
          <p className="price-chart__meta">
            No candles yet. Pick an instrument (API needs a T-Invest token).
          </p>
        ) : null}
        {candles.length > 0 ? (
          <div ref={plotRef} className="price-chart__plot-host">
            <Chart
              definition={definition}
              ariaLabel={`${instrument?.ticker ?? ticker} ${timeframe} candlestick chart with Fibonacci pivots`}
              height={520}
              {...(plotWidth > 0 ? { width: plotWidth } : {})}
              className="price-chart__plot"
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
