import { describe, it, expect } from 'vitest';
import {
  toDateSafe,
  mapRawHistoryToPoints,
  mapRawHistoryToEvents,
  mapStatisticsToPoints,
  makeFallbackPoints,
} from '../utils/historyUtils';

// ═══════════════════════════════════════════════════════════════
// toDateSafe
// ═══════════════════════════════════════════════════════════════
describe('toDateSafe', () => {
  it('returns null for falsy values', () => {
    expect(toDateSafe(null)).toBeNull();
    expect(toDateSafe(undefined)).toBeNull();
    expect(toDateSafe(0)).toBeNull();
    expect(toDateSafe('')).toBeNull();
  });

  it('passes through a valid Date instance', () => {
    const d = new Date('2026-03-30T12:00:00Z');
    expect(toDateSafe(d)).toBe(d);
  });

  it('returns null for an invalid Date instance', () => {
    expect(toDateSafe(new Date('invalid'))).toBeNull();
  });

  it('parses ISO 8601 strings', () => {
    const result = toDateSafe('2026-03-30T12:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-03-30T12:00:00.000Z');
  });

  it('parses Unix seconds (< 1e12) as seconds', () => {
    const result = toDateSafe(1774816140);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(1774816140 * 1000);
  });

  it('parses Unix milliseconds (>= 1e12) as ms', () => {
    const ms = 1774816140000;
    const result = toDateSafe(ms);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ms);
  });

  it('parses numeric string as timestamp', () => {
    const result = toDateSafe('1774816140');
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(1774816140 * 1000);
  });

  it('returns null for non-date strings that are not numeric', () => {
    expect(toDateSafe('not-a-date')).toBeNull();
  });

  it('returns null for objects/booleans', () => {
    expect(toDateSafe({})).toBeNull();
    expect(toDateSafe(true)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// mapRawHistoryToPoints
// ═══════════════════════════════════════════════════════════════
describe('mapRawHistoryToPoints', () => {
  it('returns empty array for non-array input', () => {
    expect(mapRawHistoryToPoints(null)).toEqual([]);
    expect(mapRawHistoryToPoints(undefined)).toEqual([]);
    expect(mapRawHistoryToPoints('nope')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(mapRawHistoryToPoints([])).toEqual([]);
  });

  it('maps numeric states with last_changed timestamps', () => {
    const raw = [
      { state: '22.5', last_changed: '2026-03-30T10:00:00Z' },
      { state: '23.1', last_changed: '2026-03-30T11:00:00Z' },
    ];
    const result = mapRawHistoryToPoints(raw);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(22.5);
    expect(result[1].value).toBe(23.1);
    expect(result[0].time).toBeInstanceOf(Date);
  });

  it('filters out non-numeric states', () => {
    const raw = [
      { state: 'on', last_changed: '2026-03-30T10:00:00Z' },
      { state: '22.5', last_changed: '2026-03-30T11:00:00Z' },
      { state: 'unavailable', last_changed: '2026-03-30T12:00:00Z' },
    ];
    const result = mapRawHistoryToPoints(raw);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(22.5);
  });

  it('uses timestamp field fallback order: last_changed > last_updated > lu > lc', () => {
    const raw = [{ state: '1.0', lu: 1774816140 }];
    const result = mapRawHistoryToPoints(raw);
    expect(result).toHaveLength(1);
    expect(result[0].time.getTime()).toBe(1774816140 * 1000);
  });

  it('skips entries with null-ish data', () => {
    const raw = [null, undefined, { state: '5', last_changed: '2026-03-30T10:00:00Z' }];
    const result = mapRawHistoryToPoints(raw);
    expect(result).toHaveLength(1);
  });

  it('filters out entries with unparseable timestamps', () => {
    const raw = [{ state: '10' }]; // no timestamp field at all
    const result = mapRawHistoryToPoints(raw);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// mapRawHistoryToEvents
// ═══════════════════════════════════════════════════════════════
describe('mapRawHistoryToEvents', () => {
  it('returns empty array for non-array input', () => {
    expect(mapRawHistoryToEvents(null)).toEqual([]);
    expect(mapRawHistoryToEvents(undefined)).toEqual([]);
  });

  it('maps state-change events with correct fields', () => {
    const raw = [
      { state: 'on', last_changed: '2026-03-30T10:00:00Z' },
      { state: 'off', last_changed: '2026-03-30T11:00:00Z' },
    ];
    const result = mapRawHistoryToEvents(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      state: 'on',
      time: expect.any(Date),
      lastChanged: '2026-03-30T10:00:00Z',
    });
  });

  it('reads state from d.s when d.state is undefined', () => {
    const raw = [{ s: 'on', l: '2026-03-30T10:00:00Z' }];
    const result = mapRawHistoryToEvents(raw);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('on');
  });

  it('uses timestamp fallback: last_changed > last_updated > l > lc > lu', () => {
    const raw = [{ state: 'on', l: '2026-03-30T09:00:00Z' }];
    const result = mapRawHistoryToEvents(raw);
    expect(result).toHaveLength(1);
    expect(result[0].lastChanged).toBe('2026-03-30T09:00:00Z');
  });

  it('filters out entries with undefined state and no timestamp', () => {
    const raw = [null, {}, { state: undefined }];
    const result = mapRawHistoryToEvents(raw);
    expect(result).toHaveLength(0);
  });

  it('preserves numeric zero as a valid state', () => {
    const raw = [{ state: 0, last_changed: '2026-03-30T10:00:00Z' }];
    const result = mapRawHistoryToEvents(raw);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// mapStatisticsToPoints
// ═══════════════════════════════════════════════════════════════
describe('mapStatisticsToPoints', () => {
  it('returns empty array for non-array input', () => {
    expect(mapStatisticsToPoints(null)).toEqual([]);
    expect(mapStatisticsToPoints(undefined)).toEqual([]);
  });

  it('prefers mean over state over sum', () => {
    const stats = [
      { mean: 22.5, state: 20, sum: 100, start: '2026-03-30T10:00:00Z' },
    ];
    const result = mapStatisticsToPoints(stats);
    expect(result[0].value).toBe(22.5);
  });

  it('falls back to state when mean is not a number', () => {
    const stats = [{ mean: null, state: 20, start: '2026-03-30T10:00:00Z' }];
    const result = mapStatisticsToPoints(stats);
    expect(result[0].value).toBe(20);
  });

  it('falls back to sum when mean and state are not numbers', () => {
    const stats = [{ mean: null, state: null, sum: 150, start: '2026-03-30T10:00:00Z' }];
    const result = mapStatisticsToPoints(stats);
    expect(result[0].value).toBe(150);
  });

  it('uses end as fallback when start is missing', () => {
    const stats = [{ mean: 10, end: '2026-03-30T11:00:00Z' }];
    const result = mapStatisticsToPoints(stats);
    expect(result).toHaveLength(1);
    expect(result[0].time.toISOString()).toBe('2026-03-30T11:00:00.000Z');
  });

  it('filters entries with NaN values', () => {
    const stats = [
      { mean: 22.5, start: '2026-03-30T10:00:00Z' },
      { mean: null, state: null, sum: undefined, start: '2026-03-30T11:00:00Z' },
    ];
    const result = mapStatisticsToPoints(stats);
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// makeFallbackPoints
// ═══════════════════════════════════════════════════════════════
describe('makeFallbackPoints', () => {
  it('returns two points with the same value', () => {
    const result = makeFallbackPoints('22.5', 24);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(22.5);
    expect(result[1].value).toBe(22.5);
  });

  it('spans the correct time range', () => {
    const before = Date.now();
    const result = makeFallbackPoints('10', 6);
    const after = Date.now();
    const span = result[1].time.getTime() - result[0].time.getTime();
    expect(span).toBe(6 * 60 * 60 * 1000);
    expect(result[1].time.getTime()).toBeGreaterThanOrEqual(before);
    expect(result[1].time.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns empty array for non-numeric state', () => {
    expect(makeFallbackPoints('on', 24)).toEqual([]);
    expect(makeFallbackPoints('unavailable', 24)).toEqual([]);
    expect(makeFallbackPoints(null, 24)).toEqual([]);
    expect(makeFallbackPoints(undefined, 24)).toEqual([]);
  });

  it('handles numeric string correctly', () => {
    const result = makeFallbackPoints('0', 1);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(0);
  });

  it('handles negative values', () => {
    const result = makeFallbackPoints('-5.5', 12);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(-5.5);
  });
});
