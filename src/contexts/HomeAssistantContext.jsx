import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createConnection, createLongLivedTokenAuth, subscribeEntities, getAuth } from 'home-assistant-js-websocket';
import { saveTokens, loadTokens, clearOAuthTokens, hasOAuthTokens } from '../services/oauthStorage';

/** @typedef {import('../types/dashboard').EntityMap} EntityMap */
/** @typedef {import('../types/dashboard').HomeAssistantContextValue} HomeAssistantContextValue */
/** @typedef {import('../types/dashboard').HomeAssistantProviderProps} HomeAssistantProviderProps */
/** @typedef {Omit<HomeAssistantContextValue, 'entities'>} HomeAssistantMetaValue */

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
  const [entities, setEntities] = useState({});
  const pendingRef = useRef(null);
  const rafRef = useRef(null);

  const setEntitiesThrottled = useCallback((updatedEntities) => {
    pendingRef.current = updatedEntities;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) {
          setEntities(pendingRef.current);
        }
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
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
  const authRef = useRef(null);
  const connectionRef = useRef(null);
  const unsubscribeEntitiesRef = useRef(null);
  const connectAttemptRef = useRef(0);

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
  }, []);

  // Connect to Home Assistant
  useEffect(() => {
    const isOAuth = config.authMethod === 'oauth';
    const hasToken = !!config.token;
    const hasOAuth = hasOAuthTokens();
    const isOAuthCallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('auth_callback');

    if (!config.url) {
      cleanupConnection();
      setConnected(false);
      return;
    }

    // For token mode, require token
    if (!isOAuth && !hasToken) {
      cleanupConnection();
      setConnected(false);
      return;
    }
    // For oauth mode, require stored tokens OR an active callback in the URL
    if (isOAuth && !hasOAuth && !isOAuthCallback && !config.isIngress) {
      cleanupConnection();
      setConnected(false);
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

    /** Fetch the authenticated HA user after connecting */
    async function fetchCurrentUser(connInstance) {
      try {
        const user = await connInstance.sendMessagePromise({ type: 'auth/current_user' });
        if (isCurrentAttempt() && user) {
          setHaUser({ id: user.id, name: user.name, is_owner: user.is_owner, is_admin: user.is_admin });
        }
      } catch (err) {
        const resultError = err?.error || err;
        const errorCode = resultError?.code;
        const errorMessage = String(resultError?.message || '').toLowerCase();
        const isUnsupportedCommand =
          errorCode === 'unknown_command'
          || errorCode === 'not_found'
          || errorMessage.includes('unknown command')
          || errorMessage.includes('not found')
          || errorMessage.includes('auth/current_user');

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
          errorCode === 'unknown_command'
          || errorCode === 'not_found'
          || errorCode === 'unauthorized'
          || errorCode === 'forbidden'
          || errorMessage.includes('unknown command')
          || errorMessage.includes('not found')
          || errorMessage.includes('unauthorized')
          || errorMessage.includes('forbidden')
          || errorMessage.includes('get_config');

        if (isCurrentAttempt()) {
          setHaConfig(null);
        }

        if (!isUnsupportedCommand) return;
      }
    }
    


    const persistConfig = (urlUsed) => {
      try {
        localStorage.setItem('ha_url', urlUsed.replace(/\/$/, ''));
        if (!isOAuth) {
          localStorage.setItem('ha_token', config.token || '');
          window.sessionStorage.removeItem('ha_token');
        }
        localStorage.setItem('ha_auth_method', config.authMethod || 'token');
        if (config.fallbackUrl) localStorage.setItem('ha_fallback_url', config.fallbackUrl.replace(/\/$/, ''));
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
      setActiveUrl(url);
      persistConfig(url);
      fetchCurrentUser(connInstance);
      const unsub = subscribeEntities(connInstance, (updatedEntities) => {
        if (isCurrentAttempt()) {
          setEntities(updatedEntities);
          setEntitiesLoaded(true);
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
      if (window.location.search.includes('auth_callback')) {
        window.history.replaceState(null, '', window.location.pathname);
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
      setActiveUrl(url);
      persistConfig(url);
      fetchHaConfig(connInstance);
      fetchCurrentUser(connInstance);
      const unsub = subscribeEntities(connInstance, (updatedEntities) => {
        if (isCurrentAttempt()) {
          setEntities(updatedEntities);
          setEntitiesLoaded(true);
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
        if (cancelled) return;

        // For OAuth, if auth is invalid, clear tokens and flag expiry
        if (isOAuth && err?.message?.includes?.('INVALID_AUTH')) {
          clearOAuthTokens();
          if (isCurrentAttempt()) {
            setConnected(false);
            setHaUnavailable(true);
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
  }, [config.url, config.fallbackUrl, config.token, config.authMethod, config.isIngress, cleanupConnection, setEntities]);

  // Handle connection events
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;

    const handleReady = () => {
      if (!cancelled) {
        setConnected(true);
        setHaUnavailable(false);
      }
    };
    const handleDisconnected = () => {
      if (!cancelled) {
        setConnected(false);
        setHaUnavailable(true);
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

  // Show unavailable banner after delay
  useEffect(() => {
    if (!haUnavailable) {
      setHaUnavailableVisible(false);
      return;
    }
    const timer = setTimeout(() => setHaUnavailableVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [haUnavailable]);

  /** @type {HomeAssistantMetaValue} */
  const metaValue = useMemo(() => ({
    entitiesLoaded,
    connected,
    haUnavailable,
    haUnavailableVisible,
    oauthExpired,
    conn,
    activeUrl,
    haConfig,
    authRef,
    haUser,
  }), [entitiesLoaded, connected, haUnavailable, haUnavailableVisible, oauthExpired, conn, activeUrl, haConfig, haUser]);

  return (
    <HomeAssistantMetaContext.Provider value={metaValue}>
      <HomeAssistantEntitiesContext.Provider value={entities}>
        {children}
      </HomeAssistantEntitiesContext.Provider>
    </HomeAssistantMetaContext.Provider>
  );
};
