import { z } from 'zod';
import {
  decimalStringSchema,
  instrumentIdSchema,
  isoDateTimeSchema,
  type DecimalString,
  type InstrumentId,
  type IsoDateTime,
} from './brands.js';
import {
  assetTypeSchema,
  dataProviderSchema,
  priceTypeSchema,
  underlyingAssetTypeSchema,
  type AssetType,
  type DataProvider,
  type PriceType,
  type UnderlyingAssetType,
} from './enums.js';

export const instrumentSchema = z.object({
  id: instrumentIdSchema,
  assetType: assetTypeSchema,
  ticker: z.string().min(1),
  name: z.string().min(1),
  exchange: z.literal('MOEX'),
  currency: z.string().length(3).nullable(),
  isActive: z.boolean(),
});
export type Instrument = z.infer<typeof instrumentSchema>;

export const instrumentProviderIdSchema = z.object({
  instrumentId: instrumentIdSchema,
  provider: dataProviderSchema,
  providerInstrumentId: z.string().min(1),
  engine: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  board: z.string().nullable().optional(),
  secid: z.string().nullable().optional(),
  classCode: z.string().nullable().optional(),
  isPrimary: z.boolean(),
});
export type InstrumentProviderId = z.infer<typeof instrumentProviderIdSchema>;

export const instrumentSpecSchema = z
  .object({
    instrumentId: instrumentIdSchema,
    validFrom: isoDateTimeSchema,
    validTo: isoDateTimeSchema.nullable(),
    lotSize: z.number().int().positive(),
    minPriceIncrement: decimalStringSchema,
    priceCurrency: z.string().length(3).nullable(),
    priceType: priceTypeSchema,
    contractMultiplier: decimalStringSchema.nullable(),
    expirationAt: isoDateTimeSchema.nullable(),
    marginInitial: decimalStringSchema.nullable(),
    // Futures metadata; null for non-futures.
    underlyingProviderPositionUid: z.string().nullable().optional(),
    underlyingAssetType: underlyingAssetTypeSchema.nullable().optional(),
    underlyingAssetName: z.string().nullable().optional(),
    contractFamily: z.string().nullable().optional(),
    priceUnit: z.string().nullable().optional(),
    minPriceIncrementAmount: decimalStringSchema.nullable().optional(),
    raw: z.record(z.unknown()),
  })
  .superRefine((value, ctx) => {
    if (value.validTo !== null && value.validTo <= value.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validTo must be greater than validFrom',
        path: ['validTo'],
      });
    }
  });
export type InstrumentSpec = z.infer<typeof instrumentSpecSchema>;

export function parseInstrument(input: unknown): Instrument {
  return instrumentSchema.parse(input);
}

export function parseInstrumentSpec(input: unknown): InstrumentSpec {
  return instrumentSpecSchema.parse(input);
}

export type {
  AssetType,
  DataProvider,
  DecimalString,
  InstrumentId,
  IsoDateTime,
  PriceType,
  UnderlyingAssetType,
};
