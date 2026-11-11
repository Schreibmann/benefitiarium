import { describe, expect, it } from 'vitest';
import { createFixtureTinvestReadApi } from './fixture-read-api.js';
import {
  buildGetTechAnalysisCommand,
  mapTechAnalysisResponse,
  TECH_ANALYSIS_API_GAPS,
} from './get-tech-analysis-command.js';
import { quotationToDecimalString } from './mappers/quotation.js';

describe('GetTechAnalysis adapter', () => {
  it('documents that Fibonacci and horizontal volume are not in GetTechAnalysis', () => {
    expect(TECH_ANALYSIS_API_GAPS.fibonacci).toBe('not_in_gettechanalysis');
    expect(TECH_ANALYSIS_API_GAPS.horizontalVolume).toBe('not_in_gettechanalysis');
  });

  it('maps Quotation / MoneyValue units+nano to decimal strings', () => {
    expect(quotationToDecimalString({ units: 25000, nano: 0 }, 'margin')).toBe('25000');
    expect(quotationToDecimalString({ units: 1, nano: 250_000_000 }, 'price')).toBe('1.25');
    expect(quotationToDecimalString({ units: -2, nano: -500_000_000 }, 'price')).toBe('-2.5');
  });

  it('maps tech analysis response rows including upperBand', () => {
    const mapped = mapTechAnalysisResponse([
      {
        timestamp: new Date('2026-11-05T00:00:00.000Z'),
        middleBand: { units: 100, nano: 500_000_000 },
        upperBand: { units: 110, nano: 250_000_000 },
        lowerBand: { units: 90, nano: 750_000_000 },
        signal: undefined,
        macd: undefined,
      },
    ]);
    expect(mapped).toEqual([
      {
        timestamp: '2026-11-05T00:00:00.000Z',
        middleBand: '100.5',
        upperBand: '110.25',
        lowerBand: '90.75',
        signal: null,
        macd: null,
      },
    ]);
  });

  it('builds a GetTechAnalysis command for SMA without assertions', () => {
    const command = buildGetTechAnalysisCommand({
      instrumentUid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      indicatorType: 'sma',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-08T00:00:00.000Z'),
      interval: '1d',
      typeOfPrice: 'close',
      length: 20,
    });
    expect(command.options.instrumentUid).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(command.options.length).toBe(20);
  });

  it('returns fixture tech analysis rows from TinvestReadApi', async () => {
    const api = createFixtureTinvestReadApi();
    const rows = await api.getTechAnalysis({
      instrumentUid: 'e6123145-9665-43e0-8413-cd61b8aa9b13',
      indicatorType: 'bb',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-08T00:00:00.000Z'),
      interval: '1d',
      typeOfPrice: 'close',
      length: 20,
      deviationMultiplier: '2',
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.upperBand).toBe('110.25');
    expect(rows[0]?.middleBand).toBe('100.5');
  });
});
