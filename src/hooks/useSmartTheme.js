import { useEffect } from 'react';

/**
 * Custom hook for smart contextual theming based on weather and time of day.
 * Applies CSS custom properties for background gradients when bgMode is 'theme'.
 *
 * @param {Object} params
 * @param {string} params.currentTheme - Current theme name
 * @param {string} params.bgMode - Background mode ('theme', 'color', etc.)
 * @param {Object} params.entities - Home Assistant entities
 * @param {Date} params.now - Current timestamp
 */
export function useSmartTheme({ currentTheme, bgMode, entities, now }) {
  useEffect(() => {
    if (currentTheme !== 'contextual') return;
    if (bgMode !== 'theme') return;

    const weatherEntity = Object.values(entities).find((e) => e.entity_id.startsWith('weather.'));
    const weatherState = weatherEntity?.state;
    const sunEntity = entities['sun.sun'];
    const hour = now.getHours();

    let bgGradientFrom, bgGradientTo, bgPrimary;

    if (sunEntity) {
      const isUp = sunEntity.state === 'above_horizon';
      const elevation = Number(sunEntity.attributes?.elevation || 0);

      if (!isUp) {
        bgGradientFrom = '#0f172a';
        bgGradientTo = '#020617';
        bgPrimary = '#020617';
      } else {
        if (elevation < 10) {
          if (hour < 12) {
            bgGradientFrom = '#3b82f6';
            bgGradientTo = '#fdba74';
            bgPrimary = '#1e293b';
          } else {
            bgGradientFrom = '#6366f1';
            bgGradientTo = '#f472b6';
            bgPrimary = '#312e81';
          }
        } else {
          bgGradientFrom = '#38bdf8';
          bgGradientTo = '#3b82f6';
          bgPrimary = '#0f172a';
        }
      }
    } else {
      if (hour >= 6 && hour < 10) {
        bgGradientFrom = '#3b82f6';
        bgGradientTo = '#fdba74';
        bgPrimary = '#1e293b';
      } else if (hour >= 10 && hour < 17) {
        bgGradientFrom = '#38bdf8';
        bgGradientTo = '#3b82f6';
        bgPrimary = '#0f172a';
      } else if (hour >= 17 && hour < 21) {
        bgGradientFrom = '#6366f1';
        bgGradientTo = '#f472b6';
        bgPrimary = '#312e81';
      } else {
        bgGradientFrom = '#0f172a';
        bgGradientTo = '#020617';
        bgPrimary = '#020617';
      }
    }

    if (
      weatherState === 'rainy' ||
      weatherState === 'pouring' ||
      weatherState === 'snowy' ||
      weatherState === 'hail'
    ) {
      bgGradientFrom = '#334155';
      bgGradientTo = '#1e293b';
    } else if (
      weatherState === 'cloudy' ||
      weatherState === 'partlycloudy' ||
      weatherState === 'fog'
    ) {
      bgGradientFrom = '#475569';
      bgGradientTo = '#64748b';
    }

    const root = document.documentElement;
    root.style.setProperty('--bg-gradient-from', bgGradientFrom);
    root.style.setProperty('--bg-gradient-to', bgGradientTo);
    root.style.setProperty('--bg-primary', bgPrimary);
  }, [currentTheme, now, entities, bgMode]);
}
