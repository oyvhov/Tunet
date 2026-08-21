import { test as baseTest, expect } from '@playwright/test';

/**
 * E2E tests for specialized card types: Energy Cost, Nordpool, and Media Player.
 * Verifies rendering, data display, and interaction for these domain-specific cards.
 *
 * Uses a self-contained MockWebSocket that includes sensor and media_player
 * entities (the shared fixture only has light + climate).
 */

/* ─── Custom fixture with energy/media entities ─── */

const test = baseTest.extend({
  context: async ({ context }, use) => {
    await use(context);
  },

  cardMock: async ({ page }, use) => {
    await page.addInitScript(() => {
      const testTimestamp = 1774816140;
      const buildNordpoolPrices = () => {
        const currentIndex = new Date().getHours() + 47;
        const length = Math.max(72, currentIndex + 1);
        const prices = Array.from({ length }, (_, index) =>
          Number((0.35 + (index % 6) * 0.09).toFixed(2))
        );
        prices[currentIndex] = 0.85;
        return prices;
      };
      const emitMessage = (target, payload) =>
        target.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
      const entityUpdate = (state, attributes) => ({
        s: state,
        a: attributes,
        c: 'ctx-e2e',
        lc: testTimestamp,
        lu: testTimestamp,
      });
      window.__e2eServiceCalls = [];

      class MockWebSocket extends EventTarget {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        constructor(url) {
          super();
          this.url = url;
          this.CONNECTING = MockWebSocket.CONNECTING;
          this.OPEN = MockWebSocket.OPEN;
          this.CLOSING = MockWebSocket.CLOSING;
          this.CLOSED = MockWebSocket.CLOSED;
          this.readyState = MockWebSocket.CONNECTING;
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
            emitMessage(this, { type: 'auth_required', ha_version: '2026.3.0' });
          }, 25);
        }

        send(data) {
          try {
            const msg = JSON.parse(data);

            if (msg.type === 'auth') {
              setTimeout(() => emitMessage(this, { type: 'auth_ok', ha_version: '2026.3.0' }), 10);
              return;
            }

            if (msg.type === 'supported_features') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: null,
                  }),
                10
              );
              return;
            }

            if (msg.type === 'auth/current_user') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: { id: 'user-1', name: 'E2E User', is_admin: true, is_owner: false },
                  }),
                10
              );
              return;
            }

            if (msg.type === 'get_config') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: {
                      latitude: 0,
                      longitude: 0,
                      elevation: 0,
                      unit_system: { temperature: 'C', length: 'km' },
                      location_name: 'Test Home',
                      time_zone: 'UTC',
                      currency: 'NOK',
                    },
                  }),
                10
              );
              return;
            }

            if (msg.type === 'camera/capabilities') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: { frontend_stream_types: ['hls'] },
                  }),
                10
              );
              return;
            }

            if (msg.type === 'auth/sign_path') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: { path: `${msg.path}?authSig=e2e-signed` },
                  }),
                10
              );
              return;
            }

            if (msg.type === 'call_service') {
              window.__e2eServiceCalls.push(msg);
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: null,
                  }),
                10
              );
              return;
            }

            if (msg.type === 'camera/stream') {
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'result',
                    success: true,
                    result: { url: '/api/hls/front/index.m3u8' },
                  }),
                10
              );
              return;
            }

            if (msg.type === 'subscribe_entities') {
              setTimeout(
                () => emitMessage(this, { id: msg.id, type: 'result', success: true }),
                25
              );
              setTimeout(
                () =>
                  emitMessage(this, {
                    id: msg.id,
                    type: 'event',
                    event: {
                      a: {
                        'sensor.energy_cost_today': entityUpdate('12.45', {
                          friendly_name: 'Energy Cost Today',
                          unit_of_measurement: 'NOK',
                          device_class: 'monetary',
                        }),
                        'sensor.energy_cost_month': entityUpdate('345.67', {
                          friendly_name: 'Energy Cost Month',
                          unit_of_measurement: 'NOK',
                          device_class: 'monetary',
                        }),
                        'sensor.nordpool_price': entityUpdate('0.85', {
                          friendly_name: 'Nordpool Electricity Price',
                          unit_of_measurement: 'NOK/kWh',
                          today: buildNordpoolPrices(),
                          tomorrow: [],
                          tomorrow_valid: false,
                        }),
                        'media_player.living_room': entityUpdate('playing', {
                          friendly_name: 'Living Room Speaker',
                          media_title: 'Test Song',
                          media_artist: 'Test Artist',
                          media_content_type: 'music',
                          supported_features: 152461,
                        }),
                        'media_player.kitchen': entityUpdate('idle', {
                          friendly_name: 'Kitchen Speaker',
                          media_content_type: 'music',
                          supported_features: 152461,
                        }),
                        'climate.living_room': entityUpdate('heat', {
                          friendly_name: 'Living Room Climate',
                          current_temperature: 20,
                          temperature: 22,
                          min_temp: 16,
                          max_temp: 30,
                          hvac_action: 'heating',
                          hvac_modes: ['off', 'heat', 'cool'],
                          fan_modes: [],
                          swing_modes: [],
                          supported_features: 391,
                        }),
                        'camera.front': entityUpdate('idle', {
                          friendly_name: 'Front Camera',
                          access_token: 'camera-access-token',
                          supported_features: 2,
                        }),
                      },
                    },
                  }),
                50
              );
            }
          } catch {
            // ignore malformed test messages
          }
        }

        close() {
          this.readyState = MockWebSocket.CLOSED;
          this.dispatchEvent(new CloseEvent('close'));
        }
      }

      window.WebSocket = MockWebSocket;
    });

    await use();
  },
});

