import { describe, expect, it } from 'vitest';
import { getCurrentPriceIndex } from '../services/nordpoolUtils';

describe('getCurrentPriceIndex', () => {
  it('keeps the offset for long price series', () => {
    expect(getCurrentPriceIndex(96, 16)).toBe(63);
  });

  it('starts at midnight for today and tomorrow only', () => {
    expect(getCurrentPriceIndex(48, 19)).toBe(19);
    expect(getCurrentPriceIndex(48, 0)).toBe(0);
    expect(getCurrentPriceIndex(24, 7)).toBe(7);
  });
});
