export const HUE_GRADIENT = `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360]
  .map((hue) => `hsl(${hue}, 100%, 50%) ${((hue / 360) * 100).toFixed(2)}%`)
  .join(', ')})`;

// HA hs_color is HSV with full value; hsv(h, s, 100%) equals hsl(h, 100%, 100 - s/2).
export function hsToCss(hue: number, saturation: number): string {
  return `hsl(${hue}, 100%, ${100 - saturation / 2}%)`;
}

export function kelvinToRgb(kelvin: number): string {
  const t = kelvin / 100;
  const red = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const clamp = (value: number) => Math.round(Math.min(255, Math.max(0, value)));
  return `rgb(${clamp(red)}, ${clamp(green)}, ${clamp(blue)})`;
}

export function getLightColor(entity?: {
  state?: string;
  attributes?: Record<string, unknown>;
}): string | null {
  if (entity?.state !== 'on') return null;
  const mode = entity.attributes?.color_mode;
  if (mode === 'white') return 'rgb(255, 255, 255)';
  if (mode === 'onoff' || mode === 'brightness' || mode === 'unknown') return null;

  // HA converts supported colour modes (including white temperature) to RGB.
  const rgb = entity.attributes?.rgb_color;
  if (
    !Array.isArray(rgb) ||
    rgb.length !== 3 ||
    !rgb.every(
      (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 255
    )
  )
    return null;
  return `rgb(${rgb.map(Math.round).join(', ')})`;
}
