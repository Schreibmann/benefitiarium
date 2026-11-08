import type { UnderlyingAssetType } from '@moex/domain';

/**
 * Maps T-Invest Future.assetType / related labels into domain underlying categories.
 * Indicatives are not futures and must not pass through this mapper for contract specs.
 */
export function mapTinvestUnderlyingAssetType(raw: string | null | undefined): UnderlyingAssetType {
  if (raw === null || raw === undefined) {
    return 'other';
  }
  // Live API returns values like TYPE_COMMODITY / TYPE_INDEX / TYPE_CURRENCY.
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^type_/, '')
    .replace(/[\s-]+/g, '_');
  if (normalized === 'commodity' || normalized === 'commodities') {
    return 'commodity';
  }
  if (
    normalized === 'equity_index' ||
    normalized === 'index' ||
    normalized === 'indices' ||
    normalized === 'equityindex'
  ) {
    return 'equity_index';
  }
  if (normalized === 'currency' || normalized === 'currencies' || normalized === 'fx') {
    return 'currency';
  }
  if (normalized === 'share' || normalized === 'equity' || normalized === 'stock') {
    return 'share';
  }
  return 'other';
}

/** Crude contract family from ticker prefix (e.g. BRH6 → BR, SiH6 → Si). */
export function deriveContractFamily(ticker: string): string | null {
  const trimmed = ticker.trim();
  if (trimmed.length < 2) {
    return null;
  }
  const match = /^([A-Za-z]+)[FGHJKMNQUVXZ]\d{1,2}$/.exec(trimmed);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed.slice(0, 2);
}
