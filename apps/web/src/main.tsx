import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import {
  bootstrapThemeFromStorage,
  getSystemPrefersDark,
} from './features/theme-switch/apply-theme.js';
import './shared/styles/base.css';

bootstrapThemeFromStorage({
  root: document.documentElement,
  storage: window.localStorage,
  systemPrefersDark: getSystemPrefersDark(),
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
