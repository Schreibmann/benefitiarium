import type { SqlValue } from './client.js';

/** Very small positional parameter binder ($1, $2, …) for psql scripts. */
export function bindSql(sql: string, params: SqlValue[] = []): string {
  let result = sql;
  for (let index = params.length; index >= 1; index -= 1) {
    const token = `$${index}`;
    const value = params[index - 1];
    if (value === undefined) {
      throw new Error(`Missing SQL parameter at index ${index}`);
    }
    const literal = toSqlLiteral(value);
    result = result.split(token).join(literal);
  }
  return result;
}

export function toSqlLiteral(value: SqlValue): string {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('SQL number must be finite');
    }
    return String(value);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export function jsonAggSql(selectSql: string): string {
  return `SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json) FROM (${selectSql}) AS q`;
}