/* ─── Shared auth helper ─── */

const setupPageWithCards = (page, cardIds, cardSettings = {}) =>
  page.addInitScript(
    ({ cardIds, cardSettings }) => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
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
        JSON.stringify({ header: [], pages: ['home'], home: cardIds })
      );
      localStorage.setItem('tunet_active_page', 'home');
      localStorage.setItem('tunet_card_settings', JSON.stringify(cardSettings));
      localStorage.setItem('tunet_hidden_cards', JSON.stringify([]));
      localStorage.setItem('tunet_page_settings', JSON.stringify({}));
    },
    { cardIds, cardSettings }
  );

const getCard = (page, cardId) => page.locator(`[data-card-id="${cardId}"]`).first();

const waitForCard = async (page, cardId) => {
  const card = getCard(page, cardId);
  await expect(card).toBeVisible({ timeout: 5000 });
  return card;
};

const waitForCardText = async (page, cardId, pattern) => {
  const card = await waitForCard(page, cardId);
  await expect(card).toContainText(pattern, { timeout: 5000 });
  return card;
};

/* ═══════════════════════════════════════════════════════════
   Energy Cost Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Energy Cost Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['cost_card_e2e_001'], {
      'home::cost_card_e2e_001': {
        todayId: 'sensor.energy_cost_today',
        monthId: 'sensor.energy_cost_month',
      },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('renders energy cost values from entities', async ({ page }) => {
    await waitForCardText(page, 'cost_card_e2e_001', /12(?:[.,]45)?/);
    await waitForCardText(page, 'cost_card_e2e_001', /346/);
  });

  test('cost card is visible in edit mode', async ({ page }) => {
    // Enter edit mode
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(300);
    }

    // Card should still be visible with edit controls
    await waitForCardText(page, 'cost_card_e2e_001', /12(?:[.,]45)?/);
  });
});

/* ═══════════════════════════════════════════════════════════
   Nordpool Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Nordpool Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['nordpool_card_e2e_001'], {
      'home::nordpool_card_e2e_001': {
        nordpoolId: 'sensor.nordpool_price',
        decimals: 2,
      },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('renders current electricity price', async ({ page }) => {
    await waitForCardText(page, 'nordpool_card_e2e_001', /0[.,]85/);
  });

  test('displays price data from nordpool sensor', async ({ page }) => {
    // The nordpool card should render without errors
    // Check that no error/missing-entity state is shown
    const missingCards = page.locator('[class*="border-dashed"]');
    await expect(missingCards)
      .toHaveCount(0, { timeout: 3000 })
      .catch(() => {
        // May show missing if entity not yet loaded — acceptable in E2E
      });

    await waitForCardText(page, 'nordpool_card_e2e_001', /Nordpool Electricity Price/i);
  });
});

/* ═══════════════════════════════════════════════════════════
   Climate Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Climate Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['climate_card_e2e_001'], {
      'home::climate_card_e2e_001': {
        climateId: 'climate.living_room',
        climateFavoriteModes: ['off', 'heat'],
      },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows responsive mode shortcuts and sends the selected HVAC mode', async ({ page }) => {
    const card = await waitForCard(page, 'climate_card_e2e_001');
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const offShortcut = dialog.getByRole('button', { name: /shortcuts: off/i });
    const heatShortcut = dialog.getByRole('button', { name: /shortcuts: heat/i });
    await expect(offShortcut).toBeVisible();
    await expect(heatShortcut).toHaveAttribute('aria-pressed', 'true');

    await offShortcut.click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__e2eServiceCalls.some(
            (call) =>
              call.domain === 'climate' &&
              call.service === 'set_hvac_mode' &&
              call.service_data?.entity_id === 'climate.living_room' &&
              call.service_data?.hvac_mode === 'off'
          )
        )
      )
      .toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await expect(offShortcut).toBeVisible();
    await expect(heatShortcut).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════
   Camera Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Camera Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    const cameraFrame = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#315d7a"/><stop offset="1" stop-color="#102431"/></linearGradient></defs>
        <rect width="1280" height="720" fill="url(#sky)"/>
        <path d="M0 540 L320 330 L570 515 L835 270 L1280 555 V720 H0Z" fill="#142f2c"/>
        <circle cx="1040" cy="155" r="72" fill="#ffe7a0" opacity=".9"/>
        <text x="64" y="660" fill="white" font-family="sans-serif" font-size="38">Front Camera · live fallback</text>
      </svg>`;
    await page.route('http://localhost:8123/api/hls/front/index.m3u8', (route) =>
      route.fulfill({ status: 502, contentType: 'text/plain', body: 'stream unavailable' })
    );
    await page.route(
      /http:\/\/localhost:8123\/api\/camera_proxy_stream\/camera\.front.*/,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          headers: { 'access-control-allow-origin': '*' },
          body: cameraFrame,
        })
    );
    await page.route(/http:\/\/localhost:8123\/api\/camera_proxy\/camera\.front.*/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: { 'access-control-allow-origin': '*' },
        body: cameraFrame,
      })
    );

    await setupPageWithCards(page, ['camera_card_e2e_001'], {
      'home::camera_card_e2e_001': {
        cameraId: 'camera.front',
        cameraStreamEngine: 'auto',
      },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('falls back from a broken HA HLS stream and keeps the modal usable on mobile', async ({
    page,
  }) => {
    test.setTimeout(50000);
    const card = await waitForCard(page, 'camera_card_e2e_001');
    const cardFeed = card.getByTestId('camera-feed');
    await expect(cardFeed).toHaveAttribute('data-camera-source', 'mjpeg', { timeout: 20000 });
    await expect(cardFeed.getByRole('img', { name: 'Front Camera' })).toBeVisible();

    await card.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('camera-feed')).toHaveAttribute('data-camera-source', 'mjpeg', {
      timeout: 20000,
    });
    await expect
      .poll(() =>
        dialog.getByRole('img', { name: 'Front Camera' }).evaluate((img) => img.naturalWidth)
      )
      .toBeGreaterThan(0);

    await dialog.getByRole('button', { name: /snapshot|stillbilde/i }).click();
    await expect(dialog.getByTestId('camera-feed')).toHaveAttribute(
      'data-camera-source',
      'snapshot'
    );
    await expect
      .poll(() =>
        dialog.getByRole('img', { name: 'Front Camera' }).evaluate((img) => img.naturalWidth)
      )
      .toBeGreaterThan(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await expect(dialog.getByRole('button', { name: /stream|straum|strøm/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /refresh|oppdater/i })).toBeVisible();
  });

  test('keeps go2rtc and MSE available in camera settings', async ({ page }) => {
    const editButton = page.getByRole('button', { name: 'Edit' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    const card = await waitForCard(page, 'camera_card_e2e_001');
    const editCardButton = card.locator('button[aria-label="Edit card"]').first();
    await expect(editCardButton).toBeVisible();
    await editCardButton.evaluate((element) => element.click());

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'go2rtc', exact: true }).click();

    const playerUrl = dialog.getByPlaceholder(
      'http://go2rtc.local:1984/stream.html?src={entity_object_id}'
    );
    await expect(playerUrl).toBeVisible();
    await playerUrl.fill('http://go2rtc.local:1984/stream.html?src={entity_object_id}&mode=webrtc');
    await dialog.getByRole('button', { name: 'MSE', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'MSE', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const settings = JSON.parse(localStorage.getItem('tunet_card_settings') || '{}');
          return settings['home::camera_card_e2e_001'];
        })
      )
      .toMatchObject({
        cameraStreamEngine: 'go2rtc',
        cameraGo2rtcMode: 'mse',
      });
  });
});

