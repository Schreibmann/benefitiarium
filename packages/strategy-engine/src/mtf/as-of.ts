import type { CandleInterval } from '@moex/domain';
import type { MarketRegime } from '../analyzers/market-structure.js';
import { analyzeMarketStructure } from '../analyzers/market-structure.js';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';

export type TimeframeRole = 'CONTEXT_TF' | 'SETUP_TF' | 'ENTRY_TF';

export type MtfRoleConfig = {
  contextTimeframe: CandleInterval;
  setupTimeframe: CandleInterval;
  entryTimeframe: CandleInterval;
};

export type MtfAsOfCandleSet = {
  timeframe: CandleInterval;
  role: TimeframeRole;
  candles: EngineCandle[];
  latestClosed: EngineCandle | null;
  available: boolean;
};

export type MtfAlignment = {
  direction: 'LONG' | 'SHORT';
  score: number;
  contextRegime: MarketRegime | null;
  setupRegime: MarketRegime | null;
  blockedByContextOpposition: boolean;
  reasonCodes: string[];
};

export type MtfContextSnapshot = {
  decisionTimestamp: number;
  roles: MtfAsOfCandleSet[];
  unavailableRoles: TimeframeRole[];
};

/**
 * At decision timestamp T, only closed candles with closeTimestamp <= T are visible.
 */
export function candlesAsOf(
  candles: readonly EngineCandle[],
  decisionTimestamp: number,
): EngineCandle[] {
  return candles
    .filter(isClosedCandleEligibleForConfirmation)
    .filter((candle) => candle.closeTimestamp <= decisionTimestamp)
    .slice()
    .sort((left, right) => left.timestamp - right.timestamp);
}

export function buildMtfContextSnapshot(input: {
  decisionTimestamp: number;
  roleConfig: MtfRoleConfig;
  candlesByTimeframe: Partial<Record<CandleInterval, readonly EngineCandle[]>>;
}): MtfContextSnapshot {
  const roles: Array<{ role: TimeframeRole; timeframe: CandleInterval }> = [
    { role: 'CONTEXT_TF', timeframe: input.roleConfig.contextTimeframe },
    { role: 'SETUP_TF', timeframe: input.roleConfig.setupTimeframe },
    { role: 'ENTRY_TF', timeframe: input.roleConfig.entryTimeframe },
  ];

  const resolved: MtfAsOfCandleSet[] = roles.map(({ role, timeframe }) => {
    const source = input.candlesByTimeframe[timeframe] ?? [];
    const asOf = candlesAsOf(source, input.decisionTimestamp);
    return {
      timeframe,
      role,
      candles: asOf,
      latestClosed: asOf[asOf.length - 1] ?? null,
      available: asOf.length > 0,
    };
  });

  return {
    decisionTimestamp: input.decisionTimestamp,
    roles: resolved,
    unavailableRoles: resolved.filter((role) => !role.available).map((role) => role.role),
  };
}

function regimeDirection(regime: MarketRegime): 'LONG' | 'SHORT' | 'NEUTRAL' {
  if (regime === 'BULLISH_TREND') {
    return 'LONG';
  }
  if (regime === 'BEARISH_TREND') {
    return 'SHORT';
  }
  return 'NEUTRAL';
}

/**
 * Spec §12.3 initial alignment scoring. Missing HTF → MTF_UNAVAILABLE.
 */
export function scoreMtfAlignment(input: {
  direction: 'LONG' | 'SHORT';
  mtf: MtfContextSnapshot;
  tickSize: string;
}): MtfAlignment {
  const context = input.mtf.roles.find((role) => role.role === 'CONTEXT_TF');
  const setup = input.mtf.roles.find((role) => role.role === 'SETUP_TF');

  if (context === undefined || !context.available || setup === undefined || !setup.available) {
    return {
      direction: input.direction,
      score: 0,
      contextRegime: null,
      setupRegime: null,
      blockedByContextOpposition: false,
      reasonCodes: ['MTF_UNAVAILABLE'],
    };
  }

  const contextStructure = analyzeMarketStructure(context.candles, input.tickSize);
  const setupStructure = analyzeMarketStructure(setup.candles, input.tickSize);
  const contextDir = regimeDirection(contextStructure.regime);
  const setupDir = regimeDirection(setupStructure.regime);

  if (contextDir !== 'NEUTRAL' && contextDir !== input.direction) {
    return {
      direction: input.direction,
      score: 0,
      contextRegime: contextStructure.regime,
      setupRegime: setupStructure.regime,
      blockedByContextOpposition: true,
      reasonCodes: ['SETUP_OPPOSING_REGIME'],
    };
  }

  let score = 0;
  if (contextDir === input.direction && setupDir === input.direction) {
    score = 1;
  } else if (contextDir === input.direction && setupDir === 'NEUTRAL') {
    score = 0.67;
  } else if (contextDir === 'NEUTRAL' && setupDir === input.direction) {
    score = 0.4;
  } else {
    score = 0.2;
  }

  return {
    direction: input.direction,
    score,
    contextRegime: contextStructure.regime,
    setupRegime: setupStructure.regime,
    blockedByContextOpposition: false,
    reasonCodes: [],
  };
}
