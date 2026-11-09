import { expect, type Page, type Route, test } from '@playwright/test';

async function mockAdminApi(page: Page): Promise<void> {
  await page.route('**/api/v1/admin/sandbox/**', async (route: Route) => {
    const request = route.request();
    const auth = request.headers().authorization ?? '';
    if (!auth.startsWith('Bearer ') || auth.slice('Bearer '.length).trim().length === 0) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unauthorized', message: 'Admin bearer token required' }),
      });
      return;
    }
    if (auth !== 'Bearer admin-e2e-token') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'forbidden', message: 'Admin permission required' }),
      });
      return;
    }

    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'GET' && path.endsWith('/api/v1/admin/sandbox/overview')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          endpointHost: 'sandbox-invest-public-api.tbank.ru',
          environment: 'sandbox',
          accountTotal: 0,
          openOperationCount: 0,
          accountCountsByLocalStatus: {},
          lastVerifiedAt: null,
          fundPolicyNotes: ['SandboxPayIn cannot withdraw'],
        }),
      });
      return;
    }

    if (method === 'POST' && path.endsWith('/api/v1/admin/sandbox/accounts')) {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          operationId: '11111111-1111-4111-8111-111111111111',
          status: 'queued',
          pollingUrl: '/api/v1/admin/sandbox/operations/11111111-1111-4111-8111-111111111111',
        }),
      });
      return;
    }

    if (method === 'GET' && path.endsWith('/api/v1/admin/sandbox/accounts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accounts: [] }),
      });
      return;
    }

    if (method === 'GET' && path.endsWith('/api/v1/admin/sandbox/operations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ operations: [] }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'not_found', message: path }),
    });
  });
}

test.describe('Sandbox Admin UI', () => {
  test('blocks anonymous access until admin token is provided', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/admin/sandbox');
    await expect(page.getByRole('heading', { name: 'Sandbox Admin' })).toBeVisible();
    await expect(page.getByText(/Admin API token/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlock Admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync all' })).toHaveCount(0);
  });

  test('rejects wrong token via API and unlocks with valid token', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/admin/sandbox');

    await page.getByLabel('Admin API token').fill('wrong-token');
    await page.getByRole('button', { name: 'Unlock Admin' }).click();
    await expect(page.getByText(/Admin permission required|forbidden|HTTP 403/i)).toBeVisible();

    await page.getByRole('button', { name: 'Lock' }).click();
    await page.getByLabel('Admin API token').fill('admin-e2e-token');
    await page.getByRole('button', { name: 'Unlock Admin' }).click();
    await expect(page.getByText('Host: sandbox-invest-public-api.tbank.ru')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync all' })).toBeVisible();
  });

  test('create account shows queued operation without optimistic success', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/admin/sandbox');
    await page.getByLabel('Admin API token').fill('admin-e2e-token');
    await page.getByRole('button', { name: 'Unlock Admin' }).click();

    await page.getByLabel('Create account name').fill('e2e-bot');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByText(/Create queued: 11111111-1111-4111-8111-111111111111/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Waiting for confirmed backend status — not marked success yet/i),
    ).toBeVisible();
    await expect(page.getByText(/\bsucceeded\b/i)).toHaveCount(0);
  });
});
