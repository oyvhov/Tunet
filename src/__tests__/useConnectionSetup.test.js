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
  hasOAuthTokens: vi.fn(() => false),
}));

vi.mock('home-assistant-js-websocket', () => ({
  createConnection: vi.fn(),
  createLongLivedTokenAuth: vi.fn(() => ({ type: 'bearer' })),
  getAuth: vi.fn(() => Promise.resolve()),
  subscribeEntities: vi.fn(),
}));

import { hasOAuthTokens, clearOAuthTokens } from '../services/oauthStorage';
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

afterEach(() => {});

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
  it('clears OAuth tokens and updates config', () => {
    const props = makeProps();
    const { result } = renderHook(() => useConnectionSetup(props));

    act(() => result.current.handleOAuthLogout());

    expect(clearOAuthTokens).toHaveBeenCalled();
    expect(props.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ authMethod: 'oauth', token: '' })
    );
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
