import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LightModal from '../modals/LightModal';
import { kelvinToRgb } from '../utils/lightColor';

const lightModal = (attributes: Record<string, unknown>) => {
  const entities = {
    'light.lamp': {
      entity_id: 'light.lamp',
      state: 'on',
      attributes: {
        friendly_name: 'Lamp',
        brightness: 200,
        supported_color_modes: ['color_temp', 'hs'],
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        ...attributes,
      } as Record<string, unknown>,
    },
  };
  const getA = (entityId: string, attribute: string, fallback: unknown = null) =>
    entities[entityId as 'light.lamp']?.attributes?.[attribute] ?? fallback;
  return (
    <LightModal
      show
      onClose={vi.fn()}
      lightId="light.lamp"
      entities={entities}
      callService={vi.fn()}
      getA={getA}
      optimisticLightBrightness={{}}
      setOptimisticLightBrightness={vi.fn()}
      customIcons={{}}
      t={(key: string) => key}
    />
  );
};

const renderLight = (attributes: Record<string, unknown>) => {
  const view = render(lightModal(attributes));
  const glow = () => view.container.querySelector('.blur-\\[100px\\]');
  return { ...view, glow };
};

const hueDot = () => screen.getByText('light.hue').nextElementSibling;

describe('LightModal colours follow the light', () => {
  it('glows in the colour reported by HA when opened', () => {
    const { glow } = renderLight({
      color_mode: 'hs',
      hs_color: [240, 100],
      rgb_color: [0, 0, 255],
    });
    expect(glow()).toHaveStyle({ backgroundColor: 'rgb(0, 0, 255)' });
  });

  it('tints the header icon with the light colour and keeps amber without one', () => {
    const { unmount } = renderLight({
      color_mode: 'hs',
      hs_color: [240, 100],
      rgb_color: [0, 0, 255],
    });
    const icon = screen.getByTestId('light-modal-icon');
    expect(icon.getAttribute('style')).toContain('rgb(0, 0, 255)');
    expect(icon).not.toHaveClass('text-amber-400');
    unmount();

    renderLight({ color_mode: 'brightness', rgb_color: null });
    const amberIcon = screen.getByTestId('light-modal-icon');
    expect(amberIcon.getAttribute('style')).toBeNull();
    expect(amberIcon).toHaveClass('text-amber-400');
  });

  it('places hues on the slider track where the colour really is', () => {
    renderLight({ color_mode: 'hs', hs_color: [240, 100], rgb_color: [0, 0, 255] });
    fireEvent.click(screen.getByRole('button', { name: 'light.color' }));
    const track = screen.getByRole('slider', { name: 'light.hue' })
      .nextElementSibling as HTMLElement;
    const stops = [...track.style.background.matchAll(/rgb\((\d+), (\d+), (\d+)\) ([\d.]+)%/g)];
    expect(stops.length).toBeGreaterThanOrEqual(6);
    for (const [, r, g, b, position] of stops) {
      const [red, green, blue] = [r, g, b].map(Number);
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const delta = max - min;
      let hue =
        max === red
          ? ((green - blue) / delta) % 6
          : max === green
            ? (blue - red) / delta + 2
            : (red - green) / delta + 4;
      hue = (hue * 60 + 360) % 360;
      if (Number(position) === 100 && hue === 0) hue = 360;
      expect(Number(position)).toBeCloseTo((hue / 360) * 100, 0);
    }
  });

  it('shows pastel colours with their saturation', () => {
    renderLight({ color_mode: 'hs', hs_color: [240, 40], rgb_color: [153, 153, 255] });
    fireEvent.click(screen.getByRole('button', { name: 'light.color' }));
    // HA hs_color is HSV with full value: hsv(240, 40%, 100%) = hsl(240, 100%, 80%).
    expect(hueDot()).toHaveStyle({ backgroundColor: 'hsl(240, 100%, 80%)' });
  });

  it('keeps glow and header on the reported colour when another tab opens', () => {
    const { glow } = renderLight({
      color_mode: 'hs',
      hs_color: [240, 100],
      rgb_color: [0, 0, 255],
      color_temp_kelvin: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'light.warmth' }));
    expect(glow()).toHaveStyle({ backgroundColor: 'rgb(0, 0, 255)' });
    expect(screen.getByTestId('light-modal-icon').getAttribute('style')).toContain(
      'rgb(0, 0, 255)'
    );
  });

  it('applies saturation updates that arrive while the warmth slider is held', () => {
    const attributes = {
      color_mode: 'color_temp',
      color_temp_kelvin: 4000,
      rgb_color: [255, 206, 166],
    };
    const { rerender } = renderLight({ ...attributes, hs_color: [27, 20] });
    fireEvent.click(screen.getByRole('button', { name: 'light.warmth' }));
    const warmth = screen.getByRole('slider', { name: 'light.colorTemperature' });
    fireEvent.pointerDown(warmth);
    rerender(lightModal({ ...attributes, hs_color: [27, 60] }));
    fireEvent.pointerUp(warmth);
    fireEvent.click(screen.getByRole('button', { name: 'light.color' }));
    expect(hueDot()).toHaveStyle({ backgroundColor: 'hsl(27, 100%, 70%)' });
  });
});

describe('kelvinToRgb', () => {
  it('goes from warm orange to cool blue-white', () => {
    expect(kelvinToRgb(2000)).toBe('rgb(255, 137, 14)');
    expect(kelvinToRgb(6600)).toBe('rgb(255, 255, 255)');
    expect(kelvinToRgb(10000)).toBe('rgb(202, 218, 255)');
  });
});
