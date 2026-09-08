import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeAssistantProvider, useHomeAssistantMeta } from '../contexts/HomeAssistantContext';
import { HOME_ASSISTANT_API_UNAUTHORIZED_EVENT } from '../services/apiAuth';

const recovery = vi.hoisted(() => ({ current: null }));
vi.mock('../hooks/useMobileConnectionRecovery', () => ({
  useMobileConnectionRecovery: (callbacks) => {
    recovery.current = callbacks;
  },
}));

const config = { url: '', token: '', authMethod: 'token' };
const wrapper = ({ children }) => (
  <HomeAssistantProvider config={config}>{children}</HomeAssistantProvider>
);

describe('Home Assistant connection warnings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('innerWidth', 390);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['visibilitychange', 'pageshow'])('restarts the mobile grace period on %s', (event) => {
    const { result } = renderHook(useHomeAssistantMeta, { wrapper });
    act(() => recovery.current.onRecovering());
    act(() => vi.advanceTimersByTime(15_000));
    expect(result.current.haUnavailableVisible).toBe(true);

    act(() => (event === 'pageshow' ? window : document).dispatchEvent(new Event(event)));
    expect(result.current.haUnavailableVisible).toBe(false);
    act(() => vi.advanceTimersByTime(14_999));
    expect(result.current.haUnavailableVisible).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.haUnavailableVisible).toBe(true);
  });

  it('cancels a pending warning when the connection recovers', () => {
    const { result } = renderHook(useHomeAssistantMeta, { wrapper });
    act(() => recovery.current.onRecovering());
    act(() => vi.advanceTimersByTime(10_000));
    act(() => recovery.current.onHealthy());
    act(() => vi.advanceTimersByTime(15_000));
    expect(result.current.haUnavailableVisible).toBe(false);
  });

  it('shows expired authentication immediately and keeps it visible on resume', () => {
    const { result } = renderHook(useHomeAssistantMeta, { wrapper });
    act(() =>
      window.dispatchEvent(
        new CustomEvent(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, {
          detail: { authMethod: 'oauth' },
        })
      )
    );
    expect(result.current.oauthExpired).toBe(true);
    expect(result.current.haUnavailableVisible).toBe(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.haUnavailableVisible).toBe(true);
  });
});
