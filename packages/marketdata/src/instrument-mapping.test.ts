import type { ProviderInstrument } from '@moex/contracts';
import { describe, expect, it } from 'vitest';
import { mapInstrumentsAcrossProviders } from './instrument-mapping.js';
import type { MoexIssInstrumentRef } from './moex-ref.js';

function futureTinvest(input: {
  uid: string;
  ticker: string;
  name: string;
  isActive?: boolean;
}): ProviderInstrument {
  return {
    provider: 't-invest',
    providerInstrumentId: input.uid,
    assetType: 'future',
    ticker: input.ticker,
    name: input.name,
    currency: 'RUB',
    classCode: 'SPBFUT',
    engine: null,
    market: null,
    board: null,
    secid: null,
    isActive: input.isActive ?? true,
  };
}

function fortsMoex(secid: string, shortName: string): MoexIssInstrumentRef {
  return {
    engine: 'futures',
    market: 'forts',
    board: 'RFUD',
    secid,
    shortName,
    isin: null,
  };
}

const sberTinvest: ProviderInstrument = {
  provider: 't-invest',
  providerInstrumentId: 'e6123145-9665-43e0-8413-cd61b8aa9b13',
  assetType: 'share',
  ticker: 'SBER',
  name: 'Sberbank',
  currency: 'RUB',
  classCode: 'TQBR',
  engine: null,
  market: null,
  board: null,
  secid: null,
  isActive: true,
};

const brh6 = futureTinvest({
  uid: 'br-active-uid-0001-0000-000000000001',
  ticker: 'BRH6',
  name: 'Brent-3.26',
});
const gdh6 = futureTinvest({
  uid: 'gd-active-uid-0001-0000-000000000002',
  ticker: 'GDH6',
  name: 'Gold-3.26',
});
const mxh6 = futureTinvest({
  uid: 'mx-active-uid-0001-0000-000000000003',
  ticker: 'MXH6',
  name: 'MIX-3.26',
});
const rih6 = futureTinvest({
  uid: 'ri-active-uid-0001-0000-000000000004',
  ticker: 'RIH6',
  name: 'RTS-3.26',
});
const crz5 = futureTinvest({
  uid: 'cr-expired-uid-0001-0000-000000000005',
  ticker: 'CRZ5',
  name: 'CNY-12.25',
  isActive: false,
});

const sberMoex: MoexIssInstrumentRef = {
  engine: 'stock',
  market: 'shares',
  board: 'TQBR',
  secid: 'SBER',
  shortName: 'Сбербанк',
  isin: 'RU0009029540',
};

const sberSmal: MoexIssInstrumentRef = {
  engine: 'stock',
  market: 'shares',
  board: 'SMAL',
  secid: 'SBER',
  shortName: 'SBER SMAL',
  isin: 'RU0009029540',
};

describe('mapInstrumentsAcrossProviders', () => {
  it('maps share + 2 commodity + 2 index futures + expired CRZ5 via SPBFUT↔RFUD', () => {
    let n = 0;
    const result = mapInstrumentsAcrossProviders({
      tinvest: [sberTinvest, brh6, gdh6, mxh6, rih6, crz5],
      moex: [
        sberMoex,
        fortsMoex('BRH6', 'Brent-3.26'),
        fortsMoex('GDH6', 'Gold-3.26'),
        fortsMoex('MXH6', 'MIX-3.26'),
        fortsMoex('RIH6', 'RTS-3.26'),
        fortsMoex('CRZ5', 'CNY-12.25'),
      ],
      createId: () => {
        n += 1;
        return `11111111-1111-4111-8111-11111111111${n}`;
      },
    });

    expect(result.matched).toHaveLength(6);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatchedTinvest).toHaveLength(0);
    expect(result.unmatchedMoex).toHaveLength(0);

    const tickers = result.matched.map((item) => item.instrument.ticker).sort();
    expect(tickers).toEqual(['BRH6', 'CRZ5', 'GDH6', 'MXH6', 'RIH6', 'SBER']);

    const br = result.matched.find((item) => item.instrument.ticker === 'BRH6');
    expect(br?.providerIds.find((id) => id.provider === 'moex-iss')?.board).toBe('RFUD');
    expect(br?.providerIds.find((id) => id.provider === 't-invest')?.classCode).toBe('SPBFUT');

    const expired = result.matched.find((item) => item.instrument.ticker === 'CRZ5');
    expect(expired?.instrument.isActive).toBe(false);
  });

  it('marks ambiguous tickers when multiple boards compete', () => {
    const secondSberTinvest: ProviderInstrument = {
      ...sberTinvest,
      providerInstrumentId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      classCode: 'SMAL',
    };

    const result = mapInstrumentsAcrossProviders({
      tinvest: [sberTinvest, secondSberTinvest],
      moex: [sberMoex, sberSmal],
      createId: () => '11111111-1111-4111-8111-111111111111',
    });

    expect(result.matched).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(1);
    expect(result.ambiguous[0]?.ticker).toBe('SBER');
    expect(result.unmatchedTinvest).toHaveLength(2);
    expect(result.unmatchedMoex).toHaveLength(2);
  });

  it('leaves unmatched when ticker exists but board/classCode disagree', () => {
    const result = mapInstrumentsAcrossProviders({
      tinvest: [sberTinvest],
      moex: [sberSmal],
      createId: () => '11111111-1111-4111-8111-111111111111',
    });
    expect(result.matched).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatchedTinvest).toEqual([sberTinvest]);
    expect(result.unmatchedMoex).toEqual([sberSmal]);
  });

  it('does not auto-map indicative index tickers to futures boards', () => {
    const imoexIndicative: ProviderInstrument = {
      provider: 't-invest',
      providerInstrumentId: 'imoex-indicative-uid-000000000001',
      assetType: 'index',
      ticker: 'IMOEX',
      name: 'MOEX Russia Index',
      currency: 'RUB',
      classCode: 'INDX',
      engine: null,
      market: null,
      board: null,
      secid: null,
      isActive: false,
    };
    const result = mapInstrumentsAcrossProviders({
      tinvest: [imoexIndicative, mxh6],
      moex: [fortsMoex('MXH6', 'MIX-3.26')],
      createId: () => '11111111-1111-4111-8111-111111111111',
    });
    expect(result.matched.map((item) => item.instrument.ticker)).toEqual(['MXH6']);
    expect(result.unmatchedTinvest.map((item) => item.ticker)).toEqual(['IMOEX']);
  });
});
