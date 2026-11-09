import { Chart } from '@tanstack/charts/react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { type ChartApiClient, createChartApiClient } from './api-client';
import { buildPriceChartDefinition } from './build-chart-definition';
import './chart.css';
import { toPivotSegments } from './to-pivot-segments';
import type { CandleRow, ChartTimeframe, InstrumentLookup, PivotSegment } from './types';

type Props = {
  client?: ChartApiClient;
  initialTicker?: string;
};

function defaultRange(timeframe: ChartTimeframe): { from: string; to: string } {
  const to = new Date();
  const from = new Date(
    to.getTime() - (timeframe === '5m' ? 3 * 24 * 60 * 60 * 1000 : 21 * 24 * 60 * 60 * 1000),
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

export function PriceChartApp(props: Props) {
  const client = useMemo(() => props.client ?? createChartApiClient(), [props.client]);
  const initialTicker = props.initialTicker ?? 'NG-12.26';
  const [ticker, setTicker] = useState(initialTicker);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('5m');
  const [instrument, setInstrument] = useState<InstrumentLookup | null>(null);
  const [candles, setCandles] = useState<CandleRow[]>([]);
  const [pivots, setPivots] = useState<PivotSegment[]>([]);
  const [referenceTimeframe, setReferenceTimeframe] = useState<'1D' | '1W' | null>(null);
  const [hasGaps, setHasGaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPivots(toPivotSegments(pivotResponse));
      setReferenceTimeframe(pivotResponse.referenceTimeframe);
      setHasGaps(pivotResponse.meta.hasGaps);
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
    void refresh(initialTicker, '5m');
  }, [initialTicker]);

  const definition = useMemo(
    () => buildPriceChartDefinition({ candles, pivots }),
    [candles, pivots],
  );

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
            Ticker
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              aria-label="Instrument ticker"
            />
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
          <button type="button" disabled={loading} onClick={() => void refresh(ticker, timeframe)}>
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
      </header>

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
        {candles.length === 0 && !loading ? (
          <p className="price-chart__meta">
            No candles loaded. Set T-Invest token on API and press Load.
          </p>
        ) : (
          <Chart
            definition={definition}
            ariaLabel={`${instrument?.ticker ?? ticker} ${timeframe} candlestick chart with Fibonacci pivots`}
            height={480}
          />
        )}
      </div>
    </main>
  );
}
