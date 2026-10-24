import {
  createConnection,
  createLongLivedTokenAuth,
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  ERR_INVALID_HTTPS_TO_HTTP,
} from 'home-assistant-js-websocket';
import { WebSocket as NodeWebSocket } from 'ws';
import { createHash } from 'node:crypto';

const DEFAULT_CACHE_TTL_MS = Math.min(
  Math.max(Number(process.env.HA_AUTH_CACHE_TTL_MS) || 15_000, 1_000),
  300_000
);
const DEFAULT_INVALID_AUTH_CACHE_TTL_MS = Math.min(
  Math.max(Number(process.env.HA_INVALID_AUTH_CACHE_TTL_MS) || 60_000, 1_000),
  3_600_000
);
const MAX_CACHE_ENTRIES = 200;
const TRUSTED_INGRESS_IPS = new Set(['172.30.32.2', '127.0.0.1', '::1']);
const NETWORK_ERROR_PATTERNS = [
  'econnrefused',
  'econnreset',
  'enotfound',
  'ehostunreach',
  'eai_again',
  'etimedout',
  'socket hang up',
  'network error',
  'fetch failed',
  'getaddrinfo',
];
const TLS_ERROR_PATTERNS = [
  'certificate',
  'self signed',
  'tls',
  'ssl',
  'unable to verify the first certificate',
  'hostname/ip does not match certificate',
];

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = /** @type {typeof globalThis.WebSocket} */ (
    /** @type {unknown} */ (NodeWebSocket)
  );
}

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */
/** @typedef {import('./types.js').HaUser} HaUser */
/** @typedef {{ haUrl: string, accessToken: string }} HaCredentials */
/**
 * @typedef {Object} CacheEntry
 * @property {HaUser} [user]
 * @property {unknown} [error]
 * @property {Promise<HaUser>} [pendingPromise]
 * @property {number} expiresAt
 */

const isSupervisorIngressTrustEnabled = () => process.env.TUNET_TRUST_SUPERVISOR_INGRESS === '1';

/** @param {unknown} rawAddress */
const normalizeRemoteAddress = (rawAddress) => {
  if (typeof rawAddress !== 'string' || !rawAddress.trim()) return '';
  const trimmed = rawAddress.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
};

/** @param {Request} req */
const isTrustedIngressRequest = (req) => {
  if (!isSupervisorIngressTrustEnabled()) {
    return false;
  }

  const ingressPath = req.get('x-ingress-path');
  if (typeof ingressPath !== 'string' || !ingressPath.trim()) {
    return false;
  }

  const remoteAddress = normalizeRemoteAddress(
    req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || ''
  );

  return TRUSTED_INGRESS_IPS.has(remoteAddress);
};

/**
 * @param {Request} req
 * @returns {HaUser | null}
 */
const getTrustedSupervisorUser = (req) => {
  if (!isTrustedIngressRequest(req)) return null;

  const userId = req.get('x-remote-user-id');
  if (typeof userId !== 'string' || !userId.trim()) return null;

  const displayName = req.get('x-remote-user-display-name');
  const userName = req.get('x-remote-user-name');

  return {
    id: userId.trim(),
    name:
      (typeof displayName === 'string' && displayName.trim()) ||
      (typeof userName === 'string' && userName.trim()) ||
      '',
    is_admin: false,
    is_owner: false,
    source: 'supervisor-ingress',
  };
};

