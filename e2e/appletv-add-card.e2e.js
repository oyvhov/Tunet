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

  test('keeps picks per card type and adds them all at once', async ({ page }) => {
    await page.getByTestId('settings-dropdown-trigger').click();
    await page.getByTestId('settings-menu-add-card').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toHaveCount(0);

    const kitchen = dialog.getByRole('button', { name: /Kitchen Light/ });
    await kitchen.click();
    await expect(kitchen).toHaveAttribute('aria-pressed', 'true');

    await dialog.getByRole('button', { name: 'Apple TV', exact: true }).click();
    await dialog.getByText('Gaute TV', { exact: false }).first().click();

    const lightType = dialog.getByRole('button', { name: 'Light', exact: true });
    await lightType.click();
    await expect(lightType).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('button', { name: 'Apple TV', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(kitchen).toHaveAttribute('aria-pressed', 'true');

    await dialog.getByRole('button', { name: 'Add 2 cards', exact: true }).click();
    await expect(page.locator('[data-card-id="light.kitchen"]')).toHaveCount(1);
    await expect(page.locator('[data-card-id^="appletv_card_"]')).toHaveCount(1);
  });
});
