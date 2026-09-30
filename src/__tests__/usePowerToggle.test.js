import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePowerToggle } from '../hooks/usePowerToggle';

const props = {
  entityId: 'climate.living_room',
  domain: 'climate',
  isOn: true,
};

afterEach(() => vi.useRealTimers());

describe('usePowerToggle', () => {
  it('clears pending feedback when the service rejects and allows retry', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('Disconnected'));
    const { result } = renderHook(() => usePowerToggle({ ...props, callService }));
    await act(async () => result.current.togglePower());
    expect(result.current.isPending).toBe(false);
    await act(async () => result.current.togglePower());
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('unlocks after ten seconds if HA does not confirm the new state', () => {
    vi.useFakeTimers();
    const callService = vi.fn();
    const { result } = renderHook(() => usePowerToggle({ ...props, callService }));
    act(() => result.current.togglePower());
    expect(result.current.isPending).toBe(true);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.isPending).toBe(false);
    act(() => result.current.togglePower());
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('does not let an old rejection clear a newer request', async () => {
    let rejectOld;
    const callService = vi.fn().mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectOld = reject;
      })
    );
    const { result, rerender } = renderHook(
      (isOn) => usePowerToggle({ ...props, isOn, callService }),
      { initialProps: true }
    );
    act(() => result.current.togglePower());
    rerender(false);
    act(() => result.current.togglePower());
    await act(async () => rejectOld(new Error('Late error')));
    expect(result.current.isPending).toBe(true);
  });
  it('uses a caller supplied service call when one is available', () => {
    const callService = vi.fn();
    const buildCall = vi.fn(() => ({
      domain: 'climate',
      service: 'set_hvac_mode',
      data: { entity_id: 'climate.living_room', hvac_mode: 'off' },
    }));
    const { result } = renderHook(() => usePowerToggle({ ...props, callService, buildCall }));
    act(() => result.current.togglePower());
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.living_room',
      hvac_mode: 'off',
    });
  });

  it('falls back to the plain turn on/off service when the builder has nothing to offer', () => {
    const callService = vi.fn();
    const { result } = renderHook(() =>
      usePowerToggle({ ...props, callService, buildCall: () => null })
    );
    act(() => result.current.togglePower());
    expect(callService).toHaveBeenCalledWith('climate', 'turn_off', {
      entity_id: 'climate.living_room',
    });
  });

  it('clears pending feedback when building the call throws', () => {
    const callService = vi.fn();
    const { result } = renderHook(() =>
      usePowerToggle({
        ...props,
        callService,
        buildCall: () => {
          throw new Error('unsupported');
        },
      })
    );
    act(() => result.current.togglePower());
    expect(callService).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });
});
