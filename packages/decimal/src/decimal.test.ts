import { describe, expect, it } from 'vitest';
import {
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
} from './index.js';

describe('@moex/decimal', () => {
  it('parses and formats exact decimal strings', () => {
    expect(parse('0.1')).toBe('0.1');
    expect(format('1.2300')).toBe('1.23');
    expect(format('1.23456', 4)).toBe('1.2346');
  });

  it('compares and computes without number arithmetic', () => {
    expect(compare('0.1', '0.2')).toBe(-1);
    expect(compare('0.2', '0.2')).toBe(0);
    expect(add('0.1', '0.2')).toBe('0.3');
    expect(subtract('1.00', '0.01')).toBe('0.99');
    expect(multiply('0.1', '0.2')).toBe('0.02');
    expect(divide('1', '4')).toBe('0.25');
  });

  it('rejects division by zero and invalid decimals', () => {
    expect(() => divide('1', '0')).toThrow(/zero/i);
    expect(() => parse('01')).toThrow();
    expect(() => parse('1.')).toThrow();
  });

  it('rounds fractional tick sizes', () => {
    expect(roundToTick('100.12', '0.05')).toBe('100.1');
    expect(roundToTick('100.125', '0.05')).toBe('100.15');
    expect(roundToTick('100.125', '0.05', 'roundUp')).toBe('100.15');
    expect(roundToTick('100.12', '0.05', 'roundDown')).toBe('100.1');
    expect(isMultipleOfTick('100.15', '0.05')).toBe(true);
    expect(isMultipleOfTick('100.12', '0.05')).toBe(false);
  });

  it('converts quantity to lots using lot size', () => {
    expect(quantityToLots('25', 10)).toBe(2);
    expect(quantityToLots('30', 10)).toBe(3);
    expect(quantityToLots('29', 10, 'roundUp')).toBe(3);
    expect(lotsToQuantity(3, 10)).toBe('30');
  });

  it('rejects non-positive tick and lot size', () => {
    expect(() => roundToTick('1', '0')).toThrow(/tickSize/);
    expect(() => quantityToLots('10', 0)).toThrow(/lotSize/);
  });
});
