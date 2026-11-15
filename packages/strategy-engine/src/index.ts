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
  type AnalyzedPriceLevel,
  analyzeFibonacciLevels,
  type ContextualLevelRole,
  DEFAULT_FIBONACCI_LEVEL_CONFIG,
  type FibonacciAnalysis,
  type FibonacciLevelConfig,
  type LevelSource,
} from './analyzers/fibonacci-levels.js';
export {
  analyzeMarketStructure,
  type BosEvent,
  DEFAULT_MARKET_STRUCTURE_CONFIG,
  type MarketRegime,
  type MarketStructureConfig,
  type MarketStructureSnapshot,
  type StructureLabel,
  SWING_METHOD_ID,
  SWING_METHOD_VERSION,
  type SwingKind,
  type SwingPoint,
} from './analyzers/market-structure.js';
export {
  analyzePriceAction,
  DEFAULT_PRICE_ACTION_CONFIG,
  type PriceActionConfig,
  type PriceActionEvidence,
  type PriceActionPattern,
  strongestDirectionalEvidence,
} from './analyzers/price-action.js';
export {
  parseTradingSignalEngineConfig,
  TRADING_SIGNAL_ENGINE_ALGORITHM_ID,
  TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION,
  type TradingSignalEngineConfig,
  tradingSignalEngineConfigSchema,
} from './config.js';
export {
  type ConfluenceConfig,
  type ConfluenceZone,
  clusterPriceLevels,
  DEFAULT_CONFLUENCE_CONFIG,
  type EvidenceFamily,
  evidenceFamilyForSource,
  levelsFromVolumeProfile,
} from './confluence/confluence.js';
export {
  type AtrPoint,
  computeConfirmedAtrSeries,
  DEFAULT_ATR_PERIOD,
  latestConfirmedAtr,
  trueRange,
} from './features/atr.js';
export {
  attachFallbackRvol,
  type CandleFeatures,
  computeCandleFeatures,
  computeFallbackRvol,
  DEFAULT_RVOL_EVIDENCE_BUCKETS,
  DEFAULT_RVOL_LOOKBACK,
  type RvolEvidenceBucket,
  rvolToEvidenceScore,
} from './features/candle-features.js';
export {
  normalizedDistanceToLevel,
  normalizedDistanceToZone,
  type PriceZone,
  roundProtectiveStop,
  type StopRoundingSide,
} from './features/distance.js';
export {
  type DataGateInput,
  type DuplicateCooldownGateInput,
  evaluateDataGates,
  evaluateDuplicateCooldownGates,
  evaluateHardGates,
  evaluateMarketGates,
  evaluateRewardRiskGate,
  type GateResult,
  type HardGateBundleInput,
  type HardGateBundleResult,
  isStopDistanceValid,
  type MarketGateInput,
  type RiskRewardGateInput,
  stopDistanceTicks,
} from './gates/eligibility.js';
export {
  buildMtfContextSnapshot,
  candlesAsOf,
  type MtfAlignment,
  type MtfAsOfCandleSet,
  type MtfContextSnapshot,
  type MtfRoleConfig,
  scoreMtfAlignment,
  type TimeframeRole,
} from './mtf/as-of.js';
export {
  createMarketEventNormalizerState,
  type MarketEventNormalizerState,
  type NormalizeMarketEventResult,
  normalizeMarketEvent,
} from './normalizer.js';
export { isReasonCode, REASON_CODES, type ReasonCode } from './reason-codes.js';
export {
  buildEntryReferences,
  computeStructuralStop,
  DEFAULT_ENTRY_RISK_CONFIG,
  type EntryReferences,
  type EntryRiskConfig,
  type StopLossResult,
  selectTakeProfitCandidates,
  type TakeProfitCandidate,
  type TakeProfitSelection,
} from './risk/entry-stop-target.js';
export {
  DEFAULT_POSITION_SIZING_CONFIG,
  type PositionSizingConfig,
  type PositionSizingResult,
  sizePosition,
} from './risk/position-sizing.js';
export {
  type CategoryEvidenceInput,
  type DirectionalEvidenceInput,
  fibonacciEvidence,
  mtfEvidence,
  priceActionEvidence,
  regimeEvidence,
  type ScoreSignalInput,
  scoreSignal,
  volumeEvidence,
  volumeProfileEvidence,
} from './scoring/score-signal.js';
export {
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_SCORING_THRESHOLDS,
  type ScoreCategory,
  type ScoreClassification,
  type ScoreContribution,
  type ScoreWeightConfig,
  type ScoringThresholdConfig,
  type SignalScore,
} from './scoring/types.js';
export {
  type ConfirmedSignalDecision,
  type ConfirmSignalInput,
  confirmSignal,
} from './signal/confirm-signal.js';
export {
  type AnalysisSnapshot,
  type BuildAnalysisSnapshotInput,
  buildAnalysisSnapshot,
} from './snapshot/analysis-snapshot.js';
export {
  type BreakoutRetestConfig,
  type BreakoutRetestInput,
  type BreakoutRetestResult,
  type BreakoutRetestState,
  DEFAULT_BREAKOUT_RETEST_CONFIG,
  updateBreakoutRetestSetup,
} from './strategies/breakout-retest.js';
export {
  DEFAULT_TREND_PULLBACK_CONFIG,
  type TrendPullbackConfig,
  type TrendPullbackInput,
  updateTrendPullbackSetup,
} from './strategies/trend-pullback.js';
export type {
  SetupStatus,
  SetupUpdateResult,
  TradingSetup,
} from './strategies/types.js';
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
