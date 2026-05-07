import { useEffect, useState } from 'react';

const hasBrowserMotionApis = () =>
  typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined';

const getMotionAllowed = () => {
  if (!hasBrowserMotionApis()) return false;

  const { window, document } = globalThis;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const slowUpdate = window.matchMedia?.('(update: slow)')?.matches;

  return !document.hidden && !prefersReducedMotion && !slowUpdate;
};

const addMediaListener = (query, listener) => {
  if (!query) return () => {};
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  if (typeof query.addListener === 'function') {
    query.addListener(listener);
    return () => query.removeListener(listener);
  }
  return () => {};
};

export function useLowPowerMotion() {
  const [motionAllowed, setMotionAllowed] = useState(getMotionAllowed);

  useEffect(() => {
    if (!hasBrowserMotionApis()) return undefined;

    const { window, document } = globalThis;
    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const slowUpdateQuery = window.matchMedia?.('(update: slow)');
    const updateMotionAllowed = () => setMotionAllowed(getMotionAllowed());

    const removeReducedMotionListener = addMediaListener(reducedMotionQuery, updateMotionAllowed);
    const removeSlowUpdateListener = addMediaListener(slowUpdateQuery, updateMotionAllowed);

    document.addEventListener('visibilitychange', updateMotionAllowed);
    updateMotionAllowed();

    return () => {
      removeReducedMotionListener();
      removeSlowUpdateListener();
      document.removeEventListener('visibilitychange', updateMotionAllowed);
    };
  }, []);

  return motionAllowed;
}
