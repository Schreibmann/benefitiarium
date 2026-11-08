import {
  parseInstrument,
  parseInstrumentId,
  parseInstrumentSpec,
  parseIsoDateTime,
  parseSandboxAccount,
  parseSandboxAccountOperation,
  parseUuid,
  type Instrument,
  type InstrumentSpec,
  type SandboxAccount,
  type SandboxAccountOperation,
} from '@moex/domain';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${key}`);
  }
  return value;
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string|null field ${key}`);
  }
  return value;
}

function numericToDecimalString(value: unknown, field: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  throw new Error(`Expected decimal field ${field}`);
}

function optionalNumericToDecimalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return numericToDecimalString(value, field);
}

function asIso(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected ISO datetime field ${field}`);
  }
  return value;
}

export function mapInstrumentRow(row: unknown): Instrument {
  if (!isRecord(row)) {
    throw new Error('Instrument row must be an object');
  }
  return parseInstrument({
    id: parseInstrumentId(requiredString(row, 'id')),
    assetType: requiredString(row, 'assetType'),
    ticker: requiredString(row, 'ticker'),
    name: requiredString(row, 'name'),
    exchange: requiredString(row, 'exchange'),
    currency: optionalString(row, 'currency'),
    isActive: row.isActive === true,
  });
}

export function mapInstrumentSpecRow(row: unknown): InstrumentSpec {
  if (!isRecord(row)) {
    throw new Error('InstrumentSpec row must be an object');
  }
  const rawValue = row.raw;
  const raw = isRecord(rawValue) ? rawValue : {};
  return parseInstrumentSpec({
    instrumentId: parseInstrumentId(requiredString(row, 'instrumentId')),
    validFrom: parseIsoDateTime(asIso(row.validFrom, 'validFrom')),
    validTo:
      row.validTo === null || row.validTo === undefined
        ? null
        : parseIsoDateTime(asIso(row.validTo, 'validTo')),
    lotSize: typeof row.lotSize === 'number' ? row.lotSize : Number(row.lotSize),
    minPriceIncrement: numericToDecimalString(row.minPriceIncrement, 'minPriceIncrement'),
    priceCurrency: optionalString(row, 'priceCurrency'),
    priceType: requiredString(row, 'priceType'),
    contractMultiplier: optionalNumericToDecimalString(
      row.contractMultiplier,
      'contractMultiplier',
    ),
    expirationAt:
      row.expirationAt === null || row.expirationAt === undefined
        ? null
        : parseIsoDateTime(asIso(row.expirationAt, 'expirationAt')),
    marginInitial: optionalNumericToDecimalString(row.marginInitial, 'marginInitial'),
    underlyingProviderPositionUid: optionalString(row, 'underlyingProviderPositionUid'),
    underlyingAssetType: optionalString(row, 'underlyingAssetType'),
    underlyingAssetName: optionalString(row, 'underlyingAssetName'),
    contractFamily: optionalString(row, 'contractFamily'),
    priceUnit: optionalString(row, 'priceUnit'),
    minPriceIncrementAmount: optionalNumericToDecimalString(
      row.minPriceIncrementAmount,
      'minPriceIncrementAmount',
    ),
    raw,
  });
}

export function mapSandboxAccountRow(row: unknown): SandboxAccount {
  if (!isRecord(row)) {
    throw new Error('SandboxAccount row must be an object');
  }
  return parseSandboxAccount({
    id: parseUuid(requiredString(row, 'id')),
    providerAccountId: requiredString(row, 'providerAccountId'),
    environment: 'sandbox',
    displayName: optionalString(row, 'displayName'),
    providerStatus: optionalString(row, 'providerStatus') ?? 'unknown',
    localStatus: optionalString(row, 'localStatus') ?? 'unknown',
    openedAt:
      row.openedAt === null || row.openedAt === undefined
        ? null
        : parseIsoDateTime(asIso(row.openedAt, 'openedAt')),
    closedAt:
      row.closedAt === null || row.closedAt === undefined
        ? null
        : parseIsoDateTime(asIso(row.closedAt, 'closedAt')),
    lastVerifiedAt:
      row.lastVerifiedAt === null || row.lastVerifiedAt === undefined
        ? null
        : parseIsoDateTime(asIso(row.lastVerifiedAt, 'lastVerifiedAt')),
  });
}

export function mapSandboxOperationRow(row: unknown): SandboxAccountOperation {
  if (!isRecord(row)) {
    throw new Error('SandboxAccountOperation row must be an object');
  }
  return parseSandboxAccountOperation({
    id: parseUuid(requiredString(row, 'id')),
    accountId:
      row.accountId === null || row.accountId === undefined
        ? null
        : parseUuid(requiredString(row, 'accountId')),
    type: requiredString(row, 'type'),
    status: requiredString(row, 'status'),
    idempotencyKey: requiredString(row, 'idempotencyKey'),
    correlationId: requiredString(row, 'correlationId'),
    createdAt: parseIsoDateTime(asIso(row.createdAt, 'createdAt')),
    completedAt:
      row.completedAt === null || row.completedAt === undefined
        ? null
        : parseIsoDateTime(asIso(row.completedAt, 'completedAt')),
    errorMessage: optionalString(row, 'errorMessage'),
    requestHash: optionalString(row, 'requestHash'),
  });
}
