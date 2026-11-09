import { test, expect } from './fixtures';

const SPEAKER = 'media_player.sonos_kitchen';
const PLAYING = {
  s: 'playing',
  a: {
    friendly_name: 'Sonos kitchen',
    media_title: 'Test music',
    media_artist: 'Test artist',
    media_album_name: 'Test album',
    entity_picture: '/qa-artwork.svg',
    volume_level: 0.3,
  },
};

const pushSpeaker = (page, changes) =>
  page.evaluate(([id, update]) => window.__pushEntity(id, update), [SPEAKER, changes]);

const ARTWORK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#124568"/><circle cx="100" cy="100" r="65" fill="#dfa531"/></svg>';

const openCard = async (page, cardId, cardSettings, addedEntities) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ json: route.request().url().includes('/current') ? { data: null } : [] })
  );
  for (const picture of ['**/qa-artwork.svg', '**/api/camera_proxy*/**']) {
    await page.route(picture, (route) =>
      route.fulfill({ contentType: 'image/svg+xml', body: ARTWORK })
    );
  }
  await page.addInitScript(
    ([id, settings, added]) => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem('tunet_language', 'en');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({ header: [], pages: ['home'], home: [id] })
      );
      localStorage.setItem('tunet_card_settings', JSON.stringify({ [`home::${id}`]: settings }));

      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        dispatchEvent(event) {
          if (event.type === 'message') {
            const payload = JSON.parse(event.data);
            if (payload.event?.a?.['light.bedroom']) {
              Object.assign(payload.event.a, added);
              return super.dispatchEvent(
                new MessageEvent('message', { data: JSON.stringify(payload) })
              );
            }
          }
          return super.dispatchEvent(event);
        }

        send(data) {
          const request = JSON.parse(data);
          if (request.type === 'subscribe_entities') {
            window.__pushEntity = (entityId, changes) =>
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: JSON.stringify({
                    id: request.id,
                    type: 'event',
                    event: { c: { [entityId]: { '+': changes } } },
                  }),
                })
              );
          }
          const reply = (result) =>
            setTimeout(
              () =>
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: JSON.stringify({
                      id: request.id,
                      type: 'result',
                      success: true,
                      result,
                    }),
                  })
                ),
              10
            );
          if (request.type === 'camera/capabilities') {
            return reply({ frontend_stream_types: [] });
          }
          if (request.type === 'auth/sign_path') return reply({ path: request.path });
          return super.send(data);
        }
      };
    },
    [cardId, cardSettings, addedEntities]
  );
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator(`[data-card-id="${cardId}"]`)).toBeVisible();
  await page.clock.fastForward(16000);
};

const openDashboard = (page, moment) =>
  openCard(page, SPEAKER, moment ? { moment } : {}, {
    [SPEAKER]: { s: 'idle', a: { friendly_name: 'Sonos kitchen', volume_level: 0.3 }, lc: 1 },
  });

test.describe('Full-screen moments', () => {
  const moment = { enabled: true, closeAfterSeconds: 30 };

  test.describe('on a tablet', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('stays through a short pause and closes after the timeout', async ({
      page,
      mockHAConnection,
    }) => {
      void mockHAConnection;
      await openDashboard(page, moment);

      await pushSpeaker(page, PLAYING);
      const view = page.getByRole('dialog');
      await expect(view.getByRole('heading', { name: 'Test music' })).toBeVisible();
      await expect(view.getByText('Test artist')).toBeVisible();

      await pushSpeaker(page, { s: 'paused' });
      await page.clock.fastForward(29000);
      await expect(view).toBeVisible();

      await pushSpeaker(page, { s: 'playing' });
      await pushSpeaker(page, { s: 'paused' });
      await page.clock.fastForward(29000);
      await expect(view).toBeVisible();

      await page.clock.fastForward(2000);
      await expect(view).toBeHidden();
    });

    test('stays closed when closed by hand while the music goes on', async ({
      page,
      mockHAConnection,
    }) => {
      void mockHAConnection;
      await openDashboard(page, moment);
      await pushSpeaker(page, PLAYING);
      const view = page.getByRole('dialog');

      await view.getByRole('button', { name: 'Close' }).click();
      await expect(view).toBeHidden();
      await pushSpeaker(page, { s: 'paused' });
      await pushSpeaker(page, { s: 'playing' });
      await page.clock.fastForward(1000);
      await page.waitForTimeout(400);

      await expect(view).toBeHidden();
    });

    test('sends the pause to the speaker', async ({ page, mockHAConnection }) => {
      void mockHAConnection;
      await openDashboard(page, moment);
      await pushSpeaker(page, PLAYING);

      await page.getByRole('dialog').getByRole('button', { name: 'Pause' }).click();

      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.__haServiceCalls.filter((call) => call.service === 'media_play_pause').length
          )
        )
        .toBe(1);
    });

    test('shows the camera while the doorbell rings', async ({ page, mockHAConnection }) => {
      void mockHAConnection;
      const bell = 'binary_sensor.door';
      const pushBell = (state) =>
        page.evaluate(([id, s]) => window.__pushEntity(id, { s }), [bell, state]);
      await openCard(
        page,
        'camera_card_door',
        {
          cameraId: 'camera.door',
          cameraStreamEngine: 'snapshot',
          moment: {
            enabled: true,
            closeAfterSeconds: 30,
            condition: {
              enabled: true,
              logic: 'AND',
              rules: [{ type: 'state', states: ['on'], entityId: bell }],
            },
          },
        },
        {
          'camera.door': {
            s: 'idle',
            a: { friendly_name: 'Front door', access_token: 'camera-token' },
            lc: 1,
          },
          [bell]: { s: 'off', a: { friendly_name: 'Doorbell' }, lc: 1 },
        }
      );

      await pushBell('on');
      const view = page.getByRole('dialog');
      await expect(view.locator('[data-camera-source="snapshot"] img')).toBeVisible();
      await expect(view.locator('.animate-spin')).toHaveCount(0);

      await pushBell('off');
      await page.waitForTimeout(300);
      await page.clock.fastForward(31000);
      await expect(view).toBeHidden();
    });

    test('is turned on with one switch in Edit card', async ({ page, mockHAConnection }) => {
      void mockHAConnection;
      await openDashboard(page, null);

      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await page
        .locator(`[data-card-id="${SPEAKER}"]`)
        .getByRole('button', { name: 'Edit card', exact: true })
        .click();
      await page.getByRole('switch', { name: 'Show full screen when something plays' }).click();

      await expect
        .poll(() =>
          page.evaluate(
            (id) => JSON.parse(localStorage.getItem('tunet_card_settings'))[`home::${id}`]?.moment,
            SPEAKER
          )
        )
        .toEqual({ enabled: true, closeAfterSeconds: 60 });
    });
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 412, height: 915 } });

    test('leaves the screen alone', async ({ page, mockHAConnection }) => {
      void mockHAConnection;
      await openDashboard(page, moment);

      await pushSpeaker(page, PLAYING);
      await page.clock.fastForward(1000);
      await page.waitForTimeout(400);

      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  });
});
