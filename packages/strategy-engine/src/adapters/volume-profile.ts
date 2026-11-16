import {
  type CalculateHorizontalVolumeFromTradesInput,
  type CalculateHorizontalVolumeInput,
  calculateHorizontalVolume,
  calculateHorizontalVolumeFromTrades,
  type HorizontalVolumeCalculation,
} from '@moex/indicators';
import type { ReasonCode } from '../reason-codes.js';
import type {
  EngineVolumeProfile,
  VolumeProfileQualityLabel,
  VolumeProfileScope,
} from '../types.js';

export type VolumeProfileAdapterInput =
  | {
      source: 'trades';
      scope: VolumeProfileScope;
      from: number;
      to: number;
      isDeveloping: boolean;
      missingDays?: readonly string[];
      calculation: CalculateHorizontalVolumeFromTradesInput;
    }
  | {
      source: 'ohlcv_estimate';
      scope: VolumeProfileScope;
      from: number;
      to: number;
      isDeveloping: boolean;
      calculation: CalculateHorizontalVolumeInput;
    }
  | {
      source: 'unavailable';
      scope: VolumeProfileScope;
      from: number;
      to: number;
      reason?: ReasonCode;
    };

export type VolumeProfileAdapterResult =
  | { ok: true; profile: EngineVolumeProfile }
  | { ok: false; reasonCodes: ReasonCode[]; message: string };

function mapQuality(
  calculation: HorizontalVolumeCalculation,
  source: 'trades' | 'ohlcv_estimate',
  missingDays: readonly string[],
): { label: VolumeProfileQualityLabel; reasonCodes: ReasonCode[] } {
  if (calculation.quality === 'EMPTY' || calculation.quality === 'DEGENERATE') {
    return {
      label: 'INSUFFICIENT',
      reasonCodes: ['VOLUME_PROFILE_INSUFFICIENT'],
    };
  }

  if (source === 'ohlcv_estimate') {
    return {
      label: 'APPROXIMATE',
      reasonCodes: ['VOLUME_PROFILE_APPROXIMATE'],
    };
  }

  if (missingDays.length > 0) {
    return {
      label: 'APPROXIMATE',
      reasonCodes: ['VOLUME_PROFILE_APPROXIMATE'],
    };
  }

  return { label: 'EXACT', reasonCodes: [] };
}

function toProfile(
  calculation: HorizontalVolumeCalculation,
  meta: {
    scope: VolumeProfileScope;
    from: number;
    to: number;
    isDeveloping: boolean;
    qualityLabel: VolumeProfileQualityLabel;
    reasonCodes: ReasonCode[];
  },
): EngineVolumeProfile {
  return {
    scope: meta.scope,
    from: meta.from,
    to: meta.to,
    qualityLabel: meta.qualityLabel,
    reasonCodes: meta.reasonCodes,
    algorithmId: calculation.algorithmId,
    algorithmVersion: calculation.algorithmVersion,
    poc: calculation.poc,
    vah: calculation.vah,
    val: calculation.val,
    bins: calculation.levels.map((level) => ({
      price: level.price,
      volume: level.volume,
      buyVolume: level.buyVolume,
      sellVolume: level.sellVolume,
    })),
    totalVolume: calculation.totalVolume,
    isDeveloping: meta.isDeveloping,
  };
}

/**
 * Thin adapter over `@moex/indicators` horizontal volume calculators.
 * Callers must resolve session bounds into from/to; the repo has no session VP binder yet.
 */
export function adaptVolumeProfile(input: VolumeProfileAdapterInput): VolumeProfileAdapterResult {
  if (input.source === 'unavailable') {
    const reason = input.reason ?? 'VOLUME_PROFILE_UNAVAILABLE';
    return {
      ok: false,
      reasonCodes: [reason],
      message: `Volume profile unavailable for scope ${input.scope}`,
    };
  }

  if (input.from >= input.to) {
    return {
      ok: false,
      reasonCodes: ['VOLUME_PROFILE_UNAVAILABLE'],
      message: 'from must be less than to',
    };
  }

  try {
    if (input.source === 'trades') {
      const calculation = calculateHorizontalVolumeFromTrades(input.calculation);
      const missingDays = input.missingDays ?? [];
      const quality = mapQuality(calculation, 'trades', missingDays);
      if (quality.label === 'INSUFFICIENT') {
        return {
          ok: false,
          reasonCodes: quality.reasonCodes,
          message: 'Trade-level volume profile is insufficient',
        };
      }
      return {
        ok: true,
        profile: toProfile(calculation, {
          scope: input.scope,
          from: input.from,
          to: input.to,
          isDeveloping: input.isDeveloping,
          qualityLabel: quality.label,
          reasonCodes: quality.reasonCodes,
        }),
      };
    }

    const calculation = calculateHorizontalVolume(input.calculation);
    const quality = mapQuality(calculation, 'ohlcv_estimate', []);
    if (quality.label === 'INSUFFICIENT') {
      return {
        ok: false,
        reasonCodes: quality.reasonCodes,
        message: 'OHLCV estimate volume profile is insufficient',
      };
    }
    return {
      ok: true,
      profile: toProfile(calculation, {
        scope: input.scope,
        from: input.from,
        to: input.to,
        isDeveloping: input.isDeveloping,
        qualityLabel: quality.label,
        reasonCodes: quality.reasonCodes,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'volume profile calculation failed';
    return {
      ok: false,
      reasonCodes: ['VOLUME_PROFILE_UNAVAILABLE'],
      message,
    };
  }
}

export function emptyVolumeProfileUnavailable(
  scope: VolumeProfileScope,
  from: number,
  to: number,
): VolumeProfileAdapterResult {
  return adaptVolumeProfile({ source: 'unavailable', scope, from, to });
}
