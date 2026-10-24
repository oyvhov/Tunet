// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHomeAssistantAuthMiddleware,
  createValidatedHomeAssistantUserResolver,
} from '../haAuth.js';

const createRequest = (headers = {}) => ({
  ip: headers.__ip,
  socket: { remoteAddress: headers.__remoteAddress },
  get(name) {
    return headers[name.toLowerCase()] ?? headers[name] ?? undefined;
  },
});

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('createValidatedHomeAssistantUserResolver', () => {
  it('caches validated users by URL and token', async () => {
    const loadCurrentUser = vi.fn().mockResolvedValue({ id: 'user-1' });
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).resolves.toEqual({ id: 'user-1' });
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).resolves.toEqual({ id: 'user-1' });

    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('caches invalid auth failures by URL and token to avoid repeated HA websocket attempts', async () => {
    const invalidAuthError = new Error('Invalid auth');
    const loadCurrentUser = vi.fn().mockRejectedValue(invalidAuthError);
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      invalidAuthCacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'bad-token' })
    ).rejects.toThrow('Invalid auth');
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'bad-token' })
    ).rejects.toThrow('Invalid auth');

    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('does not cache non-auth failures', async () => {
    const loadCurrentUser = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      invalidAuthCacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).rejects.toThrow('ECONNREFUSED');
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).rejects.toThrow('ECONNREFUSED');

    expect(loadCurrentUser).toHaveBeenCalledTimes(2);
  });
});

describe('createHomeAssistantAuthMiddleware', () => {
  beforeEach(() => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', 'https://ha.example');
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '0');
  });
  afterEach(() => vi.unstubAllEnvs());
  it('trusts Supervisor-provided user headers for ingress requests from the trusted proxy', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    process.env.TUNET_TRUST_SUPERVISOR_INGRESS = '1';
    const validateHomeAssistantUser = vi.fn();
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      __ip: '::ffff:172.30.32.2',
      __remoteAddress: '::ffff:172.30.32.2',
      'x-ingress-path': '/api/hassio_ingress/abc123',
      'x-remote-user-id': 'ha-user-1',
      'x-remote-user-display-name': 'Living Room Tablet',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).not.toHaveBeenCalled();
    expect(req.authenticatedHaUser).toEqual({
      id: 'ha-user-1',
      name: 'Living Room Tablet',
      is_admin: false,
      is_owner: false,
      source: 'supervisor-ingress',
    });
    expect(next).toHaveBeenCalledTimes(1);
    delete process.env.TUNET_TRUST_SUPERVISOR_INGRESS;
  });

  it('does not trust ingress headers unless explicitly enabled', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    const validateHomeAssistantUser = vi.fn();
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      __ip: '::ffff:172.30.32.2',
      __remoteAddress: '::ffff:172.30.32.2',
      'x-ingress-path': '/api/hassio_ingress/abc123',
      'x-remote-user-id': 'ha-user-1',
      'x-remote-user-display-name': 'Living Room Tablet',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).not.toHaveBeenCalled();
    expect(req.authenticatedHaUser).toBeUndefined();
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('HA_AUTH_NOT_CONFIGURED');
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when the operator has not configured Home Assistant', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    const middleware = createHomeAssistantAuthMiddleware({
      validateHomeAssistantUser: vi.fn(),
    });
    const req = createRequest({ authorization: 'Bearer token-1' });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('HA_AUTH_NOT_CONFIGURED');
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the validated Home Assistant user to the request', async () => {
    const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'user-123' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'https://ha.example',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenCalledWith({
      haUrl: 'https://ha.example',
      accessToken: 'token-1',
    });
    expect(req.authenticatedHaUser).toEqual({ id: 'user-123' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('parses bearer tokens without regex backtracking on padded headers', async () => {
    const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'user-123' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: `  Bearer ${' '.repeat(256)}token-1  `,
      'x-ha-url': 'https://ha.example',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenCalledWith({
      haUrl: 'https://ha.example',
      accessToken: 'token-1',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when Home Assistant is unreachable instead of forcing an auth failure', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED 192.168.1.20:8123'));
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://192.168.1.20:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: 'Tunet backend could not reach Home Assistant while validating the current user.',
      code: 'HA_VALIDATION_UNREACHABLE',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('still returns 401 for invalid Home Assistant auth', async () => {
    const validateHomeAssistantUser = vi.fn().mockRejectedValue(new Error('Invalid auth'));
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'https://ha.example',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Home Assistant authentication failed: Invalid auth',
      code: 'HA_AUTH_INVALID',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses only the configured fallback when the primary cannot be reached', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', 'http://homeassistant.local:8123');
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'http://host.docker.internal:8123');
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(1)
      .mockResolvedValueOnce({ id: 'user-456' });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://attacker.invalid',
    });
    const res = createResponse();
    const next = vi.fn();
    await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
    expect(validateHomeAssistantUser.mock.calls.map(([args]) => args.haUrl)).toEqual([
      'http://homeassistant.local:8123',
      'http://host.docker.internal:8123',
    ]);
    expect(req.authenticatedHaUser.id).toBe('user-456');
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([2, new Error('Invalid auth'), 1])(
    'never authenticates against a client-selected identity provider after failure %s',
    async (failure) => {
      const validateHomeAssistantUser = vi.fn(({ haUrl }) =>
        haUrl === 'https://ha.example' ? Promise.reject(failure) : Promise.resolve({ id: 'victim' })
      );
      const req = createRequest({
        authorization: 'Bearer forged-token',
        'x-ha-url': 'http://attacker.invalid',
        'x-ha-fallback-url': 'http://127.0.0.1:9000/private',
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(validateHomeAssistantUser).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(failure === 1 ? 503 : 401);
    }
  );

  it('stops on invalid auth, including cached numeric errors, before any configured fallback', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'https://backup.example');
    const loadCurrentUser = vi
      .fn()
      .mockRejectedValueOnce(2)
      .mockResolvedValue({ id: 'wrong-user' });
    const validateHomeAssistantUser = createValidatedHomeAssistantUserResolver({ loadCurrentUser });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = createResponse();
      const next = vi.fn();
      await middleware(createRequest({ authorization: 'Bearer bad-token' }), res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('HA_AUTH_INVALID');
      expect(next).not.toHaveBeenCalled();
    }
    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'file:///private', 'https://user:secret@ha.example'])(
    'does not use browser URLs when server configuration is invalid: %s',
    async (url) => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', url);
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'victim' });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(
        createRequest({
          authorization: 'Bearer forged',
          'x-ha-url': 'http://attacker.invalid',
          'x-ha-fallback-url': 'http://localhost:9000',
        }),
        res,
        next
      );
      expect(res.statusCode).toBe(503);
      expect(res.body.code).toBe('HA_AUTH_NOT_CONFIGURED');
      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('does not trust forged ingress identity from a direct LAN client', async () => {
    vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '1');
    const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'real-user' });
    const req = createRequest({
      __ip: '192.168.1.50',
      __remoteAddress: '192.168.1.50',
      'x-ingress-path': '/fake',
      'x-remote-user-id': 'victim',
      authorization: 'Bearer real-token',
    });
    const next = vi.fn();
    await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(
      req,
      createResponse(),
      next
    );
    expect(req.authenticatedHaUser.id).toBe('real-user');
    expect(validateHomeAssistantUser).toHaveBeenCalledWith({
      haUrl: 'https://ha.example',
      accessToken: 'real-token',
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
