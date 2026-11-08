import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { createTinvestSdk } from './create-sdk.js';
import { assertSandboxUrl, TINVEST_SANDBOX_URL } from './sandbox-endpoint.js';

export type CreateSandboxSdkInput = {
  token: string;
};

/**
 * Sandbox-only SDK factory. Endpoint is fixed; production URL cannot be injected.
 */
export async function createSandboxSdk(input: CreateSandboxSdkInput): Promise<InvestNodeSDK> {
  assertSandboxUrl(TINVEST_SANDBOX_URL);
  return createTinvestSdk({
    token: input.token,
    env: 'sandbox',
    baseUrl: TINVEST_SANDBOX_URL,
    useMincifryCertificate: true,
  });
}
