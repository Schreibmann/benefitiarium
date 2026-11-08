import { z } from 'zod';

export const assetTypeSchema = z.enum(['share', 'bond', 'etf', 'future', 'currency', 'index']);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const candleIntervalSchema = z.enum([
  '5s',
  '10s',
  '30s',
  '1m',
  '2m',
  '3m',
  '5m',
  '10m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '1d',
  '1w',
  '1M',
]);
export type CandleInterval = z.infer<typeof candleIntervalSchema>;

export const dataProviderSchema = z.enum(['t-invest', 'moex-iss', 'paper', 'manual-import']);
export type DataProvider = z.infer<typeof dataProviderSchema>;

export const volumeUnitSchema = z.enum(['lots', 'contracts', 'shares', 'currency', 'unknown']);
export type VolumeUnit = z.infer<typeof volumeUnitSchema>;

export const dataQualitySchema = z.enum(['good', 'delayed', 'incomplete', 'suspect']);
export type DataQuality = z.infer<typeof dataQualitySchema>;

export const priceTypeSchema = z.enum(['currency', 'points', 'percent']);
export type PriceType = z.infer<typeof priceTypeSchema>;

/** Futures underlying category; null/omitted for non-futures specs. */
export const underlyingAssetTypeSchema = z.enum([
  'commodity',
  'equity_index',
  'currency',
  'share',
  'other',
]);
export type UnderlyingAssetType = z.infer<typeof underlyingAssetTypeSchema>;

export const sandboxProviderAccountStatusSchema = z.enum(['new', 'open', 'closed', 'unknown']);
export type SandboxProviderAccountStatus = z.infer<typeof sandboxProviderAccountStatusSchema>;

export const sandboxLocalAccountStatusSchema = z.enum([
  'new',
  'active',
  'closed',
  'missing',
  'unknown',
]);
export type SandboxLocalAccountStatus = z.infer<typeof sandboxLocalAccountStatusSchema>;

export const sandboxOperationTypeSchema = z.enum(['create', 'sync', 'fund', 'close']);
export type SandboxOperationType = z.infer<typeof sandboxOperationTypeSchema>;

export const sandboxOperationStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'unknown',
]);
export type SandboxOperationStatus = z.infer<typeof sandboxOperationStatusSchema>;

export const orderSideSchema = z.enum(['buy', 'sell']);
export type OrderSide = z.infer<typeof orderSideSchema>;

export const orderTypeSchema = z.enum(['limit', 'market', 'best_price', 'stop']);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const orderStatusSchema = z.enum([
  'created',
  'submitting',
  'unknown',
  'new',
  'active',
  'partially_filled',
  'cancel_pending',
  'filled',
  'cancelled',
  'rejected',
  'expired',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const tradingModeSchema = z.enum(['manual', 'paper', 'sandbox', 'live_guarded', 'live']);
export type TradingMode = z.infer<typeof tradingModeSchema>;

export const signalDirectionSchema = z.enum(['buy', 'sell', 'close', 'hold']);
export type SignalDirection = z.infer<typeof signalDirectionSchema>;

export const signalStatusSchema = z.enum([
  'new',
  'accepted',
  'rejected',
  'expired',
  'executed',
  'invalidated',
]);
export type SignalStatus = z.infer<typeof signalStatusSchema>;
