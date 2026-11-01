import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  getAuth,
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
} from 'home-assistant-js-websocket';
import type { Auth, Connection, HassEntities, UnsubscribeFunc } from 'home-assistant-js-websocket';
import type { ReactElement } from 'react';
import { saveTokens, loadTokens, hasOAuthTokens } from '../services/oauthStorage';
import {
  HOME_ASSISTANT_API_UNAUTHORIZED_EVENT,
  isHomeAssistantAuthError,
  notifyHomeAssistantApiUnauthorized,
  setOAuthAuthProvider,
} from '../services/apiAuth';
import { getDeviceRegistry, getEntityRegistry } from '../services/haClient';
import type { DeviceRegistryEntry, EntityRegistryEntry } from '../services/haClient';
import { validateUrl } from '../config/onboarding';
import { getParentHaAuth } from '../services/haParentSession';
import { useMobileConnectionRecovery } from '../hooks/useMobileConnectionRecovery';
import {
  buildRegistryLookupMap,
  enrichEntitiesWithRegistryMetadata,
  getConnectionWarningDelayMs,
  isEntityDataStale,
} from '../utils';

import type {
  EntityMap,
  HomeAssistantContextValue,
  HomeAssistantProviderProps,
} from '../types/dashboard';

export type HomeAssistantMetaValue = Omit<HomeAssistantContextValue, 'entities'>;

// Shape of a rejected HA command: a {code, message} result, possibly wrapped in `error`.
// Optional chaining keeps non-object throwables (e.g. ERR_* numbers) yielding undefined fields.
type HaErrorLike = { error?: HaErrorLike; code?: unknown; message?: unknown } | null | undefined;

const ENTITY_CACHE_KEY = 'tunet_entity_snapshot';
const ENTITY_CACHE_MAX_AGE_MS = 5 * 60_000; // 5 minutes — stale snapshots are discarded

/** Read cached entity snapshot from sessionStorage (returns {} if absent/expired). */
function loadCachedEntities(): EntityMap {
  try {
    const raw = globalThis.sessionStorage.getItem(ENTITY_CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ENTITY_CACHE_MAX_AGE_MS) {
      globalThis.sessionStorage.removeItem(ENTITY_CACHE_KEY);
      return {};
    }
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/** Persist entity snapshot to sessionStorage (best-effort, never throws). */
function saveCachedEntities(entities: EntityMap): void {
  try {
    globalThis.sessionStorage.setItem(
      ENTITY_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: entities })
    );
  } catch {
    // Storage full / private mode — ignore silently
  }
}

const HomeAssistantEntitiesContext = createContext<EntityMap | null>(null);
const HomeAssistantMetaContext = createContext<HomeAssistantMetaValue | null>(null);

export const useHomeAssistantEntities = (): EntityMap => {
  const context = useContext(HomeAssistantEntitiesContext);
  if (!context) {
    throw new Error('useHomeAssistantEntities must be used within HomeAssistantProvider');
  }
  return context;
};

export const useHomeAssistantMeta = (): HomeAssistantMetaValue => {
  const context = useContext(HomeAssistantMetaContext);
  if (!context) {
    throw new Error('useHomeAssistantMeta must be used within HomeAssistantProvider');
  }
  return context;
};

export const useHomeAssistant = (): HomeAssistantContextValue => {
  const entities = useHomeAssistantEntities();
  const meta = useHomeAssistantMeta();
  return useMemo(() => ({ entities, ...meta }), [entities, meta]);
};

/**
 * Throttled state setter — batches rapid HA entity updates into a single
 * React render per animation frame, preventing full-tree re-renders on
 * every WebSocket message.
 */
