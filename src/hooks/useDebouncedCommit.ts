import { useCallback, useEffect, useRef } from 'react';

/**
 * Sends only the last value after a pause, so dragging a slider or tapping quickly
 * does not flood Home Assistant. A value still waiting when the component goes away
 * is sent at once, so closing a popup straight after a change does not lose it.
 */
export function useDebouncedCommit<T>(commit: (value: T) => unknown, delayMs = 300) {
  const commitRef = useRef(commit);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingRef = useRef<{ value: T } | null>(null);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const waiting = waitingRef.current;
    waitingRef.current = null;
    if (waiting) commitRef.current(waiting.value);
  }, []);

  useEffect(() => flush, [flush]);

  return useCallback(
    (value: T) => {
      waitingRef.current = { value };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush]
  );
}
