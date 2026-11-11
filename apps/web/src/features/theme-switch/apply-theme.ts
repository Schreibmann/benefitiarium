import {
  readStoredThemePreference,
  resolveThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
  type ThemePreference,
} from './theme-preference.js';

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function readThemePreferenceFromStorage(storage: Storage): ThemePreference {
  const stored = readStoredThemePreference(storage.getItem(THEME_STORAGE_KEY));
  return stored ?? 'system';
}

export function writeThemePreferenceToStorage(storage: Storage, preference: ThemePreference): void {
  storage.setItem(THEME_STORAGE_KEY, preference);
}

export type ThemeRoot = {
  dataset: {
    theme?: string;
  };
};

export function applyThemeMode(root: ThemeRoot, mode: ThemeMode): void {
  root.dataset.theme = mode;
}

export function bootstrapThemeFromStorage(options: {
  root: ThemeRoot;
  storage: Storage;
  systemPrefersDark: boolean;
}): ThemeMode {
  const preference = readThemePreferenceFromStorage(options.storage);
  const mode = resolveThemeMode(preference, options.systemPrefersDark);
  applyThemeMode(options.root, mode);
  return mode;
}
