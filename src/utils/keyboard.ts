import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Keyboard activation for card-like elements.
 *
 * Cards are rendered as `div`s for layout reasons, so they need the button
 * semantics back: focusable, announced as buttons and activatable with
 * Enter/Space. The handler only fires when the card itself is focused, so
 * nested controls keep working.
 */
export function createCardKeyHandler(
  onActivate?: ((event: ReactKeyboardEvent<Element>) => void) | null
) {
  return (event: ReactKeyboardEvent<Element>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate?.(event);
  };
}
