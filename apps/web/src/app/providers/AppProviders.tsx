import type { ReactNode } from 'react';
import { ThemeProvider } from '../../features/theme-switch/ThemeProvider.js';

type Props = {
  children: ReactNode;
};

export function AppProviders(props: Props) {
  return <ThemeProvider>{props.children}</ThemeProvider>;
}
