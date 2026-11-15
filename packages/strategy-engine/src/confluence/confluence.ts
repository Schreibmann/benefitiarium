import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import type { AnalyzedPriceLevel, LevelSource } from '../analyzers/fibonacci-levels.js';
import { absDecimal, clamp01, maxDecimal, maxOfDecimals, minOfDecimals } from '../features/math.js';

export type EvidenceFamily = 'FIBONACCI' | 'VOLUME_PROFILE' | 'STRUCTURE' | 'PRICE_ACTION';

export type ConfluenceZone = {
  id: string;
  low: DecimalString;
  high: DecimalString;
  center: DecimalString;
  members: AnalyzedPriceLevel[];
  familyCount: number;
  familyStrength: Partial<Record<EvidenceFamily, number>>;
  overallStrength: number;
  createdAt: number;
  invalidatedAt: number | null;
};

export type ConfluenceConfig = {
  clusterAtrMultiple: number;
  familyWeights: Record<EvidenceFamily, number>;
  fibCrossMethodBonus: number;
};

export const DEFAULT_CONFLUENCE_CONFIG: ConfluenceConfig = {
  clusterAtrMultiple: 0.1,
  familyWeights: {
    FIBONACCI: 1,
    VOLUME_PROFILE: 1,
    STRUCTURE: 1,
    PRICE_ACTION: 0.8,
  },
  fibCrossMethodBonus: 0.1,
};

export function evidenceFamilyForSource(source: LevelSource): EvidenceFamily {
  if (source === 'FIB_PIVOT' || source === 'FIB_RETRACEMENT') {
    return 'FIBONACCI';
  }
  if (source === 'VOLUME_PROFILE') {
    return 'VOLUME_PROFILE';
  }
  return 'STRUCTURE';
}

function clusterGap(
  tickSize: DecimalString,
  atr: DecimalString,
  config: ConfluenceConfig,
): DecimalString {
  return maxDecimal(multiply(tickSize, '2'), multiply(atr, String(config.clusterAtrMultiple)));
}

function zoneGap(left: AnalyzedPriceLevel, right: AnalyzedPriceLevel): DecimalString {
  if (compare(left.zoneHigh, right.zoneLow) >= 0 && compare(right.zoneHigh, left.zoneLow) >= 0) {
    return parseDecimalString('0');
  }
  if (compare(left.zoneHigh, right.zoneLow) < 0) {
    return subtract(right.zoneLow, left.zoneHigh);
  }
  return subtract(left.zoneLow, right.zoneHigh);
}

/**
 * Deterministic 1D clustering: sort by zoneLow, merge when gap <= ClusterGap.
 */
export function clusterPriceLevels(
  levels: readonly AnalyzedPriceLevel[],
  atr: DecimalString | string,
  tickSize: DecimalString | string,
  createdAt: number,
  config: Partial<ConfluenceConfig> = {},
): ConfluenceZone[] {
  const resolved: ConfluenceConfig = {
    ...DEFAULT_CONFLUENCE_CONFIG,
    ...config,
    familyWeights: {
      ...DEFAULT_CONFLUENCE_CONFIG.familyWeights,
      ...config.familyWeights,
    },
  };
  const atrValue = parseDecimalString(String(atr));
  const tick = parseDecimalString(String(tickSize));
  const gapLimit = clusterGap(tick, atrValue, resolved);

  const sorted = [...levels].sort((left, right) => {
    const lowCmp = compare(left.zoneLow, right.zoneLow);
    if (lowCmp !== 0) {
      return lowCmp;
    }
    return compare(left.price, right.price);
  });

  const clusters: AnalyzedPriceLevel[][] = [];
  for (const level of sorted) {
    const current = clusters[clusters.length - 1];
    if (current === undefined) {
      clusters.push([level]);
      continue;
    }
    const last = current[current.length - 1];
    if (last === undefined) {
      clusters.push([level]);
      continue;
    }
    if (compare(zoneGap(last, level), gapLimit) <= 0) {
      current.push(level);
    } else {
      clusters.push([level]);
    }
  }

  return clusters.map((members, index) => buildConfluenceZone(members, createdAt, index, resolved));
}

