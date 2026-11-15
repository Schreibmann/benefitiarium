import type { MarketRegime } from '../analyzers/market-structure.js';
import type { PriceActionEvidence } from '../analyzers/price-action.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import { rvolToEvidenceScore } from '../features/candle-features.js';
import { clamp01 } from '../features/math.js';
import type { MtfAlignment } from '../mtf/as-of.js';
import type { EngineDirection, StrategyId } from '../types.js';
import {
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_SCORING_THRESHOLDS,
  type ScoreCategory,
  type ScoreClassification,
  type ScoreContribution,
  type ScoreWeightConfig,
  type ScoringThresholdConfig,
  type SignalScore,
} from './types.js';

export type CategoryEvidenceInput = {
  available: boolean;
  normalizedValue: number | null;
  rawValue?: number | null;
  reasonCodes?: string[];
};

export type DirectionalEvidenceInput = {
  marketRegime: CategoryEvidenceInput;
  fibonacci: CategoryEvidenceInput;
  volumeProfile: CategoryEvidenceInput;
  priceAction: CategoryEvidenceInput;
  volume: CategoryEvidenceInput;
  mtf: CategoryEvidenceInput;
};

export type ScoreSignalInput = {
  long: DirectionalEvidenceInput;
  short: DirectionalEvidenceInput;
  configVersion: string;
  weights?: Partial<ScoreWeightConfig>;
  thresholds?: Partial<ScoringThresholdConfig>;
  requiredCategories?: readonly ScoreCategory[];
};

function totalWeight(weights: ScoreWeightConfig): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
}

function contributionFor(
  category: ScoreCategory,
  evidence: CategoryEvidenceInput,
  weights: ScoreWeightConfig,
): ScoreContribution {
  const weight = weights[category];
  if (!evidence.available || evidence.normalizedValue === null) {
    return {
      category,
      rawValue: evidence.rawValue ?? null,
      normalizedValue: null,
      weight,
      contribution: 0,
      available: false,
      reasonCodes: evidence.reasonCodes ?? ['REQUIRED_FEATURE_UNAVAILABLE'],
    };
  }
  const normalizedValue = clamp01(evidence.normalizedValue);
  return {
    category,
    rawValue: evidence.rawValue ?? normalizedValue,
    normalizedValue,
    weight,
    contribution: weight * normalizedValue,
    available: true,
    reasonCodes: evidence.reasonCodes ?? [],
  };
}

function scoreDirection(
  evidence: DirectionalEvidenceInput,
  weights: ScoreWeightConfig,
  thresholds: ScoringThresholdConfig,
  requiredCategories: readonly ScoreCategory[],
): {
  score: number | null;
  coverage: number;
  contributions: ScoreContribution[];
  reasonCodes: string[];
} {
  const contributions: ScoreContribution[] = [
    contributionFor('MARKET_REGIME', evidence.marketRegime, weights),
    contributionFor('FIBONACCI', evidence.fibonacci, weights),
    contributionFor('VOLUME_PROFILE', evidence.volumeProfile, weights),
    contributionFor('PRICE_ACTION', evidence.priceAction, weights),
    contributionFor('VOLUME', evidence.volume, weights),
    contributionFor('MTF', evidence.mtf, weights),
  ];

  const available = contributions.filter((item) => item.available);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const coverage = availableWeight / totalWeight(weights);
  const reasonCodes = contributions.flatMap((item) => item.reasonCodes);

  for (const required of requiredCategories) {
    const item = contributions.find((contribution) => contribution.category === required);
    if (item === undefined || !item.available) {
      return {
        score: null,
        coverage,
        contributions,
        reasonCodes: [
          ...reasonCodes,
          'REQUIRED_FEATURE_UNAVAILABLE',
          'SCORE_COVERAGE_INSUFFICIENT',
        ],
      };
    }
  }

  if (coverage < thresholds.minScoreCoverage || available.length === 0) {
    return {
      score: null,
      coverage,
      contributions,
      reasonCodes: [...reasonCodes, 'SCORE_COVERAGE_INSUFFICIENT'],
    };
  }

  const score =
    (100 * available.reduce((sum, item) => sum + item.contribution, 0)) / availableWeight;
  return { score, coverage, contributions, reasonCodes };
}

