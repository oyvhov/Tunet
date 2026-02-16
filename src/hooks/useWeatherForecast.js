import { useState, useEffect } from 'react';
import { getForecast } from '../services';

/**
 * Hook to map multiple weather entities to forecast data
 * Returns [forecastsById, setForecastsById]
 */
export default function useWeatherForecast(conn, cardSettings) {
  const [forecastsById, setForecastsById] = useState({});

  useEffect(() => {
    if (!conn) return;

    // Identify all weather entities used in cards
    const weatherIds = Object.keys(cardSettings)
      .map(section => {
        const settings = cardSettings[section];
        if (section.includes('::weather_temp_')) return settings.weatherId;
        // Also check generic cards if they are configured as weather
        if (settings.type === 'weather') return settings.weatherId;
        return null;
      })
      .filter(Boolean);
    
    const uniqueIds = Array.from(new Set(weatherIds));
    if (uniqueIds.length === 0) return;

    const fetchForecasts = async () => {
      const newForecasts = {};
      
      // Fetch concurrently
      await Promise.all(uniqueIds.map(async (entityId) => {
        try {
          // Try hourly first
          let data = await getForecast(conn, { entityId, type: 'hourly' });
          if (!data || data.length === 0) {
            // Fallback to daily
            data = await getForecast(conn, { entityId, type: 'daily' });
          }
          if (data && data.length > 0) {
            newForecasts[entityId] = data;
          }
        } catch (err) {
          // Silent failure
        }
      }));

      if (Object.keys(newForecasts).length > 0) {
        setForecastsById(prev => ({ ...prev, ...newForecasts }));
      }
    };

    fetchForecasts();

    // Refresh every 30 minutes
    const interval = setInterval(fetchForecasts, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [conn, JSON.stringify(cardSettings)]);

  return [forecastsById, setForecastsById];
}
