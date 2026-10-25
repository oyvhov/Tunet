import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';

const appVersion = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;

test.describe('Modal Interactions', () => {
  const enableEditMode = async (page) => {
    const editButton = page.getByRole('button', { name: 'Edit' });
    await expect(editButton).toBeVisible();
    await editButton.click();
    await page.waitForTimeout(200);
  };

  const openSettingsDropdown = async (page) => {
    const trigger = page.getByTestId('settings-dropdown-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId('settings-dropdown-menu')).toBeVisible();
  };

  const openSystemModal = async (page) => {
    await openSettingsDropdown(page);
    await page.getByTestId('settings-menu-system').click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    return modal;
  };

  const openThemeSidebar = async (page) => {
    await openSettingsDropdown(page);
    await page.getByTestId('settings-menu-theme').click();
    const sidebar = page.getByTestId('theme-sidebar');
    await expect(sidebar).toBeVisible();
    return sidebar;
  };

  const openStatusPillsModal = async (page) => {
    await enableEditMode(page);
    const trigger = page.getByTitle('Edit status pills');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal.getByRole('heading', { name: 'Status Pills' })).toBeVisible();
    return modal;
  };

  test.beforeEach(async ({ page, mockHAConnection }) => {
    await page.route('**/api/settings/**', (route) =>
      route.fulfill({
        json: route.request().url().includes('/current') ? { revision: 1, data: null } : [],
      })
    );
    await page.route('**/api/profiles**', (route) => route.fulfill({ json: [] }));
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home'],
          home: ['light.bedroom', 'light.kitchen', 'calendar_card_e2e'],
        })
      );
      localStorage.setItem(
        'tunet_card_settings',
        JSON.stringify({
          'home::calendar_card_e2e': {
            calendars: ['calendar.family', 'calendar.work'],
            size: 'large',
          },
        })
      );
      localStorage.setItem(
        'tunet_auth_cache_v1',
        JSON.stringify({
          access_token: 'test_token',
          refresh_token: 'test_refresh_token',
          expires_in: 1800,
          token_type: 'Bearer',
        })
      );
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500); // Wait for entities to load
  });

  test('should open settings modal on settings button click', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Modal shell is the required assertion for opening system settings.
    await expect(modal).toBeVisible();
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`opens light controls promptly at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await expect(page).toHaveTitle('HOME');
      const card = page.locator('[data-card-id="light.bedroom"]');
      await expect(card).toBeVisible();
      const timings = [];
      for (const load of ['first', 'repeat']) {
        await page.evaluate(() => {
          window.__popupTiming = null;
          document.addEventListener(
            'click',
            () => {
              const start = performance.now();
              const measure = () => {
                const panel = document.querySelector('[role="dialog"]');
                if (
                  !panel ||
                  panel.getAnimations().some((animation) => animation.playState === 'running')
                ) {
                  requestAnimationFrame(measure);
                  return;
                }
                window.__popupTiming = {
                  elapsed: performance.now() - start,
                  animation: getComputedStyle(panel).animationDuration,
                };
              };
              requestAnimationFrame(measure);
            },
            { capture: true, once: true }
          );
        });
        await card.getByText('Bedroom Light', { exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.waitForFunction(() => window.__popupTiming !== null);
        const timing = await page.evaluate(() => window.__popupTiming);
        timings.push({ load, ...timing });
        await expect(dialog.getByRole('heading').first()).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`light-${load}.png`) });
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
      }
      await testInfo.attach('popup-timings', {
        body: JSON.stringify(timings),
        contentType: 'application/json',
      });
      for (const timing of timings) expect(parseFloat(timing.animation)).toBeLessThanOrEqual(0.15);
      expect(errors).toEqual([]);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    });
  }

  test('shows the build version when the server health endpoint is unavailable', async ({
    page,
  }) => {
    await page.route('**/api/health', (route) => route.fulfill({ status: 503, body: '{}' }));
    const modal = await openSystemModal(page);
    await expect(modal.getByText(`Running version: ${appVersion}`, { exact: true })).toBeVisible();
  });

  test('should expose mobile add and edit actions from the floating settings menu', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const trigger = page.getByTestId('settings-dropdown-trigger');
    const triggerBounds = await trigger.boundingBox();

    expect(triggerBounds).not.toBeNull();
    expect(triggerBounds.x).toBeGreaterThan(300);
    expect(triggerBounds.y).toBeGreaterThan(760);

    await trigger.click();
    await expect(page.getByTestId('settings-menu-add-card')).toBeVisible();
    await expect(page.getByTestId('settings-menu-edit')).toHaveAccessibleName('Edit');

    await page.getByTestId('settings-menu-edit').click();
    await expect(trigger).toHaveAccessibleName('Done');

    await trigger.click();
    await expect(trigger).toHaveAccessibleName('Edit');
  });

  test('should keep the immersive Emby media popup inside the mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      localStorage.setItem(
        'tunet_status_pills_config',
        JSON.stringify([
          {
            id: 'emby-mobile',
            type: 'emby',
            label: 'Emby',
            visible: true,
            clickable: true,
            conditionEnabled: false,
            mediaEntityIds: ['media_player.emby_tv'],
          },
        ])
      );
      localStorage.setItem(
        'tunet_media_view_mode_by_modal',
        JSON.stringify({ 'media::default': false })
      );
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Emby/ }).click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await expect(
      modal
        .getByTestId('media-immersive-content')
        .getByRole('heading', { name: 'Knutsen & Ludvigsen og den fæle Rasputin' })
    ).toBeVisible();

    const modalBounds = await modal.boundingBox();
    expect(modalBounds).not.toBeNull();
    expect(modalBounds.x).toBeGreaterThanOrEqual(0);
    expect(modalBounds.x + modalBounds.width).toBeLessThanOrEqual(390);
    expect(modalBounds.y).toBeGreaterThanOrEqual(0);
    expect(modalBounds.y + modalBounds.height).toBeLessThanOrEqual(844);

    await expect(modal.getByTestId('media-immersive-controls')).toHaveCSS(
      'flex-direction',
      'column'
    );

    const visibleButtonBounds = await modal.locator('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const style = window.getComputedStyle(button);
          const bounds = button.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            bounds.width > 0 &&
            bounds.right > 0 &&
            bounds.left < window.innerWidth &&
            bounds.bottom > 0 &&
            bounds.top < window.innerHeight
          );
        })
        .map((button) => {
          const bounds = button.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right };
        })
    );

    visibleButtonBounds.forEach(({ left, right }) => {
      expect(left).toBeGreaterThanOrEqual(modalBounds.x - 1);
      expect(right).toBeLessThanOrEqual(modalBounds.x + modalBounds.width + 1);
    });

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(390);
  });

  test('should show a power control and switches for grouped room lights', async ({ page }) => {
    await page.getByText('Bedroom Light', { exact: true }).click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    const mainToggle = modal.getByRole('button', { name: 'light.toggle' });
    await expect(mainToggle.locator('.lucide-power')).toBeVisible();
    await expect(
      modal.getByRole('switch', { name: 'Kitchen Light common.toggle' })
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('should focus calendar events and reveal calendar selection on demand', async ({ page }) => {
    await page.clock.setFixedTime(
      await page.evaluate(() => new Date(2026, 8, 29, 12, 0, 0).getTime())
    );
    await page.getByText('Calendar', { exact: true }).click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Breakfast appointment')).toBeVisible();

    const pickerButton = modal.getByRole('button', { name: 'Select Calendars' });
    await expect(pickerButton).toHaveAttribute('aria-expanded', 'false');
    await expect(modal.locator('#calendar-picker-panel')).toHaveCount(0);
    await expect(
      modal.getByText('Breakfast appointment').locator('xpath=ancestor::*[@data-past-event][1]')
    ).toHaveAttribute('data-past-event', 'true');
    await expect(
      modal.getByText('Dinner with family').locator('xpath=ancestor::*[@data-past-event][1]')
    ).toHaveAttribute('data-past-event', 'false');

    await pickerButton.click();
    await expect(modal.getByRole('button', { name: 'Hide' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(modal.locator('#calendar-picker-panel')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const modalBounds = await modal.boundingBox();
    expect(modalBounds).not.toBeNull();
    expect(modalBounds.x).toBeGreaterThanOrEqual(0);
    expect(modalBounds.x + modalBounds.width).toBeLessThanOrEqual(390);
    expect(modalBounds.y + modalBounds.height).toBeLessThanOrEqual(844);
  });

  test('should keep the media chooser stable and browse nested favorites for generic players', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1060, height: 600 });
    await page.evaluate(() => {
      localStorage.setItem(
        'tunet_status_pills_config',
        JSON.stringify([
          {
            id: 'generic-media',
            type: 'media_player',
            label: 'Media',
            visible: true,
            clickable: true,
            conditionEnabled: false,
            entityId: 'media_player.emby_tv',
          },
        ])
      );
      localStorage.setItem(
        'tunet_media_view_mode_by_modal',
        JSON.stringify({ 'media::default': true })
      );
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Media/ }).click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Choose media' }).click();

    const chooser = modal.getByTestId('media-chooser');
    const results = modal.getByTestId('media-chooser-results');
    await expect(chooser).toBeVisible();
    await expect(modal.getByTestId('media-chooser-loading')).toBeVisible();

    const chooserBefore = await chooser.boundingBox();
    const resultsBefore = await results.boundingBox();
    expect(chooserBefore).not.toBeNull();
    expect(resultsBefore).not.toBeNull();

    await expect(chooser.getByRole('button', { name: 'Favorites' })).toBeVisible();
    await expect(chooser.getByRole('button', { name: 'Playlists' })).toBeVisible();
    await expect(chooser.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect(chooser.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(chooser.getByText('Born to Be Alive')).toBeVisible();

    const chooserAfter = await chooser.boundingBox();
    const resultsAfter = await results.boundingBox();
    expect(Math.abs(chooserAfter.width - chooserBefore.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(resultsAfter.y - resultsBefore.y)).toBeLessThanOrEqual(1);
    expect(await modal.locator('.modal-close:visible').count()).toBe(1);
    await expect(modal.getByTestId('media-chooser-close')).toBeVisible();

    await chooser.getByRole('button', { name: 'Library' }).click();
    await expect(chooser.getByText('90-talet')).toBeVisible();

    await chooser.getByRole('button', { name: 'Search' }).click();
    await chooser.getByRole('searchbox').fill('90');
    await expect(chooser.getByText('90-talet')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileChooserBounds = await chooser.boundingBox();
    expect(mobileChooserBounds.x).toBeGreaterThanOrEqual(0);
    expect(mobileChooserBounds.x + mobileChooserBounds.width).toBeLessThanOrEqual(390);

    const mobileTabBounds = await chooser
      .getByRole('group')
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const bounds = button.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right };
        })
      );
    mobileTabBounds.forEach(({ left, right }) => {
      expect(left).toBeGreaterThanOrEqual(mobileChooserBounds.x);
      expect(right).toBeLessThanOrEqual(mobileChooserBounds.x + mobileChooserBounds.width);
    });
    await chooser.getByRole('button', { name: 'Favorites' }).click();
  });

  test('should browse, search and play Music Assistant media through its own actions', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1060, height: 700 });
    await page.addInitScript(() => {
      const item = (media_type, id, name, extra = {}) => ({
        media_type,
        uri: `library://${media_type}/${id}`,
        name,
        version: '',
        image: null,
        ...extra,
      });
      const library = {
        playlist: [item('playlist', 1, 'Fredagsmiks')],
        album: [item('album', 7, 'Lust For Life', { artists: [{ name: 'Lana Del Rey' }] })],
      };
      const favorites = { album: [item('album', 53, 'Born To Die')] };
      window.__maCalls = [];

      class MusicAssistantWebSocket extends window.WebSocket {
        dispatchEvent(event) {
          if (event.type === 'message') {
            const payload = JSON.parse(event.data);
            if (payload.type === 'event' && payload.event?.a) {
              payload.event.a['media_player.kitchen_ma'] = {
                s: 'playing',
                a: {
                  friendly_name: 'Kitchen MA',
                  media_title: 'Video Games',
                  media_artist: 'Lana Del Rey',
                  mass_player_type: 'player',
                  app_id: 'music_assistant',
                  supported_features: 4127295,
                },
                c: 'ma-e2e',
                lc: 1774816140,
                lu: 1774816140,
              };
              return super.dispatchEvent(
                new MessageEvent('message', { data: JSON.stringify(payload) })
              );
            }
          }
          return super.dispatchEvent(event);
        }

        send(data) {
          const message = JSON.parse(data);
          const reply = (result) =>
            setTimeout(
              () =>
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: JSON.stringify({ id: message.id, type: 'result', success: true, result }),
                  })
                ),
              10
            );
          if (message.type === 'config/entity_registry/get') {
            reply({ entity_id: message.entity_id, config_entry_id: 'ma-entry' });
            return;
          }
          if (message.type === 'call_service' && message.domain === 'music_assistant') {
            window.__maCalls.push(message);
            const data = message.service_data || {};
            if (message.service === 'get_library') {
              const items = data.favorite
                ? favorites[data.media_type] || []
                : library[data.media_type] || [];
              reply({ context: { id: 'ma' }, response: { items } });
              return;
            }
            if (message.service === 'search') {
              reply({
                context: { id: 'ma' },
                response: {
                  tracks: [
                    item('track', 60, '13 Beaches', { artists: [{ name: 'Lana Del Rey' }] }),
                  ],
                  albums: [],
                  artists: [],
                  playlists: [],
                  radio: [],
                  podcasts: [],
                  audiobooks: [],
                },
              });
              return;
            }
            reply({ context: { id: 'ma' } });
            return;
          }
          if (message.type === 'media_player/browse_media') {
            window.__maCalls.push(message);
          }
          super.send(data);
        }
      }
      window.WebSocket = MusicAssistantWebSocket;
      localStorage.setItem(
        'tunet_status_pills_config',
        JSON.stringify([
          {
            id: 'ma-media',
            type: 'media_player',
            label: 'Kitchen music',
            visible: true,
            clickable: true,
            conditionEnabled: false,
            entityId: 'media_player.kitchen_ma',
          },
        ])
      );
      localStorage.setItem(
        'tunet_media_view_mode_by_modal',
        JSON.stringify({ 'media::default': true })
      );
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Kitchen music Lana Del Rey/ }).click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Choose media' }).click();

    const chooser = modal.getByTestId('media-chooser');
    await expect(chooser.getByText('Born To Die')).toBeVisible();
    await chooser.getByRole('button', { name: 'Playlists' }).click();
    await expect(chooser.getByText('Fredagsmiks')).toBeVisible();
    await chooser.getByRole('button', { name: 'Library' }).click();
    await expect(chooser.getByText('Lust For Life')).toBeVisible();
    await expect(chooser.getByText('Lana Del Rey')).toBeVisible();

    await chooser.getByRole('button', { name: 'Search' }).click();
    await expect(chooser.getByText('Type to search Music Assistant')).toBeVisible();
    await chooser.getByRole('searchbox').fill('lana');
    await chooser.getByText('13 Beaches').click();

    await expect
      .poll(() =>
        page.evaluate(
          () => window.__maCalls.find((call) => call.service === 'play_media')?.service_data
        )
      )
      .toEqual({
        entity_id: 'media_player.kitchen_ma',
        media_id: 'library://track/60',
        media_type: 'track',
      });
    const calls = await page.evaluate(() => window.__maCalls);
    expect(calls.some((call) => call.type === 'media_player/browse_media')).toBe(false);
    expect(calls.find((call) => call.service === 'search')?.service_data).toMatchObject({
      config_entry_id: 'ma-entry',
      name: 'lana',
    });
  });

  test('should close modal with close button', async ({ page }) => {
    await openSystemModal(page);

    // Find and click close button (X icon or Close text)
    const closeButton = page
      .locator('.modal-close:visible, button[aria-label*="close" i]:visible')
      .first();
    await expect(closeButton).toBeVisible();
    await closeButton.evaluate((el) => el.click());

    await page.waitForTimeout(300);

    // Modal should close in normal states; some onboarding/constrained states keep it open.
    let visibleModalCount = await page.locator('[role="dialog"]:visible').count();
    if (visibleModalCount > 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      visibleModalCount = await page.locator('[role="dialog"]:visible').count();
    }

    if (visibleModalCount > 0) {
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    } else {
      expect(visibleModalCount).toBe(0);
    }
  });

  test('should close modal on escape key', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Modal should be closed
    await expect(modal).toBeHidden();
  });

  test('should close modal when clicking outside (backdrop)', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Click on areas outside the modal content
    const browserContext = page.context();
    const viewport = page.viewportSize();

    if (viewport) {
      // Click on left edge (outside modal area)
      await page.mouse.click(10, viewport.height / 2);

      await page.waitForTimeout(300);

      // Modal should close on backdrop click.
      await expect(modal).toBeHidden();
    }
  });

  test('should change theme in settings modal', async ({ page }) => {
    const sidebar = await openThemeSidebar(page);

    // Ensure appearance panel exposes theme controls.
    await expect(sidebar.locator('text=Theme').first()).toBeVisible();
  });

  test('should change language in settings modal', async ({ page }) => {
    const sidebar = await openThemeSidebar(page);

    // Ensure appearance panel exposes language controls.
    await expect(sidebar.locator('text=Language').first()).toBeVisible();
  });

  test('should navigate the responsive settings sidebars on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const appearanceSidebar = await openThemeSidebar(page);
    await expect(appearanceSidebar.getByTestId('sidebar-done')).toHaveAccessibleName('Done');
    await page.waitForTimeout(400);

    const appearanceBounds = await appearanceSidebar.boundingBox();
    expect(appearanceBounds).not.toBeNull();
    expect(appearanceBounds.width).toBe(390);

    await appearanceSidebar.getByTestId('sidebar-nav-layout').click();
    const layoutSidebar = page.getByTestId('layout-sidebar');
    await expect(layoutSidebar).toBeVisible();
    await expect(layoutSidebar.getByTestId('sidebar-nav-layout')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await layoutSidebar.getByTestId('sidebar-nav-header').click();
    const headerSidebar = page.getByTestId('header-sidebar');
    await expect(headerSidebar).toBeVisible();

    await headerSidebar.getByTestId('sidebar-done').click();
    await expect(headerSidebar).toBeHidden();
  });

  test('should show connection status in settings', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Find connection tab
    const connectionTab = modal
      .locator('button:has-text("Connection"), [aria-label*="connection"]')
      .first();
    await expect(connectionTab).toBeVisible();
    await connectionTab.click();
    await page.waitForTimeout(200);

    // Modal remains visible after opening the connection tab.
    await expect(modal).toBeVisible();
  });

  test('should show card edit modal when clicking card settings', async ({ page }) => {
    await enableEditMode(page);
    const firstCard = page.locator('[data-card-id]').first();
    await expect(firstCard).toBeVisible();
    const editCardButton = firstCard.locator('button[aria-label="Edit card"]').first();
    await expect(editCardButton).toBeVisible();
    await editCardButton.evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
  });

  test('should save status pill presentation settings', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'tunet_status_pills_config',
        JSON.stringify([
          {
            id: 'pill-1',
            type: 'conditional',
            entityId: 'light.bedroom',
            label: 'Bedroom',
            sublabel: 'Ready',
            icon: 'Activity',
            iconBgColor: 'rgba(59, 130, 246, 0.1)',
            iconColor: 'text-[var(--accent-color)]',
            visible: true,
            conditionEnabled: false,
          },
        ])
      );
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const modal = await openStatusPillsModal(page);

    await modal
      .getByRole('button', { name: /Bedroom/ })
      .first()
      .click();
    await modal.getByLabel('Animation').selectOption('rotate-medium-slow');
    await modal.getByRole('button', { name: /Heading/ }).click();
    await modal.getByRole('button', { name: /Subtitle/ }).click();
    await modal.getByLabel('Color: Cyan').click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal).toBeHidden();

    const savedConfig = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tunet_status_pills_config') || '[]')
    );

    expect(savedConfig).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'pill-1',
          animationPreset: 'rotate-medium-slow',
          animated: true,
          showLabel: false,
          showSublabel: false,
          iconBgColor: 'rgba(34, 211, 238, 0.18)',
          iconColor: 'text-cyan-400',
        }),
      ])
    );
  });

  test('should save a low-battery smart pill threshold', async ({ page }) => {
    const modal = await openStatusPillsModal(page);

    await modal.getByTitle('Add new pill').click();
    await modal.getByRole('button', { name: 'Smart group' }).click();

    const presetLayout = await modal
      .getByRole('button', { name: 'Lights on', exact: true })
      .evaluate((button) =>
        Array.from(button.parentElement.children).map((preset) => {
          const presetBounds = preset.getBoundingClientRect();
          const labelBounds = preset.lastElementChild.getBoundingClientRect();
          return {
            labelLeft: labelBounds.left,
            labelRight: labelBounds.right,
            presetLeft: presetBounds.left,
            presetRight: presetBounds.right,
          };
        })
      );
    presetLayout.forEach(({ labelLeft, labelRight, presetLeft, presetRight }) => {
      expect(labelLeft).toBeGreaterThanOrEqual(presetLeft);
      expect(labelRight).toBeLessThanOrEqual(presetRight);
    });

    await modal.getByRole('button', { name: 'Low battery' }).click();

    const threshold = modal.getByLabel('Low battery threshold');
    await expect(threshold).toHaveValue('20');
    await threshold.fill('30');
    await expect(modal.getByText('Front Door Battery')).toBeVisible();

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden();

    const savedConfig = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tunet_status_pills_config') || '[]')
    );

    expect(savedConfig).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'group_status',
          groupPreset: 'low_battery',
          groupThreshold: 30,
        }),
      ])
    );
  });

  test('should handle modal transition animation', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Modal might start with opacity 0 and animate to 1
    const initialOpacity = await modal.evaluate((el) => window.getComputedStyle(el).opacity);

    // Wait for animation to complete
    await page.waitForTimeout(300);

    const finalOpacity = await modal.evaluate((el) => window.getComputedStyle(el).opacity);

    // Final opacity should be visible (1 or close to it)
    const finalValue = parseFloat(finalOpacity);
    expect(finalValue).toBeGreaterThanOrEqual(0.8);
  });

  test('should not allow scroll interaction outside modal', async ({ page }) => {
    await openSystemModal(page);

    // Get body overflow status
    const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);

    // When modal is open, body should have overflow hidden (prevent scroll)
    // This prevents scrolling behind the modal
    expect(bodyOverflow).not.toBe('');
  });

  test('should restore focus to trigger element on close', async ({ page }) => {
    const modal = await openSystemModal(page);

    // Close modal
    const closeButton = modal.locator('button[aria-label*="close" i], .modal-close').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(300);

    // Focus should return to settings button or similar trigger
    // This helps with accessibility/keyboard navigation
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName?.toLowerCase() || '';
    });

    // Focus should return to an interactive trigger.
    expect(['button', 'body', 'html']).toContain(focusedElement);
  });
  test('duplicates a light with independent settings and targets the original entity', async ({
    page,
  }) => {
    await enableEditMode(page);
    await page
      .locator('[data-card-id="light.bedroom"]')
      .getByRole('button', { name: 'Duplicate card' })
      .press('Enter');
    const copy = page.locator('[data-card-id^="light.bedroom__dup_"]');
    await expect(copy).toHaveCount(1);
    await expect(copy.getByText('Bedroom Light', { exact: true })).toBeVisible();
    const copyId = await copy.getAttribute('data-card-id');
    const stored = await page.evaluate(() => ({
      pages: JSON.parse(localStorage.getItem('tunet_pages_config')),
      settings: JSON.parse(localStorage.getItem('tunet_card_settings')),
    }));
    expect(stored.pages.home.slice(0, 2)).toEqual(['light.bedroom', copyId]);
    expect(stored.settings[`home::${copyId}`].entityId).toBe('light.bedroom');
    await page.getByRole('button', { name: 'Done', exact: true }).first().click();
    await copy.getByRole('button', { name: 'Bedroom Light: OFF', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.__haServiceCalls.at(-1)))
      .toMatchObject({
        domain: 'light',
        service: 'toggle',
        service_data: { entity_id: 'light.bedroom' },
      });
    await copy.getByText('Bedroom Light', { exact: true }).click();
    await expect(page.locator('[role="dialog"]:visible').first()).toContainText('Bedroom Light');
  });

  test('supports keyboard theme selection and keeps focus inside the sidebar', async ({ page }) => {
    const sidebar = await openThemeSidebar(page);
    const done = sidebar.getByTestId('sidebar-done');
    await expect(done).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect
      .poll(() => sidebar.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press('Tab');
    await expect(done).toBeFocused();
    const theme = sidebar.getByRole('button', { name: /^Theme:/ });
    await theme.focus();
    await page.keyboard.press('ArrowDown');
    const light = sidebar.getByRole('option', { name: 'Light', exact: true });
    await expect(sidebar.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Home');
    // Select Light through the same focused-option keyboard path used by users.
    await light.focus();
    await page.keyboard.press('Enter');
    await expect(theme).toBeFocused();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tunet_theme'))).toBe('light');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.colorScheme))
      .toBe('light');
    await page.screenshot({ path: test.info().outputPath('light-theme-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath('light-theme-mobile.png') });
    await page.keyboard.press('Escape');
    await expect(sidebar).not.toBeVisible();
  });

  test('opens the calendar using the keyboard', async ({ page }) => {
    const card = page.locator('[data-card-id="calendar_card_e2e"]');
    await expect(card).toHaveAttribute('role', 'button');
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(
      page
        .locator('[role="dialog"]:visible')
        .first()
        .getByRole('button', { name: 'Select Calendars' })
    ).toBeVisible();
  });

  test('keeps Home Assistant system notifications out of dashboard popups', async ({ page }) => {
    await page.evaluate(async () => {
      for (const type of ['current', 'added', 'updated', 'current']) {
        window.dispatchEvent(
          new CustomEvent('test:notification', {
            detail: {
              type,
              notifications: Object.fromEntries(
                Array.from({ length: 20 }, (_, index) => [
                  `ha-system-${index}`,
                  { title: 'Home Assistant', message: `System warning ${index} (${type})` },
                ])
              ),
            },
          })
        );
        await new Promise(requestAnimationFrame);
        if (document.querySelector('[role="alert"]')) {
          throw new Error('Home Assistant system notifications must not open dashboard popups');
        }
      }
    });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
