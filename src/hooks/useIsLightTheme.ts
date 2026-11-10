import { useSyncExternalStore } from 'react';
import { themes } from '../config/themes';
import { isLightColor } from '../utils/colorUtils';

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};

/** The theme ConfigContext puts on <html data-theme>; light when its page colour is light. */
const readIsLightTheme = () => {
  const theme = themes[document.documentElement.dataset.theme as keyof typeof themes];
  return isLightColor(theme?.colors['--bg-primary']);
};

/** Whether the dashboard shows a light theme, for parts that cannot follow the theme tokens alone. */
export function useIsLightTheme() {
  return useSyncExternalStore(subscribe, readIsLightTheme, () => false);
}
