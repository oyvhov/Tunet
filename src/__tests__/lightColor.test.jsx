import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LightCard from '../components/cards/LightCard';
import { getLightDisplayRgb, kelvinToRgb, rgbCss } from '../utils/lightColor';

describe('light display colour', () => {
  it('uses rgb_color in colour modes', () => {
    expect(getLightDisplayRgb({ color_mode: 'hs', rgb_color: [255, 105, 180] })).toEqual([
      255, 105, 180,
    ]);
  });

  it('maps colour temperature to a warm or cool tone', () => {
    const warm = getLightDisplayRgb({ color_mode: 'color_temp', color_temp_kelvin: 2400 });
    const cool = getLightDisplayRgb({ color_mode: 'color_temp', color_temp_kelvin: 6500 });
    expect(warm[0]).toBe(255);
    expect(warm[2]).toBeLessThan(cool[2]);
    expect(kelvinToRgb(6600)).toEqual([255, 255, 255]);
  });

  it('has no colour for on/off and brightness-only lights', () => {
    expect(getLightDisplayRgb({ color_mode: 'onoff' })).toBeNull();
    expect(getLightDisplayRgb({ color_mode: 'brightness', rgb_color: [1, 2, 3] })).toBeNull();
    expect(getLightDisplayRgb(null)).toBeNull();
  });

  it('formats CSS colours', () => {
    expect(rgbCss([1, 2, 3])).toBe('rgb(1, 2, 3)');
    expect(rgbCss([1, 2, 3], 0.2)).toBe('rgba(1, 2, 3, 0.2)');
  });
});

describe('LightCard tint', () => {
  const render_ = (attributes, state = 'on') => {
    const entity = {
      entity_id: 'light.adult',
      state,
      attributes: {
        friendly_name: 'Adult',
        supported_color_modes: ['hs', 'color_temp'],
        brightness: 128,
        ...attributes,
      },
    };
    return render(
      <LightCard
        cardId="light.adult"
        entities={{ 'light.adult': entity }}
        editMode={false}
        cardSettings={{}}
        settingsKey="isiklar::light.adult"
        customNames={{}}
        customIcons={{}}
        getA={(id, key, fallback) => entity.attributes[key] ?? fallback}
        callService={vi.fn()}
        onOpen={vi.fn()}
        optimisticLightBrightness={{}}
        setOptimisticLightBrightness={vi.fn()}
        t={(key) => key}
      />
    );
  };

  it('shows the colour the light is set to', () => {
    render_({ color_mode: 'hs', rgb_color: [255, 105, 180] });
    const toggle = screen.getByRole('button', { name: 'Adult: common.off' });
    expect(toggle).toHaveStyle({ color: 'rgb(255, 105, 180)' });
    expect(toggle.className).not.toContain('amber');
  });

  it('keeps the default tint when the light reports no colour', () => {
    render_({ color_mode: 'brightness' });
    expect(screen.getByRole('button', { name: 'Adult: common.off' }).className).toContain('amber');
  });

  it('does not tint a light that is off', () => {
    render_({ color_mode: 'hs', rgb_color: [255, 105, 180] }, 'off');
    expect(screen.getByRole('button', { name: 'Adult: common.on' })).not.toHaveStyle({
      color: 'rgb(255, 105, 180)',
    });
  });
});
