import {
  createIdentityInstrumentUidResolver,
  createSdkTinvestReadApi,
  createTinvestMarketDataProvider,
  createTinvestSdk,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { resolveTinvestToken } from '@moex/config';
import type { ChartMarketDataDeps } from './market/fibonacci-pivot-service.js';

/**
 * Compose market-data deps for chart/pivot read routes.
 * Prefers TINVEST_READ_ONLY_TOKEN; falls back to sandbox token for sandbox env.
 */
export async function composeMarketDataDeps(env: AppEnv): Promise<ChartMarketDataDeps | null> {
  const readOnly = resolveTinvestToken(env, 'read_only');
  const sandbox = resolveTinvestToken(env, 'sandbox');
  const token = readOnly ?? sandbox;
  if (token === null) {
    return null;
  }

  const sdkEnv = readOnly !== null ? env.TINVEST_ENV : 'sandbox';
  const sdk = await createTinvestSdk({
    token,
    env: sdkEnv,
    baseUrl: env.TINVEST_BASE_URL,
  });
  const api = createSdkTinvestReadApi(sdk);
  const marketData = createTinvestMarketDataProvider({
    api,
    resolver: createIdentityInstrumentUidResolver(),
    isSandbox: sdkEnv === 'sandbox',
  });
  return { marketData };
}
