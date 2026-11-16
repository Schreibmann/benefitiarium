import type { TinvestFavoriteRaw, TinvestReadApi } from '@moex/broker-tinvest';
import type { FavoriteRow, FavoritesRepository } from '@moex/persistence';

function isFuturesInstrumentType(instrumentType: string | null): boolean {
  if (instrumentType === null) {
    return false;
  }
  const normalized = instrumentType.trim().toLowerCase();
  return normalized === 'futures' || normalized === 'future';
}

/**
 * Favorites from T-Invest InstrumentsService.GetFavorites (read-only), filtered to futures.
 * Editing is done in the broker app / EditFavorites — not via this API.
 */
export function createBrokerFavoritesRepository(api: TinvestReadApi): FavoritesRepository {
  const toRow = (item: TinvestFavoriteRaw): FavoriteRow => ({
    instrumentUid: item.uid,
    ticker: item.ticker,
    figi: item.figi,
    createdAt: new Date(0).toISOString(),
  });

  const listFuturesFavorites = async (): Promise<TinvestFavoriteRaw[]> => {
    const [favorites, futures] = await Promise.all([api.listFavorites(), api.listFutures()]);
    const futuresUids = new Set(futures.map((row) => row.uid));
    return favorites.filter(
      (row) => isFuturesInstrumentType(row.instrumentType) || futuresUids.has(row.uid),
    );
  };

  return {
    async list() {
      const rows = await listFuturesFavorites();
      return rows.map(toRow);
    },

    async get(instrumentUid) {
      const rows = await listFuturesFavorites();
      const found = rows.find((row) => row.uid === instrumentUid);
      return found === undefined ? null : toRow(found);
    },

    async upsert() {
      throw new Error(
        'Favorites are managed in T-Invest (GetFavorites/EditFavorites). Use the broker app to change the list.',
      );
    },

    async remove() {
      throw new Error(
        'Favorites are managed in T-Invest (GetFavorites/EditFavorites). Use the broker app to change the list.',
      );
    },
  };
}
