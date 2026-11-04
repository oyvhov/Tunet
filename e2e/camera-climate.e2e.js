import { test, expect } from './fixtures';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`camera and climate at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('refresh preserves live playback and climate status follows reported state', async ({
      page,
      mockHAConnection,
    }, testInfo) => {
      void mockHAConnection;
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.route('**/api/**', (route) =>
        route.fulfill({ json: route.request().url().includes('/current') ? { data: null } : [] })
      );
      const snapshots = [];
      await page.route('**/api/camera_proxy*/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/camera_proxy/')) {
          // Simulate HA rejecting query parameters changed after signing.
          const signedQuery = url.searchParams.get('authSig');
          url.searchParams.delete('authSig');
          expect(url.searchParams.toString()).toBe(signedQuery);
          snapshots.push(route.request().url());
        }
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#33546a"/><path fill="#689264" d="M0 240 180 100 340 260 500 120 640 240V360H0Z"/><text x="24" y="40" fill="white" font-size="24">Camera test feed</text></svg>',
        });
      });
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
            home: ['climate_card_qa', 'camera_card_live', 'camera_card_snapshot'],
          })
        );
        const cameraSettings = {
          cameraId: 'camera.garden',
          size: 'large',
          cameraRefreshMode: 'motion',
          cameraMotionSensor: 'binary_sensor.garden_motion',
        };
        localStorage.setItem(
          'tunet_card_settings',
          JSON.stringify({
            'home::climate_card_qa': { climateId: 'climate.living_room', size: 'large' },
            'home::camera_card_live': { ...cameraSettings, cameraStreamEngine: 'auto' },
            'home::camera_card_snapshot': { ...cameraSettings, cameraStreamEngine: 'snapshot' },
          })
        );
        window.__signedPaths = [];
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = class extends OriginalWebSocket {
          dispatchEvent(event) {
            if (event.type === 'message') {
              const payload = JSON.parse(event.data);
              if (payload.event?.a?.['climate.living_room']) {
                Object.assign(payload.event.a['climate.living_room'].a, {
                  current_temperature: 18.5,
                  temperature: 18,
                  hvac_modes: ['off', 'heat', 'cool'],
                });
                payload.event.a['camera.garden'] = {
                  s: 'idle',
                  a: { friendly_name: 'Garden camera', access_token: 'camera-token' },
                  lc: Date.now() / 1000,
                };
                payload.event.a['binary_sensor.garden_motion'] = {
                  s: 'off',
                  a: {},
                  lc: Date.now() / 1000,
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
              window.__pushCameraClimateUpdate = (entityId, changes) =>
                emit({
                  id: request.id,
                  type: 'event',
                  event: { c: { [entityId]: { '+': changes } } },
                });
            }
            let result;
            if (request.type === 'camera/capabilities') {
              result = { frontend_stream_types: [] };
            } else if (request.type === 'auth/sign_path') {
              window.__signedPaths.push(request.path);
              const query = request.path.split('?')[1];
              result = { path: `${request.path}&authSig=${encodeURIComponent(query || '')}` };
            } else {
              return super.send(data);
            }
            setTimeout(() => emit({ id: request.id, type: 'result', success: true, result }), 10);
          }
        };
      });
      await page.goto('/');
      const climate = page.locator('[data-card-id="climate_card_qa"]');
      const live = page.locator('[data-card-id="camera_card_live"]');
      const snapshot = page.locator('[data-card-id="camera_card_snapshot"]');
      await expect(climate.getByText('Heat', { exact: true })).toBeVisible();
      await expect(live.locator('[data-camera-source="mjpeg"] img')).toBeVisible();
      await expect(snapshot.locator('[data-camera-source="snapshot"] img')).toBeVisible();
      await expect(live.locator('.animate-spin')).toHaveCount(0);
      await expect(snapshot.locator('.animate-spin')).toHaveCount(0);
      const liveImage = await live.locator('img').elementHandle();
      const oldSnapshot = await snapshot.locator('img').getAttribute('src');
      const signedCount = await page.evaluate(() => window.__signedPaths.length);
      await page.evaluate(() =>
        window.__pushCameraClimateUpdate('binary_sensor.garden_motion', { s: 'on' })
      );
      await expect
        .poll(() => page.evaluate(() => window.__signedPaths.length))
        .toBeGreaterThan(signedCount);
      await expect(snapshot.locator('img')).not.toHaveAttribute('src', oldSnapshot);
      await expect(snapshot.locator('.animate-spin')).toHaveCount(0);
      await expect(live.locator('.animate-spin')).toHaveCount(0);
      expect(
        await live.locator('img').evaluate((node, original) => node === original, liveImage)
      ).toBe(true);
      expect(snapshots.length).toBeGreaterThan(1);
      await snapshot.locator('img').dispatchEvent('error');
      await expect(snapshot.locator('[data-camera-source="unavailable"]')).toBeVisible();
      await page.evaluate(() =>
        window.__pushCameraClimateUpdate('binary_sensor.garden_motion', { s: 'off' })
      );
      await expect(live.getByText('Motion', { exact: true })).toHaveCount(0);
      await page.evaluate(() =>
        window.__pushCameraClimateUpdate('binary_sensor.garden_motion', { s: 'on' })
      );
      await expect(snapshot.locator('img')).toBeVisible();
      await expect(snapshot.locator('.animate-spin')).toHaveCount(0);
      await expect(live.locator('.animate-spin')).toHaveCount(0);
      await page.screenshot({
        path: join(tmpdir(), `tunet-289-290-${testInfo.project.name}-${viewport.width}.png`),
        fullPage: true,
      });
      await climate.getByText('Heat', { exact: true }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Heat', { exact: true }).first()).toBeVisible();
      await expect(modal.getByText('Idle', { exact: true })).toHaveCount(0);
      await page.evaluate(() =>
        window.__pushCameraClimateUpdate('climate.living_room', { s: 'cool' })
      );
      await expect(climate.getByText('Cool', { exact: true })).toBeVisible();
      await expect(modal.getByText('Cool', { exact: true }).first()).toBeVisible();
      await expect(modal.getByText('Cool', { exact: true }).first()).toHaveCSS(
        'color',
        'rgb(59, 130, 246)'
      );
      await page.screenshot({
        path: join(tmpdir(), `tunet-289-modal-${testInfo.project.name}-${viewport.width}.png`),
        fullPage: true,
      });
      await page.evaluate(() =>
        window.__pushCameraClimateUpdate('climate.living_room', { a: { hvac_action: 'idle' } })
      );
      await expect(climate.getByText('Idle', { exact: true })).toBeVisible();
      await expect(modal.getByText('Idle', { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    });
  });
}
