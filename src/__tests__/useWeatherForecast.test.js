import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useWeatherForecast from '../hooks/useWeatherForecast';
import { getForecast } from '../services';

vi.mock('../services', () => ({
  getForecast: vi.fn(),
}));

describe('useWeatherForecast', () => {
  beforeEach(() => {
    getForecast.mockReset();
  });

  it('loads hourly and daily forecasts for each weather card', async () => {
    const hourly = [{ datetime: '2026-08-21T13:00:00+02:00', temperature: 13 }];
    const daily = [{ datetime: '2026-08-22T12:00:00+02:00', temperature: 17 }];
    getForecast.mockImplementation((_conn, { type }) =>
      Promise.resolve(type === 'hourly' ? hourly : daily)
    );

    const cardSettings = {
      'page::weather_temp_weather.home': { weatherId: 'weather.home' },
    };
    const conn = {};
    const { result } = renderHook(() => useWeatherForecast(conn, cardSettings));

    await waitFor(() => {
      expect(result.current[0]['weather.home']).toEqual({ hourly, daily });
    });
    expect(getForecast).toHaveBeenCalledTimes(2);
    expect(getForecast).toHaveBeenCalledWith(conn, {
      entityId: 'weather.home',
      type: 'hourly',
    });
    expect(getForecast).toHaveBeenCalledWith(conn, {
      entityId: 'weather.home',
      type: 'daily',
    });
  });

  it('keeps the available forecast when one type is unsupported', async () => {
    const daily = [{ datetime: '2026-08-22T12:00:00+02:00', temperature: 17 }];
    getForecast.mockImplementation((_conn, { type }) =>
      type === 'hourly' ? Promise.reject(new Error('unsupported')) : Promise.resolve(daily)
    );

    const cardSettings = {
      'page::weather_temp_weather.home': { weatherId: 'weather.home' },
    };
    const conn = {};
    const { result } = renderHook(() => useWeatherForecast(conn, cardSettings));

    await waitFor(() => {
      expect(result.current[0]['weather.home']).toEqual({ daily });
    });
  });
});
