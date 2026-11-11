import { useEffect, useMemo, useState } from 'react';
import { type AdminApiClient, type CommandAccepted, createAdminApiClient } from './api-client.js';
import './sandbox-admin.css';
import { createSessionTokenStore } from './token-store.js';
import { newIdempotencyKey, parseAdminRoute, validateFundAmountInput } from './validation.js';

type Props = {
  apiBaseUrl?: string;
  client?: AdminApiClient;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  if (isPlainObject(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function SandboxAdminApp(props: Props) {
  const tokenStore = useMemo(() => createSessionTokenStore(), []);
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(() => tokenStore.get() !== null);
  const [path, setPath] = useState(() => window.location.pathname);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [accounts, setAccounts] = useState<unknown[]>([]);
  const [operations, setOperations] = useState<unknown[]>([]);
  const [accountDetail, setAccountDetail] = useState<Record<string, unknown> | null>(null);
  const [createName, setCreateName] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundConfirmLarge, setFundConfirmLarge] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState('');
  const [closePreview, setClosePreview] = useState<Record<string, unknown> | null>(null);
  const [ackOpenRisk, setAckOpenRisk] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<CommandAccepted | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const client = useMemo(
    () =>
      props.client ??
      createAdminApiClient({
        baseUrl: props.apiBaseUrl ?? '',
        getToken: () => tokenStore.get(),
      }),
    [props.client, props.apiBaseUrl, tokenStore],
  );

  const route = parseAdminRoute(path);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(next: string) {
    window.history.pushState({}, '', next);
    setPath(next);
    setError(null);
    setNotice(null);
  }

  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!hasToken) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const current = parseAdminRoute(path);
        if (current.name === 'overview') {
          const data = await client.getOverview();
          if (!cancelled && isPlainObject(data)) {
            setOverview(data);
          }
        } else if (current.name === 'accounts') {
          const data = await client.listAccounts(statusFilter || undefined);
          if (!cancelled && isPlainObject(data) && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
          }
        } else if (current.name === 'operations') {
          const data = await client.listOperations();
          if (!cancelled && isPlainObject(data) && Array.isArray(data.operations)) {
            setOperations(data.operations);
          }
        } else if (current.name === 'account') {
          const data = await client.getAccount(current.id);
          if (!cancelled && isPlainObject(data)) {
            setAccountDetail(data);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(formatError(err));
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken, path, statusFilter, client]);

  if (!hasToken) {
    return (
      <section className="sandbox-admin">
        <h1>Sandbox Admin</h1>
        <p className="badge">SANDBOX</p>
        <p>Server-side ADMIN bearer token required. Menu hiding is not authorization.</p>
        <label>
          Admin API token
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            tokenStore.set(tokenInput);
            setHasToken(true);
            setTokenInput('');
          }}
        >
          Unlock Admin
        </button>
      </section>
    );
  }

  const accountObj =
    accountDetail !== null && isPlainObject(accountDetail.account) ? accountDetail.account : null;

  return (
    <section className="sandbox-admin">
      <header className="sandbox-admin__header">
        <div>
          <p className="badge">SANDBOX</p>
          <h1>Sandbox Admin</h1>
          <p className="muted">
            Host:{' '}
            {overview !== null && typeof overview.endpointHost === 'string'
              ? overview.endpointHost
              : 'sandbox-invest-public-api.tbank.ru'}
          </p>
        </div>
        <nav className="sandbox-admin__nav">
          <button type="button" onClick={() => navigate('/admin/sandbox')}>
            Overview
          </button>
          <button type="button" onClick={() => navigate('/admin/sandbox/accounts')}>
            Accounts
          </button>
          <button type="button" onClick={() => navigate('/admin/sandbox/operations')}>
            Operations
          </button>
          <button
            type="button"
            onClick={() => {
              tokenStore.clear();
              setHasToken(false);
            }}
          >
            Lock
          </button>
        </nav>
      </header>

      {busy ? <p className="muted">Loading…</p> : null}
      {error !== null ? <p className="error">{error}</p> : null}
      {notice !== null ? <p className="notice">{notice}</p> : null}
      {pendingCommand !== null ? (
        <p className="notice">
          Command accepted: {pendingCommand.operationId} ({pendingCommand.status}). Waiting for
          confirmed backend status — not marked success yet.
        </p>
      ) : null}

      {route.name === 'overview' && overview !== null ? (
        <div className="panel">
          <h2>Overview</h2>
          <pre>{JSON.stringify(overview, null, 2)}</pre>
          <div className="actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  const result = await client.syncAll(newIdempotencyKey('sync-all'));
                  setPendingCommand(result);
                  setNotice(`Sync queued: ${result.operationId}`);
                  const data = await client.getOverview();
                  if (isPlainObject(data)) {
                    setOverview(data);
                  }
                })
              }
            >
              Sync all
            </button>
          </div>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                const result = await client.createAccount(createName, newIdempotencyKey('create'));
                setPendingCommand(result);
                setCreateName('');
                setNotice(`Create queued: ${result.operationId}`);
              });
            }}
          >
            <label>
              Create account name
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              Create account
            </button>
          </form>
        </div>
      ) : null}

      {route.name === 'accounts' ? (
        <div className="panel">
          <h2>Accounts</h2>
          <label>
            Status filter
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">all</option>
              <option value="active">active</option>
              <option value="new">new</option>
              <option value="closed">closed</option>
              <option value="missing">missing</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          {accounts.length === 0 ? <p className="muted">No accounts</p> : null}
          <ul className="account-list">
            {accounts.map((row) => {
              if (!isPlainObject(row) || typeof row.id !== 'string') {
                return null;
              }
              const localStatus = typeof row.localStatus === 'string' ? row.localStatus : '?';
              const displayName = typeof row.displayName === 'string' ? row.displayName : row.id;
              return (
                <li key={row.id} {...(localStatus === 'missing' ? { className: 'warn' } : {})}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/sandbox/accounts/${row.id}`)}
                  >
                    {displayName} · {localStatus}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {route.name === 'operations' ? (
        <div className="panel">
          <h2>Operations</h2>
          {operations.length === 0 ? <p className="muted">No operations</p> : null}
          <ul>
            {operations.map((row) => {
              if (!isPlainObject(row) || typeof row.id !== 'string') {
                return null;
              }
              return (
                <li key={row.id}>
                  {typeof row.type === 'string' ? row.type : '?'} ·{' '}
                  {typeof row.status === 'string' ? row.status : '?'} · {row.id}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {route.name === 'account' && accountDetail !== null ? (
        <div className="panel">
          <h2>Account detail</h2>
          <pre>{JSON.stringify(accountDetail, null, 2)}</pre>
          {accountObj !== null && accountObj.localStatus === 'missing' ? (
            <p className="warn">
              Account is MISSING at the broker. Create a new sandbox account; do not try to restore
              the old provider id.
            </p>
          ) : null}
          <div className="actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  const result = await client.syncAccount(route.id, newIdempotencyKey('sync-one'));
                  setPendingCommand(result);
                  setNotice(`Sync queued: ${result.operationId}`);
                })
              }
            >
              Sync
            </button>
          </div>

          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const validated = validateFundAmountInput(fundAmount);
              if (!validated.ok) {
                setError(validated.reason);
                return;
              }
              if (validated.requiresDoubleConfirm && !fundConfirmLarge) {
                setError('Large amount requires explicit double confirmation');
                return;
              }
              void runAction(async () => {
                const result = await client.fundAccount(
                  route.id,
                  validated.amount,
                  newIdempotencyKey('fund'),
                );
                setPendingCommand(result);
                setFundAmount('');
                setFundConfirmLarge(false);
                setNotice(
                  `Fund queued: ${result.operationId}. SandboxPayIn cannot withdraw funds.`,
                );
              });
            }}
          >
            <h3>Fund (RUB)</h3>
            <p className="warn">
              Funding only increases the virtual RUB balance; withdrawal is not supported via
              SandboxPayIn.
            </p>
            <label>
              Amount
              <input
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={fundConfirmLarge}
                onChange={(event) => setFundConfirmLarge(event.target.checked)}
              />
              I confirm amounts ≥ 1,000,000 RUB
            </label>
            <button type="submit" disabled={busy}>
              Fund
            </button>
          </form>

          <div className="stack">
            <h3>Close account</h3>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  const preview = await client.previewClose(route.id);
                  if (isPlainObject(preview)) {
                    setClosePreview(preview);
                  }
                })
              }
            >
              Load close preview
            </button>
            {closePreview !== null ? (
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const previewId = closePreview.previewId;
                  if (typeof previewId !== 'string') {
                    setError('Missing previewId');
                    return;
                  }
                  void runAction(async () => {
                    const result = await client.closeAccount(
                      route.id,
                      {
                        previewId,
                        confirmation: closeConfirmation,
                        acknowledgeOpenPositionsAndOrders: ackOpenRisk,
                      },
                      newIdempotencyKey('close'),
                    );
                    setPendingCommand(result);
                    setNotice(
                      `Close queued: ${result.operationId}. CLOSED is shown only after backend confirmation.`,
                    );
                    setCloseConfirmation('');
                    setAckOpenRisk(false);
                  });
                }}
              >
                <pre>{JSON.stringify(closePreview.warnings ?? [], null, 2)}</pre>
                <label>
                  Type account name or id to confirm
                  <input
                    value={closeConfirmation}
                    onChange={(event) => setCloseConfirmation(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ackOpenRisk}
                    onChange={(event) => setAckOpenRisk(event.target.checked)}
                  />
                  Acknowledge open orders/positions if present
                </label>
                <button type="submit" disabled={busy}>
                  Confirm close
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {route.name === 'unknown' ? <p className="error">Unknown admin route: {route.path}</p> : null}
    </section>
  );
}
