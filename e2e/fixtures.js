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
    // Mock WebSocket for Home Assistant communication
    await page.evaluateHandle(() => {
      // Store original WebSocket
      const OriginalWebSocket = window.WebSocket;
      
      window.mockHAWebSocket = class MockWebSocket extends EventTarget {
        constructor(url) {
          super();
          this.url = url;
          this.readyState = WebSocket.CONNECTING;
          
          // Simulate connection ready after a short delay
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
          }, 100);
        }

        send(data) {
          // Parse and respond to Home Assistant messages
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'subscribe_entities') {
              // Simulate entity subscription response
              setTimeout(() => {
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: JSON.stringify({
                      id: msg.id,
                      type: 'result',
                      success: true,
                    }),
                  })
                );
                
                // Send mock entities
                setTimeout(() => {
                  this.dispatchEvent(
                    new MessageEvent('message', {
                      data: JSON.stringify({
                        id: msg.id,
                        type: 'event',
                        event: {
                          light: {
                            'light.bedroom': {
                              entity_id: 'light.bedroom',
                              state: 'on',
                              attributes: {
                                friendly_name: 'Bedroom Light',
                                brightness: 200,
                                supported_features: 1,
                              },
                            },
                            'light.kitchen': {
                              entity_id: 'light.kitchen',
                              state: 'off',
                              attributes: {
                                friendly_name: 'Kitchen Light',
                                brightness: 0,
                                supported_features: 1,
                              },
                            },
                          },
                          climate: {
                            'climate.living_room': {
                              entity_id: 'climate.living_room',
                              state: 'heat',
                              attributes: {
                                friendly_name: 'Living Room Climate',
                                current_temperature: 20,
                                target_temperature: 22,
                                supported_features: 391,
                              },
                            },
                          },
                        },
                      }),
                    })
                  );
                }, 50);
              }, 50);
            }
          } catch (e) {
            // Silently ignore unparseable messages
          }
        }

        close() {
          this.readyState = WebSocket.CLOSED;
          this.dispatchEvent(new CloseEvent('close'));
        }
      };
    });

    // Intercept WebSocket constructor
    await page.addInitScript(() => {
      if (window.mockHAWebSocket) {
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = window.mockHAWebSocket;
        window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
        window.WebSocket.OPEN = OriginalWebSocket.OPEN;
        window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
        window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
      }
    });

    await use();
  },

  /**
   * Skip onboarding by setting authentication flag
   */
  authenticatedPage: async ({ page, mockHAConnection }, use) => {
    await page.goto('/');
    
    // Wait for app to initialize
    await page.waitForLoadState('domcontentloaded');
    
    // Ensure authentication is recognized
    await page.evaluate(() => {
      localStorage.setItem(
        'tunet_config',
        JSON.stringify({
          url: 'http://localhost:8123',
          authMethod: 'token',
          token: 'test_token',
        })
      );
      localStorage.setItem('tunet_auth_cache_v1', JSON.stringify({
        access_token: 'test_token',
        refresh_token: 'test_refresh_token',
        expires_in: 1800,
        token_type: 'Bearer',
      }));
    });

    // Navigate again after setting auth values
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    await use(page);
  },
});

// Export expect from @playwright/test
export { expect } from '@playwright/test';
