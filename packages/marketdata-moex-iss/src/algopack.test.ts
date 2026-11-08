import { describe, expect, it } from 'vitest';
import { buildFortsCandlesPath, MOEX_FORTS_BOARD_RFUD } from './algopack.js';

describe('AlgoPack / FORTS candles path', () => {
  it('builds RFUD candles path for a futures ticker', () => {
    expect(buildFortsCandlesPath({ ticker: 'BRH6' })).toBe(
      '/engines/futures/markets/forts/boards/rfud/securities/BRH6/candles.json',
    );
    expect(MOEX_FORTS_BOARD_RFUD).toBe('RFUD');
  });

  it('rejects empty ticker', () => {
    expect(() => buildFortsCandlesPath({ ticker: '  ' })).toThrow(/ticker/i);
  });
});
