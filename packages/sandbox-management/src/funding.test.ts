import { describe, expect, it } from 'vitest';
import { SANDBOX_PAYIN_MAX_RUB, validateSandboxFundAmount } from './funding.js';

describe('validateSandboxFundAmount', () => {
  it('accepts positive RUB amounts within limit', () => {
    const result = validateSandboxFundAmount('100000.50');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe('100000.50');
    }
  });

  it('rejects zero, negative, over-limit and invalid strings', () => {
    expect(validateSandboxFundAmount('0').ok).toBe(false);
    expect(validateSandboxFundAmount('-1').ok).toBe(false);
    expect(validateSandboxFundAmount('30000000.01').ok).toBe(false);
    expect(validateSandboxFundAmount('abc').ok).toBe(false);
    expect(SANDBOX_PAYIN_MAX_RUB).toBe('30000000');
  });
});
