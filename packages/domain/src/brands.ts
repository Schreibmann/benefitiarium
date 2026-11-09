import { z } from 'zod';

const DECIMAL_STRING_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const uuidSchema = z.string().uuid().brand<'UUID'>();
export type UUID = z.infer<typeof uuidSchema>;

export const instrumentIdSchema = uuidSchema;
export type InstrumentId = z.infer<typeof instrumentIdSchema>;

export const decimalStringSchema = z
  .string()
  .regex(DECIMAL_STRING_PATTERN, 'Invalid decimal string')
  .brand<'DecimalString'>();
export type DecimalString = z.infer<typeof decimalStringSchema>;

export const isoDateTimeSchema = z.string().datetime({ offset: true }).brand<'IsoDateTime'>();
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

export function parseUuid(value: string): UUID {
  return uuidSchema.parse(value);
}

export function parseInstrumentId(value: string): InstrumentId {
  return instrumentIdSchema.parse(value);
}

export function parseDecimalString(value: string): DecimalString {
  return decimalStringSchema.parse(value);
}

export function parseIsoDateTime(value: string): IsoDateTime {
  const accepted = isoDateTimeSchema.parse(value);
  // Canonical UTC form (ms + Z) so Postgres offset strings and Date#toISOString match.
  return isoDateTimeSchema.parse(new Date(accepted).toISOString());
}

export function tryParseUuid(value: string): UUID | null {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function tryParseDecimalString(value: string): DecimalString | null {
  const result = decimalStringSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function tryParseIsoDateTime(value: string): IsoDateTime | null {
  const result = isoDateTimeSchema.safeParse(value);
  if (!result.success) {
    return null;
  }
  const normalized = isoDateTimeSchema.safeParse(new Date(result.data).toISOString());
  return normalized.success ? normalized.data : null;
}
