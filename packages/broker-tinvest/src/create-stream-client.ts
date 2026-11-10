import { NodeApiClient } from '@ttech-pub/grpc-node-client';
import { TINVEST_SDK_META } from './sdk-meta.js';

export type CreateTinvestStreamClientInput = {
  token: string;
  env: 'sandbox' | 'production';
  baseUrl?: string;
  useMincifryCertificate?: boolean;
};

/**
 * Low-level gRPC client for MarketDataStream (bidirectional).
 * Prefer this over GetMarketdataStreamCommand, which opens server-side stream only.
 */
export async function createTinvestStreamClient(
  input: CreateTinvestStreamClientInput,
): Promise<NodeApiClient> {
  const token = input.token.trim();
  if (token.length === 0) {
    throw new Error('T-Invest token is required for live stream access');
  }
  const url =
    input.baseUrl ??
    (input.env === 'sandbox' ? TINVEST_SDK_META.sandboxUrl : TINVEST_SDK_META.productionUrl);

  return NodeApiClient.create({
    token,
    url,
    telemetry: 'disabled',
    useMincifryCertificate: input.useMincifryCertificate ?? true,
  });
}
