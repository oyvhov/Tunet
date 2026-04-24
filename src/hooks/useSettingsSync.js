import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCurrentSettings as apiFetchCurrentSettings,
  fetchSettingsHistory as apiFetchSettingsHistory,
  deleteSettingsHistory as apiDeleteSettingsHistory,
  deleteSettingsDevice as apiDeleteSettingsDevice,
  updateSettingsDeviceLabel as apiUpdateSettingsDeviceLabel,
  saveCurrentSettings as apiSaveCurrentSettings,
  fetchCurrentDevices as apiFetchCurrentDevices,
  publishCurrentSettings as apiPublishCurrentSettings,
} from '../services/settingsApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';

const createDeviceId = () => {
  const webCrypto = globalThis.window?.crypto ?? globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `device_${hex}`;
  }

  const epoch = Date.now().toString(36);
  const perfNow = Math.trunc(globalThis.performance?.now?.() || 0).toString(36);
  return `device_${epoch}_${perfNow}`;
};

const getOrCreateDeviceId = () => {
  const key = 'tunet_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = createDeviceId();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return createDeviceId();
  }
};

const clampHistoryKeepLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 5), 500);
};

const getStoredDeviceLabel = () => {
  try {
    return (localStorage.getItem('tunet_device_label') || '').trim();
  } catch {
    return '';
  }
};

const READ_CURRENT_FAILED = Symbol('READ_CURRENT_FAILED');
const isServiceUnavailableError = (error) => Number(error?.status) === 503;

