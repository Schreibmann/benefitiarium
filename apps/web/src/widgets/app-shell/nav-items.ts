export type AppNavId =
  | 'overview'
  | 'market'
  | 'analytics'
  | 'signals'
  | 'strategies'
  | 'backtesting'
  | 'trading'
  | 'portfolio'
  | 'sandbox'
  | 'settings';

export type AppNavItem = {
  id: AppNavId;
  label: string;
  href: string;
  badgeCount?: number;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { id: 'overview', label: 'Обзор', href: '/app' },
  { id: 'market', label: 'Рынок', href: '/app/market' },
  { id: 'analytics', label: 'Аналитика', href: '/app/analytics' },
  { id: 'signals', label: 'Сигналы', href: '/app/signals' },
  { id: 'strategies', label: 'Стратегии', href: '/app/strategies' },
  { id: 'backtesting', label: 'Backtesting', href: '/app/backtesting' },
  { id: 'trading', label: 'Торговля', href: '/app/trading' },
  { id: 'portfolio', label: 'Портфель', href: '/app/portfolio' },
  { id: 'sandbox', label: 'Sandbox', href: '/admin/sandbox' },
  { id: 'settings', label: 'Настройки', href: '/app/settings' },
];

export function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export function matchNavItem(pathname: string): AppNavItem | null {
  if (pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/')) {
    const sandbox = APP_NAV_ITEMS.find((item) => item.id === 'sandbox');
    return sandbox ?? null;
  }

  let best: AppNavItem | null = null;
  for (const item of APP_NAV_ITEMS) {
    if (item.id === 'sandbox') {
      continue;
    }
    if (pathname === item.href) {
      return item;
    }
    if (item.href !== '/app' && pathname.startsWith(`${item.href}/`)) {
      if (best === null || item.href.length > best.href.length) {
        best = item;
      }
    }
  }
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const overview = APP_NAV_ITEMS.find((item) => item.id === 'overview');
    return best ?? overview ?? null;
  }
  return best;
}

export function pageTitleForPath(pathname: string): string {
  const item = matchNavItem(pathname);
  if (item === null) {
    return 'BENEFITIARIUM';
  }
  if (item.id === 'overview') {
    return 'Обзор';
  }
  return item.label;
}
