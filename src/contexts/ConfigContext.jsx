import { createContext, useContext, useState, useEffect } from 'react';
import { themes } from '../themes';

const ConfigContext = createContext(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tunet_theme');
      return (saved && themes[saved]) ? saved : 'dark';
    }
    return 'dark';
  });

  const [language, setLanguage] = useState(() => 
    localStorage.getItem('tunet_language') || 'nn'
  );

  const [inactivityTimeout, setInactivityTimeout] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tunet_inactivity_timeout');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
    return 60;
  });


  const [config, setConfig] = useState({
    url: typeof window !== 'undefined' ? localStorage.getItem('ha_url') || '' : '',
    fallbackUrl: typeof window !== 'undefined' ? localStorage.getItem('ha_fallback_url') || '' : '',
    token: typeof window !== 'undefined' ? localStorage.getItem('ha_token') || '' : ''
  });

  // Apply theme to DOM
  useEffect(() => {
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const theme = themes[themeKey].colors;
    for (const key in theme) {
      document.documentElement.style.setProperty(key, theme[key]);
    }
    document.documentElement.style.backgroundColor = theme['--bg-primary'];
    document.body.style.backgroundColor = theme['--bg-primary'];
    document.documentElement.dataset.theme = themeKey;
    document.documentElement.style.colorScheme = themeKey === 'dark' ? 'dark' : 'light';
    
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme['--bg-primary'];
    
    localStorage.setItem('tunet_theme', themeKey);
  }, [currentTheme]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem('tunet_language', language);
  }, [language]);


  const toggleTheme = () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  const value = {
    currentTheme,
    setCurrentTheme,
    toggleTheme,
    language,
    setLanguage,
    inactivityTimeout,
    setInactivityTimeout,
    config,
    setConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
