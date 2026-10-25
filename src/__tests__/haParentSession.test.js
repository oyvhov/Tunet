import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('home-assistant-js-websocket', () => ({
  getAuth: vi.fn(),
  ERR_INVALID_AUTH: 2,
  ERR_INVALID_AUTH_CALLBACK: 6,
}));

const realParent = Object.getOwnPropertyDescriptor(window, 'parent');

const setParent = (value) => {
  Object.defineProperty(window, 'parent', { configurable: true, get: () => value });
};

const makeAuth = (overrides = {}) => ({
  accessToken: 'session-token',
  expired: false,
  refreshAccessToken: vi.fn(),
  ...overrides,
});

describe('Home Assistant parent session', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    if (realParent) Object.defineProperty(window, 'parent', realParent);
  });

  it('is unavailable outside an iframe', async () => {
    setParent(window);
    const { hasParentHaSession, getParentHaAccessToken } =
      await import('../services/haParentSession');
    expect(hasParentHaSession()).toBe(false);
    await expect(getParentHaAccessToken()).resolves.toBe('');
  });

  it('is unavailable when the parent cannot be read (cross-origin)', async () => {
    setParent(
      new Proxy(
        {},
        {
          get() {
            throw new DOMException('Blocked a frame', 'SecurityError');
          },
        }
      )
    );
    const { hasParentHaSession } = await import('../services/haParentSession');
    expect(hasParentHaSession()).toBe(false);
  });

  it('reuses the Home Assistant frontend session and refreshes an expired token', async () => {
    const auth = makeAuth({ expired: true });
    auth.refreshAccessToken.mockImplementation(async () => {
      auth.accessToken = 'refreshed-token';
      auth.expired = false;
    });
    setParent({ hassConnection: Promise.resolve({ auth }) });
    const { hasParentHaSession, getParentHaAccessToken, getCachedParentHaAccessToken } =
      await import('../services/haParentSession');

    expect(hasParentHaSession()).toBe(true);
    await expect(getParentHaAccessToken()).resolves.toBe('refreshed-token');
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(getCachedParentHaAccessToken()).toBe('refreshed-token');
  });

  it('signs Tunet API requests with the session when no token is stored', async () => {
    setParent({ hassConnection: Promise.resolve({ auth: makeAuth() }) });
    localStorage.setItem('ha_auth_method', 'token');
    const { getValidatedHomeAssistantRequestHeadersAsync } = await import('../services/apiAuth');

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      'x-ha-url': window.location.origin,
      Authorization: 'Bearer session-token',
    });
  });

  it('keeps preferring a stored long-lived token', async () => {
    setParent({ hassConnection: Promise.resolve({ auth: makeAuth() }) });
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_url', 'https://ha.example');
    localStorage.setItem('ha_token', 'long-lived');
    const { getValidatedHomeAssistantRequestHeadersAsync } = await import('../services/apiAuth');

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer long-lived',
    });
  });
});
