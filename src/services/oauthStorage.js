// OAuth2 token persistence for Home Assistant
// Used as saveTokens / loadTokens callbacks for HAWS getAuth()

const OAUTH_TOKENS_KEY = 'ha_oauth_tokens';

export function saveTokens(tokenInfo) {
  try {
    localStorage.setItem(OAUTH_TOKENS_KEY, JSON.stringify(tokenInfo));
  } catch (error) {
    console.error('Failed to save OAuth tokens to localStorage:', error);
  }
}

export function loadTokens() {
  try {
    const raw = localStorage.getItem(OAUTH_TOKENS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load OAuth tokens from localStorage:', error);
  }
  return undefined;
}

export function clearOAuthTokens() {
  try {
    localStorage.removeItem(OAUTH_TOKENS_KEY);
  } catch (error) {
    console.error('Failed to clear OAuth tokens from localStorage:', error);
  }
}

export function hasOAuthTokens() {
  try {
    return !!localStorage.getItem(OAUTH_TOKENS_KEY);
  } catch {
    return false;
  }
}
