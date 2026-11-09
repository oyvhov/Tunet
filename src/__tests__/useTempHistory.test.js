import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getHistory, getStatistics } = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getStatistics: vi.fn(),
}));
vi.mock('../services', () => ({ getHistory, getStatistics }));

import useTempHistory from '../hooks/useTempHistory';

const settings = { 'home::weather_temp_1': { tempId: 'sensor.ute' } };

describe('useTempHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getHistory.mockReset();
    getStatistics.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('keeps websocket history in the shape the weather graph reads', async () => {
    getStatistics.mockResolvedValue([]);
    getHistory.mockResolvedValue([
      { s: '6.5', lu: 1700000000 },
      { s: 'unavailable', lu: 1700000300 },
      { s: '7', lu: 1700000600 },
    ]);

    const { result } = renderHook(() => useTempHistory({}, settings));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current[0]['sensor.ute']).toEqual([
      { state: 6.5, last_updated: new Date(1700000000 * 1000).toISOString() },
      { state: 7, last_updated: new Date(1700000600 * 1000).toISOString() },
    ]);
  });
});