export function useSettingsSync({ haUserId, contextSettersRef, autoBootstrap = true }) {
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const deviceLabelRef = useRef(getStoredDeviceLabel());
  const [enabled, setEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_auto_sync_enabled');
      return raw == null ? true : raw !== '0';
    } catch {
      return true;
    }
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [currentRevision, setCurrentRevision] = useState(null);
  const [knownDevices, setKnownDevices] = useState([]);
  const [history, setHistory] = useState([]);
  const [backgroundSyncSuspended, setBackgroundSyncSuspendedState] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState('');
  const [updatingDeviceId, setUpdatingDeviceId] = useState('');
  const [historyKeepLimit, setHistoryKeepLimit] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_history_keep_limit');
      return clampHistoryKeepLimit(raw ?? 50);
    } catch {
      return 50;
    }
  });

  const autoSyncTimerRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const lastObservedHashRef = useRef('');
  const lastUploadedHashRef = useRef('');
  const pushCurrentToServerRef = useRef(null);
  const backgroundSyncSuspendedRef = useRef(false);

  const setBackgroundSyncSuspended = useCallback((next) => {
    backgroundSyncSuspendedRef.current = next;
    setBackgroundSyncSuspendedState(next);
    if (next && autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
  }, []);

  const updateBackgroundSyncAvailability = useCallback(
    (isAvailable, error = null) => {
      if (isAvailable) {
        if (backgroundSyncSuspendedRef.current) {
          setBackgroundSyncSuspended(false);
        }
        return;
      }

      if (isServiceUnavailableError(error)) {
        setBackgroundSyncSuspended(true);
      }
    },
    [setBackgroundSyncSuspended]
  );

  useEffect(() => {
    try {
      localStorage.setItem('tunet_auto_sync_enabled', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'tunet_history_keep_limit',
        String(clampHistoryKeepLimit(historyKeepLimit))
      );
    } catch {
      // ignore storage errors
    }
  }, [historyKeepLimit]);

  const refreshKnownDevices = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchCurrentDevices(haUserId);
      updateBackgroundSyncAvailability(true);
      setKnownDevices(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      // ignore device list errors
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const refreshHistory = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchSettingsHistory(haUserId, deviceIdRef.current, 30);
      updateBackgroundSyncAvailability(true);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      setHistory([]);
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const readCurrentFromServer = useCallback(async () => {
    if (!haUserId) return null;
    try {
      const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
      updateBackgroundSyncAvailability(true);
      if (row && typeof row === 'object') {
        setCurrentRevision(Number.isFinite(Number(row.revision)) ? Number(row.revision) : null);
        if (typeof row.device_label === 'string') {
          deviceLabelRef.current = row.device_label.trim();
          try {
            localStorage.setItem('tunet_device_label', deviceLabelRef.current);
          } catch {
            // ignore storage errors
          }
        }
        const serialized = JSON.stringify(row.data || {});
        lastUploadedHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        setLastSyncedAt(row.updated_at || null);
        setStatus('synced');
      }
      return row;
    } catch (fetchError) {
      updateBackgroundSyncAvailability(false, fetchError);
      setStatus('error');
      setError(fetchError?.message || 'Failed to fetch current settings');
      return READ_CURRENT_FAILED;
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const applyServerRow = useCallback(
    async (row, options = {}) => {
      if (!row || typeof row !== 'object' || !Number.isFinite(Number(row.revision))) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;
      const serverRevision = Number(row.revision);
      const localRevision = Number.isFinite(Number(currentRevision)) ? Number(currentRevision) : 0;
      if (forcedServerRevision !== null && serverRevision < forcedServerRevision) return false;
      if (forcedServerRevision === null && serverRevision <= localRevision) return false;

      let localSerialized =
        typeof options.localSerializedOverride === 'string' ? options.localSerializedOverride : '';
      if (!localSerialized) {
        try {
          const snapshot = collectSnapshot();
          if (isValidSnapshot(snapshot)) {
            localSerialized = JSON.stringify(snapshot);
          }
        } catch {
          localSerialized = '';
        }
      }

      const hasKnownBaseline = Boolean(lastUploadedHashRef.current);
      if (hasKnownBaseline && localSerialized && localSerialized !== lastUploadedHashRef.current) {
        return false;
      }

      if (!row.data || typeof row.data !== 'object') return false;
      applySnapshot(row.data, contextSettersRef?.current || {});

      const serialized = JSON.stringify(row.data || {});
      lastUploadedHashRef.current = serialized;
      lastObservedHashRef.current = serialized;
      setCurrentRevision(serverRevision);
      setLastSyncedAt(row.updated_at || null);
      setStatus('synced');
      setError('');
      await refreshHistory();
      return true;
    },
    [currentRevision, contextSettersRef, refreshHistory]
  );

  const reconcileFromServer = useCallback(
    async (options = {}) => {
      if (!haUserId) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;

      try {
        const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
        updateBackgroundSyncAvailability(true);
        return applyServerRow(row, { ...options, forceServerRevision: forcedServerRevision });
      } catch (error) {
        updateBackgroundSyncAvailability(false, error);
        // ignore reconciliation errors
        return false;
      }
    },
    [haUserId, applyServerRow, updateBackgroundSyncAvailability]
  );

  const pushCurrentToServer = useCallback(
    async (options = {}) => {
      if (!haUserId) return null;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) {
        const validationError = new Error('Invalid snapshot data');
        setStatus('error');
        setError(validationError.message);
        throw validationError;
      }

      const serialized = JSON.stringify(snapshot);
      if (!options.force && serialized === lastUploadedHashRef.current) {
        return null;
      }

      setStatus('syncing');
      setError('');

      try {
        const response = await apiSaveCurrentSettings(
          {
            ha_user_id: haUserId,
            device_id: deviceIdRef.current,
            data: snapshot,
            base_revision: currentRevision,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
            device_label: deviceLabelRef.current || undefined,
          },
          options.fetchOptions || {}
        );

        updateBackgroundSyncAvailability(true);
        setCurrentRevision(
          Number.isFinite(Number(response?.revision)) ? Number(response.revision) : currentRevision
        );
        setLastSyncedAt(response?.updated_at || new Date().toISOString());
        setStatus('synced');
        lastUploadedHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        await refreshKnownDevices();
        await refreshHistory();
        return response;
      } catch (saveError) {
        if (saveError?.status === 409 && Number.isFinite(Number(saveError?.body?.revision))) {
          const conflictRevision = Number(saveError.body.revision);
          setCurrentRevision(conflictRevision);
          setStatus('conflict');
          setError('Revision conflict');
          await reconcileFromServer({
            forceServerRevision: conflictRevision,
            localSerializedOverride: serialized,
          });
        } else {
          setStatus('error');
          setError(saveError?.message || 'Failed to sync settings');
        }
        updateBackgroundSyncAvailability(false, saveError);
        throw saveError;
      }
    },
    [
      haUserId,
      currentRevision,
      historyKeepLimit,
      reconcileFromServer,
      refreshKnownDevices,
      refreshHistory,
      updateBackgroundSyncAvailability,
    ]
  );

  pushCurrentToServerRef.current = pushCurrentToServer;

  const queueAutoSync = useCallback(
    (force = false, { ignoreEnabled = false, ignoreSuspended = false } = {}) => {
      if ((!enabled && !ignoreEnabled) || !haUserId) return;
      if (backgroundSyncSuspendedRef.current && !ignoreSuspended) return;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) return;
      const serialized = JSON.stringify(snapshot);

      if (!force && serialized === lastObservedHashRef.current) return;
      lastObservedHashRef.current = serialized;

      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = setTimeout(
        async () => {
          if (syncInFlightRef.current) return;
          syncInFlightRef.current = true;
          try {
            await pushCurrentToServer({ force });
          } catch {
            // state already handled
          } finally {
            syncInFlightRef.current = false;
          }
        },
        force ? 0 : 3500
      );
    },
    [enabled, haUserId, pushCurrentToServer]
  );

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    let disposed = false;

    const bootstrap = async () => {
      const row = await readCurrentFromServer();
      if (disposed) return;

      if (row === READ_CURRENT_FAILED) {
        if (!backgroundSyncSuspendedRef.current) {
          await refreshKnownDevices();
          await refreshHistory();
        }
        return;
      }

      if (!row) {
        try {
          await pushCurrentToServerRef.current?.({ force: true });
        } catch {
          // ignore bootstrap errors
        }
      }

      if (disposed || backgroundSyncSuspendedRef.current) return;
      await refreshKnownDevices();
      await refreshHistory();
    };

    bootstrap();
    return () => {
      disposed = true;
    };
  }, [
    autoBootstrap,
    haUserId,
    backgroundSyncSuspended,
    readCurrentFromServer,
    refreshKnownDevices,
    refreshHistory,
  ]);

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    const id = setInterval(() => {
      reconcileFromServer();
    }, 4000);
    return () => clearInterval(id);
  }, [autoBootstrap, haUserId, reconcileFromServer, backgroundSyncSuspended]);

  useEffect(() => {
    if (!haUserId || typeof globalThis.window === 'undefined') return undefined;

    const handleEditDone = () => {
      queueAutoSync(true, { ignoreEnabled: true });
    };

    globalThis.window.addEventListener('tunet:edit-done', handleEditDone);
    return () => {
      globalThis.window.removeEventListener('tunet:edit-done', handleEditDone);
    };
  }, [haUserId, queueAutoSync]);

  const loadCurrentFromServer = useCallback(
    async (revision) => {
      const row = Number.isFinite(Number(revision))
        ? await apiFetchCurrentSettings(haUserId, deviceIdRef.current, Number(revision))
        : await readCurrentFromServer();
      if (row === READ_CURRENT_FAILED) return;
      if (!row?.data || typeof row.data !== 'object') return;

      if (Number.isFinite(Number(row.revision))) {
        setCurrentRevision(Number(row.revision));
      }
      if (row.updated_at) {
        setLastSyncedAt(row.updated_at);
      }

      applySnapshot(row.data, contextSettersRef?.current || {});
    },
    [haUserId, readCurrentFromServer, contextSettersRef]
  );

  const publishCurrentToDevices = useCallback(
    async (targetDeviceIds) => {
      if (!haUserId) return;
      setPublishing(true);
      setError('');
      try {
        await pushCurrentToServer({ force: true });

        const normalizedTargets = Array.isArray(targetDeviceIds)
          ? [
              ...new Set(
                targetDeviceIds
                  .filter((id) => typeof id === 'string' && id.trim())
                  .map((id) => id.trim())
              ),
            ]
          : [];

        if (normalizedTargets.length === 0) {
          await apiPublishCurrentSettings({
            ha_user_id: haUserId,
            source_device_id: deviceIdRef.current,
            target_device_id: undefined,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
          });
        } else {
          await Promise.all(
            normalizedTargets.map((targetDeviceId) =>
              apiPublishCurrentSettings({
                ha_user_id: haUserId,
                source_device_id: deviceIdRef.current,
                target_device_id: targetDeviceId,
                history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
              })
            )
          );
        }
        await refreshKnownDevices();
        await refreshHistory();
      } catch (publishError) {
        setStatus('error');
        setError(publishError?.message || 'Failed to publish settings');
        throw publishError;
      } finally {
        setPublishing(false);
      }
    },
    [haUserId, historyKeepLimit, pushCurrentToServer, refreshKnownDevices, refreshHistory]
  );

  const clearHistory = useCallback(async () => {
    if (!haUserId) return;
    setClearingHistory(true);
    setError('');
    try {
      await apiDeleteSettingsHistory(haUserId, deviceIdRef.current, true);
      await refreshHistory();
    } catch (historyError) {
      setStatus('error');
      setError(historyError?.message || 'Failed to clear revision history');
      throw historyError;
    } finally {
      setClearingHistory(false);
    }
  }, [haUserId, refreshHistory]);

  const removeKnownDevice = useCallback(
    async (targetDeviceId) => {
      if (!haUserId || !targetDeviceId) return;
      if (targetDeviceId === deviceIdRef.current) {
        const removeCurrentError = new Error('Cannot remove current device');
        setStatus('error');
        setError(removeCurrentError.message);
        throw removeCurrentError;
      }

      setRemovingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiDeleteSettingsDevice(haUserId, targetDeviceId);
        await refreshKnownDevices();
      } catch (removeError) {
        setStatus('error');
        setError(removeError?.message || 'Failed to remove device');
        throw removeError;
      } finally {
        setRemovingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  const renameKnownDevice = useCallback(
    async (targetDeviceId, nextLabel) => {
      if (!haUserId || !targetDeviceId) return;

      setUpdatingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiUpdateSettingsDeviceLabel(haUserId, targetDeviceId, nextLabel);
        if (targetDeviceId === deviceIdRef.current) {
          const normalized = typeof nextLabel === 'string' ? nextLabel.trim() : '';
          deviceLabelRef.current = normalized;
          try {
            localStorage.setItem('tunet_device_label', normalized);
          } catch {
            // ignore storage errors
          }
        }
        await refreshKnownDevices();
      } catch (renameError) {
        setStatus('error');
        setError(renameError?.message || 'Failed to rename device');
        throw renameError;
      } finally {
        setUpdatingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  return {
    enabled,
    setEnabled,
    status,
    error,
    backgroundSyncSuspended,
    lastSyncedAt,
    deviceId: deviceIdRef.current,
    currentRevision,
    knownDevices,
    history,
    publishing,
    clearingHistory,
    removingDeviceId,
    updatingDeviceId,
    historyKeepLimit,
    setHistoryKeepLimit,
    syncNow: () => queueAutoSync(true, { ignoreEnabled: true, ignoreSuspended: true }),
    loadCurrentFromServer,
    publishCurrentToDevices,
    clearHistory,
    removeKnownDevice,
    renameKnownDevice,
    refreshKnownDevices,
  };
}
