import { SignalsPage } from '../../features/signals/SignalsPage.js';
import { StrategiesPage } from '../../features/strategies/StrategiesPage.js';
import { AppShell } from '../../widgets/app-shell/AppShell.js';
import { matchNavItem } from '../../widgets/app-shell/nav-items.js';
import { DashboardOverviewPage } from '../dashboard/DashboardOverviewPage.js';
import { AppSectionPlaceholder } from './AppSectionPlaceholder.js';

type Props = {
  pathname: string;
};

function sectionBody(pathname: string) {
  const item = matchNavItem(pathname);
  if (item === null || item.id === 'overview') {
    return <DashboardOverviewPage />;
  }
  if (item.id === 'signals') {
    return <SignalsPage />;
  }
  if (item.id === 'strategies') {
    return <StrategiesPage />;
  }
  if (item.id === 'sandbox') {
    return (
      <AppSectionPlaceholder
        title="Sandbox"
        description="Sandbox Admin opens at /admin/sandbox and stays behind the ADMIN token."
      />
    );
  }
  return (
    <AppSectionPlaceholder
      title={item.label}
      description={`${item.label} UI arrives in a later stage. Empty state only — no demo data.`}
    />
  );
}

export function AppRouter(props: Props) {
  return <AppShell pathname={props.pathname}>{sectionBody(props.pathname)}</AppShell>;
}
