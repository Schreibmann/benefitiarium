import { lazy, Suspense } from 'react';
import { AppProviders } from './app/providers/AppProviders.js';
import { AppRouter } from './pages/app/AppRouter.js';
import { LandingPage } from './pages/landing/LandingPage.js';
import { isAppPath } from './widgets/app-shell/nav-items.js';

const SandboxAdminApp = lazy(async () => {
  const module = await import('./features/admin/sandbox/SandboxAdminApp.js');
  return { default: module.SandboxAdminApp };
});

const PriceChartApp = lazy(async () => {
  const module = await import('./features/chart/PriceChartApp.js');
  return { default: module.PriceChartApp };
});

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/');
}

function isChartPath(pathname: string): boolean {
  return pathname === '/charts' || pathname.startsWith('/charts/');
}

function RouteFallback() {
  return <main className="route-fallback">Loading…</main>;
}

export function App() {
  const pathname = window.location.pathname;

  if (isAdminPath(pathname)) {
    return (
      <AppProviders>
        <Suspense fallback={<RouteFallback />}>
          <SandboxAdminApp />
        </Suspense>
      </AppProviders>
    );
  }

  if (isChartPath(pathname)) {
    const parts = pathname.split('/').filter((part) => part.length > 0);
    const tickerFromPath = parts.length >= 2 ? decodeURIComponent(parts[1] ?? '') : undefined;
    return (
      <AppProviders>
        <Suspense fallback={<RouteFallback />}>
          <PriceChartApp
            initialTicker={
              tickerFromPath && tickerFromPath.length > 0 ? tickerFromPath : 'NG-12.26'
            }
          />
        </Suspense>
      </AppProviders>
    );
  }

  if (isAppPath(pathname)) {
    return (
      <AppProviders>
        <AppRouter pathname={pathname} />
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <LandingPage />
    </AppProviders>
  );
}
