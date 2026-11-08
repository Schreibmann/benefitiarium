import {
  CloseSandboxAccountCommand,
  EmptyTokenError,
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
import { describe, expect, it } from 'vitest';
import { createTinvestSdk } from './create-sdk.js';
import { REQUIRED_SDK_COMMANDS, TINVEST_SDK_META } from './sdk-meta.js';

const requiredExports: Record<(typeof REQUIRED_SDK_COMMANDS)[number], unknown> = {
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

describe('T-Invest SDK offline spike', () => {
  it('pins documented package versions', () => {
    expect(TINVEST_SDK_META.investSdkNode).toBe('1.61.0');
    expect(TINVEST_SDK_META.investCore).toBe('1.61.0');
    expect(TINVEST_SDK_META.grpcNodeClient).toBe('1.61.0');
  });

  it('exposes required command constructors', () => {
    for (const name of REQUIRED_SDK_COMMANDS) {
      expect(typeof requiredExports[name]).toBe('function');
    }
  });

  it('rejects empty token before network calls', async () => {
    await expect(
      createTinvestSdk({
        token: '   ',
        env: 'sandbox',
      }),
    ).rejects.toThrow(/token/i);
  });

  it('SDK itself rejects empty token via EmptyTokenError', async () => {
    await expect(InvestNodeSDK.create({ token: '' })).rejects.toBeInstanceOf(EmptyTokenError);
  });
});
