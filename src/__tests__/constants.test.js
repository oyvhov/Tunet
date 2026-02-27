import { describe, it, expect } from 'vitest';
import {
  ENTITY_UPDATE_INTERVAL,
  ENTITY_UPDATE_THRESHOLD,
  MEDIA_TIMEOUT,
  MEDIA_TICK_INTERVAL,
  INITIAL_FETCH_DELAY,
  MOBILE_BREAKPOINT,
} from '../config/constants';

describe('constants', () => {
  it('exports numeric constants', () => {
    expect(typeof ENTITY_UPDATE_INTERVAL).toBe('number');
    expect(typeof ENTITY_UPDATE_THRESHOLD).toBe('number');
    expect(typeof MEDIA_TIMEOUT).toBe('number');
    expect(typeof MEDIA_TICK_INTERVAL).toBe('number');
    expect(typeof INITIAL_FETCH_DELAY).toBe('number');
    expect(typeof MOBILE_BREAKPOINT).toBe('number');
  });

  it('has reasonable values', () => {
    expect(ENTITY_UPDATE_INTERVAL).toBeGreaterThan(0);
    expect(MOBILE_BREAKPOINT).toBeGreaterThanOrEqual(480);
  });
});
