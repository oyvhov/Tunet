import { useMemo } from 'react';

export default function useEnergyData(entity, now = new Date()) {
  const attributes = entity?.attributes || {};

  const fullPriceData = useMemo(() => {
    const rawToday = Array.isArray(attributes.raw_today) ? attributes.raw_today : [];
    const rawTomorrow = Array.isArray(attributes.raw_tomorrow) ? attributes.raw_tomorrow : [];
    const tomorrowValid = attributes.tomorrow_valid === true;
    if (tomorrowValid && rawTomorrow.length > 0) {
      return [...rawToday, ...rawTomorrow];
    }
    return rawToday;
  }, [attributes.raw_today, attributes.raw_tomorrow, attributes.tomorrow_valid]);

  const currentPriceIndex = useMemo(() => {
    const rawToday = Array.isArray(attributes.raw_today) ? attributes.raw_today : [];
    if (rawToday.length === 0) return -1;
    const nowTime = now.getTime();
    return rawToday.findIndex((d) => {
      if (!d || typeof d !== 'object') return false;
      const start = new Date(d.start).getTime();
      const end = new Date(d.end).getTime();
      return nowTime >= start && nowTime < end;
    });
  }, [attributes.raw_today, now]);

  const priceStats = useMemo(() => {
    if (fullPriceData.length === 0) return { min: 0, max: 0, avg: 0 };

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
  }, [fullPriceData]);

  const currentPrice = typeof entity?.state === 'string' ? parseFloat(entity.state) : 0;

  return { fullPriceData, currentPriceIndex, priceStats, currentPrice };
}
