import type { CandleInterval, DecimalString, InstrumentId } from '@moex/domain';
import type { EngineDirection, StrategyId } from '../types.js';

export type SetupStatus =
  | 'WATCHING'
  | 'APPROACHING'
  | 'FORMING'
  | 'TRIGGERED'
  | 'INVALIDATED'
  | 'EXPIRED';

export type TradingSetup = {
  id: string;
  instrumentId: InstrumentId;
  strategy: StrategyId;
  direction: EngineDirection;
  setupTimeframe: CandleInterval;
  createdAt: number;
  updatedAt: number;
  status: SetupStatus;
  zoneId: string | null;
  triggerLevel: DecimalString | null;
  invalidationLevel: DecimalString | null;
  referencePrice: DecimalString | null;
  referenceSwingIds: string[];
  referenceProfileIds: string[];
  referencePivotSetIds: string[];
  reasonCodes: string[];
  expiresAt: number | null;
};

export type SetupUpdateResult = {
  setup: TradingSetup;
  transitioned: boolean;
  previousStatus: SetupStatus;
};
