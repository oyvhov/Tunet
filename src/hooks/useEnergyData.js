import { useMemo } from 'react';

export default function useEnergyData(entity, now = new Date()) {
  // Safely extract attributes - do this BEFORE useMemo
  const attributes = entity?.attributes || {};
  const rawToday = Array.isArray(attributes.raw_today) ? attributes.raw_today : [];
  const rawTomorrow = Array.isArray(attributes.raw_tomorrow) ? attributes.raw_tomorrow : [];
  const tomorrowValid = attributes.tomorrow_valid === true;

  const fullPriceData = useMemo(() => {
    try {
      if (!Array.isArray(rawToday)) return [];
      if (tomorrowValid && Array.isArray(rawTomorrow) && rawTomorrow.length > 0) {
        return [...rawToday, ...rawTomorrow];
      }
      return rawToday;
    } catch (e) {
      console.error('Error in fullPriceData useMemo:', e);
      return [];
    }
  }, [rawToday, rawTomorrow, tomorrowValid]);

  const currentPriceIndex = useMemo(() => {
    try {
      if (!Array.isArray(rawToday) || rawToday.length === 0) return -1;
      if (!now || typeof now.getTime !== 'function') return -1;
      const nowTime = now.getTime();
      return rawToday.findIndex((d) => {
        if (!d || typeof d !== 'object') return false;
        const start = new Date(d.start).getTime();
        const end = new Date(d.end).getTime();
        return nowTime >= start && nowTime < end;
      });
    } catch (e) {
      console.error('Error in currentPriceIndex useMemo:', e);
      return -1;
    }
  }, [rawToday, now]);

  const priceStats = useMemo(() => {
    try {
      if (!Array.isArray(fullPriceData) || fullPriceData.length === 0) {
        return { min: 0, max: 0, avg: 0 };
      }
      const values = fullPriceData
        .map((d) => d?.value)
        .filter((v) => typeof v === 'number' && !Number.isNaN(v));
      
      if (values.length === 0) return { min: 0, max: 0, avg: 0 };
      
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: sum / values.length,
      };
    } catch (e) {
      console.error('Error in priceStats useMemo:', e);
      return { min: 0, max: 0, avg: 0 };
    }
  }, [fullPriceData]);

  const currentPrice = typeof entity?.state === 'string' ? parseFloat(entity.state) : 0;

  return { fullPriceData: Array.isArray(fullPriceData) ? fullPriceData : [], currentPriceIndex, priceStats, currentPrice };
}
