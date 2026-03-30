/**
 * Shared history-data utilities used across modals.
 * Pure functions — no React, no side-effects.
 */

/**
 * Safely parse a value into a Date, handling various HA timestamp formats
 * (ISO strings, Unix seconds, Unix milliseconds).
 * @param {unknown} value
 * @returns {Date | null}
 */
export const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const num = Number(value);
    if (Number.isFinite(num)) {
      const ms = num < 1e12 ? num * 1000 : num;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
};

/**
 * Map raw HA history entries to numeric {value, time} points.
 * Filters out non-numeric states and entries with unparseable timestamps.
 * @param {Array} raw
 * @returns {Array<{value: number, time: Date}>}
 */
export const mapRawHistoryToPoints = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .filter((d) => d && !isNaN(parseFloat(d.state)))
    .map((d) => ({
      value: parseFloat(d.state),
      time: toDateSafe(
        d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lu || d.lc
      ),
    }))
    .filter((d) => d.time);

/**
 * Map raw HA history entries to state-change events (for BinaryTimeline).
 * @param {Array} raw
 * @returns {Array<{state: string, time: Date, lastChanged: string}>}
 */
export const mapRawHistoryToEvents = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((d) => {
      if (!d) return null;
      const stateValue = d.state ?? d.s;
      const changed =
        d.last_changed ||
        d.last_updated ||
        d.last_reported ||
        d.timestamp ||
        d.l ||
        d.lc ||
        d.lu;
      const time = toDateSafe(changed);
      if (stateValue === undefined || !time) return null;
      return { state: stateValue, time, lastChanged: changed };
    })
    .filter(Boolean);

/**
 * Map HA recorder statistics to numeric {value, time} points.
 * Prefers `mean`, falls back to `state`, then `sum`.
 * @param {Array} stats
 * @returns {Array<{value: number, time: Date}>}
 */
export const mapStatisticsToPoints = (stats) =>
  (Array.isArray(stats) ? stats : [])
    .map((d) => ({
      value:
        typeof d.mean === 'number' ? d.mean : typeof d.state === 'number' ? d.state : d.sum,
      time: new Date(d.start || d.end),
    }))
    .filter((d) => !isNaN(parseFloat(d.value)));

/**
 * Generate two-point synthetic series from a single current state value.
 * Used when history/statistics return sparse data.
 * @param {string|number} currentState
 * @param {number} hours
 * @returns {Array<{value: number, time: Date}>}
 */
export const makeFallbackPoints = (currentState, hours) => {
  const val = parseFloat(currentState);
  if (isNaN(val)) return [];
  const now = new Date();
  return [
    { value: val, time: new Date(now.getTime() - hours * 60 * 60 * 1000) },
    { value: val, time: now },
  ];
};
