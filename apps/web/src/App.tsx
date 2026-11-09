import { SandboxAdminApp } from './features/admin/sandbox/SandboxAdminApp';
import './features/admin/sandbox/sandbox-admin.css';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin/sandbox' || pathname.startsWith('/admin/sandbox/');
}

export function App() {
  if (isAdminPath(window.location.pathname)) {
    return <SandboxAdminApp />;
  }

  return (
    <main>
      <h1>MOEX Trading Platform</h1>
      <p>M0 foundation skeleton. Market data and trading UI arrive in later milestones.</p>
      <p>
        <a href="/admin/sandbox">Admin → Sandbox</a> (requires server-side ADMIN token)
      </p>
    </main>
  );
}
