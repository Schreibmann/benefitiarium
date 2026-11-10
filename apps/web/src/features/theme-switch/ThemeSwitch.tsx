import { useTheme } from './ThemeProvider.js';
import './theme-switch.css';

type Props = {
  className?: string;
};

export function ThemeSwitch(props: Props) {
  const { mode, toggleMode } = useTheme();
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const className =
    props.className === undefined || props.className.length === 0
      ? 'theme-switch'
      : `theme-switch ${props.className}`;

  return (
    <button
      type="button"
      className={className}
      onClick={toggleMode}
      aria-label={label}
      title={label}
      data-mode={mode}
    >
      <span className="theme-switch__icon" aria-hidden="true">
        {mode === 'dark' ? '☾' : '☀'}
      </span>
      <span className="theme-switch__text">{mode === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
