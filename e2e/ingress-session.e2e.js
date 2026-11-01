import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/hassio_ingress/e2e/', async (route) => {
    const response = await route.fetch({ url: new URL('/', route.request().url()).href });
    await route.fulfill({ response });
  });
});

test('reuses and refreshes the HA parent session without storing its token', async ({
  page,
  mockHAConnection,
}) => {
  void mockHAConnection;
  const apiTokens = [];
  await page.route('**/api/profiles**', (route) => {
    apiTokens.push(route.request().headers().authorization);
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/settings/**', (route) => {
    apiTokens.push(route.request().headers().authorization);
    return route.fulfill({ json: { revision: 1, data: null } });
  });
  await page.route('**/e2e-parent', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<iframe title="Tunet" src="/api/hassio_ingress/e2e/"></iframe>',
    })
  );
  await page.addInitScript(() => {
    localStorage.setItem('tunet_language', 'en');
    localStorage.setItem(
      'tunet_pages_config',
      JSON.stringify({ header: [], pages: ['home'], home: ['light.bedroom'] })
    );
    if (window === window.parent) {
      window.__refreshes = 0;
      window.__parentAuth = {
        accessToken: 'parent-token',
        expired: false,
        wsUrl: 'ws://localhost:8123/api/websocket',
        async refreshAccessToken() {
          window.__refreshes += 1;
          this.accessToken = 'renewed-parent-token';
          this.expired = false;
        },
      };
      window.hassConnection = Promise.resolve({ auth: window.__parentAuth });
    }
  });
  await page.goto('/e2e-parent');
  const panel = page.frameLocator('iframe');
  const light = panel.getByRole('button', { name: /^Bedroom Light: off$/i });
  await expect(light).toBeVisible();
  await expect.poll(() => apiTokens.includes('Bearer parent-token')).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('ha_token'))).toBeNull();
  await page.evaluate(() => {
    window.__parentAuth.expired = true;
    document.querySelector('iframe').contentWindow.location.reload();
  });
  await expect.poll(() => page.evaluate(() => window.__refreshes)).toBeGreaterThan(0);
  await expect(light).toBeVisible();
  await expect.poll(() => apiTokens.includes('Bearer renewed-parent-token')).toBe(true);
  await light.click();
  const child = page.frames().find((frame) => frame.url().includes('/hassio_ingress/'));
  await expect
    .poll(() =>
      child.evaluate(() => window.__haServiceCalls.some((call) => call.service === 'toggle'))
    )
    .toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('ha_token'))).toBeNull();
  await expect(panel.getByRole('dialog', { name: 'Get started' })).toHaveCount(0);
});

test('offers manual login when Ingress has no parent HA session', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunet_language', 'en'));
  await page.goto('/api/hassio_ingress/e2e/');
  await expect(page.getByRole('dialog', { name: 'Get started' })).toBeVisible();
});
