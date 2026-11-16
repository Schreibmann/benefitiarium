import { describe, expect, it } from 'vitest';
import { mapFavoriteInstrument, mapFavoritesResponse } from './get-favorites-command.js';

describe('mapFavoriteInstrument', () => {
  it('maps uid/ticker/figi from broker FavoriteInstrument', () => {
    const mapped = mapFavoriteInstrument({
      uid: 'uid-1',
      ticker: 'SBER',
      figi: 'BBG004730N88',
      name: 'Sberbank',
      classCode: 'TQBR',
      instrumentType: 'share',
      apiTradeAvailableFlag: true,
    });
    expect(mapped).toEqual({
      uid: 'uid-1',
      ticker: 'SBER',
      figi: 'BBG004730N88',
      name: 'Sberbank',
      classCode: 'TQBR',
      instrumentType: 'share',
      apiTradeAvailableFlag: true,
    });
  });

  it('skips rows without uid or ticker', () => {
    expect(mapFavoriteInstrument({ ticker: 'SBER' })).toBeNull();
    expect(mapFavoriteInstrument({ uid: 'uid-1' })).toBeNull();
  });
});

describe('mapFavoritesResponse', () => {
  it('filters invalid instruments', () => {
    const mapped = mapFavoritesResponse({
      favoriteInstruments: [
        {
          uid: 'uid-1',
          ticker: 'SBER',
          figi: 'BBG004730N88',
          name: 'Sberbank',
          classCode: 'TQBR',
          isin: '',
          instrumentType: 'share',
          otcFlag: false,
          apiTradeAvailableFlag: true,
          instrumentKind: 0,
        },
        {
          uid: '',
          ticker: 'BAD',
          figi: '',
          name: '',
          classCode: '',
          isin: '',
          instrumentType: '',
          otcFlag: false,
          apiTradeAvailableFlag: false,
          instrumentKind: 0,
        },
      ],
    });
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.ticker).toBe('SBER');
  });
});
