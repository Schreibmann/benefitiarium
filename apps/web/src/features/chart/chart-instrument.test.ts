import { describe, expect, it } from 'vitest';
import {
  findContractInCatalog,
  instrumentFromContract,
  pickTickerForCategory,
  shouldRefreshAfterCatalog,
} from './chart-instrument.js';
import type { FuturesCategoryBucket, FuturesFamily } from './types.js';

const sampleFamilies: FuturesFamily[] = [
  {
    family: 'BR',
    underlyingAssetName: 'Brent',
    contracts: [
      {
        role: 'near',
        ticker: 'BRZ6',
        instrumentUid: 'uid-brz6',
        name: 'Brent Dec 26',
        expirationAt: '2026-12-01T00:00:00.000Z',
        classCode: 'SPBFUT',
        isActive: true,
      },
      {
        role: 'next',
        ticker: 'BRF7',
        instrumentUid: 'uid-brf7',
        name: 'Brent Jan 27',
        expirationAt: '2027-01-01T00:00:00.000Z',
        classCode: 'SPBFUT',
        isActive: true,
      },
    ],
  },
];

const sampleCatalog: FuturesCategoryBucket[] = [
  { category: 'commodity', families: sampleFamilies },
  { category: 'equity_index', families: [] },
  { category: 'currency', families: [] },
  { category: 'share', families: [] },
];

describe('chart-instrument', () => {
  it('resolves instrumentUid from the futures catalog without by-ticker', () => {
    const contract = findContractInCatalog(sampleCatalog, 'brz6');
    expect(contract).not.toBeNull();
    if (contract === null) {
      return;
    }
    expect(instrumentFromContract(contract)).toEqual({
      instrumentUid: 'uid-brz6',
      ticker: 'BRZ6',
      name: 'Brent Dec 26',
      assetType: 'futures',
    });
  });

  it('picks the preferred ticker when present in the category', () => {
    expect(pickTickerForCategory(sampleFamilies, 'BRF7')).toBe('BRF7');
    expect(pickTickerForCategory(sampleFamilies, 'MISSING')).toBe('BRZ6');
  });

  it('skips the post-catalog refresh when warm cache already loaded the same ticker', () => {
    expect(
      shouldRefreshAfterCatalog({
        earlyRefreshStarted: true,
        cachedTicker: 'BRZ6',
        nextTicker: 'BRZ6',
      }),
    ).toBe(false);
  });

  it('refreshes after catalog when ticker changes or no early load ran', () => {
    expect(
      shouldRefreshAfterCatalog({
        earlyRefreshStarted: true,
        cachedTicker: 'BRZ6',
        nextTicker: 'NG-12.26',
      }),
    ).toBe(true);
    expect(
      shouldRefreshAfterCatalog({
        earlyRefreshStarted: false,
        cachedTicker: 'BRZ6',
        nextTicker: 'BRZ6',
      }),
    ).toBe(true);
  });
});
