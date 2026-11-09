import { describe, expect, it } from 'vitest';
import {
  parseCandle,
  parseDecimalString,
  parseFill,
  parseInstrument,
  parseInstrumentSpec,
  parseIsoDateTime,
  parseOrder,
  parseQuote,
  parseSignal,
  parseUuid,
  tryParseDecimalString,
  tryParseIsoDateTime,
  tryParseUuid,
} from './index.js';

const instrumentId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
const accountId = '33333333-3333-4333-8333-333333333333';
const clientOrderId = '44444444-4444-4444-8444-444444444444';
const strategyVersionId = '55555555-5555-4555-8555-555555555555';
const signalId = '66666666-6666-4666-8666-666666666666';
const fillId = '77777777-7777-4777-8777-777777777777';

describe('branded scalars', () => {
  it('accepts valid uuid / decimal / iso datetime', () => {
    expect(parseUuid(instrumentId)).toBe(instrumentId);
    expect(parseDecimalString('12.345')).toBe('12.345');
    expect(parseDecimalString('-0.5')).toBe('-0.5');
    expect(parseIsoDateTime('2026-11-08T12:00:00.000Z')).toBe('2026-11-08T12:00:00.000Z');
    expect(parseIsoDateTime('2026-11-09T03:05:00+00:00')).toBe('2026-11-09T03:05:00.000Z');
  });

  it('rejects invalid branded values', () => {
    expect(tryParseUuid('not-a-uuid')).toBeNull();
    expect(tryParseDecimalString('12.')).toBeNull();
    expect(tryParseDecimalString('01')).toBeNull();
    expect(tryParseDecimalString('abc')).toBeNull();
    expect(tryParseIsoDateTime('2026-11-08 12:00:00')).toBeNull();
  });
});

describe('instrument + spec', () => {
  it('parses instrument', () => {
    const instrument = parseInstrument({
      id: instrumentId,
      assetType: 'share',
      ticker: 'SBER',
      name: 'Sberbank',
      exchange: 'MOEX',
      currency: 'RUB',
      isActive: true,
    });
    expect(instrument.ticker).toBe('SBER');
  });

  it('rejects overlapping invalid spec window', () => {
    expect(() =>
      parseInstrumentSpec({
        instrumentId,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2025-01-01T00:00:00.000Z',
        lotSize: 10,
        minPriceIncrement: '0.01',
        priceCurrency: 'RUB',
        priceType: 'currency',
        contractMultiplier: null,
        expirationAt: null,
        marginInitial: null,
        raw: {},
      }),
    ).toThrow(/validTo/);
  });

  it('rejects non-positive lot size', () => {
    expect(() =>
      parseInstrumentSpec({
        instrumentId,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: null,
        lotSize: 0,
        minPriceIncrement: '0.01',
        priceCurrency: 'RUB',
        priceType: 'currency',
        contractMultiplier: null,
        expirationAt: null,
        marginInitial: null,
        raw: {},
      }),
    ).toThrow();
  });

  it('parses futures underlying metadata', () => {
    const spec = parseInstrumentSpec({
      instrumentId,
      validFrom: '2025-12-01T00:00:00.000Z',
      validTo: '2026-03-19T00:00:00.000Z',
      lotSize: 1,
      minPriceIncrement: '0.01',
      priceCurrency: 'RUB',
      priceType: 'points',
      contractMultiplier: '10',
      expirationAt: '2026-03-19T00:00:00.000Z',
      marginInitial: '15000',
      underlyingProviderPositionUid: 'pos-uid-br',
      underlyingAssetType: 'commodity',
      underlyingAssetName: 'Brent',
      contractFamily: 'BR',
      priceUnit: 'points',
      minPriceIncrementAmount: '8.41',
      raw: { classCode: 'SPBFUT' },
    });
    expect(spec.underlyingAssetType).toBe('commodity');
    expect(spec.contractFamily).toBe('BR');
    expect(spec.minPriceIncrementAmount).toBe('8.41');
  });
});

