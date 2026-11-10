export const SIDEBAR_STORAGE_KEY = 'benefitiarium.sidebar.collapsed';

export function readSidebarCollapsed(raw: string | null): boolean {
  return raw === '1' || raw === 'true';
}

export function writeSidebarCollapsed(storage: Storage, collapsed: boolean): void {
  storage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
}

export function readSidebarCollapsedFromStorage(storage: Storage): boolean {
  return readSidebarCollapsed(storage.getItem(SIDEBAR_STORAGE_KEY));
}
