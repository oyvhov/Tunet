import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionSetup } from '../hooks/useConnectionSetup';

// Mock dependencies
vi.mock('../config/onboarding', () => ({
  validateUrl: vi.fn((url) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }),
}));

vi.mock('../services/oauthStorage', () => ({
  saveTokens: vi.fn(),
  loadTokens: vi.fn(() => null),
  clearOAuthTokens: vi.fn(),
  logoutOAuthEverywhere: vi.fn(),
  hasOAuthTokens: vi.fn(() => false),
  isOAuthRejected: vi.fn(() => false),
}));

vi.mock('home-assistant-js-websocket', () => ({
  createConnection: vi.fn(),
  createLongLivedTokenAuth: vi.fn(() => ({ type: 'bearer' })),
  getAuth: vi.fn(() => Promise.resolve()),
  subscribeEntities: vi.fn(),
}));

import { hasOAuthTokens, isOAuthRejected, logoutOAuthEverywhere } from '../services/oauthStorage';
import { createConnection, createLongLivedTokenAuth, getAuth } from 'home-assistant-js-websocket';

const t = (key) => {
  const map = {
    'onboarding.testSuccess': 'Connection successful!',
    'onboarding.testFailed': 'Connection failed',
    'system.oauth.redirectFailed': 'OAuth redirect failed',
  };
  return map[key] ?? key;
};

