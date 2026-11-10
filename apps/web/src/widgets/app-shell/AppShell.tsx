import { type ReactNode, useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    writeSidebarCollapsed(storage, collapsed);
  }, [collapsed, storage]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const shellClass = collapsed ? 'app-shell app-shell--collapsed' : 'app-shell';

  return (
    <div className={shellClass}>
      <AppSidebar
        pathname={props.pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onNavigate={closeMobile}
        onCloseMobile={closeMobile}
      />
      <div className="app-shell__main">
        <AppTopbar title={pageTitleForPath(props.pathname)} onOpenMobileNav={openMobile} />
        <div className="app-shell__content">{props.children}</div>
      </div>
    </div>
  );
}
