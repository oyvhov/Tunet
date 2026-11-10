/** Shared geometry for the small history lines on sensor cards (SparkLine and SensorTrend). */
export type SparkPoint = [number, number];

/** Smooth Bezier curve through the points; control points stay inside `bounds` vertically. */
export const createBezierPath = (
  points: SparkPoint[],
  smoothing = 0.3,
  bounds?: { minY: number; maxY: number }
) => {
  const line = (p1: SparkPoint, p2: SparkPoint) => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
  };
  const controlPoint = (
    current: SparkPoint,
    previous: SparkPoint | undefined,
    next: SparkPoint | undefined,
    reverse: boolean
  ): SparkPoint => {
    const p = previous || current;
    const n = next || current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    const y = current[1] + Math.sin(angle) * length;
    return [
      current[0] + Math.cos(angle) * length,
      bounds ? Math.max(bounds.minY, Math.min(bounds.maxY, y)) : y,
    ];
  };
  return points.reduce((acc: string, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
};

/** Moving average that evens out jitter in long series. */
export function smoothSparkValues(rawValues: number[]): number[] {
  const windowSize = Math.max(1, Math.round(rawValues.length / 30));
  return rawValues.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(rawValues.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    for (let j = start; j < end; j++) sum += rawValues[j];
    return sum / (end - start);
  });
}

/**
 * Rounded value range for a spark line. Keeps a minimum spread so small fluctuations
 * don't look extreme; `keepZero` keeps 0 inside the range (for change bars).
 */
export function getSparkRange(values: number[], keepZero = false): { min: number; max: number } {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (keepZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rawRange = max - min;
  const minRange = Math.max(2, (Math.abs(max + min) / 2) * 0.1);
  if (rawRange < minRange && !keepZero) {
    const mid = (max + min) / 2;
    min = mid - minRange / 2;
    max = mid + minRange / 2;
  }
  // Snap to nice round numbers for a calmer visual
  const snapStep = rawRange <= 2 ? 0.5 : rawRange <= 5 ? 1 : rawRange <= 20 ? 2 : 5;
  return {
    min: Math.floor(min / snapStep) * snapStep,
    max: Math.ceil(max / snapStep) * snapStep,
  };
}
