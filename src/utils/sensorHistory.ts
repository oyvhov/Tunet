/**
 * Utilities for processing raw Home Assistant sensor history data
 * before rendering in chart components.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Selectable sensor-card graph ranges, in hours. */
export const SENSOR_GRAPH_RANGES = {
  '1h': 1,
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '48h': 48,
  '7d': 168,
  '30d': 720,
};

export type SensorGraphRange = keyof typeof SENSOR_GRAPH_RANGES;

export type TimeSeriesPoint = {
  value: number;
  time: Date;
  min?: number;
  max?: number;
  change?: number;
};

export type SensorGraphWindow = {
  start: Date;
  end: Date;
  buckets: number;
  boundaries: Date[];
  period: 'hour' | 'day';
};

export type AggregateTimeSeriesOptions = {
  start: Date;
  end: Date;
  buckets: number;
  boundaries?: Date[];
  stat?: string;
  stateClass?: string;
};

export const SENSOR_GRAPH_STATS = ['mean', 'min', 'max', 'change'];

const BUCKET_HOURS: Record<SensorGraphRange, number> = {
  '1h': 1 / 12,
  '6h': 0.25,
  '12h': 0.5,
  '24h': 1,
  '48h': 2,
  '7d': 24,
  '30d': 24,
};

export function resolveSensorGraphRange(range: unknown): SensorGraphRange {
  return Object.prototype.hasOwnProperty.call(SENSOR_GRAPH_RANGES, range as PropertyKey)
    ? (range as SensorGraphRange)
    : '24h';
}

/**
 * Time window and bar buckets for a graph range. Day-sized buckets run from
 * local midnight to local midnight (23 or 25 hours across a DST change) and
 * end at the next midnight, so each bar is one calendar day and the last one
 * is today.
 *
 * @param {string} range - Key of SENSOR_GRAPH_RANGES.
 * @param {Date} [now]
 * @returns {{ start: Date, end: Date, buckets: number, boundaries: Date[], period: 'hour' | 'day' }}
 */
export function getSensorGraphWindow(range: unknown, now: Date = new Date()): SensorGraphWindow {
  const key = resolveSensorGraphRange(range);
  const hours = SENSOR_GRAPH_RANGES[key];
  const bucketHours = BUCKET_HOURS[key];
  const buckets = Math.round(hours / bucketHours);
  const boundaries: Date[] = [];
  if (bucketHours >= 24) {
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    for (let day = buckets; day >= 0; day -= 1) {
      boundaries.push(
        new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() - day)
      );
    }
  } else {
    const bucketMs = bucketHours * HOUR_MS;
    const endMs = Math.ceil(now.getTime() / bucketMs) * bucketMs;
    for (let bucket = buckets; bucket >= 0; bucket -= 1) {
      boundaries.push(new Date(endMs - bucket * bucketMs));
    }
  }
  return {
    start: boundaries[0],
    end: boundaries[boundaries.length - 1],
    buckets,
    boundaries,
    period: hours > 168 ? 'day' : 'hour',
  };
}

/**
 * Aggregate time-ordered points into `buckets` slices of [start, end), or into
 * the slices given by `boundaries` (buckets + 1 ascending dates). Points may
 * carry native `min`/`max`/`change` (HA long-term statistics); raw history
 * points only have `value`, and the last value before a bucket is treated as
 * the state at its start unless a reading lands exactly on the start. Raw
 * change sums the step deltas; for `total_increasing` meters a drop is a
 * reset, so the reading after it counts as consumption from zero. Buckets
 * before the first known value are skipped; later empty buckets repeat the
 * last value (change 0).
 *
 * @param {{ value: number, time: Date, min?: number, max?: number, change?: number }[]} points
 * @param {{ start: Date, end: Date, buckets: number, boundaries?: Date[], stat?: string, stateClass?: string }} options
 * @returns {{ value: number, time: Date }[]}
 */
