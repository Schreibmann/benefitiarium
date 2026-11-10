import { lazy, Suspense } from 'react';
import { AppProviders } from './app/providers/AppProviders.js';
import { HomePage } from './pages/home/HomePage.js';

const SandboxAdminApp = lazy(async () => {
  const module = await import('./features/admin/sandbox/SandboxAdminApp.js');
  return { default: module.SandboxAdminApp };
});

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/');
}

function RouteFallback() {
  return <main className="route-fallback">Loading…</main>;
}

export function App() {
  if (isAdminPath(window.location.pathname)) {
    return (
      <AppProviders>
        <Suspense fallback={<RouteFallback />}>
          <SandboxAdminApp />
        </Suspense>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <HomePage />
    </AppProviders>
  );
}
