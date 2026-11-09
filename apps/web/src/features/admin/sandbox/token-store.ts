const STORAGE_KEY = 'moex.admin.apiToken';

/** Session-only admin token holder. Never persisted to localStorage by default. */
export function createSessionTokenStore(storage: Storage = sessionStorage) {
  return {
    get: (): string | null => {
      const value = storage.getItem(STORAGE_KEY);
      if (value === null || value.trim().length === 0) {
        return null;
      }
      return value;
    },
    set: (token: string): void => {
      storage.setItem(STORAGE_KEY, token.trim());
    },
    clear: (): void => {
      storage.removeItem(STORAGE_KEY);
    },
  };
}
