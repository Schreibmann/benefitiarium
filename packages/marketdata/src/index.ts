export { mapInstrumentsAcrossProviders } from './instrument-mapping.js';
export type {
  AmbiguousTickerGroup,
  InstrumentMappingResult,
  MapInstrumentsInput,
  MappedInstrument,
} from './instrument-mapping.js';
export type { MoexIssInstrumentRef } from './moex-ref.js';
export {
  appendInstrumentSpecVersion,
  assertNoOverlap,
  hasMaterialSpecChange,
  isSpecActiveAt,
  selectInstrumentSpecAt,
} from './spec-versioning.js';
export type { AppendSpecVersionResult } from './spec-versioning.js';

export const packageName = '@moex/marketdata' as const;