export function aggregateTimeSeries(
  points: TimeSeriesPoint[],
  { start, end, buckets, boundaries, stat = 'mean', stateClass }: AggregateTimeSeriesOptions
): { value: number; time: Date }[] {
  if (!Array.isArray(points) || points.length === 0 || !(buckets > 0)) return [];
  const startMs = start.getTime();
  const span = end.getTime() - startMs;
  if (!(span > 0)) return [];
  const edges =
    Array.isArray(boundaries) && boundaries.length === buckets + 1
      ? boundaries.map((date) => date.getTime())
      : Array.from({ length: buckets + 1 }, (_, index) => startMs + (index * span) / buckets);
  const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
  const isMeter = stateClass === 'total_increasing';

  let carry: number | null = null;
  let index = 0;
  while (index < sorted.length && sorted[index].time.getTime() < edges[0]) {
    carry = sorted[index].value;
    index += 1;
  }

  const result: { value: number; time: Date }[] = [];
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const bucketStart = edges[bucket];
    const bucketEnd = bucket === buckets - 1 ? Infinity : edges[bucket + 1];
    const inBucket: TimeSeriesPoint[] = [];
    while (index < sorted.length && sorted[index].time.getTime() < bucketEnd) {
      inBucket.push(sorted[index]);
      index += 1;
    }
    const time = new Date(bucketStart);

    if (inBucket.length === 0) {
      if (carry !== null) result.push({ time, value: stat === 'change' ? 0 : carry });
      continue;
    }

    const isStatistics = inBucket.every((point) => Number.isFinite(point.min));
    const carryCovers = carry !== null && inBucket[0].time.getTime() > bucketStart;
    const samples =
      carryCovers && !isStatistics
        ? [carry as number, ...inBucket.map((point) => point.value)]
        : inBucket.map((point) => point.value);
    let value: number;
    if (stat === 'change') {
      if (inBucket.every((point) => Number.isFinite(point.change))) {
        value = inBucket.reduce((sum, point) => sum + (point.change as number), 0);
      } else {
        value = 0;
        let previous = carry ?? inBucket[0].value;
        for (const point of inBucket) {
          const delta = point.value - previous;
          value += isMeter && delta < 0 ? point.value : delta;
          previous = point.value;
        }
      }
    } else if (stat === 'min') {
      value = isStatistics
        ? Math.min(...inBucket.map((point) => point.min as number))
        : Math.min(...samples);
    } else if (stat === 'max') {
      value = isStatistics
        ? Math.max(...inBucket.map((point) => point.max as number))
        : Math.max(...samples);
    } else {
      value = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    }
    carry = inBucket[inBucket.length - 1].value;
    result.push({ time, value });
  }
  return result;
}

/**
 * Downsample a time-ordered array of {value, time} points into at most
 * `maxPoints` buckets of equal time duration.  Each bucket's value is the
 * mean of all source points that fall inside it.  Only non-empty buckets are
 * emitted, so the returned array preserves the true temporal distribution of
 * the data (e.g. a solar sensor with 0 W at night and varying W during the
 * day will produce roughly the correct ratio of 0-value to non-zero buckets).
 *
 * This prevents high-frequency sensors (updating every few seconds) from
 * flooding the SparkLine with thousands of identical 0-value nighttime points
 * that cause the daytime activity to be squeezed into an invisible sliver.
 *
 * @param {{ value: number, time: Date }[]} points - Time-ordered source points.
 * @param {number} [maxPoints=150] - Maximum number of output buckets.
 * @returns {{ value: number, time: Date }[]}
 */
export function downsampleTimeSeries(
  points: TimeSeriesPoint[],
  maxPoints: number = 150
): TimeSeriesPoint[] {
  if (!Array.isArray(points) || points.length === 0) return points;
  if (points.length <= maxPoints) return points;

  const minTime = points[0].time.getTime();
  const maxTime = points[points.length - 1].time.getTime();
  const timeRange = maxTime - minTime;

  if (timeRange === 0) {
    // All points at the same timestamp — stride-average by index for consistency
    const step = Math.ceil(points.length / maxPoints);
    const result: TimeSeriesPoint[] = [];
    for (let i = 0; i < points.length; i += step) {
      const group = points.slice(i, i + step);
      const avg = group.reduce((sum, p) => sum + p.value, 0) / group.length;
      result.push({ value: avg, time: group[0].time });
    }
    return result;
  }

  const bucketSums = new Array<number>(maxPoints).fill(0);
  const bucketCounts = new Array<number>(maxPoints).fill(0);
  const bucketTimes = new Array<number | null>(maxPoints).fill(null);

  for (const point of points) {
    const t = point.time.getTime();
    const bucketIndex = Math.min(
      Math.floor(((t - minTime) / timeRange) * maxPoints),
      maxPoints - 1
    );
    bucketSums[bucketIndex] += point.value;
    bucketCounts[bucketIndex]++;
    if (bucketTimes[bucketIndex] === null) {
      bucketTimes[bucketIndex] = t;
    }
  }

  // Return non-empty buckets. The loop above guarantees at least one bucket
  // is non-empty because the input has at least one point (checked at top).
  const result: TimeSeriesPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    if (bucketCounts[i] > 0) {
      result.push({
        value: bucketSums[i] / bucketCounts[i],
        time: new Date(bucketTimes[i] as number),
      });
    }
  }

  return result;
}
