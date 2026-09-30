import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSensorCardAction } from '../hooks/useSensorCardAction';

const switchEntity = (state) => ({ entity_id: 'switch.socket', state, attributes: {} });
const action = { type: 'toggle', entityId: 'switch.socket', targetEntity: switchEntity('off') };
const conn = {};
const props = { action, conn, entities: { 'switch.socket': switchEntity('off') } };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

afterEach(() => vi.useRealTimers());

describe('useSensorCardAction', () => {
  it('waits for HA state confirmation and prevents duplicate clicks while pending', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const { result, rerender } = renderHook(
      (entities) => useSensorCardAction({ ...props, callService, entities }),
      { initialProps: props.entities }
    );
    await act(async () => {
      result.current.execute();
      result.current.execute();
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.socket' });
    expect(result.current.pending).toBe(true);
    expect(result.current.status).toBe('pending');
    rerender({ 'switch.socket': switchEntity('on') });
    expect(result.current.status).toBe('confirmed');
    expect(result.current.pending).toBe(false);
  });

  it('can choose explicit on/off for legacy controls', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useSensorCardAction({ ...props, callService }));
    await act(async () => result.current.execute('turn_off'));
    expect(callService).toHaveBeenCalledWith('switch', 'turn_off', { entity_id: 'switch.socket' });
    expect(result.current.status).toBe('confirmed');
  });

  it('does not use an inherited entity when an override targets a missing entity', async () => {
    const callService = vi.fn();
    const { result } = renderHook(() => useSensorCardAction({ ...props, callService }));
    await act(async () => result.current.execute({ entityId: 'switch.missing' }));
    expect(callService).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
  });

  it('waits for command acknowledgement when an entity update arrives first', async () => {
    const pending = deferred();
    const callService = vi.fn().mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(
      (entities) => useSensorCardAction({ ...props, callService, entities }),
      { initialProps: props.entities }
    );
    act(() => {
      result.current.execute();
    });
    rerender({ 'switch.socket': switchEntity('on') });
    expect(result.current.status).toBe('pending');
    await act(async () => pending.resolve({}));
    expect(result.current.status).toBe('confirmed');
  });

  it.each(['scene', 'script', 'press', 'service'])(
    'reports only command sent for %s',
    async (type) => {
      const entityId = type === 'press' ? 'button.start' : `${type}.night`;
      const targetEntity = { entity_id: entityId, state: 'unknown', attributes: {} };
      const callService = vi.fn().mockResolvedValue({});
      const customAction = {
        type,
        entityId,
        targetEntity,
        service: 'climate.set_hvac_mode',
        data: { hvac_mode: 'cool' },
      };
      const { result } = renderHook(() =>
        useSensorCardAction({
          conn,
          action: customAction,
          entities: { [entityId]: targetEntity },
          callService,
        })
      );
      await act(async () => result.current.execute());
      expect(result.current.status).toBe('sent');
      expect(result.current.pending).toBe(false);
    }
  );

  it('catches failures, exposes feedback, and immediately permits retry', async () => {
    const error = new Error('Not authorized');
    const callService = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({});
    const onError = vi.fn();
    const { result } = renderHook(() => useSensorCardAction({ ...props, callService, onError }));
    let response;
    await act(async () => {
      response = await result.current.execute();
    });
    expect(response).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
    await act(async () => result.current.execute());
    expect(callService).toHaveBeenCalledTimes(2);
    expect(result.current.pending).toBe(true);
  });

  it.each([{ conn: null }, { connected: false }])(
    'prevents HA calls while disconnected (%o)',
    async (disconnected) => {
      const callService = vi.fn();
      const { result } = renderHook(() =>
        useSensorCardAction({ ...props, ...disconnected, callService })
      );
      await act(async () => result.current.execute());
      expect(callService).not.toHaveBeenCalled();
      expect(result.current.status).toBe('error');
    }
  );

  it('does not call actions in edit/preview mode', async () => {
    const callService = vi.fn();
    const onOpen = vi.fn();
    const { result } = renderHook(() =>
      useSensorCardAction({ ...props, callService, onOpen, disabled: true })
    );
    await act(async () => {
      result.current.execute();
      result.current.execute('more-info');
    });
    expect(callService).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('opens details without needing a HA connection', async () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() =>
      useSensorCardAction({
        ...props,
        conn: null,
        action: { ...action, type: 'more-info' },
        onOpen,
      })
    );
    await act(async () => result.current.execute());
    expect(onOpen).toHaveBeenCalledWith('switch.socket');
    expect(result.current.status).toBe('idle');
  });

  it('unlocks after a missing state update and ignores a late old rejection', async () => {
    vi.useFakeTimers();
    const old = deferred();
    const callService = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue({});
    const { result } = renderHook(() => useSensorCardAction({ ...props, callService }));
    act(() => {
      result.current.execute();
    });
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.status).toBe('timeout');
    expect(result.current.pending).toBe(false);
    await act(async () => result.current.execute());
    expect(result.current.status).toBe('pending');
    await act(async () => old.reject(new Error('Late error')));
    expect(result.current.status).toBe('pending');
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('clears sent feedback after its display interval', async () => {
    vi.useFakeTimers();
    const callService = vi.fn().mockResolvedValue({});
    const scene = { entity_id: 'scene.night', state: 'unknown', attributes: {} };
    const { result } = renderHook(() =>
      useSensorCardAction({
        conn,
        action: { type: 'scene', entityId: scene.entity_id, targetEntity: scene },
        callService,
      })
    );
    await act(async () => result.current.execute());
    expect(result.current.status).toBe('sent');
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.status).toBe('idle');
  });

  it('releases an in-flight action when a card is changed to a different target', async () => {
    const old = deferred();
    const callService = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue({});
    const other = { entity_id: 'switch.other', state: 'off', attributes: {} };
    const { result, rerender } = renderHook(
      (currentAction) =>
        useSensorCardAction({
          ...props,
          action: currentAction,
          callService,
          entities: { ...props.entities, [other.entity_id]: other },
        }),
      { initialProps: action }
    );
    act(() => {
      result.current.execute();
    });
    expect(result.current.pending).toBe(true);
    rerender({ ...action, entityId: other.entity_id, targetEntity: other });
    expect(result.current.pending).toBe(false);
    await act(async () => result.current.execute());
    expect(callService).toHaveBeenLastCalledWith('switch', 'turn_on', {
      entity_id: other.entity_id,
    });
    await act(async () => old.resolve({}));
    expect(result.current.pending).toBe(true);
  });

  it('uses the connection helper when no injected service caller is provided', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() =>
      useSensorCardAction({ ...props, conn: { sendMessagePromise } })
    );
    await act(async () => result.current.execute());
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'switch',
      service: 'turn_on',
      service_data: { entity_id: 'switch.socket' },
    });
  });
});
