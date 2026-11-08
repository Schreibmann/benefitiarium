import {
  applyLocalEnvFile,
  loadEnv,
  resolveTinvestSandboxAccountId,
  resolveTinvestToken,
} from '@moex/config';
import { createLogger } from '@moex/observability';
import { CandleInterval } from '@ttech-pub/grpc-node-client';
import {
  CloseSandboxAccountCommand,
  GetCandlesCommand,
  GetFuturesCommand,
  GetIndicativesCommand,
  GetLastPricesCommand,
  GetMarketdataStreamCommand,
  GetSandboxAccountsCommand,
  GetSandboxPortfolioCommand,
  GetSandboxPositionsCommand,
  GetSharesCommand,
  InvestNodeSDK,
  OpenSandboxAccountCommand,
  PostSandboxOrderCommand,
  SandboxPayInCommand,
} from '@ttech-pub/invest-sdk-node';
import { createSandboxSdk } from './create-sandbox-sdk.js';
import { createTinvestSdk } from './create-sdk.js';
import { REQUIRED_SDK_COMMANDS, TINVEST_SDK_META } from './sdk-meta.js';

const logger = createLogger({ service: '@moex/broker-tinvest/spike', level: 'info' });

function assertOfflineSurface(): void {
  const exported: Record<string, unknown> = {
    InvestNodeSDK,
    GetSharesCommand,
    GetFuturesCommand,
    GetIndicativesCommand,
    GetCandlesCommand,
    GetLastPricesCommand,
    GetMarketdataStreamCommand,
    GetSandboxAccountsCommand,
    GetSandboxPositionsCommand,
    GetSandboxPortfolioCommand,
    OpenSandboxAccountCommand,
    CloseSandboxAccountCommand,
    SandboxPayInCommand,
    PostSandboxOrderCommand,
  };

  for (const name of REQUIRED_SDK_COMMANDS) {
    if (typeof exported[name] !== 'function') {
      throw new Error(`Missing SDK export: ${name}`);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }
  return null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
}

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

type FutureSample = {
  uid: string;
  ticker: string;
  classCode: string;
  assetType: string | null;
  basicAsset: string | null;
  expirationDate: string | null;
  first1minCandleDate: string | null;
  first1dayCandleDate: string | null;
};

function mapFutureSample(raw: unknown): FutureSample | null {
  const record = asRecord(raw);
  if (record === null) {
    return null;
  }
  const uid = readString(record, 'uid');
  const ticker = readString(record, 'ticker');
  const classCode = readString(record, 'classCode');
  if (uid === null || ticker === null || classCode === null) {
    return null;
  }
  return {
    uid,
    ticker,
    classCode,
    assetType: readString(record, 'assetType'),
    basicAsset: readString(record, 'basicAsset'),
    expirationDate: isoOrNull(record.expirationDate),
    first1minCandleDate: isoOrNull(record.first1minCandleDate),
    first1dayCandleDate: isoOrNull(record.first1dayCandleDate),
  };
}

function pickFutureByAssetType(futures: FutureSample[], wanted: string): FutureSample | null {
  const normalizedWanted = wanted.toLowerCase();
  return (
    futures.find((item) => (item.assetType ?? '').toLowerCase().includes(normalizedWanted)) ?? null
  );
}

async function probeWithSdk(input: {
  label: string;
  token: string;
  env: 'sandbox' | 'production';
  baseUrl: string;
  includeSandboxAccounts: boolean;
}): Promise<void> {
  const sdk = await createTinvestSdk({
    token: input.token,
    env: input.env,
    baseUrl: input.baseUrl,
  });

  if (input.includeSandboxAccounts) {
    const accounts = await sdk.send(new GetSandboxAccountsCommand({}));
    const accountList = Array.isArray(accounts.accounts) ? accounts.accounts : [];
    logger.info(`${input.label}: sandbox accounts`, { count: accountList.length });
  }

  const futuresResponse = await sdk.send(new GetFuturesCommand({}));
  const instruments = Array.isArray(futuresResponse.instruments) ? futuresResponse.instruments : [];
  const samples = instruments
    .map(mapFutureSample)
    .filter((item): item is FutureSample => item !== null);

  const commodity = pickFutureByAssetType(samples, 'commodity');
  const index = pickFutureByAssetType(samples, 'index');
  const currency = pickFutureByAssetType(samples, 'currency');

  logger.info(`${input.label}: futures catalog`, {
    count: samples.length,
    commoditySample: commodity
      ? {
          ticker: commodity.ticker,
          classCode: commodity.classCode,
          assetType: commodity.assetType,
          basicAsset: commodity.basicAsset,
          expirationDate: commodity.expirationDate,
          first1minCandleDate: commodity.first1minCandleDate,
          first1dayCandleDate: commodity.first1dayCandleDate,
          uidPrefix: commodity.uid.slice(0, 8),
        }
      : null,
    indexSample: index
      ? {
          ticker: index.ticker,
          classCode: index.classCode,
          assetType: index.assetType,
          basicAsset: index.basicAsset,
          expirationDate: index.expirationDate,
          first1minCandleDate: index.first1minCandleDate,
          first1dayCandleDate: index.first1dayCandleDate,
          uidPrefix: index.uid.slice(0, 8),
        }
      : null,
    currencySample: currency
      ? {
          ticker: currency.ticker,
          classCode: currency.classCode,
          assetType: currency.assetType,
          uidPrefix: currency.uid.slice(0, 8),
        }
      : null,
  });

  const indicatives = await sdk.send(new GetIndicativesCommand({}));
  const indicativeList = Array.isArray(indicatives.instruments) ? indicatives.instruments : [];
  logger.info(`${input.label}: indicatives catalog`, { count: indicativeList.length });

  const candleTarget = commodity ?? index ?? samples[0] ?? null;
  if (candleTarget !== null) {
    const to = new Date();
    const from = new Date(to.getTime() - 3 * 24 * 60 * 60 * 1000);
    const candles = await sdk.send(
      new GetCandlesCommand({
        instrumentId: candleTarget.uid,
        from,
        to,
        interval: CandleInterval.CANDLE_INTERVAL_DAY,
      }),
    );
    const candleRows = Array.isArray(candles.candles) ? candles.candles : [];
    logger.info(`${input.label}: GetCandles sample`, {
      ticker: candleTarget.ticker,
      assetType: candleTarget.assetType,
      interval: 'CANDLE_INTERVAL_DAY',
      rowCount: candleRows.length,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }
}

async function main(): Promise<void> {
  const envPath = applyLocalEnvFile();
  assertOfflineSurface();
  logger.info('offline SDK surface ok', {
    investSdkNode: TINVEST_SDK_META.investSdkNode,
    sandboxUrl: TINVEST_SDK_META.sandboxUrl,
    envFileLoaded: envPath,
  });

  const env = loadEnv(process.env);
  const sandboxToken = resolveTinvestToken(env, 'sandbox');
  const readOnlyToken = resolveTinvestToken(env, 'read_only');
  const sandboxAccountConfigured = resolveTinvestSandboxAccountId(env) !== null;

  logger.info('token presence (values never logged)', {
    sandboxToken: sandboxToken !== null,
    readOnlyToken: readOnlyToken !== null,
    fullAccessToken: env.TINVEST_FULL_ACCESS_TOKEN.trim().length > 0,
    sandboxAccountConfigured,
  });

  if (sandboxToken === null && readOnlyToken === null) {
    logger.warn('No T-Invest tokens configured — skipping live probes', {
      next: 'set TINVEST_SANDBOX_TOKEN and/or TINVEST_READ_ONLY_TOKEN in .env',
    });
    return;
  }

  if (sandboxToken !== null) {
    // Prefer dedicated sandbox factory (allowlisted host).
    await createSandboxSdk({ token: sandboxToken });
    await probeWithSdk({
      label: 'sandbox',
      token: sandboxToken,
      env: 'sandbox',
      baseUrl: TINVEST_SDK_META.sandboxUrl,
      includeSandboxAccounts: true,
    });
  } else {
    logger.warn('TINVEST_SANDBOX_TOKEN empty — sandbox probe skipped');
  }

  if (readOnlyToken !== null) {
    await probeWithSdk({
      label: 'read_only',
      token: readOnlyToken,
      env: 'production',
      baseUrl: TINVEST_SDK_META.productionUrl,
      includeSandboxAccounts: false,
    });
  } else {
    logger.warn('TINVEST_READ_ONLY_TOKEN empty — production read probe skipped');
  }
}

main().catch((error: unknown) => {
  logger.error('spike failed', { error: String(error) });
  process.exitCode = 1;
});