const makeProps = (overrides = {}) => ({
  config: { url: 'http://ha.local:8123', token: 'tok123', authMethod: 'token' },
  setConfig: vi.fn(),
  connected: false,
  showOnboarding: false,
  setShowOnboarding: vi.fn(),
  showConfigModal: false,
  setShowConfigModal: vi.fn(),
  t,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ═════════════════════════════════════════════════════════════════════════
// Initial state
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › initial state', () => {
  it('starts at onboarding step 0', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    expect(result.current.onboardingStep).toBe(0);
  });

  it('defaults configTab to "connection"', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    expect(result.current.configTab).toBe('connection');
  });

  it('is not testing connection initially', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    expect(result.current.testingConnection).toBe(false);
    expect(result.current.connectionTestResult).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// testConnection
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › testConnection', () => {
  it('succeeds when createConnection resolves', async () => {
    const mockClose = vi.fn();
    createConnection.mockResolvedValueOnce({ close: mockClose });

    const { result } = renderHook(() => useConnectionSetup(makeProps()));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connectionTestResult).toEqual({
      success: true,
      message: 'Connection successful!',
    });
    expect(mockClose).toHaveBeenCalled();
    expect(result.current.testingConnection).toBe(false);
  });

  it('fails when createConnection rejects', async () => {
    createConnection.mockRejectedValueOnce(new Error('refused'));

    const { result } = renderHook(() => useConnectionSetup(makeProps()));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connectionTestResult).toEqual({
      success: false,
      message: 'Connection failed',
    });
    expect(result.current.testingConnection).toBe(false);
  });

  it('does nothing when URL is invalid', async () => {
    const props = makeProps({ config: { url: 'not-a-url', token: 'tok', authMethod: 'token' } });
    const { result } = renderHook(() => useConnectionSetup(props));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connectionTestResult).toBeNull();
    expect(createConnection).not.toHaveBeenCalled();
  });

  it('does nothing when token is missing (non-OAuth)', async () => {
    const props = makeProps({
      config: { url: 'http://ha.local:8123', token: '', authMethod: 'token' },
    });
    const { result } = renderHook(() => useConnectionSetup(props));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(createConnection).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// canAdvanceOnboarding
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › canAdvanceOnboarding', () => {
  it('is false at step 0 with token auth and no successful test', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    expect(result.current.canAdvanceOnboarding).toBe(false);
  });

  it('is true at step 0 with token auth after successful test', async () => {
    createConnection.mockResolvedValueOnce({ close: vi.fn() });
    const { result } = renderHook(() => useConnectionSetup(makeProps()));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.canAdvanceOnboarding).toBe(true);
  });

  it('is true at step 0 with OAuth when tokens exist', () => {
    hasOAuthTokens.mockReturnValue(true);
    const props = makeProps({
      config: { url: 'http://ha.local:8123', token: '', authMethod: 'oauth' },
    });
    const { result } = renderHook(() => useConnectionSetup(props));
    expect(result.current.canAdvanceOnboarding).toBe(true);
  });

  it('is true at step 1 regardless of connection state', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    act(() => result.current.setOnboardingStep(1));
    expect(result.current.canAdvanceOnboarding).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// OAuth logout
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › handleOAuthLogout', () => {
  it('logs out every tab, updates config and reloads to drop the live session', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const props = makeProps();
    const { result } = renderHook(() => useConnectionSetup(props));

    act(() => result.current.handleOAuthLogout());

    expect(logoutOAuthEverywhere).toHaveBeenCalled();
    expect(props.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ authMethod: 'oauth', token: '' })
    );
    expect(reload).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Auto-close onboarding on OAuth connect
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › auto-close onboarding', () => {
  it('closes onboarding when connected via OAuth', () => {
    const props = makeProps({
      config: { url: 'http://ha.local:8123', token: '', authMethod: 'oauth' },
      connected: false,
      showOnboarding: true,
    });
    const { rerender } = renderHook((p) => useConnectionSetup(p), {
      initialProps: props,
    });

    // Simulate connection established
    rerender({ ...props, connected: true });

    expect(props.setShowOnboarding).toHaveBeenCalledWith(false);
    expect(props.setShowConfigModal).toHaveBeenCalledWith(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Re-open onboarding when auth is lost
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › re-open onboarding on auth loss', () => {
  it('opens onboarding when token is cleared', () => {
    hasOAuthTokens.mockReturnValue(false);
    const props = makeProps({
      config: { url: 'http://ha.local:8123', token: '', authMethod: 'token' },
      showOnboarding: false,
      showConfigModal: false,
    });
    renderHook(() => useConnectionSetup(props));

    expect(props.setShowOnboarding).toHaveBeenCalledWith(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// State setters
// ═════════════════════════════════════════════════════════════════════════
describe('useConnectionSetup › setters', () => {
  it('setOnboardingStep updates step', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    act(() => result.current.setOnboardingStep(2));
    expect(result.current.onboardingStep).toBe(2);
  });

  it('setConfigTab updates tab', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    act(() => result.current.setConfigTab('appearance'));
    expect(result.current.configTab).toBe('appearance');
  });

  it('setOnboardingUrlError updates error', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));
    act(() => result.current.setOnboardingUrlError('Invalid URL'));
    expect(result.current.onboardingUrlError).toBe('Invalid URL');
  });
});

describe('useConnectionSetup startOAuthLogin', () => {
  it('uses the explicit URL draft and persists it only when login starts', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    const props = makeProps({
      config: { url: 'https://old-ha.example', token: '', authMethod: 'oauth' },
    });
    const { result } = renderHook(() => useConnectionSetup(props));

    await act(async () => {
      result.current.startOAuthLogin('  https://new-ha.example/  ');
      await Promise.resolve();
    });

    expect(getAuth).toHaveBeenCalledWith(
      expect.objectContaining({ hassUrl: 'https://new-ha.example' })
    );
    expect(setItem).toHaveBeenCalledWith('ha_url', 'https://new-ha.example');
    expect(setItem).toHaveBeenCalledWith('ha_auth_method', 'oauth');
    expect(props.setConfig).not.toHaveBeenCalled();
  });

  it('does not start OAuth for an invalid URL draft', () => {
    const { result } = renderHook(() => useConnectionSetup(makeProps()));

    act(() => result.current.startOAuthLogin('h'));

    expect(getAuth).not.toHaveBeenCalled();
  });
});

describe('useConnectionSetup › lost auth', () => {
  const missingLoginProps = () =>
    makeProps({ config: { url: 'http://ha.local:8123', token: '', authMethod: 'oauth' } });

  it('re-opens onboarding when OAuth tokens are missing', () => {
    const props = missingLoginProps();
    renderHook(() => useConnectionSetup(props));
    expect(props.setShowOnboarding).toHaveBeenCalledWith(true);
  });

  it('leaves a rejected OAuth session to the expired-login banner', () => {
    isOAuthRejected.mockReturnValueOnce(true);
    const props = missingLoginProps();
    renderHook(() => useConnectionSetup(props));
    expect(props.setShowOnboarding).not.toHaveBeenCalled();
  });
});
