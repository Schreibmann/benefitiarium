import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Prefer Playwright-managed browsers. On Windows, if install hangs on
 * headless_shell extract, fall back to a manually extracted chromium build.
 */
function resolveLaunchOptions(): { executablePath: string; args: string[] } | undefined {
  const localChrome = join(
    process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'),
    'ms-playwright',
    'chromium-1194',
    'chrome-win',
    'chrome.exe',
  );
  if (process.platform === 'win32' && existsSync(localChrome)) {
    return { executablePath: localChrome, args: ['--headless=new'] };
  }
  return undefined;
}

const launchOptions = resolveLaunchOptions();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    headless: true,
    ...(launchOptions !== undefined ? { launchOptions } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    cwd: '.',
    timeout: 120_000,
  },
});
