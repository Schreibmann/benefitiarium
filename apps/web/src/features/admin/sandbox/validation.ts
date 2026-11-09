const FUND_MAX = 30_000_000;
const LARGE_FUND_CONFIRM_THRESHOLD = 1_000_000;

export type FundValidation =
  | { ok: true; amount: string; requiresDoubleConfirm: boolean }
  | { ok: false; reason: string };

export function validateFundAmountInput(raw: string): FundValidation {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'Amount is required' };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, reason: 'Amount must be a positive decimal string' };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: 'Amount must be positive; withdrawal is not supported' };
  }
  if (value > FUND_MAX) {
    return { ok: false, reason: `Amount exceeds SandboxPayIn limit of ${FUND_MAX} RUB` };
  }
  return {
    ok: true,
    amount: trimmed,
    requiresDoubleConfirm: value >= LARGE_FUND_CONFIRM_THRESHOLD,
  };
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type AdminRoute =
  | { name: 'overview' }
  | { name: 'accounts' }
  | { name: 'account'; id: string }
  | { name: 'operations' }
  | { name: 'unknown'; path: string };

export function parseAdminRoute(pathname: string): AdminRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/admin/sandbox') {
    return { name: 'overview' };
  }
  if (normalized === '/admin/sandbox/accounts') {
    return { name: 'accounts' };
  }
  if (normalized === '/admin/sandbox/operations') {
    return { name: 'operations' };
  }
  const accountMatch = /^\/admin\/sandbox\/accounts\/([^/]+)$/.exec(normalized);
  if (accountMatch?.[1] !== undefined) {
    return { name: 'account', id: decodeURIComponent(accountMatch[1]) };
  }
  return { name: 'unknown', path: normalized };
}
