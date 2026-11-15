import { compare } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import type { MarketStructureSnapshot } from '../analyzers/market-structure.js';
import { analyzePriceAction, strongestDirectionalEvidence } from '../analyzers/price-action.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import { normalizedDistanceToZone } from '../features/distance.js';
import { toNumber } from '../features/math.js';
import type { MtfAlignment } from '../mtf/as-of.js';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';
import type { SetupUpdateResult, TradingSetup } from './types.js';

export type TrendPullbackConfig = {
  maxChaseDistanceAtr: number;
  requireFibMember: boolean;
  requireSecondaryFamily: boolean;
  setupExpiryBars: number;
};

export const DEFAULT_TREND_PULLBACK_CONFIG: TrendPullbackConfig = {
  maxChaseDistanceAtr: 0.5,
  requireFibMember: true,
  requireSecondaryFamily: true,
  setupExpiryBars: 20,
};

export type TrendPullbackInput = {
  instrumentId: TradingSetup['instrumentId'];
  setupTimeframe: TradingSetup['setupTimeframe'];
  direction: TradingSetup['direction'];
  now: number;
  candles: readonly EngineCandle[];
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  marketStructure: MarketStructureSnapshot;
  zones: readonly ConfluenceZone[];
  mtfAlignment?: MtfAlignment | null;
  existing?: TradingSetup | null;
  config?: Partial<TrendPullbackConfig>;
};

function hasFibMember(zone: ConfluenceZone): boolean {
  return zone.members.some(
    (member) => member.source === 'FIB_PIVOT' || member.source === 'FIB_RETRACEMENT',
  );
}

function hasSecondaryFamily(zone: ConfluenceZone): boolean {
  return zone.familyCount >= 2;
}

function pickZone(
  zones: readonly ConfluenceZone[],
  close: DecimalString,
  atr: DecimalString,
  tickSize: DecimalString,
  config: TrendPullbackConfig,
): ConfluenceZone | null {
  const candidates = zones
    .filter((zone) => (config.requireFibMember ? hasFibMember(zone) : true))
    .filter((zone) => (config.requireSecondaryFamily ? hasSecondaryFamily(zone) : true))
    .map((zone) => ({
      zone,
      distance: toNumber(normalizedDistanceToZone(close, zone, atr, tickSize)),
    }))
    .filter((item) => item.distance <= config.maxChaseDistanceAtr)
    .sort(
      (left, right) =>
        left.distance - right.distance || right.zone.overallStrength - left.zone.overallStrength,
    );

  return candidates[0]?.zone ?? null;
}

function createSetupId(
  instrumentId: string,
  direction: string,
  zoneId: string,
  createdAt: number,
): string {
  return `TREND_PULLBACK:${instrumentId}:${direction}:${zoneId}:${createdAt}`;
}

/**
 * TREND_PULLBACK detector — creates/updates explainable setups, no orders.
 */
