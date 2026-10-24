// OAuth2 token persistence for Home Assistant
// Used as saveTokens / loadTokens callbacks for HAWS getAuth()

import type { AuthData } from 'home-assistant-js-websocket';

// What HAWS hands to saveTokens and what we persist and read back.
export type OAuthTokens = AuthData;

type OAuthSyncPayload =
  | { type: 'oauth-token-request' }
  | { type: 'oauth-token-response'; tokens: OAuthTokens }
  | { type: 'oauth-logout' };

const PRIMARY_STORAGE_SLOT = 'tunet_auth_cache_v1';
const TOKEN_SAVED_AT_SLOT = 'tunet_auth_saved_at_v1';
const OAUTH_SYNC_REQUEST_KEY = 'tunet_auth_sync_request_v1';
const OAUTH_SYNC_RESPONSE_KEY = 'tunet_auth_sync_response_v1';
const OAUTH_SYNC_CHANNEL_NAME = 'tunet_auth_sync_channel_v1';
const OAUTH_SYNC_TIMEOUT_MS = 400;
const LEGACY_STORAGE_SLOT = String.fromCharCode(
  104,
  97,
  95,
  111,
  97,
  117,
  116,
  104,
  95,
  116,
  111,
  107,
  101,
  110,
  115
);

const tokenChangeListeners = new Set<() => void>();
const logoutListeners = new Set<() => void>();
let syncInitialized = false;
let syncChannel: BroadcastChannel | null = null;
let pendingTokenRequest: Promise<OAuthTokens | undefined> | null = null;
// Set when Home Assistant rejected the stored OAuth session; the expired-login
// banner owns re-authentication until new tokens are saved.
let oauthRejected = false;

