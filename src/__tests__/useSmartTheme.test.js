import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSmartTheme } from '../hooks/useSmartTheme';

const baseEntities = {
  'sun.sun': {
    entity_id: 'sun.sun',
    state: 'above_horizon',
    attributes: { elevation: 25 },
  },
  'weather.home': {
    entity_id: 'weather.home',
    state: 'sunny',
    attributes: {},
  },
};

const makeProps = (overrides = {}) => ({
  currentTheme: 'contextual',
  bgMode: 'theme',
  entities: baseEntities,
  now: new Date('2026-05-07T12:00:00Z'),
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--bg-gradient-from');
  document.documentElement.style.removeProperty('--bg-gradient-to');
  document.documentElement.style.removeProperty('--bg-primary');
});

describe('useSmartTheme', () => {
  it('does not rewrite CSS variables for unrelated entity updates', () => {
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');

    const { rerender } = renderHook((props) => useSmartTheme(props), {
      initialProps: makeProps(),
    });

    expect(setPropertySpy).toHaveBeenCalledTimes(3);

    rerender(
      makeProps({
        entities: {
          ...baseEntities,
          'sensor.cpu_usage': {
            entity_id: 'sensor.cpu_usage',
            state: '42',
            attributes: {},
          },
        },
      })
    );

    expect(setPropertySpy).toHaveBeenCalledTimes(3);
  });

  const gradientFrom = () => document.documentElement.style.getPropertyValue('--bg-gradient-from');

  it('puts the sky back when the background setup clears it', () => {
    const { rerender } = renderHook((props) => useSmartTheme(props), {
      initialProps: makeProps(),
    });
    const applied = gradientFrom();
    expect(applied).not.toBe('');

    // ConfigContext clears these variables on every theme or background change.
    document.documentElement.style.removeProperty('--bg-gradient-from');
    rerender(makeProps({ now: new Date('2026-05-07T12:01:00Z') }));

    expect(gradientFrom()).toBe(applied);
  });

  it('follows the clock instead of showing night when the sun entity is unavailable', () => {
    renderHook((props) => useSmartTheme(props), {
      initialProps: makeProps({
        entities: {
          'sun.sun': { entity_id: 'sun.sun', state: 'unavailable', attributes: {} },
        },
        now: new Date(2026, 4, 7, 12, 0),
      }),
    });

    expect(gradientFrom()).toBe('#38bdf8');
  });

  it.each(['lightning', 'lightning-rainy', 'snowy-rainy'])('darkens the sky for %s', (state) => {
    renderHook((props) => useSmartTheme(props), {
      initialProps: makeProps({
        entities: {
          ...baseEntities,
          'weather.home': { entity_id: 'weather.home', state, attributes: {} },
        },
      }),
    });

    expect(gradientFrom()).toBe('#334155');
  });
});
