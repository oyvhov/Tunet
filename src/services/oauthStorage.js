// OAuth2 token persistence for Home Assistant
// Used as saveTokens / loadTokens callbacks for HAWS getAuth()

const OAUTH_TOKENS_KEY = 'ha_oauth_tokens';

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
    localStore?.setItem(OAUTH_TOKENS_KEY, payload);
    sessionStore?.removeItem(OAUTH_TOKENS_KEY);
  } catch (error) {
    console.error('Failed to save OAuth tokens to localStorage:', error);
  }
}

export function loadTokens() {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const localRaw = localStore?.getItem(OAUTH_TOKENS_KEY);
    if (localRaw) return JSON.parse(localRaw);

    const sessionRaw = sessionStore?.getItem(OAUTH_TOKENS_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      localStore?.setItem(OAUTH_TOKENS_KEY, sessionRaw);
      sessionStore?.removeItem(OAUTH_TOKENS_KEY);
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load OAuth tokens from localStorage:', error);
  }
  return undefined;
}

export function clearOAuthTokens() {
  try {
    getSessionStorage()?.removeItem(OAUTH_TOKENS_KEY);
    getLocalStorage()?.removeItem(OAUTH_TOKENS_KEY);
  } catch (error) {
    console.error('Failed to clear OAuth tokens from localStorage:', error);
  }
}

export function hasOAuthTokens() {
  try {
    return !!(getSessionStorage()?.getItem(OAUTH_TOKENS_KEY) || getLocalStorage()?.getItem(OAUTH_TOKENS_KEY));
  } catch {
    return false;
  }
}