/** @param {unknown} rawUrl */
const normalizeHomeAssistantUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  try {
    const parsed = new URL(rawUrl.trim());
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

/**
 * @param {string[]} candidates
 * @param {unknown} rawCandidate
 */
const pushUniqueCandidate = (candidates, rawCandidate) => {
  const normalized = normalizeHomeAssistantUrl(rawCandidate);
  if (!normalized || candidates.includes(normalized)) return;
  candidates.push(normalized);
};

const getHomeAssistantUrlCandidates = () => {
  /** @type {string[]} */
  const candidates = [];
  for (const candidate of [
    process.env.TUNET_INTERNAL_HA_URL,
    process.env.TUNET_INTERNAL_HA_FALLBACK_URL,
  ]) {
    pushUniqueCandidate(candidates, candidate);
  }
  return candidates;
};

/** @param {Request} req */
const getBearerToken = (req) => {
  const authHeader = req.get('authorization');
  if (typeof authHeader !== 'string') return null;

  const trimmedHeader = authHeader.trim();
  if (trimmedHeader.length <= 7 || !trimmedHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = trimmedHeader.slice(7).trim();
  return token || null;
};

/**
 * @param {Map<string, CacheEntry>} cache
 * @param {number} now
 */
const pruneCache = (cache, now) => {
  for (const [cacheKey, entry] of cache.entries()) {
    if ((entry?.expiresAt || 0) <= now && !entry?.pendingPromise) {
      cache.delete(cacheKey);
    }
  }

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

/** @type {Record<number, string>} */
const HA_WS_ERROR_LABELS = {
  [ERR_CANNOT_CONNECT]: 'ERR_CANNOT_CONNECT',
  [ERR_INVALID_AUTH]: 'ERR_INVALID_AUTH',
  [ERR_CONNECTION_LOST]: 'ERR_CONNECTION_LOST',
  [ERR_HASS_HOST_REQUIRED]: 'ERR_HASS_HOST_REQUIRED',
  [ERR_INVALID_HTTPS_TO_HTTP]: 'ERR_INVALID_HTTPS_TO_HTTP',
  [ERR_INVALID_AUTH_CALLBACK]: 'ERR_INVALID_AUTH_CALLBACK',
};

/** @param {any} error */
const describeError = (error) => {
  if (typeof error === 'number' && HA_WS_ERROR_LABELS[error]) {
    return `${HA_WS_ERROR_LABELS[error]} (code ${error})`;
  }
  if (error?.message) return String(error.message);
  if (error === null || error === undefined) return 'unknown error';
  try {
    return String(error);
  } catch {
    return 'unknown error';
  }
};

/** @param {any} error */
const isInvalidAuthError = (error) => {
  if (error === ERR_INVALID_AUTH || error === ERR_INVALID_AUTH_CALLBACK) return true;

  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('invalid auth') ||
    message.includes('auth_invalid') ||
    message.includes('unauthorized') ||
    message.includes('invalid authentication')
  );
};

/** @param {any} error */
const isHomeAssistantReachabilityError = (error) => {
  if (
    error === ERR_CANNOT_CONNECT ||
    error === ERR_CONNECTION_LOST ||
    error === ERR_HASS_HOST_REQUIRED ||
    error === ERR_INVALID_HTTPS_TO_HTTP
  ) {
    return true;
  }

  const message = String(error?.message || error || '').toLowerCase();
  return [...NETWORK_ERROR_PATTERNS, ...TLS_ERROR_PATTERNS].some((pattern) =>
    message.includes(pattern)
  );
};

/**
 * @param {Response} res
 * @param {number} statusCode
 * @param {string} error
 * @param {string} [code]
 */
const sendJsonError = (res, statusCode, error, code) => {
  /** @type {{ error: string, code?: string }} */
  const body = { error };
  if (code) {
    body.code = code;
  }
  res.status(statusCode).json(body);
};

/**
 * @param {Response} res
 * @param {unknown} error
 * @param {{ haUrls?: string[] }} [options]
 */
const sendValidationFailure = (res, error, { haUrls = [] } = {}) => {
  const description = describeError(error);
  const urlSummary = haUrls.length ? ` (tried: ${haUrls.join(', ')})` : '';

  if (isInvalidAuthError(error)) {
    console.warn(`[haAuth] HA rejected token${urlSummary}: ${description}`);
    sendJsonError(
      res,
      401,
      `Home Assistant authentication failed: ${description}`,
      'HA_AUTH_INVALID'
    );
    return;
  }

  if (isHomeAssistantReachabilityError(error)) {
    console.warn(`[haAuth] Cannot reach HA${urlSummary}: ${description}`);
    sendJsonError(
      res,
      503,
      'Tunet backend could not reach Home Assistant while validating the current user.',
      'HA_VALIDATION_UNREACHABLE'
    );
    return;
  }

  console.warn(`[haAuth] HA validation failed${urlSummary}: ${description}`);
  sendJsonError(
    res,
    503,
    'Tunet backend could not validate the current Home Assistant session.',
    'HA_VALIDATION_FAILED'
  );
};

/**
 * @param {HaCredentials} credentials
 * @returns {Promise<HaUser>}
 */
const loadCurrentUserFromHomeAssistant = async ({ haUrl, accessToken }) => {
  const auth = createLongLivedTokenAuth(haUrl, accessToken);
  const connection = await createConnection({ auth });

  try {
    const user = await connection.sendMessagePromise({ type: 'auth/current_user' });
    if (!user?.id || typeof user.id !== 'string') {
      throw new Error('Home Assistant did not return an authenticated user');
    }

    return {
      id: user.id,
      name: user.name || '',
      is_admin: Boolean(user.is_admin),
      is_owner: Boolean(user.is_owner),
    };
  } finally {
    try {
      connection.close();
    } catch {
      // ignore close errors
    }
  }
};

export const createValidatedHomeAssistantUserResolver = ({
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  invalidAuthCacheTtlMs = DEFAULT_INVALID_AUTH_CACHE_TTL_MS,
  loadCurrentUser = loadCurrentUserFromHomeAssistant,
} = {}) => {
  /** @type {Map<string, CacheEntry>} */
  const cache = new Map();

  /** @param {HaCredentials} credentials */
  return async ({ haUrl, accessToken }) => {
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    const cacheKey = `${haUrl}::${tokenHash}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached?.user && cached.expiresAt > now) {
      return cached.user;
    }

    if (cached?.error && cached.expiresAt > now) {
      throw cached.error;
    }

    if (cached?.pendingPromise) {
      return cached.pendingPromise;
    }

    const pendingPromise = loadCurrentUser({ haUrl, accessToken })
      .then((user) => {
        const resolvedAt = Date.now();
        cache.set(cacheKey, {
          user,
          expiresAt: resolvedAt + cacheTtlMs,
        });
        pruneCache(cache, resolvedAt);
        return user;
      })
      .catch((error) => {
        if (isInvalidAuthError(error)) {
          cache.set(cacheKey, {
            error,
            expiresAt: Date.now() + invalidAuthCacheTtlMs,
          });
        } else {
          cache.delete(cacheKey);
        }
        throw error;
      });

    cache.set(cacheKey, {
      pendingPromise,
      expiresAt: now + cacheTtlMs,
    });

    return pendingPromise;
  };
};

const resolveValidatedHomeAssistantUser = createValidatedHomeAssistantUserResolver();

export const createHomeAssistantAuthMiddleware = ({
  validateHomeAssistantUser = resolveValidatedHomeAssistantUser,
} = {}) => {
  /**
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  return async (req, res, next) => {
    const trustedSupervisorUser = getTrustedSupervisorUser(req);
    if (trustedSupervisorUser) {
      req.authenticatedHaUser = trustedSupervisorUser;
      req.authenticatedHaUrl = null;
      next();
      return;
    }

    const haUrls = getHomeAssistantUrlCandidates();
    if (!haUrls.length) {
      sendJsonError(
        res,
        503,
        'Configure TUNET_INTERNAL_HA_URL for backend Home Assistant authentication.',
        'HA_AUTH_NOT_CONFIGURED'
      );
      return;
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      sendJsonError(res, 401, 'Missing Authorization bearer token');
      return;
    }

    /** @type {unknown} */
    let lastError = null;

    for (const haUrl of haUrls) {
      try {
        const user = await validateHomeAssistantUser({ haUrl, accessToken });
        req.authenticatedHaUser = user;
        req.authenticatedHaUrl = haUrl;
        next();
        return;
      } catch (error) {
        lastError = error;
        if (isInvalidAuthError(error)) break;
      }
    }

    sendValidationFailure(res, lastError, { haUrls });
  };
};