export function updateTrendPullbackSetup(input: TrendPullbackInput): SetupUpdateResult | null {
  const config: TrendPullbackConfig = {
    ...DEFAULT_TREND_PULLBACK_CONFIG,
    ...input.config,
  };
  const closed = input.candles.filter(isClosedCandleEligibleForConfirmation);
  const candle = closed[closed.length - 1];
  if (candle === undefined) {
    return null;
  }

  const atr = parseDecimalString(String(input.atr));
  const tick = parseDecimalString(String(input.tickSize));
  const previousStatus = input.existing?.status ?? 'WATCHING';

  const regimeOk =
    (input.direction === 'LONG' && input.marketStructure.regime === 'BULLISH_TREND') ||
    (input.direction === 'SHORT' && input.marketStructure.regime === 'BEARISH_TREND');

  if (!regimeOk) {
    if (input.existing === undefined || input.existing === null) {
      return null;
    }
    const setup: TradingSetup = {
      ...input.existing,
      updatedAt: input.now,
      status: 'INVALIDATED',
      reasonCodes: ['SETUP_OPPOSING_REGIME', ...input.marketStructure.reasonCodes],
    };
    return { setup, transitioned: previousStatus !== 'INVALIDATED', previousStatus };
  }

  if (input.mtfAlignment?.blockedByContextOpposition === true) {
    if (input.existing === undefined || input.existing === null) {
      return null;
    }
    const setup: TradingSetup = {
      ...input.existing,
      updatedAt: input.now,
      status: 'INVALIDATED',
      reasonCodes: ['SETUP_OPPOSING_REGIME'],
    };
    return { setup, transitioned: previousStatus !== 'INVALIDATED', previousStatus };
  }

  const protectedLevel =
    input.direction === 'LONG'
      ? input.marketStructure.lastHigherLow
      : input.marketStructure.lastLowerHigh;
  if (protectedLevel !== null) {
    const broken =
      input.direction === 'LONG'
        ? compare(candle.close, protectedLevel.price) < 0
        : compare(candle.close, protectedLevel.price) > 0;
    if (broken) {
      if (input.existing === undefined || input.existing === null) {
        return null;
      }
      const setup: TradingSetup = {
        ...input.existing,
        updatedAt: input.now,
        status: 'INVALIDATED',
        reasonCodes: ['SETUP_INVALIDATED', 'STRUCTURE_INVALIDATED'],
        invalidationLevel: protectedLevel.price,
      };
      return { setup, transitioned: previousStatus !== 'INVALIDATED', previousStatus };
    }
  }

  const zone = pickZone(input.zones, candle.close, atr, tick, config);
  if (zone === null) {
    if (
      input.existing !== undefined &&
      input.existing !== null &&
      input.existing.status !== 'TRIGGERED'
    ) {
      const existing = input.existing;
      const ageBars = closed.filter((item) => item.timestamp >= existing.createdAt).length;
      if (ageBars >= config.setupExpiryBars) {
        const setup: TradingSetup = {
          ...existing,
          updatedAt: input.now,
          status: 'EXPIRED',
          reasonCodes: ['SETUP_EXPIRED', 'SETUP_TOO_FAR_FROM_ZONE'],
        };
        return { setup, transitioned: previousStatus !== 'EXPIRED', previousStatus };
      }
      return {
        setup: {
          ...existing,
          updatedAt: input.now,
          status: 'WATCHING',
          reasonCodes: ['SETUP_TOO_FAR_FROM_ZONE'],
        },
        transitioned: previousStatus !== 'WATCHING',
        previousStatus,
      };
    }
    return null;
  }

  const distance = toNumber(normalizedDistanceToZone(candle.close, zone, atr, tick));
  const evidence = analyzePriceAction({
    candles: closed,
    zones: [zone],
    tickSize: tick,
  });
  const confirmation = strongestDirectionalEvidence(evidence, input.direction);

  let status: TradingSetup['status'] = 'APPROACHING';
  const reasonCodes = ['SETUP_ZONE_APPROACHED', 'SETUP_CONFLUENCE_FOUND'];
  if (distance <= 0.15) {
    status = 'FORMING';
  }
  if (confirmation !== null) {
    status = 'TRIGGERED';
    reasonCodes.push('SETUP_PRICE_ACTION_CONFIRMED');
  }

  const invalidation = protectedLevel?.price ?? (input.direction === 'LONG' ? zone.low : zone.high);

  const barDurationMs = candle.closeTimestamp - candle.timestamp;
  const base: TradingSetup = input.existing ?? {
    id: createSetupId(input.instrumentId, input.direction, zone.id, input.now),
    instrumentId: input.instrumentId,
    strategy: 'TREND_PULLBACK',
    direction: input.direction,
    setupTimeframe: input.setupTimeframe,
    createdAt: input.now,
    updatedAt: input.now,
    status: 'WATCHING',
    zoneId: zone.id,
    triggerLevel: null,
    invalidationLevel: null,
    referencePrice: null,
    referenceSwingIds: input.marketStructure.swings.slice(-4).map((swing) => swing.id),
    referenceProfileIds: [],
    referencePivotSetIds: zone.members
      .filter((member) => member.source === 'FIB_PIVOT')
      .map((member) => member.sourceId),
    reasonCodes: [],
    expiresAt: null,
  };

  const setup: TradingSetup = {
    ...base,
    updatedAt: input.now,
    status,
    zoneId: zone.id,
    triggerLevel: confirmation !== null ? candle.close : zone.center,
    invalidationLevel: invalidation,
    referencePrice: confirmation !== null ? candle.close : null,
    reasonCodes,
    expiresAt: candle.closeTimestamp + config.setupExpiryBars * barDurationMs,
  };

  return {
    setup,
    transitioned:
      previousStatus !== status || input.existing === undefined || input.existing === null,
    previousStatus,
  };
}