const getSessionStorage = () => {
  try {
    return globalThis.window?.sessionStorage ?? null;
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
};

const clearLegacySlots = () => {
  const sessionStore = getSessionStorage();
  const localStore = getLocalStorage();
  sessionStore?.removeItem(LEGACY_STORAGE_SLOT);
  localStore?.removeItem(LEGACY_STORAGE_SLOT);
};

const clearPrimarySlots = () => {
  const sessionStore = getSessionStorage();
  const localStore = getLocalStorage();
  sessionStore?.removeItem(PRIMARY_STORAGE_SLOT);
  sessionStore?.removeItem(TOKEN_SAVED_AT_SLOT);
  localStore?.removeItem(PRIMARY_STORAGE_SLOT);
  localStore?.removeItem(TOKEN_SAVED_AT_SLOT);
};

const readSavedAtTimestamp = () => {
  const sessionStore = getSessionStorage();
  const localStore = getLocalStorage();
  const raw =
    sessionStore?.getItem(TOKEN_SAVED_AT_SLOT) || localStore?.getItem(TOKEN_SAVED_AT_SLOT);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const emitTokenChange = () => {
  for (const listener of tokenChangeListeners) {
    try {
      listener();
    } catch (error) {
      console.error('Failed to notify OAuth token listeners:', error);
    }
  }
};

const hasTokenPayload = (tokens: OAuthTokens | null | undefined): tokens is OAuthTokens =>
  Boolean(tokens?.access_token || tokens?.refresh_token);

const parseStoredTokens = (raw: string | null | undefined): OAuthTokens | undefined => {
  if (!raw) return undefined;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') return undefined;
  // Written by saveTokens; only the object check above is done at runtime.
  return parsed as OAuthTokens;
};

const readSessionTokens = () => {
  const sessionStore = getSessionStorage();
  const sessionRaw =
    sessionStore?.getItem(PRIMARY_STORAGE_SLOT) || sessionStore?.getItem(LEGACY_STORAGE_SLOT);
  return parseStoredTokens(sessionRaw);
};

const postSyncMessage = (key: string, payload: OAuthSyncPayload) => {
  if (syncChannel) {
    syncChannel.postMessage(payload);
    return;
  }

  const localStore = getLocalStorage();
  if (!localStore) return;
  localStore.setItem(key, JSON.stringify(payload));
  localStore.removeItem(key);
};

const handleSyncPayload = (payload: OAuthSyncPayload | null | undefined) => {
  if (!payload || typeof payload !== 'object') return;

  if (payload.type === 'oauth-token-request') {
    const tokens = readSessionTokens() || loadTokens();
    if (hasTokenPayload(tokens)) {
      postSyncMessage(OAUTH_SYNC_RESPONSE_KEY, {
        type: 'oauth-token-response',
        tokens,
      });
    }
    return;
  }

  if (payload.type === 'oauth-logout') {
    clearOAuthTokens();
    logoutListeners.forEach((listener) => listener());
    return;
  }

  if (payload.type === 'oauth-token-response' && hasTokenPayload(payload.tokens)) {
    saveTokens(payload.tokens);
  }
};

const ensureCrossTabSync = () => {
  if (syncInitialized || typeof globalThis.window === 'undefined') return;
  syncInitialized = true;

  if (typeof globalThis.BroadcastChannel === 'function') {
    syncChannel = new globalThis.BroadcastChannel(OAUTH_SYNC_CHANNEL_NAME);
    const onMessage = (event: MessageEvent<OAuthSyncPayload | null>) =>
      handleSyncPayload(event?.data);
    if (typeof syncChannel.addEventListener === 'function') {
      syncChannel.addEventListener('message', onMessage);
    } else {
      syncChannel.onmessage = onMessage;
    }
  }

  globalThis.window.addEventListener('storage', (event) => {
    if (
      (event.key !== OAUTH_SYNC_REQUEST_KEY && event.key !== OAUTH_SYNC_RESPONSE_KEY) ||
      !event.newValue
    ) {
      return;
    }

    try {
      handleSyncPayload(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed sync payloads from other tabs.
    }
  });
};

export function saveTokens(tokenInfo: OAuthTokens | null): void {
  oauthRejected = false;
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const payload = JSON.stringify(tokenInfo);
    const savedAt = String(Date.now());
    clearPrimarySlots();
    sessionStore?.setItem(PRIMARY_STORAGE_SLOT, payload);
    sessionStore?.setItem(TOKEN_SAVED_AT_SLOT, savedAt);
    localStore?.setItem(PRIMARY_STORAGE_SLOT, payload);
    localStore?.setItem(TOKEN_SAVED_AT_SLOT, savedAt);
    clearLegacySlots();
    emitTokenChange();
  } catch (error) {
    console.error('Failed to save OAuth tokens to browser storage:', error);
  }
}

export function loadTokens(): OAuthTokens | undefined {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const sessionRaw =
      sessionStore?.getItem(PRIMARY_STORAGE_SLOT) || sessionStore?.getItem(LEGACY_STORAGE_SLOT);
    if (sessionRaw) {
      const parsed = parseStoredTokens(sessionRaw);
      clearLegacySlots();
      if (parsed) {
        sessionStore?.setItem(PRIMARY_STORAGE_SLOT, JSON.stringify(parsed));
        return parsed;
      }
      clearPrimarySlots();
      return undefined;
    }

    const localRaw =
      localStore?.getItem(PRIMARY_STORAGE_SLOT) || localStore?.getItem(LEGACY_STORAGE_SLOT);
    if (localRaw) {
      const parsed = parseStoredTokens(localRaw);
      clearPrimarySlots();
      clearLegacySlots();
      if (parsed) {
        saveTokens(parsed);
        return parsed;
      }
    }
  } catch (error) {
    clearOAuthTokens();
    console.error('Failed to load OAuth tokens from browser storage:', error);
  }
  return undefined;
}

export function clearOAuthTokens() {
  try {
    clearPrimarySlots();
    clearLegacySlots();
    emitTokenChange();
  } catch (error) {
    console.error('Failed to clear OAuth tokens from browser storage:', error);
  }
}

export function markOAuthRejected() {
  oauthRejected = true;
}

export function isOAuthRejected() {
  return oauthRejected;
}

export function getOAuthTokenSavedAt() {
  try {
    return readSavedAtTimestamp();
  } catch {
    return 0;
  }
}

export function subscribeToOAuthTokenChanges(listener: () => void): () => void {
  ensureCrossTabSync();
  tokenChangeListeners.add(listener);
  return () => {
    tokenChangeListeners.delete(listener);
  };
}

export function subscribeToOAuthLogout(listener: () => void): () => void {
  ensureCrossTabSync();
  logoutListeners.add(listener);
  return () => {
    logoutListeners.delete(listener);
  };
}

/** Clear OAuth tokens here and tell every other open tab to drop theirs. */
export function logoutOAuthEverywhere() {
  ensureCrossTabSync();
  clearOAuthTokens();
  postSyncMessage(OAUTH_SYNC_REQUEST_KEY, { type: 'oauth-logout' });
}

export function requestTokensFromOtherTabs({
  timeoutMs = OAUTH_SYNC_TIMEOUT_MS,
}: { timeoutMs?: number } = {}): Promise<OAuthTokens | undefined> {
  ensureCrossTabSync();

  const existingTokens = loadTokens();
  if (hasTokenPayload(existingTokens)) {
    return Promise.resolve(existingTokens);
  }

  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = new Promise<OAuthTokens | undefined>((resolve) => {
    const unsubscribe = subscribeToOAuthTokenChanges(() => {
      const tokens = loadTokens();
      if (!hasTokenPayload(tokens)) return;
      clearTimeout(timeoutId);
      unsubscribe();
      pendingTokenRequest = null;
      resolve(tokens);
    });

    const timeoutId = globalThis.setTimeout(() => {
      unsubscribe();
      pendingTokenRequest = null;
      resolve(loadTokens());
    }, timeoutMs);

    postSyncMessage(OAUTH_SYNC_REQUEST_KEY, { type: 'oauth-token-request' });
  });

  return pendingTokenRequest;
}

export function hasOAuthTokens() {
  try {
    const tokens = loadTokens();
    return Boolean(tokens?.access_token || tokens?.refresh_token);
  } catch {
    return false;
  }
}
