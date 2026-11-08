import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchProfiles as apiFetchProfiles,
  createProfile as apiCreateProfile,
  updateProfile as apiUpdateProfile,
  deleteProfile as apiDeleteProfile,
} from '../services/profileApi';
import { useSettingsSync } from './useSettingsSync';
import type { ProfileRow } from '../services/profileApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';
import type { SnapshotContextSetters } from '../services/snapshot';

// Profile and import data is untrusted JSON; fields are re-checked at runtime.
type JsonRecord = Record<string, unknown>;

type PagesConfigDraft = { header?: string[]; pages?: string[] } & JsonRecord;

// Untrusted import JSON: a bare snapshot or a wrapper with it under `data`.
type ImportCandidate = unknown;

export interface UseProfilesOptions {
  /** HA user from HomeAssistantContext */
  haUser: { id?: string } | null | undefined;
  /** combined setters from PageContext + ConfigContext */
  contextSetters: SnapshotContextSetters;
  /** fetch profiles immediately */
  prefetchProfiles?: boolean;
}

function cloneJson(value: unknown, fallback: object = {}): JsonRecord {
  try {
    // Cast: callers pass JSON objects; the clone keeps the source's shape.
    return globalThis.structuredClone(value ?? fallback) as JsonRecord;
  } catch {
    return globalThis.structuredClone(fallback) as JsonRecord;
  }
}

function normalizePagesConfig(candidate: unknown, fallback: unknown) {
  const notes: string[] = [];
  const fallbackConfig = cloneJson(fallback, { header: [], pages: ['home'], home: [] });

  if (!candidate || typeof candidate !== 'object') {
    notes.push('profiles.loadNotePagesMissing');
    return { pagesConfig: fallbackConfig, notes };
  }

  // Cast: header/pages are only trusted after the Array.isArray checks below.
  const next = cloneJson(candidate, fallbackConfig) as PagesConfigDraft;
  if (!Array.isArray(next.header)) {
    next.header = Array.isArray(fallbackConfig.header) ? [...fallbackConfig.header] : [];
  }

  const detectedPages = Object.keys(next).filter(
    (key) => Array.isArray(next[key]) && !['header', 'settings', 'automations'].includes(key)
  );

  if (!Array.isArray(next.pages) || next.pages.length === 0) {
    const fallbackPages =
      Array.isArray(fallbackConfig.pages) && fallbackConfig.pages.length > 0
        ? [...fallbackConfig.pages]
        : ['home'];
    next.pages = detectedPages.length > 0 ? detectedPages : fallbackPages;
    notes.push('profiles.loadNotePagesRebuilt');
  }

  next.pages = next.pages.filter((id) => !['settings', 'automations'].includes(id));

  if (!next.pages.includes('home')) {
    next.pages = ['home', ...next.pages];
  }

  if (next.pages.length === 1 && next.pages[0] === 'home') {
    const extraDetected = detectedPages.filter((id) => id !== 'home');
    if (extraDetected.length > 0) {
      next.pages = ['home', ...extraDetected];
      notes.push('profiles.loadNotePagesRecovered');
    }
  }

  if (next.pages.length === 0) {
    next.pages =
      Array.isArray(fallbackConfig.pages) && fallbackConfig.pages.length > 0
        ? [...fallbackConfig.pages]
        : ['home'];
    notes.push('profiles.loadNotePagesRestored');
  }

  next.pages.forEach((pageId) => {
    if (!Array.isArray(next[pageId])) {
      next[pageId] = Array.isArray(fallbackConfig[pageId]) ? [...fallbackConfig[pageId]] : [];
    }
  });

  return { pagesConfig: next, notes };
}

const INVALID_SNAPSHOT_MESSAGE = 'Invalid snapshot data';

// `error` holds a translation key; raw server text stays on the thrown error.
function profileErrorKey(err: unknown, fallbackKey: string) {
  // Cast: only the message is read, and a non-Error simply has none.
  return (err as Error | null)?.message === INVALID_SNAPSHOT_MESSAGE
    ? 'profiles.errorInvalidSnapshot'
    : fallbackKey;
}

function normalizeImportedSnapshot(snapshotCandidate: ImportCandidate) {
  if (!snapshotCandidate || typeof snapshotCandidate !== 'object') {
    return null;
  }

  // Cast: the object check above passed; `data` is only read, not trusted.
  const wrapped = (snapshotCandidate as { data?: unknown }).data;
  const payload = wrapped && typeof wrapped === 'object' ? wrapped : snapshotCandidate;

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload;
}

/**
 * Hook for managing server-side profiles and templates.
 */
