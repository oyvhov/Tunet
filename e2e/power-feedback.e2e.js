import { test, expect } from './fixtures';

for (const type of ['climate', 'appletv']) {
  for (const size of ['small', 'large']) {
    test(`${type} ${size}: power feedback waits for HA and details remain accessible`, async ({
      page,
      mockHAConnection,
    }) => {
      if (size === 'small') await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(
        ({ type, size }) => {
          const cardId = `${type}_card_feedback`;
          localStorage.setItem('ha_url', 'http://localhost:8123');
          localStorage.setItem('ha_auth_method', 'token');
          localStorage.setItem('ha_token', 'test_token');
          localStorage.setItem('tunet_language', 'en');
          localStorage.setItem(
            'tunet_pages_config',
            JSON.stringify({ header: [], pages: ['home'], home: [cardId] })
          );
          localStorage.setItem(
            'tunet_card_settings',
            JSON.stringify({
              [`home::${cardId}`]: {
                size,
                tapAction: 'toggle',
                ...(type === 'climate'
                  ? { climateId: 'climate.living_room' }
                  : { mediaPlayerId: 'media_player.emby_tv' }),
              },
            })
          );
          const MockSocket = window.WebSocket;
          window.__powerCalls = [];
          window.WebSocket = class extends MockSocket {
            send(data) {
              const msg = JSON.parse(data);
              if (msg.type === 'subscribe_entities') {
                window.__confirmPower = (state) => {
                  const entityId =
                    type === 'climate' ? 'climate.living_room' : 'media_player.emby_tv';
                  this.dispatchEvent(
                    new MessageEvent('message', {
                      data: JSON.stringify({
                        id: msg.id,
                        type: 'event',
                        event: { c: { [entityId]: { '+': { s: state } } } },
                      }),
                    })
                  );
                };
              }
              if (msg.type === 'call_service' && ['turn_on', 'turn_off'].includes(msg.service)) {
                window.__powerCalls.push(msg);
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: JSON.stringify({
                      id: msg.id,
                      type: 'result',
                      success: true,
                      result: null,
                    }),
                  })
                );
                return;
              }
              super.send(data);
            }
          };
        },
        { type, size }
      );
      await page.goto('/');
      const button = page.getByRole('button', {
        name: type === 'climate' ? 'Toggle power' : 'Turn off',
        exact: true,
      });
      await expect(button).toBeVisible();
      if (type === 'climate') await expect(button).toHaveAttribute('aria-pressed', 'true');
      await button.click();
      await expect(button).toHaveAttribute('aria-busy', 'true');
      await expect(button).toBeDisabled();
      await expect(button.locator('.animate-spin')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => window.__powerCalls.length)).toBe(1);
      if (process.env.POWER_FEEDBACK_SCREENSHOT_DIR) {
        await page.screenshot({
          path: `${process.env.POWER_FEEDBACK_SCREENSHOT_DIR}/${type}-${size}-pending.png`,
        });
      }
      await page.evaluate(() => window.__confirmPower('off'));
      const offButton = page.getByRole('button', {
        name: type === 'climate' ? 'Toggle power' : 'Turn on',
        exact: true,
      });
      await expect(offButton).toBeEnabled();
      await expect(offButton).toHaveAttribute('aria-busy', 'false');
      if (type === 'climate') await expect(offButton).toHaveAttribute('aria-pressed', 'false');
      await offButton.click();
      await expect(offButton).toHaveAttribute('aria-busy', 'true');
      await page.evaluate(
        (type) => window.__confirmPower(type === 'climate' ? 'heat' : 'playing'),
        type
      );
      await expect(button).toHaveAttribute('aria-busy', 'false');
      await expect(button).toBeEnabled();
      if (type === 'climate') {
        await page.getByText('20°C', { exact: true }).click();
      } else {
        await page.getByText('Gaute - Gaute TV Bibliotek Gaute TV', { exact: true }).click();
      }
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  }
}
