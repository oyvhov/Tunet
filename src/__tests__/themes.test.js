import { describe, it, expect } from 'vitest';
import { initialCardMaterial, replaceRetiredTheme, themes } from '../config/themes';

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (first, second) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('themes', () => {
  it('exports a non-empty themes object', () => {
    expect(themes).toBeDefined();
    expect(Object.keys(themes).length).toBeGreaterThan(0);
  });

  it('each theme has required CSS variables', () => {
    const requiredVars = ['--bg-primary', '--glass-bg', '--text-primary', '--accent-color'];
    for (const [name, theme] of Object.entries(themes)) {
      for (const v of requiredVars) {
        expect(theme.colors, `${name} missing ${v}`).toHaveProperty(v);
      }
    }
  });

  it('offers Aluminium in place of Flat', () => {
    expect(Object.keys(themes)).toEqual([
      'contextual',
      'dark',
      'light',
      'graphite',
      'amethyst',
      'aluminium',
    ]);
  });

  it('gives Aluminium every token the other themes have', () => {
    expect(Object.keys(themes.aluminium.colors).sort()).toEqual(
      Object.keys(themes.dark.colors).sort()
    );
  });

  it.each(['--bg-primary', '--bg-secondary', '--modal-bg'])(
    'keeps Aluminium text readable on %s',
    (surface) => {
      const colors = themes.aluminium.colors;

      expect(contrast(colors['--text-primary'], colors[surface])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors['--text-secondary'], colors[surface])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors['--accent-color'], colors[surface])).toBeGreaterThanOrEqual(3);
    }
  );
});

describe('retired themes', () => {
  it('sends Flat to Dark', () => {
    expect(replaceRetiredTheme('flat')).toBe('dark');
  });

  it('leaves every current theme alone', () => {
    for (const key of Object.keys(themes)) {
      expect(replaceRetiredTheme(key)).toBe(key);
    }
  });

  it('keeps the flat look for someone who used the Flat theme', () => {
    expect(initialCardMaterial('flat', 'glass')).toBe('flat');
  });

  it('keeps the saved card material for everyone else', () => {
    expect(initialCardMaterial('dark', 'neumorphic')).toBe('neumorphic');
  });

  it('falls back to glass with nothing saved', () => {
    expect(initialCardMaterial(null, null)).toBe('glass');
  });
});
