import type { UnderlyingAssetType } from '@moex/domain';

/**
 * Maps T-Invest Future.asset_type / AssetType labels into domain underlying categories.
 * Docs (InstrumentsService.Futures / Future.asset_type): commodity | currency | security | index.
 * Live SDK may also emit TYPE_* or ASSET_TYPE_* labels; Indicatives must not use this mapper.
 *
 * @see https://developer.tbank.ru/invest/api/instruments-service-futures
 * @see https://tinkoff.github.io/investAPI/instruments/#future
 */
export function mapTinvestUnderlyingAssetType(
  raw: string | number | null | undefined,
): UnderlyingAssetType {
  if (raw === null || raw === undefined) {
    return 'other';
  }
  if (typeof raw === 'number') {
    // AssetType enum: UNSPECIFIED=0, CURRENCY=1, COMMODITY=2, INDEX=3, SECURITY=4
    if (raw === 2) {
      return 'commodity';
    }
    if (raw === 3) {
      return 'equity_index';
    }
    if (raw === 1) {
      return 'currency';
    }
    if (raw === 4) {
      return 'share';
    }
    return 'other';
  }
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^asset_type_/, '')
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
  // Future.asset_type uses "security" for equity/share underlyings (not "share").
  if (
    normalized === 'security' ||
    normalized === 'share' ||
    normalized === 'equity' ||
    normalized === 'stock'
  ) {
    return 'share';
  }
  return 'other';
}

/**
 * Prefer Future.sector when it maps to a known category; otherwise Future.asset_type.
 * Sector is often empty or an economy label — fall back to asset_type in those cases.
 */
export function resolveFuturesListCategory(
  sector: string | null | undefined,
  assetType: string | number | null | undefined,
): UnderlyingAssetType {
  const fromSector = mapTinvestUnderlyingAssetType(sector);
  if (fromSector !== 'other') {
    return fromSector;
  }
  return mapTinvestUnderlyingAssetType(assetType);
}

/** Crude contract family from ticker prefix (e.g. BRH6 → BR, SiH6 → Si). */
export function deriveContractFamily(ticker: string): string | null {
  const trimmed = ticker.trim();
  if (trimmed.length < 2) {
    return null;
  }
  const match = /^([A-Za-z]+)[FGHJKMNQUVXZ]\d{1,2}$/.exec(trimmed);
  if (match?.[1]) {
    return match[1];
  }
  return trimmed.slice(0, 2);
}
