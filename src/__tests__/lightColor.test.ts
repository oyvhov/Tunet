import { describe, expect, it } from 'vitest';
import { getLightColor } from '../utils/lightColor';

describe('light card colour', () => {
  it.each(['rgb', 'hs', 'xy', 'rgbw', 'rgbww', 'color_temp', undefined])(
    'uses the RGB supplied by HA for %s mode',
    (mode) => {
      expect(
        getLightColor({ state: 'on', attributes: { color_mode: mode, rgb_color: [255, 160, 80] } })
      ).toBe('rgb(255, 160, 80)');
    }
  );

  it.each(['off', 'unavailable', 'unknown', undefined])(
    'ignores stale colour while %s',
    (state) => {
      expect(getLightColor({ state, attributes: { rgb_color: [255, 0, 0] } })).toBeNull();
    }
  );

  it.each(['brightness', 'onoff', 'unknown'])('ignores stale colour in %s mode', (mode) => {
    expect(
      getLightColor({ state: 'on', attributes: { color_mode: mode, rgb_color: [255, 0, 0] } })
    ).toBeNull();
  });

  it('uses white when the light switches from colour to white mode', () => {
    expect(
      getLightColor({ state: 'on', attributes: { color_mode: 'white', rgb_color: [255, 0, 0] } })
    ).toBe('rgb(255, 255, 255)');
  });

  it.each([undefined, null, 'red', [255, 0], [256, 0, 0], [NaN, 0, 0], ['255', 0, 0]])(
    'falls back when RGB is missing or invalid: %j',
    (rgb) => {
      expect(getLightColor({ state: 'on', attributes: { rgb_color: rgb } })).toBeNull();
    }
  );
});
