import { test, expect } from './fixtures';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const theme of ['dark', 'light']) {
  test(`light colour is optional, persistent and live in ${theme} mode`, async ({
    page,
    mockHAConnection,
  }, testInfo) => {
    void mockHAConnection;
    const width = theme === 'dark' ? 1440 : 390;
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.route('**/api/**', (route) =>
      route.fulfill({ json: route.request().url().includes('/current') ? { data: null } : [] })
    );
    await page.addInitScript((theme) => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem('tunet_language', 'en');
      localStorage.setItem('tunet_theme', theme);
      localStorage.setItem('tunet_status_pills_config', '[]');
      localStorage.setItem('tunet_bg_mode', 'solid');
      localStorage.setItem('tunet_bg_color', theme === 'light' ? '#f1f5f9' : '#0f172a');
      if (!localStorage.getItem('tunet_pages_config')) {
        localStorage.setItem(
          'tunet_pages_config',
          JSON.stringify({
            header: [],
            pages: ['home'],
            home: [
              'light.bedroom',
              'light.reading',
              'light.desk',
              'light.white',
              'light.bedroom__dup_qa',
            ],
          })
        );
        localStorage.setItem(
          'tunet_card_settings',
          JSON.stringify({
            'home::light.bedroom': { size: 'large' },
            'home::light.reading': { size: 'large', useLightColor: true },
            'home::light.desk': { size: 'large', useLightColor: true },
            'home::light.white': { size: 'large', useLightColor: true },
            'home::light.bedroom__dup_qa': {
              entityId: 'light.bedroom',
              size: 'small',
              useLightColor: true,
            },
          })
        );
      }
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        dispatchEvent(event) {
          if (event.type === 'message') {
            const payload = JSON.parse(event.data);
            if (payload.event?.a?.['light.bedroom']) {
              const light = (name, rgb, mode = 'rgb', hs = undefined) => ({
                s: 'on',
                a: {
                  friendly_name: name,
                  brightness: 180,
                  color_mode: mode,
                  rgb_color: rgb,
                  hs_color: hs,
                  supported_color_modes: ['rgb', 'color_temp'],
                },
                lc: Date.now() / 1000,
              });
              payload.event.a['light.bedroom'] = light('Bedroom', [70, 140, 255], 'hs', [217, 73]);
              payload.event.a['light.reading'] = light(
                'Reading lamp',
                [255, 180, 100],
                'color_temp'
              );
              payload.event.a['light.desk'] = light('Desk', [180, 90, 255]);
              payload.event.a['light.white'] = light('Ceiling', [255, 255, 255], 'white');
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
            window.__updateLight = (changes) =>
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: JSON.stringify({
                    id: request.id,
                    type: 'event',
                    event: { c: { 'light.bedroom': { '+': changes } } },
                  }),
                })
              );
          }
          return super.send(data);
        }
      };
    }, theme);
    await page.goto('/');
    await expect(page).toHaveTitle('HOME');
    await expect(page).toHaveURL(/#\/page\/home$/);
    const card = page.locator('[data-card-id="light.bedroom"]');
    const copy = page.locator('[data-card-id="light.bedroom__dup_qa"]');
    const power = card.getByRole('button', { name: 'Bedroom: OFF', exact: true });
    await expect(power).toBeVisible();
    await expect(power).not.toHaveCSS('--light-color', 'rgb(70, 140, 255)');
    await expect(copy.getByRole('button', { name: 'Bedroom: OFF', exact: true })).toHaveCSS(
      '--light-color',
      'rgb(70, 140, 255)'
    );
    const enterEdit = async () => {
      if (width < 600) {
        await page.getByTestId('settings-dropdown-trigger').click();
        await page.getByTestId('settings-menu-edit').click();
      } else await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await card.getByRole('button', { name: 'Edit card', exact: true }).click();
    };
    await enterEdit();
    const modal = page.getByRole('dialog');
    const toggle = modal.getByRole('switch', { name: 'Use light color', exact: true });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await modal.getByRole('button', { name: 'OK', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).first().click();
    await expect(power).toHaveCSS('--light-color', 'rgb(70, 140, 255)');
    await page.reload();
    await expect(power).toHaveCSS('--light-color', 'rgb(70, 140, 255)');
    const initialTint = await power.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(initialTint).not.toBe('rgb(70, 140, 255)');
    await page.screenshot({
      path: join(tmpdir(), `tunet-light-colour-subtle-${testInfo.project.name}-${theme}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await card.getByText('Bedroom', { exact: true }).click();
    const lightModal = page.getByRole('dialog');
    const glow = lightModal.locator('.blur-\\[100px\\]');
    await expect(glow).toHaveCSS('background-color', 'rgb(70, 140, 255)');
    await expect(lightModal.getByTestId('light-modal-icon')).not.toHaveCSS(
      'color',
      'rgb(251, 191, 36)'
    );
    await lightModal.getByRole('radio', { name: 'Color', exact: true }).click();
    await expect(lightModal.getByRole('slider', { name: 'Hue' })).toHaveValue('217');
    await expect(glow).toHaveCSS('background-color', 'rgb(70, 140, 255)');
    await lightModal.getByRole('radio', { name: 'Warmth', exact: true }).click();
    await expect(glow).toHaveCSS('background-color', 'rgb(70, 140, 255)');
    await lightModal.getByRole('radio', { name: 'Color', exact: true }).click();
    await page.screenshot({
      path: join(tmpdir(), `tunet-light-modal-colour-${testInfo.project.name}-${theme}.png`),
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(lightModal).toBeHidden();
    await page.evaluate(() => window.__updateLight({ a: { rgb_color: [255, 40, 70] } }));
    await expect(power).toHaveCSS('--light-color', 'rgb(255, 40, 70)');
    await expect(copy.getByRole('button', { name: 'Bedroom: OFF', exact: true })).toHaveCSS(
      '--light-color',
      'rgb(255, 40, 70)'
    );
    await expect(power).not.toHaveCSS('background-color', initialTint);
    await card.getByRole('slider').fill('120');
    await expect
      .poll(() => page.evaluate(() => window.__haServiceCalls.at(-1)))
      .toMatchObject({
        domain: 'light',
        service: 'turn_on',
        service_data: { entity_id: 'light.bedroom', brightness: 120 },
      });
    await power.click();
    await expect
      .poll(() => page.evaluate(() => window.__haServiceCalls.at(-1)))
      .toMatchObject({
        domain: 'light',
        service: 'toggle',
        service_data: { entity_id: 'light.bedroom' },
      });
    await page.evaluate(() => window.__updateLight({ s: 'off' }));
    await expect(card.getByRole('button', { name: 'Bedroom: ON', exact: true })).not.toHaveCSS(
      '--light-color',
      'rgb(255, 40, 70)'
    );
    await page.evaluate(() => window.__updateLight({ s: 'unavailable' }));
    await expect(card.getByRole('button', { name: 'Bedroom: ON', exact: true })).toBeDisabled();
    await page.evaluate(() =>
      window.__updateLight({ s: 'on', a: { color_mode: 'brightness', rgb_color: null } })
    );
    await expect(power).not.toHaveCSS('--light-color', 'rgb(255, 40, 70)');
    await enterEdit();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await modal.getByRole('button', { name: 'OK', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).first().click();
    await page.reload();
    await expect(power).not.toHaveCSS('--light-color', 'rgb(70, 140, 255)');
    await expect(copy.getByRole('button', { name: 'Bedroom: OFF', exact: true })).toHaveCSS(
      '--light-color',
      'rgb(70, 140, 255)'
    );
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
