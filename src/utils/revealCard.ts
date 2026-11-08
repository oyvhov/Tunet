const HIGHLIGHT_ANIMATION = 'pulse-soft 0.8s ease-in-out 2';
const HIGHLIGHT_MS = 1600;

/** Scrolls a dashboard card into view and pulses it, once it has rendered. */
export function revealCard(cardId: string): void {
  requestAnimationFrame(() => {
    const card = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
    if (!card) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    if (reduceMotion) return;
    const previous = card.style.animation;
    card.style.animation = HIGHLIGHT_ANIMATION;
    setTimeout(() => {
      card.style.animation = previous;
    }, HIGHLIGHT_MS);
  });
}
