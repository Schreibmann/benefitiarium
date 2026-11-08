import type { MoexIssBlock } from './types.js';

export type MoexIssRow = Record<string, unknown>;

/**
 * Maps ISS JSON arrays using the response `columns` list (order is not stable across endpoints).
 */
export function mapIssBlockRows(block: MoexIssBlock): MoexIssRow[] {
  const columns = block.columns;
  return block.data.map((row) => {
    const mapped: MoexIssRow = {};
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      if (column === undefined) {
        continue;
      }
      mapped[column] = row[index] ?? null;
    }
    return mapped;
  });
}
