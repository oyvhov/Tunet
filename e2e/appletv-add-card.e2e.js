import { test, expect } from './fixtures';

test.describe('Apple TV card creation', () => {
  test.beforeEach(async ({ page, mockHAConnection }) => {
    void mockHAConnection;
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem('tunet_language', 'en');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({ header: [], pages: ['home'], home: ['light.bedroom'] })
      );
    });
    await page.goto('/');
  });

  test('adds an Apple TV card from the add-card dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('settings-dropdown-trigger').click();
    await page.getByTestId('settings-menu-add-card').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Apple TV', exact: true }).click();
    await dialog.getByText('Gaute TV', { exact: false }).first().click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('[data-card-id^="appletv_card_"]')).toHaveCount(1);
  });
});