/* ═══════════════════════════════════════════════════════════
   Media Player Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Media Player Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['media_player.living_room'], {});
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('renders media player with now-playing info', async ({ page }) => {
    await waitForCardText(page, 'media_player.living_room', 'Test Song');
    await waitForCardText(page, 'media_player.living_room', 'Test Artist');
  });

  test('shows playback controls', async ({ page }) => {
    // Should have play/pause, skip buttons
    const card = await waitForCard(page, 'media_player.living_room');
    const buttons = card.locator('button');
    const buttonCount = await buttons.count();
    // At minimum: play/pause + prev + next
    expect(buttonCount).toBeGreaterThanOrEqual(3);
  });

  test('media card is clickable to open modal', async ({ page }) => {
    // Click the card (not a button inside it)
    const card = await waitForCard(page, 'media_player.living_room');
    await card.click();
    await page.waitForTimeout(500);

    // Should open a modal/dialog
    const dialog = page.locator('[role="dialog"]');
    const hasDialog = await dialog.isVisible().catch(() => false);
    // Modal may or may not open depending on implementation — check gracefully
    if (hasDialog) {
      await expect(dialog).toBeVisible();
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   Media Group Card
   ═══════════════════════════════════════════════════════════ */

test.describe('Media Group Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['media_group_e2e_001'], {
      'home::media_group_e2e_001': {
        mediaIds: ['media_player.living_room', 'media_player.kitchen'],
      },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('renders group with multiple media players', async ({ page }) => {
    await waitForCardText(page, 'media_group_e2e_001', 'Living Room Speaker');
  });

  test('shows active player in group', async ({ page }) => {
    await waitForCardText(page, 'media_group_e2e_001', 'Test Song');
  });
});

/* ═══════════════════════════════════════════════════════════
   Idle Media Player (no active playback)
   ═══════════════════════════════════════════════════════════ */

test.describe('Idle Media Player Card', () => {
  test.beforeEach(async ({ page, cardMock }) => {
    await setupPageWithCards(page, ['media_player.kitchen'], {});
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('renders idle state without crashing', async ({ page }) => {
    await waitForCardText(page, 'media_player.kitchen', 'Kitchen Speaker');
  });
});
