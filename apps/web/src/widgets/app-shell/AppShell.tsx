import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { SkipLink } from '../../shared/a11y/SkipLink.js';
import { useDrawerLayout } from '../../shared/a11y/use-drawer-layout.js';
import { AppSidebar } from './AppSidebar.js';
import { AppTopbar } from './AppTopbar.js';
import { pageTitleForPath } from './nav-items.js';
import { readSidebarCollapsedFromStorage, writeSidebarCollapsed } from './sidebar-state.js';
import './app-shell.css';

type Props = {
  pathname: string;
  children: ReactNode;
  storage?: Storage;
};

export function AppShell(props: Props) {
  const storage = props.storage ?? window.localStorage;
  const [collapsed, setCollapsed] = useState(() => readSidebarCollapsedFromStorage(storage));
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerLayout = useDrawerLayout();

  useEffect(() => {
    writeSidebarCollapsed(storage, collapsed);
  }, [collapsed, storage]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((value) => !value);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const shellClass = collapsed ? 'app-shell app-shell--collapsed' : 'app-shell';
  const sidebarInert = drawerLayout && !mobileOpen;

  return (
    <div className={shellClass}>
      <SkipLink targetId="app-main" />
      <AppSidebar
        pathname={props.pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        inert={sidebarInert}
        onToggleCollapsed={toggleCollapsed}
        onNavigate={closeMobile}
        onCloseMobile={closeMobile}
      />
      <div className="app-shell__main">
        <AppTopbar
          title={pageTitleForPath(props.pathname)}
          mobileNavOpen={mobileOpen}
          onToggleMobileNav={toggleMobile}
        />
        <main className="app-shell__content" id="app-main" tabIndex={-1}>
          {props.children}
        </main>
      </div>
    </div>
  );
}
