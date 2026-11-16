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
      setFavorites(await api.listFavorites());
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

  async function onSyncFavorites(): Promise<void> {
    setBusy(true);
    try {
      setFavorites(await api.syncFavorites());
      setSnapshot(await api.getLive());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync favorites from T-Invest');
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
          Live берёт только фьючерсы из избранного T-Invest (GetFavorites). Меняйте список в
          приложении брокера, затем синхронизируйте. Live Mode ≠ realtime графика.
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
            onClick={() => void onSyncFavorites()}
          >
            Sync favorites
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
              <dt>Futures favorites</dt>
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

        <details className="live-mode-panel__favorites">
          <summary className="live-mode-panel__favorites-summary">
            Избранное T-Invest (фьючерсы)
            <span className="live-mode-panel__favorites-count">{favorites.length}</span>
          </summary>
          {favorites.length === 0 ? (
            <p className="live-mode-panel__empty">
              Нет фьючерсов в избранном брокера. Добавьте фьючерсы в приложении T-Invest, затем Sync
              favorites.
            </p>
          ) : (
            <ul className="live-mode-panel__list">
              {favorites.map((item) => (
                <li key={item.instrumentUid}>
                  <strong>{item.ticker}</strong>
                </li>
              ))}
            </ul>
          )}
        </details>
      </CardBody>
    </Card>
  );
}
