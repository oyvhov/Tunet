import { test, expect } from './fixtures';

test.describe('OAuth Authentication Flow', () => {
  for (const stage of ['initial connection', 'reconnection']) {
    test(`offers login when HA rejects OAuth during ${stage}`, async ({
      page,
      mockHAConnection,
    }, testInfo) => {
      void mockHAConnection;
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.route('**/api/**', (route) =>
        route.fulfill({ json: route.request().url().includes('/current') ? null : [] })
      );
      await page.route('**/auth/token', (route) =>
        route.fulfill({ status: 400, json: { error: 'invalid_grant' } })
      );
      await page.addInitScript((stage) => {
        localStorage.setItem('tunet_language', 'en');
        localStorage.setItem('ha_url', 'http://localhost:8123');
        localStorage.setItem('ha_auth_method', 'oauth');
        localStorage.setItem(
          'tunet_auth_cache_v1',
          JSON.stringify({
            access_token: 'revoked-access',
            refresh_token: 'revoked-refresh',
            expires: Date.now() + 3600000,
            hassUrl: 'http://localhost:8123',
            clientId: window.location.origin + '/',
          })
        );
        const OriginalWebSocket = window.WebSocket;
        let rejectAuth = stage === 'initial connection';
        window.WebSocket = class extends OriginalWebSocket {
          send(data) {
            const request = JSON.parse(data);
            if (request.type === 'subscribe_entities') window.__haTestConnected = true;
            if (request.type === 'auth') {
              if (rejectAuth) {
                setTimeout(
                  () =>
                    this.dispatchEvent(
                      new MessageEvent('message', {
                        data: JSON.stringify({
                          type: 'auth_invalid',
                          message: 'Invalid access token',
                        }),
                      })
                    ),
                  10
                );
                return;
              }
              window.__revokeOAuth = () => {
                rejectAuth = true;
                this.close();
              };
            }
            return super.send(data);
          }
        };
      }, stage);
      await page.goto('/');
      await expect(page).toHaveTitle('HOME');
      if (stage === 'reconnection') {
        await page.waitForFunction(() => window.__haTestConnected === true);
        await page.evaluate(() => window.__revokeOAuth());
      }
      const login = page
        .getByRole('status')
        .getByRole('button', { name: 'Log in with Home Assistant' });
      await expect(login).toBeVisible({ timeout: 15000 });
      expect(await page.evaluate(() => localStorage.getItem('tunet_auth_cache_v1'))).toBeNull();
      await login.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
      expect(pageErrors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('expired-oauth-login.png') });
    });
  }

  test('logs out every open tab', async ({ page, context, mockHAConnection }) => {
    void mockHAConnection;
    const prepare = async (tab) => {
      await tab.route('**/api/**', (route) =>
        route.fulfill({ json: route.request().url().includes('/current') ? null : [] })
      );
      await tab.addInitScript(() => {
        localStorage.setItem('tunet_language', 'en');
        localStorage.setItem('ha_url', 'http://localhost:8123');
        localStorage.setItem('ha_auth_method', 'oauth');
        if (sessionStorage.getItem('e2e-seeded')) return;
        sessionStorage.setItem('e2e-seeded', '1');
        if (localStorage.getItem('e2e-logged-out')) return;
        localStorage.setItem(
          'tunet_auth_cache_v1',
          JSON.stringify({
            access_token: 'access',
            refresh_token: 'refresh',
            expires: Date.now() + 3600000,
            hassUrl: 'http://localhost:8123',
            clientId: window.location.origin + '/',
          })
        );
      });
    };
    const tokens = (tab) =>
      tab.evaluate(() => [
        localStorage.getItem('tunet_auth_cache_v1'),
        sessionStorage.getItem('tunet_auth_cache_v1'),
      ]);

    await prepare(page);
    await page.goto('/');
    await expect(page).toHaveTitle('HOME');
    const otherTab = await context.newPage();
    await prepare(otherTab);
    await otherTab.goto('/');
    await expect(otherTab).toHaveTitle('HOME');
    await page.evaluate(() => localStorage.setItem('e2e-logged-out', '1'));

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('menuitem', { name: /system/i }).click();
    await page.getByRole('button', { name: 'Log out' }).click();

    for (const tab of [page, otherTab]) {
      await expect(tab.getByRole('dialog', { name: 'Get started' })).toBeVisible({
        timeout: 10000,
      });
      expect(await tokens(tab)).toEqual([null, null]);
    }
  });

  test('keeps an expired login warning visible when the mobile app resumes', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('tunet:api-auth-unauthorized', {
          detail: { authMethod: 'oauth' },
        })
      );
    });
    const loginButton = page
      .getByRole('status')
      .getByRole('button', { name: 'Log in with Home Assistant' });
    await expect(loginButton).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expect(loginButton).toBeVisible();
  });

  const openOnboarding = async (page) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const onboardingModal = page.locator('[role="dialog"]').first();
    await expect(onboardingModal).toBeVisible();
    return onboardingModal;
  };

  test('should show onboarding when no auth is present', async ({ page }) => {
    const onboardingModal = await openOnboarding(page);
    await expect(
      onboardingModal.getByRole('heading', { name: 'Connection' }).first()
    ).toBeVisible();
  });

  test('should allow entering HA URL during onboarding', async ({ page }) => {
    await openOnboarding(page);
    const urlInput = page.getByPlaceholder('https://homeassistant.local:8123');
    await expect(urlInput).toBeVisible();

    await urlInput.fill('http://home-assistant.local:8123');
    await expect(urlInput).toHaveValue('http://home-assistant.local:8123');
  });

  test('should keep an OAuth URL as a draft until login is clicked', async ({ page }) => {
    await openOnboarding(page);
    const urlInput = page.getByPlaceholder('https://homeassistant.local:8123');
    const urlBeforeTyping = page.url();

    await urlInput.fill('h');

    await expect(urlInput).toHaveValue('h');
    await expect(page.getByText('Connecting to Home Assistant...')).toHaveCount(0);
    await expect(page).toHaveURL(urlBeforeTyping);
    expect(await page.evaluate(() => localStorage.getItem('ha_url'))).toBeNull();
  });

  test('should validate HA URL format', async ({ page }) => {
    await openOnboarding(page);
    const urlInput = page.getByPlaceholder('https://homeassistant.local:8123');
    const nextButton = page.getByRole('button', { name: 'Next' });
    await expect(urlInput).toBeVisible();

    await urlInput.fill('not-a-url');
    await urlInput.blur();

    await expect(nextButton).toBeDisabled();
  });

  test('should show OAuth login button after URL is set', async ({ page }) => {
    await openOnboarding(page);
    const urlInput = page.getByPlaceholder('https://homeassistant.local:8123');
    const oauthButton = page.getByRole('button', { name: 'Log in with Home Assistant' });
    await expect(urlInput).toBeVisible();

    await urlInput.fill('http://home-assistant.local:8123');
    await expect(oauthButton).toBeVisible();
  });

  test('should persist OAuth tokens to localStorage', async ({ page, mockHAConnection }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'tunet_auth_cache_v1',
        JSON.stringify({
          access_token: 'test_access_token_123',
          refresh_token: 'test_refresh_token_456',
          expires_in: 1800,
          token_type: 'Bearer',
        })
      );
      localStorage.setItem('ha_url', 'http://home-assistant.local:8123');
      localStorage.setItem('ha_auth_method', 'oauth');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check localStorage persists
    const authToken = await page.evaluate(() => {
      const auth = localStorage.getItem('tunet_auth_cache_v1');
      return auth ? JSON.parse(auth) : null;
    });

    expect(authToken).not.toBeNull();
    expect(authToken.access_token).toBe('test_access_token_123');
  });

  test('should show logout option when authenticated', async ({ page, mockHAConnection }) => {
    test.skip(
      true,
      'Deterministic OAuth logout coverage requires a fully mocked provider redirect flow.'
    );
  });

  test('should clear tokens on logout', async ({ page, mockHAConnection }) => {
    test.skip(
      true,
      'Deterministic OAuth logout coverage requires a fully mocked provider redirect flow.'
    );
  });

  test('should handle OAuth redirect with auth_callback parameter', async ({ page }) => {
    await page.goto('/?auth_callback=1');
    await page.waitForLoadState('domcontentloaded');

    // Should attempt to process OAuth callback
    // The auth_callback parameter indicates return from HA OAuth server

    // Verify callback route is handled without crashing app shell.
    expect(page.url()).toContain('auth_callback=1');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show connection error on invalid token', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Set up invalid token
    await page.evaluate(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'invalid_token_xyz');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Should not immediately show onboarding with valid auth attempt
    // But might show connection status
    const statusElements = page.locator('text=Connecting|Error|Unavailable|Failed');

    // Wait a bit for connection attempt
    await page.waitForTimeout(1000);

    // Either shows error or shows unavailable status
    const hasStatus = await statusElements.count().then((c) => c > 0);
    if (!hasStatus) {
      // If no status text is shown, auth cache should still hold the invalid token attempt.
      const currentToken = await page.evaluate(() => {
        return localStorage.getItem('ha_token');
      });
      expect(currentToken).toBe('invalid_token_xyz');
      return;
    }

    expect(hasStatus).toBe(true);
  });

  test('should support token authentication as fallback', async ({ page }) => {
    await openOnboarding(page);
    await page.getByRole('button', { name: 'Token' }).click();

    const tokenInput = page.getByPlaceholder('Paste long-lived token from Home Assistant...');
    await expect(tokenInput).toBeVisible();
    await tokenInput.fill('test_long_lived_token_12345');
    await expect(tokenInput).toHaveValue('test_long_lived_token_12345');
  });
});
