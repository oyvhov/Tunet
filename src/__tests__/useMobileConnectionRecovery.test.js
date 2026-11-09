import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONNECTION_PROBE_TIMEOUT_MS,
  probeAndRecoverConnection,
  useMobileConnectionRecovery,
} from '../hooks/useMobileConnectionRecovery';
import { CONNECTION_PING_INTERVAL_MS, CONNECTION_PING_TIMEOUT_MS } from '../utils/connectionHealth';

describe('useMobileConnectionRecovery', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('probes the connection when the mobile app becomes visible', async () => {
    const conn = {
      connected: true,
      ping: vi.fn().mockResolvedValue(undefined),
      reconnect: vi.fn(),
    };
    const onHealthy = vi.fn();

    renderHook(() => useMobileConnectionRecovery({ conn, onHealthy, onRecovering: vi.fn() }));

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(conn.ping).toHaveBeenCalledOnce();
    expect(onHealthy).toHaveBeenCalledOnce();
    expect(conn.reconnect).not.toHaveBeenCalled();
  });

  it('forces a reconnect when the resumed socket is disconnected', async () => {
    const conn = {
      connected: false,
      ping: vi.fn(),
      reconnect: vi.fn(),
    };
    const onRecovering = vi.fn();

    renderHook(() => useMobileConnectionRecovery({ conn, onHealthy: vi.fn(), onRecovering }));

    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
      await Promise.resolve();
    });

    expect(onRecovering).toHaveBeenCalledOnce();
    expect(conn.reconnect).toHaveBeenCalledWith(true);
    expect(conn.ping).not.toHaveBeenCalled();
  });

  it.each([768, 1280])('also checks the connection on a %ipx wide tablet', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    const conn = {
      connected: true,
      ping: vi.fn().mockResolvedValue(undefined),
      reconnect: vi.fn(),
    };

    renderHook(() =>
      useMobileConnectionRecovery({ conn, onHealthy: vi.fn(), onRecovering: vi.fn() })
    );

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(conn.ping).toHaveBeenCalledOnce();
    expect(conn.reconnect).not.toHaveBeenCalled();
  });

  describe('periodic ping', () => {
    const renderWithConn = (conn, callbacks = {}) =>
      renderHook(() =>
        useMobileConnectionRecovery({
          conn,
          onHealthy: vi.fn(),
          onRecovering: vi.fn(),
          ...callbacks,
        })
      );

    beforeEach(() => {
      vi.useFakeTimers();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    });

    it('gives the periodic ping ten seconds before giving up on the connection', async () => {
      const conn = {
        connected: true,
        ping: vi.fn(() => new Promise(() => {})),
        reconnect: vi.fn(),
      };
      renderWithConn(conn);
      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS);
      await vi.advanceTimersByTimeAsync(9_000);
      expect(conn.reconnect).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1_100);
      expect(conn.reconnect).toHaveBeenCalledTimes(1);
    });

    it('pings once a minute while the screen is on', async () => {
      const conn = {
        connected: true,
        ping: vi.fn().mockResolvedValue(undefined),
        reconnect: vi.fn(),
      };
      renderWithConn(conn);

      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS - 1);
      expect(conn.ping).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(conn.ping).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS);
      expect(conn.ping).toHaveBeenCalledTimes(2);
    });

    it('does not ping while the screen is off', async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      const conn = {
        connected: true,
        ping: vi.fn().mockResolvedValue(undefined),
        reconnect: vi.fn(),
      };
      renderWithConn(conn);

      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS * 3);

      expect(conn.ping).not.toHaveBeenCalled();
    });

    it('finds a half-open socket and reconnects', async () => {
      const conn = {
        connected: true,
        ping: vi.fn(() => new Promise(() => {})),
        reconnect: vi.fn(),
      };
      const onRecovering = vi.fn();
      renderWithConn(conn, { onRecovering });

      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS + CONNECTION_PING_TIMEOUT_MS);

      expect(onRecovering).toHaveBeenCalledOnce();
      expect(conn.reconnect).toHaveBeenCalledWith(true);
    });

    it('stops pinging when unmounted', async () => {
      const conn = {
        connected: true,
        ping: vi.fn().mockResolvedValue(undefined),
        reconnect: vi.fn(),
      };
      const { unmount } = renderWithConn(conn);

      unmount();
      await vi.advanceTimersByTimeAsync(CONNECTION_PING_INTERVAL_MS * 2);

      expect(conn.ping).not.toHaveBeenCalled();
    });
  });

  it('forces a reconnect when the health probe times out', async () => {
    vi.useFakeTimers();
    const conn = {
      connected: true,
      ping: vi.fn(() => new Promise(() => {})),
      reconnect: vi.fn(),
    };
    const onRecovering = vi.fn();

    const recoveryPromise = probeAndRecoverConnection(conn, {
      timeoutMs: 100,
      onRecovering,
    });
    await vi.advanceTimersByTimeAsync(100);

    await expect(recoveryPromise).resolves.toBe('reconnecting');
    expect(onRecovering).toHaveBeenCalledOnce();
    expect(conn.reconnect).toHaveBeenCalledWith(true);
  });
});
