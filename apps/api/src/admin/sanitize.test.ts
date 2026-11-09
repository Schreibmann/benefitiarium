import { describe, expect, it } from 'vitest';
import {
  assertNotProductionBaseUrl,
  assertSandboxEndpointHost,
  sanitizeErrorMessage,
} from './sanitize.js';

describe('admin sanitize', () => {
  it('redacts token-like fragments from errors', () => {
    expect(sanitizeErrorMessage(new Error('failed with Bearer abc.def.ghi token=xyz'))).not.toMatch(
      /Bearer abc|token=xyz/i,
    );
  });

  it('refuses production base URL and non-sandbox hosts', () => {
    expect(() => assertNotProductionBaseUrl('https://invest-public-api.tbank.ru:443')).toThrow(
      /production/i,
    );
    expect(() => assertSandboxEndpointHost('invest-public-api.tbank.ru')).toThrow(/sandbox/i);
    expect(() => assertSandboxEndpointHost('sandbox-invest-public-api.tbank.ru')).not.toThrow();
  });
});
