import { describe, expect, it } from 'vitest';
import { canResizeCard, getNextCardSize, moveCardInPage } from '../utils/cardEditActions';

describe('moveCardInPage', () => {
  const config = { home: ['a', 'b', 'c'], other: ['x'] };

  it('swaps the card with its neighbour', () => {
    expect(moveCardInPage(config, 'home', 'b', 'left')?.home).toEqual(['b', 'a', 'c']);
    expect(moveCardInPage(config, 'home', 'b', 'right')?.home).toEqual(['a', 'c', 'b']);
  });

  it('leaves the edges and unknown cards alone', () => {
    expect(moveCardInPage(config, 'home', 'a', 'left')).toBeNull();
    expect(moveCardInPage(config, 'home', 'c', 'right')).toBeNull();
    expect(moveCardInPage(config, 'home', 'nope', 'left')).toBeNull();
  });

  it('does not change the original config', () => {
    moveCardInPage(config, 'home', 'b', 'left');
    expect(config.home).toEqual(['a', 'b', 'c']);
  });
});

describe('card sizes', () => {
  it('knows which cards can change size', () => {
    expect(canResizeCard('light.kitchen')).toBe(true);
    expect(canResizeCard('spacer_card_1')).toBe(false);
    expect(canResizeCard('entity_card_1', { type: 'sensor' })).toBe(true);
  });

  it('cycles calendar and todo cards through three sizes', () => {
    expect(getNextCardSize('calendar_card_1', 'small')).toBe('medium');
    expect(getNextCardSize('calendar_card_1', 'medium')).toBe('large');
    expect(getNextCardSize('calendar_card_1', 'large')).toBe('small');
    expect(getNextCardSize('light.kitchen', 'large')).toBe('small');
    expect(getNextCardSize('light.kitchen', 'small')).toBe('large');
  });
});
