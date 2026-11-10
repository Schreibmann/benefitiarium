import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyThemeMode,
  getSystemPrefersDark,
  readThemePreferenceFromStorage,
  writeThemePreferenceToStorage,
} from './apply-theme.js';
import {
  nextThemeMode,
  resolveThemeMode,
  type ThemeMode,
  type ThemePreference,
} from './theme-preference.js';

type ThemeContextValue = {
  preference: ThemePreference;
  mode: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
  storage?: Storage;
};

export function ThemeProvider(props: Props) {
  const storage = props.storage ?? window.localStorage;
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readThemePreferenceFromStorage(storage),
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemPrefersDark());

  const mode = useMemo(
    () => resolveThemeMode(preference, systemPrefersDark),
    [preference, systemPrefersDark],
  );

  useEffect(() => {
    applyThemeMode(document.documentElement, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      writeThemePreferenceToStorage(storage, next);
    },
    [storage],
  );

  const toggleMode = useCallback(() => {
    const next = nextThemeMode(mode);
    setPreference(next);
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      mode,
      setPreference,
      toggleMode,
    }),
    [preference, mode, setPreference, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