function classify(
  score: number | null,
  coverageOk: boolean,
  thresholds: ScoringThresholdConfig,
): ScoreClassification {
  if (score === null || !coverageOk) {
    return 'NOT_SCORABLE';
  }
  if (score >= thresholds.strongMin) {
    return 'STRONG';
  }
  if (score >= thresholds.confirmedMin) {
    return 'CONFIRMED';
  }
  if (score >= thresholds.watchMin) {
    return 'WATCH';
  }
  return 'NO_SIGNAL';
}

/**
 * Deterministic evidence score. Not a probability of profit.
 */
export function scoreSignal(input: ScoreSignalInput): SignalScore {
  const weights: ScoreWeightConfig = {
    ...DEFAULT_SCORE_WEIGHTS,
    ...input.weights,
  };
  const thresholds: ScoringThresholdConfig = {
    ...DEFAULT_SCORING_THRESHOLDS,
    ...input.thresholds,
  };
  const requiredCategories = input.requiredCategories ?? ['MARKET_REGIME', 'PRICE_ACTION'];

  const long = scoreDirection(input.long, weights, thresholds, requiredCategories);
  const short = scoreDirection(input.short, weights, thresholds, requiredCategories);

  const longOk = long.score !== null && long.coverage >= thresholds.minScoreCoverage;
  const shortOk = short.score !== null && short.coverage >= thresholds.minScoreCoverage;

  let selectedDirection: EngineDirection | null = null;
  let activeScore: number | null = null;
  const reasonCodes = [...long.reasonCodes, ...short.reasonCodes];

  if (long.score !== null && short.score !== null) {
    const gap = Math.abs(long.score - short.score);
    if (gap < thresholds.minDirectionalScoreGap) {
      reasonCodes.push('SCORE_DIRECTIONAL_GAP_INSUFFICIENT');
    } else if (long.score > short.score && longOk) {
      selectedDirection = 'LONG';
      activeScore = long.score;
    } else if (short.score > long.score && shortOk) {
      selectedDirection = 'SHORT';
      activeScore = short.score;
    }
  } else if (long.score !== null && longOk) {
    selectedDirection = 'LONG';
    activeScore = long.score;
  } else if (short.score !== null && shortOk) {
    selectedDirection = 'SHORT';
    activeScore = short.score;
  }

  const classification =
    activeScore === null
      ? classify(null, false, thresholds)
      : classify(activeScore, true, thresholds);

  if (classification === 'NO_SIGNAL' || classification === 'WATCH') {
    reasonCodes.push('SCORE_BELOW_THRESHOLD');
  }

  return {
    longScore: long.score,
    shortScore: short.score,
    longCoverage: long.coverage,
    shortCoverage: short.coverage,
    contributions: {
      long: long.contributions,
      short: short.contributions,
    },
    classification,
    selectedDirection,
    configVersion: input.configVersion,
    reasonCodes: [...new Set(reasonCodes)],
  };
}

export function regimeEvidence(
  regime: MarketRegime,
  direction: EngineDirection,
  strategy: StrategyId,
): CategoryEvidenceInput {
  if (strategy === 'RANGE_REVERSAL') {
    if (regime === 'RANGE') {
      return { available: true, normalizedValue: 1, rawValue: 1, reasonCodes: ['REGIME_RANGE'] };
    }
    if (regime === 'TRANSITION' || regime === 'UNKNOWN') {
      return {
        available: true,
        normalizedValue: 0,
        rawValue: 0,
        reasonCodes: ['REGIME_UNKNOWN'],
      };
    }
  }

  const aligned =
    (direction === 'LONG' && regime === 'BULLISH_TREND') ||
    (direction === 'SHORT' && regime === 'BEARISH_TREND');
  if (aligned) {
    return {
      available: true,
      normalizedValue: 1,
      rawValue: 1,
      reasonCodes: [direction === 'LONG' ? 'REGIME_BULLISH' : 'REGIME_BEARISH'],
    };
  }
  if (regime === 'RANGE') {
    return {
      available: true,
      normalizedValue: 0.4,
      rawValue: 0.4,
      reasonCodes: ['REGIME_RANGE'],
    };
  }
  if (regime === 'TRANSITION' || regime === 'UNKNOWN') {
    return {
      available: true,
      normalizedValue: 0,
      rawValue: 0,
      reasonCodes: ['REGIME_TRANSITION'],
    };
  }
  return {
    available: true,
    normalizedValue: 0,
    rawValue: 0,
    reasonCodes: ['SETUP_OPPOSING_REGIME'],
  };
}

