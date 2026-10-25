/**
 * The colour a light is currently showing, for tinting its card.
 * Colour modes use the entity's rgb_color; colour temperature mode is mapped
 * from Kelvin to an approximate RGB value. Lights without colour information
 * (on/off, brightness only) return null so callers keep their default tint.
 */
export type RgbTriple = [number, number, number];

const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

/** Tanner Helland's approximation of black-body colour, valid for 1000–40000 K. */
export function kelvinToRgb(kelvin: number): RgbTriple {
  const temp = Math.min(40000, Math.max(1000, kelvin)) / 100;
  const red = temp <= 66 ? 255 : 329.698727446 * (temp - 60) ** -0.1332047592;
  const green =
    temp <= 66
      ? 99.4708025861 * Math.log(temp) - 161.1195681661
      : 288.1221695283 * (temp - 60) ** -0.0755148492;
  const blue =
    temp >= 66 ? 255 : temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  return [clamp(red), clamp(green), clamp(blue)];
}

export function getLightDisplayRgb(
  attributes: Record<string, unknown> | null | undefined
): RgbTriple | null {
  if (!attributes) return null;
  const mode = typeof attributes.color_mode === 'string' ? attributes.color_mode : '';
  const rgb = attributes.rgb_color;
  if (
    COLOR_MODES.includes(mode) &&
    Array.isArray(rgb) &&
    rgb.length >= 3 &&
    rgb.slice(0, 3).every((part) => Number.isFinite(Number(part)))
  ) {
    return [clamp(Number(rgb[0])), clamp(Number(rgb[1])), clamp(Number(rgb[2]))];
  }
  const kelvin = Number(attributes.color_temp_kelvin);
  if (mode === 'color_temp' && Number.isFinite(kelvin) && kelvin > 0) return kelvinToRgb(kelvin);
  return null;
}

export const rgbCss = ([r, g, b]: RgbTriple, alpha = 1) =>
  alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
