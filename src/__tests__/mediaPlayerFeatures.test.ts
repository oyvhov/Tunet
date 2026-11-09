import { describe, expect, it } from 'vitest';
import { getMediaPlayerPowerAction } from '../utils/mediaPlayerFeatures';

const TURN_ON = 128;
const TURN_OFF = 256;
const player = (state: string, features: number) => ({
  state,
  attributes: { supported_features: features },
});

describe('getMediaPlayerPowerAction', () => {
  it('wakes a player in standby', () => {
    expect(getMediaPlayerPowerAction(player('standby', TURN_ON | TURN_OFF))).toBe('turn_on');
  });

  it('offers nothing in standby when the player cannot be turned on', () => {
    expect(getMediaPlayerPowerAction(player('standby', TURN_OFF))).toBeNull();
  });

  it('still treats off and awake states as before', () => {
    expect(getMediaPlayerPowerAction(player('off', TURN_ON | TURN_OFF))).toBe('turn_on');
    expect(getMediaPlayerPowerAction(player('idle', TURN_ON | TURN_OFF))).toBe('turn_off');
    expect(getMediaPlayerPowerAction(player('unavailable', TURN_ON | TURN_OFF))).toBeNull();
  });
});
