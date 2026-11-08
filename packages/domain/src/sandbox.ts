import { z } from 'zod';
import {
  decimalStringSchema,
  isoDateTimeSchema,
  uuidSchema,
  type DecimalString,
  type IsoDateTime,
  type UUID,
} from './brands.js';
import {
  sandboxLocalAccountStatusSchema,
  sandboxOperationStatusSchema,
  sandboxOperationTypeSchema,
  sandboxProviderAccountStatusSchema,
  type SandboxLocalAccountStatus,
  type SandboxOperationStatus,
  type SandboxOperationType,
  type SandboxProviderAccountStatus,
} from './enums.js';

export const sandboxAccountSchema = z.object({
  id: uuidSchema,
  providerAccountId: z.string().min(1),
  environment: z.literal('sandbox'),
  displayName: z.string().nullable(),
  providerStatus: sandboxProviderAccountStatusSchema,
  localStatus: sandboxLocalAccountStatusSchema,
  openedAt: isoDateTimeSchema.nullable(),
  closedAt: isoDateTimeSchema.nullable(),
  lastVerifiedAt: isoDateTimeSchema.nullable(),
});
export type SandboxAccount = z.infer<typeof sandboxAccountSchema>;

export const sandboxAccountOperationSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema.nullable(),
  type: sandboxOperationTypeSchema,
  status: sandboxOperationStatusSchema,
  idempotencyKey: z.string().min(1),
  correlationId: z.string().min(1),
  createdAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  errorMessage: z.string().nullable().optional(),
  requestHash: z.string().nullable().optional(),
});
export type SandboxAccountOperation = z.infer<typeof sandboxAccountOperationSchema>;

export const sandboxPortfolioSchema = z.object({
  providerAccountId: z.string().min(1),
  totalAmount: decimalStringSchema.nullable(),
  currency: z.union([z.literal('RUB'), z.string().length(3)]).nullable(),
  expectedYield: decimalStringSchema.nullable(),
  asOf: isoDateTimeSchema,
});
export type SandboxPortfolio = z.infer<typeof sandboxPortfolioSchema>;

export const sandboxPositionSchema = z.object({
  providerAccountId: z.string().min(1),
  providerInstrumentId: z.string().min(1),
  quantity: decimalStringSchema,
  averagePrice: decimalStringSchema.nullable(),
  currentPrice: decimalStringSchema.nullable(),
  currency: z.string().length(3).nullable(),
});
export type SandboxPosition = z.infer<typeof sandboxPositionSchema>;

export function parseSandboxAccount(input: unknown): SandboxAccount {
  return sandboxAccountSchema.parse(input);
}

export function parseSandboxAccountOperation(input: unknown): SandboxAccountOperation {
  return sandboxAccountOperationSchema.parse(input);
}

export type {
  DecimalString,
  IsoDateTime,
  SandboxLocalAccountStatus,
  SandboxOperationStatus,
  SandboxOperationType,
  SandboxProviderAccountStatus,
  UUID,
};
