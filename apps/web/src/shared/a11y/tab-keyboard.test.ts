import { describe, expect, it } from 'vitest';
import { nextTabIndex, tabKeyDirection } from './tab-keyboard.js';

describe('tab-keyboard', () => {
  it('maps arrow keys to directions', () => {
    expect(tabKeyDirection('ArrowRight')).toBe('next');
    expect(tabKeyDirection('ArrowDown')).toBe('next');
    expect(tabKeyDirection('ArrowLeft')).toBe('prev');
    expect(tabKeyDirection('ArrowUp')).toBe('prev');
    expect(tabKeyDirection('Enter')).toBe('none');
  });

  it('wraps tab indices', () => {
    expect(nextTabIndex(0, 2, 'next')).toBe(1);
    expect(nextTabIndex(1, 2, 'next')).toBe(0);
    expect(nextTabIndex(0, 2, 'prev')).toBe(1);
    expect(nextTabIndex(1, 2, 'prev')).toBe(0);
    expect(nextTabIndex(0, 2, 'none')).toBe(0);
  });
});
