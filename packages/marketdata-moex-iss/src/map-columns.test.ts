import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapIssBlockRows } from './map-columns.js';
import type { MoexIssResponse } from './types.js';

function loadFixture(name: string): MoexIssResponse {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw: unknown = JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('fixture must be object');
  }
  const result: MoexIssResponse = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'columns' in value &&
      'data' in value &&
      Array.isArray(value.columns) &&
      Array.isArray(value.data)
    ) {
      result[key] = {
        columns: value.columns.map(String),
        data: value.data,
      };
    }
  }
  return result;
}

describe('mapIssBlockRows', () => {
  it('maps columns regardless of order', () => {
    const fixture = loadFixture('engines.json');
    const engines = fixture.engines;
    if (!engines) {
      throw new Error('engines block missing');
    }
    const rows = mapIssBlockRows(engines);
    expect(rows).toEqual([
      { title: 'Фондовый рынок и рынок депозитов', name: 'stock', id: 1 },
      { title: 'Срочный рынок', name: 'futures', id: 2 },
    ]);
  });

  it('maps securities fixture', () => {
    const fixture = loadFixture('securities-page.json');
    const securities = fixture.securities;
    if (!securities) {
      throw new Error('securities block missing');
    }
    const rows = mapIssBlockRows(securities);
    expect(rows[0]?.SECID).toBe('SBER');
    expect(rows[0]?.LOTSIZE).toBe(10);
  });
});
