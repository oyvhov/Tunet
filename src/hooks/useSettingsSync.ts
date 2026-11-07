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
import type {
  CurrentSettingsRow,
  PublishConflict,
  SaveCurrentSettingsResponse,
  SettingsDevice,
  SettingsHistoryEntry,
} from '../services/settingsApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';
import type { DashboardSnapshot, SnapshotContextSetters } from '../services/snapshot';

type ContextSettersRef = { readonly current: SnapshotContextSetters | null | undefined };

export interface UseSettingsSyncOptions {
  haUserId?: string | null;
  contextSettersRef?: ContextSettersRef | null;
  autoBootstrap?: boolean;
}

// Thrown values are probed defensively; optional chaining copes with non-objects.
type SyncError = { status?: number; message?: string; body?: { revision?: unknown } } | null;

type ReadCurrentResult = CurrentSettingsRow | null | typeof READ_CURRENT_FAILED;

interface ServerRowOptions {
  forceServerRevision?: number | null;
  localSerializedOverride?: string;
}

interface PushOptions {
  force?: boolean;
  overwriteConflicts?: boolean;
  fetchOptions?: Parameters<typeof apiSaveCurrentSettings>[1];
}

interface QueueAutoSyncOptions {
  ignoreEnabled?: boolean;
  ignoreSuspended?: boolean;
  delayMs?: number;
}

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

// One synced layout per Home Assistant account instead of one per browser.
export const ACCOUNT_LAYOUT_DEVICE_ID = 'account';
const ACCOUNT_LAYOUT_KEY = 'tunet_account_layout';
const ACCOUNT_LAYOUT_ADOPT_KEY = 'tunet_account_layout_adopt';
// Builds can make the account layout the default with VITE_ACCOUNT_LAYOUT_DEFAULT=true.
const ACCOUNT_LAYOUT_DEFAULT =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_ACCOUNT_LAYOUT_DEFAULT === 'true';

export const readAccountLayoutPreference = () => {
  try {
    const raw = localStorage.getItem(ACCOUNT_LAYOUT_KEY);
    if (raw == null) return ACCOUNT_LAYOUT_DEFAULT;
    return raw === '1';
  } catch {
    return ACCOUNT_LAYOUT_DEFAULT;
  }
};

/**
 * A browser that just switched to the account layout (or uses it by default
 * without having chosen) takes the server copy once instead of uploading its own.
 */
const consumeAccountLayoutAdoption = () => {
  try {
    const pending =
      localStorage.getItem(ACCOUNT_LAYOUT_ADOPT_KEY) === '1' ||
      localStorage.getItem(ACCOUNT_LAYOUT_KEY) == null;
    localStorage.removeItem(ACCOUNT_LAYOUT_ADOPT_KEY);
    localStorage.setItem(ACCOUNT_LAYOUT_KEY, '1');
    return pending;
  } catch {
    return false;
  }
};

