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
});
