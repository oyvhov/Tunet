import { describe, it, expect } from 'vitest';
import { downsampleTimeSeries } from '../utils/sensorHistory';

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
    const firstGroupAvg = Array.from({ length: step }, (_, i) => i).reduce((s, v) => s + v, 0) / step;
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
