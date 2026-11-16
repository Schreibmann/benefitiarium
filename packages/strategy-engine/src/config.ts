import { candleIntervalSchema } from '@moex/domain';
import { z } from 'zod';

export const TRADING_SIGNAL_ENGINE_ALGORITHM_ID = 'BENEFITIARIUM_TRADING_SIGNAL_ENGINE' as const;
export const TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION = '1.0.0' as const;

const strategyIdSchema = z.enum([
  'TREND_PULLBACK',
  'BREAKOUT_RETEST',
  'FAILED_BREAKOUT',
  'RANGE_REVERSAL',
]);

const decimalPositiveSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, 'must be a non-negative decimal string')
  .refine((value) => Number(value) > 0, 'must be > 0');

export const tradingSignalEngineConfigSchema = z
  .object({
    algorithmId: z
      .literal(TRADING_SIGNAL_ENGINE_ALGORITHM_ID)
      .default(TRADING_SIGNAL_ENGINE_ALGORITHM_ID),
    algorithmVersion: z
      .literal(TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION)
      .default(TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION),
    configVersion: z.string().min(1),
    analysisTimeframes: z.array(candleIntervalSchema).min(1),
    enabledStrategies: z.array(strategyIdSchema).default(['TREND_PULLBACK', 'BREAKOUT_RETEST']),
    commissionPerUnitRoundTrip: decimalPositiveSchema.optional(),
    defaultPointValueOverride: decimalPositiveSchema.optional(),
    exchangeTimezone: z.string().min(1).default('Europe/Moscow'),
    allowOpenCandleForCandidates: z.boolean().default(true),
    /** Confirmed signals require closed candles (spec non-goal). */
    confirmOnlyOnClosedCandles: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.confirmOnlyOnClosedCandles === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'confirmOnlyOnClosedCandles must remain true for the initial release',
        path: ['confirmOnlyOnClosedCandles'],
      });
    }
  });

export type TradingSignalEngineConfig = z.infer<typeof tradingSignalEngineConfigSchema>;

export function parseTradingSignalEngineConfig(input: unknown): TradingSignalEngineConfig {
  return tradingSignalEngineConfigSchema.parse(input);
}
