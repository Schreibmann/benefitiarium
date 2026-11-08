import type { SandboxProviderAccountStatus } from '@moex/domain';

/**
 * T-Invest AccountStatus numeric values from grpc-node-client 1.61.0.
 * ACCOUNT_STATUS_ALL is required for GetSandboxAccounts discovery (BL-079).
 */
export const TINVEST_ACCOUNT_STATUS = {
  UNSPECIFIED: 0,
  NEW: 1,
  OPEN: 2,
  CLOSED: 3,
  ALL: 4,
} as const;

export function mapTinvestAccountStatus(
  status: number | string | null | undefined,
): SandboxProviderAccountStatus {
  if (
    status === TINVEST_ACCOUNT_STATUS.NEW ||
    status === 'ACCOUNT_STATUS_NEW' ||
    status === 'NEW'
  ) {
    return 'new';
  }
  if (
    status === TINVEST_ACCOUNT_STATUS.OPEN ||
    status === 'ACCOUNT_STATUS_OPEN' ||
    status === 'OPEN'
  ) {
    return 'open';
  }
  if (
    status === TINVEST_ACCOUNT_STATUS.CLOSED ||
    status === 'ACCOUNT_STATUS_CLOSED' ||
    status === 'CLOSED'
  ) {
    return 'closed';
  }
  return 'unknown';
}
