import { describe, it, expect } from 'vitest';
import {
  aggregateTimeSeries,
  downsampleTimeSeries,
  getSensorGraphWindow,
} from '../utils/sensorHistory';

// Helper: build a synthetic time-series of `count` points starting at `startMs`
// with `intervalMs` between each point, using `valuesFn` to compute values.
function makeSeries(count, startMs, intervalMs, valuesFn) {
  return Array.from({ length: count }, (_, i) => ({
    value: valuesFn(i),
    time: new Date(startMs + i * intervalMs),
  }));
}

describe('downsampleTimeSeries', () => {
  it('returns the same array when count <= maxPoints', () => {
    const pts = makeSeries(100, 0, 1000, (i) => i);
    const result = downsampleTimeSeries(pts, 150);
    expect(result).toBe(pts); // exact same reference
  });

  it('returns empty array for empty input', () => {
    expect(downsampleTimeSeries([], 150)).toEqual([]);
  });

  it('handles non-array gracefully', () => {
    expect(downsampleTimeSeries(null, 150)).toBeNull();
    expect(downsampleTimeSeries(undefined, 150)).toBeUndefined();
  });

  it('reduces length to at most maxPoints', () => {
    const pts = makeSeries(10000, 0, 1000, (i) => i % 100);
    const result = downsampleTimeSeries(pts, 150);
    expect(result.length).toBeLessThanOrEqual(150);
  });

  it('preserves temporal ordering of output points', () => {
    const pts = makeSeries(1000, 0, 1000, (i) => i);
    const result = downsampleTimeSeries(pts, 100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].time.getTime()).toBeGreaterThanOrEqual(result[i - 1].time.getTime());
    }
  });

  it('correctly averages values within each bucket', () => {
    // 200 points with value = 0 for the first 100, value = 100 for the last 100
    const pts = makeSeries(200, 0, 1000, (i) => (i < 100 ? 0 : 100));
    const result = downsampleTimeSeries(pts, 2);
    // With 2 equal-time buckets each covering half the range:
    // bucket 0 average = 0, bucket 1 average = 100
    expect(result).toHaveLength(2);
    expect(result[0].value).toBeCloseTo(0);
    expect(result[1].value).toBeCloseTo(100);
  });

  it('preserves time-proportional distribution for solar-like data', () => {
    // Simulate a solar sensor: 16 h at 0 W (night) then 8 h at ~500 W (day)
    // Updates every 5 seconds → 16*720 = 11520 night + 8*720 = 5760 day = 17280 total
    const NIGHT_COUNT = 11520;
    const DAY_COUNT = 5760;
    const INTERVAL_MS = 5000;
    const nightPts = makeSeries(NIGHT_COUNT, 0, INTERVAL_MS, () => 0);
    const dayPts = makeSeries(DAY_COUNT, NIGHT_COUNT * INTERVAL_MS, INTERVAL_MS, () => 500);
    const pts = [...nightPts, ...dayPts];

    const result = downsampleTimeSeries(pts, 150);

    expect(result.length).toBeLessThanOrEqual(150);

    // Night proportion should be ~2/3 of the data
    const nightBuckets = result.filter((p) => p.value === 0).length;
    const dayBuckets = result.filter((p) => p.value > 0).length;

    // Night and day buckets should each be non-zero (both periods visible)
    expect(nightBuckets).toBeGreaterThan(0);
    expect(dayBuckets).toBeGreaterThan(0);

    // The daytime portion (33% of 24 h) should occupy ~33% of buckets (±10%)
    const dayRatio = dayBuckets / result.length;
    expect(dayRatio).toBeGreaterThan(0.25);
    expect(dayRatio).toBeLessThan(0.45);
  });

  it('handles all points at the same timestamp (stride averaging)', () => {
    const now = Date.now();
    const pts = Array.from({ length: 500 }, (_, i) => ({
      value: i,
      time: new Date(now),
    }));
    const result = downsampleTimeSeries(pts, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.length).toBeGreaterThan(0);
    // Each bucket should be the average of its stride group (not just one sample)
    const step = Math.ceil(500 / 50); // 10
    const firstGroupAvg =
      Array.from({ length: step }, (_, i) => i).reduce((s, v) => s + v, 0) / step;
    expect(result[0].value).toBeCloseTo(firstGroupAvg);
  });

  it('handles compressed HA format (s/lc) via caller pre-processing', () => {
    // Compressed format items use `s` (state) and `lc` (Unix seconds).
    // The caller in SensorCard converts these to {value, time} before calling
    // downsampleTimeSeries, so this test verifies the output shape is preserved.
    const base = Date.now();
    const pts = Array.from({ length: 300 }, (_, i) => ({
      value: i < 200 ? 0 : i * 10,
      time: new Date(base + i * 60000),
    }));
    const result = downsampleTimeSeries(pts, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    result.forEach((p) => {
      expect(typeof p.value).toBe('number');
      expect(p.time instanceof Date).toBe(true);
    });
  });
});

