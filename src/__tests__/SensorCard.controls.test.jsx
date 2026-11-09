import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: {} }),
}));

import SensorCard from '../components/cards/SensorCard';

const makeEntity = (state) => ({
  entity_id: 'input_number.mal',
  state,
  attributes: { min: 5, max: 30, step: 1, friendly_name: 'Mal' },
});

const card = (state, settings) => {
  const onControl = vi.fn();
  const utils = render(
    <SensorCard
      entity={makeEntity(state)}
      entities={{}}
      conn={{}}
      settings={settings}
      name="Mal"
      onControl={onControl}
      t={(key) => key}
    />
  );
  const buttons = Array.from(utils.container.querySelectorAll('button'));
  return { buttons, onControl };
};

describe('SensorCard number buttons', () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it.each([
    ['large', { size: 'large' }],
    ['small', { size: 'small' }],
  ])('stay live on a %s card with a value', (_name, settings) => {
    const { buttons, onControl } = card('10', settings);
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => expect(button).toBeEnabled());
    fireEvent.click(buttons[0]);
    expect(onControl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['large', 'unavailable', { size: 'large' }],
    ['large', 'unknown', { size: 'large' }],
    ['small', 'unavailable', { size: 'small' }],
  ])('are disabled on a %s card while %s', (_name, state, settings) => {
    const { buttons, onControl } = card(state, settings);
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expect(onControl).not.toHaveBeenCalled();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it('give each small button a 44 px hit area that does not reach the other', () => {
    const { buttons } = card('10', { size: 'small' });
    expect(buttons[0]).toHaveClass('relative', 'before:-inset-x-2.5', 'before:-top-6');
    expect(buttons[1]).toHaveClass('relative', 'before:-inset-x-2.5', 'before:-bottom-6');
  });

  it('give each large button a 44 px hit area', () => {
    const { buttons } = card('10', { size: 'large' });
    buttons.forEach((button) => expect(button).toHaveClass('relative', 'before:-inset-2'));
  });
});
