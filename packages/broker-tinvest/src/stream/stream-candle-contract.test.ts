import type { Candle, HistoricCandle } from '@ttech-pub/grpc-node-client/compiled/marketdata.js';
import { describe, expect, it } from 'vitest';

type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

/**
 * Type-level contract (v1.3): stream Candle ≠ HistoricCandle.
 * Compile fails if SDK adds isComplete to Candle or removes it from HistoricCandle.
 */
const streamCandleHasIsComplete: HasKey<Candle, 'isComplete'> = false;
const historicCandleHasIsComplete: HasKey<HistoricCandle, 'isComplete'> = true;
const streamCandleHasInstrumentUid: HasKey<Candle, 'instrumentUid'> = true;
const historicCandleHasInstrumentUid: HasKey<HistoricCandle, 'instrumentUid'> = false;

describe('T-Invest Candle vs HistoricCandle contract (SDK 1.61.0)', () => {
  it('documents that stream Candle has no isComplete while HistoricCandle does', () => {
    expect(streamCandleHasIsComplete).toBe(false);
    expect(historicCandleHasIsComplete).toBe(true);
    expect(streamCandleHasInstrumentUid).toBe(true);
    expect(historicCandleHasInstrumentUid).toBe(false);
  });
});
