import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardEffects } from '../hooks/useDashboardEffects';
import {
  CLOCK_TICK_INTERVAL,
  ENTITY_UPDATE_INTERVAL,
  MEDIA_TICK_INTERVAL,
} from '../config/constants';

// ── Fake timers ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
});
afterEach(() => {
  vi.useRealTimers();
});

const makeProps = (overrides = {}) => ({
  resolvedHeaderTitle: 'Tunet Dashboard',
  inactivityTimeout: 0,
  resetToHome: vi.fn(),
  activeMediaModal: null,
  entities: {},
  checkRemindersDue: undefined,
  checkEntityTriggers: undefined,
  ...overrides,
});

// ═════════════════════════════════════════════════════════════════════════
// Clock tick — `now` updates on interval
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › clock tick', () => {
  it('returns an initial `now` Date', () => {
    const { result } = renderHook(() => useDashboardEffects(makeProps()));
    expect(result.current.now).toBeInstanceOf(Date);
  });

  it('updates `now` on each CLOCK_TICK_INTERVAL tick', () => {
    const { result } = renderHook(() => useDashboardEffects(makeProps()));
    const first = result.current.now.getTime();

    act(() => vi.advanceTimersByTime(CLOCK_TICK_INTERVAL));
    expect(result.current.now.getTime()).toBeGreaterThanOrEqual(first);
  });

  it('runs due reminder checks every CLOCK_TICK_INTERVAL and immediately', () => {
    const checkRemindersDue = vi.fn();
    renderHook(() => useDashboardEffects(makeProps({ checkRemindersDue })));

    expect(checkRemindersDue).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(CLOCK_TICK_INTERVAL * 2));
    expect(checkRemindersDue).toHaveBeenCalledTimes(3);
  });

  it('runs entity/calendar trigger checks on ENTITY_UPDATE_INTERVAL and immediately', () => {
    const checkEntityTriggers = vi.fn();
    renderHook(() => useDashboardEffects(makeProps({ checkEntityTriggers })));

    expect(checkEntityTriggers).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(ENTITY_UPDATE_INTERVAL));
    expect(checkEntityTriggers).toHaveBeenCalledTimes(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Media tick — only ticks when modal is open
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › media tick', () => {
  it('mediaTick stays 0 when no media modal is open', () => {
    const { result } = renderHook(() => useDashboardEffects(makeProps()));
    expect(result.current.mediaTick).toBe(0);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.mediaTick).toBe(0);
  });

  it('mediaTick updates when activeMediaModal is set', () => {
    const { result } = renderHook(() =>
      useDashboardEffects(makeProps({ activeMediaModal: 'sonos.living' })),
    );
    const first = result.current.mediaTick;
    expect(first).toBeGreaterThan(0); // initialised to Date.now()

    act(() => vi.advanceTimersByTime(MEDIA_TICK_INTERVAL));
    expect(result.current.mediaTick).toBeGreaterThanOrEqual(first);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Document title
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › document title', () => {
  it('sets document.title to resolvedHeaderTitle', () => {
    renderHook(() => useDashboardEffects(makeProps({ resolvedHeaderTitle: 'My Home' })));
    expect(document.title).toBe('My Home');
  });

  it('updates when resolvedHeaderTitle changes', () => {
    const { rerender } = renderHook((p) => useDashboardEffects(p), {
      initialProps: makeProps({ resolvedHeaderTitle: 'A' }),
    });
    expect(document.title).toBe('A');

    rerender(makeProps({ resolvedHeaderTitle: 'B' }));
    expect(document.title).toBe('B');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Optimistic light brightness
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › optimistic light brightness', () => {
  it('provides setter for optimisticLightBrightness', () => {
    const { result } = renderHook(() => useDashboardEffects(makeProps()));
    act(() => result.current.setOptimisticLightBrightness({ 'light.room': 128 }));
    expect(result.current.optimisticLightBrightness).toEqual({ 'light.room': 128 });
  });

  it('clears optimistic brightness after INITIAL_FETCH_DELAY when entities change', () => {
    const props = makeProps({ entities: { 'light.a': { state: 'on' } } });
    const { result } = renderHook(() => useDashboardEffects(props));
    act(() => result.current.setOptimisticLightBrightness({ 'light.a': 200 }));
    expect(result.current.optimisticLightBrightness).toEqual({ 'light.a': 200 });

    act(() => vi.advanceTimersByTime(600)); // > INITIAL_FETCH_DELAY (500ms)
    expect(result.current.optimisticLightBrightness).toEqual({});
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Inactivity timer
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › inactivity timer', () => {
  it('calls resetToHome after inactivityTimeout seconds', () => {
    const resetToHome = vi.fn();
    renderHook(() =>
      useDashboardEffects(makeProps({ inactivityTimeout: 5, resetToHome })),
    );

    act(() => vi.advanceTimersByTime(5000));
    expect(resetToHome).toHaveBeenCalledTimes(1);
  });

  it('does not call resetToHome when inactivityTimeout is 0', () => {
    const resetToHome = vi.fn();
    renderHook(() =>
      useDashboardEffects(makeProps({ inactivityTimeout: 0, resetToHome })),
    );

    act(() => vi.advanceTimersByTime(60_000));
    expect(resetToHome).not.toHaveBeenCalled();
  });

  it('resets the timer on user interaction', () => {
    const resetToHome = vi.fn();
    renderHook(() =>
      useDashboardEffects(makeProps({ inactivityTimeout: 10, resetToHome })),
    );

    // advance 8s, simulate mouse move, advance 8s more — should NOT fire at 10s
    act(() => vi.advanceTimersByTime(8000));
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });
    act(() => vi.advanceTimersByTime(8000));
    expect(resetToHome).not.toHaveBeenCalled();

    // but after full 10s from last interaction it fires
    act(() => vi.advanceTimersByTime(2000));
    expect(resetToHome).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Cleanup
// ═════════════════════════════════════════════════════════════════════════
describe('useDashboardEffects › cleanup', () => {
  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useDashboardEffects(makeProps({ inactivityTimeout: 60 })),
    );
    unmount();
    // Checks for at least the idle-timer events
    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('mousedown');
    expect(removedEvents).toContain('touchstart');
    removeSpy.mockRestore();
  });
});
