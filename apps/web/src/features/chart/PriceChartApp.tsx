import { useStore } from '@nanostores/react';
import { Chart } from '@tanstack/charts/react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { type ChartApiClient, createChartApiClient } from './api-client';
import {
  buildPriceChartDefinition,
  type ChartXWindow,
  defaultSessionXWindow,
  sessionXExtent,
} from './build-chart-definition';
import './chart.css';
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
  FuturesFamily,
  FuturesListCategory,
  InstrumentLookup,
  PivotSegment,
} from './types';

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

function defaultRange(timeframe: ChartTimeframe): { from: string; to: string } {
  const to = new Date();
  const from = new Date(
    to.getTime() - (timeframe === '5m' ? 3 * 24 * 60 * 60 * 1000 : 21 * 24 * 60 * 60 * 1000),
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

function findTickerInFamilies(families: FuturesFamily[], ticker: string): string | null {
  const normalized = ticker.trim().toUpperCase();
  for (const family of families) {
    for (const contract of family.contracts) {
      if (contract.ticker.toUpperCase() === normalized) {
        return contract.ticker;
      }
    }
  }
  return null;
}

function firstNearTicker(families: FuturesFamily[]): string | null {
  for (const family of families) {
    const near = family.contracts.find((contract) => contract.role === 'near');
    if (near !== undefined) {
      return near.ticker;
    }
    const first = family.contracts[0];
    if (first !== undefined) {
      return first.ticker;
    }
  }
  return null;
}

function pickTickerForCategory(families: FuturesFamily[], preferredTicker: string): string {
  return (
    findTickerInFamilies(families, preferredTicker) ?? firstNearTicker(families) ?? preferredTicker
  );
}

function updateChartPath(ticker: string): void {
  const path = `/charts/${encodeURIComponent(ticker)}`;
  window.history.pushState({}, '', path);
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
  const [referenceTimeframe, setReferenceTimeframe] = useState<'1D' | '1W' | null>(null);
  const [hasGaps, setHasGaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xWindow, setXWindow] = useState<ChartXWindow>({ start: -0.5, end: 0.5 });

  const families = useMemo(
    () => familiesForCategory(persistedCatalog.categories, category),
    [persistedCatalog.categories, category],
  );

  const listLoading = catalogStatus.status === 'loading';
  const listRefreshing = catalogStatus.status === 'refreshing';
  const listError = catalogStatus.error;

  const refresh = useEffectEvent(async (nextTicker: string, nextTimeframe: ChartTimeframe) => {
    setLoading(true);
    setError(null);
    try {
      const range = defaultRange(nextTimeframe);
      const lookedUp = await client.lookupByTicker(nextTicker);
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
      setInstrument(lookedUp);
      setCandles(candleRows);
      const sessionCandles = toSessionCandles(candleRows);
      setPivots(toPivotSegments(pivotResponse, sessionCandles));
      setReferenceTimeframe(pivotResponse.referenceTimeframe);
      setHasGaps(pivotResponse.meta.hasGaps);
      const matched = findTickerInFamilies(families, lookedUp.ticker);
      if (matched !== null) {
        setTicker(matched);
      }
    } catch (err: unknown) {
      setInstrument(null);
      setCandles([]);
      setPivots([]);
      setReferenceTimeframe(null);
      setHasGaps(false);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void (async () => {
      const cachedFamilies = familiesForCategory(
        futuresCatalogPersistent.get().categories,
        'commodity',
      );
      const cachedTicker = pickTickerForCategory(cachedFamilies, initialTicker);
      setTicker(cachedTicker);
      updateChartPath(cachedTicker);
      if (cachedFamilies.length > 0) {
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
      void refresh(nextTicker, '5m');
    })();
  }, [client, initialTicker]);

  const sessionCandles = useMemo(() => toSessionCandles(candles), [candles]);
  const xExtent = useMemo(() => sessionXExtent(sessionCandles), [sessionCandles]);

  useEffect(() => {
    setXWindow(defaultSessionXWindow(sessionCandles));
  }, [sessionCandles]);

  const definition = useMemo(
    () =>
      buildPriceChartDefinition({
        candles: sessionCandles,
        pivots,
        xWindow,
        xExtent,
        onXWindowChange: setXWindow,
      }),
    [sessionCandles, pivots, xWindow, xExtent],
  );

  const selectedInstrumentValue =
    findTickerInFamilies(families, ticker) ?? firstNearTicker(families) ?? '';

  return (
    <main className="price-chart">
      <header className="price-chart__header">
        <div>
          <h1>Price chart</h1>
          <p className="price-chart__meta">
            Fibonacci Pivot Points overlay · chart TF maps to {timeframe === '5m' ? '1D' : '1W'}{' '}
            reference
          </p>
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
                if (value === '5m' || value === '1h') {
                  setTimeframe(value);
                  void refresh(ticker, value);
                }
              }}
            >
              <option value="5m">5m</option>
              <option value="1h">1h</option>
            </select>
          </label>
          <button
            type="button"
            disabled={sessionCandles.length === 0}
            onClick={() => setXWindow(defaultSessionXWindow(sessionCandles))}
          >
            Reset zoom
          </button>
        </div>
      </header>

      {listError ? <p className="price-chart__error">{listError}</p> : null}
      {listLoading ? <p className="price-chart__meta">Loading futures list…</p> : null}
      {listRefreshing ? <p className="price-chart__meta">Updating futures list…</p> : null}

      {instrument ? (
        <p className="price-chart__meta">
          {instrument.ticker} · {instrument.name} · uid {instrument.instrumentUid}
          {referenceTimeframe ? ` · pivots from ${referenceTimeframe}` : ''}
          {hasGaps ? ' · gaps in pivot history' : ''}
          {` · candles ${candles.length} · pivot segments ${pivots.length}`}
        </p>
      ) : null}

      {error ? <p className="price-chart__error">{error}</p> : null}

      <div className="price-chart__canvas">
        {loading ? <p className="price-chart__meta">Loading candles…</p> : null}
        {candles.length === 0 && !loading ? (
          <p className="price-chart__meta">
            No candles yet. Pick an instrument (API needs a T-Invest token).
          </p>
        ) : null}
        {candles.length > 0 ? (
          <>
            <p className="price-chart__meta">Wheel: zoom · drag: pan · price on the right</p>
            <Chart
              definition={definition}
              ariaLabel={`${instrument?.ticker ?? ticker} ${timeframe} candlestick chart with Fibonacci pivots`}
              height={520}
              className="price-chart__plot"
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
