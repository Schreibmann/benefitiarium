import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { TINVEST_SDK_META } from './sdk-meta.js';

export type CreateTinvestSdkInput = {
  token: string;
  env: 'sandbox' | 'production';
  baseUrl?: string;
  /**
   * Use Russian Ministry of Digital Development root CA bundled by the SDK.
   * Defaults to true — Node often fails T-Invest TLS without it
   * (`self-signed certificate in certificate chain`).
   */
  useMincifryCertificate?: boolean;
};

/**
 * Creates a Node SDK instance. Token must stay server-side only.
 * Raw SDK instance must not leak into apps/web or strategy packages.
 */
export async function createTinvestSdk(input: CreateTinvestSdkInput): Promise<InvestNodeSDK> {
  const token = input.token.trim();
  if (token.length === 0) {
    throw new Error('T-Invest token is required for live SDK access');
  }

  const url =
    input.baseUrl ??
    (input.env === 'sandbox' ? TINVEST_SDK_META.sandboxUrl : TINVEST_SDK_META.productionUrl);

  return InvestNodeSDK.create({
    token,
    url,
    telemetry: 'disabled',
    useMincifryCertificate: input.useMincifryCertificate ?? true,
  });
}
