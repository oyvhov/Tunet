import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  HomeAssistantProvider,
  useHomeAssistantMeta,
  useHomeAssistantOffline,
} from '../contexts/HomeAssistantContext';
import { CONNECTION_PING_INTERVAL_MS, ENTITY_STALE_NO_UPDATE_MS } from '../utils/connectionHealth';
import { CONNECTION_PROBE_TIMEOUT_MS } from '../hooks/useMobileConnectionRecovery';

const ha = vi.hoisted(() => ({
  createConnection: vi.fn(),
  createLongLivedTokenAuth: vi.fn(() => ({ accessToken: 'token' })),
  subscribeEntities: vi.fn(),
}));
vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...ha,
}));

const recovery = vi.hoisted(() => ({
  current: null as null | { onHealthy: () => void; onRecovering: () => void },
}));
vi.mock('../hooks/useMobileConnectionRecovery', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMobileConnectionRecovery: (callbacks: { onHealthy: () => void; onRecovering: () => void }) => {
    recovery.current = callbacks;
  },
}));

const config = { url: 'https://ha.example', token: 'token', authMethod: 'token' };
const wrapper = ({ children }: { children: ReactNode }) => (
  // The test only exercises the fields above; the full config type carries many optional ones.
  <HomeAssistantProvider config={config as never}>{children}</HomeAssistantProvider>
);

const useBoth = () => ({ offline: useHomeAssistantOffline(), meta: useHomeAssistantMeta() });

const connect = async () => {
  ha.createConnection.mockResolvedValue({
    close: vi.fn(),
    sendMessagePromise: vi.fn(async () => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  let pushEntities: (entities: object) => void = () => {};
  ha.subscribeEntities.mockImplementation((_conn: unknown, callback: typeof pushEntities) => {
    pushEntities = callback;
    return vi.fn();
  });
  const view = renderHook(useBoth, { wrapper });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  act(() => pushEntities({ 'light.kitchen': { state: 'on' } }));
  return view;
};

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('useHomeAssistantOffline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('innerWidth', 1280);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('defaults to false without a provider', () => {
    const { result } = renderHook(useHomeAssistantOffline);
    expect(result.current).toBe(false);
  });

  it('is false on a healthy connection with fresh data', async () => {
    const { result } = await connect();
    expect(result.current.offline).toBe(false);
  });

  it('turns on once the connection has been down past the warning delay', async () => {
    const { result } = await connect();
    act(() => recovery.current?.onRecovering());
    expect(result.current.offline).toBe(false);
    await advance(5_000);
    expect(result.current.meta.haUnavailableVisible).toBe(true);
    expect(result.current.offline).toBe(true);
    act(() => recovery.current?.onHealthy());
    await advance(0);
    expect(result.current.offline).toBe(false);
  });

  it('turns on when nothing proves the connection is alive', async () => {
    const { result } = await connect();
    await advance(ENTITY_STALE_NO_UPDATE_MS + 5_000);
    expect(result.current.meta.entityDataStale).toBe(true);
    expect(result.current.offline).toBe(true);
  });

  it('stays off in a quiet house as long as the periodic ping is answered', async () => {
    const { result } = await connect();
    for (let minute = 0; minute < 6; minute += 1) {
      await advance(CONNECTION_PING_INTERVAL_MS);
      act(() => recovery.current?.onHealthy());
      await advance(0);
      expect(result.current.offline).toBe(false);
    }
    expect(result.current.meta.entityDataStale).toBe(false);
  });

  it('unlocks the cards as soon as a ping is answered', async () => {
    const { result } = await connect();
    await advance(ENTITY_STALE_NO_UPDATE_MS + 5_000);
    expect(result.current.offline).toBe(true);
    act(() => recovery.current?.onHealthy());
    expect(result.current.offline).toBe(false);
  });

  it('does not lock the cards during the warning delay after the screen wakes', async () => {
    const { result } = await connect();
    act(() => recovery.current?.onRecovering());
    await advance(20_000);
    expect(result.current.offline).toBe(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.meta.haUnavailableVisible).toBe(false);
    expect(result.current.offline).toBe(false);
  });

  it('allows a slow ping to finish before the data counts as stale', () => {
    expect(ENTITY_STALE_NO_UPDATE_MS).toBeGreaterThan(
      CONNECTION_PING_INTERVAL_MS + CONNECTION_PROBE_TIMEOUT_MS
    );
  });
});
