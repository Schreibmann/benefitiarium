import { SandboxAdminApp } from './features/admin/sandbox/SandboxAdminApp';
import './features/admin/sandbox/sandbox-admin.css';
import { PriceChartApp } from './features/chart/PriceChartApp';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/');
}

function isChartPath(pathname: string): boolean {
  return pathname === '/charts' || pathname.startsWith('/charts/');
}

export function App() {
  if (isAdminPath(window.location.pathname)) {
    return <SandboxAdminApp />;
  }

  if (isChartPath(window.location.pathname)) {
    const parts = window.location.pathname.split('/').filter((part) => part.length > 0);
    const tickerFromPath = parts.length >= 2 ? decodeURIComponent(parts[1] ?? '') : undefined;
    return (
      <PriceChartApp
        initialTicker={tickerFromPath && tickerFromPath.length > 0 ? tickerFromPath : 'NG-12.26'}
      />
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
