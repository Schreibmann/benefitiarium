import type { InstrumentSpec, IsoDateTime } from '@moex/domain';
import { parseInstrumentSpec } from '@moex/domain';

/**
 * Half-open validity: validFrom <= asOf < validTo (or validTo is null).
 * At the exact boundary `validTo`, the next version becomes active.
 */
export function isSpecActiveAt(spec: InstrumentSpec, asOf: IsoDateTime): boolean {
  if (asOf < spec.validFrom) {
    return false;
  }
  if (spec.validTo === null) {
    return true;
  }
  return asOf < spec.validTo;
}

export function selectInstrumentSpecAt(
  specs: readonly InstrumentSpec[],
  instrumentId: string,
  asOf: IsoDateTime,
): InstrumentSpec | null {
  const candidates = specs
    .filter((spec) => spec.instrumentId === instrumentId && isSpecActiveAt(spec, asOf))
    .sort((left, right) => (left.validFrom < right.validFrom ? 1 : -1));
  return candidates[0] ?? null;
}

/** Fields that force a new historical row per BL-017. */
export function hasMaterialSpecChange(
  current: InstrumentSpec,
  next: InstrumentSpec,
): boolean {
  return (
    current.lotSize !== next.lotSize ||
    current.minPriceIncrement !== next.minPriceIncrement ||
    current.contractMultiplier !== next.contractMultiplier ||
    current.expirationAt !== next.expirationAt ||
    current.priceType !== next.priceType ||
    current.priceCurrency !== next.priceCurrency ||
    (current.minPriceIncrementAmount ?? null) !== (next.minPriceIncrementAmount ?? null)
  );
}

export type AppendSpecVersionResult =
  | { changed: false; specs: InstrumentSpec[]; current: InstrumentSpec }
  | { changed: true; specs: InstrumentSpec[]; previous: InstrumentSpec; current: InstrumentSpec };

/**
 * Appends a new version when material fields change.
 * Closes the open-ended current row at `next.validFrom`.
 */
export function appendInstrumentSpecVersion(
  existing: readonly InstrumentSpec[],
  next: InstrumentSpec,
): AppendSpecVersionResult {
  const validatedNext = parseInstrumentSpec(next);
  const forInstrument = existing.filter((spec) => spec.instrumentId === validatedNext.instrumentId);
  const others = existing.filter((spec) => spec.instrumentId !== validatedNext.instrumentId);

  const open = forInstrument
    .filter((spec) => spec.validTo === null)
    .sort((left, right) => (left.validFrom < right.validFrom ? 1 : -1));

  if (open.length > 1) {
    throw new Error(
      `Instrument ${validatedNext.instrumentId} has multiple open-ended specs; repair history first`,
    );
  }

  const currentOpen = open[0];
  if (currentOpen === undefined) {
    const nextSpecs = [...others, ...forInstrument, validatedNext];
    assertNoOverlap(nextSpecs.filter((spec) => spec.instrumentId === validatedNext.instrumentId));
    return {
      changed: true,
      specs: nextSpecs,
      previous: validatedNext,
      current: validatedNext,
    };
  }

  if (!hasMaterialSpecChange(currentOpen, validatedNext)) {
    return { changed: false, specs: [...existing], current: currentOpen };
  }

  if (validatedNext.validFrom <= currentOpen.validFrom) {
    throw new Error('New spec validFrom must be greater than the open version validFrom');
  }

  const closedPrevious: InstrumentSpec = parseInstrumentSpec({
    ...currentOpen,
    validTo: validatedNext.validFrom,
  });

  const closedHistory = forInstrument.map((spec) =>
    spec.validTo === null && spec.validFrom === currentOpen.validFrom ? closedPrevious : spec,
  );
  const nextSpecs = [...others, ...closedHistory, validatedNext];
  assertNoOverlap(nextSpecs.filter((spec) => spec.instrumentId === validatedNext.instrumentId));
  return {
    changed: true,
    specs: nextSpecs,
    previous: closedPrevious,
    current: validatedNext,
  };
}

/**
 * Ensures intervals for one instrument do not overlap.
 * Uses half-open [validFrom, validTo) semantics (null validTo = +∞).
 */
export function assertNoOverlap(specs: readonly InstrumentSpec[]): void {
  const sorted = [...specs].sort((left, right) =>
    left.validFrom < right.validFrom ? -1 : left.validFrom > right.validFrom ? 1 : 0,
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (!left || !right) {
      continue;
    }
    if (left.instrumentId !== right.instrumentId) {
      continue;
    }
    const leftEnd = left.validTo;
    if (leftEnd === null || right.validFrom < leftEnd) {
      throw new Error(
        `Overlapping instrument_specs for ${left.instrumentId}: ${left.validFrom} overlaps ${right.validFrom}`,
      );
    }
  }
}
