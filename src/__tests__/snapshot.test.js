import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectSnapshot, applySnapshot } from '../services/snapshot';

describe('snapshot service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('collectSnapshot includes cardBorderRadius from storage', () => {
    localStorage.setItem('tunet_card_border_radius', '28');

    const snapshot = collectSnapshot();

    expect(snapshot.layout.cardBorderRadius).toBe(28);
  });

  it('applySnapshot persists and applies cardBorderRadius', () => {
    const setCardBorderRadius = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: { cardBorderRadius: 34 },
        appearance: {},
      },
      { setCardBorderRadius },
    );

    expect(localStorage.getItem('tunet_card_border_radius')).toBe('34');
    expect(setCardBorderRadius).toHaveBeenCalledWith(34);
  });
});
