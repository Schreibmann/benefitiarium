import { z } from 'zod';
import { decimalStringSchema, instrumentIdSchema, isoDateTimeSchema } from './brands.js';
import {
  candleIntervalSchema,
  dataProviderSchema,
  dataQualitySchema,
  volumeUnitSchema,
} from './enums.js';

export const candleSchema = z
  .object({
    instrumentId: instrumentIdSchema,
    provider: dataProviderSchema,
    interval: candleIntervalSchema,
    timeStart: isoDateTimeSchema,
    timeEnd: isoDateTimeSchema,
    open: decimalStringSchema,
    high: decimalStringSchema,
    low: decimalStringSchema,
    close: decimalStringSchema,
    volume: decimalStringSchema,
    volumeUnit: volumeUnitSchema,
    turnover: decimalStringSchema.nullable(),
    isClosed: z.boolean(),
    quality: dataQualitySchema,
    sourceRevision: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.timeEnd <= value.timeStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeEnd must be greater than timeStart',
        path: ['timeEnd'],
      });
    }

    const open = Number(value.open);
    const high = Number(value.high);
    const low = Number(value.low);
    const close = Number(value.close);
    const volume = Number(value.volume);

    if (!(low <= open && open <= high && low <= close && close <= high && low <= high)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OHLC relationship violated (low <= open/close <= high)',
        path: ['low'],
      });
    }

    if (volume < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'volume must be non-negative',
        path: ['volume'],
      });
    }
  });
export type Candle = z.infer<typeof candleSchema>;

export const marketDataContextSchema = z.object({
  provider: dataProviderSchema,
  receivedAt: isoDateTimeSchema,
  eventTime: isoDateTimeSchema,
  isDelayed: z.boolean(),
  isStale: z.boolean(),
  correlationId: z.string().min(1),
});
export type MarketDataContext = z.infer<typeof marketDataContextSchema>;

export function parseCandle(input: unknown): Candle {
  return candleSchema.parse(input);
}

export function parseMarketDataContext(input: unknown): MarketDataContext {
  return marketDataContextSchema.parse(input);
}
