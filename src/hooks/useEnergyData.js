import { useMemo } from 'react';
import { NORDPOOL_ID, TIBBER_ID } from '../constants';

export default function useEnergyData(entities, now) {
  const rawToday = entities[NORDPOOL_ID]?.attributes?.raw_today || [];
  const rawTomorrow = entities[NORDPOOL_ID]?.attributes?.raw_tomorrow || [];
  const tomorrowValid = entities[NORDPOOL_ID]?.attributes?.tomorrow_valid || false;

  const fullPriceData = useMemo(() => {
    if (tomorrowValid && rawTomorrow.length > 0) return [...rawToday, ...rawTomorrow];
    return rawToday;
  }, [rawToday, rawTomorrow, tomorrowValid]);

  const currentPriceIndex = useMemo(() => {
    if (!rawToday.length) return -1;
    const nowTime = now.getTime();
    return rawToday.findIndex((d) => {
      const start = new Date(d.start).getTime();
      const end = new Date(d.end).getTime();
      return nowTime >= start && nowTime < end;
    });
  }, [rawToday, now]);

  const priceStats = useMemo(() => {
    if (!fullPriceData.length) return { min: 0, max: 0, avg: 0 };
    const values = fullPriceData.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
    };
  }, [fullPriceData]);

  const currentPrice = parseFloat(entities[TIBBER_ID]?.state || 0);

  return { fullPriceData, currentPriceIndex, priceStats, currentPrice };
}