function memberStrength(level: AnalyzedPriceLevel): number {
  const distance = Number(String(level.distanceAtr));
  const proximity = Number.isFinite(distance) ? clamp01(1 - distance / 2) : 0.5;
  const roleBoost =
    level.contextualRole === 'SUPPORT_CANDIDATE' || level.contextualRole === 'RESISTANCE_CANDIDATE'
      ? 0.15
      : level.contextualRole === 'BROKEN_LEVEL'
        ? -0.2
        : 0;
  return clamp01(proximity + roleBoost);
}

function familyStrengths(
  members: readonly AnalyzedPriceLevel[],
  config: ConfluenceConfig,
): Partial<Record<EvidenceFamily, number>> {
  const byFamily = new Map<EvidenceFamily, AnalyzedPriceLevel[]>();
  for (const member of members) {
    const family = evidenceFamilyForSource(member.source);
    const bucket = byFamily.get(family) ?? [];
    bucket.push(member);
    byFamily.set(family, bucket);
  }

  const strengths: Partial<Record<EvidenceFamily, number>> = {};
  for (const [family, familyMembers] of byFamily) {
    const strongest = familyMembers.reduce(
      (best, member) => Math.max(best, memberStrength(member)),
      0,
    );
    let strength = strongest;
    if (family === 'FIBONACCI') {
      const hasPivot = familyMembers.some((member) => member.source === 'FIB_PIVOT');
      const hasRetracement = familyMembers.some((member) => member.source === 'FIB_RETRACEMENT');
      if (hasPivot && hasRetracement) {
        strength = clamp01(strength + config.fibCrossMethodBonus);
      }
    }
    strengths[family] = clamp01(strength);
  }
  return strengths;
}

function zoneStrength(
  strengths: Partial<Record<EvidenceFamily, number>>,
  config: ConfluenceConfig,
): number {
  let product = 1;
  for (const family of Object.keys(config.familyWeights) as EvidenceFamily[]) {
    const s = strengths[family];
    if (s === undefined) {
      continue;
    }
    const weight = config.familyWeights[family];
    product *= 1 - weight * s;
  }
  return clamp01(1 - product);
}

function buildConfluenceZone(
  members: AnalyzedPriceLevel[],
  createdAt: number,
  index: number,
  config: ConfluenceConfig,
): ConfluenceZone {
  const lows = members.map((member) => member.zoneLow);
  const highs = members.map((member) => member.zoneHigh);
  const low = minOfDecimals(lows);
  const high = maxOfDecimals(highs);
  const center = divide(add(low, high), '2');
  const familyStrength = familyStrengths(members, config);
  const families = Object.keys(familyStrength);

  return {
    id: `CONF:${createdAt}:${index}`,
    low,
    high,
    center,
    members,
    familyCount: families.length,
    familyStrength,
    overallStrength: zoneStrength(familyStrength, config),
    createdAt,
    invalidatedAt: null,
  };
}

export function levelsFromVolumeProfile(input: {
  poc: DecimalString | null;
  vah: DecimalString | null;
  val: DecimalString | null;
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  referencePrice: DecimalString | string;
  profileId: string;
}): AnalyzedPriceLevel[] {
  const atr = parseDecimalString(String(input.atr));
  const tick = parseDecimalString(String(input.tickSize));
  const tolerance = maxDecimal(multiply(tick, '2'), multiply(atr, '0.1'));
  const reference = parseDecimalString(String(input.referencePrice));
  const candidates: Array<{ sourceId: string; price: DecimalString }> = [];
  if (input.poc !== null) {
    candidates.push({ sourceId: 'POC', price: input.poc });
  }
  if (input.vah !== null) {
    candidates.push({ sourceId: 'VAH', price: input.vah });
  }
  if (input.val !== null) {
    candidates.push({ sourceId: 'VAL', price: input.val });
  }

  return candidates.map((candidate) => {
    const distanceAtr = divide(
      absDecimal(subtract(candidate.price, reference)),
      maxDecimal(atr, tick),
    );
    return {
      id: `VOLUME_PROFILE:${input.profileId}:${candidate.sourceId}`,
      source: 'VOLUME_PROFILE' as const,
      sourceId: candidate.sourceId,
      price: candidate.price,
      zoneLow: subtract(candidate.price, tolerance),
      zoneHigh: add(candidate.price, tolerance),
      distanceAtr,
      contextualRole: 'NEUTRAL' as const,
      isConfirmed: true,
    };
  });
}
