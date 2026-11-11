import type {
  FuturesCategoryBucket,
  FuturesFamily,
  FuturesFamilyContract,
  InstrumentLookup,
} from './types.js';

export function findTickerInFamilies(families: FuturesFamily[], ticker: string): string | null {
  const contract = findContractInFamilies(families, ticker);
  return contract?.ticker ?? null;
}

export function findContractInFamilies(
  families: FuturesFamily[],
  ticker: string,
): FuturesFamilyContract | null {
  const normalized = ticker.trim().toUpperCase();
  for (const family of families) {
    for (const contract of family.contracts) {
      if (contract.ticker.toUpperCase() === normalized) {
        return contract;
      }
    }
  }
  return null;
}

export function findContractInCatalog(
  categories: FuturesCategoryBucket[],
  ticker: string,
): FuturesFamilyContract | null {
  for (const bucket of categories) {
    const found = findContractInFamilies(bucket.families, ticker);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

export function instrumentFromContract(contract: FuturesFamilyContract): InstrumentLookup {
  return {
    instrumentUid: contract.instrumentUid,
    ticker: contract.ticker,
    name: contract.name,
    assetType: 'futures',
  };
}

export function firstNearTicker(families: FuturesFamily[]): string | null {
  for (const family of families) {
    const near = family.contracts.find((contract) => contract.role === 'near');
    if (near !== undefined) {
      return near.ticker;
    }
    const first = family.contracts[0];
    if (first !== undefined) {
      return first.ticker;
    }
  }
  return null;
}

export function pickTickerForCategory(families: FuturesFamily[], preferredTicker: string): string {
  return (
    findTickerInFamilies(families, preferredTicker) ?? firstNearTicker(families) ?? preferredTicker
  );
}

/** Skip the post-catalog refresh when an early warm-cache load already used the same ticker. */
export function shouldRefreshAfterCatalog(input: {
  earlyRefreshStarted: boolean;
  cachedTicker: string;
  nextTicker: string;
}): boolean {
  if (!input.earlyRefreshStarted) {
    return true;
  }
  return input.nextTicker !== input.cachedTicker;
}
