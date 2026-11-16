export type PreviousPriceStore = {
  get: (instrumentUid: string, timeframe: string) => string | null;
  set: (instrumentUid: string, timeframe: string, price: string) => void;
  seed: (instrumentUid: string, timeframe: string, price: string) => void;
};

function keyOf(instrumentUid: string, timeframe: string): string {
  return `${instrumentUid}|${timeframe}`;
}

export function createPreviousPriceStore(): PreviousPriceStore {
  const prices = new Map<string, string>();

  return {
    get(instrumentUid, timeframe) {
      return prices.get(keyOf(instrumentUid, timeframe)) ?? null;
    },
    set(instrumentUid, timeframe, price) {
      prices.set(keyOf(instrumentUid, timeframe), price);
    },
    seed(instrumentUid, timeframe, price) {
      const key = keyOf(instrumentUid, timeframe);
      if (!prices.has(key)) {
        prices.set(key, price);
      }
    },
  };
}
