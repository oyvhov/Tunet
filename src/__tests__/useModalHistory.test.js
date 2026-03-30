import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useModalHistory from '../hooks/useModalHistory';

// ── Mocks ────────────────────────────────────────────────────
vi.mock('../services/haClient', () => ({
  getHistory: vi.fn(),
  getHistoryRest: vi.fn(),
  getStatistics: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getHistory, getHistoryRest, getStatistics } from '../services/haClient';

const fakeConn = { sendMessagePromise: vi.fn() };

// Helpers to build HA-shaped data
const point = (state, ts) => ({
  state: String(state),
  last_changed: ts,
});

const statPoint = (mean, start) => ({ mean, start });

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {});

// ═══════════════════════════════════════════════════════════════
// Disabled / guard states
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › disabled', () => {
  it('returns empty data when enabled is false', () => {
    const { result } = renderHook(() =>
      useModalHistory({ enabled: false, entityId: 'sensor.temp', conn: fakeConn })
    );
    expect(result.current.points).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('returns empty data when conn is null', () => {
    const { result } = renderHook(() =>
      useModalHistory({ enabled: true, entityId: 'sensor.temp', conn: null })
    );
    expect(result.current.points).toEqual([]);
  });

  it('returns empty data when entityId is missing', () => {
    const { result } = renderHook(() =>
      useModalHistory({ enabled: true, entityId: '', conn: fakeConn })
    );
    expect(result.current.points).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Strategy: rest (SensorModal pattern)
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › strategy: rest', () => {
  it('fetches via REST and returns mapped points', async () => {
    getHistoryRest.mockResolvedValue([
      point('22.5', '2026-03-30T10:00:00Z'),
      point('23.1', '2026-03-30T11:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        hours: 24,
        strategy: 'rest',
        currentState: '23.1',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHistoryRest).toHaveBeenCalledTimes(1);
    expect(result.current.points).toHaveLength(2);
    expect(result.current.points[0].value).toBe(22.5);
    expect(result.current.meta.source).toBe('rest');
  });

  it('falls back to WS when REST throws', async () => {
    getHistoryRest.mockRejectedValue(new Error('REST failed'));
    getHistory.mockResolvedValue([
      point('20', '2026-03-30T10:00:00Z'),
      point('21', '2026-03-30T11:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        currentState: '21',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHistoryRest).toHaveBeenCalledTimes(1);
    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(result.current.points).toHaveLength(2);
    expect(result.current.meta.source).toBe('ws');
  });

  it('falls back to statistics when points are sparse', async () => {
    getHistoryRest.mockResolvedValue([point('22', '2026-03-30T10:00:00Z')]);
    getStatistics.mockResolvedValue([
      statPoint(21, '2026-03-30T08:00:00Z'),
      statPoint(22, '2026-03-30T09:00:00Z'),
      statPoint(23, '2026-03-30T10:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        currentState: '23',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStatistics).toHaveBeenCalledTimes(1);
    expect(result.current.points).toHaveLength(3);
  });

  it('creates synthetic fallback when all history sources are empty', async () => {
    getHistoryRest.mockResolvedValue([]);
    getStatistics.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        currentState: '42',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toHaveLength(2);
    expect(result.current.points[0].value).toBe(42);
    expect(result.current.points[1].value).toBe(42);
  });

  it('includes events when includeEvents is true', async () => {
    getHistoryRest.mockResolvedValue([
      { state: 'on', last_changed: '2026-03-30T10:00:00Z' },
      { state: 'off', last_changed: '2026-03-30T11:00:00Z' },
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'binary_sensor.door',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        includeEvents: true,
        currentState: 'off',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].state).toBe('on');
  });

  it('skips REST/WS fetch when skipHistoryFetch is true', async () => {
    getStatistics.mockResolvedValue([
      statPoint(21, '2026-03-30T08:00:00Z'),
      statPoint(22, '2026-03-30T09:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        skipHistoryFetch: true,
        currentState: '22',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHistoryRest).not.toHaveBeenCalled();
    expect(getHistory).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// Strategy: ws (CostModal pattern)
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › strategy: ws', () => {
  it('fetches via WebSocket and returns points', async () => {
    getHistory.mockResolvedValue([
      point('12.45', '2026-03-30T10:00:00Z'),
      point('13.20', '2026-03-30T11:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.cost',
        conn: fakeConn,
        hours: 24,
        strategy: 'ws',
        currentState: '13.20',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(result.current.points).toHaveLength(2);
    expect(result.current.meta.source).toBe('ws');
  });

  it('falls back to statistics when WS returns empty', async () => {
    getHistory.mockResolvedValue([]);
    getStatistics.mockResolvedValue([
      statPoint(10, '2026-03-30T08:00:00Z'),
      statPoint(11, '2026-03-30T09:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.cost',
        conn: fakeConn,
        strategy: 'ws',
        currentState: '11',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// Strategy: stats (WeatherModal pattern)
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › strategy: stats', () => {
  it('fetches statistics first and returns mapped points', async () => {
    getStatistics.mockResolvedValue([
      statPoint(18, '2026-03-30T08:00:00Z'),
      statPoint(19, '2026-03-30T09:00:00Z'),
      statPoint(20, '2026-03-30T10:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.outdoor_temp',
        conn: fakeConn,
        hours: 12,
        strategy: 'stats',
        statsPeriod: '5minute',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStatistics).toHaveBeenCalledTimes(1);
    expect(getStatistics).toHaveBeenCalledWith(fakeConn, expect.objectContaining({
      statisticId: 'sensor.outdoor_temp',
      period: '5minute',
    }));
    expect(result.current.points).toHaveLength(3);
    expect(result.current.meta.source).toBe('stats');
  });

  it('falls back to WS when statistics are empty', async () => {
    getStatistics.mockResolvedValue([]);
    getHistory.mockResolvedValue([
      point('21', '2026-03-30T10:00:00Z'),
      point('22', '2026-03-30T11:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.outdoor_temp',
        conn: fakeConn,
        strategy: 'stats',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(result.current.points).toHaveLength(2);
    expect(result.current.meta.source).toBe('ws');
  });

  it('falls back to WS when statistics throw', async () => {
    getStatistics.mockRejectedValue(new Error('Stats unavailable'));
    getHistory.mockResolvedValue([
      point('15', '2026-03-30T10:00:00Z'),
      point('16', '2026-03-30T11:00:00Z'),
    ]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.outdoor_temp',
        conn: fakeConn,
        strategy: 'stats',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// Time window
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › timeWindow', () => {
  it('computes correct start/end based on hours', async () => {
    getHistoryRest.mockResolvedValue([]);
    getStatistics.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        hours: 6,
        strategy: 'rest',
        currentState: '20',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const { start, end } = result.current.timeWindow;
    const spanMs = end.getTime() - start.getTime();
    expect(spanMs).toBe(6 * 60 * 60 * 1000);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loading lifecycle
// ═══════════════════════════════════════════════════════════════
describe('useModalHistory › loading', () => {
  it('is true while fetching, false after', async () => {
    let resolve;
    getHistoryRest.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() =>
      useModalHistory({
        enabled: true,
        entityId: 'sensor.temp',
        conn: fakeConn,
        haUrl: 'http://ha.local',
        haToken: 'tok',
        strategy: 'rest',
        currentState: '20',
      })
    );

    // After mount, loading should be true once the effect fires
    await waitFor(() => expect(result.current.loading).toBe(true));

    // Resolve the fetch
    resolve([point('20', '2026-03-30T10:00:00Z'), point('21', '2026-03-30T11:00:00Z')]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toHaveLength(2);
  });
});
