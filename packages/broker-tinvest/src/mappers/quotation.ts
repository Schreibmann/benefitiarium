/**
 * Normalize T-Invest Quotation / MoneyValue / Decimal-like values to decimal strings.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function moneyPartsToString(units: number, nano: number): string {
  const sign = units < 0 || nano < 0 ? '-' : '';
  const absUnits = Math.abs(units);
  const absNano = Math.abs(nano);
  if (absNano === 0) {
    return `${sign}${absUnits}`;
  }
  const frac = String(absNano).padStart(9, '0').replace(/0+$/, '');
  return `${sign}${absUnits}.${frac}`;
}

/** Convert Quotation, MoneyValue, Decimal, number, or string into a decimal string. */
export function quotationToDecimalString(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${field}`);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (isRecord(value)) {
    const units = value.units;
    const nano = value.nano;
    if (typeof units === 'number' && typeof nano === 'number') {
      return moneyPartsToString(units, nano);
    }
    if (typeof units === 'bigint' && typeof nano === 'number') {
      return moneyPartsToString(Number(units), nano);
    }
    if (typeof value.toString === 'function') {
      const text = value.toString();
      if (typeof text === 'string' && text.length > 0 && text !== '[object Object]') {
        return text;
      }
    }
  }
  throw new Error(`Unsupported ${field} type`);
}

export function optionalQuotationToDecimalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return quotationToDecimalString(value, field);
}
