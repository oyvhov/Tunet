import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettingsSync } from '../hooks/useSettingsSync';

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
    vi.clearAllMocks();
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

  it('registers device on init when no server row exists', async () => {
    fetchCurrentSettings.mockResolvedValue(null);

    renderHook(() => useSettingsSync({ haUserId: 'user-1', contextSettersRef: { current: {} } }));

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
    fetchCurrentSettings.mockResolvedValue({
      revision: 1,
      updated_at: '2026-02-22T12:00:00.000Z',
      data: { version: 1, layout: {}, appearance: {} },
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
      expect(Number.isFinite(Number(result.current.currentRevision))).toBe(true);
    });
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
});
