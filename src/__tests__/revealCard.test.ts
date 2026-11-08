import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealCard } from '../utils/revealCard';

describe('revealCard', () => {
  let card: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    card = document.createElement('div');
    card.setAttribute('data-card-id', 'fan.x__dup_1');
    card.style.animation = 'none';
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);
  });

  afterEach(() => {
    card.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('scrolls the card into view and pulses it briefly', () => {
    revealCard('fan.x__dup_1');

    expect(card.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    expect(card.style.animation).toContain('pulse-soft');

    vi.advanceTimersByTime(3000);
    expect(card.style.animation).toBe('none');
  });

  it('does not fail when the card is not on screen', () => {
    expect(() => revealCard('missing')).not.toThrow();
  });
});
