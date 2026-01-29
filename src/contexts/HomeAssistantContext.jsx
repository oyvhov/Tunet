import { createContext, useContext, useState, useEffect, useRef } from 'react';

const HomeAssistantContext = createContext(null);

export const useHomeAssistant = () => {
  const context = useContext(HomeAssistantContext);
  if (!context) {
    throw new Error('useHomeAssistant must be used within HomeAssistantProvider');
  }
  return context;
};

export const HomeAssistantProvider = ({ children, config }) => {
  const [entities, setEntities] = useState({});
  const [connected, setConnected] = useState(false);
  const [haUnavailable, setHaUnavailable] = useState(false);
  const [haUnavailableVisible, setHaUnavailableVisible] = useState(false);
  const [libLoaded, setLibLoaded] = useState(false);
  const [conn, setConn] = useState(null);
  const [activeUrl, setActiveUrl] = useState(config.url);

  // Load Home Assistant WebSocket library
  useEffect(() => {
    if (window.HAWS) { 
      setLibLoaded(true); 
      return; 
    }
    const script = document.createElement('script');
    script.src = "https://unpkg.com/home-assistant-js-websocket@latest/dist/haws.umd.js";
    script.async = true;
    script.onload = () => setLibLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Connect to Home Assistant
  useEffect(() => {
    if (!libLoaded || !config.url || !config.token) {
      if (!config.token && connected) {
        setConnected(false);
      }
      return;
    }

    let connection;
    let cancelled = false;
    const { createConnection, createLongLivedTokenAuth, subscribeEntities } = window.HAWS;

    const persistConfig = (urlUsed) => {
      localStorage.setItem('ha_url', urlUsed.replace(/\/$/, ''));
      localStorage.setItem('ha_token', config.token);
      if (config.fallbackUrl) localStorage.setItem('ha_fallback_url', config.fallbackUrl.replace(/\/$/, ''));
    };

    async function connectWith(url) {
      const auth = createLongLivedTokenAuth(url, config.token);
      const connInstance = await createConnection({ auth });
      if (cancelled) { 
        connInstance.close(); 
        return null; 
      }
      connection = connInstance;
      setConn(connInstance);
      setConnected(true);
      setHaUnavailable(false);
      setActiveUrl(url);
      persistConfig(url);
      subscribeEntities(connInstance, (updatedEntities) => { 
        if (!cancelled) setEntities(updatedEntities); 
      });
      return connInstance;
    }

    async function connect() {
      try {
        await connectWith(config.url);
      } catch (err) { 
        if (config.fallbackUrl) {
          try {
            await connectWith(config.fallbackUrl);
            return;
          } catch (e) {
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
  }, [libLoaded, config.url, config.fallbackUrl, config.token]);

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
    libLoaded,
    conn,
    activeUrl,
  };

  return (
    <HomeAssistantContext.Provider value={value}>
      {children}
    </HomeAssistantContext.Provider>
  );
};
