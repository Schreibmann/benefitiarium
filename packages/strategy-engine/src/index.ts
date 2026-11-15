export {
  adaptFibonacciPivotSet,
  type FibonacciPivotAdapterInput,
  type FibonacciPivotAdapterResult,
  resolvePivotAnchorPeriod,
} from './adapters/fibonacci-pivot.js';
export {
  type MapInstrumentSpecOptions,
  type MapInstrumentSpecResult,
  mapDomainInstrumentSpec,
} from './adapters/instrument-spec.js';
export {
  adaptVolumeProfile,
  emptyVolumeProfileUnavailable,
  type VolumeProfileAdapterInput,
  type VolumeProfileAdapterResult,
} from './adapters/volume-profile.js';
export {
  parseTradingSignalEngineConfig,
  TRADING_SIGNAL_ENGINE_ALGORITHM_ID,
  TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION,
  type TradingSignalEngineConfig,
  tradingSignalEngineConfigSchema,
} from './config.js';
export {
  createMarketEventNormalizerState,
  type MarketEventNormalizerState,
  type NormalizeMarketEventResult,
  normalizeMarketEvent,
} from './normalizer.js';
export { isReasonCode, REASON_CODES, type ReasonCode } from './reason-codes.js';
export {
  type CandleBarKey,
  candleBarKey,
  type EngineCandle,
  type EngineCandleStatus,
  type EngineDirection,
  type EngineInstrumentSpec,
  type EngineLifecycleState,
  type EngineMarketEvent,
  type EngineMarketEventKind,
  type EnginePivotLevel,
  type EnginePivotSet,
  type EngineSessionProfile,
  type EngineVolumeProfile,
  type EngineVolumeProfileBin,
  type PivotLevelId,
  type QuarantinedEvent,
  type StrategyId,
  type ValidationIssue,
  type ValidationResult,
  type VolumeProfileQualityLabel,
  type VolumeProfileScope,
} from './types.js';
export {
  isClosedCandleEligibleForConfirmation,
  validateInstrumentSpec,
  validateOhlcv,
} from './validate.js';

export const packageName = '@moex/strategy-engine' as const;
