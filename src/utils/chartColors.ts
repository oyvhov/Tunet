export const CHART_STATUS_COLORS = {
  low: 'var(--status-info-fg)',
  mid: 'var(--status-warning-fg)',
  high: 'var(--status-error-fg)',
};

export const WEATHER_BAND_COLORS = {
  cold: 'var(--status-info-fg)',
  cool: 'var(--accent-color)',
  mild: 'var(--status-success-fg)',
  warm: 'var(--status-warning-fg)',
  hot: 'var(--status-error-fg)',
};

export function getThresholdColor(normalizedValue: number): string {
  if (normalizedValue > 0.6) return CHART_STATUS_COLORS.high;
  if (normalizedValue > 0.3) return CHART_STATUS_COLORS.mid;
  return CHART_STATUS_COLORS.low;
}
