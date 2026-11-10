export const THEME_STORAGE_KEY = 'benefitiarium.theme';

export type ThemeMode = 'dark' | 'light';

export type ThemePreference = ThemeMode | 'system';

export function isThemeMode(value: string): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

export function isThemePreference(value: string): value is ThemePreference {
  return value === 'system' || isThemeMode(value);
}

export function readStoredThemePreference(raw: string | null): ThemePreference | null {
  if (raw === null) {
    return null;
  }
  if (!isThemePreference(raw)) {
    return null;
  }
  return raw;
}

export function resolveThemeMode(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeMode {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return preference;
}

export function nextThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}
