import { test, expect } from './fixtures';

for (const profile of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, hasTouch: false },
  { name: 'touch tablet', viewport: { width: 1024, height: 768 }, hasTouch: true },
]) {
  test.describe(profile.name, () => {
    test.use({ viewport: profile.viewport, hasTouch: profile.hasTouch });
    test('live updates preserve graph content and editing controls', async ({
      page,
      mockHAConnection,
    }, testInfo) => {
      test.setTimeout(60000);
      void mockHAConnection;
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.route('**/api/**', (route) =>
        route.fulfill({ json: route.request().url().includes('/current') ? { data: null } : [] })
      );
      await page.route('https://cdn.jsdelivr.net/**', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="white" d="M16 48a12 12 0 0 1-1-24 18 18 0 0 1 34 0 12 12 0 0 1-1 24Z"/></svg>',
        })
      );
      await page.route('**/qa-artwork.svg', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#124568"/><circle cx="100" cy="100" r="65" fill="#dfa531"/></svg>',
        })
      );
      await page.addInitScript(() => {
        localStorage.setItem('ha_url', 'http://localhost:8123');
        localStorage.setItem('ha_auth_method', 'token');
        localStorage.setItem('ha_token', 'test_token');
        localStorage.setItem('tunet_language', 'en');
        localStorage.setItem('tunet_status_pills_config', '[]');
        localStorage.setItem('tunet_bg_mode', 'solid');
        localStorage.setItem(
          'tunet_pages_config',
          JSON.stringify({
            header: [],
            pages: ['home'],
            home: [
              'sensor.front_door_battery',
              'light.bedroom',
              'weather_temp_live',
              'media_player.emby_tv',
              'sonos_group_live',
            ],
          })
        );
        localStorage.setItem(
          'tunet_card_settings',
          JSON.stringify({
            'home::sensor.front_door_battery': { type: 'sensor', size: 'large', showGraph: true },
            'home::weather_temp_live': { weatherId: 'weather.home', size: 'large' },
            'home::media_player.emby_tv': {
              artworkMode: 'cover',
              playingBackgroundMotion: 'subtle',
            },
            'home::sonos_group_live': {
              mediaIds: ['media_player.sonos_kitchen'],
              artworkMode: 'cover',
              playingBackgroundMotion: 'subtle',
            },
          })
        );
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = class extends OriginalWebSocket {
          dispatchEvent(event) {
            if (event.type === 'message') {
              const payload = JSON.parse(event.data);
              if (payload.event?.a?.['light.bedroom']) {
                const now = Date.now();
                payload.event.a['media_player.emby_tv'].a.entity_picture = '/qa-artwork.svg';
                payload.event.a['media_player.sonos_kitchen'] = {
                  s: 'playing',
                  a: {
                    friendly_name: 'Sonos kitchen',
                    media_title: 'Test music',
                    media_artist: 'Test artist',
                    entity_picture: '/qa-artwork.svg',
                    volume_level: 0.3,
                    supported_features: 152511,
                  },
                  lc: now / 1000,
                };
                payload.event.a['weather.home'] = {
                  s: 'cloudy',
                  a: {
                    temperature: 10.1,
                    temperature_unit: '°C',
                    forecast: [
                      { datetime: new Date(now - 3600_000).toISOString(), temperature: 8 },
                      { datetime: new Date(now + 3600_000).toISOString(), temperature: 12 },
                    ],
                  },
                  lc: now / 1000,
                };
                return super.dispatchEvent(
                  new MessageEvent('message', { data: JSON.stringify(payload) })
                );
              }
            }
            return super.dispatchEvent(event);
          }

          send(data) {
            const request = JSON.parse(data);
            const emit = (payload) =>
              this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
            if (request.type === 'subscribe_entities') {
              window.__pushLiveUpdate = (entityId, changes) =>
                emit({
                  id: request.id,
                  type: 'event',
                  event: { c: { [entityId]: { '+': changes } } },
                });
            }
            let result;
            if (request.type === 'history/history_during_period') {
              result = {
                'sensor.front_door_battery': [
                  { s: '30', lc: Date.now() / 1000 - 3600 },
                  { s: '25', lc: Date.now() / 1000 },
                ],
              };
            } else if (request.type === 'config/entity_registry/list') {
              result = [{ entity_id: 'sensor.front_door_battery', platform: 'mqtt' }];
            } else if (
              ['config/device_registry/list', 'config/area_registry/list', 'get_services'].includes(
                request.type
              )
            ) {
              result = [];
            } else {
              return super.send(data);
            }
            setTimeout(() => emit({ id: request.id, type: 'result', success: true, result }), 10);
          }
        };
      });

      await page.goto('/');
      await expect(page).toHaveTitle('HOME');
      await expect(page).toHaveURL(/\/#\/page\/home$/);
      const graph = page.locator('[data-sensor-graph="history"] svg');
      const slider = page.locator('[data-card-id="light.bedroom"] input[type="range"]');
      const weatherContent = page.locator(
        '[data-card-id="weather_temp_live"] [data-testid="weather-swipe-content"]'
      );
      await expect(graph).toBeVisible();
      await expect(weatherContent.locator('svg')).toBeVisible();
      const sensorCard = page.locator('[data-card-id="sensor.front_door_battery"]');
      expect(
        await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)
      ).toBe(profile.hasTouch);
      await expect(slider).toHaveValue('200');
      await page.evaluate(() =>
        window.__pushLiveUpdate('light.bedroom', { a: { brightness: 100 } })
      );
      await expect(slider).toHaveValue('100');
      await page.evaluate(() => {
        window.__graphNode = document.querySelector('[data-sensor-graph="history"] svg');
        window.__graphMutations = 0;
        const observer = new MutationObserver((records) => {
          window.__graphMutations += records.length;
        });
        observer.observe(window.__graphNode, { subtree: true, attributes: true, childList: true });
        window.__weatherGraphNode = document.querySelector(
          '[data-card-id="weather_temp_live"] svg'
        );
        window.__weatherGraphMutations = 0;
        new MutationObserver((records) => {
          window.__weatherGraphMutations += records.length;
        }).observe(window.__weatherGraphNode, { subtree: true, attributes: true, childList: true });
      });

      await page.evaluate(async () => {
        for (let tick = 0; tick < 60; tick++) {
          window.__pushLiveUpdate('light.bedroom', { a: { brightness: tick % 2 ? 200 : 100 } });
          await new Promise((resolve) => setTimeout(resolve, 67));
        }
      });
      await expect(slider).toHaveValue('200');
      expect(
        await graph.evaluate((node) => ({
          sameNode: node === window.__graphNode,
          mutations: window.__graphMutations,
          animations: node.getAnimations({ subtree: true }).length,
        }))
      ).toEqual({ sameNode: true, mutations: 0, animations: 0 });
      expect(await page.evaluate(() => window.__weatherGraphMutations)).toBe(0);
      await expect(weatherContent).toHaveCSS('transform', 'none');
      await expect(weatherContent).toHaveCSS('will-change', 'auto');
      expect(
        await slider.locator('..').evaluate((node) =>
          [...node.querySelectorAll('div[style*="width"]')].some((child) =>
            getComputedStyle(child)
              .transitionProperty.split(',')
              .some((property) => ['all', 'width'].includes(property.trim()))
          )
        )
      ).toBe(false);
      await page.evaluate(() => window.__pushLiveUpdate('sensor.front_door_battery', { s: '24' }));
      await expect(graph).toHaveAttribute('aria-label', /24/);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath('live-updates.png') });
      const weatherCard = page.locator('[data-card-id="weather_temp_live"]');
      const weatherBox = await weatherCard.boundingBox();
      const contentWidth = (await weatherContent.boundingBox()).width;
      const swipe = async (from, to) => {
        const y = weatherBox.y + weatherBox.height / 2;
        await page.mouse.move(weatherBox.x + weatherBox.width * from, y);
        await page.mouse.down();
        await page.mouse.move(weatherBox.x + weatherBox.width * to, y, { steps: 8 });
        await expect(weatherContent).toHaveAttribute('data-dragging', 'true');
        await expect(weatherContent).toHaveCSS('transform', 'none');
        await expect(weatherContent).toHaveCSS('opacity', '1');
        await weatherContent.evaluate((node) => {
          window.__slideFrames = [];
          const sample = () => {
            const style = getComputedStyle(node);
            window.__slideFrames.push({
              transform: style.transform,
              opacity: style.opacity,
              width: node.getBoundingClientRect().width,
            });
            if (window.__slideFrames.length < 24) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => window.__slideFrames.length)).toBe(24);
        const frames = await page.evaluate(() => window.__slideFrames);
        expect(
          frames.every(
            (frame) =>
              frame.transform === 'none' &&
              frame.opacity === '1' &&
              Math.abs(frame.width - contentWidth) < 0.5
          )
        ).toBe(true);
      };
      await swipe(0.8, 0.2);
      await expect(weatherCard.getByRole('button', { name: 'Hours', exact: true })).toBeVisible();
      await expect(weatherContent).toHaveCSS('transform', 'none');
      await swipe(0.2, 0.8);
      await expect(weatherContent.locator('svg')).toBeVisible();
      await expect(weatherContent).toHaveCSS('transform', 'none');
      await expect(weatherContent).toHaveCSS('will-change', 'auto');

      const weatherPath = weatherContent.locator('svg > path').nth(1);
      const previousPath = await weatherPath.getAttribute('d');
      await page.evaluate(() =>
        window.__pushLiveUpdate('weather.home', { a: { temperature: 11 } })
      );
      await expect(weatherCard.getByText('11°C', { exact: true })).toBeVisible();
      await expect(weatherPath).not.toHaveAttribute('d', previousPath);
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(sensorCard).toHaveAttribute('draggable', 'true');
      for (const id of [
        'sensor.front_door_battery',
        'light.bedroom',
        'weather_temp_live',
        'media_player.emby_tv',
        'sonos_group_live',
      ]) {
        const card = page.locator(`[data-card-id="${id}"]`);
        await expect(card).toBeVisible();
        await expect(card).toHaveCSS('animation-name', 'none');
        await expect(card).toHaveCSS('transform', 'none');
      }
      await expect(page.locator('.media-bg-subtle-drift, .media-bg-subtle-pulse')).toHaveCount(0);
      await expect
        .poll(() =>
          page
            .locator(
              '[data-card-id="media_player.emby_tv"] img, [data-card-id="sonos_group_live"] img'
            )
            .evaluateAll((images) =>
              images.reduce((count, image) => count + image.getAnimations().length, 0)
            )
        )
        .toBe(0);
      if (profile.hasTouch) {
        await page.evaluate(() => {
          window.__weatherGraphMutations = 0;
        });
        await page.evaluate(async () => {
          for (let tick = 0; tick < 60; tick++) {
            window.__pushLiveUpdate('light.bedroom', { a: { brightness: tick % 2 ? 200 : 100 } });
            await new Promise((resolve) => setTimeout(resolve, 67));
          }
        });
        expect(await page.evaluate(() => window.__weatherGraphMutations)).toBe(0);
        await expect(weatherContent).toHaveCSS('transform', 'none');
        await page.screenshot({ path: testInfo.outputPath('editing-live-updates.png') });
        await sensorCard.locator('[data-drag-handle]').press('ArrowRight');
        await expect
          .poll(() =>
            page.evaluate(() => JSON.parse(localStorage.getItem('tunet_pages_config')).home)
          )
          .toEqual([
            'light.bedroom',
            'sensor.front_door_battery',
            'weather_temp_live',
            'media_player.emby_tv',
            'sonos_group_live',
          ]);
      }
      await page.getByTestId('settings-dropdown-trigger').click();
      await expect(page.getByTestId('settings-dropdown-menu')).toHaveAttribute(
        'aria-hidden',
        'false'
      );
      await expect(page.getByTestId('settings-menu-theme')).toBeVisible();
      await expect(page.getByTestId('settings-dropdown-menu')).toHaveCSS('opacity', '1');
      await expect(page.getByTestId('settings-dropdown-menu')).toHaveCSS('transform', 'none');
      await expect(page.getByTestId('settings-dropdown-menu')).toHaveCSS('backdrop-filter', 'none');
      await expect(page.getByTestId('settings-dropdown-trigger')).toHaveCSS('transform', 'none');
      await expect(page.getByTestId('settings-dropdown-trigger').locator('svg')).toHaveCSS(
        'rotate',
        'none'
      );
      expect(
        await page
          .getByTestId('settings-dropdown-menu')
          .evaluate((node) => getComputedStyle(node).backgroundColor)
      ).toMatch(/^rgb\(/);
      await page.screenshot({ path: testInfo.outputPath('editing-menu.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('settings-dropdown-menu')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      for (const section of ['system', 'theme', 'layout', 'header']) {
        await page.getByTestId('settings-dropdown-trigger').click();
        await page.getByTestId(`settings-menu-${section}`).click();
        const panel = page.getByRole('dialog');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('animation-name', 'none');
        await expect(panel).toHaveCSS('transform', 'none');
        await expect(panel).toHaveCSS('backdrop-filter', 'none');
        expect(await panel.evaluate((node) => getComputedStyle(node).backgroundColor)).toMatch(
          /^rgb\(/
        );
        if (section === 'system') {
          await expect(panel.locator('..')).toHaveCSS('backdrop-filter', 'none');
        }
        await page.evaluate(async () => {
          for (let tick = 0; tick < 15; tick++) {
            window.__pushLiveUpdate('light.bedroom', { a: { brightness: tick % 2 ? 200 : 100 } });
            await new Promise((resolve) => setTimeout(resolve, 67));
          }
        });
        expect(
          await panel.evaluate((node) =>
            [node, ...node.querySelectorAll('*')].every(
              (element) => getComputedStyle(element).backdropFilter === 'none'
            )
          )
        ).toBe(true);
        await page.keyboard.press('Tab');
        expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`settings-${section}.png`) });
        await page.keyboard.press('Escape');
        await expect(panel).not.toBeVisible();
      }
      for (const id of [
        'media_player.emby_tv',
        'sonos_group_live',
        'weather_temp_live',
        'light.bedroom',
        'sensor.front_door_battery',
      ]) {
        const edit = page
          .locator(`[data-card-id="${id}"]`)
          .getByRole('button', { name: 'Edit card', exact: true });
        await edit.focus();
        await edit.press('Enter');
        const editor = page.getByRole('dialog');
        await expect(editor).toBeVisible();
        await expect(editor).toHaveCSS('animation-name', 'none');
        await expect(editor).toHaveCSS('transform', 'none');
        await expect(editor).toHaveCSS('backdrop-filter', 'none');
        await expect(editor.locator('..')).toHaveCSS('backdrop-filter', 'none');
        expect(await editor.evaluate((node) => getComputedStyle(node).backgroundColor)).toMatch(
          /^rgb\(/
        );
        expect(
          await editor
            .locator('.popup-surface')
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).backdropFilter === 'none')
            )
        ).toBe(true);
        if (id === 'media_player.emby_tv') {
          const name = editor.locator('input[type="text"]').first();
          await name.fill('Stable media editor');
          await page.evaluate(async () => {
            for (let tick = 0; tick < 30; tick++) {
              window.__pushLiveUpdate('light.bedroom', { a: { brightness: tick % 2 ? 200 : 100 } });
              await new Promise((resolve) => setTimeout(resolve, 67));
            }
          });
          await expect(name).toHaveValue('Stable media editor');
          await expect(name).toBeFocused();
          await name.press('Tab');
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  JSON.parse(localStorage.getItem('tunet_custom_names'))?.['media_player.emby_tv']
              )
            )
            .toBe('Stable media editor');
          await page.screenshot({ path: testInfo.outputPath('edit-media-card.png') });
        }
        if (id === 'sensor.front_door_battery') {
          await expect(editor.getByTestId('sensor-card-preview')).toBeVisible();
          await page.screenshot({ path: testInfo.outputPath('edit-sensor-card.png') });
        }
        await editor.getByRole('button', { name: 'OK', exact: true }).click();
        await expect(editor).not.toBeVisible();
      }
      await page.getByRole('button', { name: 'Add card', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
