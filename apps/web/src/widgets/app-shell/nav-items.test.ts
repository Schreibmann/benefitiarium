import { describe, expect, it } from 'vitest';
import { isAppPath, matchNavItem, pageTitleForPath } from './nav-items.js';

describe('app-shell nav-items', () => {
  it('detects app paths', () => {
    expect(isAppPath('/app')).toBe(true);
    expect(isAppPath('/app/market')).toBe(true);
    expect(isAppPath('/')).toBe(false);
    expect(isAppPath('/admin/sandbox')).toBe(false);
  });

  it('matches nested routes to the closest nav item', () => {
    expect(matchNavItem('/app')?.id).toBe('overview');
    expect(matchNavItem('/app/market')?.id).toBe('market');
    expect(matchNavItem('/app/signals/history')?.id).toBe('signals');
    expect(matchNavItem('/admin/sandbox')?.id).toBe('sandbox');
  });

  it('returns page titles for shell topbar', () => {
    expect(pageTitleForPath('/app')).toBe('Обзор');
    expect(pageTitleForPath('/app/trading')).toBe('Торговля');
  });
});
