import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCommit } from './useDebouncedCommit';
import { isUnavailableState } from '../utils/entityState';

const COMMIT_DELAY_MS = 350;
const PENDING_TIMEOUT_MS = 10_000;
// A device that rounds or ignores the value leaves HA as it was, so do not wait the full timeout.
const UNCONFIRMED_TIMEOUT_MS = 2_000;
const DEFAULT_STEP = 0.5;

interface ClimateTargetEntity {
  state?: string | null;
  attributes?: Record<string, unknown> | null;
}

const finiteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * The target temperature while the user is changing it. Quick taps add up to one
 * call, and the shown value follows the user until Home Assistant catches up.
 */
export function useClimateTarget(
  entity: ClimateTargetEntity | null | undefined,
  onSetTemperature: (temperature: number) => unknown
) {
  const attributes = entity?.attributes;
  const reported = finiteNumber(attributes?.temperature);
  const min = finiteNumber(attributes?.min_temp) ?? -Infinity;
  const max = finiteNumber(attributes?.max_temp) ?? Infinity;
  const stepAttribute = finiteNumber(attributes?.target_temp_step);
  const step = stepAttribute && stepAttribute > 0 ? stepAttribute : DEFAULT_STEP;
  const isUnavailable = !entity || isUnavailableState(entity.state);
  const canAdjust = !isUnavailable && reported !== null;
  const low = finiteNumber(attributes?.target_temp_low);
  const high = finiteNumber(attributes?.target_temp_high);
  // heat_cool thermostats have two targets and no single one, so this is shown read-only.
  const targetRange =
    !isUnavailable && reported === null && low !== null && high !== null ? { low, high } : null;

  const [pending, setPending] = useState<number | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    setPending(null);
    setSent(null);
  }, []);

  const commit = useDebouncedCommit<number>((temperature) => {
    if (isUnavailable) {
      clearPending();
      return;
    }
    Promise.resolve(onSetTemperature(temperature)).then(
      () => setSent(temperature),
      () => {
        if (pendingRef.current === temperature) clearPending();
      }
    );
  }, COMMIT_DELAY_MS);

  useEffect(() => {
    if (pending === null) return undefined;
    if (pending === reported) {
      clearPending();
      return undefined;
    }
    const timeout = pending === sent ? UNCONFIRMED_TIMEOUT_MS : PENDING_TIMEOUT_MS;
    const timer = setTimeout(clearPending, timeout);
    return () => clearTimeout(timer);
  }, [pending, reported, sent, clearPending]);

  const setTarget = (temperature: number) => {
    if (!canAdjust) return;
    const next = Number(Math.min(max, Math.max(min, temperature)).toFixed(3));
    if (next === (pendingRef.current ?? reported)) return;
    pendingRef.current = next;
    setPending(next);
    setSent(null);
    commit(next);
  };

  const nudge = (direction: 1 | -1) => {
    if (reported === null) return;
    setTarget((pendingRef.current ?? reported) + direction * step);
  };

  return {
    target: isUnavailable ? null : (pending ?? reported),
    targetRange,
    step,
    canAdjust,
    nudge,
    setTarget,
  };
}
