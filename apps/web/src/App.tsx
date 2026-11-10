import { lazy, Suspense } from 'react';
import { AppProviders } from './app/providers/AppProviders.js';
import { AppRouter } from './pages/app/AppRouter.js';
import { HomePage } from './pages/home/HomePage.js';
import { isAppPath } from './widgets/app-shell/nav-items.js';

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

  if (isAppPath(pathname)) {
    return (
      <AppProviders>
        <AppRouter pathname={pathname} />
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <HomePage />
    </AppProviders>
  );
}