export function fibonacciEvidence(zone: ConfluenceZone | null): CategoryEvidenceInput {
  if (zone === null) {
    return {
      available: true,
      normalizedValue: 0,
      rawValue: 0,
      reasonCodes: ['PIVOT_SET_UNAVAILABLE'],
    };
  }
  const hasFib = zone.members.some(
    (member) => member.source === 'FIB_PIVOT' || member.source === 'FIB_RETRACEMENT',
  );
  if (!hasFib) {
    return { available: true, normalizedValue: 0, rawValue: 0 };
  }
  const strength = zone.familyStrength.FIBONACCI ?? zone.overallStrength;
  const hasBothMethods =
    zone.members.some((member) => member.source === 'FIB_PIVOT') &&
    zone.members.some((member) => member.source === 'FIB_RETRACEMENT');
  const normalized = clamp01(
    hasBothMethods ? Math.max(strength, 0.7) + 0.1 : Math.max(strength, 0.4),
  );
  return {
    available: true,
    normalizedValue: normalized,
    rawValue: strength,
    reasonCodes: ['SETUP_CONFLUENCE_FOUND'],
  };
}

export function volumeProfileEvidence(
  zone: ConfluenceZone | null,
  approximate = false,
): CategoryEvidenceInput {
  if (zone === null) {
    return {
      available: false,
      normalizedValue: null,
      rawValue: null,
      reasonCodes: ['VOLUME_PROFILE_UNAVAILABLE'],
    };
  }
  const strength = zone.familyStrength.VOLUME_PROFILE;
  if (strength === undefined) {
    return {
      available: false,
      normalizedValue: null,
      rawValue: null,
      reasonCodes: ['VOLUME_PROFILE_UNAVAILABLE'],
    };
  }
  const capped = approximate ? Math.min(strength, 0.5) : Math.min(Math.max(strength, 0.6), 0.8);
  return {
    available: true,
    normalizedValue: capped,
    rawValue: strength,
    reasonCodes: approximate ? ['VOLUME_PROFILE_APPROXIMATE'] : [],
  };
}

export function priceActionEvidence(
  evidence: readonly PriceActionEvidence[],
  direction: EngineDirection,
): CategoryEvidenceInput {
  const matched = evidence.filter((item) => item.confirmed && item.direction === direction);
  if (matched.length === 0) {
    return { available: true, normalizedValue: 0, rawValue: 0 };
  }
  const best = matched.reduce((top, item) => (item.strength > top.strength ? item : top));
  return {
    available: true,
    normalizedValue: clamp01(best.strength),
    rawValue: best.strength,
    reasonCodes: ['SETUP_PRICE_ACTION_CONFIRMED'],
  };
}

export function volumeEvidence(rvol: number | null): CategoryEvidenceInput {
  const mapped = rvolToEvidenceScore(rvol);
  if (mapped === null) {
    return {
      available: false,
      normalizedValue: null,
      rawValue: rvol,
      reasonCodes: ['REQUIRED_FEATURE_UNAVAILABLE'],
    };
  }
  return {
    available: true,
    normalizedValue: mapped,
    rawValue: rvol,
  };
}

export function mtfEvidence(alignment: MtfAlignment | null): CategoryEvidenceInput {
  if (alignment === null) {
    return {
      available: false,
      normalizedValue: null,
      rawValue: null,
      reasonCodes: ['MTF_UNAVAILABLE'],
    };
  }
  if (alignment.reasonCodes.includes('MTF_UNAVAILABLE')) {
    return {
      available: false,
      normalizedValue: null,
      rawValue: alignment.score,
      reasonCodes: ['MTF_UNAVAILABLE'],
    };
  }
  if (alignment.blockedByContextOpposition) {
    return {
      available: true,
      normalizedValue: 0,
      rawValue: 0,
      reasonCodes: ['SETUP_OPPOSING_REGIME'],
    };
  }
  return {
    available: true,
    normalizedValue: clamp01(alignment.score),
    rawValue: alignment.score,
    reasonCodes: alignment.reasonCodes,
  };
}
