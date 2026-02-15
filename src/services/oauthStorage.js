// OAuth2 token persistence for Home Assistant
// Used as saveTokens / loadTokens callbacks for HAWS getAuth()

const OAUTH_TOKENS_KEY = 'ha_oauth_tokens';

const getSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function saveTokens(tokenInfo) {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const payload = JSON.stringify(tokenInfo);
    sessionStore?.setItem(OAUTH_TOKENS_KEY, payload);
    localStore?.removeItem(OAUTH_TOKENS_KEY);
  } catch (error) {
    console.error('Failed to save OAuth tokens to localStorage:', error);
  }
}

export function loadTokens() {
  try {
    const sessionStore = getSessionStorage();
    const localStore = getLocalStorage();
    const sessionRaw = sessionStore?.getItem(OAUTH_TOKENS_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw);

    const legacyRaw = localStore?.getItem(OAUTH_TOKENS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      sessionStore?.setItem(OAUTH_TOKENS_KEY, legacyRaw);
      localStore?.removeItem(OAUTH_TOKENS_KEY);
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
