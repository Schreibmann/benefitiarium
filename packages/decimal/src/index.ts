export {
  add,
  compare,
  divide,
  format,
  isMultipleOfTick,
  lotsToQuantity,
  multiply,
  parse,
  quantityToLots,
  roundToTick,
  subtract,
} from './decimal.js';
export type { RoundingMode } from './decimal.js';

export const packageName = '@moex/decimal' as const;
