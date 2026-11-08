import { z } from 'zod';
import { decimalStringSchema, instrumentIdSchema, isoDateTimeSchema } from './brands.js';
import { dataProviderSchema, dataQualitySchema } from './enums.js';

export const quoteSchema = z
  .object({
    instrumentId: instrumentIdSchema,
    provider: dataProviderSchema,
    last: decimalStringSchema.nullable(),
    bid: decimalStringSchema.nullable(),
    ask: decimalStringSchema.nullable(),
    eventTime: isoDateTimeSchema,
    receivedAt: isoDateTimeSchema,
    quality: dataQualitySchema,
  })
  .superRefine((value, ctx) => {
    if (value.last === null && value.bid === null && value.ask === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'quote must include at least one of last, bid, or ask',
        path: ['last'],
      });
    }

    if (value.bid !== null && value.ask !== null && Number(value.bid) > Number(value.ask)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bid must be less than or equal to ask',
        path: ['bid'],
      });
    }
  });
export type Quote = z.infer<typeof quoteSchema>;

export function parseQuote(input: unknown): Quote {
  return quoteSchema.parse(input);
}
