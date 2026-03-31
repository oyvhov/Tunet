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
} from 'home-assistant-js-websocket';
import { saveTokens, loadTokens, clearOAuthTokens, hasOAuthTokens } from '../services/oauthStorage';
import { HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, setOAuthAuthProvider } from '../services/apiAuth';
import { getDeviceRegistry, getEntityRegistry } from '../services/haClient';
import { buildRegistryLookupMap, enrichEntitiesWithRegistryMetadata, isEntityDataStale } from '../utils';

/** @typedef {import('../types/dashboard').EntityMap} EntityMap */
/** @typedef {import('../types/dashboard').HomeAssistantContextValue} HomeAssistantContextValue */
/** @typedef {import('../types/dashboard').HomeAssistantProviderProps} HomeAssistantProviderProps */
/** @typedef {Omit<HomeAssistantContextValue, 'entities'>} HomeAssistantMetaValue */

const ENTITY_CACHE_KEY = 'tunet_entity_snapshot';
const ENTITY_CACHE_MAX_AGE_MS = 5 * 60_000; // 5 minutes — stale snapshots are discarded

/** Read cached entity snapshot from sessionStorage (returns {} if absent/expired). */
function loadCachedEntities() {
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
function saveCachedEntities(entities) {
  try {
    globalThis.sessionStorage.setItem(
      ENTITY_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: entities })
    );
  } catch {
    // Storage full / private mode — ignore silently
  }
}

/** @type {import('react').Context<EntityMap | null>} */
const HomeAssistantEntitiesContext = createContext(null);
/** @type {import('react').Context<HomeAssistantMetaValue | null>} */
const HomeAssistantMetaContext = createContext(null);

/** @returns {EntityMap} */
export const useHomeAssistantEntities = () => {
  const context = useContext(HomeAssistantEntitiesContext);
  if (!context) {
    throw new Error('useHomeAssistantEntities must be used within HomeAssistantProvider');
  }
  return context;
};

/** @returns {HomeAssistantMetaValue} */
export const useHomeAssistantMeta = () => {
  const context = useContext(HomeAssistantMetaContext);
  if (!context) {
    throw new Error('useHomeAssistantMeta must be used within HomeAssistantProvider');
  }
  return context;
};

/** @returns {HomeAssistantContextValue} */
export const useHomeAssistant = () => {
  const entities = useHomeAssistantEntities();
  const meta = useHomeAssistantMeta();
  return useMemo(() => ({ entities, ...meta }), [entities, meta]);
};

/**
 * Throttled state setter — batches rapid HA entity updates into a single
 * React render per animation frame, preventing full-tree re-renders on
 * every WebSocket message.
 */
