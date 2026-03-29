import { test as baseTest } from '@playwright/test';

/**
 * Fixture for mock authentication and Home Assistant setup
 * Provides utilities to:
 * - Set up OAuth tokens in localStorage
 * - Set up Home Assistant connection details
 * - Intercept WebSocket connections
 */
export const test = baseTest.extend({
  /**
   * Keep default browser context untouched; each test manages its own auth setup.
   */
  context: async ({ context }, use) => {
    await use(context);
  },

  /**
   * Intercept WebSocket connections and mock HA responses
   */
  mockHAConnection: async ({ page }, use) => {
    await page.addInitScript(() => {
      const testTimestamp = 1774816140;
      const emitMessage = (target, payload) => {
        target.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify(payload),
          })
        );
      };
      const entityUpdate = (state, attributes) => ({
        s: state,
        a: attributes,
        c: 'ctx-e2e',
        lc: testTimestamp,
        lu: testTimestamp,
      });

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
            emitMessage(this, {
              type: 'auth_required',
              ha_version: '2026.3.0',
            });
          }, 25);
        }

        send(data) {
          try {
            const msg = JSON.parse(data);

            if (msg.type === 'auth') {
              setTimeout(() => {
                emitMessage(this, {
                  type: 'auth_ok',
                  ha_version: '2026.3.0',
                });
              }, 10);
              return;
            }

            if (msg.type === 'supported_features') {
              setTimeout(() => {
                emitMessage(this, {
                  id: msg.id,
                  type: 'result',
                  success: true,
                  result: null,
                });
              }, 10);
              return;
            }

            if (msg.type === 'auth/current_user') {
              setTimeout(() => {
                emitMessage(this, {
                  id: msg.id,
                  type: 'result',
                  success: true,
                  result: {
                    id: 'user-1',
                    name: 'E2E User',
                    is_admin: true,
                    is_owner: false,
                  },
                });
              }, 10);
              return;
            }

            if (msg.type === 'get_config') {
              setTimeout(() => {
                emitMessage(this, {
                  id: msg.id,
                  type: 'result',
                  success: true,
                  result: {
                    latitude: 0,
                    longitude: 0,
                    elevation: 0,
                    unit_system: {
                      temperature: 'C',
                      length: 'km',
                    },
                    location_name: 'Test Home',
                    time_zone: 'UTC',
                    currency: 'EUR',
                  },
                });
              }, 10);
              return;
            }

            if (msg.type === 'subscribe_entities') {
              setTimeout(() => {
                emitMessage(this, {
                  id: msg.id,
                  type: 'result',
                  success: true,
                });

                setTimeout(() => {
                  emitMessage(this, {
                    id: msg.id,
                    type: 'event',
                    event: {
                      a: {
                        'light.bedroom': entityUpdate('on', {
                          friendly_name: 'Bedroom Light',
                          brightness: 200,
                          supported_features: 1,
                        }),
                        'light.kitchen': entityUpdate('off', {
                          friendly_name: 'Kitchen Light',
                          brightness: 0,
                          supported_features: 1,
                        }),
                        'climate.living_room': entityUpdate('heat', {
                          friendly_name: 'Living Room Climate',
                          current_temperature: 20,
                          target_temperature: 22,
                          supported_features: 391,
                        }),
                      },
                    },
                  });
                }, 25);
              }, 25);
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

  /**
   * Skip onboarding by setting authentication flag
   */
  authenticatedPage: async ({ page, mockHAConnection }, use) => {
    await page.addInitScript(() => {
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
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    
    await use(page);
  },
});

// Export expect from @playwright/test
export { expect } from '@playwright/test';
