import { describe, expect, it } from 'vitest';
import { parseAdminRoute, validateFundAmountInput } from './validation.js';

describe('sandbox admin validation', () => {
  it('validates fund amounts and large-confirm threshold', () => {
    expect(validateFundAmountInput('0').ok).toBe(false);
    expect(validateFundAmountInput('-1').ok).toBe(false);
    expect(validateFundAmountInput('30000001').ok).toBe(false);
    const ok = validateFundAmountInput('250000');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.requiresDoubleConfirm).toBe(false);
    }
    const large = validateFundAmountInput('1000000');
    expect(large.ok).toBe(true);
    if (large.ok) {
      expect(large.requiresDoubleConfirm).toBe(true);
    }
  });

  it('parses admin routes', () => {
    expect(parseAdminRoute('/admin/sandbox')).toEqual({ name: 'overview' });
    expect(parseAdminRoute('/admin/sandbox/accounts')).toEqual({ name: 'accounts' });
    expect(parseAdminRoute('/admin/sandbox/accounts/abc')).toEqual({
      name: 'account',
      id: 'abc',
    });
    expect(parseAdminRoute('/admin/sandbox/operations')).toEqual({ name: 'operations' });
  });
});
