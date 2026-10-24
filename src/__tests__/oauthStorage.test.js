import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOAuthTokens,
  getOAuthTokenSavedAt,
  hasOAuthTokens,
  loadTokens,
  logoutOAuthEverywhere,
  requestTokensFromOtherTabs,
  saveTokens,
  subscribeToOAuthLogout,
  subscribeToOAuthTokenChanges,
} from '../services/oauthStorage';

describe('oauthStorage', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('stores OAuth tokens in persistent browser storage', () => {
    saveTokens({ access_token: 'access-1', refresh_token: 'refresh-1' });

    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'access-1', refresh_token: 'refresh-1' })
    );
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'access-1', refresh_token: 'refresh-1' })
    );
    expect(Number(sessionStorage.getItem('tunet_auth_saved_at_v1'))).toBeGreaterThan(0);
    expect(getOAuthTokenSavedAt()).toBeGreaterThan(0);
  });

  it('migrates legacy local storage OAuth tokens into the primary storage slot', () => {
    localStorage.setItem(
      'tunet_auth_cache_v1',
      JSON.stringify({ access_token: 'access-2', refresh_token: 'refresh-2' })
    );

    expect(loadTokens()).toEqual({ access_token: 'access-2', refresh_token: 'refresh-2' });
    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'access-2', refresh_token: 'refresh-2' })
    );
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'access-2', refresh_token: 'refresh-2' })
    );
  });

  it('clears malformed OAuth token payloads instead of keeping them around', () => {
    sessionStorage.setItem('tunet_auth_cache_v1', '{bad json');

    expect(loadTokens()).toBeUndefined();
    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBeNull();
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBeNull();
  });

  it('reports OAuth availability from session-backed tokens', () => {
    sessionStorage.setItem('tunet_auth_cache_v1', JSON.stringify({ access_token: 'access-3' }));

    expect(hasOAuthTokens()).toBe(true);
  });

  it('removes OAuth tokens from all browser storage slots', () => {
    sessionStorage.setItem('tunet_auth_cache_v1', JSON.stringify({ access_token: 'access-4' }));
    localStorage.setItem('ha_oauth_tokens', JSON.stringify({ access_token: 'legacy' }));

    clearOAuthTokens();

    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBeNull();
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBeNull();
    expect(sessionStorage.getItem('tunet_auth_saved_at_v1')).toBeNull();
    expect(localStorage.getItem('tunet_auth_saved_at_v1')).toBeNull();
    expect(localStorage.getItem('ha_oauth_tokens')).toBeNull();
  });

  it('hydrates OAuth tokens from another tab into session storage', async () => {
    const tokensPromise = requestTokensFromOtherTabs({ timeoutMs: 100 });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'tunet_auth_sync_response_v1',
        newValue: JSON.stringify({
          type: 'oauth-token-response',
          tokens: { access_token: 'shared-access', refresh_token: 'shared-refresh' },
        }),
      })
    );

    await expect(tokensPromise).resolves.toEqual({
      access_token: 'shared-access',
      refresh_token: 'shared-refresh',
    });
    expect(sessionStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'shared-access', refresh_token: 'shared-refresh' })
    );
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBe(
      JSON.stringify({ access_token: 'shared-access', refresh_token: 'shared-refresh' })
    );
  });

  it('notifies OAuth listeners when another tab provides tokens', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOAuthTokenChanges(listener);
    const tokensPromise = requestTokensFromOtherTabs({ timeoutMs: 100 });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'tunet_auth_sync_response_v1',
        newValue: JSON.stringify({
          type: 'oauth-token-response',
          tokens: { access_token: 'shared-access-2', refresh_token: 'shared-refresh-2' },
        }),
      })
    );

    await tokensPromise;

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('clears tokens and notifies listeners when another tab logs out', () => {
    saveTokens({ access_token: 'access-5', refresh_token: 'refresh-5' });
    const listener = vi.fn();
    const unsubscribe = subscribeToOAuthLogout(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'tunet_auth_sync_request_v1',
        newValue: JSON.stringify({ type: 'oauth-logout' }),
      })
    );

    expect(hasOAuthTokens()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('announces a logout to other tabs and clears local tokens', async () => {
    saveTokens({ access_token: 'access-6', refresh_token: 'refresh-6' });
    const otherTab = new BroadcastChannel('tunet_auth_sync_channel_v1');
    const received = new Promise((resolve) => {
      otherTab.onmessage = (event) => resolve(event.data);
    });

    logoutOAuthEverywhere();

    expect(hasOAuthTokens()).toBe(false);
    await expect(received).resolves.toEqual({ type: 'oauth-logout' });
    otherTab.close();
  });
});
