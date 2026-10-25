import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettingsSync } from '../hooks/useSettingsSync';
import { useProfiles } from '../hooks/useProfiles';

vi.mock('../services/settingsApi', () => ({
  fetchCurrentSettings: vi.fn(),
  fetchSettingsHistory: vi.fn(),
  deleteSettingsHistory: vi.fn(),
  deleteSettingsDevice: vi.fn(),
  updateSettingsDeviceLabel: vi.fn(),
  saveCurrentSettings: vi.fn(),
  fetchCurrentDevices: vi.fn(),
  publishCurrentSettings: vi.fn(),
}));

vi.mock('../services/snapshot', () => ({
  collectSnapshot: vi.fn(),
  applySnapshot: vi.fn(),
  isValidSnapshot: vi.fn(),
}));

import {
  fetchCurrentSettings,
  fetchSettingsHistory,
  deleteSettingsHistory,
  deleteSettingsDevice,
  updateSettingsDeviceLabel,
  saveCurrentSettings,
  fetchCurrentDevices,
  publishCurrentSettings,
} from '../services/settingsApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';

describe('useSettingsSync', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    localStorage.clear();
    fetchCurrentSettings.mockResolvedValue(null);
    fetchSettingsHistory.mockResolvedValue([]);
    deleteSettingsHistory.mockResolvedValue({ success: true, deleted: 3 });
    deleteSettingsDevice.mockResolvedValue({
      success: true,
      deleted_current: 1,
      deleted_history: 2,
    });
    updateSettingsDeviceLabel.mockResolvedValue({
      success: true,
      device_label: 'Living room tablet',
    });
    fetchCurrentDevices.mockResolvedValue([]);
    saveCurrentSettings.mockResolvedValue({ revision: 1, updated_at: '2026-02-22T12:00:00.000Z' });
    publishCurrentSettings.mockResolvedValue({ success: true, affected: 1 });
    collectSnapshot.mockReturnValue({
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: [] } },
      appearance: {},
    });
    isValidSnapshot.mockReturnValue(true);
  });

  it('loads current settings metadata on init', async () => {
    fetchCurrentSettings.mockResolvedValue({
      revision: 4,
      updated_at: '2026-02-22T12:00:00.000Z',
      data: { version: 1, layout: {}, appearance: {} },
    });

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(fetchCurrentSettings).toHaveBeenCalledWith('user-1', expect.any(String));
      expect(fetchSettingsHistory).toHaveBeenCalledWith('user-1', expect.any(String), 30);
      expect(result.current.status).toBe('synced');
      expect(result.current.currentRevision).toBe(4);
    });
  });

  it.each([false, true])(
    'reconciles an offline publication after reload (local edits=%s)',
    async (edited) => {
      vi.useFakeTimers();
      const baseline = { ...collectSnapshot(), layout: { pagesConfig: { home: ['old'] } } };
      const published = { ...baseline, layout: { pagesConfig: { home: ['published'] } } };
      const local = { ...baseline, layout: { pagesConfig: { home: ['local-edit'] } } };
      collectSnapshot.mockReturnValue(baseline);
      fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
      const first = renderHook(() =>
        useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
      );
      await act(async () => {});
      expect(first.result.current.currentRevision).toBe(4);
      first.unmount();
      collectSnapshot.mockReturnValue(edited ? local : baseline);
      fetchCurrentSettings.mockResolvedValue({ revision: 5, data: published });
      applySnapshot.mockImplementation((snapshot) => collectSnapshot.mockReturnValue(snapshot));
      const second = renderHook(() =>
        useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
      );
      await act(async () => {});
      expect(second.result.current.currentRevision).toBe(5);
      if (edited) {
        expect(second.result.current.status).toBe('conflict');
        expect(applySnapshot).not.toHaveBeenCalled();
        await act(async () => {
          window.dispatchEvent(new Event('tunet:edit-done'));
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(saveCurrentSettings).not.toHaveBeenCalled();
        second.unmount();
        const third = renderHook(() =>
          useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
        );
        await act(async () => {});
        expect(third.result.current.status).toBe('conflict');
        await act(async () => {
          await third.result.current.loadCurrentFromServer();
        });
        expect(collectSnapshot()).toEqual(published);
        expect(third.result.current.status).toBe('synced');
      } else {
        expect(collectSnapshot()).toEqual(published);
        expect(second.result.current.status).toBe('synced');
        expect(saveCurrentSettings).not.toHaveBeenCalled();
      }
    }
  );

  it('recovers automatically after a temporary 503 without reloading the dashboard', async () => {
    vi.useFakeTimers();
    fetchCurrentSettings
      .mockRejectedValueOnce(Object.assign(new Error('HA restarting'), { status: 503 }))
      .mockResolvedValue({ revision: 4, data: collectSnapshot() });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await act(async () => {});
    expect(result.current.backgroundSyncSuspended).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(result.current.backgroundSyncSuspended).toBe(false);
    expect(result.current.status).toBe('synced');
    const reads = fetchCurrentSettings.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(fetchCurrentSettings.mock.calls.length).toBeGreaterThan(reads);
  });

  it('does not mark unsaved edits as a conflict when the server revision has not changed', async () => {
    vi.useFakeTimers();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: collectSnapshot() });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await act(async () => {});
    collectSnapshot.mockReturnValue({ ...collectSnapshot(), appearance: { theme: 'light' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(result.current.status).not.toBe('conflict');
  });

  it('saves an edit made during a temporary outage once the backend recovers', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    fetchCurrentSettings
      .mockRejectedValueOnce(Object.assign(new Error('HA restarting'), { status: 503 }))
      .mockResolvedValue({ revision: 4, data: baseline });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await act(async () => {});
    const edited = { ...baseline, layout: { pagesConfig: { home: ['offline-edit'] } } };
    collectSnapshot.mockReturnValue(edited);
    await act(async () => {
      window.dispatchEvent(new Event('tunet:edit-done'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: edited, base_revision: 4 }),
      {}
    );
    expect(result.current.backgroundSyncSuspended).toBe(false);
  });

  it('uploads settings changed outside edit mode without an edit-done event', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {});
    const edited = { ...baseline, appearance: { theme: 'light' } };
    collectSnapshot.mockReturnValue(edited);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: edited, base_revision: 4 }),
      {}
    );
  });

  it('leaves local changes alone when auto-sync is turned off', async () => {
    vi.useFakeTimers();
    localStorage.setItem('tunet_auto_sync_enabled', '0');
    const baseline = collectSnapshot();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {});
    collectSnapshot.mockReturnValue({ ...baseline, appearance: { theme: 'light' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();
  });

  it('cancels a queued automatic upload when auto-sync is turned off, and sends it once re-enabled', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await act(async () => {});
    const edited = { ...baseline, appearance: { theme: 'light' } };
    collectSnapshot.mockReturnValue(edited);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    act(() => result.current.setEnabled(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();

    act(() => result.current.setEnabled(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: edited, base_revision: 4 }),
      {}
    );
  });

  it('uploads local settings once the server recovers from failed initial reads', async () => {
    vi.useFakeTimers();
    const serverData = collectSnapshot();
    let online = false;
    fetchCurrentSettings.mockImplementation(() =>
      online
        ? Promise.resolve({ revision: 4, data: serverData })
        : Promise.reject(Object.assign(new Error('Server error'), { status: 500 }))
    );
    const local = { ...serverData, layout: { pagesConfig: { home: ['light.kitchen'] } } };
    collectSnapshot.mockReturnValue(local);
    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();

    online = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: local, base_revision: 4 }),
      {}
    );
  });

  it('uploads an edit finished while another upload is still in flight', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
    let finishFirst;
    saveCurrentSettings
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          })
      )
      .mockResolvedValue({ revision: 6, updated_at: '2026-10-24T12:00:01.000Z' });
    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));
    await act(async () => {});

    const first = { ...baseline, layout: { pagesConfig: { home: ['light.a'] } } };
    collectSnapshot.mockReturnValue(first);
    await act(async () => {
      window.dispatchEvent(new Event('tunet:edit-done'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);

    const second = { ...baseline, layout: { pagesConfig: { home: ['light.a', 'light.b'] } } };
    collectSnapshot.mockReturnValue(second);
    await act(async () => {
      window.dispatchEvent(new Event('tunet:edit-done'));
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      finishFirst({ revision: 5, updated_at: '2026-10-24T12:00:00.000Z' });
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(saveCurrentSettings).toHaveBeenCalledTimes(2);
    expect(saveCurrentSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: second, base_revision: 5 }),
      {}
    );
  });

  it('retries an upload that failed with a network error', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: baseline });
    saveCurrentSettings
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValue({ revision: 5, updated_at: '2026-10-24T12:00:00.000Z' });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await act(async () => {});

    const edited = { ...baseline, layout: { pagesConfig: { home: ['light.kitchen'] } } };
    collectSnapshot.mockReturnValue(edited);
    await act(async () => {
      window.dispatchEvent(new Event('tunet:edit-done'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('error');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(2);
    expect(saveCurrentSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: edited, base_revision: 4 }),
      {}
    );
    expect(result.current.status).toBe('synced');
  });

  it('bootstraps sync and saves edits without ever opening the profiles modal', async () => {
    vi.useFakeTimers();
    const baseline = collectSnapshot();
    let finishRead;
    fetchCurrentSettings.mockReturnValueOnce(
      new Promise((resolve) => {
        finishRead = resolve;
      })
    );
    const { result } = renderHook(() =>
      useProfiles({ haUser: { id: 'user-1' }, contextSetters: {}, prefetchProfiles: false })
    );
    const edited = {
      ...baseline,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['light.kitchen'] } },
    };
    collectSnapshot.mockReturnValue(edited);
    await act(async () => {
      window.dispatchEvent(new Event('tunet:edit-done'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).not.toHaveBeenCalled();
    await act(async () => {
      finishRead({ revision: 7, data: baseline });
    });
    expect(fetchCurrentSettings).toHaveBeenCalledTimes(1);
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ base_revision: 7, data: edited }),
      {}
    );
    expect(result.current.autoSync.status).toBe('synced');
    expect(applySnapshot).not.toHaveBeenCalled();
  });

  it('initializes the server revision before manual sync when bootstrap was disabled', async () => {
    vi.useFakeTimers();
    fetchCurrentSettings.mockResolvedValue({ revision: 5, data: collectSnapshot() });
    const { result } = renderHook(() =>
      useSettingsSync({
        haUserId: 'user-1',
        contextSettersRef: { current: {} },
        autoBootstrap: false,
      })
    );
    await act(async () => {
      result.current.syncNow();
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(saveCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ base_revision: 5 }),
      {}
    );
    expect(result.current.status).toBe('synced');
  });

  it('keeps unresolved conflicts visible when bootstrap is enabled later', async () => {
    vi.useFakeTimers();
    const local = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['local'] } },
      appearance: {},
    };
    collectSnapshot.mockReturnValue(local);
    fetchCurrentSettings.mockResolvedValue({
      revision: 3,
      data: { ...local, appearance: { theme: 'light' } },
    });
    saveCurrentSettings.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), { status: 409, body: { revision: 4 } })
    );
    const { result, rerender } = renderHook(
      ({ autoBootstrap }) =>
        useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} }, autoBootstrap }),
      { initialProps: { autoBootstrap: false } }
    );
    await act(async () => {
      result.current.syncNow();
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.status).toBe('conflict');
    rerender({ autoBootstrap: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(result.current.status).toBe('conflict');
    expect(result.current.currentRevision).toBe(4);
    expect(applySnapshot).not.toHaveBeenCalled();
    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);
  });

  it('skips bootstrap and polling when autoBootstrap is disabled', async () => {
    vi.useFakeTimers();

    renderHook(() =>
      useSettingsSync({
        haUserId: 'user-1',
        contextSettersRef: { current: {} },
        autoBootstrap: false,
      })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(12000);
    });

    expect(fetchCurrentSettings).not.toHaveBeenCalled();
    expect(fetchSettingsHistory).not.toHaveBeenCalled();
    expect(fetchCurrentDevices).not.toHaveBeenCalled();
    expect(saveCurrentSettings).not.toHaveBeenCalled();
  });

  it('loads a specific revision from server when provided', async () => {
    fetchCurrentSettings.mockResolvedValueOnce(null).mockResolvedValueOnce({
      revision: 2,
      updated_at: '2026-02-22T12:01:00.000Z',
      data: { version: 1, layout: {}, appearance: {} },
    });

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      await result.current.loadCurrentFromServer(2);
    });

    expect(
      fetchCurrentSettings.mock.calls.some(
        (call) => call[0] === 'user-1' && typeof call[1] === 'string' && call[2] === 2
      )
    ).toBe(true);
  });

  it('applies newer server revision automatically on sync tick', async () => {
    vi.useFakeTimers();
    fetchCurrentSettings
      .mockResolvedValueOnce({
        revision: 1,
        updated_at: '2026-02-22T12:00:00.000Z',
        data: {
          version: 1,
          layout: { pagesConfig: { header: [], pages: ['home'], home: [] } },
          appearance: {},
        },
      })
      .mockResolvedValueOnce({
        revision: 2,
        updated_at: '2026-02-22T12:05:00.000Z',
        data: {
          version: 1,
          layout: { pagesConfig: { header: ['x'], pages: ['home'], home: [] } },
          appearance: {},
        },
      });

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(applySnapshot).toHaveBeenCalledWith(
      {
        version: 1,
        layout: { pagesConfig: { header: ['x'], pages: ['home'], home: [] } },
        appearance: {},
      },
      {}
    );
  });

  it('applies published server config when device had no prior revision', async () => {
    vi.useFakeTimers();
    saveCurrentSettings.mockRejectedValueOnce(new Error('Connection interrupted'));
    fetchCurrentSettings.mockResolvedValueOnce(null).mockResolvedValueOnce({
      revision: 1,
      updated_at: '2026-02-22T12:10:00.000Z',
      data: {
        version: 1,
        layout: { pagesConfig: { header: ['published'], pages: ['home'], home: [] } },
        appearance: {},
      },
    });

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(applySnapshot).toHaveBeenCalledWith(
      {
        version: 1,
        layout: { pagesConfig: { header: ['published'], pages: ['home'], home: [] } },
        appearance: {},
      },
      {}
    );
  });

  it('adopts server settings on bootstrap for a fresh device', async () => {
    fetchCurrentSettings.mockResolvedValue({
      revision: 2,
      updated_at: '2026-02-22T12:20:00.000Z',
      data: {
        version: 1,
        layout: { pagesConfig: { header: ['from-server'], pages: ['home'], home: [] } },
        appearance: {},
      },
    });

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

    await waitFor(() => {
      expect(applySnapshot).toHaveBeenCalledWith(
        {
          version: 1,
          layout: { pagesConfig: { header: ['from-server'], pages: ['home'], home: [] } },
          appearance: {},
        },
        {}
      );
    });
  });

  it('does not adopt server settings on bootstrap when local config exists', async () => {
    collectSnapshot.mockReturnValue({
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['local-card'] } },
      appearance: {},
    });
    fetchCurrentSettings.mockResolvedValue({
      revision: 2,
      updated_at: '2026-02-22T12:20:00.000Z',
      data: {
        version: 1,
        layout: { pagesConfig: { header: ['from-server'], pages: ['home'], home: [] } },
        appearance: {},
      },
    });

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

    await waitFor(() => {
      expect(fetchCurrentSettings).toHaveBeenCalled();
    });
    await act(async () => {});
    expect(applySnapshot).not.toHaveBeenCalled();
  });

  describe('account layout', () => {
    const localWithCards = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['local-card'] } },
      appearance: {},
    };
    const accountRow = {
      revision: 5,
      updated_at: '2026-02-22T12:30:00.000Z',
      data: {
        version: 1,
        layout: { pagesConfig: { header: [], pages: ['home'], home: ['account-card'] } },
        appearance: {},
      },
    };

    it('keeps a per-browser device id unless the account layout is chosen', async () => {
      const { result } = renderHook(() =>
        useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
      );
      await waitFor(() => expect(fetchCurrentSettings).toHaveBeenCalled());
      expect(result.current.accountLayout).toBe(false);
      expect(result.current.deviceId).not.toBe('account');
    });

    it('syncs the shared account row and adopts it once after switching', async () => {
      localStorage.setItem('tunet_account_layout', '1');
      localStorage.setItem('tunet_account_layout_adopt', '1');
      collectSnapshot.mockReturnValue(localWithCards);
      fetchCurrentSettings.mockResolvedValue(accountRow);

      const { result } = renderHook(() =>
        useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
      );

      await waitFor(() => {
        expect(fetchCurrentSettings).toHaveBeenCalledWith('user-1', 'account');
        expect(applySnapshot).toHaveBeenCalledWith(accountRow.data, {});
      });
      expect(result.current.accountLayout).toBe(true);
      expect(result.current.deviceId).toBe('account');
      expect(localStorage.getItem('tunet_account_layout_adopt')).toBeNull();
      expect(saveCurrentSettings).not.toHaveBeenCalled();
    });

    it('does not adopt again on later visits with local changes', async () => {
      localStorage.setItem('tunet_account_layout', '1');
      collectSnapshot.mockReturnValue(localWithCards);
      fetchCurrentSettings.mockResolvedValue(accountRow);

      renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

      await waitFor(() => expect(fetchCurrentSettings).toHaveBeenCalledWith('user-1', 'account'));
      await act(async () => {});
      expect(applySnapshot).not.toHaveBeenCalled();
    });

    it('stores the choice and reloads when switched', async () => {
      const reload = vi.fn();
      const originalLocation = globalThis.location;
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: { ...originalLocation, reload },
      });
      try {
        const { result } = renderHook(() =>
          useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
        );
        act(() => result.current.setAccountLayout(true));
        expect(localStorage.getItem('tunet_account_layout')).toBe('1');
        expect(localStorage.getItem('tunet_account_layout_adopt')).toBe('1');
        expect(reload).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(globalThis, 'location', {
          configurable: true,
          value: originalLocation,
        });
      }
    });
  });

  it('registers device on init when no server row exists', async () => {
    fetchCurrentSettings.mockResolvedValue(null);

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
    });
  });

  it('does not register device when reading current settings fails', async () => {
    fetchCurrentSettings.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(saveCurrentSettings).not.toHaveBeenCalled();
  });

  it('suspends background polling after a 503 current-settings failure', async () => {
    vi.useFakeTimers();
    const unavailableError = new Error('Service unavailable');
    unavailableError.status = 503;
    fetchCurrentSettings.mockRejectedValue(unavailableError);

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.backgroundSyncSuspended).toBe(true);

    const callCountAfterBootstrap = fetchCurrentSettings.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
    });

    expect(fetchCurrentSettings.mock.calls.length).toBe(callCountAfterBootstrap);
    expect(fetchCurrentDevices).not.toHaveBeenCalled();
    expect(fetchSettingsHistory).not.toHaveBeenCalled();
  });

  it('still allows manual sync after background polling is suspended', async () => {
    const unavailableError = new Error('Service unavailable');
    unavailableError.status = 503;
    fetchCurrentSettings.mockRejectedValue(unavailableError);

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(result.current.backgroundSyncSuspended).toBe(true);
    });

    fetchCurrentSettings.mockResolvedValue({ revision: 4, data: collectSnapshot() });

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
    });
  });

  it('syncNow pushes snapshot to server', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
      expect(result.current.status).toBe('synced');
      expect(result.current.currentRevision).toBe(1);
    });
  });

  it('creates checkpoint on edit done event', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('tunet:edit-done'));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
      expect(result.current.status).toBe('synced');
    });
  });

  it('handles revision conflict response', async () => {
    collectSnapshot.mockReturnValue({ version: 1, layout: {}, appearance: {} });

    fetchCurrentSettings
      .mockResolvedValueOnce({
        revision: 1,
        updated_at: '2026-02-22T12:00:00.000Z',
        data: { version: 1, layout: {}, appearance: {} },
      })
      .mockResolvedValueOnce({
        revision: 9,
        updated_at: '2026-02-22T12:05:00.000Z',
        data: {
          version: 1,
          layout: { pagesConfig: { header: ['server'], pages: ['home'], home: [] } },
          appearance: {},
        },
      });

    const conflictError = new Error('Revision conflict');
    conflictError.status = 409;
    conflictError.body = { revision: 9 };
    saveCurrentSettings.mockRejectedValueOnce(conflictError);

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('synced');
      expect(result.current.currentRevision).toBe(1);
    });

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
      expect(result.current.currentRevision).toBe(9);
      expect(result.current.status).toBe('synced');
    });

    expect(applySnapshot).toHaveBeenCalledWith(
      {
        version: 1,
        layout: { pagesConfig: { header: ['server'], pages: ['home'], home: [] } },
        appearance: {},
      },
      {}
    );
  });

  it('keeps local changes and reports a conflict instead of overwriting the server', async () => {
    const baselineSnapshot = { version: 1, layout: {}, appearance: {} };
    const localSnapshot = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['lock_card_1'] } },
      appearance: {},
    };
    const serverSnapshot = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['server_card'] } },
      appearance: {},
    };
    collectSnapshot.mockReturnValue(localSnapshot);

    fetchCurrentSettings
      .mockResolvedValueOnce({
        revision: 1,
        updated_at: '2026-02-22T12:00:00.000Z',
        data: baselineSnapshot,
      })
      .mockResolvedValueOnce({
        revision: 9,
        updated_at: '2026-02-22T12:05:00.000Z',
        data: serverSnapshot,
      });

    const conflictError = new Error('Revision conflict');
    conflictError.status = 409;
    conflictError.body = { revision: 9 };
    saveCurrentSettings
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({ revision: 10, updated_at: '2026-02-22T12:06:00.000Z' });

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(result.current.currentRevision).toBe(1);
    });

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    // The automatic sync must not push over the other device's revision.
    await waitFor(() => {
      expect(result.current.status).toBe('conflict');
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);
    expect(saveCurrentSettings.mock.calls[0][0].base_revision).toBe(1);
    expect(result.current.currentRevision).toBe(9);
    expect(applySnapshot).not.toHaveBeenCalled();

    // The explicit overwrite action resolves the conflict.
    await act(async () => {
      await result.current.overwriteServerWithLocal();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalledTimes(2);
      expect(result.current.currentRevision).toBe(10);
      expect(result.current.status).toBe('synced');
    });
    expect(saveCurrentSettings.mock.calls[1][0].base_revision).toBe(9);
    expect(saveCurrentSettings.mock.calls[1][0].data).toEqual(localSnapshot);
  });

  it('does not push over a newer server revision without an explicit overwrite', async () => {
    const localSnapshot = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['lock_card_1'] } },
      appearance: {},
    };
    collectSnapshot.mockReturnValue(localSnapshot);

    const conflictError = new Error('Revision conflict');
    conflictError.status = 409;
    conflictError.body = { revision: 9 };
    saveCurrentSettings
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({ revision: 10, updated_at: '2026-02-22T12:06:00.000Z' });

    const { result } = renderHook(() =>
      useSettingsSync({
        haUserId: 'user-1',
        contextSettersRef: { current: {} },
        autoBootstrap: false,
      })
    );

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(result.current.status).toBe('conflict');
    });

    expect(saveCurrentSettings).toHaveBeenCalledTimes(1);
    expect(saveCurrentSettings.mock.calls[0][0].base_revision).toBeNull();
    expect(fetchCurrentSettings).toHaveBeenCalledOnce();
    expect(applySnapshot).not.toHaveBeenCalled();
  });

  it('publishes current config to other devices', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      await result.current.publishCurrentToDevices();
    });

    expect(publishCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        ha_user_id: 'user-1',
        source_device_id: expect.any(String),
        target_device_id: undefined,
        history_keep_limit: expect.any(Number),
      })
    );
    expect(saveCurrentSettings).toHaveBeenCalled();
  });

  it('publishes only selected target devices when provided', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      await result.current.publishCurrentToDevices(['wall-tablet', 'mobile-phone']);
    });

    expect(publishCurrentSettings).toHaveBeenCalledTimes(2);
    expect(publishCurrentSettings).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ha_user_id: 'user-1',
        source_device_id: expect.any(String),
        target_device_id: 'wall-tablet',
        history_keep_limit: expect.any(Number),
      })
    );
    expect(publishCurrentSettings).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ha_user_id: 'user-1',
        source_device_id: expect.any(String),
        target_device_id: 'mobile-phone',
        history_keep_limit: expect.any(Number),
      })
    );
  });

  it('allows manual sync even when auto-sync is disabled', async () => {
    localStorage.setItem('tunet_auto_sync_enabled', '0');
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await waitFor(() => {
      expect(saveCurrentSettings).toHaveBeenCalled();
      expect(result.current.status).toBe('synced');
    });
  });

  it('clears revision history for current device', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(deleteSettingsHistory).toHaveBeenCalledWith('user-1', expect.any(String), true);
  });

  it('exposes editable history keep limit', async () => {
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    expect(result.current.historyKeepLimit).toBeTypeOf('number');

    await act(async () => {
      result.current.setHistoryKeepLimit(120);
    });

    expect(result.current.historyKeepLimit).toBe(120);
  });

  it('renames a known device and refreshes list', async () => {
    fetchCurrentDevices.mockResolvedValue([
      {
        device_id: 'tablet-1',
        device_label: 'Living room tablet',
        revision: 2,
        updated_at: '2026-02-22T12:01:00.000Z',
      },
    ]);

    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );

    await waitFor(() => {
      expect(fetchCurrentDevices).toHaveBeenCalled();
    });
    const callsBeforeRename = fetchCurrentDevices.mock.calls.length;

    await act(async () => {
      await result.current.renameKnownDevice('tablet-1', 'Living room tablet');
    });

    expect(updateSettingsDeviceLabel).toHaveBeenCalledWith(
      'user-1',
      'tablet-1',
      'Living room tablet'
    );
    expect(fetchCurrentDevices.mock.calls.length).toBeGreaterThan(callsBeforeRename);
    expect(result.current.updatingDeviceId).toBe('');
  });
  it('resumes sync after resolving a conflict by loading from the server', async () => {
    const local = {
      version: 1,
      layout: { pagesConfig: { header: [], pages: ['home'], home: ['local'] } },
      appearance: {},
    };
    const remote = { ...local, appearance: { theme: 'light' } };
    collectSnapshot.mockReturnValue(local);
    const conflict = Object.assign(new Error('Revision conflict'), {
      status: 409,
      body: { revision: 9 },
    });
    saveCurrentSettings.mockRejectedValueOnce(conflict).mockResolvedValue({ revision: 10 });
    fetchCurrentSettings.mockResolvedValue({ revision: 9, data: remote });
    const setters = { current: {} };
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: setters, autoBootstrap: false })
    );
    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(result.current.status).toBe('conflict');
    await act(async () => {
      await result.current.loadCurrentFromServer();
    });
    expect(result.current.status).toBe('synced');
    collectSnapshot.mockReturnValue({ ...remote, appearance: { theme: 'dark' } });
    await act(async () => {
      result.current.syncNow();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(saveCurrentSettings).toHaveBeenCalledTimes(2);
  });
  it('reports skipped publish targets without overwriting their new revisions', async () => {
    fetchCurrentDevices.mockResolvedValue([
      { device_id: 'tablet', revision: 3, device_label: 'Kitchen' },
    ]);
    publishCurrentSettings.mockResolvedValue({
      success: true,
      affected: 0,
      conflicts: [{ device_id: 'tablet', revision: 4 }],
    });
    const { result } = renderHook(() =>
      useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } })
    );
    await waitFor(() => expect(result.current.knownDevices).toHaveLength(1));
    await act(async () => {
      await result.current.publishCurrentToDevices(['tablet']);
    });
    expect(publishCurrentSettings).toHaveBeenCalledWith(
      expect.objectContaining({ base_revisions: { tablet: 3 } })
    );
    expect(result.current.publishConflicts).toEqual([{ device_id: 'tablet', revision: 4 }]);
  });
  it('keeps the conflict resolution available when publishing hits a source conflict', async () => {
    const conflict = Object.assign(new Error('Revision conflict'), {
      status: 409,
      body: { revision: 9 },
    });
    saveCurrentSettings.mockRejectedValueOnce(conflict);
    const { result } = renderHook(() =>
      useSettingsSync({
        haUserId: 'user-1',
        contextSettersRef: { current: {} },
        autoBootstrap: false,
      })
    );
    await act(async () => {
      await expect(result.current.publishCurrentToDevices(['tablet'])).rejects.toThrow(
        'Revision conflict'
      );
    });
    expect(result.current.status).toBe('conflict');
    expect(publishCurrentSettings).not.toHaveBeenCalled();
  });
});