/** @returns {[EntityMap, (updatedEntities: EntityMap) => void]} */
function useThrottledEntities() {
  const [entities, setEntities] = useState(loadCachedEntities);
  const pendingRef = useRef(null);
  const rafRef = useRef(null);
  const saveTimerRef = useRef(null);

  const setEntitiesThrottled = useCallback((updatedEntities) => {
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

/** @param {HomeAssistantProviderProps} props */
export const HomeAssistantProvider = ({ children, config }) => {
  const [entities, setEntities] = useThrottledEntities();
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [haUnavailable, setHaUnavailable] = useState(false);
  const [haUnavailableVisible, setHaUnavailableVisible] = useState(false);
  const [oauthExpired, setOauthExpired] = useState(false);
  const [conn, setConn] = useState(null);
  const [activeUrl, setActiveUrl] = useState(config.url);
  const [haUser, setHaUser] = useState(null);
  const [haConfig, setHaConfig] = useState(null);
  const [entityDataStale, setEntityDataStale] = useState(false);
  const [lastEntityUpdateAt, setLastEntityUpdateAt] = useState(0);
  const [disconnectedSince, setDisconnectedSince] = useState(null);
  const authRef = useRef(null);
  const connectionRef = useRef(null);
  const unsubscribeEntitiesRef = useRef(null);
  const connectAttemptRef = useRef(0);
  const rawEntitiesRef = useRef(entities);
  const entityRegistryByIdRef = useRef(new Map());
  const deviceRegistryByIdRef = useRef(new Map());

  const applyRegistryMetadata = useCallback(
    (nextEntities) =>
      enrichEntitiesWithRegistryMetadata(
        nextEntities,
        entityRegistryByIdRef.current,
        deviceRegistryByIdRef.current
      ),
    []
  );

  const pushEntitySnapshot = useCallback(
    (nextEntities) => {
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
    const hasOAuth = hasOAuthTokens();
    const isOAuthCallback =
      typeof globalThis.window !== 'undefined' &&
      new URLSearchParams(globalThis.window.location.search).has('auth_callback');

    if (!config.url) {
      cleanupConnection();
      setConnected(false);
      setEntityDataStale(false);
      setDisconnectedSince(null);
      setLastEntityUpdateAt(0);
      return;
    }

    // For token mode, require token
    if (!isOAuth && !hasToken) {
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

    let connection;
    let cancelled = false;
    const isCurrentAttempt = () => !cancelled && connectAttemptRef.current === attemptId;

    setConnected(false);
    setEntitiesLoaded(false);
    cleanupConnection();
    setOauthExpired(false);
    setEntityDataStale(false);
    setDisconnectedSince(null);
    setLastEntityUpdateAt(0);

    /** Fetch the authenticated HA user after connecting */
    async function fetchCurrentUser(connInstance) {
      try {
        const user = await connInstance.sendMessagePromise({ type: 'auth/current_user' });
        if (isCurrentAttempt() && user) {
          setHaUser({
            id: user.id,
            name: user.name,
            is_owner: user.is_owner,
            is_admin: user.is_admin,
          });
        }
      } catch (err) {
        const resultError = err?.error || err;
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
    async function fetchHaConfig(connInstance) {
      try {
        const conf = await connInstance.sendMessagePromise({ type: 'get_config' });
        if (isCurrentAttempt() && conf) {
          setHaConfig(conf);
        }
      } catch (err) {
        const resultError = err?.error || err;
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

    async function fetchRegistryMetadata(connInstance) {
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
        const resultError = err?.error || err;
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

    const persistConfig = (urlUsed) => {
      try {
        localStorage.setItem('ha_url', urlUsed.replace(/\/$/, ''));
        if (!isOAuth) {
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

    async function connectWithToken(url) {
      // Strip trailing /api or /api/ to prevent double /api/api/websocket
      const cleanUrl = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const auth = createLongLivedTokenAuth(cleanUrl, config.token);
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

    async function connectWithOAuth(url) {
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
        if (isOAuth && typeof globalThis.window !== 'undefined' && globalThis.window.location.search.includes('auth_callback')) {
          globalThis.window.history.replaceState(null, '', globalThis.window.location.pathname);
        }

        if (cancelled) return;

        // For OAuth, if auth is invalid, clear tokens and flag expiry
        if (isOAuth && err?.message?.includes?.('INVALID_AUTH')) {
          clearOAuthTokens();
          if (isCurrentAttempt()) {
            setConnected(false);
            setHaUnavailable(true);
            setDisconnectedSince(Date.now());
            setOauthExpired(true);
          }
          return;
        }

        // Try fallback URL (token mode only)
        if (!isOAuth && config.fallbackUrl) {
          try {
            await connectWithToken(config.fallbackUrl);
            return;
          } catch (e) {
            if (!isCurrentAttempt()) return;
            console.error('Fallback connection failed:', e);
          }
        }
        if (isCurrentAttempt()) {
          setConnected(false);
          setHaUnavailable(true);
          setDisconnectedSince(Date.now());
        }
      }
    }

    connect();
    return () => {
      cancelled = true;
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
      if (!cancelled) {
        setConnected(true);
        setHaUnavailable(false);
        setDisconnectedSince(null);
      }
    };
    const handleDisconnected = () => {
      if (!cancelled) {
        setConnected(false);
        setHaUnavailable(true);
        setDisconnectedSince(Date.now());
      }
    };

    conn.addEventListener?.('ready', handleReady);
    conn.addEventListener?.('disconnected', handleDisconnected);

    return () => {
      cancelled = true;
      conn.removeEventListener?.('ready', handleReady);
      conn.removeEventListener?.('disconnected', handleDisconnected);
    };
  }, [conn]);

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

  // Show unavailable banner after delay
  useEffect(() => {
    if (!haUnavailable) {
      setHaUnavailableVisible(false);
      return;
    }
    const timer = setTimeout(() => setHaUnavailableVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [haUnavailable]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return undefined;

    const handleUnauthorized = (event) => {
      const authMethod = event?.detail?.authMethod || 'oauth';
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
  }, []);

  /** @type {HomeAssistantMetaValue} */
  const metaValue = useMemo(
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
