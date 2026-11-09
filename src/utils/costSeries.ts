type CostPoint = { value: number; time: Date };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** A cost meter that falls below half its value has restarted; a smaller drop is a correction. */
const RESET_RATIO = 0.5;

function spentBetween(previous: number, current: number): number {
  if (current >= previous) return current - previous;
  return current < previous * RESET_RATIO ? current : 0;
}

/**
 * What was spent in each hour (or each day, for long ranges). Readings are compared one by
 * one before they are grouped, because a daily meter restarts inside a 24-hour group.
 */
export function buildCostIncrementBuckets(
  points: CostPoint[],
  rangeHours: number,
  now: number = Date.now()
): CostPoint[] {
  const bucketMs = rangeHours > 48 ? DAY_MS : HOUR_MS;
  const startMs = now - rangeHours * HOUR_MS;
  const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
  const buckets = new Map<number, number>();

  sorted.slice(1).forEach((point, index) => {
    const time = point.time.getTime();
    if (time < startMs) return;
    const bucketStart = Math.floor((time - startMs) / bucketMs) * bucketMs + startMs;
    const spent = spentBetween(sorted[index].value, point.value);
    buckets.set(bucketStart, (buckets.get(bucketStart) ?? 0) + spent);
  });

  return Array.from(buckets, ([bucketStart, value]) => ({ time: new Date(bucketStart), value })).sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  );
}
