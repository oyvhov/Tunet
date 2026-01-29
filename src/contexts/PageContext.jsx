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
    localStorage.getItem('midttunet_header_title') || 'Midttunet'
  );

  // Load configuration from localStorage
  useEffect(() => {
    const parsed = readJSON('midttunet_pages_config', null);
    if (parsed) {
      let modified = false;

      // Migration logic for legacy configurations
      if (parsed.automations && Array.isArray(parsed.automations) && 
          (parsed.automations.length === 0 || typeof parsed.automations[0] === 'string')) {
        const flat = parsed.automations;
        const cols = [
          { id: 'col0', title: 'Kolonne 1', cards: [] },
          { id: 'col1', title: 'Kolonne 2', cards: [] },
          { id: 'col2', title: 'Kolonne 3', cards: [] }
        ];
        flat.forEach((id, i) => {
          if (i < 8) cols[0].cards.push(id);
          else if (i < 16) cols[1].cards.push(id);
          else cols[2].cards.push(id);
        });
        parsed.automations = cols;
        modified = true;
      }

      // Remove deprecated cards
      const deprecatedCards = ['power', 'rocky', 'climate', 'shield', 'weather', 'sonos'];
      Object.keys(parsed).forEach(pageKey => {
        if (Array.isArray(parsed[pageKey])) {
          const filtered = parsed[pageKey].filter(id => 
            !deprecatedCards.includes(id) && !String(id).startsWith('energy_price_')
          );
          if (filtered.length !== parsed[pageKey].length) {
            parsed[pageKey] = filtered;
            modified = true;
          }
        }
      });

      // Clean automations columns
      if (parsed.automations && Array.isArray(parsed.automations)) {
        const updatedCols = parsed.automations.map(col => ({
          ...col,
          cards: Array.isArray(col.cards) 
            ? col.cards.filter(id => !deprecatedCards.includes(id)) 
            : col.cards
        }));
        if (JSON.stringify(updatedCols) !== JSON.stringify(parsed.automations)) {
          parsed.automations = updatedCols;
          modified = true;
        }
      }

      // Ensure pages array exists
      if (!Array.isArray(parsed.pages)) {
        const detectedPages = Object.keys(parsed)
          .filter(key => Array.isArray(parsed[key]) && 
            !['header', 'automations', 'settings'].includes(key));
        parsed.pages = detectedPages.length > 0 ? detectedPages : ['home', 'lights'];
        modified = true;
      }

      // Filter out settings and automations from pages
      parsed.pages = parsed.pages.filter(id => id !== 'settings' && id !== 'automations');

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
        writeJSON('midttunet_pages_config', parsed);
      }
    }

    const hidden = readJSON('midttunet_hidden_cards', null);
    if (hidden) {
      const filteredHidden = hidden.filter(id => id !== 'weather');
      setHiddenCards(filteredHidden);
    }

    const names = readJSON('midttunet_custom_names', null);
    if (names) setCustomNames(names);

    const icons = readJSON('midttunet_custom_icons', null);
    if (icons) setCustomIcons(icons);

    const savedCols = readNumber('midttunet_grid_columns', null);
    if (savedCols !== null) setGridColumns(savedCols);

    const savedScale = readNumber('midttunet_header_scale', null);
    if (savedScale !== null) setHeaderScale(savedScale);

    const pageSettingsSaved = readJSON('midttunet_page_settings', null);
    if (pageSettingsSaved) setPageSettings(pageSettingsSaved);

    const cardSettingsSaved = readJSON('midttunet_card_settings', null);
    if (cardSettingsSaved) setCardSettings(cardSettingsSaved);
  }, []);

  const saveCustomName = (id, name) => {
    const newNames = { ...customNames, [id]: name };
    setCustomNames(newNames);
    writeJSON('midttunet_custom_names', newNames);
  };

  const saveCustomIcon = (id, iconName) => {
    const newIcons = { ...customIcons, [id]: iconName };
    setCustomIcons(newIcons);
    writeJSON('midttunet_custom_icons', newIcons);
  };

  const saveCardSetting = (id, setting, value) => {
    const newSettings = { ...cardSettings, [id]: { ...cardSettings[id], [setting]: value } };
    setCardSettings(newSettings);
    writeJSON('midttunet_card_settings', newSettings);
  };

  const savePageSetting = (id, setting, value) => {
    const newSettings = { 
      ...pageSettings, 
      [id]: { ...(pageSettings[id] || {}), [setting]: value } 
    };
    setPageSettings(newSettings);
    writeJSON('midttunet_page_settings', newSettings);
  };

  const persistPageSettings = (newSettings) => {
    setPageSettings(newSettings);
    writeJSON('midttunet_page_settings', newSettings);
  };

  const persistCardSettings = (newSettings) => {
    setCardSettings(newSettings);
    writeJSON('midttunet_card_settings', newSettings);
  };

  const toggleCardVisibility = (cardId) => {
    const newHidden = hiddenCards.includes(cardId) 
      ? hiddenCards.filter(id => id !== cardId)
      : [...hiddenCards, cardId];
    setHiddenCards(newHidden);
    writeJSON('midttunet_hidden_cards', newHidden);
  };

  const updateHeaderScale = (newScale) => {
    setHeaderScale(newScale);
    localStorage.setItem('midttunet_header_scale', String(newScale));
  };

  const updateHeaderTitle = (newTitle) => {
    setHeaderTitle(newTitle);
    localStorage.setItem('midttunet_header_title', newTitle);
  };

  const persistConfig = (newConfig) => {
    setPagesConfig(newConfig);
    writeJSON('midttunet_pages_config', newConfig);
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
    persistCardSettings,
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};
