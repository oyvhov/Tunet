/* global localStorage, window, MessageEvent, setTimeout */
import { test, expect } from './fixtures';

const FIRST = 'entity_card_night_first';
const SECOND = 'entity_card_night_second';
const AIR = 'entity_card_air_control';
const card = (page, id) => page.locator(`[data-card-id="${id}"]`);

const choose = async (page, editor, label, option) => {
  await editor.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

const pick = (editor, option) => editor.getByRole('button', { name: option, exact: true }).click();

const openEditor = async (page, id) => {
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const edit = card(page, id).getByRole('button', { name: 'Edit card', exact: true });
  await edit.focus();
  await edit.press('Enter');
  const editor = page.getByRole('dialog');
  await expect(editor.getByTestId('sensor-card-settings')).toBeVisible();
  return editor;
};

const closeEditor = async (page, editor) => {
  await editor.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(editor).not.toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
};

test.describe('Flexible sensor cards', () => {
  test.beforeEach(async ({ page, mockHAConnection }) => {
    void mockHAConnection;
    await page.addInitScript(() => {
      const seed = (key, value) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
      };
      seed('ha_url', 'http://localhost:8123');
      seed('ha_auth_method', 'token');
      seed('ha_token', 'test_token');
      seed('tunet_language', 'en');
      seed('tunet_status_pills_config', '[]');
      seed(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home'],
          home: [
            'entity_card_night_first',
            'entity_card_night_second',
            'sensor.temperature',
            'entity_card_air_control',
          ],
        })
      );
      seed(
        'tunet_card_settings',
        JSON.stringify({
          'home::entity_card_night_first': {
            type: 'sensor',
            entityId: 'scene.night',
            size: 'large',
            showGraph: false,
          },
          'home::entity_card_night_second': {
            type: 'sensor',
            entityId: 'scene.night',
            size: 'large',
            showGraph: false,
          },
          'home::sensor.temperature': { type: 'sensor', size: 'large', showGraph: false },
          'home::entity_card_air_control': {
            type: 'sensor',
            entityId: 'sensor.temperature',
            size: 'large',
            showGraph: false,
            sensorAction: {
              type: 'toggle',
              entityId: 'climate.living_room',
              trigger: 'icon',
              label: 'Toggle air',
            },
          },
        })
      );
      seed(
        'tunet_custom_names',
        JSON.stringify({
          entity_card_night_first: 'Night first',
          entity_card_night_second: 'Night second',
          entity_card_air_control: 'Air control',
        })
      );
      seed(
        'tunet_auth_cache_v1',
        JSON.stringify({
          access_token: 'test_token',
          refresh_token: 'test_refresh_token',
          expires_in: 1800,
          token_type: 'Bearer',
        })
      );

      const OriginalWebSocket = window.WebSocket;
      const requests = [];
      const now = Math.floor(Date.now() / 1000);
      const compressed = (state, attributes) => ({
        s: state,
        a: attributes,
        c: 'sensor-e2e',
        lc: now,
        lu: now,
      });
      let socket;
      let subscriptionId;
      window.__sensorCalls = [];
      const emit = (payload) =>
        socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
      window.__ackSensor = (success = true) => {
        const request = requests.shift();
        if (!request) throw new Error('No pending sensor action');
        emit({
          id: request.id,
          type: 'result',
          success,
          ...(success
            ? { result: { context: { id: 'sensor-e2e' } } }
            : { error: { code: 'service_validation_error', message: 'Test action failed' } }),
        });
      };
      window.__confirmSensor = (entityId, state) =>
        emit({
          id: subscriptionId,
          type: 'event',
          event: { c: { [entityId]: { '+': { s: state, lc: now + 1 } } } },
        });

      class SensorWebSocket extends OriginalWebSocket {
        constructor(url) {
          super(url);
          socket = this;
        }

        dispatchEvent(event) {
          if (event.type === 'message') {
            const payload = JSON.parse(event.data);
            if (payload.type === 'event' && payload.event?.a) {
              payload.event.a['scene.night'] = compressed('unknown', {
                friendly_name: 'Night scene',
              });
              payload.event.a['sensor.temperature'] = compressed('21', {
                friendly_name: 'Room temperature',
                unit_of_measurement: '°C',
                device_class: 'temperature',
              });
              payload.event.a['climate.living_room'] = compressed('off', {
                friendly_name: 'Living Room Climate',
                current_temperature: 21,
                temperature: 23,
                hvac_modes: ['off', 'cool'],
                supported_features: 384,
              });
              return super.dispatchEvent(
                new MessageEvent('message', { data: JSON.stringify(payload) })
              );
            }
          }
          return super.dispatchEvent(event);
        }

        send(data) {
          const message = JSON.parse(data);
          if (message.type === 'subscribe_entities') subscriptionId = message.id;
          if (message.type === 'call_service') {
            window.__sensorCalls.push(message);
            requests.push(message);
            return;
          }
          if (message.type === 'get_services') {
            setTimeout(
              () =>
                emit({
                  id: message.id,
                  type: 'result',
                  success: true,
                  result: {
                    scene: {
                      turn_on: {
                        name: 'Activate scene',
                        target: { entity: { domain: 'scene' } },
                        fields: {},
                      },
                    },
                    light: {
                      turn_on: {
                        name: 'Turn on light',
                        target: { entity: { domain: 'light' } },
                        fields: {
                          brightness: {
                            name: 'Brightness',
                            required: true,
                            selector: { number: { min: 0, max: 255 } },
                          },
                        },
                      },
                    },
                    notify: {
                      send_message: {
                        name: 'Send message',
                        fields: {
                          message: { name: 'Message', required: true, selector: { text: {} } },
                        },
                      },
                    },
                    weather: {
                      get_forecasts: {
                        name: 'Get forecasts',
                        response: { optional: false },
                        target: { entity: { domain: 'weather' } },
                        fields: {},
                      },
                    },
                  },
                }),
              10
            );
            return;
          }
          if (
            [
              'history/history_during_period',
              'recorder/statistics_during_period',
              'config/area_registry/list',
              'config/device_registry/list',
              'config/entity_registry/list',
            ].includes(message.type)
          ) {
            setTimeout(
              () =>
                emit({
                  id: message.id,
                  type: 'result',
                  success: true,
                  result: message.type.startsWith('config/') ? [] : {},
                }),
              10
            );
            return;
          }
          super.send(data);
        }
      }
      window.WebSocket = SensorWebSocket;
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(card(page, FIRST).getByText('Night first', { exact: true })).toBeVisible();
    await expect(card(page, SECOND).getByText('Night second', { exact: true })).toBeVisible();
  });

  test('customizes scene text and layout, disables preview actions, and persists independent cards', async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(card(page, 'sensor.temperature').getByText('21', { exact: true })).toBeVisible();
    const editor = await openEditor(page, FIRST);
    await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Night lighting');
    await pick(editor, 'Custom text');
    await editor
      .getByRole('textbox', { name: 'Custom status text', exact: true })
      .fill('Ready for bedtime');
    await editor
      .getByRole('textbox', { name: 'Button text', exact: true })
      .fill('Start night lights');
    await pick(editor, 'Action tile');
    const preview = editor.getByTestId('sensor-card-preview');
    await expect(preview.getByText('Ready for bedtime', { exact: true })).toBeVisible();
    await expect(
      preview.locator('button').filter({ hasText: 'Start night lights' })
    ).toBeDisabled();
    await expect.poll(() => page.evaluate(() => window.__sensorCalls.length)).toBe(0);
    await closeEditor(page, editor);
    await expect(card(page, FIRST)).toHaveAttribute('data-sensor-layout', 'action');
    await expect(card(page, SECOND).getByText('Scene', { exact: true })).toBeVisible();
    await expect(
      card(page, SECOND).getByRole('button', { name: 'Activate', exact: true })
    ).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(card(page, FIRST).getByText('Night lighting', { exact: true })).toBeVisible();
    await expect(card(page, FIRST).getByText('Ready for bedtime', { exact: true })).toBeVisible();
    await expect(
      card(page, FIRST).getByRole('button', { name: 'Start night lights', exact: true })
    ).toBeVisible();
    await expect(card(page, SECOND).getByText('Night second', { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('custom-sensor-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('custom-sensor-mobile.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

  test('waits for scene acknowledgement and shows failure without false activation', async ({
    page,
  }) => {
    const scene = card(page, FIRST);
    const activate = scene.getByRole('button', { name: 'Activate', exact: true });
    await activate.click();
    await expect(activate).toBeDisabled();
    await expect(scene.getByRole('status')).toHaveText('Waiting…');
    await expect.poll(() => page.evaluate(() => window.__sensorCalls.length)).toBe(1);
    await page.evaluate(() => window.__ackSensor(true));
    await expect(scene.getByRole('status')).toHaveText('Command sent');
    await expect(activate).toBeEnabled();
    await activate.click();
    await page.evaluate(() => window.__ackSensor(false));
    await expect(scene.getByRole('status')).toHaveText('Action failed');
    await expect(activate).toBeEnabled();
    expect(
      await page.evaluate(() =>
        window.__sensorCalls.map(({ domain, service, service_data }) => ({
          domain,
          service,
          service_data,
        }))
      )
    ).toEqual([
      { domain: 'scene', service: 'turn_on', service_data: { entity_id: 'scene.night' } },
      { domain: 'scene', service: 'turn_on', service_data: { entity_id: 'scene.night' } },
    ]);
  });

  test('keeps small action-card text and button within a narrow mobile card', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('tunet_card_settings'));
      settings['home::entity_card_night_first'] = {
        ...settings['home::entity_card_night_first'],
        size: 'small',
        mobileWidth: 'compact',
        sensorLayout: 'action',
        sensorStatusMode: 'hidden',
        sensorAction: { type: 'scene', trigger: 'button', label: 'Start night lights' },
      };
      localStorage.setItem('tunet_card_settings', JSON.stringify(settings));
      localStorage.setItem('tunet_grid_columns_dynamic', '0');
      localStorage.setItem('tunet_grid_columns', '2');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const small = card(page, FIRST);
    const button = small.getByRole('button', { name: 'Start night lights', exact: true });
    await expect(button).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('custom-sensor-small-mobile.png'),
      fullPage: true,
    });
    const bounds = await small.boundingBox();
    expect(bounds.width).toBeLessThan(220);
    const buttonBounds = await button.boundingBox();
    const nameBounds = await small.getByText('Night first', { exact: true }).boundingBox();
    expect(buttonBounds.x).toBeGreaterThanOrEqual(bounds.x);
    expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    expect(buttonBounds.y + buttonBounds.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
    expect(nameBounds.width).toBeGreaterThan(20);
    expect(nameBounds.height).toBeGreaterThan(0);
    expect(
      await button.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)
    ).toBe(true);
    const automaticScene = card(page, SECOND);
    const automaticName = automaticScene.getByText('Night second', { exact: true });
    const activate = automaticScene.getByRole('button', { name: 'Activate', exact: true });
    await activate.click();
    await expect(automaticScene.getByRole('status')).toHaveText('Waiting…');
    const sceneBounds = await automaticScene.boundingBox();
    for (const element of [automaticName, activate, automaticScene.getByRole('status')]) {
      const elementBounds = await element.boundingBox();
      expect(elementBounds.y).toBeGreaterThanOrEqual(sceneBounds.y);
      expect(elementBounds.y + elementBounds.height).toBeLessThanOrEqual(
        sceneBounds.y + sceneBounds.height + 1
      );
    }
    await page.screenshot({
      path: testInfo.outputPath('custom-sensor-small-mobile-pending.png'),
      fullPage: true,
    });
  });

  test('uses service metadata and validates required parameters before saving a no-target action', async ({
    page,
  }) => {
    const editor = await openEditor(page, FIRST);
    await choose(page, editor, 'Action type', 'Home Assistant action');
    await editor.getByRole('button', { name: /^Action to run:/ }).click();
    await expect(page.getByRole('option', { name: /Get forecasts/ })).toHaveCount(0);
    await page.getByRole('option', { name: 'Turn on light (light.turn_on)', exact: true }).click();
    await editor.getByRole('button', { name: 'Apply parameters', exact: true }).click();
    await expect(editor.getByRole('alert')).toHaveText('Fill in Action target before saving.');
    const target = editor.getByText('Action target', { exact: true }).locator('..');
    await target.getByRole('button').click();
    await expect(target.getByRole('button', { name: /Night scene/ })).toHaveCount(0);
    await target.getByRole('button', { name: /Bedroom Light/ }).click();
    await editor.getByRole('button', { name: 'Apply parameters', exact: true }).click();
    await expect(editor.getByRole('alert')).toHaveText('Fill in Brightness before saving.');
    await editor.getByRole('spinbutton', { name: 'Brightness *', exact: true }).fill('300');
    await editor.getByRole('button', { name: 'Apply parameters', exact: true }).click();
    await expect(editor.getByRole('alert')).toHaveText('Check the value for Brightness.');
    await editor.getByRole('button', { name: /^Action to run:/ }).click();
    await page
      .getByRole('option', { name: 'Send message (notify.send_message)', exact: true })
      .click();
    await editor.getByRole('textbox', { name: 'Message *', exact: true }).fill('Good night');
    await editor.getByRole('button', { name: 'Apply parameters', exact: true }).click();
    await expect(editor.getByRole('alert')).toHaveCount(0);
    await editor
      .getByRole('textbox', { name: 'Button text', exact: true })
      .fill('Send bedtime message');
    await closeEditor(page, editor);
    await card(page, FIRST)
      .getByRole('button', { name: 'Send bedtime message', exact: true })
      .click();
    await expect.poll(() => page.evaluate(() => window.__sensorCalls.length)).toBe(1);
    const sent = await page.evaluate(() => window.__sensorCalls[0]);
    expect(sent).toMatchObject({
      domain: 'notify',
      service: 'send_message',
      service_data: { message: 'Good night' },
    });
    expect(sent.service_data).not.toHaveProperty('entity_id');
    await page.evaluate(() => window.__ackSensor(true));
    await expect(card(page, FIRST).getByRole('status')).toHaveText('Command sent');
  });

  test('confirms climate icon actions from HA and supports whole-card keyboard activation', async ({
    page,
  }) => {
    const air = card(page, AIR);
    const icon = air.getByRole('button', { name: 'Toggle air', exact: true });
    await icon.click();
    await expect(icon).toBeDisabled();
    await page.evaluate(() => window.__ackSensor(true));
    await expect(air.getByRole('status')).toHaveText('Waiting…');
    await page.evaluate(() => window.__confirmSensor('climate.living_room', 'cool'));
    await expect(air.getByRole('status')).toHaveText('Updated');
    expect(await page.evaluate(() => window.__sensorCalls[0])).toMatchObject({
      domain: 'climate',
      service: 'turn_on',
      service_data: { entity_id: 'climate.living_room' },
    });
    const editor = await openEditor(page, AIR);
    await pick(editor, 'Whole card');
    await closeEditor(page, editor);
    await air.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__sensorCalls.length)).toBe(2);
    expect(await page.evaluate(() => window.__sensorCalls[1])).toMatchObject({
      domain: 'climate',
      service: 'turn_off',
      service_data: { entity_id: 'climate.living_room' },
    });
    await page.evaluate(() => {
      window.__ackSensor(true);
      window.__confirmSensor('climate.living_room', 'off');
    });
    await expect(air.getByRole('status')).toHaveText('Updated');
    await air.getByRole('button', { name: 'Details', exact: true }).click();
    const details = page.getByRole('dialog');
    await expect(details.getByText('sensor.temperature', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Close', exact: true }).click();
    const detailsEditor = await openEditor(page, AIR);
    await choose(page, detailsEditor, 'Action type', 'Open details');
    const target = detailsEditor.getByText('Action target', { exact: true }).locator('..');
    await expect(
      target.getByRole('button', { name: 'Living Room Climate', exact: true })
    ).toBeVisible();
    await closeEditor(page, detailsEditor);
    await air.focus();
    await page.keyboard.press('Space');
    await expect(details.getByText('climate.living_room', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__sensorCalls.length)).toBe(2);
  });
});
