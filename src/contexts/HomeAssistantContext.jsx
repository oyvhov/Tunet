import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createConnection, createLongLivedTokenAuth, subscribeEntities, getAuth } from 'home-assistant-js-websocket';
import { createIngressAuth } from '../services/haClient';
import { saveTokens, loadTokens, clearOAuthTokens, hasOAuthTokens } from '../services/oauthStorage';

const HomeAssistantContext = createContext(null);

export const useHomeAssistant = () => {
  const context = useContext(HomeAssistantContext);
  if (!context) {
    throw new Error('useHomeAssistant must be used within HomeAssistantProvider');
  }
  return context;
};

/**
 * Throttled state setter — batches rapid HA entity updates into a single
 * React render per animation frame, preventing full-tree re-renders on
 * every WebSocket message.
 */
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

export const HomeAssistantProvider = ({ children, config }) => {
  const [entities, setEntities] = useThrottledEntities();
  const [connected, setConnected] = useState(false);
  const [haUnavailable, setHaUnavailable] = useState(false);
  const [haUnavailableVisible, setHaUnavailableVisible] = useState(false);
  const [oauthExpired, setOauthExpired] = useState(false);
  const [conn, setConn] = useState(null);
  const [activeUrl, setActiveUrl] = useState(config.url);
  const [haUser, setHaUser] = useState(null);
  const authRef = useRef(null);

  // Connect to Home Assistant
  useEffect(() => {
    const isOAuth = config.authMethod === 'oauth';
    const hasToken = !!config.token;
    const hasOAuth = hasOAuthTokens();
    const isOAuthCallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('auth_callback');

    if (!config.url) {
      return;
    }

    // For token mode, require token
    if (!isOAuth && !hasToken) {
      if (connected) setConnected(false);
      return;
    }
    // For oauth mode, require stored tokens OR an active callback in the URL
    // (Ingress uses OAuth — user already has an active HA session, skip token check)
    if (isOAuth && !hasOAuth && !isOAuthCallback && !config.isIngress) {
      if (connected) setConnected(false);
      return;
    }

    let connection;
    let cancelled = false;
    setOauthExpired(false);

    /** Fetch the authenticated HA user after connecting */
    async function fetchCurrentUser(connInstance) {
      try {
        const user = await connInstance.sendMessagePromise({ type: 'auth/current_user' });
        if (!cancelled && user) {
          setHaUser({ id: user.id, name: user.name, is_owner: user.is_owner, is_admin: user.is_admin });
        }
      } catch (err) {
        console.warn('Failed to fetch HA user:', err);
      }
    }
    


    const persistConfig = (urlUsed) => {
      try {
        localStorage.setItem('ha_url', urlUsed.replace(/\/$/, ''));
        if (!isOAuth) localStorage.setItem('ha_token', config.token);
        localStorage.setItem('ha_auth_method', config.authMethod || 'token');
        if (config.fallbackUrl) localStorage.setItem('ha_fallback_url', config.fallbackUrl.replace(/\/$/, ''));
      } catch (error) {
        console.error('Failed to persist HA config to localStorage:', error);
      }
    };

    async function connectWithToken(url) {
      const auth = createLongLivedTokenAuth(url, config.token);
      const connInstance = await createConnection({ auth });
      if (cancelled) { 
        connInstance.close(); 
        return null; 
      }
      connection = connInstance;
      authRef.current = auth;
      setConn(connInstance);
      setConnected(true);
      setHaUnavailable(false);
      setActiveUrl(url);
      persistConfig(url);
      fetchCurrentUser(connInstance);
      subscribeEntities(connInstance, (updatedEntities) => { 
        if (!cancelled) setEntities(updatedEntities); 
      });
      return connInstance;
    }

    async function connectWithIngress(url) {
      const auth = createIngressAuth(url);
      try {
        const connInstance = await createConnection({ auth });
        
        if (cancelled) {
          connInstance.close();
          return null;
        }

        connection = connInstance;
        authRef.current = auth;
        setConn(connInstance);
        setConnected(true);
        setHaUnavailable(false);
        setActiveUrl(url);
        // Do not persist config for Ingress, as it is derived from environment
        // persistConfig(url); 
        
        fetchCurrentUser(connInstance);
        subscribeEntities(connInstance, (updatedEntities) => {
          if (!cancelled) setEntities(updatedEntities);
        });
        return connInstance;
      } catch (err) {
        console.error('Ingress connection failed:', err);
        setConnected(false);
        setHaUnavailable(true);
        throw err;
      }
    }

    async function connectWithOAuth(url) {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
      const auth = await getAuth({
        hassUrl: url,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
        clientId: typeof window !== 'undefined' ? window.location.origin : undefined,
        redirectUrl,
      });
      // Clean up OAuth callback params from URL after successful auth
      if (window.location.search.includes('auth_callback')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      const connInstance = await createConnection({ auth });
      if (cancelled) {
        connInstance.close();
        return null;
      }
      connection = connInstance;
      authRef.current = auth;
      setConn(connInstance);
      setConnected(true);
      setHaUnavailable(false);
      setActiveUrl(url);
      persistConfig(url);
      fetchCurrentUser(connInstance);
      subscribeEntities(connInstance, (updatedEntities) => {
        if (!cancelled) setEntities(updatedEntities);
      });
      return connInstance;
    }

    async function connect() {
      try {
        if (config.isIngress) {
            await connectWithIngress(config.url);
        } else if (isOAuth) {
          await connectWithOAuth(config.url);
        } else {
          await connectWithToken(config.url);
        }
      } catch (err) {
        if (cancelled) return;

        // For OAuth, if auth is invalid, clear tokens and flag expiry
        if (isOAuth && err?.message?.includes?.('INVALID_AUTH')) {
          clearOAuthTokens();
          if (!cancelled) {
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
            if (cancelled) return;
            console.error('Fallback connection failed:', e);
          }
        }
        if (!cancelled) {
          setConnected(false);
          setHaUnavailable(true);
        }
      }
    }

    connect();
    return () => { 
      cancelled = true; 
      if (connection) connection.close(); 
    };
  }, [config.url, config.fallbackUrl, config.token, config.authMethod]);

  // Handle connection events
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;

    const handleReady = () => {
      if (!cancelled) setHaUnavailable(false);
    };
    const handleDisconnected = () => {
      if (!cancelled) setHaUnavailable(true);
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

  const value = {
    entities,
    connected,
    haUnavailable,
    haUnavailableVisible,
    oauthExpired,
    conn,
    activeUrl,
    authRef,
    haUser,
  };

  return (
    <HomeAssistantContext.Provider value={value}>
      {children}
    </HomeAssistantContext.Provider>
  );
};
