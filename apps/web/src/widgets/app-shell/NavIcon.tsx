import type { AppNavId } from './nav-items.js';

type Props = {
  id: AppNavId;
};

export function NavIcon(props: Props) {
  switch (props.id) {
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </svg>
      );
    case 'market':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path
            fill="currentColor"
            d="M4 18h2V9H4v9zm5 0h2V5H9v13zm5 0h2v-7h-2v7zm5 0h2V3h-2v15z"
          />
        </svg>
      );
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path
            fill="currentColor"
            d="M3.5 18.5 9 13l3.5 3.5L20.5 8l-1.4-1.4-6.6 6.6L9 10 2.1 17.1l1.4 1.4z"
          />
        </svg>
      );
    case 'signals':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M12 3 4 19h16L12 3zm0 4.5 5.2 10H6.8L12 7.5z" />
        </svg>
      );
    case 'strategies':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M7 3h10v4H7V3zm0 7h10v4H7v-4zm0 7h10v4H7v-4z" />
        </svg>
      );
    case 'backtesting':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M12 4a8 8 0 1 0 7.75 10H17.6A6 6 0 1 1 12 6v4l5-5-5-5v4z" />
        </svg>
      );
    case 'trading':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path
            fill="currentColor"
            d="M7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2zM4 4h16v16H4V4z"
          />
        </svg>
      );
    case 'portfolio':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M3 7h18v12H3V7zm4-3h10v2H7V4z" />
        </svg>
      );
    case 'sandbox':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path fill="currentColor" d="M4 4h16v4H4V4zm0 6h7v10H4V10zm9 0h7v10h-7V10z" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon">
          <path
            fill="currentColor"
            d="M19.1 12.9c0-.3.1-.6.1-.9s0-.6-.1-.9l2-1.5-2-3.5-2.4 1a7.4 7.4 0 0 0-1.6-.9l-.4-2.6H9.3l-.4 2.6c-.6.2-1.1.5-1.6.9l-2.4-1-2 3.5 2 1.5c0 .3-.1.6-.1.9s0 .6.1.9l-2 1.5 2 3.5 2.4-1c.5.4 1 .7 1.6.9l.4 2.6h5.4l.4-2.6c.6-.2 1.1-.5 1.6-.9l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
          />
        </svg>
      );
  }
}
