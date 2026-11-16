export type ScoreCategory =
  | 'MARKET_REGIME'
  | 'FIBONACCI'
  | 'VOLUME_PROFILE'
  | 'PRICE_ACTION'
  | 'VOLUME'
  | 'MTF';

export type ScoreClassification = 'NO_SIGNAL' | 'WATCH' | 'CONFIRMED' | 'STRONG' | 'NOT_SCORABLE';

export type ScoreContribution = {
  category: ScoreCategory;
  rawValue: number | null;
  normalizedValue: number | null;
  weight: number;
  contribution: number;
  available: boolean;
  reasonCodes: string[];
};

export type SignalScore = {
  longScore: number | null;
  shortScore: number | null;
  longCoverage: number;
  shortCoverage: number;
  contributions: {
    long: ScoreContribution[];
    short: ScoreContribution[];
  };
  classification: ScoreClassification;
  selectedDirection: 'LONG' | 'SHORT' | null;
  configVersion: string;
  reasonCodes: string[];
};

export type ScoreWeightConfig = Record<ScoreCategory, number>;

export const DEFAULT_SCORE_WEIGHTS: ScoreWeightConfig = {
  MARKET_REGIME: 15,
  FIBONACCI: 15,
  VOLUME_PROFILE: 20,
  PRICE_ACTION: 20,
  VOLUME: 15,
  MTF: 15,
};

export type ScoringThresholdConfig = {
  minScoreCoverage: number;
  minDirectionalScoreGap: number;
  watchMin: number;
  confirmedMin: number;
  strongMin: number;
};

export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholdConfig = {
  minScoreCoverage: 0.8,
  minDirectionalScoreGap: 15,
  watchMin: 60,
  confirmedMin: 75,
  strongMin: 85,
};
