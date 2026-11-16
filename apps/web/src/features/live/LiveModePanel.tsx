import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import {
  createLiveApiClient,
  type FavoriteItem,
  type LiveRuntimeSnapshot,
} from './live-api-client.js';
import './live-mode-panel.css';

const api = createLiveApiClient();

function statusTone(
  status: LiveRuntimeSnapshot['status'],
): 'neutral' | 'positive' | 'warning' | 'negative' {
  if (status === 'RUNNING') {
    return 'positive';
  }
  if (status === 'DEGRADED') {
    return 'negative';
  }
  if (status === 'STARTING' || status === 'STOPPING') {
    return 'warning';
  }
  return 'neutral';
}

export function LiveModePanel() {
  const [snapshot, setSnapshot] = useState<LiveRuntimeSnapshot | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ticker, setTicker] = useState('');
  const [instrumentUid, setInstrumentUid] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [live, items] = await Promise.all([api.getLive(), api.listFavorites()]);
      setSnapshot(live);
      setFavorites(items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load Live status');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onStart(): Promise<void> {
    setBusy(true);
    try {
      setSnapshot(await api.startLive());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start Live');
    } finally {
      setBusy(false);
    }
  }

  async function onStop(): Promise<void> {
    setBusy(true);
    try {
      setSnapshot(await api.stopLive());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to stop Live');
    } finally {
      setBusy(false);
    }
  }

  async function onAddFavorite(): Promise<void> {
    const nextTicker = ticker.trim();
    const nextUid = instrumentUid.trim();
    if (nextTicker.length === 0 || nextUid.length === 0) {
      setError('Укажите ticker и instrumentUid');
      return;
    }
    setBusy(true);
    try {
      await api.addFavorite({ instrumentUid: nextUid, ticker: nextTicker });
      setTicker('');
      setInstrumentUid('');
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add favorite');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveFavorite(uid: string): Promise<void> {
    setBusy(true);
    try {
      await api.removeFavorite(uid);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="live-mode-panel">
      <CardHeader
        title="Live Mode"
        action={
          snapshot ? (
            <Badge tone={statusTone(snapshot.status)}>{snapshot.status}</Badge>
          ) : (
            <Badge>UNKNOWN</Badge>
          )
        }
      />
      <CardBody>
        <p className="live-mode-panel__hint">
          Независимый 24/7 анализ избранного. Не путать с realtime-подпиской графика.
        </p>
        <div className="live-mode-panel__actions">
          <Button type="button" size="sm" disabled={busy} onClick={() => void onStart()}>
            Start Live
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void onStop()}
          >
            Stop Live
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>
        {snapshot ? (
          <dl className="live-mode-panel__meta">
            <div>
              <dt>Favorites</dt>
              <dd>{snapshot.favoriteCount}</dd>
            </div>
            <div>
              <dt>STRATEGY leases</dt>
              <dd>{snapshot.strategyLeaseCount}</dd>
            </div>
            <div>
              <dt>Intervals</dt>
              <dd>{snapshot.analysisIntervals.join(', ') || '—'}</dd>
            </div>
          </dl>
        ) : null}
        {snapshot?.lastError ? (
          <p className="live-mode-panel__error">{snapshot.lastError}</p>
        ) : null}
        {error ? <p className="live-mode-panel__error">{error}</p> : null}

        <h3 className="live-mode-panel__subheading">Избранное / Favorites</h3>
        <div className="live-mode-panel__form">
          <label>
            Ticker
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              placeholder="SBER"
            />
          </label>
          <label>
            Instrument UID
            <input
              value={instrumentUid}
              onChange={(event) => setInstrumentUid(event.target.value)}
              placeholder="uuid…"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void onAddFavorite()}
          >
            Add
          </Button>
        </div>
        {favorites.length === 0 ? (
          <p className="live-mode-panel__empty">Список избранного пуст.</p>
        ) : (
          <ul className="live-mode-panel__list">
            {favorites.map((item) => (
              <li key={item.instrumentUid}>
                <span>
                  {item.ticker} · {item.instrumentUid}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onRemoveFavorite(item.instrumentUid)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