const clampHistoryKeepLimit = (value: unknown) => {
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

const hasDefaultDashboardLayout = (snapshot: DashboardSnapshot | null | undefined) => {
  const layout = snapshot?.layout;
  if (!layout) return false;
  const pagesConfig: NonNullable<typeof layout.pagesConfig> = layout.pagesConfig || {};
  const pages = Array.isArray(pagesConfig.pages) ? pagesConfig.pages : [];
  const header = Array.isArray(pagesConfig.header) ? pagesConfig.header : [];
  const homeCards = Array.isArray(pagesConfig.home) ? pagesConfig.home : [];
  if (pages.length !== 1 || pages[0] !== 'home' || header.length > 0 || homeCards.length > 0) {
    return false;
  }
  const isEmptyObject = (value: unknown) =>
    value == null || (typeof value === 'object' && Object.keys(value).length === 0);
  const isEmptyArray = (value: unknown) =>
    value == null || (Array.isArray(value) && value.length === 0);
  return (
    isEmptyObject(layout.cardSettings) &&
    isEmptyObject(layout.customNames) &&
    isEmptyObject(layout.customIcons) &&
    isEmptyObject(layout.pageSettings) &&
    isEmptyArray(layout.hiddenCards)
  );
};

const READ_CURRENT_FAILED = Symbol('READ_CURRENT_FAILED');
const LOCAL_CHANGE_SYNC_DELAY_MS = 10000;
const isServiceUnavailableError = (error: unknown) => Number((error as SyncError)?.status) === 503;

export function useSettingsSync({
  haUserId,
  contextSettersRef,
  autoBootstrap = true,
}: UseSettingsSyncOptions) {
  const [accountLayout] = useState(readAccountLayoutPreference);
  const deviceIdRef = useRef(accountLayout ? ACCOUNT_LAYOUT_DEVICE_ID : getOrCreateDeviceId());
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [currentRevision, setCurrentRevisionState] = useState<number | null>(null);
  const [knownDevices, setKnownDevices] = useState<SettingsDevice[]>([]);
  const [history, setHistory] = useState<SettingsHistoryEntry[]>([]);
  const [publishConflicts, setPublishConflicts] = useState<PublishConflict[]>([]);
  const conflictRef = useRef(false);
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

  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const lastObservedHashRef = useRef('');
  const lastUploadedHashRef = useRef('');
  const pushCurrentToServerRef = useRef<
    ((options?: PushOptions) => Promise<SaveCurrentSettingsResponse | null>) | null
  >(null);
  const backgroundSyncSuspendedRef = useRef(false);
  const currentRevisionRef = useRef<number | null>(null);
  const pendingReadRef = useRef<{ haUserId: string; promise: Promise<ReadCurrentResult> } | null>(
    null
  );
  const initializedUserRef = useRef<string | null>(null);
  const pendingSyncRef = useRef(false);
  const baselineUserRef = useRef<string | null>(null);
  const contextSettersLatestRef = useRef(contextSettersRef);
  contextSettersLatestRef.current = contextSettersRef;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const baselineKey = `tunet_sync_baseline:${encodeURIComponent(haUserId || '')}:${deviceIdRef.current}`;

  const persistBaseline = useCallback(
    (revision: number | null, serialized: string) => {
      try {
        localStorage.setItem(baselineKey, JSON.stringify({ revision, serialized }));
      } catch {
        // Sync still works in this session if browser storage is full.
      }
    },
    [baselineKey]
  );

  const setCurrentRevision = useCallback((nextRevision: unknown) => {
    const normalized = Number.isFinite(Number(nextRevision)) ? Number(nextRevision) : null;
    currentRevisionRef.current = normalized;
    setCurrentRevisionState(normalized);
    return normalized;
  }, []);

  const setBackgroundSyncSuspended = useCallback((next: boolean) => {
    backgroundSyncSuspendedRef.current = next;
    setBackgroundSyncSuspendedState(next);
    if (next && autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
  }, []);

  const updateBackgroundSyncAvailability = useCallback(
    (isAvailable: boolean, error: unknown = null) => {
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

  const readCurrentFromServer = useCallback(() => {
    if (!haUserId) return Promise.resolve(null);
    if (pendingReadRef.current?.haUserId === haUserId) return pendingReadRef.current.promise;
    if (baselineUserRef.current !== haUserId) {
      baselineUserRef.current = haUserId;
      initializedUserRef.current = null;
      pendingSyncRef.current = false;
      conflictRef.current = false;
      currentRevisionRef.current = null;
      lastUploadedHashRef.current = '';
      try {
        // Cast: JSON.parse(null) returns null, which the checks below reject.
        const saved = JSON.parse(localStorage.getItem(baselineKey) as string);
        if (Number.isInteger(saved?.revision) && typeof saved?.serialized === 'string') {
          currentRevisionRef.current = saved.revision;
          lastUploadedHashRef.current = saved.serialized;
        }
      } catch {
        // Ignore invalid or unavailable browser storage.
      }
    }
    const promise = (async (): Promise<ReadCurrentResult> => {
      try {
        const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
        if (baselineUserRef.current !== haUserId) return READ_CURRENT_FAILED;
        initializedUserRef.current = haUserId;
        updateBackgroundSyncAvailability(true);
        if (conflictRef.current) return row;
        if (row && typeof row === 'object') {
          const serialized = JSON.stringify(row.data || {});
          if (
            lastUploadedHashRef.current &&
            // Cast: a null revision compares as 0, same as before typing.
            Number(row.revision) > (currentRevisionRef.current as number)
          ) {
            const local = JSON.stringify(collectSnapshot());
            if (local !== lastUploadedHashRef.current && local !== serialized) {
              setCurrentRevision(Number(row.revision));
              conflictRef.current = true;
              setStatus('conflict');
              setError('');
              return row;
            }
            if (local !== serialized && isValidSnapshot(row.data)) {
              applySnapshot(row.data, contextSettersLatestRef.current?.current || {});
            }
          }
          setCurrentRevision(Number.isFinite(Number(row.revision)) ? Number(row.revision) : null);
          if (typeof row.device_label === 'string') {
            deviceLabelRef.current = row.device_label.trim();
            try {
              localStorage.setItem('tunet_device_label', deviceLabelRef.current);
            } catch {
              // ignore storage errors
            }
          }
          lastUploadedHashRef.current = serialized;
          lastObservedHashRef.current = serialized;
          persistBaseline(Number(row.revision), serialized);
          setLastSyncedAt(row.updated_at || null);
          setStatus('synced');
        }
        return row;
      } catch (fetchError) {
        updateBackgroundSyncAvailability(false, fetchError);
        setStatus('error');
        setError((fetchError as SyncError)?.message || 'Failed to fetch current settings');
        return READ_CURRENT_FAILED;
      }
    })();
    pendingReadRef.current = { haUserId, promise };
    void promise.finally(() => {
      if (pendingReadRef.current?.promise === promise) pendingReadRef.current = null;
    });
    return promise;
  }, [
    haUserId,
    baselineKey,
    persistBaseline,
    setCurrentRevision,
    updateBackgroundSyncAvailability,
  ]);

  const applyServerRow = useCallback(
    async (row: CurrentSettingsRow | null, options: ServerRowOptions = {}) => {
      if (!row || typeof row !== 'object' || !Number.isFinite(Number(row.revision))) return false;

      const forcedServerRevision =
        options.forceServerRevision != null && Number.isFinite(Number(options.forceServerRevision))
          ? Number(options.forceServerRevision)
          : null;
      const serverRevision = Number(row.revision);
      const localRevision = Number.isFinite(Number(currentRevisionRef.current))
        ? Number(currentRevisionRef.current)
        : 0;
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
      if (conflictRef.current && !options.forceServerRevision) return false;
      if (!hasKnownBaseline && !hasDefaultDashboardLayout(collectSnapshot())) return false;
      if (
        hasKnownBaseline &&
        localSerialized &&
        localSerialized !== lastUploadedHashRef.current &&
        localSerialized !== JSON.stringify(row.data)
      ) {
        setCurrentRevision(serverRevision);
        conflictRef.current = true;
        setStatus('conflict');
        setError('');
        return false;
      }

      if (!isValidSnapshot(row.data)) return false;
      applySnapshot(row.data, contextSettersRef?.current || {});

      const serialized = JSON.stringify(row.data || {});
      lastUploadedHashRef.current = serialized;
      lastObservedHashRef.current = serialized;
      setCurrentRevision(serverRevision);
      persistBaseline(serverRevision, serialized);
      setLastSyncedAt(row.updated_at || null);
      conflictRef.current = false;
      setStatus('synced');
      setError('');
      await refreshHistory();
      return true;
    },
    [contextSettersRef, persistBaseline, refreshHistory, setCurrentRevision]
  );

  const reconcileFromServer = useCallback(
    async (options: ServerRowOptions = {}) => {
      if (!haUserId) return false;

      const forcedServerRevision =
        options.forceServerRevision != null && Number.isFinite(Number(options.forceServerRevision))
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
    async (options: PushOptions = {}): Promise<SaveCurrentSettingsResponse | null> => {
      if (!haUserId) return null;
      if (conflictRef.current && !options.overwriteConflicts) return null;
      if (initializedUserRef.current !== haUserId) {
        const row = await readCurrentFromServer();
        if (row === READ_CURRENT_FAILED) return null;
        if (conflictRef.current && !options.overwriteConflicts) return null;
      }

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

      const saveSnapshot = (baseRevision: number | null) =>
        apiSaveCurrentSettings(
          {
            ha_user_id: haUserId,
            device_id: deviceIdRef.current,
            data: snapshot,
            base_revision: baseRevision,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
            device_label: deviceLabelRef.current || undefined,
          },
          options.fetchOptions || {}
        );

      const markSaveSynced = async (response: SaveCurrentSettingsResponse) => {
        const resolvedRevision = Number.isFinite(Number(response?.revision))
          ? Number(response.revision)
          : currentRevisionRef.current;
        setCurrentRevision(resolvedRevision);
        setLastSyncedAt(response?.updated_at || new Date().toISOString());
        conflictRef.current = false;
        setStatus('synced');
        setError('');
        lastUploadedHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        persistBaseline(resolvedRevision, serialized);
        pendingSyncRef.current = false;
        await refreshKnownDevices();
        await refreshHistory();
        return response;
      };

      try {
        const response = await saveSnapshot(currentRevisionRef.current);

        updateBackgroundSyncAvailability(true);
        return markSaveSynced(response);
      } catch (saveError) {
        if (
          (saveError as SyncError)?.status === 409 &&
          Number.isFinite(Number((saveError as SyncError)?.body?.revision))
        ) {
          // Cast: the 409 branch above confirmed body.revision is present.
          const conflictRevision = Number(
            (saveError as { body: { revision: unknown } }).body.revision
          );
          setCurrentRevision(conflictRevision);
          conflictRef.current = true;
          setStatus('conflict');
          setError('');
          const hasLocalChanges =
            !lastUploadedHashRef.current || serialized !== lastUploadedHashRef.current;

          if (!hasLocalChanges) {
            const appliedServer = await reconcileFromServer({
              forceServerRevision: conflictRevision,
              localSerializedOverride: serialized,
            });
            if (appliedServer) return null;
          }

          updateBackgroundSyncAvailability(true);
          throw saveError;
        } else {
          setStatus('error');
          setError((saveError as SyncError)?.message || 'Failed to sync settings');
        }
        updateBackgroundSyncAvailability(false, saveError);
        throw saveError;
      }
    },
    [
      haUserId,
      historyKeepLimit,
      persistBaseline,
      readCurrentFromServer,
      reconcileFromServer,
      refreshKnownDevices,
      refreshHistory,
      setCurrentRevision,
      updateBackgroundSyncAvailability,
    ]
  );

  pushCurrentToServerRef.current = pushCurrentToServer;

  const queueAutoSync = useCallback(
    (
      force = false,
      { ignoreEnabled = false, ignoreSuspended = false, delayMs }: QueueAutoSyncOptions = {}
    ) => {
      if ((!enabled && !ignoreEnabled) || !haUserId || conflictRef.current) return;
      if (backgroundSyncSuspendedRef.current && !ignoreSuspended) {
        pendingSyncRef.current = true;
        return;
      }

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) return;
      const serialized = JSON.stringify(snapshot);

      if (!force && serialized === lastObservedHashRef.current) return;
      pendingSyncRef.current = true;
      lastObservedHashRef.current = serialized;

      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      const run = async () => {
        autoSyncTimerRef.current = null;
        if (!ignoreEnabled && !enabledRef.current) {
          // Auto-sync was turned off while waiting; pick the change up once it is back on.
          lastObservedHashRef.current = lastUploadedHashRef.current;
          return;
        }
        if (syncInFlightRef.current) {
          // Wait for the running upload instead of dropping this one.
          autoSyncTimerRef.current = setTimeout(run, 1000);
          return;
        }
        syncInFlightRef.current = true;
        try {
          await pushCurrentToServerRef.current?.({ force });
          if (initializedUserRef.current !== haUserId) {
            // The initial read failed, so nothing was sent; let the next check retry.
            lastObservedHashRef.current = lastUploadedHashRef.current;
          }
        } catch {
          // Forget the observed state so the next local-change check retries.
          lastObservedHashRef.current = lastUploadedHashRef.current;
        } finally {
          syncInFlightRef.current = false;
        }
      };
      autoSyncTimerRef.current = setTimeout(run, delayMs ?? (force ? 0 : 3500));
    },
    [enabled, haUserId]
  );

  const queueAutoSyncRef = useRef(queueAutoSync);
  queueAutoSyncRef.current = queueAutoSync;
  useEffect(() => {
    if (
      !backgroundSyncSuspended &&
      pendingSyncRef.current &&
      baselineUserRef.current === haUserId
    ) {
      queueAutoSyncRef.current(true, { ignoreEnabled: true });
    }
  }, [backgroundSyncSuspended, haUserId]);

  useEffect(() => () => clearTimeout(autoSyncTimerRef.current ?? undefined), [haUserId]);

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    let disposed = false;

    const bootstrap = async () => {
      const adoptAccountLayout =
        deviceIdRef.current === ACCOUNT_LAYOUT_DEVICE_ID && consumeAccountLayoutAdoption();
      const row = await readCurrentFromServer();
      if (disposed || conflictRef.current) return;

      if (row === READ_CURRENT_FAILED) {
        if (!backgroundSyncSuspendedRef.current) {
          await refreshKnownDevices();
          await refreshHistory();
        }
        return;
      }

      if (!row) {
        if (!syncInFlightRef.current) {
          syncInFlightRef.current = true;
          try {
            await pushCurrentToServerRef.current?.({ force: true });
          } catch {
            // ignore bootstrap errors
          } finally {
            syncInFlightRef.current = false;
          }
        }
      } else if (isValidSnapshot(row.data)) {
        // Fresh device (default dashboard) with existing server settings:
        // adopt them locally. readCurrentFromServer only records the
        // revision/baseline; without this the server config never reaches
        // the UI when it already differs from local state at bootstrap.
        let localSnapshot: DashboardSnapshot | null = null;
        try {
          localSnapshot = collectSnapshot();
        } catch {
          localSnapshot = null;
        }
        if (
          localSnapshot &&
          isValidSnapshot(localSnapshot) &&
          (adoptAccountLayout || hasDefaultDashboardLayout(localSnapshot))
        ) {
          applySnapshot(row.data, contextSettersRef?.current || {});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextSettersRef identity is not stable across renders in all callers
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
      // Settings changed outside edit mode (appearance, layout, header) have
      // no edit-done event, so pick them up here once they have settled.
      queueAutoSyncRef.current(false, { delayMs: LOCAL_CHANGE_SYNC_DELAY_MS });
    }, 4000);
    return () => clearInterval(id);
  }, [autoBootstrap, haUserId, reconcileFromServer, backgroundSyncSuspended]);

  useEffect(() => {
    if (!autoBootstrap || !haUserId || !backgroundSyncSuspended) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 15000;
    const retry = async () => {
      await readCurrentFromServer();
      if (!cancelled && backgroundSyncSuspendedRef.current) {
        delay = Math.min(delay * 2, 60000);
        timer = setTimeout(retry, delay);
      }
    };
    timer = setTimeout(retry, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoBootstrap, haUserId, backgroundSyncSuspended, readCurrentFromServer]);

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
    async (revision?: unknown) => {
      const row = Number.isFinite(Number(revision))
        ? // Cast: unguarded as before; a missing user id is sent as 'undefined'.
          await apiFetchCurrentSettings(haUserId as string, deviceIdRef.current, Number(revision))
        : await readCurrentFromServer();
      if (row === READ_CURRENT_FAILED) return;
      // Same check as before; `!row` only makes the null case visible to TS.
      if (!row || !isValidSnapshot(row.data)) return;

      if (Number.isFinite(Number(row.revision))) {
        setCurrentRevision(Number(row.revision));
      }
      if (row.updated_at) {
        setLastSyncedAt(row.updated_at);
      }

      applySnapshot(row.data, contextSettersRef?.current || {});
      lastUploadedHashRef.current = JSON.stringify(row.data);
      lastObservedHashRef.current = lastUploadedHashRef.current;
      persistBaseline(Number(row.revision), lastUploadedHashRef.current);
      conflictRef.current = false;
      setStatus('synced');
      setError('');
    },
    [haUserId, readCurrentFromServer, contextSettersRef, persistBaseline, setCurrentRevision]
  );

  const publishCurrentToDevices = useCallback(
    async (targetDeviceIds?: string[] | null) => {
      if (!haUserId) return;
      if (conflictRef.current) return;
      setPublishing(true);
      setPublishConflicts([]);
      setError('');
      try {
        if (!(await pushCurrentToServer({ force: true }))) return;

        const normalizedTargets = Array.isArray(targetDeviceIds)
          ? [
              ...new Set(
                targetDeviceIds
                  .filter((id) => typeof id === 'string' && id.trim())
                  .map((id) => id.trim())
              ),
            ]
          : [];

        const baseRevisions = Object.fromEntries(
          knownDevices.map((device) => [device.device_id, device.revision])
        );
        let results;
        if (normalizedTargets.length === 0) {
          results = [
            await apiPublishCurrentSettings({
              ha_user_id: haUserId,
              source_device_id: deviceIdRef.current,
              target_device_id: undefined,
              history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
              base_revisions: baseRevisions,
            }),
          ];
        } else {
          results = await Promise.all(
            normalizedTargets.map((targetDeviceId) =>
              apiPublishCurrentSettings({
                ha_user_id: haUserId,
                source_device_id: deviceIdRef.current,
                target_device_id: targetDeviceId,
                history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
                base_revisions: baseRevisions,
              })
            )
          );
        }
        setPublishConflicts(results.flatMap((result) => result?.conflicts || []));
        await refreshKnownDevices();
        await refreshHistory();
      } catch (publishError) {
        if (!conflictRef.current) {
          setStatus('error');
          setError((publishError as SyncError)?.message || 'Failed to publish settings');
        }
        throw publishError;
      } finally {
        setPublishing(false);
      }
    },
    [
      haUserId,
      historyKeepLimit,
      knownDevices,
      pushCurrentToServer,
      refreshKnownDevices,
      refreshHistory,
    ]
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
      setError((historyError as SyncError)?.message || 'Failed to clear revision history');
      throw historyError;
    } finally {
      setClearingHistory(false);
    }
  }, [haUserId, refreshHistory]);

  const removeKnownDevice = useCallback(
    async (targetDeviceId: string) => {
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
        setError((removeError as SyncError)?.message || 'Failed to remove device');
        throw removeError;
      } finally {
        setRemovingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  const renameKnownDevice = useCallback(
    async (targetDeviceId: string, nextLabel: string | null | undefined) => {
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
        setError((renameError as SyncError)?.message || 'Failed to rename device');
        throw renameError;
      } finally {
        setUpdatingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  const setAccountLayout = useCallback((next: boolean) => {
    try {
      localStorage.setItem(ACCOUNT_LAYOUT_KEY, next ? '1' : '0');
      if (next) localStorage.setItem(ACCOUNT_LAYOUT_ADOPT_KEY, '1');
      else localStorage.removeItem(ACCOUNT_LAYOUT_ADOPT_KEY);
    } catch {
      return;
    }
    // The sync identity is fixed for the session, so start over with the new one.
    globalThis.location?.reload();
  }, []);

  return {
    enabled,
    setEnabled,
    accountLayout,
    setAccountLayout,
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
    publishConflicts,
    overwriteServerWithLocal: () => pushCurrentToServer({ force: true, overwriteConflicts: true }),
    clearHistory,
    removeKnownDevice,
    renameKnownDevice,
    refreshKnownDevices,
  };
}
