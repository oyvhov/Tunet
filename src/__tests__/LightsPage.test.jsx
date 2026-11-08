import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LightsPage from '../components/pages/LightsPage';
import en from '../i18n/en.json';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(() => new Promise(() => {})),
}));

const t = (key) => en[key] ?? key;

const light = (entity_id, friendly_name, state, attributes = {}) => ({
  entity_id,
  state,
  attributes: { friendly_name, supported_color_modes: ['brightness'], ...attributes },
});

const makeEntities = () => ({
  'light.alpha': light('light.alpha', 'Alpha', 'on', { brightness: 100 }),
  'light.beta': light('light.beta', 'Beta', 'off'),
});

const page = (entities, callService) => (
  <LightsPage
    entities={entities}
    callService={callService}
    conn={{}}
    pageSettings={{}}
    pageId="lights"
    t={t}
  />
);

const order = () => screen.getAllByText(/^(Alpha|Beta)$/).map((node) => node.textContent);
const slider = (name) =>
  screen.getByText(name).closest('.group').querySelector('input[type="range"]');

const drag = (input, value) => {
  fireEvent.change(input, { target: { value: String(value) } });
  act(() => vi.advanceTimersByTime(20));
};

describe('LightsPage', () => {
  let callService;

  beforeEach(() => {
    vi.useFakeTimers();
    callService = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  describe('sort order', () => {
    it('keeps tiles in place after a toggle, then re-sorts', () => {
      const entities = makeEntities();
      const { rerender } = render(page(entities, callService));
      expect(order()).toEqual(['Alpha', 'Beta']);

      fireEvent.click(screen.getByRole('button', { name: `Beta: ${en['common.on']}` }));
      rerender(
        page(
          {
            ...entities,
            'light.beta': light('light.beta', 'Beta', 'on', { brightness: 255 }),
          },
          callService
        )
      );
      expect(order()).toEqual(['Alpha', 'Beta']);

      act(() => vi.advanceTimersByTime(10000));
      expect(order()).toEqual(['Beta', 'Alpha']);
    });

    it('keeps tiles in place while a slider is dragged', () => {
      const entities = {
        ...makeEntities(),
        'light.beta': light('light.beta', 'Beta', 'on', { brightness: 50 }),
      };
      const { rerender } = render(page(entities, callService));
      expect(order()).toEqual(['Alpha', 'Beta']);

      drag(slider('Beta'), 120);
      act(() => vi.advanceTimersByTime(250));
      rerender(
        page(
          {
            ...entities,
            'light.beta': light('light.beta', 'Beta', 'on', { brightness: 200 }),
          },
          callService
        )
      );

      expect(order()).toEqual(['Alpha', 'Beta']);
    });
  });

  describe('optimistic brightness', () => {
    it('follows Home Assistant again once the value lands', () => {
      const entities = makeEntities();
      const { rerender } = render(page(entities, callService));
      const input = slider('Alpha');

      drag(input, 200);
      expect(input.value).toBe('200');
      act(() => vi.advanceTimersByTime(250));
      expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
        entity_id: 'light.alpha',
        brightness: 200,
      });

      rerender(
        page(
          {
            ...entities,
            'light.alpha': light('light.alpha', 'Alpha', 'on', { brightness: 180 }),
          },
          callService
        )
      );

      expect(input.value).toBe('180');
    });

    it('lets go after a few seconds when Home Assistant reports nothing', () => {
      render(page(makeEntities(), callService));
      const input = slider('Alpha');

      drag(input, 200);
      expect(input.value).toBe('200');

      act(() => vi.advanceTimersByTime(10000));

      expect(input.value).toBe('100');
    });
  });

  describe('hidden entities', () => {
    const withExtras = () => ({
      ...makeEntities(),
      'light.hidden': light('light.hidden', 'Hidden', 'off', { hidden_by: 'user' }),
      'light.led': light('light.led', 'Status LED', 'off', { entity_category: 'config' }),
    });

    it('does not list hidden or config lights', () => {
      render(page(withExtras(), callService));

      expect(screen.queryByText('Hidden')).toBeNull();
      expect(screen.queryByText('Status LED')).toBeNull();
    });

    it('leaves them out of All on', () => {
      render(page(withExtras(), callService));

      fireEvent.click(screen.getByRole('button', { name: en['lights.allOn'] }));
      fireEvent.click(screen.getByRole('button', { name: en['common.confirm'] }));

      expect(callService).toHaveBeenCalledTimes(1);
      expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.beta' });
    });
  });
});
