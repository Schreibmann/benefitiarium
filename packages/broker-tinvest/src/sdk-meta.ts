export const TINVEST_SDK_META = {
  investSdkNode: '1.61.0',
  investCore: '1.61.0',
  grpcNodeClient: '1.61.0',
  nodeRequirement: '>=22',
  sandboxUrl: 'https://sandbox-invest-public-api.tbank.ru:443',
  productionUrl: 'https://invest-public-api.tbank.ru:443',
  verifiedAt: '2026-11-08',
  liveSandboxProbe: 'blocked_without_token',
} as const;

/** Commands required by the MVP adapter surface (BL-014). */
export const REQUIRED_SDK_COMMANDS = [
  'InvestNodeSDK',
  'GetSharesCommand',
  'GetFuturesCommand',
  'GetIndicativesCommand',
  'GetCandlesCommand',
  'GetLastPricesCommand',
  'GetMarketdataStreamCommand',
  'GetSandboxAccountsCommand',
  'GetSandboxPositionsCommand',
  'GetSandboxPortfolioCommand',
  'OpenSandboxAccountCommand',
  'CloseSandboxAccountCommand',
  'SandboxPayInCommand',
  'PostSandboxOrderCommand',
] as const;

/**
 * gRPC method `FutureBy` exists on InstrumentsService; Node SDK 1.61.0 exposes
 * catalog via `GetFuturesCommand` and lookup is implemented as UID filter until
 * a dedicated command lands in the SDK. Do not substitute Indicatives for FutureBy.
 */
export const FUTURE_BY_LOOKUP_NOTE =
  'FutureBy via GetFuturesCommand UID filter; Indicatives are a separate catalog' as const;
