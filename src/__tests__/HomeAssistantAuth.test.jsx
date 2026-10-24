import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
} from 'home-assistant-js-websocket';
import { HomeAssistantProvider, useHomeAssistantMeta } from '../contexts/HomeAssistantContext';
import { hasOAuthTokens, saveTokens } from '../services/oauthStorage';

const ha = vi.hoisted(() => ({
  createConnection: vi.fn(),
  getAuth: vi.fn(),
  subscribeEntities: vi.fn(),
}));
vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal()),
  ...ha,
}));

const haSetup = { url: 'https://ha.example', token: '', authMethod: 'oauth' };
const wrapper = ({ children }) => (
  <HomeAssistantProvider config={haSetup}>{children}</HomeAssistantProvider>
);
const makeConnection = () => {
  const listeners = new Map();
  const connection = {
    close: vi.fn(),
    sendMessagePromise: vi.fn(async ({ type }) =>
      type === 'auth/current_user' ? { id: 'user-1' } : []
    ),
    addEventListener: vi.fn((name, fn) => listeners.set(name, fn)),
    removeEventListener: vi.fn((name) => listeners.delete(name)),
    emit: (name, error) => listeners.get(name)?.(connection, error),
  };
  return connection;
};

describe('Home Assistant authentication lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', haSetup.url);
    saveTokens({ access_token: 'access', refresh_token: 'refresh', hassUrl: haSetup.url });
    ha.getAuth.mockResolvedValue({ accessToken: 'access' });
    ha.subscribeEntities.mockReturnValue(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([ERR_INVALID_AUTH, ERR_INVALID_AUTH_CALLBACK])(
    'detects numeric OAuth rejection %s on initial connect',
    async (error) => {
      ha.getAuth.mockRejectedValue(error);
      const { result } = renderHook(useHomeAssistantMeta, { wrapper });
      await waitFor(() => expect(result.current.oauthExpired).toBe(true));
      expect(result.current.connected).toBe(false);
      expect(result.current.haUnavailableVisible).toBe(true);
      expect(hasOAuthTokens()).toBe(false);
    }
  );

  it('expires a revoked OAuth session during reconnection and closes the old connection', async () => {
    const connection = makeConnection();
    ha.createConnection.mockResolvedValue(connection);
    const { result } = renderHook(useHomeAssistantMeta, { wrapper });
    await waitFor(() => expect(result.current.haUser?.id).toBe('user-1'));
    act(() => connection.emit('reconnect-error', ERR_INVALID_AUTH));
    expect(result.current.oauthExpired).toBe(true);
    expect(result.current.connected).toBe(false);
    expect(result.current.haUser).toBeNull();
    expect(result.current.conn).toBeNull();
    expect(hasOAuthTokens()).toBe(false);
    expect(connection.close).toHaveBeenCalled();
  });

  it('keeps OAuth credentials on a network failure', async () => {
    ha.createConnection.mockRejectedValue(ERR_CANNOT_CONNECT);
    const { result } = renderHook(useHomeAssistantMeta, { wrapper });
    await waitFor(() => expect(result.current.haUnavailable).toBe(true));
    expect(result.current.oauthExpired).toBe(false);
    expect(hasOAuthTokens()).toBe(true);
  });

  it.each(['oauth', 'token'])(
    'retries an unavailable HA on startup in %s mode',
    async (authMethod) => {
      vi.useFakeTimers();
      const connection = makeConnection();
      ha.createConnection.mockRejectedValueOnce(ERR_CANNOT_CONNECT).mockResolvedValue(connection);
      const config = {
        ...haSetup,
        authMethod,
        token: authMethod === 'token' ? 'long-lived' : '',
      };
      const { result, unmount } = renderHook(useHomeAssistantMeta, {
        wrapper: ({ children }) => (
          <HomeAssistantProvider config={config}>{children}</HomeAssistantProvider>
        ),
      });
      await act(async () => {});
      expect(result.current.connected).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(result.current.connected).toBe(true);
      expect(ha.createConnection).toHaveBeenCalledTimes(2);
      unmount();
    }
  );

  it('cancels a pending startup retry when unmounted', async () => {
    vi.useFakeTimers();
    ha.createConnection.mockRejectedValue(ERR_CANNOT_CONNECT);
    const { unmount } = renderHook(useHomeAssistantMeta, { wrapper });
    await act(async () => {});
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(ha.createConnection).toHaveBeenCalledTimes(1);
  });

  it('still connects with a long-lived token through the browser fallback URL', async () => {
    localStorage.setItem('ha_auth_method', 'token');
    const connection = makeConnection();
    ha.createConnection.mockRejectedValueOnce(ERR_CANNOT_CONNECT).mockResolvedValueOnce(connection);
    const config = {
      ...haSetup,
      authMethod: 'token',
      token: 'long-lived',
      fallbackUrl: 'http://ha.local:8123',
    };
    const { result } = renderHook(useHomeAssistantMeta, {
      wrapper: ({ children }) => (
        <HomeAssistantProvider config={config}>{children}</HomeAssistantProvider>
      ),
    });
    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(result.current.activeUrl).toBe(config.fallbackUrl);
    expect(ha.getAuth).not.toHaveBeenCalled();
    expect(localStorage.getItem('ha_token')).toBe('long-lived');
  });
});
