import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_PAGES_CONFIG } from '../defaults';

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
};

const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const readNumber = (key, fallback) => {
  const raw = localStorage.getItem(key);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const deprecatedCardIds = ['power', 'rocky', 'climate', 'shield', 'weather', 'car'];

const PageContext = createContext(null);

export const usePages = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePages must be used within PageProvider');
  }
  return context;
};

export const PageProvider = ({ children }) => {
  const [pagesConfig, setPagesConfig] = useState(DEFAULT_PAGES_CONFIG);
  const [cardSettings, setCardSettings] = useState({});
  const [customNames, setCustomNames] = useState({});
  const [customIcons, setCustomIcons] = useState({});
  const [hiddenCards, setHiddenCards] = useState([]);
  const [pageSettings, setPageSettings] = useState({});
  const [gridColumns, setGridColumns] = useState(3);
  const [headerScale, setHeaderScale] = useState(1);
  const [headerTitle, setHeaderTitle] = useState(() => 
    localStorage.getItem('tunet_header_title') || ''
  );

  // Load configuration from localStorage
  useEffect(() => {
    const parsed = readJSON('tunet_pages_config', null);
    if (parsed) {
      let modified = false;

      // Remove legacy automations/lights page config entirely
      if (parsed.automations) {
        delete parsed.automations;
        modified = true;
      }
      if (parsed.lights) {
        delete parsed.lights;
        modified = true;
      }

      // Remove deprecated cards
      Object.keys(parsed).forEach(pageKey => {
        if (Array.isArray(parsed[pageKey])) {
          const filtered = parsed[pageKey].filter(id => 
            !deprecatedCardIds.includes(id) && !String(id).startsWith('energy_price_')
          );
          if (filtered.length !== parsed[pageKey].length) {
            parsed[pageKey] = filtered;
            modified = true;
          }
        }
      });

      // Ensure pages array exists
      if (!Array.isArray(parsed.pages)) {
        const detectedPages = Object.keys(parsed)
          .filter(key => Array.isArray(parsed[key]) && 
            !['header', 'settings', 'lights', 'automations'].includes(key));
        parsed.pages = detectedPages.length > 0 ? detectedPages : ['home'];
        modified = true;
      }

      // Filter out settings, automations, and lights from pages (no separate lights/automations pages)
      parsed.pages = parsed.pages.filter(id => id !== 'settings' && id !== 'lights' && id !== 'automations');
      if (parsed.pages.length === 0) {
        parsed.pages = ['home'];
        modified = true;
      }

      // Ensure all pages have arrays
      parsed.pages.forEach((pageId) => {
        if (!Array.isArray(parsed[pageId])) {
          parsed[pageId] = [];
          modified = true;
        }
      });

      // Ensure header exists
      if (!parsed.header) {
        parsed.header = [];
        modified = true;
      }

      setPagesConfig(parsed);
      if (modified) {
        writeJSON('tunet_pages_config', parsed);
      }
    }

    const hidden = readJSON('tunet_hidden_cards', null);
    if (hidden) {
      const filteredHidden = hidden.filter(id => !deprecatedCardIds.includes(id));
      setHiddenCards(filteredHidden);
    }

    const names = readJSON('tunet_custom_names', null);
    if (names) setCustomNames(names);

    const icons = readJSON('tunet_custom_icons', null);
    if (icons) setCustomIcons(icons);

    const savedCols = readNumber('tunet_grid_columns', null);
    if (savedCols !== null) setGridColumns(savedCols);

    const savedScale = readNumber('tunet_header_scale', null);
    if (savedScale !== null) setHeaderScale(savedScale);

    const pageSettingsSaved = readJSON('tunet_page_settings', null);
    if (pageSettingsSaved) setPageSettings(pageSettingsSaved);

    const cardSettingsSaved = readJSON('tunet_card_settings', null);
    if (cardSettingsSaved) setCardSettings(cardSettingsSaved);
  }, []);

  const saveCustomName = (id, name) => {
    const newNames = { ...customNames, [id]: name };
    setCustomNames(newNames);
    writeJSON('tunet_custom_names', newNames);
  };

  const saveCustomIcon = (id, iconName) => {
    const newIcons = { ...customIcons, [id]: iconName };
    setCustomIcons(newIcons);
    writeJSON('tunet_custom_icons', newIcons);
  };

  const saveCardSetting = (id, setting, value) => {
    const newSettings = { ...cardSettings, [id]: { ...cardSettings[id], [setting]: value } };
    setCardSettings(newSettings);
    writeJSON('tunet_card_settings', newSettings);
  };

  const savePageSetting = (id, setting, value) => {
    const newSettings = { 
      ...pageSettings, 
      [id]: { ...(pageSettings[id] || {}), [setting]: value } 
    };
    setPageSettings(newSettings);
    writeJSON('tunet_page_settings', newSettings);
  };

  const persistPageSettings = (newSettings) => {
    setPageSettings(newSettings);
    writeJSON('tunet_page_settings', newSettings);
  };

  const persistCardSettings = (newSettings) => {
    setCardSettings(newSettings);
    writeJSON('tunet_card_settings', newSettings);
  };

  const toggleCardVisibility = (cardId) => {
    const newHidden = hiddenCards.includes(cardId) 
      ? hiddenCards.filter(id => id !== cardId)
      : [...hiddenCards, cardId];
    setHiddenCards(newHidden);
    writeJSON('tunet_hidden_cards', newHidden);
  };

  const updateHeaderScale = (newScale) => {
    setHeaderScale(newScale);
    localStorage.setItem('tunet_header_scale', String(newScale));
  };

  const updateHeaderTitle = (newTitle) => {
    setHeaderTitle(newTitle);
    localStorage.setItem('tunet_header_title', newTitle);
  };

  const [headerSettings, setHeaderSettings] = useState(() => {
    const saved = readJSON('tunet_header_settings');
    return saved || { showTitle: true, showClock: true, showDate: true };
  });

  const updateHeaderSettings = (newSettings) => {
    setHeaderSettings(newSettings);
    writeJSON('tunet_header_settings', newSettings);
  };

  const [statusPillsConfig, setStatusPillsConfig] = useState(() => 
    readJSON('tunet_status_pills_config', [])
  );

  const saveStatusPillsConfig = (newConfig) => {
    setStatusPillsConfig(newConfig);
    writeJSON('tunet_status_pills_config', newConfig);
  };

  const persistConfig = (newConfig) => {
    setPagesConfig(newConfig);
    writeJSON('tunet_pages_config', newConfig);
  };

  const value = {
    pagesConfig,
    setPagesConfig,
    persistConfig,
    cardSettings,
    setCardSettings,
    saveCardSetting,
    customNames,
    saveCustomName,
    customIcons,
    saveCustomIcon,
    hiddenCards,
    toggleCardVisibility,
    pageSettings,
    setPageSettings,
    persistPageSettings,
    savePageSetting,
    gridColumns,
    setGridColumns,
    headerScale,
    updateHeaderScale,
    headerTitle,
    updateHeaderTitle,
    headerSettings,
    updateHeaderSettings,
    persistCardSettings,
    statusPillsConfig,
    saveStatusPillsConfig,
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};
