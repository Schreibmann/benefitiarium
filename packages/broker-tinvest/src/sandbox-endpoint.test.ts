import { describe, expect, it } from 'vitest';
import { assertSandboxUrl, TINVEST_SANDBOX_HOST, TINVEST_SANDBOX_URL } from './sandbox-endpoint.js';

describe('sandbox endpoint allowlist', () => {
  it('accepts fixed sandbox URL', () => {
    expect(() => assertSandboxUrl(TINVEST_SANDBOX_URL)).not.toThrow();
    expect(TINVEST_SANDBOX_HOST).toBe('sandbox-invest-public-api.tbank.ru');
  });

  it('rejects production host', () => {
    expect(() => assertSandboxUrl('https://invest-public-api.tbank.ru:443')).toThrow(/allowlisted/);
  });
});
