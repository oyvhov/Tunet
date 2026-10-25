import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifyUnauthorizedMock = vi.fn((message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
});
const getStoredAuthMethodMock = vi.fn(() => 'oauth');
const getValidatedHeadersAsyncMock = vi.fn();

vi.mock('../services/apiAuth', () => ({
  getStoredAuthMethod: () => getStoredAuthMethodMock(),
  getValidatedHomeAssistantRequestHeadersAsync: (options) => getValidatedHeadersAsyncMock(options),
  notifyHomeAssistantApiUnauthorized: (message) => notifyUnauthorizedMock(message),
}));

describe('settingsApi OAuth refresh retry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getStoredAuthMethodMock.mockReturnValue('oauth');
    getValidatedHeadersAsyncMock
      .mockResolvedValueOnce({
        'x-ha-url': 'https://ha.example',
        Authorization: 'Bearer old-token',
      })
      .mockResolvedValueOnce({
        'x-ha-url': 'https://ha.example',
        Authorization: 'Bearer refreshed-token',
      });

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ revision: 7 }),
      });
  });

  it('refreshes OAuth headers and retries once after a 401', async () => {
    const { fetchCurrentSettings } = await import('../services/settingsApi');

    await expect(fetchCurrentSettings('user-1', 'device-1')).resolves.toEqual({ revision: 7 });

    expect(getValidatedHeadersAsyncMock).toHaveBeenNthCalledWith(1, undefined);
    expect(getValidatedHeadersAsyncMock).toHaveBeenNthCalledWith(2, { forceRefreshOAuth: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      './api/settings/current?ha_user_id=user-1&device_id=device-1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer refreshed-token' }),
      })
    );
    expect(notifyUnauthorizedMock).not.toHaveBeenCalled();
  });

  it('uses proactively refreshed OAuth headers on the first request when available', async () => {
    getValidatedHeadersAsyncMock.mockReset();
    getStoredAuthMethodMock.mockReturnValue('oauth');
    getValidatedHeadersAsyncMock.mockResolvedValueOnce({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer proactively-refreshed-token',
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ revision: 8 }),
    });

    const { fetchCurrentSettings } = await import('../services/settingsApi');

    await expect(fetchCurrentSettings('user-1', 'device-1')).resolves.toEqual({ revision: 8 });

    expect(getValidatedHeadersAsyncMock).toHaveBeenCalledTimes(1);
    expect(getValidatedHeadersAsyncMock).toHaveBeenNthCalledWith(1, undefined);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(notifyUnauthorizedMock).not.toHaveBeenCalled();
  });

  it('does not treat backend reachability failures as OAuth expiration', async () => {
    getValidatedHeadersAsyncMock.mockReset();
    getStoredAuthMethodMock.mockReturnValue('oauth');
    getValidatedHeadersAsyncMock.mockResolvedValueOnce({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer oauth-token',
    });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({
        error: 'Tunet backend could not reach Home Assistant while validating the current user.',
        code: 'HA_VALIDATION_UNREACHABLE',
      }),
    });

    const { fetchCurrentSettings } = await import('../services/settingsApi');

    await expect(fetchCurrentSettings('user-1', 'device-1')).rejects.toMatchObject({
      message: 'Tunet backend could not reach Home Assistant while validating the current user.',
      status: 503,
      body: {
        code: 'HA_VALIDATION_UNREACHABLE',
      },
    });

    expect(getValidatedHeadersAsyncMock).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(notifyUnauthorizedMock).not.toHaveBeenCalled();
  });
});
describe('settingsApi ingress session rejection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getStoredAuthMethodMock.mockReturnValue('token');
    getValidatedHeadersAsyncMock.mockResolvedValue({
      'x-ha-url': 'https://ha.example',
      Authorization: 'Bearer stored-token',
    });
  });

  it('keeps the stored token when the Supervisor rejects a stale ingress session', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: (name) => (name === 'content-type' ? 'text/plain; charset=utf-8' : null) },
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });
    const { fetchCurrentSettings } = await import('../services/settingsApi');

    await expect(fetchCurrentSettings('user-1', 'device-1')).rejects.toMatchObject({
      status: 401,
      body: { error: 'INGRESS_SESSION_INVALID' },
    });
    expect(notifyUnauthorizedMock).not.toHaveBeenCalled();
  });

  it('still clears credentials when the Tunet backend rejects the token', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: (name) => (name === 'content-type' ? 'application/json' : null) },
      json: vi.fn().mockResolvedValue({ error: 'Invalid Home Assistant token' }),
    });
    const { fetchCurrentSettings } = await import('../services/settingsApi');

    await expect(fetchCurrentSettings('user-1', 'device-1')).rejects.toThrow(
      'Invalid Home Assistant token'
    );
    expect(notifyUnauthorizedMock).toHaveBeenCalledWith('Invalid Home Assistant token');
  });
});
