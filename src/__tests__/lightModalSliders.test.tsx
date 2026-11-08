import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LightModal from '../modals/LightModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children }: { open: boolean; children: () => unknown }) =>
    open ? <div>{children() as never}</div> : null,
}));

const renderLight = (attributes: Record<string, unknown>, children = {}) => {
  const entities: Record<string, { state: string; attributes: Record<string, unknown> }> = {
    'light.lamp': {
      state: 'on',
      attributes: {
        friendly_name: 'Lamp',
        brightness: 200,
        supported_color_modes: ['color_temp', 'hs'],
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        color_temp_kelvin: 3000,
        ...attributes,
      },
    },
    ...children,
  };
  const callService = vi.fn();
  const setOptimisticLightBrightness = vi.fn();
  const view = render(
    <LightModal
      show
      onClose={vi.fn()}
      lightId="light.lamp"
      entities={entities}
      callService={callService}
      getA={(id: string, attr: string, fallback: unknown = null) =>
        entities[id]?.attributes?.[attr] ?? fallback
      }
      optimisticLightBrightness={{}}
      setOptimisticLightBrightness={setOptimisticLightBrightness}
      customIcons={{}}
      t={(key: string) => key}
    />
  );
  return { ...view, callService, setOptimisticLightBrightness };
};

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const drag = async (slider: HTMLElement, values: string[]) => {
  for (const value of values) {
    fireEvent.change(slider, { target: { value } });
    await tick(20);
  }
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LightModal sliders', () => {
  it('shows warmth at once and sends the last value after a pause', async () => {
    const { container, callService } = renderLight({});
    fireEvent.click(screen.getByRole('radio', { name: 'light.warmth' }));
    await drag(screen.getByRole('slider', { name: 'light.colorTemperature' }), [
      '3500',
      '4000',
      '4500',
    ]);
    expect(container).toHaveTextContent('4500K');
    expect(callService).not.toHaveBeenCalled();
    await tick(350);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.lamp',
      color_temp_kelvin: 4500,
    });
  });

  it('keeps the current saturation and sends hue after a pause', async () => {
    const { callService } = renderLight({ hs_color: [240, 40] });
    fireEvent.click(screen.getByRole('radio', { name: 'light.color' }));
    const hue = screen.getByRole('slider', { name: 'light.hue' });
    await drag(hue, ['100', '120']);
    expect(hue).toHaveValue('120');
    expect(screen.getByText('light.hue').nextElementSibling).toHaveStyle({
      backgroundColor: 'hsl(120, 100%, 80%)',
    });
    expect(callService).not.toHaveBeenCalled();
    await tick(350);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.lamp',
      hs_color: [120, 40],
    });
  });

  it.each([
    ['no colour reported', null],
    ['a white light', [240, 0]],
  ])('sends full saturation with %s', async (_name, hsColor) => {
    const { callService } = renderLight({ hs_color: hsColor });
    fireEvent.click(screen.getByRole('radio', { name: 'light.color' }));
    await drag(screen.getByRole('slider', { name: 'light.hue' }), ['120']);
    await tick(350);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.lamp',
      hs_color: [120, 100],
    });
  });

  it.each(['rgbw', 'rgbww'])('offers colour for %s lights', (mode) => {
    renderLight({ supported_color_modes: [mode] });
    expect(screen.getByRole('radio', { name: 'light.color' })).toBeInTheDocument();
  });

  it('debounces each light in a group on its own', async () => {
    const child = (name: string) => ({
      state: 'on',
      attributes: { friendly_name: name, brightness: 100 },
    });
    const { callService, setOptimisticLightBrightness } = renderLight(
      { entity_id: ['light.a', 'light.b'] },
      { 'light.a': child('A'), 'light.b': child('B') }
    );
    await drag(screen.getByRole('slider', { name: 'A light.brightness' }), ['120', '140']);
    await drag(screen.getByRole('slider', { name: 'B light.brightness' }), ['160']);
    expect(setOptimisticLightBrightness).toHaveBeenCalledTimes(3);
    expect(callService).not.toHaveBeenCalled();
    await tick(350);
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 140,
    });
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.b',
      brightness: 160,
    });
  });
});
