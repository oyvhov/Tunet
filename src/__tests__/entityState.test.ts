import { describe, expect, it } from 'vitest';
import { getUnavailableLabel, isUnavailableState } from '../utils/entityState';

const t = (key: string) => key;

describe('entity state helpers', () => {
  it.each(['unavailable', 'unknown'])('treats %s as not usable', (state) => {
    expect(isUnavailableState(state)).toBe(true);
  });

  it.each(['on', 'off', 'heat', undefined])('treats %s as usable', (state) => {
    expect(isUnavailableState(state)).toBe(false);
  });

  it('names the two states differently', () => {
    expect(getUnavailableLabel('unavailable', t)).toBe('status.unavailable');
    expect(getUnavailableLabel('unknown', t)).toBe('common.unknown');
  });
});
