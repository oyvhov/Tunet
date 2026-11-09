const TEXT_ENTRY_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

/**
 * True on any device with a touchscreen. Tablets with a stylus count too: Chromium on
 * Android reports the pen as a fine pointer, so `any-pointer: fine` rules nothing out.
 */
export function hasTouchScreen(): boolean {
  if (typeof window === 'undefined') return false;
  if (navigator.maxTouchPoints > 0) return true;
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches
  );
}

/** True when moving focus to this element would pop up the on-screen keyboard. */
export function opensTouchKeyboard(element: Element): boolean {
  return hasTouchScreen() && element.matches(TEXT_ENTRY_SELECTOR);
}
