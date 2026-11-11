import { describe, expect, it } from 'vitest';
import {
  isThemeMode,
  isThemePreference,
  nextThemeMode,
  readStoredThemePreference,
  resolveThemeMode,
} from './theme-preference.js';

describe('theme-preference', () => {
  it('accepts only dark|light|system preferences', () => {
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemeMode('system')).toBe(false);
  });

  it('reads stored preference or returns null for junk', () => {
    expect(readStoredThemePreference('dark')).toBe('dark');
    expect(readStoredThemePreference('system')).toBe('system');
    expect(readStoredThemePreference(null)).toBe(null);
    expect(readStoredThemePreference('neon')).toBe(null);
  });

  it('resolves system preference against OS scheme', () => {
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('light', true)).toBe('light');
  });

  it('toggles dark and light', () => {
    expect(nextThemeMode('dark')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
  });
});
