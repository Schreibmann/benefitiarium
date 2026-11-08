import { z } from 'zod';
import { decimalStringSchema, isoDateTimeSchema, uuidSchema } from './brands.js';

export const fillSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  brokerExecutionId: z.string().min(1).nullable(),
  executedAt: isoDateTimeSchema,
  quantityLots: decimalStringSchema,
  price: decimalStringSchema,
  commission: decimalStringSchema.nullable(),
  currency: z.string().length(3).nullable(),
});
export type Fill = z.infer<typeof fillSchema>;

export function parseFill(input: unknown): Fill {
  return fillSchema.parse(input);
}
