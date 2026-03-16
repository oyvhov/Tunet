/**
 * Utilities for processing raw Home Assistant sensor history data
 * before rendering in chart components.
 */

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
export function downsampleTimeSeries(points, maxPoints = 150) {
  if (!Array.isArray(points) || points.length === 0) return points;
  if (points.length <= maxPoints) return points;

  const minTime = points[0].time.getTime();
  const maxTime = points[points.length - 1].time.getTime();
  const timeRange = maxTime - minTime;

  if (timeRange === 0) {
    // All points at the same timestamp — stride-average by index for consistency
    const step = Math.ceil(points.length / maxPoints);
    const result = [];
    for (let i = 0; i < points.length; i += step) {
      const group = points.slice(i, i + step);
      const avg = group.reduce((sum, p) => sum + p.value, 0) / group.length;
      result.push({ value: avg, time: group[0].time });
    }
    return result;
  }

  const bucketSums = new Array(maxPoints).fill(0);
  const bucketCounts = new Array(maxPoints).fill(0);
  const bucketTimes = new Array(maxPoints).fill(null);

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
  const result = [];
  for (let i = 0; i < maxPoints; i++) {
    if (bucketCounts[i] > 0) {
      result.push({
        value: bucketSums[i] / bucketCounts[i],
        time: new Date(bucketTimes[i]),
      });
    }
  }

  return result;
}
