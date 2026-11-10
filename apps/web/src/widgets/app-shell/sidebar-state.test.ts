import { describe, expect, it } from 'vitest';
import {
  readSidebarCollapsed,
  readSidebarCollapsedFromStorage,
  SIDEBAR_STORAGE_KEY,
  writeSidebarCollapsed,
} from './sidebar-state.js';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('sidebar-state', () => {
  it('parses collapsed flags', () => {
    expect(readSidebarCollapsed(null)).toBe(false);
    expect(readSidebarCollapsed('1')).toBe(true);
    expect(readSidebarCollapsed('true')).toBe(true);
    expect(readSidebarCollapsed('0')).toBe(false);
  });

  it('persists collapsed state', () => {
    const storage = new MemoryStorage();
    writeSidebarCollapsed(storage, true);
    expect(storage.getItem(SIDEBAR_STORAGE_KEY)).toBe('1');
    expect(readSidebarCollapsedFromStorage(storage)).toBe(true);
    writeSidebarCollapsed(storage, false);
    expect(readSidebarCollapsedFromStorage(storage)).toBe(false);
  });
});
