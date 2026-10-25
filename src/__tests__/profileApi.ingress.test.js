import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifyUnauthorizedMock = vi.fn((message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
});

vi.mock('../services/apiAuth', () => ({
  getStoredAuthMethod: () => 'token',
  getValidatedHomeAssistantRequestHeadersAsync: () =>
    Promise.resolve({ 'x-ha-url': 'https://ha.example', Authorization: 'Bearer stored-token' }),
  notifyHomeAssistantApiUnauthorized: (message) => notifyUnauthorizedMock(message),
}));

describe('profileApi ingress session rejection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('keeps the stored token when the Supervisor rejects a stale ingress session', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: (name) => (name === 'content-type' ? 'text/plain' : null) },
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });
    const { fetchProfiles } = await import('../services/profileApi');

    await expect(fetchProfiles('user-1')).rejects.toMatchObject({
      status: 401,
      body: { error: 'INGRESS_SESSION_INVALID' },
    });
    expect(notifyUnauthorizedMock).not.toHaveBeenCalled();
  });

  it('still clears credentials when the Tunet backend rejects the token', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: vi.fn().mockResolvedValue({ error: 'Invalid Home Assistant token' }),
    });
    const { fetchProfiles } = await import('../services/profileApi');

    await expect(fetchProfiles('user-1')).rejects.toThrow('Invalid Home Assistant token');
    expect(notifyUnauthorizedMock).toHaveBeenCalledWith('Invalid Home Assistant token');
  });
});
