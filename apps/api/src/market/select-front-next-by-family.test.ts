import { describe, expect, it } from 'vitest';
import {
  type FuturesContractCandidate,
  selectFrontNextByFamily,
} from './select-front-next-by-family.js';

function candidate(
  partial: Omit<FuturesContractCandidate, 'classCode' | 'isActive' | 'underlyingAssetName'> & {
    classCode?: string | null;
    isActive?: boolean;
    underlyingAssetName?: string | null;
  },
): FuturesContractCandidate {
  return {
    classCode: partial.classCode ?? 'SPBFUT',
    isActive: partial.isActive ?? true,
    underlyingAssetName: partial.underlyingAssetName ?? 'Brent',
    ticker: partial.ticker,
    instrumentUid: partial.instrumentUid,
    name: partial.name,
    family: partial.family,
    expirationAt: partial.expirationAt,
  };
}

describe('selectFrontNextByFamily', () => {
  it('picks nearest and next by expiration within a family', () => {
    const result = selectFrontNextByFamily([
      candidate({
        family: 'BR',
        ticker: 'BRM6',
        instrumentUid: 'uid-brm6',
        name: 'Brent-6.26',
        expirationAt: '2026-06-16T00:00:00.000Z',
      }),
      candidate({
        family: 'BR',
        ticker: 'BRH6',
        instrumentUid: 'uid-brh6',
        name: 'Brent-3.26',
        expirationAt: '2026-02-16T00:00:00.000Z',
      }),
      candidate({
        family: 'BR',
        ticker: 'BRJ6',
        instrumentUid: 'uid-brj6',
        name: 'Brent-4.26',
        expirationAt: '2026-04-16T00:00:00.000Z',
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.family).toBe('BR');
    expect(result[0]?.contracts.map((c) => c.role)).toEqual(['near', 'next']);
    expect(result[0]?.contracts.map((c) => c.ticker)).toEqual(['BRH6', 'BRJ6']);
  });

  it('returns only near when a family has a single contract', () => {
    const result = selectFrontNextByFamily([
      candidate({
        family: 'GD',
        ticker: 'GDH6',
        instrumentUid: 'uid-gdh6',
        name: 'Gold-3.26',
        expirationAt: '2026-03-19T00:00:00.000Z',
        underlyingAssetName: 'Gold',
      }),
    ]);

    expect(result).toEqual([
      {
        family: 'GD',
        underlyingAssetName: 'Gold',
        contracts: [
          {
            role: 'near',
            ticker: 'GDH6',
            instrumentUid: 'uid-gdh6',
            name: 'Gold-3.26',
            expirationAt: '2026-03-19T00:00:00.000Z',
            classCode: 'SPBFUT',
            isActive: true,
          },
        ],
      },
    ]);
  });

  it('tie-breaks equal expiration by ticker ascending and sorts families by name', () => {
    const result = selectFrontNextByFamily([
      candidate({
        family: 'NG',
        ticker: 'NGZ6',
        instrumentUid: 'uid-ngz6',
        name: 'NG Z',
        expirationAt: '2026-12-01T00:00:00.000Z',
        underlyingAssetName: 'Natural gas',
      }),
      candidate({
        family: 'NG',
        ticker: 'NGX6',
        instrumentUid: 'uid-ngx6',
        name: 'NG X',
        expirationAt: '2026-12-01T00:00:00.000Z',
        underlyingAssetName: 'Natural gas',
      }),
      candidate({
        family: 'BR',
        ticker: 'BRH6',
        instrumentUid: 'uid-brh6',
        name: 'Brent',
        expirationAt: '2026-02-16T00:00:00.000Z',
      }),
    ]);

    expect(result.map((f) => f.family)).toEqual(['BR', 'NG']);
    expect(result[1]?.contracts.map((c) => c.ticker)).toEqual(['NGX6', 'NGZ6']);
  });
});
