// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
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
  it('trusts Supervisor-provided user headers for ingress requests from the trusted proxy', async () => {
    process.env.TUNET_TRUST_SUPERVISOR_INGRESS = '1';
    const validateHomeAssistantUser = vi.fn();
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      '__ip': '::ffff:172.30.32.2',
      '__remoteAddress': '::ffff:172.30.32.2',
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
    delete process.env.TUNET_TRUST_SUPERVISOR_INGRESS;
    const validateHomeAssistantUser = vi.fn();
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      '__ip': '::ffff:172.30.32.2',
      '__remoteAddress': '::ffff:172.30.32.2',
      'x-ingress-path': '/api/hassio_ingress/abc123',
      'x-remote-user-id': 'ha-user-1',
      'x-remote-user-display-name': 'Living Room Tablet',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).not.toHaveBeenCalled();
    expect(req.authenticatedHaUser).toBeUndefined();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid x-ha-url header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests without Home Assistant URL metadata', async () => {
    const middleware = createHomeAssistantAuthMiddleware({
      validateHomeAssistantUser: vi.fn(),
    });
    const req = createRequest({ authorization: 'Bearer token-1' });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid x-ha-url header' });
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

  it('tries the fallback Home Assistant URL when the primary URL is not reachable from Docker', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND homeassistant.local'))
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND host.docker.internal'))
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND host.containers.internal'))
      .mockResolvedValueOnce({ id: 'user-456' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://homeassistant.local:8123',
      'x-ha-fallback-url': 'http://192.168.1.20:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(1, {
      haUrl: 'http://homeassistant.local:8123',
      accessToken: 'token-1',
    });
    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(4, {
      haUrl: 'http://192.168.1.20:8123',
      accessToken: 'token-1',
    });
    expect(req.authenticatedHaUser).toEqual({ id: 'user-456' });
    expect(req.authenticatedHaUrl).toBe('http://192.168.1.20:8123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('tries host.docker.internal for localhost URLs in Docker mode', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8123'))
      .mockResolvedValueOnce({ id: 'user-789' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://localhost:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(1, {
      haUrl: 'http://localhost:8123',
      accessToken: 'token-1',
    });
    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(2, {
      haUrl: 'http://host.docker.internal:8123',
      accessToken: 'token-1',
    });
    expect(req.authenticatedHaUser).toEqual({ id: 'user-789' });
    expect(req.authenticatedHaUrl).toBe('http://host.docker.internal:8123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to host.containers.internal when host.docker.internal is not reachable', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8123'))
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND host.docker.internal'))
      .mockResolvedValueOnce({ id: 'user-999' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://localhost:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(1, {
      haUrl: 'http://localhost:8123',
      accessToken: 'token-1',
    });
    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(2, {
      haUrl: 'http://host.docker.internal:8123',
      accessToken: 'token-1',
    });
    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(3, {
      haUrl: 'http://host.containers.internal:8123',
      accessToken: 'token-1',
    });
    expect(req.authenticatedHaUser).toEqual({ id: 'user-999' });
    expect(req.authenticatedHaUrl).toBe('http://host.containers.internal:8123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to host.docker.internal when a LAN HA URL is unreachable from the container', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(1) // ERR_CANNOT_CONNECT
      .mockResolvedValueOnce({ id: 'user-lan' });
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://192.168.10.103:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(1, {
      haUrl: 'http://192.168.10.103:8123',
      accessToken: 'token-1',
    });
    expect(validateHomeAssistantUser).toHaveBeenNthCalledWith(2, {
      haUrl: 'http://host.docker.internal:8123',
      accessToken: 'token-1',
    });
    expect(req.authenticatedHaUrl).toBe('http://host.docker.internal:8123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('prioritises auth errors over reachability errors when multiple URLs are tried', async () => {
    const validateHomeAssistantUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid auth'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED host.docker.internal:8123'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED host.containers.internal:8123'));
    const middleware = createHomeAssistantAuthMiddleware({ validateHomeAssistantUser });
    const req = createRequest({
      authorization: 'Bearer token-1',
      'x-ha-url': 'http://localhost:8123',
    });
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('HA_AUTH_INVALID');
    expect(next).not.toHaveBeenCalled();
  });
});