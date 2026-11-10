import { lazy, Suspense } from 'react';

const SandboxAdminApp = lazy(async () => {
  const module = await import('./features/admin/sandbox/SandboxAdminApp');
  return { default: module.SandboxAdminApp };
});

const PriceChartApp = lazy(async () => {
  const module = await import('./features/chart/PriceChartApp');
  return { default: module.PriceChartApp };
});

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/');
}

function isChartPath(pathname: string): boolean {
  return pathname === '/charts' || pathname.startsWith('/charts/');
}

function RouteFallback() {
  return <main>Loading…</main>;
}

export function App() {
  if (isAdminPath(window.location.pathname)) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <SandboxAdminApp />
      </Suspense>
    );
  }

  if (isChartPath(window.location.pathname)) {
    const parts = window.location.pathname.split('/').filter((part) => part.length > 0);
    const tickerFromPath = parts.length >= 2 ? decodeURIComponent(parts[1] ?? '') : undefined;
    return (
      <Suspense fallback={<RouteFallback />}>
        <PriceChartApp
          initialTicker={tickerFromPath && tickerFromPath.length > 0 ? tickerFromPath : 'NG-12.26'}
        />
      </Suspense>
    );
  }

  return (
    <main>
      <h1>MOEX Trading Platform</h1>
      <p>Research / trading scaffold. Sandbox Admin and Fibonacci pivot chart are available.</p>
      <p>
        <a href="/charts/NG-12.26">Chart → NG-12.26 (5m/1h + Fibonacci pivots)</a>
      </p>
      <p>
        <a href="/admin/sandbox">Admin → Sandbox</a> (requires server-side ADMIN token)
      </p>
    </main>
  );
}
