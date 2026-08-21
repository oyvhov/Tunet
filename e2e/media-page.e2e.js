import { test, expect } from './fixtures';

test.describe('Media page chooser', () => {
  test.beforeEach(async ({ page, mockHAConnection }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem('tunet_active_page', 'media');
      localStorage.setItem(
        'tunet_auth_cache_v1',
        JSON.stringify({
          access_token: 'test_token',
          refresh_token: 'test_refresh_token',
          expires_in: 1800,
          token_type: 'Bearer',
        })
      );
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['media'],
          media: [],
        })
      );
      localStorage.setItem(
        'tunet_page_settings',
        JSON.stringify({
          media: {
            label: 'Media',
            type: 'media',
            mediaIds: ['media_player.emby_tv'],
          },
        })
      );
      localStorage.setItem('tunet_card_settings', JSON.stringify({}));
    });

    await page.goto('/page/media', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page.getByTestId('media-page-choose-tab')).toBeVisible();
  });

  test('keeps the panel stable and finds nested favorites for a generic player', async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.setViewportSize({ width: 1060, height: 700 });
    await expect(page).toHaveURL(/\/page\/media$/);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await expect(page.getByTestId('media-page-choose-tab')).toBeVisible();
    await page.getByTestId('media-page-choose-tab').click();

    const chooser = page.getByTestId('media-page-chooser');
    const results = page.getByTestId('media-page-chooser-results');
    await expect(chooser).toBeVisible();
    await expect(page.getByTestId('media-page-chooser-loading')).toBeVisible();

    const chooserBefore = await chooser.boundingBox();
    const resultsBefore = await results.boundingBox();
    expect(chooserBefore).not.toBeNull();
    expect(resultsBefore).not.toBeNull();

    await expect(chooser.getByText('Born to Be Alive')).toBeVisible();

    const chooserAfter = await chooser.boundingBox();
    const resultsAfter = await results.boundingBox();
    expect(Math.abs(chooserAfter.width - chooserBefore.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(resultsAfter.y - resultsBefore.y)).toBeLessThanOrEqual(1);

    await chooser.getByRole('button', { name: 'Library' }).click();
    await expect(chooser.getByText('90-talet')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('fits the chooser within a mobile viewport', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('media-page-choose-tab')).toBeVisible();
    await page.getByTestId('media-page-choose-tab').click();

    const chooser = page.getByTestId('media-page-chooser');
    await expect(chooser.getByText('Born to Be Alive')).toBeVisible();

    const chooserBounds = await chooser.boundingBox();
    expect(chooserBounds).not.toBeNull();
    expect(chooserBounds.x).toBeGreaterThanOrEqual(0);
    expect(chooserBounds.x + chooserBounds.width).toBeLessThanOrEqual(390);

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(390);
    expect(consoleErrors).toEqual([]);
  });

  test('shows a stable, searchable player editor with clear switches', async ({ page }) => {
    await page.setViewportSize({ width: 1060, height: 760 });
    const editButton = page.getByRole('button', { name: 'Edit' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    const editor = page.getByTestId('media-page-editor');
    const playerSwitch = editor.getByRole('switch', {
      name: 'Gaute - Gaute TV Bibliotek Gaute TV',
    });
    await expect(editor).toBeVisible();
    await expect(playerSwitch).toHaveAttribute('aria-checked', 'true');

    await editor.getByRole('searchbox').fill('Gaute');
    await expect(playerSwitch).toBeVisible();
    await editor.getByRole('searchbox').fill('missing player');
    await expect(editor.getByText('No results')).toBeVisible();

    const editorBounds = await editor.boundingBox();
    expect(editorBounds).not.toBeNull();
    expect(editorBounds.x).toBeGreaterThanOrEqual(0);
    expect(editorBounds.x + editorBounds.width).toBeLessThanOrEqual(1060);
  });
});
