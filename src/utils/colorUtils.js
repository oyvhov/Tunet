/**
 * Small colour helpers used by the animated backgrounds and theme-aware surfaces.
 * They only need to understand the colour formats the themes actually use:
 * hex (#rgb / #rrggbb) and rgb()/rgba().
 */

/**
 * Parse a CSS colour into { r, g, b, a }. Returns null for unsupported values.
 */
export function parseColor(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();

  if (input.startsWith('#')) {
    let hex = input.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6 || !/^[0-9a-f]{6}$/i.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const match = input.match(/^rgba?\(([^)]+)\)$/i);
  if (match) {
    const parts = match[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map((p) => parseFloat(p));
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a: Number.isNaN(a) ? 1 : a };
  }

  return null;
}

/**
 * Relative luminance (0 = black, 1 = white) for a CSS colour.
 */
export function getLuminance(value) {
  const color = parseColor(value);
  if (!color) return 0;
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/**
 * True when the colour reads as a light surface (used to pick readable
 * foregrounds and safe canvas blend modes).
 */
export function isLightColor(value) {
  return getLuminance(value) > 0.45;
}