export function useProfiles({
  haUser,
  contextSetters,
  prefetchProfiles = true,
}: UseProfilesOptions) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadSummary, setLoadSummary] = useState<string[] | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const contextSettersRef = useRef(contextSetters);
  contextSettersRef.current = contextSetters;
  const autoSync = useSettingsSync({
    haUserId: haUser?.id,
    contextSettersRef,
  });

  // ── Load profiles when haUser changes ──
  const refreshProfiles = useCallback(async () => {
    if (!haUser?.id) return;
    try {
      const data = await apiFetchProfiles(haUser.id);
      setProfiles(data);
      setBackendAvailable(true);
    } catch (err) {
      console.warn('Failed to fetch profiles:', err);
      setBackendAvailable(false);
    }
  }, [haUser?.id]);

  useEffect(() => {
    if (!prefetchProfiles) return;
    refreshProfiles();
  }, [refreshProfiles, prefetchProfiles]);

  // ── Save current dashboard as a new profile ──
  const saveProfile = useCallback(
    async (name: string, deviceLabel = '') => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const snapshot = collectSnapshot();
        if (!isValidSnapshot(snapshot)) {
          throw new Error(INVALID_SNAPSHOT_MESSAGE);
        }
        const profile = await apiCreateProfile({
          ha_user_id: haUser.id,
          name,
          device_label: deviceLabel || null,
          data: snapshot,
        });
        setProfiles((prev) => [profile, ...prev]);
        return profile;
      } catch (err) {
        setError(profileErrorKey(err, 'profiles.errorSaveFailed'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Overwrite an existing profile with current dashboard ──
  const overwriteProfile = useCallback(
    async (profileId: string, name: string) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const snapshot = collectSnapshot();
        if (!isValidSnapshot(snapshot)) {
          throw new Error(INVALID_SNAPSHOT_MESSAGE);
        }
        const updated = await apiUpdateProfile(profileId, {
          ha_user_id: haUser.id,
          name,
          data: snapshot,
        });
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
        return updated;
      } catch (err) {
        setError(profileErrorKey(err, 'profiles.errorSaveFailed'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Load a profile onto this device ──
  const loadProfile = useCallback((profile: ProfileRow | null | undefined) => {
    setError(null);
    setLoadSummary(null);

    if (!profile?.data || typeof profile.data !== 'object') {
      setError('profiles.errorProfileInvalid');
      return;
    }

    const currentSnapshot = collectSnapshot();
    const currentPagesConfig = currentSnapshot?.layout?.pagesConfig;

    const normalizedSnapshot = {
      ...cloneJson(profile.data, {}),
      layout: {
        // Cast: the typeof check above confirmed data is an object.
        ...cloneJson((profile.data as JsonRecord).layout, {}),
      },
    };

    const { pagesConfig, notes } = normalizePagesConfig(
      normalizedSnapshot.layout.pagesConfig,
      currentPagesConfig
    );

    normalizedSnapshot.layout.pagesConfig = pagesConfig;

    applySnapshot(normalizedSnapshot, contextSettersRef.current);

    if (notes.length > 0) {
      setLoadSummary(notes);
    }
  }, []);

  const importDashboard = useCallback((snapshotCandidate: ImportCandidate) => {
    setError(null);
    setLoadSummary(null);

    const payload = normalizeImportedSnapshot(snapshotCandidate);
    if (!payload || !isValidSnapshot(payload)) {
      setError('profiles.errorInvalidSnapshot');
      throw new Error(INVALID_SNAPSHOT_MESSAGE);
    }

    const currentSnapshot = collectSnapshot();
    const currentPagesConfig = currentSnapshot?.layout?.pagesConfig;
    const normalizedSnapshot = {
      ...cloneJson(payload, {}),
      layout: {
        // Cast: isValidSnapshot confirmed payload is an object with a layout.
        ...cloneJson((payload as JsonRecord).layout, {}),
      },
    };

    const { pagesConfig, notes } = normalizePagesConfig(
      normalizedSnapshot.layout.pagesConfig,
      currentPagesConfig
    );

    normalizedSnapshot.layout.pagesConfig = pagesConfig;
    applySnapshot(normalizedSnapshot, contextSettersRef.current);

    if (notes.length > 0) {
      setLoadSummary(notes);
    }
  }, []);

  const exportDashboard = useCallback(() => {
    setError(null);
    const snapshot = collectSnapshot();
    if (!isValidSnapshot(snapshot)) {
      setError('profiles.errorInvalidSnapshot');
      throw new Error(INVALID_SNAPSHOT_MESSAGE);
    }

    return {
      format: 'tunet-dashboard-export',
      version: 1,
      exported_at: new Date().toISOString(),
      data: snapshot,
    };
  }, []);

  // ── Edit profile name/label (no data change) ──
  const editProfile = useCallback(
    async (profileId: string, name: string, deviceLabel?: string | null) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const updated = await apiUpdateProfile(profileId, {
          ha_user_id: haUser.id,
          name,
          device_label: deviceLabel || null,
        });
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
        return updated;
      } catch (err) {
        setError(profileErrorKey(err, 'profiles.errorSaveFailed'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Delete a profile ──
  const removeProfile = useCallback(
    async (profileId: string) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        await apiDeleteProfile(profileId, haUser.id);
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      } catch (err) {
        setError(profileErrorKey(err, 'profiles.errorDeleteFailed'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Start blank (reset dashboard layout) ──
  const startBlank = useCallback(() => {
    const current = collectSnapshot();
    const blank = {
      version: 1,
      layout: {
        pagesConfig: { header: [], pages: ['home'], home: [] },
        cardSettings: {},
        hiddenCards: [],
        customNames: {},
        customIcons: {},
        pageSettings: {},
        gridColumns: 4,
        gridGapH: 20,
        gridGapV: 20,
        cardBorderRadius: 16,
        headerSettings: { showTitle: true, showClock: true, showDate: true },
        headerTitle: '',
        headerScale: 1,
        sectionSpacing: { headerToStatus: 16, statusToNav: 24, navToGrid: 24 },
        statusPillsConfig: [],
      },
      appearance: current.appearance,
    };
    applySnapshot(blank, contextSettersRef.current);
  }, []);

  return {
    profiles,
    loading,
    error,
    loadSummary,
    backendAvailable,
    saveProfile,
    overwriteProfile,
    editProfile,
    loadProfile,
    importDashboard,
    exportDashboard,
    removeProfile,
    startBlank,
    refreshProfiles,
    isValidSnapshot,
    autoSync,
  };
}
