import { ThemeSwitch } from '../../features/theme-switch/ThemeSwitch.js';
import { BrandMark } from '../../shared/ui/BrandMark.js';
import { NavIcon } from './NavIcon.js';
import { APP_NAV_ITEMS, type AppNavId, matchNavItem } from './nav-items.js';

type Props = {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
  onCloseMobile: () => void;
};

export function AppSidebar(props: Props) {
  const active = matchNavItem(props.pathname);
  const activeId: AppNavId | null = active?.id ?? null;

  const classNames = [
    'app-sidebar',
    props.collapsed ? 'app-sidebar--collapsed' : null,
    props.mobileOpen ? 'app-sidebar--mobile-open' : null,
  ]
    .filter((value) => value !== null)
    .join(' ');

  return (
    <>
      {props.mobileOpen ? (
        <button
          type="button"
          className="app-sidebar__backdrop"
          aria-label="Close navigation"
          onClick={props.onCloseMobile}
        />
      ) : null}
      <aside className={classNames} aria-label="Primary">
        <div className="app-sidebar__brand">
          <BrandMark compact={props.collapsed} />
          <button
            type="button"
            className="app-sidebar__collapse"
            onClick={props.onToggleCollapsed}
            aria-label={props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={props.collapsed ? 'Expand' : 'Collapse'}
          >
            {props.collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          {APP_NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            const linkClass = isActive
              ? 'app-sidebar__link app-sidebar__link--active'
              : 'app-sidebar__link';
            return (
              <a
                key={item.id}
                href={item.href}
                className={linkClass}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                onClick={props.onNavigate}
              >
                <NavIcon id={item.id} />
                <span className="app-sidebar__label">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__status" title="Market data not connected">
            <span className="app-sidebar__status-dot" aria-hidden="true" />
            <span className="app-sidebar__status-text">Нет подключения к рынку</span>
          </div>
          <ThemeSwitch className="app-sidebar__theme" />
        </div>
      </aside>
    </>
  );
}