describe('getSensorGraphWindow', () => {
  it('aligns hourly buckets to the next full hour', () => {
    const now = new Date(2026, 9, 24, 13, 20);
    const window = getSensorGraphWindow('24h', now);
    expect(window.buckets).toBe(24);
    expect(window.end).toEqual(new Date(2026, 9, 24, 14, 0));
    expect(window.start).toEqual(new Date(2026, 9, 23, 14, 0));
    expect(window.period).toBe('hour');
  });

  it('ends day buckets at local midnight and falls back to 24h for unknown ranges', () => {
    const now = new Date(2026, 9, 24, 13, 20);
    const week = getSensorGraphWindow('7d', now);
    expect(week.buckets).toBe(7);
    expect(week.end).toEqual(new Date(2026, 9, 25, 0, 0));
    expect(getSensorGraphWindow('30d', now).period).toBe('day');
    expect(getSensorGraphWindow('bogus', now).buckets).toBe(24);
  });

  it('keeps every day boundary on local midnight across a DST change', () => {
    const window = getSensorGraphWindow('7d', new Date(2026, 9, 26, 12, 0));
    expect(window.boundaries).toHaveLength(8);
    for (const boundary of window.boundaries) {
      expect([boundary.getHours(), boundary.getMinutes()]).toEqual([0, 0]);
    }
    expect(window.start).toEqual(new Date(2026, 9, 20));
    expect(window.end).toEqual(new Date(2026, 9, 27));
  });
});

describe('aggregateTimeSeries', () => {
  const start = new Date(0);
  const end = new Date(4 * 3600 * 1000);
  const at = (hours) => new Date(hours * 3600 * 1000);

  it('averages raw history, carrying the previous state into each bucket', () => {
    const points = [
      { value: 10, time: at(0) },
      { value: 20, time: at(0.5) },
      { value: 40, time: at(2.5) },
    ];
    const result = aggregateTimeSeries(points, { start, end, buckets: 4 });
    expect(result.map((p) => p.value)).toEqual([15, 20, 30, 40]);
  });

  it('computes per-bucket change from meter readings', () => {
    const points = [
      { value: 100, time: at(-1) },
      { value: 102, time: at(0.5) },
      { value: 105, time: at(1.5) },
      { value: 106, time: at(3.2) },
    ];
    const result = aggregateTimeSeries(points, { start, end, buckets: 4, stat: 'change' });
    expect(result.map((p) => p.value)).toEqual([2, 3, 0, 1]);
  });

  it('uses native statistics min, max and change when present', () => {
    const points = [
      { value: 5, min: 1, max: 9, change: 0.5, time: at(0) },
      { value: 6, min: 2, max: 12, change: 1.5, time: at(1) },
    ];
    const opts = { start, end: at(2), buckets: 1 };
    expect(aggregateTimeSeries(points, { ...opts, stat: 'max' })[0].value).toBe(12);
    expect(aggregateTimeSeries(points, { ...opts, stat: 'min' })[0].value).toBe(1);
    expect(aggregateTimeSeries(points, { ...opts, stat: 'change' })[0].value).toBe(2);
  });

  it('ignores the carried state when a reading lands on the bucket start', () => {
    const points = [
      { value: 10, time: at(0) },
      { value: 20, time: at(1) },
    ];
    const opts = { start, end: at(2), buckets: 2 };
    expect(aggregateTimeSeries(points, { ...opts, stat: 'min' })[1].value).toBe(20);
    expect(aggregateTimeSeries(points, { ...opts, stat: 'mean' })[1].value).toBe(20);
  });

  it('treats a drop on a total_increasing meter as a reset', () => {
    const points = [
      { value: 100, time: at(-1) },
      { value: 102, time: at(0.2) },
      { value: 0, time: at(0.4) },
      { value: 3, time: at(0.6) },
    ];
    const opts = { start, end: at(1), buckets: 1, stat: 'change' };
    expect(aggregateTimeSeries(points, { ...opts, stateClass: 'total_increasing' })[0].value).toBe(
      5
    );
    expect(aggregateTimeSeries(points, opts)[0].value).toBe(-97);
  });

  it('uses explicit bucket boundaries when given', () => {
    const points = [
      { value: 1, time: at(0.5) },
      { value: 5, time: at(2.5) },
    ];
    const result = aggregateTimeSeries(points, {
      start,
      end: at(4),
      buckets: 2,
      boundaries: [start, at(3), at(4)],
      stat: 'max',
    });
    expect(result.map((p) => p.value)).toEqual([5, 5]);
    expect(result[1].time).toEqual(at(3));
  });

  it('skips buckets before the first known value', () => {
    const result = aggregateTimeSeries([{ value: 3, time: at(2.5) }], { start, end, buckets: 4 });
    expect(result).toHaveLength(2);
    expect(result[0].time).toEqual(at(2));
  });
});
