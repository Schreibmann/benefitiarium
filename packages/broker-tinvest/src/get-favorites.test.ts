import { InstrumentType } from '@ttech-pub/grpc-node-client/compiled/common.js';
import { describe, expect, it, vi } from 'vitest';
import {
  createGetFavorites,
  mapFavoriteInstrument,
  resolveFavoriteStreamInstrumentId,
} from './get-favorites.js';

describe('mapFavoriteInstrument', () => {
  it('maps a complete FavoriteInstrument row', () => {
    const mapped = mapFavoriteInstrument({
      figi: 'BBG004730N88',
      ticker: 'SBER',
      classCode: 'TQBR',
      isin: 'RU0009029540',
      instrumentType: 'share',
      name: 'Сбер Банк',
      uid: 'e6123145-9665-43e0-8413-cd61b8aa9b13',
      otcFlag: false,
      apiTradeAvailableFlag: true,
      instrumentKind: InstrumentType.INSTRUMENT_TYPE_SHARE,
    });
    expect(mapped).toEqual({
      uid: 'e6123145-9665-43e0-8413-cd61b8aa9b13',
      figi: 'BBG004730N88',
      ticker: 'SBER',
      classCode: 'TQBR',
      isin: 'RU0009029540',
      name: 'Сбер Банк',
      instrumentType: 'share',
      instrumentKind: 'SHARE',
      otcFlag: false,
      apiTradeAvailableFlag: true,
    });
  });

  it('rejects rows without ticker or classCode', () => {
    expect(mapFavoriteInstrument({ ticker: 'SBER' })).toBeNull();
    expect(mapFavoriteInstrument({ classCode: 'TQBR' })).toBeNull();
    expect(mapFavoriteInstrument(null)).toBeNull();
  });
});

describe('createGetFavorites', () => {
  it('calls instruments.getFavorites and maps rows', async () => {
    const getFavorites = vi.fn(async () => ({
      favoriteInstruments: [
        {
          figi: 'BBG004730N88',
          ticker: 'SBER',
          classCode: 'TQBR',
          isin: 'RU0009029540',
          instrumentType: 'share',
          name: 'Sber',
          uid: 'uid-sber',
          otcFlag: false,
          apiTradeAvailableFlag: true,
          instrumentKind: InstrumentType.INSTRUMENT_TYPE_SHARE,
        },
        { ticker: 'BAD' },
      ],
    }));
    const fetch = createGetFavorites({
      instruments: { getFavorites },
    });
    const rows = await fetch({ groupId: 'g1' });
    expect(getFavorites).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.uid).toBe('uid-sber');
  });
});

describe('resolveFavoriteStreamInstrumentId', () => {
  it('prefers uid, then figi, then ticker_classCode', () => {
    expect(
      resolveFavoriteStreamInstrumentId({
        uid: 'uid-1',
        figi: 'FIGI1',
        ticker: 'SBER',
        classCode: 'TQBR',
        isin: null,
        name: null,
        instrumentType: null,
        instrumentKind: null,
        otcFlag: false,
        apiTradeAvailableFlag: true,
      }),
    ).toBe('uid-1');

    expect(
      resolveFavoriteStreamInstrumentId({
        uid: null,
        figi: 'FIGI1',
        ticker: 'SBER',
        classCode: 'TQBR',
        isin: null,
        name: null,
        instrumentType: null,
        instrumentKind: null,
        otcFlag: false,
        apiTradeAvailableFlag: true,
      }),
    ).toBe('FIGI1');

    expect(
      resolveFavoriteStreamInstrumentId({
        uid: null,
        figi: null,
        ticker: 'SBER',
        classCode: 'TQBR',
        isin: null,
        name: null,
        instrumentType: null,
        instrumentKind: null,
        otcFlag: false,
        apiTradeAvailableFlag: true,
      }),
    ).toBe('SBER_TQBR');
  });
});