describe('candle + quote', () => {
  it('accepts valid OHLC candle', () => {
    const candle = parseCandle({
      instrumentId,
      provider: 't-invest',
      interval: '1d',
      timeStart: '2026-11-07T00:00:00.000Z',
      timeEnd: '2026-11-08T00:00:00.000Z',
      open: '100.5',
      high: '101.0',
      low: '99.5',
      close: '100.0',
      volume: '1000',
      volumeUnit: 'lots',
      turnover: null,
      isClosed: true,
      quality: 'good',
      sourceRevision: null,
    });
    expect(candle.close).toBe('100.0');
  });

  it('rejects candle with open above high', () => {
    expect(() =>
      parseCandle({
        instrumentId,
        provider: 'moex-iss',
        interval: '1m',
        timeStart: '2026-11-07T10:00:00.000Z',
        timeEnd: '2026-11-07T10:01:00.000Z',
        open: '105',
        high: '101',
        low: '99',
        close: '100',
        volume: '1',
        volumeUnit: 'lots',
        turnover: null,
        isClosed: true,
        quality: 'good',
        sourceRevision: null,
      }),
    ).toThrow(/OHLC/);
  });

  it('rejects quote without prices', () => {
    expect(() =>
      parseQuote({
        instrumentId,
        provider: 't-invest',
        last: null,
        bid: null,
        ask: null,
        eventTime: '2026-11-08T12:00:00.000Z',
        receivedAt: '2026-11-08T12:00:00.100Z',
        quality: 'good',
      }),
    ).toThrow(/at least one/);
  });

  it('rejects crossed bid/ask', () => {
    expect(() =>
      parseQuote({
        instrumentId,
        provider: 't-invest',
        last: '100',
        bid: '101',
        ask: '100',
        eventTime: '2026-11-08T12:00:00.000Z',
        receivedAt: '2026-11-08T12:00:00.100Z',
        quality: 'good',
      }),
    ).toThrow(/bid/);
  });
});

describe('order + fill + signal', () => {
  it('requires limitPrice for limit orders', () => {
    expect(() =>
      parseOrder({
        id: orderId,
        accountId,
        instrumentId,
        proposalId: null,
        clientOrderId,
        brokerOrderId: null,
        side: 'buy',
        orderType: 'limit',
        quantityLots: 1,
        limitPrice: null,
        status: 'created',
        mode: 'sandbox',
        submittedAt: null,
        updatedAt: '2026-11-08T12:00:00.000Z',
      }),
    ).toThrow(/limitPrice/);
  });

  it('parses fill and signal', () => {
    const fill = parseFill({
      id: fillId,
      orderId,
      brokerExecutionId: 'exec-1',
      executedAt: '2026-11-08T12:01:00.000Z',
      quantityLots: '1',
      price: '100.5',
      commission: '0.05',
      currency: 'RUB',
    });
    expect(fill.price).toBe('100.5');

    const signal = parseSignal({
      id: signalId,
      strategyVersionId,
      instrumentId,
      interval: '1h',
      eventKey: 'ema-cross-2026-11-08T11:00:00.000Z',
      direction: 'buy',
      status: 'new',
      referencePrice: '100.0',
      entryMin: '99.5',
      entryMax: '100.5',
      stopLoss: '98.0',
      takeProfit: ['102.0'],
      confidence: 0.6,
      reasons: ['EMA20 crossed above EMA50'],
      features: { ema20: '100.1', ema50: '99.9' },
      dataQuality: 'good',
      sourceEventTime: '2026-11-08T11:00:00.000Z',
      createdAt: '2026-11-08T11:00:01.000Z',
      validUntil: '2026-11-08T15:00:00.000Z',
    });
    expect(signal.direction).toBe('buy');
  });

  it('rejects signal with inverted entry zone', () => {
    expect(() =>
      parseSignal({
        id: signalId,
        strategyVersionId,
        instrumentId,
        interval: '1h',
        eventKey: 'bad-zone',
        direction: 'buy',
        status: 'new',
        referencePrice: '100.0',
        entryMin: '101',
        entryMax: '100',
        stopLoss: null,
        takeProfit: [],
        confidence: null,
        reasons: ['test'],
        features: {},
        dataQuality: 'good',
        sourceEventTime: '2026-11-08T11:00:00.000Z',
        createdAt: '2026-11-08T11:00:01.000Z',
        validUntil: '2026-11-08T15:00:00.000Z',
      }),
    ).toThrow(/entryMin/);
  });
});
