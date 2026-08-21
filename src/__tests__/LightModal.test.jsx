import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LightModal from '../modals/LightModal';

const entities = {
  'light.kitchen': {
    entity_id: 'light.kitchen',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen',
      brightness: 180,
      supported_color_modes: ['brightness'],
      entity_id: ['light.counter'],
    },
  },
  'light.counter': {
    entity_id: 'light.counter',
    state: 'on',
    attributes: {
      friendly_name: 'Counter',
      brightness: 140,
    },
  },
};

const renderModal = (callService = vi.fn()) => {
  const getA = (entityId, attribute, fallback = null) =>
    entities[entityId]?.attributes?.[attribute] ?? fallback;

  render(
    <LightModal
      show
      onClose={vi.fn()}
      lightId="light.kitchen"
      entities={entities}
      callService={callService}
      getA={getA}
      optimisticLightBrightness={{}}
      setOptimisticLightBrightness={vi.fn()}
      customIcons={{}}
      t={(key) => key}
    />
  );
  return callService;
};

describe('LightModal power controls', () => {
  it('keeps the main light toggle and exposes room lights as clear switches', () => {
    const callService = renderModal();

    const mainToggle = screen.getByRole('button', { name: 'light.toggle' });
    expect(mainToggle.querySelector('svg')).toHaveClass('lucide-power');
    fireEvent.click(mainToggle);
    const roomSwitch = screen.getByRole('switch', { name: 'Counter common.toggle' });
    expect(roomSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(roomSwitch);

    expect(callService).toHaveBeenNthCalledWith(1, 'light', 'toggle', {
      entity_id: 'light.kitchen',
    });
    expect(callService).toHaveBeenNthCalledWith(2, 'light', 'toggle', {
      entity_id: 'light.counter',
    });
  });
});
