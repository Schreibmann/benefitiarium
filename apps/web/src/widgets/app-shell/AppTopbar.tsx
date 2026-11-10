type Props = {
  title: string;
  onOpenMobileNav: () => void;
};

export function AppTopbar(props: Props) {
  return (
    <header className="app-topbar">
      <div className="app-topbar__left">
        <button
          type="button"
          className="app-topbar__menu"
          aria-label="Open navigation"
          onClick={props.onOpenMobileNav}
        >
          <span className="app-topbar__menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="app-topbar__titles">
          <h1 className="app-topbar__title">{props.title}</h1>
          <p className="app-topbar__subtitle">BENEFITIARIUM</p>
        </div>
      </div>

      <div className="app-topbar__right">
        <label className="app-topbar__search">
          <span className="visually-hidden">Search instruments</span>
          <input
            type="search"
            placeholder="Поиск инструментов…"
            disabled
            aria-disabled="true"
            title="Instrument search arrives with Market UI"
          />
        </label>
        <button
          type="button"
          className="app-topbar__icon-btn"
          aria-label="Notifications"
          disabled
          title="Notifications — later stage"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z"
            />
          </svg>
        </button>
        <div
          className="app-topbar__avatar"
          role="img"
          aria-label="Profile placeholder"
          title="Profile"
        >
          —
        </div>
      </div>
    </header>
  );
}
