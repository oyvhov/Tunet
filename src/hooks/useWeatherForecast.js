import { useState, useEffect, useMemo } from 'react';
import { getForecast } from '../services';

/**
 * Hook to map multiple weather entities to forecast data
 * Returns [forecastsById, setForecastsById]
 */
export default function useWeatherForecast(conn, cardSettings) {
  const [forecastsById, setForecastsById] = useState({});

  // Derive a stable list of weather entity IDs used across cards
  const weatherIds = useMemo(() => {
    const ids = Object.keys(cardSettings)
      .map((section) => {
        const settings = cardSettings[section];
        if (section.includes('::weather_temp_')) return settings.weatherId;
        if (settings.type === 'weather') return settings.weatherId;
        return null;
      })
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [cardSettings]);

  useEffect(() => {
    if (!conn) return undefined;
    if (weatherIds.length === 0) {
      setForecastsById({});
      return undefined;
    }

    let cancelled = false;

    const fetchForecasts = async () => {
      const newForecasts = {};

      await Promise.all(
        weatherIds.map(async (entityId) => {
          if (cancelled) return;
          try {
            let data = await getForecast(conn, { entityId, type: 'hourly' });
            if (!data || data.length === 0) {
              data = await getForecast(conn, { entityId, type: 'daily' });
            }
            if (!cancelled && data && data.length > 0) {
              newForecasts[entityId] = data;
            }
          } catch (_err) {
            // Silent failure
          }
        })
      );

      if (cancelled) return;
      setForecastsById((prev) => {
        // Drop stale entries for weather cards that were removed
        const next = weatherIds.reduce((acc, id) => {
          if (prev[id]) acc[id] = prev[id];
          return acc;
        }, {});
        if (Object.keys(newForecasts).length) {
          return { ...next, ...newForecasts };
        }
        return next;
      });
    };

    fetchForecasts();
    const interval = setInterval(fetchForecasts, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conn, weatherIds]);

  return [forecastsById, setForecastsById];
}