function useThrottledEntities(): [EntityMap, (updatedEntities: EntityMap) => void] {
  const [entities, setEntities] = useState<EntityMap>(loadCachedEntities);
  const pendingRef = useRef<EntityMap | null>(null);
  const rafRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntitiesThrottled = useCallback((updatedEntities: EntityMap) => {
    pendingRef.current = updatedEntities;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) {
          setEntities(pendingRef.current);
          // Debounce sessionStorage writes to once per 10 s
          if (saveTimerRef.current == null) {
            saveTimerRef.current = setTimeout(() => {
              saveTimerRef.current = null;
              if (pendingRef.current) saveCachedEntities(pendingRef.current);
            }, 10_000);
          }
        }
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return [entities, setEntitiesThrottled];
}

export const HomeAssistantProvider = ({
  children,
  config,
}: HomeAssistantProviderProps): ReactElement => {
  const [entities, setEntities] = useThrottledEntities();
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [haUnavailable, setHaUnavailable] = useState(false);
  const [haUnavailableVisible, setHaUnavailableVisible] = useState(false);
  const [oauthExpired, setOauthExpired] = useState(false);
  const [conn, setConn] = useState<Connection | null>(null);
  const [activeUrl, setActiveUrl] = useState(config.url);
  const [haUser, setHaUser] = useState<HomeAssistantMetaValue['haUser']>(null);
  const [haConfig, setHaConfig] = useState<HomeAssistantMetaValue['haConfig']>(null);
  const [entityDataStale, setEntityDataStale] = useState(false);
  const [lastEntityUpdateAt, setLastEntityUpdateAt] = useState(0);
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
  const authRef = useRef<Auth | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  const unsubscribeEntitiesRef = useRef<UnsubscribeFunc | null>(null);
  const connectAttemptRef = useRef(0);
  const rawEntitiesRef = useRef<EntityMap>(entities);
  const entityRegistryByIdRef = useRef(new Map<string, EntityRegistryEntry>());
  const deviceRegistryByIdRef = useRef(new Map<string, DeviceRegistryEntry>());

  const markConnectionHealthy = useCallback(() => {
    setConnected(true);
    setHaUnavailable(false);
    setDisconnectedSince(null);
  }, []);

  const markConnectionRecovering = useCallback(() => {
    setConnected(false);
    setHaUnavailable(true);
    setDisconnectedSince((current) => current ?? Date.now());
  }, []);

  useMobileConnectionRecovery({
    conn,
    onHealthy: markConnectionHealthy,
    onRecovering: markConnectionRecovering,
  });

  const applyRegistryMetadata = useCallback(
    (nextEntities: EntityMap): EntityMap =>
      enrichEntitiesWithRegistryMetadata(
        nextEntities,
        entityRegistryByIdRef.current,
        deviceRegistryByIdRef.current
      ),
    []
  );

  const pushEntitySnapshot = useCallback(
    (nextEntities: HassEntities) => {
      rawEntitiesRef.current = nextEntities;
      setEntities(applyRegistryMetadata(nextEntities));
    },
    [applyRegistryMetadata, setEntities]
  );

  useEffect(() => {
    setOAuthAuthProvider(authRef);
    return () => {
      setOAuthAuthProvider(null);
    };
  }, [authRef]);

  const cleanupConnection = useCallback((closeConnection = true) => {
    if (typeof unsubscribeEntitiesRef.current === 'function') {
      try {
        unsubscribeEntitiesRef.current();
      } catch (err) {
        console.warn('[HA] Failed to unsubscribe entities:', err);
      }
      unsubscribeEntitiesRef.current = null;
    }

    if (closeConnection && connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch (err) {
        console.warn('[HA] Failed to close connection:', err);
      }
      connectionRef.current = null;
    }
    setConn(null);
    entityRegistryByIdRef.current = new Map();
    deviceRegistryByIdRef.current = new Map();
  }, []);

  useEffect(() => {
    rawEntitiesRef.current = entities;
  }, [entities]);

  // Connect to Home Assistant
  useEffect(() => {
    const isOAuth = config.authMethod === 'oauth';
    const hasToken = !!config.token;
    // Without a stored token, an Ingress panel signs in with the Home Assistant session around it.
    const useHaSession = !isOAuth && !hasToken && !!config.haSession;
    const hasOAuth = hasOAuthTokens();
    const isOAuthCallback =
      typeof globalThis.window !== 'undefined' &&
      new URLSearchParams(globalThis.window.location.search).has('auth_callback');

    if (!validateUrl(config.url)) {
      cleanupConnection();
      setConnected(false);
      setEntityDataStale(false);
      setDisconnectedSince(null);
      setLastEntityUpdateAt(0);
      return;
    }

    // For token mode, require token
    if (!isOAuth && !hasToken && !useHaSession) {
      cleanupConnection();
      setConnected(false);
      setEntityDataStale(false);
      setDisconnectedSince(null);
      setLastEntityUpdateAt(0);
      return;
    }
    // For oauth mode, require stored tokens OR an active callback in the URL
    if (isOAuth && !hasOAuth && !isOAuthCallback && !config.isIngress) {
      cleanupConnection();
      setConnected(false);
      setEntityDataStale(false);
      setDisconnectedSince(null);
      setLastEntityUpdateAt(0);
      return;
    }

    const attemptId = connectAttemptRef.current + 1;
    connectAttemptRef.current = attemptId;

    let connection: Connection | undefined;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 5000;
    const isCurrentAttempt = () => !cancelled && connectAttemptRef.current === attemptId;

    setConnected(false);
    setEntitiesLoaded(false);
    cleanupConnection();
    setOauthExpired(false);
    setEntityDataStale(false);
    setDisconnectedSince(null);
    setLastEntityUpdateAt(0);

    /** Fetch the authenticated HA user after connecting */
    async function fetchCurrentUser(connInstance: Connection) {
      try {
        const user = await connInstance.sendMessagePromise<
          NonNullable<HomeAssistantMetaValue['haUser']>
        >({ type: 'auth/current_user' });
        if (isCurrentAttempt() && user) {
          setHaUser({
            id: user.id,
            name: user.name,
            is_owner: user.is_owner,
            is_admin: user.is_admin,
          });
        }
      } catch (err) {
        const resultError = (err as HaErrorLike)?.error || (err as HaErrorLike);
        const errorCode = resultError?.code;
        const errorMessage = String(resultError?.message || '').toLowerCase();
        const isUnsupportedCommand =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('auth/current_user');

        if (isCurrentAttempt()) {
          setHaUser(null);
        }

        if (!isUnsupportedCommand) return;
      }
    }

    /** Fetch the HA system config (currency, units, etc.) */
    async function fetchHaConfig(connInstance: Connection) {
      try {
        const conf = await connInstance.sendMessagePromise<
          NonNullable<HomeAssistantMetaValue['haConfig']>
        >({ type: 'get_config' });
        if (isCurrentAttempt() && conf) {
          setHaConfig(conf);
        }
      } catch (err) {
        const resultError = (err as HaErrorLike)?.error || (err as HaErrorLike);
        const errorCode = resultError?.code;
        const errorMessage = String(resultError?.message || '').toLowerCase();
        const isUnsupportedCommand =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorCode === 'unauthorized' ||
          errorCode === 'forbidden' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') ||
          errorMessage.includes('get_config');

        if (isCurrentAttempt()) {
          setHaConfig(null);
        }

        if (!isUnsupportedCommand) return;
      }
    }

    async function fetchRegistryMetadata(connInstance: Connection) {
      try {
        const [deviceRegistry, entityRegistry] = await Promise.all([
          getDeviceRegistry(connInstance),
          getEntityRegistry(connInstance),
        ]);

        if (!isCurrentAttempt()) return;

        entityRegistryByIdRef.current = buildRegistryLookupMap(entityRegistry, 'entity_id');
        deviceRegistryByIdRef.current = buildRegistryLookupMap(deviceRegistry, 'id');

        if (rawEntitiesRef.current && Object.keys(rawEntitiesRef.current).length > 0) {
          setEntities(applyRegistryMetadata(rawEntitiesRef.current));
        }
      } catch (err) {
        const resultError = (err as HaErrorLike)?.error || (err as HaErrorLike);
        const errorCode = resultError?.code;
        const errorMessage = String(resultError?.message || '').toLowerCase();
        const isExpectedRegistryError =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorCode === 'unauthorized' ||
          errorCode === 'forbidden' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') ||
          errorMessage.includes('entity_registry') ||
          errorMessage.includes('device_registry');

        if (!isExpectedRegistryError) {
          console.warn('[HA] Failed to load registry metadata:', err);
        }
      }
    }

    const persistConfig = (urlUsed: string) => {
      try {
        localStorage.setItem('ha_url', urlUsed.replace(/\/$/, ''));
        if (!isOAuth && !useHaSession) {
          localStorage.setItem('ha_token', config.token || '');
          globalThis.sessionStorage.removeItem('ha_token');
        }
        localStorage.setItem('ha_auth_method', config.authMethod || 'token');
        if (config.fallbackUrl)
          localStorage.setItem('ha_fallback_url', config.fallbackUrl.replace(/\/$/, ''));
      } catch (error) {
        console.error('Failed to persist HA config to localStorage:', error);
      }
    };

    async function connectWithToken(url: string): Promise<Connection | null> {
      // Strip trailing /api or /api/ to prevent double /api/api/websocket
      const cleanUrl = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const auth = useHaSession
        ? await getParentHaAuth()
        : createLongLivedTokenAuth(cleanUrl, config.token);
      if (!auth) throw ERR_CANNOT_CONNECT;
      const connInstance = await createConnection({ auth });
      fetchHaConfig(connInstance);
      if (!isCurrentAttempt()) {
        connInstance.close();
        return null;
      }
      connection = connInstance;
      connectionRef.current = connInstance;
      authRef.current = auth;
      setConn(connInstance);
      setConnected(true);
      setHaUnavailable(false);
      setDisconnectedSince(null);
      setActiveUrl(url);
      persistConfig(url);
      fetchCurrentUser(connInstance);
      fetchRegistryMetadata(connInstance);
      const unsub = subscribeEntities(connInstance, (updatedEntities) => {
        if (isCurrentAttempt()) {
          pushEntitySnapshot(updatedEntities);
          setEntitiesLoaded(true);
          setLastEntityUpdateAt(Date.now());
          setEntityDataStale(false);
        }
      });
      unsubscribeEntitiesRef.current = typeof unsub === 'function' ? unsub : null;
      return connInstance;
    }

    async function connectWithOAuth(url: string): Promise<Connection | null> {
      // Let HAWS compute default clientId and redirectUrl so they match
      // the values used during the initial getAuth() redirect in startOAuthLogin.
      // Overriding clientId here (e.g. window.location.origin without trailing
      // slash) caused a mismatch with the HAWS default (origin + '/') and
      // made the token exchange fail.
      const auth = await getAuth({
        hassUrl: url,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
      });
      // Clean up OAuth callback params from URL after successful auth
      if (globalThis.window.location.search.includes('auth_callback')) {
        globalThis.window.history.replaceState(null, '', globalThis.window.location.pathname);
      }
      const connInstance = await createConnection({ auth });
      if (!isCurrentAttempt()) {
        connInstance.close();
        return null;
      }
      connection = connInstance;
      connectionRef.current = connInstance;
      authRef.current = auth;
      setConn(connInstance);
      setConnected(true);
      setHaUnavailable(false);
      setDisconnectedSince(null);
      setActiveUrl(url);
      persistConfig(url);
      fetchHaConfig(connInstance);
      fetchCurrentUser(connInstance);
      fetchRegistryMetadata(connInstance);
      const unsub = subscribeEntities(connInstance, (updatedEntities) => {
        if (isCurrentAttempt()) {
          pushEntitySnapshot(updatedEntities);
          setEntitiesLoaded(true);
          setLastEntityUpdateAt(Date.now());
          setEntityDataStale(false);
        }
      });
      unsubscribeEntitiesRef.current = typeof unsub === 'function' ? unsub : null;
      return connInstance;
    }

    async function connect() {
      try {
        if (isOAuth) {
          await connectWithOAuth(config.url);
        } else {
          await connectWithToken(config.url);
        }
      } catch (err) {
        console.error('[HA] Connection failed:', err);

        // Clean up OAuth callback params on failure so we don't get stuck in a loop
        if (
          isOAuth &&
          typeof globalThis.window !== 'undefined' &&
          globalThis.window.location.search.includes('auth_callback')
        ) {
          globalThis.window.history.replaceState(null, '', globalThis.window.location.pathname);
        }

        if (!isCurrentAttempt()) return;

        // For OAuth, if auth is invalid, clear tokens and flag expiry
        let retryError = err;
        if (isOAuth && isHomeAssistantAuthError(err)) {
          notifyHomeAssistantApiUnauthorized();
          return;
        }

        // Try fallback URL (token mode only)
        if (!isOAuth && config.fallbackUrl) {
          try {
            await connectWithToken(config.fallbackUrl);
            return;
          } catch (e) {
            if (!isCurrentAttempt()) return;
            retryError = e;
            console.error('Fallback connection failed:', e);
          }
        }
        if (isCurrentAttempt()) {
          setConnected(false);
          setHaUnavailable(true);
          setDisconnectedSince(Date.now());
          if (
            retryError === ERR_CANNOT_CONNECT ||
            retryError === ERR_CONNECTION_LOST ||
            retryError instanceof TypeError
          ) {
            retryTimer = setTimeout(() => {
              if (isCurrentAttempt() && (!isOAuth || hasOAuthTokens() || config.isIngress))
                connect();
            }, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60000);
          }
        }
      }
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      if (connection) {
        try {
          connection.close();
        } catch {}
      }
      cleanupConnection();
    };
  }, [
    config.url,
    config.fallbackUrl,
    config.token,
    config.authMethod,
    config.isIngress,
    config.haSession,
    cleanupConnection,
    setEntities,
    applyRegistryMetadata,
    pushEntitySnapshot,
  ]);

  // Handle connection events
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;

    const handleReady = () => {
      if (!cancelled) markConnectionHealthy();
    };
    const handleDisconnected = () => {
      if (!cancelled) markConnectionRecovering();
    };
    const handleReconnectError = (_connection: Connection, error: unknown) => {
      if (!cancelled && config.authMethod === 'oauth' && isHomeAssistantAuthError(error)) {
        notifyHomeAssistantApiUnauthorized();
      }
    };

    conn.addEventListener?.('ready', handleReady);
    conn.addEventListener?.('disconnected', handleDisconnected);
    conn.addEventListener?.('reconnect-error', handleReconnectError);

    return () => {
      cancelled = true;
      conn.removeEventListener?.('ready', handleReady);
      conn.removeEventListener?.('disconnected', handleDisconnected);
      conn.removeEventListener?.('reconnect-error', handleReconnectError);
    };
  }, [conn, config.authMethod, markConnectionHealthy, markConnectionRecovering]);

  useEffect(() => {
    const updateStaleState = () => {
      setEntityDataStale(
        isEntityDataStale({
          entitiesLoaded,
          connected,
          disconnectedSince,
          lastEntityUpdateAt,
        })
      );
    };

    updateStaleState();
    const timer = setInterval(updateStaleState, 5_000);
    return () => clearInterval(timer);
  }, [entitiesLoaded, connected, disconnectedSince, lastEntityUpdateAt]);

  // Delay connection warnings, and restart the grace period when a mobile app resumes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleWarning = () => {
      if (timer) clearTimeout(timer);

      if (!haUnavailable) {
        setHaUnavailableVisible(false);
        return;
      }

      if (oauthExpired) {
        setHaUnavailableVisible(true);
        return;
      }

      setHaUnavailableVisible(false);
      const viewportWidth = globalThis.window?.innerWidth ?? Number.POSITIVE_INFINITY;
      timer = setTimeout(
        () => setHaUnavailableVisible(true),
        getConnectionWarningDelayMs(viewportWidth)
      );
    };

    scheduleWarning();

    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'visible') scheduleWarning();
    };
    globalThis.document?.addEventListener('visibilitychange', handleVisibilityChange);
    globalThis.window?.addEventListener('pageshow', handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      globalThis.document?.removeEventListener('visibilitychange', handleVisibilityChange);
      globalThis.window?.removeEventListener('pageshow', handleVisibilityChange);
    };
  }, [haUnavailable, oauthExpired]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return undefined;

    const handleUnauthorized = (event: Event) => {
      // Dispatched as a CustomEvent by notifyHomeAssistantApiUnauthorized; detail may be absent.
      const authMethod =
        (event as CustomEvent<{ authMethod?: string } | undefined>)?.detail?.authMethod || 'oauth';
      authRef.current = null;
      cleanupConnection();
      setConnected(false);
      setHaUser(null);
      setHaUnavailable(true);
      setDisconnectedSince(Date.now());
      if (authMethod === 'oauth') {
        setOauthExpired(true);
      }
    };

    globalThis.window.addEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      globalThis.window.removeEventListener(
        HOME_ASSISTANT_API_UNAUTHORIZED_EVENT,
        handleUnauthorized
      );
    };
  }, [cleanupConnection]);

  const metaValue = useMemo<HomeAssistantMetaValue>(
    () => ({
      entitiesLoaded,
      connected,
      haUnavailable,
      haUnavailableVisible,
      oauthExpired,
      conn,
      activeUrl,
      haConfig,
      entityDataStale,
      lastEntityUpdateAt,
      disconnectedSince,
      authRef,
      haUser,
    }),
    [
      entitiesLoaded,
      connected,
      haUnavailable,
      haUnavailableVisible,
      oauthExpired,
      conn,
      activeUrl,
      haConfig,
      entityDataStale,
      lastEntityUpdateAt,
      disconnectedSince,
      haUser,
    ]
  );

  return (
    <HomeAssistantMetaContext.Provider value={metaValue}>
      <HomeAssistantEntitiesContext.Provider value={entities}>
        {children}
      </HomeAssistantEntitiesContext.Provider>
    </HomeAssistantMetaContext.Provider>
  );
};
