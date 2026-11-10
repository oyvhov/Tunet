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
      supported_color_modes: ['brightness'],
    },
  },
};

const renderModal = (callService = vi.fn(), lightId = 'light.kitchen') => {
  const getA = (entityId, attribute, fallback = null) =>
    entities[entityId]?.attributes?.[attribute] ?? fallback;

  render(
    <LightModal
      show
      onClose={vi.fn()}
      lightId={lightId}
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

describe('LightModal width', () => {
  it('sets a group’s lights in their own box beside the controls', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toHaveClass('modal-panel--l');
    const roomSwitch = screen.getByRole('switch', { name: 'Counter common.toggle' });
    const roomBox = roomSwitch.closest('.popup-surface');
    expect(roomBox).not.toBeNull();
    expect(roomBox).not.toContainElement(screen.getByRole('button', { name: 'light.toggle' }));
    expect(roomBox.parentElement).toHaveClass('lg:grid-cols-2');
  });

  it('keeps a single light narrow, with the slider under the power button', () => {
    renderModal(vi.fn(), 'light.counter');

    expect(screen.getByRole('dialog')).toHaveClass('modal-panel--m');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'light.brightness' })).toBeInTheDocument();
  });
});
