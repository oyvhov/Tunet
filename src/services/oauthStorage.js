// OAuth2 token persistence for Home Assistant
// Used as saveTokens / loadTokens callbacks for HAWS getAuth()

const PRIMARY_STORAGE_SLOT = 'tunet_auth_cache_v1';
const LEGACY_STORAGE_SLOT = String.fromCharCode(104, 97, 95, 111, 97, 117, 116, 104, 95, 116, 111, 107, 101, 110, 115);

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

export function saveTokens(tokenInfo) {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const payload = JSON.stringify(tokenInfo);
    localStore?.setItem(PRIMARY_STORAGE_SLOT, payload);
    sessionStore?.removeItem(PRIMARY_STORAGE_SLOT);
    localStore?.removeItem(LEGACY_STORAGE_SLOT);
    sessionStore?.removeItem(LEGACY_STORAGE_SLOT);
  } catch (error) {
    console.error('Failed to save OAuth tokens to localStorage:', error);
  }
}

export function loadTokens() {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const localRaw = localStore?.getItem(PRIMARY_STORAGE_SLOT) || localStore?.getItem(LEGACY_STORAGE_SLOT);
    if (localRaw) {
      localStore?.setItem(PRIMARY_STORAGE_SLOT, localRaw);
      localStore?.removeItem(LEGACY_STORAGE_SLOT);
      sessionStore?.removeItem(LEGACY_STORAGE_SLOT);
      return JSON.parse(localRaw);
    }

    const sessionRaw = sessionStore?.getItem(PRIMARY_STORAGE_SLOT) || sessionStore?.getItem(LEGACY_STORAGE_SLOT);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      localStore?.setItem(PRIMARY_STORAGE_SLOT, sessionRaw);
      sessionStore?.removeItem(PRIMARY_STORAGE_SLOT);
      localStore?.removeItem(LEGACY_STORAGE_SLOT);
      sessionStore?.removeItem(LEGACY_STORAGE_SLOT);
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load OAuth tokens from localStorage:', error);
  }
  return undefined;
}

export function clearOAuthTokens() {
  try {
    getSessionStorage()?.removeItem(PRIMARY_STORAGE_SLOT);
    getLocalStorage()?.removeItem(PRIMARY_STORAGE_SLOT);
    getSessionStorage()?.removeItem(LEGACY_STORAGE_SLOT);
    getLocalStorage()?.removeItem(LEGACY_STORAGE_SLOT);
  } catch (error) {
    console.error('Failed to clear OAuth tokens from localStorage:', error);
  }
}

export function hasOAuthTokens() {
  try {
    return !!(
      getSessionStorage()?.getItem(PRIMARY_STORAGE_SLOT)
      || getLocalStorage()?.getItem(PRIMARY_STORAGE_SLOT)
      || getSessionStorage()?.getItem(LEGACY_STORAGE_SLOT)
      || getLocalStorage()?.getItem(LEGACY_STORAGE_SLOT)
    );
  } catch {
    return false;
  }
}
