import { z } from 'zod';
import {
  decimalStringSchema,
  instrumentIdSchema,
  isoDateTimeSchema,
  uuidSchema,
} from './brands.js';
import {
  candleIntervalSchema,
  dataQualitySchema,
  signalDirectionSchema,
  signalStatusSchema,
} from './enums.js';

export const signalSchema = z
  .object({
    id: uuidSchema,
    strategyVersionId: uuidSchema,
    instrumentId: instrumentIdSchema,
    interval: candleIntervalSchema,
    eventKey: z.string().min(1),
    direction: signalDirectionSchema,
    status: signalStatusSchema,
    referencePrice: decimalStringSchema,
    entryMin: decimalStringSchema.nullable(),
    entryMax: decimalStringSchema.nullable(),
    stopLoss: decimalStringSchema.nullable(),
    takeProfit: z.array(decimalStringSchema),
    confidence: z.number().min(0).max(1).nullable(),
    reasons: z.array(z.string().min(1)).min(1),
    features: z.record(z.union([z.string(), z.number(), z.boolean()])),
    dataQuality: dataQualitySchema,
    sourceEventTime: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    validUntil: isoDateTimeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.validUntil <= value.createdAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validUntil must be greater than createdAt',
        path: ['validUntil'],
      });
    }

    if (
      value.entryMin !== null &&
      value.entryMax !== null &&
      Number(value.entryMin) > Number(value.entryMax)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entryMin must be less than or equal to entryMax',
        path: ['entryMin'],
      });
    }
  });
export type Signal = z.infer<typeof signalSchema>;

export function parseSignal(input: unknown): Signal {
  return signalSchema.parse(input);
}
