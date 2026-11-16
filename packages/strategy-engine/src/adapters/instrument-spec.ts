import { type InstrumentSpec, tryParseDecimalString } from '@moex/domain';
import type { ReasonCode } from '../reason-codes.js';
import type { EngineInstrumentSpec, ValidationResult } from '../types.js';
import { validateInstrumentSpec } from '../validate.js';

export type MapInstrumentSpecOptions = {
  /** Override when domain `minPriceIncrementAmount` / contract economics are missing. */
  pointValueOverride?: string;
  exchange?: string;
  tradingCalendarId?: string | null;
  sessionProfile?: EngineInstrumentSpec['sessionProfile'];
};

export type MapInstrumentSpecResult = ValidationResult<EngineInstrumentSpec> & {
  reasonCodes: ReasonCode[];
};

/**
 * Maps domain `InstrumentSpec` into the engine contract.
 * Missing positive pointValue → `INSTRUMENT_SPEC_UNAVAILABLE`.
 */
export function mapDomainInstrumentSpec(
  spec: InstrumentSpec,
  options: MapInstrumentSpecOptions = {},
): MapInstrumentSpecResult {
  const reasonCodes: ReasonCode[] = [];
  const pointValueFromDomain = spec.minPriceIncrementAmount ?? null;
  const pointValueRaw = options.pointValueOverride ?? pointValueFromDomain;

  if (pointValueRaw === null) {
    reasonCodes.push('INSTRUMENT_SPEC_UNAVAILABLE');
    return {
      ok: false,
      issues: [
        {
          reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
          message:
            'pointValue unavailable: set minPriceIncrementAmount on InstrumentSpec or pass pointValueOverride',
          path: 'pointValue',
        },
      ],
      reasonCodes,
    };
  }

  const pointValue = tryParseDecimalString(String(pointValueRaw));
  if (pointValue === null) {
    reasonCodes.push('INSTRUMENT_SPEC_UNAVAILABLE');
    return {
      ok: false,
      issues: [
        {
          reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
          message: 'pointValue is not a valid decimal string',
          path: 'pointValue',
        },
      ],
      reasonCodes,
    };
  }

  const mapped: EngineInstrumentSpec = {
    instrumentId: spec.instrumentId,
    exchange: options.exchange ?? 'MOEX',
    tickSize: spec.minPriceIncrement,
    lotSize: spec.lotSize,
    pointValue,
    minQuantity: spec.lotSize,
    quantityStep: spec.lotSize,
    quoteCurrency: spec.priceCurrency,
    priceCurrency: spec.priceCurrency,
    tradingCalendarId: options.tradingCalendarId ?? null,
    sessionProfile: options.sessionProfile ?? 'SESSION_BASED',
  };

  const validated = validateInstrumentSpec(mapped);
  if (!validated.ok) {
    return {
      ok: false,
      issues: validated.issues,
      reasonCodes: [...reasonCodes, ...validated.issues.map((issue) => issue.reasonCode)],
    };
  }

  return { ok: true, value: validated.value, reasonCodes };
}
