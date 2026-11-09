import { describe, expect, it } from 'vitest';
import { mapTinvestAccountStatus, TINVEST_ACCOUNT_STATUS } from './sandbox-account-status.js';

describe('sandbox account status mapping', () => {
  it('maps SDK AccountStatus enums including ALL constant', () => {
    expect(TINVEST_ACCOUNT_STATUS.ALL).toBe(4);
    expect(mapTinvestAccountStatus(TINVEST_ACCOUNT_STATUS.NEW)).toBe('new');
    expect(mapTinvestAccountStatus(TINVEST_ACCOUNT_STATUS.OPEN)).toBe('open');
    expect(mapTinvestAccountStatus(TINVEST_ACCOUNT_STATUS.CLOSED)).toBe('closed');
    expect(mapTinvestAccountStatus(TINVEST_ACCOUNT_STATUS.UNSPECIFIED)).toBe('unknown');
    expect(mapTinvestAccountStatus('ACCOUNT_STATUS_OPEN')).toBe('open');
  });
});
