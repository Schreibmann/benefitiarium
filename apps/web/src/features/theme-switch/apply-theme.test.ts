import { describe, expect, it } from 'vitest';
import {
  applyThemeMode,
  bootstrapThemeFromStorage,
  readThemePreferenceFromStorage,
  type ThemeRoot,
  writeThemePreferenceToStorage,
} from './apply-theme.js';
import { THEME_STORAGE_KEY } from './theme-preference.js';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function createRoot(): ThemeRoot {
  return { dataset: {} };
}

describe('apply-theme', () => {
  it('persists and reads preference from storage', () => {
    const storage = new MemoryStorage();
    expect(readThemePreferenceFromStorage(storage)).toBe('system');
    writeThemePreferenceToStorage(storage, 'light');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(readThemePreferenceFromStorage(storage)).toBe('light');
  });

  it('applies data-theme on the root element', () => {
    const root = createRoot();
    applyThemeMode(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('bootstraps resolved mode from storage and system', () => {
    const storage = new MemoryStorage();
    const root = createRoot();
    writeThemePreferenceToStorage(storage, 'system');
    const mode = bootstrapThemeFromStorage({
      root,
      storage,
      systemPrefersDark: false,
    });
    expect(mode).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });
});
