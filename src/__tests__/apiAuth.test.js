import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadTokensMock = vi.fn();
const clearOAuthTokensMock = vi.fn();
const getOAuthTokenSavedAtMock = vi.fn(() => 0);
const saveTokensMock = vi.fn();
const getAuthMock = vi.fn();

vi.mock('../services/oauthStorage', () => ({
  loadTokens: () => loadTokensMock(),
  clearOAuthTokens: () => clearOAuthTokensMock(),
  getOAuthTokenSavedAt: () => getOAuthTokenSavedAtMock(),
  saveTokens: (...args) => saveTokensMock(...args),
}));

vi.mock('home-assistant-js-websocket', () => ({
  getAuth: (...args) => getAuthMock(...args),
}));

describe('getHomeAssistantRequestHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    loadTokensMock.mockReset();
    clearOAuthTokensMock.mockReset();
    getOAuthTokenSavedAtMock.mockReset();
    getOAuthTokenSavedAtMock.mockReturnValue(0);
    saveTokensMock.mockReset();
    getAuthMock.mockReset();
  });

  it('uses OAuth access tokens when OAuth auth is active', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({ access_token: 'oauth-token' });

    const { getHomeAssistantRequestHeaders } = await import('../services/apiAuth');
    expect(getHomeAssistantRequestHeaders()).toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer oauth-token',
    });
  });

  it('falls back to token auth stored in browser storage', async () => {
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_url', 'http://localhost:8123');
    localStorage.setItem('ha_fallback_url', 'http://192.168.1.20:8123');
    sessionStorage.setItem('ha_token', 'session-token');
    loadTokensMock.mockReturnValue(undefined);

    const { getHomeAssistantRequestHeaders } = await import('../services/apiAuth');
    expect(getHomeAssistantRequestHeaders()).toEqual({
      'x-ha-url': 'http://localhost:8123',
      'x-ha-fallback-url': 'http://192.168.1.20:8123',
      Authorization: 'Bearer session-token',
    });
  });

  it('does not fall back to OAuth tokens when token auth is active', async () => {
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_url', 'http://localhost:8123');
    loadTokensMock.mockReturnValue({ access_token: 'oauth-token' });

    const { getHomeAssistantRequestHeaders } = await import('../services/apiAuth');
    expect(getHomeAssistantRequestHeaders()).toEqual({
      'x-ha-url': 'http://localhost:8123',
    });
  });

  it('prefers the live OAuth auth access token over storage', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({ access_token: 'stale-token' });

    const { getHomeAssistantRequestHeaders, setOAuthAuthProvider } = await import(
      '../services/apiAuth'
    );

    setOAuthAuthProvider({ current: { accessToken: 'live-token' } });

    expect(getHomeAssistantRequestHeaders()).toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer live-token',
    });

    setOAuthAuthProvider(null);
  });

  it('refreshes OAuth access token when requested asynchronously', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({ access_token: 'stored-token' });
    const refreshAccessToken = vi.fn(async function refresh() {
      this.accessToken = 'refreshed-token';
    });

    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } = await import(
      '../services/apiAuth'
    );

    setOAuthAuthProvider({ current: { accessToken: 'old-live-token', refreshAccessToken } });

    await expect(
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true })
    ).resolves.toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer refreshed-token',
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    setOAuthAuthProvider(null);
  });

  it('proactively refreshes aging OAuth tokens before API requests are sent', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({ access_token: 'stored-token', expires: Date.now() - 1_000 });
    getOAuthTokenSavedAtMock.mockReturnValue(Date.now() - 46 * 60 * 1000);

    const refreshAccessToken = vi.fn(async function refresh() {
      this.accessToken = 'proactively-refreshed-token';
    });

    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } = await import(
      '../services/apiAuth'
    );

    setOAuthAuthProvider({ current: { accessToken: 'stale-live-token', refreshAccessToken } });

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer proactively-refreshed-token',
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    setOAuthAuthProvider(null);
  });

  it('creates an OAuth auth session from stored tokens when authRef is unavailable', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({
      access_token: 'stored-token',
      refresh_token: 'refresh-token',
      expires: Date.now() - 1_000,
      hassUrl: 'https://ha.example',
    });

    const detachedAuth = {
      accessToken: 'stored-token',
      expired: true,
      refreshAccessToken: vi.fn(async function refresh() {
        this.accessToken = 'detached-refreshed-token';
        this.expired = false;
      }),
    };
    getAuthMock.mockResolvedValue(detachedAuth);

    const { getValidatedHomeAssistantRequestHeadersAsync } = await import('../services/apiAuth');

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer detached-refreshed-token',
    });
    expect(getAuthMock).toHaveBeenCalledWith({
      hassUrl: 'https://ha.example',
      saveTokens: expect.any(Function),
      loadTokens: expect.any(Function),
    });
    expect(detachedAuth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('falls back to existing token when proactive OAuth refresh fails', async () => {
    vi.resetModules();
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({
      access_token: 'existing-valid-token',
      refresh_token: 'refresh-token',
      expires: Date.now() - 1_000,
      hassUrl: 'https://ha.example',
    });

    getAuthMock.mockRejectedValue(new Error('fetch failed'));

    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } = await import(
      '../services/apiAuth'
    );
    setOAuthAuthProvider(null);

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer existing-valid-token',
    });
  });

  it('deduplicates concurrent forced OAuth refresh requests', async () => {
    vi.resetModules();
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    loadTokensMock.mockReturnValue({ access_token: 'stored-token' });

    const refreshAccessToken = vi.fn(async function refresh() {
      await Promise.resolve();
      this.accessToken = 'shared-refreshed-token';
    });

    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } = await import(
      '../services/apiAuth'
    );

    setOAuthAuthProvider({ current: { accessToken: 'stale-live-token', refreshAccessToken } });

    const [first, second] = await Promise.all([
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true }),
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true }),
    ]);

    expect(first).toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer shared-refreshed-token',
    });
    expect(second).toEqual({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer shared-refreshed-token',
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    setOAuthAuthProvider(null);
  });
});