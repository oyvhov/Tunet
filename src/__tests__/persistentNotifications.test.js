import { describe, expect, it, vi } from 'vitest';
import { subscribePersistentNotifications } from '../services/persistentNotifications';

describe('persistent notification subscription', () => {
  it('uses the HA subscription protocol and handles current, added, updated and removed messages', async () => {
    const stop = vi.fn();
    const conn = { subscribeMessage: vi.fn().mockResolvedValue(stop) };
    const onChange = vi.fn();
    const dispose = subscribePersistentNotifications(conn, onChange);
    expect(conn.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: 'persistent_notification/subscribe',
    });
    const receive = conn.subscribeMessage.mock.calls[0][0];
    receive({ type: 'current', notifications: { first: { message: 'First' } } });
    receive({ type: 'added', notifications: { second: { message: 'Second' } } });
    expect(onChange.mock.lastCall[0]).toHaveLength(2);
    receive({ type: 'updated', notifications: { first: { message: 'Updated' } } });
    receive({ type: 'removed', notifications: { second: {} } });
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'first', message: 'Updated' }]);
    receive({ type: 'current', notifications: {} });
    expect(onChange).toHaveBeenLastCalledWith([]);
    await Promise.resolve();
    dispose();
    expect(stop).toHaveBeenCalledOnce();
    onChange.mockClear();
    receive({ type: 'added', notifications: { late: { message: 'Late' } } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('unsubscribes even when unmounted before the server acknowledges the subscription', async () => {
    let resolve;
    const subscription = new Promise((done) => {
      resolve = done;
    });
    const stop = vi.fn();
    const dispose = subscribePersistentNotifications(
      { subscribeMessage: () => subscription },
      vi.fn()
    );
    dispose();
    resolve(stop);
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('reports rejected subscriptions without leaving an unhandled promise', async () => {
    const error = new Error('Unavailable');
    const onError = vi.fn();
    subscribePersistentNotifications(
      { subscribeMessage: () => Promise.reject(error) },
      vi.fn(),
      onError
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
