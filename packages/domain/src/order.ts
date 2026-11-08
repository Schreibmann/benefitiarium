import { z } from 'zod';
import {
  decimalStringSchema,
  instrumentIdSchema,
  isoDateTimeSchema,
  uuidSchema,
} from './brands.js';
import { orderSideSchema, orderStatusSchema, orderTypeSchema, tradingModeSchema } from './enums.js';

export const orderSchema = z
  .object({
    id: uuidSchema,
    accountId: uuidSchema,
    instrumentId: instrumentIdSchema,
    proposalId: uuidSchema.nullable(),
    clientOrderId: uuidSchema,
    brokerOrderId: z.string().min(1).nullable(),
    side: orderSideSchema,
    orderType: orderTypeSchema,
    quantityLots: z.number().int().positive(),
    limitPrice: decimalStringSchema.nullable(),
    status: orderStatusSchema,
    mode: tradingModeSchema,
    submittedAt: isoDateTimeSchema.nullable(),
    updatedAt: isoDateTimeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.orderType === 'limit' && value.limitPrice === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'limit orders require limitPrice',
        path: ['limitPrice'],
      });
    }
  });
export type Order = z.infer<typeof orderSchema>;

export function parseOrder(input: unknown): Order {
  return orderSchema.parse(input);
}
