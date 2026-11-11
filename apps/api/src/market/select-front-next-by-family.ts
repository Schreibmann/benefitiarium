export type FuturesContractCandidate = {
  ticker: string;
  instrumentUid: string;
  name: string;
  classCode: string | null;
  isActive: boolean;
  family: string;
  underlyingAssetName: string | null;
  expirationAt: string;
};

export type FuturesContractRole = 'near' | 'next';

export type FuturesFamilyContractDto = {
  role: FuturesContractRole;
  ticker: string;
  instrumentUid: string;
  name: string;
  expirationAt: string;
  classCode: string | null;
  isActive: boolean;
};

export type FuturesFamilyDto = {
  family: string;
  underlyingAssetName: string | null;
  contracts: FuturesFamilyContractDto[];
};

/**
 * Groups active futures candidates by family and keeps the nearest two expirations
 * as `near` / `next` (foundation for a later near/far hedge UI).
 */
export function selectFrontNextByFamily(
  candidates: FuturesContractCandidate[],
): FuturesFamilyDto[] {
  const byFamily = new Map<string, FuturesContractCandidate[]>();
  for (const candidate of candidates) {
    const existing = byFamily.get(candidate.family);
    if (existing === undefined) {
      byFamily.set(candidate.family, [candidate]);
    } else {
      existing.push(candidate);
    }
  }

  const families: FuturesFamilyDto[] = [];
  for (const [family, rows] of byFamily) {
    const sorted = [...rows].sort((a, b) => {
      if (a.expirationAt !== b.expirationAt) {
        return a.expirationAt < b.expirationAt ? -1 : 1;
      }
      return a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0;
    });
    const picked = sorted.slice(0, 2);
    const first = picked[0];
    if (first === undefined) {
      continue;
    }
    const contracts: FuturesFamilyContractDto[] = [
      {
        role: 'near',
        ticker: first.ticker,
        instrumentUid: first.instrumentUid,
        name: first.name,
        expirationAt: first.expirationAt,
        classCode: first.classCode,
        isActive: first.isActive,
      },
    ];
    const second = picked[1];
    if (second !== undefined) {
      contracts.push({
        role: 'next',
        ticker: second.ticker,
        instrumentUid: second.instrumentUid,
        name: second.name,
        expirationAt: second.expirationAt,
        classCode: second.classCode,
        isActive: second.isActive,
      });
    }
    families.push({
      family,
      underlyingAssetName: first.underlyingAssetName,
      contracts,
    });
  }

  families.sort((a, b) => (a.family < b.family ? -1 : a.family > b.family ? 1 : 0));
  return families;
}
