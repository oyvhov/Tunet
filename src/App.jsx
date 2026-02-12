import { useState, useEffect, useMemo, useRef, lazy } from 'react';
import { en, nn } from './i18n';
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Hash,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Plus,
  Power,
  Settings,
  ToggleRight,
  Trash2,
  Workflow
} from './icons';

import {
  ENTITY_UPDATE_INTERVAL,
  ENTITY_UPDATE_THRESHOLD,
  MEDIA_TIMEOUT,
  MEDIA_TICK_INTERVAL,
  INITIAL_FETCH_DELAY,
  MOBILE_BREAKPOINT
} from './constants';

// Lazy load modals for better performance
const AddPageModal = lazy(() => import('./modals/AddPageModal'));
const AddCardContent = lazy(() => import('./modals/AddCardContent'));
const CalendarModal = lazy(() => import('./modals/CalendarModal'));
const ConfigModal = lazy(() => import('./modals/ConfigModal'));
const CostModal = lazy(() => import('./modals/CostModal'));
const EditCardModal = lazy(() => import('./modals/EditCardModal'));
const EditPageModal = lazy(() => import('./modals/EditPageModal'));
const GenericAndroidTVModal = lazy(() => import('./modals/GenericAndroidTVModal'));
const GenericClimateModal = lazy(() => import('./modals/GenericClimateModal'));
const WeatherModal = lazy(() => import('./modals/WeatherModal'));
const LeafModal = lazy(() => import('./modals/LeafModal'));
const LightModal = lazy(() => import('./modals/LightModal'));
const MediaModal = lazy(() => import('./modals/MediaModal'));
const NordpoolModal = lazy(() => import('./modals/NordpoolModal'));
const PersonModal = lazy(() => import('./modals/PersonModal'));
const SensorModal = lazy(() => import('./modals/SensorModal'));
const StatusPillsConfigModal = lazy(() => import('./modals/StatusPillsConfigModal'));
const TodoModal = lazy(() => import('./modals/TodoModal'));
const RoomModal = lazy(() => import('./modals/RoomModal'));
const VacuumModal = lazy(() => import('./modals/VacuumModal'));

// Sidebars
const ThemeSidebar = lazy(() => import('./components/ThemeSidebar'));
const LayoutSidebar = lazy(() => import('./components/LayoutSidebar'));
const HeaderSidebar = lazy(() => import('./components/HeaderSidebar'));
const SettingsDropdown = lazy(() => import('./components/SettingsDropdown'));

import { Header, StatusBar } from './layouts';

import {
  CalendarCard,
  CarCard,
  TodoCard,
  GenericAndroidTVCard,
  GenericClimateCard,
  GenericEnergyCostCard,
  GenericNordpoolCard,
  LightCard,
  M3Slider,
  MediaPlayerCard,
  MediaGroupCard,
  MediaPage,
  MissingEntityCard,
  ModalSuspense,
  PageNavigation,
  PersonStatus,
  RoomCard,
  SensorCard,
  VacuumCard,
  WeatherTempCard,
  getServerInfo
} from './components';


import {
  HomeAssistantProvider,
  useConfig,
  useHomeAssistant,
  usePages
} from './contexts';

import { useModals, useSmartTheme, useTempHistory } from './hooks';
import { themes } from './themes';
import { formatDuration, isToggleEntity } from './utils';
import { logger } from './utils/logger';
import './dashboard.css';
import { getIconComponent } from './iconMap';
import { buildOnboardingSteps, validateUrl } from './onboarding';
import { callService as haCallService, handleAddSelected, prepareNordpoolData } from './services';
import { isCardRemovable as _isCardRemovable, isCardHiddenByLogic as _isCardHiddenByLogic, isMediaPage as _isMediaPage } from './cardUtils';
import { getCardGridSpan as _getCardGridSpan, buildGridLayout as _buildGridLayout } from './gridLayout';
import { createDragAndDropHandlers } from './dragAndDrop';
import AuroraBackground from './components/AuroraBackground';

function AppContent({ showOnboarding, setShowOnboarding }) {
  const {
    currentTheme,
    setCurrentTheme,
    toggleTheme,
    language,
    setLanguage,
    inactivityTimeout,
    setInactivityTimeout,
    bgMode,
    setBgMode,
    bgColor,
    setBgColor,
    bgGradient,
    setBgGradient,
    bgImage,
    setBgImage,
    cardTransparency,
    setCardTransparency,
    cardBorderOpacity,
    setCardBorderOpacity,
    config,
    setConfig
  } = useConfig();

  const {
    pagesConfig,
    setPagesConfig,
    persistConfig,
    cardSettings,
    saveCardSetting,
    customNames,
    saveCustomName,
    customIcons,
    saveCustomIcon,
    hiddenCards,
    toggleCardVisibility,
    pageSettings,
    persistPageSettings,
    savePageSetting,
    gridColumns,
    setGridColumns,
    gridGapH,
    setGridGapH,
    gridGapV,
    setGridGapV,
    cardBorderRadius,
    setCardBorderRadius,
    headerScale,
    updateHeaderScale,
    headerTitle,
    updateHeaderTitle,
    headerSettings,
    updateHeaderSettings,
    sectionSpacing,
    updateSectionSpacing,
    persistCardSettings,
    statusPillsConfig,
    saveStatusPillsConfig
  } = usePages();

  const {
    entities,
    connected,
    haUnavailable,
    haUnavailableVisible,
    conn,
    activeUrl
  } = useHomeAssistant();
  const translations = useMemo(() => ({ en, nn }), []);
  const nnFallback = useMemo(() => ({
    'system.tabHeader': 'Topptekst',
    'system.tabLayout': 'Oppsett'
  }), []);
  const t = (key) => {
    const value = translations[language]?.[key] ?? translations.nn[key];
    if (value !== undefined) return value;
    if (language === 'nn' && nnFallback[key]) return nnFallback[key];
    return key;
  };
  const resolvedHeaderTitle = headerTitle || t('page.home');
  const [now, setNow] = useState(new Date());
  
  // Modal state management
  const modals = useModals();
  const {
    showNordpoolModal,
    setShowNordpoolModal,
    showCostModal,
    setShowCostModal,
    activeClimateEntityModal,
    setActiveClimateEntityModal,
    showLightModal,
    setShowLightModal,
    activeCarModal,
    setActiveCarModal,
    showPersonModal,
    setShowPersonModal,
    showAndroidTVModal,
    setShowAndroidTVModal,
    showVacuumModal,
    setShowVacuumModal,
    showSensorInfoModal,
    setShowSensorInfoModal,
    showCalendarModal,
    setShowCalendarModal,
    showTodoModal,
    setShowTodoModal,
    showRoomModal,
    setShowRoomModal,
    showWeatherModal,
    setShowWeatherModal,
    activeMediaModal,
    setActiveMediaModal,
    activeMediaGroupKey,
    setActiveMediaGroupKey,
    activeMediaGroupIds,
    setActiveMediaGroupIds,
    activeMediaSessionSensorIds,
    setActiveMediaSessionSensorIds,
    activeMediaId,
    setActiveMediaId,
    showAddCardModal,
    setShowAddCardModal,
    showConfigModal,
    setShowConfigModal,
    showAddPageModal,
    setShowAddPageModal,
    showHeaderEditModal,
    setShowHeaderEditModal,
    showEditCardModal,
    setShowEditCardModal,
    showStatusPillsConfig,
    setShowStatusPillsConfig,
    hasOpenModal,
    closeAllModals,
  } = modals;
  
  const [activeVacuumId, setActiveVacuumId] = useState(null);
  const [configTab, setConfigTab] = useState('connection');
  const [showThemeSidebar, setShowThemeSidebar] = useState(false);
  const [showLayoutSidebar, setShowLayoutSidebar] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingUrlError, setOnboardingUrlError] = useState('');
  const [onboardingTokenError, setOnboardingTokenError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPageIcon, setNewPageIcon] = useState(null);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState(null);
  const [mediaTick, setMediaTick] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [addCardType, setAddCardType] = useState('sensor');
  const [gridColCount, setGridColCount] = useState(1);
  const [isCompactCards, setIsCompactCards] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dragSourceRef = useRef(null);
  const touchTargetRef = useRef(null);
  const [touchTargetId, setTouchTargetId] = useState(null);
  const [touchPath, setTouchPath] = useState(null);
  const touchSwapCooldownRef = useRef(0);
  const pointerDragRef = useRef(false);
  const ignoreTouchRef = useRef(false);
  const [editingPage, setEditingPage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedWeatherId, setSelectedWeatherId] = useState(null);
  const [selectedTempId, setSelectedTempId] = useState(null);
  const [selectedAndroidTVMediaId, setSelectedAndroidTVMediaId] = useState(null);
  const [selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId] = useState(null);
  const [selectedCostTodayId, setSelectedCostTodayId] = useState(null);
  const [selectedCostMonthId, setSelectedCostMonthId] = useState(null);
  const [costSelectionTarget, setCostSelectionTarget] = useState('today');
  const [selectedNordpoolId, setSelectedNordpoolId] = useState(null);
  const [nordpoolDecimals, setNordpoolDecimals] = useState(2);
  const [optimisticLightBrightness, setOptimisticLightBrightness] = useState({});
  const [tempHistoryById, setTempHistoryById] = useTempHistory(conn, cardSettings);

  // Smart Theme Logic — only active when bgMode is 'theme'
  useSmartTheme({ currentTheme, bgMode, entities, now });

  const updateCount = Object.values(entities).filter(e => e.entity_id.startsWith('update.') && e.state === 'on' && !e.attributes.skipped_version).length;
  const resetToHome = () => {
    const isHome = activePage === 'home';
    const noModals = !hasOpenModal() && !editingPage && !editMode;
    
    if (!isHome || !noModals) {
        setActivePage('home');
        closeAllModals();
        setActiveVacuumId(null);
        setEditCardSettingsKey(null);
        setEditingPage(null);
        setEditMode(false);
        setShowStatusPillsConfig(false);
        setShowCalendarModal(false);
        setShowTodoModal(null);
        setShowWeatherModal(null);
    }
  };

  const resetToHomeRef = useRef(resetToHome);
  useEffect(() => {
    resetToHomeRef.current = resetToHome;
  });

  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (!inactivityTimeout || inactivityTimeout <= 0) return;
      inactivityTimer = setTimeout(() => {
        if (resetToHomeRef.current) resetToHomeRef.current();
      }, inactivityTimeout * 1000);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [inactivityTimeout]);

  useEffect(() => {
    if (!showAddCardModal) setSearchTerm('');
  }, [showAddCardModal]);

  useEffect(() => {
    // Reset addCardTargetPage when modal closes, but only if it was set to 'header'
    if (!showAddCardModal && addCardTargetPage === 'header') {
      setAddCardTargetPage(activePage);
    }
  }, [showAddCardModal, activePage, addCardTargetPage]);

  useEffect(() => {
    document.title = resolvedHeaderTitle;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>";

    // Disable zoom
    let meta = document.querySelector("meta[name='viewport']");
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
  }, [resolvedHeaderTitle]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ENTITY_UPDATE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeMediaModal) return;
    setMediaTick(Date.now());
    const intervalId = setInterval(() => setMediaTick(Date.now()), MEDIA_TICK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [activeMediaModal]);

  useEffect(() => {
    // Clear optimistic updates when actual state comes back
    const timeout = setTimeout(() => {
      setOptimisticLightBrightness({});
    }, INITIAL_FETCH_DELAY);
    return () => clearTimeout(timeout);
  }, [entities]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const target = event.target?.closest?.('[data-haptic]');
      if (!target) return;
      if (navigator.vibrate) navigator.vibrate(8);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!config.token && !showOnboarding && !showConfigModal) {
      setShowOnboarding(true);
      setOnboardingStep(0);
      setConfigTab('connection');
    }
  }, [config.token, showOnboarding, showConfigModal]);



  const hvacMap = useMemo(() => ({
    off: t('climate.hvac.off'),
    auto: t('climate.hvac.auto'),
    cool: t('climate.hvac.cool'),
    dry: t('climate.hvac.dry'),
    fan_only: t('climate.hvac.fanOnly'),
    heat: t('climate.hvac.heat')
  }), [language]);
  const fanMap = useMemo(() => ({
    Auto: t('climate.fan.auto'),
    Low: t('climate.fan.low'),
    LowMid: t('climate.fan.lowMid'),
    Mid: t('climate.fan.mid'),
    HighMid: t('climate.fan.highMid'),
    High: t('climate.fan.high')
  }), [language]);
  const swingMap = useMemo(() => ({
    Auto: t('climate.swing.auto'),
    Up: t('climate.swing.up'),
    UpMid: t('climate.swing.upMid'),
    Mid: t('climate.swing.mid'),
    DownMid: t('climate.swing.downMid'),
    Down: t('climate.swing.down'),
    Swing: t('climate.swing.swing')
  }), [language]);

  const isSonosActive = (entity) => {
    if (!entity || !entity.state) return false;
    if (entity.state === 'playing') return true;
    if (entity.state === 'paused') {
      const lastUpdated = new Date(entity.last_updated).getTime();
      const nowTime = now.getTime();
      return (nowTime - lastUpdated) < MEDIA_TIMEOUT;
    }
    return false;
  };

  const isMediaActive = (entity) => {
    if (!entity || !entity.state) return false;
    if (entity.state === 'playing') return true;
    const lastUpdated = new Date(entity.last_updated).getTime();
    const nowTime = now.getTime();
    return (nowTime - lastUpdated) < ENTITY_UPDATE_THRESHOLD;
  };

  const getS = (id, fallback = "--") => {
    const state = entities[id]?.state;
    if (!state || state === "unavailable" || state === "unknown") return fallback;
    if (state === "home") return t('status.home');
    if (state === "not_home") return t('status.notHome');
    return state.charAt(0).toUpperCase() + state.slice(1);
  };
  const getA = (id, attr, fallback = null) => entities[id]?.attributes?.[attr] ?? fallback;
  const getEntityImageUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return `${activeUrl.replace(/\/$/, '')}${rawUrl}`;
  };
  const callService = (domain, service, data) => { 
    if (!conn) {
      logger.warn(`Service call attempted while disconnected: ${domain}.${service}`);
      return Promise.reject(new Error('No connection'));
    }
    return haCallService(conn, domain, service, data).catch(error => {
      console.error(`Service call failed: ${domain}.${service}`, error);
      throw error;
    });
  };

  const personStatus = (id) => (
    <PersonStatus
      key={id} id={id} entities={entities} editMode={editMode}
      customNames={customNames} customIcons={customIcons}
      cardSettings={cardSettings} getCardSettingsKey={getCardSettingsKey}
      getEntityImageUrl={getEntityImageUrl} getS={getS}
      onOpenPerson={(pid) => setShowPersonModal(pid)}
      onEditCard={(eid, sk) => { setShowEditCardModal(eid); setEditCardSettingsKey(sk); }}
      onRemoveCard={removeCard} t={t}
    />
  );

  const pageDefaults = {
    home: { label: t('page.home'), icon: LayoutGrid }
  };
  const pages = (pagesConfig.pages || []).map(id => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid
  }));

  useEffect(() => {
    if (showAddCardModal && addCardTargetPage !== 'header') {
      setAddCardTargetPage(activePage);
    }
  }, [showAddCardModal, activePage]);

  useEffect(() => {
    if (!showAddPageModal) return;
    setNewPageLabel('');
    setNewPageIcon(null);
  }, [showAddPageModal]);

  useEffect(() => {
    if (showAddCardModal) setSelectedEntities([]);
    if (showAddCardModal) {
      setSelectedWeatherId(null);
      setSelectedTempId(null);
      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      setSelectedNordpoolId(null);
      setNordpoolDecimals(2);
    }
  }, [showAddCardModal]);

  useEffect(() => {
    if (!showAddCardModal) return;
    if (isMediaPage(addCardTargetPage)) {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'header' || addCardTargetPage === 'settings') {
      setAddCardType('entity');
      return;
    }
    setAddCardType('sensor');
  }, [showAddCardModal, addCardTargetPage]);

  const getAddCardAvailableLabel = () => {
    if (addCardTargetPage === 'header') return t('addCard.available.people');
    if (addCardTargetPage === 'settings') return t('addCard.available.allEntities');
    if (addCardType === 'vacuum') return t('addCard.available.vacuums');
    if (addCardType === 'climate') return t('addCard.available.climates');
    if (addCardType === 'cost') return t('addCard.available.costs');
    if (addCardType === 'media') return t('addCard.available.players');
    if (addCardType === 'car') return t('addCard.available.cars');
    if (addCardType === 'toggle') return t('addCard.available.toggles');
    if (addCardType === 'entity') return t('addCard.available.entities');
    return t('addCard.available.lights');
  };

  const getAddCardNoneLeftLabel = () => {
    const itemKey = addCardTargetPage === 'header'
      ? 'addCard.item.people'
      : addCardTargetPage === 'settings'
        ? 'addCard.item.entities'
        : addCardType === 'vacuum'
          ? 'addCard.item.vacuums'
          : addCardType === 'climate'
            ? 'addCard.item.climates'
            : addCardType === 'cost'
              ? 'addCard.item.costs'
          : addCardType === 'media'
            ? 'addCard.item.players'
            : addCardType === 'car'
              ? 'addCard.item.cars'
            : addCardType === 'toggle'
              ? 'addCard.item.toggles'
              : addCardType === 'entity'
                ? 'addCard.item.entities'
                : 'addCard.item.lights';

    return t('addCard.noneLeft').replace('{item}', t(itemKey));
  };

  const activeGridColumns = gridColumns;

  useEffect(() => {
    const updateGridCols = () => {
      const width = window.innerWidth;
      const mobile = width < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (width >= 1280) setGridColCount(activeGridColumns);
      else if (width >= 1024) setGridColCount(Math.min(activeGridColumns, 3));
      else setGridColCount(2);
      
      setIsCompactCards(width >= 480 && width < 640);
    };

    updateGridCols();
    window.addEventListener('resize', updateGridCols);
    return () => window.removeEventListener('resize', updateGridCols);
  }, [activeGridColumns]);

  const getCardSettingsKey = (cardId, pageId = activePage) => `${pageId}::${cardId}`;

  const resolveCarSettings = (_cardId, settings = {}) => settings;

  const cardUtilCtx = { getCardSettingsKey, cardSettings, entities, activePage };
  const isCardRemovable = (cardId, pageId = activePage) => _isCardRemovable(cardId, pageId, cardUtilCtx);
  const isCardHiddenByLogic = (cardId) => _isCardHiddenByLogic(cardId, cardUtilCtx);
  const isMediaPage = (pageId) => _isMediaPage(pageId, pageSettings);

  const removeCard = (cardId, listName = activePage) => {
    const newConfig = { ...pagesConfig };
    if (listName === 'header') {
        newConfig.header = (newConfig.header || []).filter(id => id !== cardId);
        persistConfig(newConfig);
    } else if (newConfig[activePage]) {
      newConfig[activePage] = newConfig[activePage].filter(id => id !== cardId);
      persistConfig(newConfig);
    }
  };

  const createPage = () => {
    const label = newPageLabel.trim() || t('page.newDefault');
    const slugBase = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'side';
    let pageId = slugBase;
    const existing = new Set(pagesConfig.pages || []);
    let counter = 1;
    while (existing.has(pageId)) {
      counter += 1;
      pageId = `${slugBase}_${counter}`;
    }

    const newConfig = { ...pagesConfig };
    newConfig.pages = [...(newConfig.pages || []), pageId];
    newConfig[pageId] = [];
    persistConfig(newConfig);

    savePageSetting(pageId, 'label', label);
    savePageSetting(pageId, 'icon', newPageIcon);

    setActivePage(pageId);
    setShowAddPageModal(false);
  };

  const createMediaPage = () => {
    const baseLabel = t('sonos.pageName');
    const existingLabels = (pagesConfig.pages || []).map(id => pageSettings[id]?.label || pageDefaults[id]?.label || id);
    let maxNum = 0;
    existingLabels.forEach((label) => {
      if (String(label).toLowerCase().startsWith(baseLabel.toLowerCase())) {
        const match = String(label).match(/(\d+)$/);
        const num = match ? parseInt(match[1], 10) : 1;
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    const label = nextNum === 1 ? baseLabel : `${baseLabel} ${nextNum}`;

    const slugBase = baseLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'media';
    let pageId = slugBase;
    const existing = new Set(pagesConfig.pages || []);
    let counter = 1;
    while (existing.has(pageId)) {
      counter += 1;
      pageId = `${slugBase}_${counter}`;
    }

    const newConfig = { ...pagesConfig };
    newConfig.pages = [...(newConfig.pages || []), pageId];
    newConfig[pageId] = [];
    persistConfig(newConfig);

    savePageSetting(pageId, 'label', label);
    savePageSetting(pageId, 'icon', 'Speaker');
    savePageSetting(pageId, 'type', 'media');

    setActivePage(pageId);
    setShowAddCardModal(false);
  };

  const deletePage = (pageId) => {
    if (!pageId || pageId === 'home') return;
    if (!window.confirm(t('confirm.deletePage'))) return;

    const newConfig = { ...pagesConfig };
    newConfig.pages = (newConfig.pages || []).filter(id => id !== pageId);
    delete newConfig[pageId];
    persistConfig(newConfig);

    const newSettings = { ...pageSettings };
    delete newSettings[pageId];
    persistPageSettings(newSettings);

    if (activePage === pageId) setActivePage('home');
    setEditingPage(null);
  };

  const onAddSelected = () => handleAddSelected({
    pagesConfig, persistConfig, addCardTargetPage, addCardType,
    selectedEntities, selectedWeatherId, selectedTempId,
    selectedAndroidTVMediaId, selectedAndroidTVRemoteId,
    selectedCostTodayId, selectedCostMonthId,
    selectedNordpoolId, nordpoolDecimals,
    cardSettings, persistCardSettings, getCardSettingsKey,
    setSelectedEntities, setShowAddCardModal,
    setSelectedWeatherId, setSelectedTempId,
    setSelectedAndroidTVMediaId, setSelectedAndroidTVRemoteId,
    setSelectedCostTodayId, setSelectedCostMonthId,
    setCostSelectionTarget, setSelectedNordpoolId,
    setNordpoolDecimals, saveCardSetting,
    setShowEditCardModal, setEditCardSettingsKey
  });


  const renderSensorCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const entity = entities[cardId];
    if (!entity) {
      if (editMode) {
        return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
      }
      return null;
    }
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const name = customNames[cardId] || getA(cardId, 'friendly_name', cardId);
    const domain = cardId.split('.')[0];
    const defaultIcons = { sensor: Activity, input_number: Hash, input_boolean: ToggleRight, switch: Power, default: Activity };
    const DefaultIcon = defaultIcons[domain] || defaultIcons.default;
    const sensorIconName = customIcons[cardId] || entity?.attributes?.icon;
    const Icon = sensorIconName ? (getIconComponent(sensorIconName) || DefaultIcon) : DefaultIcon;

    const handleControl = (action) => {
      if (domain === 'input_number') {
        if (action === 'increment') callService('input_number', 'increment', { entity_id: cardId });
        if (action === 'decrement') callService('input_number', 'decrement', { entity_id: cardId });
      }
      if (domain === 'input_boolean' || domain === 'switch' || domain === 'light' || domain === 'automation') {
         if (action === 'toggle') callService(domain, 'toggle', { entity_id: cardId });
      }
      if (domain === 'script' || domain === 'scene') {
         if (action === 'turn_on') callService(domain, 'turn_on', { entity_id: cardId });
      }
    };

    return (
      <SensorCard 
        key={cardId}
        entity={entity}
        conn={conn}
        settings={settings}
        dragProps={dragProps}
        cardStyle={cardStyle}
        editMode={editMode}
        controls={getControls(cardId)}
        Icon={Icon}
        name={name}
        t={t}
        onControl={handleControl}
        onOpen={() => { 
          if (!editMode) {
              setShowSensorInfoModal(cardId);
          } 
        }}
      />
    );
  };

  // --- CARD RENDERERS ---
  
  const renderLightCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => (
    <LightCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getA={getA} callService={callService}
      onOpen={() => { if (!editMode) setShowLightModal(cardId); }}
      optimisticLightBrightness={optimisticLightBrightness}
      setOptimisticLightBrightness={setOptimisticLightBrightness}
      t={t}
    />
  );

  const renderAutomationCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const isSmall = settings.size === 'small';
    const isOn = entities[cardId]?.state === 'on';
    const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
    const automationIconName = customIcons[cardId] || entities[cardId]?.attributes?.icon;
    const Icon = automationIconName ? (getIconComponent(automationIconName) || Workflow) : Workflow;
    
    return (
      <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} className={`touch-feedback w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans mb-3 break-inside-avoid ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isOn ? 'rgba(59, 130, 246, 0.03)' : 'rgba(15, 23, 42, 0.6)', borderColor: isOn ? 'rgba(59, 130, 246, 0.15)' : (editMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)')}} onClick={(e) => { if(!editMode) callService("automation", "toggle", { entity_id: cardId }); }}>
        {getControls(cardId)}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
          <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-sm font-bold text-[var(--text-primary)] leading-tight">{friendlyName}</span></div><span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mt-0.5">{isOn ? t('status.active') : t('status.off')}</span></div>
        </div>
        <div className={`w-10 h-6 rounded-full relative transition-all ${isOn ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'left-[calc(100%-20px)]' : 'left-1'}`} /></div>
      </div>
    );
  };


  const renderCarCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => (
    <CarCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getS={getS} getA={getA} callService={callService}
      onOpen={() => { if (!editMode) setActiveCarModal(cardId); }}
      isMobile={isMobile} t={t}
    />
  );

  const renderVacuumCard = (vacuumId, dragProps, getControls, cardStyle, settingsKey) => (
    <VacuumCard
      key={vacuumId} vacuumId={vacuumId} dragProps={dragProps} controls={getControls(vacuumId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getA={getA} callService={callService}
      onOpen={() => { if (!editMode) { setActiveVacuumId(vacuumId); setShowVacuumModal(true); } }}
      isMobile={isMobile} t={t}
    />
  );

  const openMediaModal = (mpId, groupKey, groupIds) => {
    setActiveMediaId(mpId);
    setActiveMediaGroupKey(groupKey);
    setActiveMediaGroupIds(groupIds);
    setActiveMediaModal('media');
  };

  const renderMediaPlayerCard = (mpId, dragProps, getControls, cardStyle) => (
    <MediaPlayerCard
      key={mpId} mpId={mpId} dragProps={dragProps} controls={getControls(mpId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      customNames={customNames} getA={getA} getEntityImageUrl={getEntityImageUrl}
      callService={callService} isMediaActive={isMediaActive}
      onOpen={openMediaModal} t={t}
    />
  );

  const renderMediaGroupCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => (
    <MediaGroupCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} getA={getA} getEntityImageUrl={getEntityImageUrl}
      callService={callService} isMediaActive={isMediaActive}
      saveCardSetting={saveCardSetting} onOpen={openMediaModal} t={t}
    />
  );


  const renderWeatherTempCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => (
    <WeatherTempCard
      cardId={cardId}
      dragProps={dragProps}
      getControls={getControls}
      cardStyle={cardStyle}
      settingsKey={settingsKey}
      cardSettings={cardSettings}
      entities={entities}
      tempHistory={[]}
      tempHistoryById={tempHistoryById}
      outsideTempId={null}
      weatherEntityId={null}
      editMode={editMode}
      onOpen={() => { if (!editMode) setShowWeatherModal(cardId); }}
      t={t}
    />
  );

  const renderGenericClimateCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const entityId = settings.climateId;
    const entity = entityId ? entities[entityId] : null;

    if (!entity || !entityId) {
      if (editMode) {
        return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
      }
      return null;
    }

    return (
      <GenericClimateCard
        key={cardId}
        cardId={cardId}
        entityId={entityId}
        entity={entity}
        dragProps={dragProps}
        controls={getControls(cardId)}
        cardStyle={cardStyle}
        editMode={editMode}
        customNames={customNames}
        customIcons={customIcons}
        onOpen={() => setActiveClimateEntityModal(entityId)}
        onSetTemperature={(temp) => callService('climate', 'set_temperature', { entity_id: entityId, temperature: temp })}
        settings={settings}
        t={t}
      />
    );
  };

  const renderGenericCostCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    return (
      <GenericEnergyCostCard
        cardId={cardId}
        todayEntityId={settings.todayId}
        monthEntityId={settings.monthId}
        entities={entities}
        dragProps={dragProps}
        controls={getControls(cardId)}
        cardStyle={cardStyle}
        editMode={editMode}
        customNames={customNames}
        customIcons={customIcons}
        decimals={settings.decimals ?? 0}
        settings={settings}
        onOpen={() => setShowCostModal(cardId)}
        t={t}
      />
    );
  };



  const renderGenericAndroidTVCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const mediaPlayerId = settings.mediaPlayerId;
    const remoteId = settings.remoteId;
    const linkedMediaPlayers = settings.linkedMediaPlayers;
    
    if (!mediaPlayerId) return null;
    
    return (
      <GenericAndroidTVCard
        cardId={cardId}
        dragProps={dragProps}
        controls={getControls(cardId)}
        cardStyle={cardStyle}
        editMode={editMode}
        entities={entities}
        mediaPlayerId={mediaPlayerId}
        remoteId={remoteId}
        linkedMediaPlayers={linkedMediaPlayers}
        size={settings.size}
        getA={getA}
        getEntityImageUrl={getEntityImageUrl}
        onOpen={() => setShowAndroidTVModal(cardId)}
        customNames={customNames}
        t={t}
        callService={haCallService}
      />
    );
  };

  const getCardGridSpan = (cardId) => _getCardGridSpan(cardId, getCardSettingsKey, cardSettings, activePage);

  const moveCardInArray = (cardId, direction) => {
    const newConfig = { ...pagesConfig };
    const pageCards = newConfig[activePage];
    const currentIndex = pageCards.indexOf(cardId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pageCards.length) return;

    // Swap cards
    [pageCards[currentIndex], pageCards[newIndex]] = [pageCards[newIndex], pageCards[currentIndex]];
    
    persistConfig(newConfig);
  };

  const gridLayout = useMemo(() => {
    const ids = pagesConfig[activePage] || [];
    const visibleIds = editMode ? ids : ids.filter(id => !(hiddenCards.includes(id) || isCardHiddenByLogic(id)));
    return _buildGridLayout(visibleIds, gridColCount, getCardGridSpan);
  }, [pagesConfig, activePage, gridColCount, cardSettings, hiddenCards, editMode, entities]);

  const dragAndDrop = createDragAndDropHandlers({
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
    dragSourceRef,
    touchTargetRef,
    touchSwapCooldownRef,
    touchPath,
    setTouchPath,
    touchTargetId,
    setTouchTargetId,
    setDraggingId,
    ignoreTouchRef
  });

  const renderCard = (cardId, index, colIndex) => {
    const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
    if (isHidden && !editMode) return null;
    const isDragging = draggingId === cardId;

    const {
      getDragProps,
      getCardStyle,
      startTouchDrag,
      updateTouchDrag,
      performTouchDrop,
      resetDragState
    } = dragAndDrop;

    const dragProps = getDragProps({ cardId, index, colIndex });
    const baseCardStyle = getCardStyle({ cardId, isHidden, isDragging });
    
    // Removed animation delay to prevent slow reanimation on card move
    const cardStyle = baseCardStyle;

    const settingsKey = getCardSettingsKey(cardId);

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
      const settings = cardSettings[settingsKey] || cardSettings[editId] || {};
      const canToggleSize = (editId.startsWith('light_') || editId.startsWith('light.') || editId.startsWith('vacuum.') || editId.startsWith('automation.') || editId.startsWith('climate_card_') || editId.startsWith('cost_card_') || editId.startsWith('weather_temp_') || editId.startsWith('androidtv_card_') || editId.startsWith('calendar_card_') || editId.startsWith('todo_card_') || editId.startsWith('nordpool_card_') || editId === 'car' || editId.startsWith('car_card_') || settings.type === 'entity' || settings.type === 'toggle' || settings.type === 'sensor');
      return ( 
      <>
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); moveCardInArray(cardId, 'left'); }}
            className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
            title={t('tooltip.moveLeft')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); moveCardInArray(cardId, 'right'); }}
            className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
            title={t('tooltip.moveRight')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowEditCardModal(editId); setEditCardSettingsKey(settingsKey); }}
            className="p-2 rounded-full text-white border border-white/20 shadow-lg bg-black/60"
            title={t('tooltip.editCard')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCardVisibility(cardId); }}
            className="p-2 rounded-full transition-colors hover:bg-white/20 text-white border border-white/20 shadow-lg"
            style={{backgroundColor: isHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 0, 0, 0.6)'}}
            title={isHidden ? t('tooltip.showCard') : t('tooltip.hideCard')}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {canToggleSize && (
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                const currentSize = cardSettings[settingsKey]?.size || 'large';
                const nextSize = (editId.startsWith('calendar_card_') || editId.startsWith('todo_card_'))
                  ? (currentSize === 'small' ? 'medium' : (currentSize === 'medium' ? 'large' : 'small'))
                  : (currentSize === 'small' ? 'large' : 'small');
                saveCardSetting(settingsKey, 'size', nextSize); 
              }}
              className="p-2 rounded-full transition-colors hover:bg-purple-500/80 text-white border border-white/20 shadow-lg"
              style={{backgroundColor: cardSettings[settingsKey]?.size === 'small' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(0, 0, 0, 0.6)'}}
              title={(editId.startsWith('calendar_card_') || editId.startsWith('todo_card_')) ? 'Bytt storleik' : (cardSettings[settingsKey]?.size === 'small' ? t('tooltip.largeSize') : t('tooltip.smallSize'))}
            >
              {cardSettings[settingsKey]?.size === 'small' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}
          {isCardRemovable(cardId) && (
            <button 
              onClick={(e) => { e.stopPropagation(); removeCard(cardId); }}
              className="p-2 rounded-full transition-colors hover:bg-red-500/80 text-white border border-white/20 shadow-lg bg-black/60"
              title={t('tooltip.removeCard')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            data-drag-handle
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pointerDragRef.current = true;
              ignoreTouchRef.current = true;
              startTouchDrag(cardId, index, colIndex, e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              updateTouchDrag(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              performTouchDrop(e.clientX, e.clientY);
              resetDragState();
            }}
            onPointerCancel={(e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              const x = touchPath?.x ?? e.clientX;
              const y = touchPath?.y ?? e.clientY;
              performTouchDrop(x, y);
              resetDragState();
            }}
            style={{ touchAction: 'none' }}
            className="flex items-center justify-center p-3 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        </div>
      </>
      );
    };

    // Handle lights (both legacy IDs and entity IDs)
    if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
      return renderLightCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('automation.')) {
      const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
      if (settings.type === 'entity' || settings.type === 'toggle' || settings.type === 'sensor') {
        return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey);
      }
      return renderAutomationCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('vacuum.')) {
      return renderVacuumCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('media_player.')) {
      return renderMediaPlayerCard(cardId, dragProps, getControls, cardStyle);
    }

    if (cardId.startsWith('media_group_')) {
      return renderMediaGroupCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('calendar_card_')) {
      const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
      return (
        <CalendarCard 
           key={cardId}
           cardId={cardId}
           settings={cardSettings[settingsKey] || cardSettings[cardId] || {}}
           conn={conn}
           t={t}
           locale={language === 'en' ? 'en-US' : 'nb-NO'}
           dragProps={dragProps}
           getControls={getControls}
           isEditMode={editMode}
           className="h-full"
           style={cardStyle}
           size={sizeSetting}
           iconName={customIcons[cardId] || null}
           customName={customNames[cardId] || null}
           onClick={(e) => { 
             e.stopPropagation(); 
             if (editMode) { 
               setShowEditCardModal(cardId); 
               setEditCardSettingsKey(settingsKey); 
             } else {
               setShowCalendarModal(true);
             }
           }}
        />
      );
    }

    if (cardId.startsWith('climate_card_')) {
      return renderGenericClimateCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('todo_card_')) {
      const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
      return (
        <TodoCard
           key={cardId}
           cardId={cardId}
           settings={cardSettings[settingsKey] || cardSettings[cardId] || {}}
           conn={conn}
           t={t}
           dragProps={dragProps}
           getControls={getControls}
           isEditMode={editMode}
           className="h-full"
           style={cardStyle}
           size={sizeSetting}
           iconName={customIcons[cardId] || null}
           customName={customNames[cardId] || null}
           onClick={(e) => {
             e.stopPropagation();
             if (editMode) {
               setShowEditCardModal(cardId);
               setEditCardSettingsKey(settingsKey);
             } else {
               setShowTodoModal(cardId);
             }
           }}
        />
      );
    }

    if (cardId.startsWith('cost_card_')) {
      return renderGenericCostCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('weather_temp_')) {
      return renderWeatherTempCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('androidtv_card_')) {
      return renderGenericAndroidTVCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('car_card_')) {
      return renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('nordpool_card_')) {
      const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
      const entity = entities[settings.nordpoolId];
      if (!entity) return null;
      return (
        <GenericNordpoolCard
          cardId={cardId}
          dragProps={dragProps}
          controls={getControls(cardId)}
          cardStyle={cardStyle}
          editMode={editMode}
          entity={entity}
          customNames={customNames}
          customIcons={customIcons}
          onOpen={() => setShowNordpoolModal(cardId)}
          settings={settings}
          saveCardSetting={saveCardSetting}
          t={t}
        />
      );
    }

    if (cardId.startsWith('room_card_')) {
      const roomSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
      return (
        <RoomCard
          cardId={cardId}
          settings={roomSettings}
          entities={entities}
          conn={conn}
          callService={(domain, service, data) => callService(domain, service, data)}
          dragProps={dragProps}
          controls={getControls(cardId)}
          cardStyle={cardStyle}
          editMode={editMode}
          customNames={customNames}
          customIcons={customIcons}
          onOpen={() => {
            if (editMode) {
              setShowEditCardModal(cardId);
              setEditCardSettingsKey(settingsKey);
            } else {
              setShowRoomModal(cardId);
            }
          }}
          t={t}
        />
      );
    }

    const genericSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    if (genericSettings.type === 'sensor' || genericSettings.type === 'entity' || genericSettings.type === 'toggle') {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (activePage === 'settings' && !['car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player')) {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (editMode && cardId === 'media_player') {
      // Legacy media_player placeholder for deletion
      return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} label="Legacy" t={t} />;
    }
    
    // Check for empty/missing media groups in edit mode
    // (In View Mode these are hidden by isCardHiddenByLogic)
    if (editMode && cardId.startsWith('media_group_')) {
       // Since it reached here, renderMediaGroupCard returned null (likely because activeEntities=0)
       // We force a "Broken" state card so user can delete it
       return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
    }

    switch(cardId) {
      case 'media_player':
        return null;
      case 'car':
        return renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey);
      default: return null;
    }
  };

  const editSettingsKey = showEditCardModal ? (editCardSettingsKey || getCardSettingsKey(showEditCardModal)) : null;
  const rawEditSettings = editSettingsKey ? (cardSettings[editSettingsKey] || cardSettings[showEditCardModal] || {}) : {};
  const editId = showEditCardModal;
  const editEntity = editId ? entities[editId] : null;
  const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
  const isEditCalendar = !!editId && editId.startsWith('calendar_card_');
  const isEditTodo = !!editId && editId.startsWith('todo_card_');
  const isEditCost = !!editId && editId.startsWith('cost_card_');
  const isEditAndroidTV = !!editId && editId.startsWith('androidtv_card_');
  const isEditVacuum = !!editId && editId.startsWith('vacuum.');
  const isEditAutomation = !!editId && editId.startsWith('automation.');
  const isEditCar = !!editId && (editId === 'car' || editId.startsWith('car_card_'));
  const isEditRoom = !!editId && editId.startsWith('room_card_');
  const editSettings = isEditCar ? resolveCarSettings(editId, rawEditSettings) : rawEditSettings;
  const isEditGenericType = (!!editSettings?.type && (editSettings.type === 'entity' || editSettings.type === 'toggle' || editSettings.type === 'sensor')) || isEditVacuum || isEditAutomation || isEditCar || isEditAndroidTV || isEditRoom;
  const isEditSensor = !!editSettings?.type && editSettings.type === 'sensor';
  const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');
  const canEditName = !!editId && !isEditWeatherTemp && editId !== 'media_player' && editId !== 'sonos';
  const canEditIcon = !!editId && (isEditLight || isEditCalendar || isEditTodo || isEditRoom || editId.startsWith('automation.') || editId.startsWith('vacuum.') || editId.startsWith('climate_card_') || editId.startsWith('cost_card_') || !!editEntity || editId === 'car' || editId.startsWith('car_card_'));
  const canEditStatus = !!editEntity && !!editSettingsKey && editSettingsKey.startsWith('settings::');
  const isOnboardingActive = showOnboarding;
  const onboardingSteps = buildOnboardingSteps(t);

  const testConnection = async () => {
    if (!validateUrl(config.url) || !config.token) return;
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const { createConnection, createLongLivedTokenAuth } = window.HAWS;
      const auth = createLongLivedTokenAuth(config.url, config.token);
      const testConn = await createConnection({ auth });
      testConn.close();
      setConnectionTestResult({ success: true, message: t('onboarding.testSuccess') });
    } catch (err) {
      setConnectionTestResult({ success: false, message: t('onboarding.testFailed') });
    } finally {
      setTestingConnection(false);
    }
  };

  const canAdvanceOnboarding = onboardingStep === 0
    ? Boolean(config.url && config.token && validateUrl(config.url) && connectionTestResult?.success)
    : true;

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-500" style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
      {bgMode === 'animated' ? (
        <AuroraBackground />
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, var(--bg-gradient-from), var(--bg-primary), var(--bg-gradient-to))'}} />
          <div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(150px)'}} />
          <div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)'}} />
        </div>
      )}
      {editMode && draggingId && touchPath && (
        <svg className="fixed inset-0 pointer-events-none z-40">
          <line
            x1={touchPath.startX}
            y1={touchPath.startY}
            x2={touchPath.x}
            y2={touchPath.y}
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <circle cx={touchPath.startX} cy={touchPath.startY} r="6" fill="rgba(59, 130, 246, 0.6)" />
          <circle cx={touchPath.x} cy={touchPath.y} r="8" fill="rgba(59, 130, 246, 0.9)" />
        </svg>
      )}
      <div
        className={`relative z-10 w-full max-w-[1600px] mx-auto py-6 md:py-10 ${
          isMobile ? 'px-5 mobile-grid' : (gridColCount === 1 ? 'px-10 sm:px-16 md:px-24' : 'px-6 md:px-20')
        } ${isCompactCards ? 'compact-cards' : ''}`}
      >
        <Header
          now={now}
          headerTitle={resolvedHeaderTitle}
          headerScale={headerScale}
          editMode={editMode}
          headerSettings={headerSettings}
          setShowHeaderEditModal={setShowHeaderEditModal}
          t={t}
          isMobile={isMobile}
          sectionSpacing={sectionSpacing}
        >
          <div
            className={`w-full mt-0 font-sans ${isMobile ? 'flex flex-col items-start gap-3' : 'flex items-center justify-between'}`}
            style={{ marginTop: `${sectionSpacing?.headerToStatus ?? 0}px` }}
          >
            <div className={`flex flex-wrap gap-2.5 items-center min-w-0 ${isMobile ? 'scale-90 origin-left w-full' : ''}`}>
              {(pagesConfig.header || []).map(id => personStatus(id))}
              {editMode && (
                <button 
                  onClick={() => { setAddCardTargetPage('header'); setShowAddCardModal(true); }} 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  <Plus className="w-3 h-3" /> {t('addCard.type.entity')}
                </button>
              )}
              {(pagesConfig.header || []).length > 0 && <div className="w-px h-8 bg-[var(--glass-border)] mx-2"></div>}
            </div>
            <div className={`min-w-0 ${isMobile ? 'w-full' : 'flex-1'}`}>
              <StatusBar
                entities={entities}
                now={now}
                setActiveMediaId={setActiveMediaId}
                setActiveMediaGroupKey={setActiveMediaGroupKey}
                setActiveMediaGroupIds={setActiveMediaGroupIds}
                setActiveMediaSessionSensorIds={setActiveMediaSessionSensorIds}
                setActiveMediaModal={setActiveMediaModal}
                setShowUpdateModal={() => { setShowConfigModal(true); setConfigTab('updates'); }}
                setShowStatusPillsConfig={setShowStatusPillsConfig}
                editMode={editMode}
                t={t}
                isSonosActive={isSonosActive}
                isMediaActive={isMediaActive}
                getA={getA}
                getEntityImageUrl={getEntityImageUrl}
                statusPillsConfig={statusPillsConfig}
                isMobile={isMobile}
              />
            </div>
          </div>
        </Header>

        {haUnavailableVisible && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <div className="text-sm font-semibold">
              {t('ha.unavailable')}
            </div>
          </div>
        )}

        <div
          className="flex flex-nowrap items-center justify-between gap-4"
          style={{ marginBottom: `${sectionSpacing?.navToGrid ?? 24}px` }}
        >
          <PageNavigation
            pages={pages}
            pagesConfig={pagesConfig}
            persistConfig={persistConfig}
            pageSettings={pageSettings}
            activePage={activePage}
            setActivePage={setActivePage}
            editMode={editMode}
            setEditingPage={setEditingPage}
            setShowAddPageModal={setShowAddPageModal}
            t={t}
          />
          <div className="relative flex items-center gap-6 flex-shrink-0 overflow-visible pb-2 justify-end">
            {editMode && <button onClick={() => setShowAddCardModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Plus className="w-4 h-4" /> {t('nav.addCard')}</button>}
            {editMode && (
              <button onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(false);
              }} className="group flex items-center gap-2 text-xs font-bold uppercase text-green-400 hover:text-white transition-all whitespace-nowrap">
                <Check className="w-4 h-4" /> {t('nav.done')}
              </button>
            )}
            
            <button 
              onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(!editMode);
              }} 
              className={`p-2 rounded-full group ${editMode ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)]'}`}
              title={editMode ? t('nav.done') : t('menu.edit')}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <div className="relative">
              <SettingsDropdown 
                onOpenSettings={() => { setShowConfigModal(true); setConfigTab('connection'); }}
                onOpenTheme={() => setShowThemeSidebar(true)}
                onOpenLayout={() => setShowLayoutSidebar(true)}
                onOpenHeader={() => setShowHeaderEditModal(true)}
                t={t}
              />
              {updateCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center border-2 border-[var(--card-bg)] pointer-events-none shadow-sm">
                  <span className="text-[11px] font-bold text-white leading-none pt-[1px]">{updateCount}</span>
                </div>
              )}
            </div>
            {!connected && <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0`} style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: '#ef4444'}} /></div>}
          </div>
        </div>

        {isMediaPage(activePage) ? (
          <div key={activePage} className="page-transition">
            <MediaPage
              pageId={activePage}
              entities={entities}
              pageSettings={pageSettings}
              editMode={editMode}
              isSonosActive={isSonosActive}
              activeMediaId={activeMediaId}
              setActiveMediaId={setActiveMediaId}
              getA={getA}
              getEntityImageUrl={getEntityImageUrl}
              callService={callService}
              savePageSetting={savePageSetting}
              formatDuration={formatDuration}
              t={t}
            />
          </div>
        ) : (pagesConfig[activePage] || []).filter(id => gridLayout[id]).length === 0 ? (
          <div key={`${activePage}-empty`} className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 opacity-90 animate-in fade-in zoom-in duration-500 font-sans">
             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 rounded-full mb-6 shadow-lg shadow-black/5">
                <LayoutGrid className="w-12 h-12 text-[var(--text-primary)] opacity-80" />
             </div>
             
             <h2 className="text-3xl font-light mb-3 text-[var(--text-primary)] uppercase tracking-tight">{t('welcome.title')}</h2>
             <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md leading-relaxed">{t('welcome.subtitle')}</p>
             
             <div className="flex gap-4">
                  <button 
                    onClick={() => setShowAddCardModal(true)} 
                    className="flex items-center gap-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-200 font-bold uppercase tracking-widest text-sm"
                  >
                     <Plus className="w-5 h-5" />
                     {t('welcome.addCard')}
                  </button>
             </div>

             <div className="mt-12 max-w-xs mx-auto p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">
                   {t('welcome.editHint')}
                </p>
             </div>
          </div>
        ) : (
          <div key={activePage} className="grid font-sans page-transition items-start" style={{ gap: isMobile ? '12px' : `${gridGapV}px ${gridGapH}px`, gridAutoRows: isMobile ? '82px' : '100px', gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))` }}>
            {(pagesConfig[activePage] || [])
              .map((id) => ({ id, placement: gridLayout[id] }))
              .filter(({ placement }) => placement)
              .sort((a, b) => {
                if (a.placement.row !== b.placement.row) return a.placement.row - b.placement.row;
                return a.placement.col - b.placement.col;
              })
              .map(({ id }, sortedIndex) => {
              const index = (pagesConfig[activePage] || []).indexOf(id);
              const placement = gridLayout[id];
              const isCalendarCard = id.startsWith('calendar_card_');
              const isTodoCard = id.startsWith('todo_card_');
              const isLargeCard = isCalendarCard || isTodoCard;
              const sizeSetting = isLargeCard ? (cardSettings[getCardSettingsKey(id)]?.size || cardSettings[id]?.size) : null;
              const forcedSpan = isLargeCard
                ? (sizeSetting === 'small' ? 1 : (sizeSetting === 'medium' ? 2 : 4))
                : placement?.span;
              const settingsKey = getCardSettingsKey(id);
              const heading = cardSettings[settingsKey]?.heading;

              if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;

              const cardContent = renderCard(id, index);
              if (!cardContent) return null;

              return (
                <div
                  key={id}
                  className={`h-full relative ${(isCompactCards || isMobile) ? 'card-compact' : ''}`}
                  style={{
                    gridRowStart: placement.row,
                    gridColumnStart: placement.col,
                    gridRowEnd: `span ${forcedSpan}`,
                    minHeight: isLargeCard && sizeSetting !== 'small' && sizeSetting !== 'medium' ? `${(4 * 100) + (3 * (isMobile ? 12 : gridGapV))}px` : undefined
                  }}
                >
                  {heading && (
                    <div className="absolute -top-4 left-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-secondary)]">
                      {heading}
                    </div>
                  )}
                  <div className="h-full">
                    {cardContent}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {(showConfigModal || showOnboarding) && (
          <ModalSuspense>
            <ConfigModal
              open={showConfigModal || showOnboarding}
          isOnboardingActive={isOnboardingActive}
          t={t}
          configTab={configTab}
          setConfigTab={setConfigTab}
          onboardingSteps={onboardingSteps}
          onboardingStep={onboardingStep}
          setOnboardingStep={setOnboardingStep}
          canAdvanceOnboarding={canAdvanceOnboarding}
          connected={connected}
          activeUrl={activeUrl}
          config={config}
          setConfig={setConfig}
          onboardingUrlError={onboardingUrlError}
          setOnboardingUrlError={setOnboardingUrlError}
          onboardingTokenError={onboardingTokenError}
          setOnboardingTokenError={setOnboardingTokenError}
          setConnectionTestResult={setConnectionTestResult}
          connectionTestResult={connectionTestResult}
          validateUrl={validateUrl}
          testConnection={testConnection}
          testingConnection={testingConnection}
          themes={themes}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          language={language}
          setLanguage={setLanguage}
          inactivityTimeout={inactivityTimeout}
          setInactivityTimeout={setInactivityTimeout}
          gridGapH={gridGapH}
          setGridGapH={setGridGapH}
          gridGapV={gridGapV}
          setGridGapV={setGridGapV}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
          cardBorderRadius={cardBorderRadius}
          setCardBorderRadius={setCardBorderRadius}
          bgMode={bgMode}
          setBgMode={setBgMode}
          bgColor={bgColor}
          setBgColor={setBgColor}
          bgGradient={bgGradient}
          setBgGradient={setBgGradient}
          bgImage={bgImage}
          setBgImage={setBgImage}
          cardTransparency={cardTransparency}
          setCardTransparency={setCardTransparency}
          cardBorderOpacity={cardBorderOpacity}
          setCardBorderOpacity={setCardBorderOpacity}
          sectionSpacing={sectionSpacing}
          updateSectionSpacing={updateSectionSpacing}
          entities={entities}
          getEntityImageUrl={getEntityImageUrl}
          callService={callService}
              onClose={() => setShowConfigModal(false)}
              onFinishOnboarding={() => { setShowOnboarding(false); setShowConfigModal(false); }}
            />
          </ModalSuspense>
        )}

        {/* New Sidebars */}
        <ModalSuspense>
          <ThemeSidebar 
            open={showThemeSidebar}
            onClose={() => setShowThemeSidebar(false)}
            onSwitchToLayout={() => { setShowThemeSidebar(false); setShowLayoutSidebar(true); }}
            onSwitchToHeader={() => { setShowThemeSidebar(false); setShowHeaderEditModal(true); }}
            t={t}
            themes={themes}
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
            language={language}
            setLanguage={setLanguage}
            bgMode={bgMode}
            setBgMode={setBgMode}
            bgColor={bgColor}
            setBgColor={setBgColor}
            bgGradient={bgGradient}
            setBgGradient={setBgGradient}
            bgImage={bgImage}
            setBgImage={setBgImage}
            inactivityTimeout={inactivityTimeout}
            setInactivityTimeout={setInactivityTimeout}
          />
        </ModalSuspense>
        
        <ModalSuspense>
          <LayoutSidebar
            open={showLayoutSidebar}
            onClose={() => setShowLayoutSidebar(false)}
            onSwitchToTheme={() => { setShowLayoutSidebar(false); setShowThemeSidebar(true); }}
            onSwitchToHeader={() => { setShowLayoutSidebar(false); setShowHeaderEditModal(true); }}
            t={t}
            gridGapH={gridGapH}
            setGridGapH={setGridGapH}
            gridGapV={gridGapV}
            setGridGapV={setGridGapV}
            gridColumns={gridColumns}
            setGridColumns={setGridColumns}
            cardBorderRadius={cardBorderRadius}
            setCardBorderRadius={setCardBorderRadius}
            cardTransparency={cardTransparency}
            setCardTransparency={setCardTransparency}
            cardBorderOpacity={cardBorderOpacity}
            setCardBorderOpacity={setCardBorderOpacity}
            sectionSpacing={sectionSpacing}
            updateSectionSpacing={updateSectionSpacing}
          />
        </ModalSuspense>

        {showNordpoolModal && (() => {
          const data = prepareNordpoolData(showNordpoolModal, { getCardSettingsKey, cardSettings, entities, customNames });
          if (!data) return null;
          return (
            <ModalSuspense>
              <NordpoolModal
                show={true}
                onClose={() => setShowNordpoolModal(null)}
                entity={data.entity}
                fullPriceData={data.fullPriceData}
                currentPriceIndex={data.currentPriceIndex}
                priceStats={data.priceStats}
                name={data.name}
                t={t}
                language={language}
                saveCardSetting={saveCardSetting}
                cardId={showNordpoolModal}
                settings={data.settings}
              />
            </ModalSuspense>
          );
        })()}

        {showCostModal && (() => {
          const settingsKey = getCardSettingsKey(showCostModal);
          const settings = cardSettings[settingsKey] || cardSettings[showCostModal] || {};
          const name = customNames?.[showCostModal] || t('energyCost.title');
          const iconName = customIcons?.[showCostModal] || null;

          return (
            <ModalSuspense>
              <CostModal
                show={true}
                onClose={() => setShowCostModal(null)}
                conn={conn}
                entities={entities}
                todayEntityId={settings.todayId}
                monthEntityId={settings.monthId}
                name={name}
                iconName={iconName}
                t={t}
              />
            </ModalSuspense>
          );
        })()}

        {activeClimateEntityModal && entities[activeClimateEntityModal] && (
          <ModalSuspense>
            <GenericClimateModal
              entityId={activeClimateEntityModal}
              entity={entities[activeClimateEntityModal]}
              onClose={() => setActiveClimateEntityModal(null)}
              callService={callService}
              hvacMap={hvacMap}
              fanMap={fanMap}
              swingMap={swingMap}
              t={t}
            />
          </ModalSuspense>
        )}

        {showLightModal && (
          <ModalSuspense>
            <LightModal
              show={!!showLightModal}
              onClose={() => setShowLightModal(null)}
              lightId={showLightModal}
              entities={entities}
              callService={callService}
              getA={getA}
              optimisticLightBrightness={optimisticLightBrightness}
              setOptimisticLightBrightness={setOptimisticLightBrightness}
              customIcons={customIcons}
              t={t}
            />
          </ModalSuspense>
        )}

        {showAndroidTVModal && (() => {
          const settings = cardSettings[getCardSettingsKey(showAndroidTVModal)] || {};
          return (
            <ModalSuspense>
              <GenericAndroidTVModal
                show={true}
              onClose={() => setShowAndroidTVModal(null)}
              entities={entities}
              mediaPlayerId={settings.mediaPlayerId}
              remoteId={settings.remoteId}
              linkedMediaPlayers={settings.linkedMediaPlayers}
              callService={callService}
              getA={getA}
              getEntityImageUrl={getEntityImageUrl}
              customNames={customNames}
              t={t}
              />
            </ModalSuspense>
          );
        })()}

        {showVacuumModal && (
          <ModalSuspense>
            <VacuumModal
          show={showVacuumModal}
          onClose={() => { setShowVacuumModal(false); setActiveVacuumId(null); }}
          entities={entities}
          callService={callService}
          getA={getA}
          t={t}
          vacuumId={activeVacuumId}
            />
          </ModalSuspense>
        )}

        {activeCarModal && (() => {
          const settingsKey = getCardSettingsKey(activeCarModal);
          const settings = resolveCarSettings(activeCarModal, cardSettings[settingsKey] || cardSettings[activeCarModal] || {});
          const name = customNames[activeCarModal] || t('car.defaultName');
          return (
            <ModalSuspense>
              <LeafModal
                show={true}
              onClose={() => setActiveCarModal(null)}
              entities={entities}
              callService={callService}
              getS={getS}
              getA={getA}
              t={t}
              car={{ name, ...settings }}
              />
            </ModalSuspense>
          );
        })()}

        {showAddCardModal && (
          <ModalSuspense>
            <AddCardContent
              onClose={() => setShowAddCardModal(false)}
              addCardTargetPage={addCardTargetPage}
              addCardType={addCardType}
              setAddCardType={setAddCardType}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              entities={entities}
              pagesConfig={pagesConfig}
              selectedEntities={selectedEntities}
              setSelectedEntities={setSelectedEntities}
              selectedWeatherId={selectedWeatherId}
              setSelectedWeatherId={setSelectedWeatherId}
              selectedTempId={selectedTempId}
              setSelectedTempId={setSelectedTempId}
              selectedAndroidTVMediaId={selectedAndroidTVMediaId}
              setSelectedAndroidTVMediaId={setSelectedAndroidTVMediaId}
              selectedAndroidTVRemoteId={selectedAndroidTVRemoteId}
              setSelectedAndroidTVRemoteId={setSelectedAndroidTVRemoteId}
              selectedCostTodayId={selectedCostTodayId}
              setSelectedCostTodayId={setSelectedCostTodayId}
              selectedCostMonthId={selectedCostMonthId}
              setSelectedCostMonthId={setSelectedCostMonthId}
              costSelectionTarget={costSelectionTarget}
              setCostSelectionTarget={setCostSelectionTarget}
              selectedNordpoolId={selectedNordpoolId}
              setSelectedNordpoolId={setSelectedNordpoolId}
              nordpoolDecimals={nordpoolDecimals}
              setNordpoolDecimals={setNordpoolDecimals}
              onAddSelected={onAddSelected}
              onAddRoom={(area, areaEntityIds) => {
                const cardId = `room_card_${Date.now()}`;
                const newConfig = { ...pagesConfig };
                newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
                persistConfig(newConfig);
                const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
                const newSettings = {
                  ...cardSettings,
                  [settingsKey]: {
                    areaId: area.area_id,
                    areaName: area.name || area.area_id,
                    entityIds: areaEntityIds,
                    showLights: true,
                    showTemp: true,
                    showMotion: true,
                    showHumidity: false,
                    showClimate: false,
                    size: 'large',
                  }
                };
                persistCardSettings(newSettings);
                saveCustomName(cardId, area.name || area.area_id);
                setShowAddCardModal(false);
                setShowEditCardModal(cardId);
                setEditCardSettingsKey(settingsKey);
              }}
              conn={conn}
              getAddCardAvailableLabel={getAddCardAvailableLabel}
              getAddCardNoneLeftLabel={getAddCardNoneLeftLabel}
              t={t}
            />
          </ModalSuspense>
        )}

        {editingPage && (
          <ModalSuspense>
            <EditPageModal 
          isOpen={!!editingPage}
          onClose={() => setEditingPage(null)}
          t={t}
          editingPage={editingPage}
          pageSettings={pageSettings}
          savePageSetting={savePageSetting}
          pageDefaults={pageDefaults}
          onDelete={deletePage}
            />
          </ModalSuspense>
        )}

        {showAddPageModal && (
          <ModalSuspense>
            <AddPageModal 
          isOpen={showAddPageModal} 
          onClose={() => setShowAddPageModal(false)} 
          t={t}
          newPageLabel={newPageLabel}
          setNewPageLabel={setNewPageLabel}
          newPageIcon={newPageIcon}
          setNewPageIcon={setNewPageIcon}
          onCreate={createPage}
          onCreateMedia={createMediaPage}
            />
          </ModalSuspense>
        )}

        {showEditCardModal && (
          <ModalSuspense>
            <EditCardModal 
          isOpen={!!showEditCardModal}
          onClose={() => { setShowEditCardModal(null); setEditCardSettingsKey(null); }}
          t={t}
          entityId={showEditCardModal}
          entities={entities}
          canEditName={canEditName}
          canEditIcon={canEditIcon}
          canEditStatus={canEditStatus}
          isEditLight={isEditLight}
          isEditCalendar={isEditCalendar}
          isEditTodo={isEditTodo}
          isEditCost={isEditCost}
          isEditGenericType={isEditGenericType}
          isEditAndroidTV={isEditAndroidTV}
          isEditCar={isEditCar}
          isEditRoom={isEditRoom}
          isEditSensor={isEditSensor}
          isEditWeatherTemp={isEditWeatherTemp}
          editSettingsKey={editSettingsKey}
          editSettings={editSettings}
          conn={conn}
          customNames={customNames}
          saveCustomName={saveCustomName}
          customIcons={customIcons}
          saveCustomIcon={saveCustomIcon}
          saveCardSetting={saveCardSetting}
          hiddenCards={hiddenCards}
          toggleCardVisibility={toggleCardVisibility}
            />
          </ModalSuspense>
        )}

        {showSensorInfoModal && (
          <ModalSuspense>
            <SensorModal 
          isOpen={!!showSensorInfoModal}
          onClose={() => setShowSensorInfoModal(null)}
          entityId={showSensorInfoModal}
          entity={entities[showSensorInfoModal]}
          customName={customNames[showSensorInfoModal]}
          conn={conn}
          haUrl={activeUrl}
          haToken={config.token}
          t={t}
            />
          </ModalSuspense>
        )}

        <ModalSuspense>
          <HeaderSidebar
            open={showHeaderEditModal}
            onClose={() => setShowHeaderEditModal(false)}
            headerTitle={headerTitle}
            headerScale={headerScale}
            headerSettings={headerSettings}
            updateHeaderTitle={updateHeaderTitle}
            updateHeaderScale={updateHeaderScale}
            updateHeaderSettings={updateHeaderSettings}
            onSwitchToTheme={() => { setShowHeaderEditModal(false); setShowThemeSidebar(true); }}
            onSwitchToLayout={() => { setShowHeaderEditModal(false); setShowLayoutSidebar(true); }}
            t={t}
          />
        </ModalSuspense>

        {activeMediaModal && (
          <ModalSuspense>
            <MediaModal
          show={!!activeMediaModal}
          onClose={() => {
            setActiveMediaModal(null);
            setActiveMediaGroupKey(null);
            setActiveMediaGroupIds(null);
            setActiveMediaSessionSensorIds(null);
          }}
          activeMediaModal={activeMediaModal}
          activeMediaGroupKey={activeMediaGroupKey}
          activeMediaGroupIds={activeMediaGroupIds}
          activeMediaSessionSensorIds={activeMediaSessionSensorIds}
          activeMediaId={activeMediaId}
          setActiveMediaId={setActiveMediaId}
          entities={entities}
          cardSettings={cardSettings}
          customNames={customNames}
          mediaTick={mediaTick}
          callService={callService}
          getA={getA}
          getEntityImageUrl={getEntityImageUrl}
          isMediaActive={isMediaActive}
          isSonosActive={isSonosActive}
          t={t}
          formatDuration={formatDuration}
          getServerInfo={getServerInfo}
            />
          </ModalSuspense>
        )}

        {showStatusPillsConfig && (
          <ModalSuspense>
            <StatusPillsConfigModal
          show={showStatusPillsConfig}
          onClose={() => setShowStatusPillsConfig(false)}
          statusPillsConfig={statusPillsConfig}
          onSave={saveStatusPillsConfig}
          entities={entities}
          t={t}
            />
          </ModalSuspense>
        )}

        {showCalendarModal && (
          <ModalSuspense>
            <CalendarModal
          show={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          conn={conn}
          entities={entities}
          t={t}
            />
          </ModalSuspense>
        )}

        {showTodoModal && (() => {
          const todoSettingsKey = getCardSettingsKey(showTodoModal);
          const todoSettings = cardSettings[todoSettingsKey] || cardSettings[showTodoModal] || {};
          return (
            <ModalSuspense>
              <TodoModal
                show={true}
                onClose={() => setShowTodoModal(null)}
                conn={conn}
                entities={entities}
                settings={todoSettings}
                t={t}
              />
            </ModalSuspense>
          );
        })()}

        {showRoomModal && (() => {
          const roomSettingsKey = getCardSettingsKey(showRoomModal);
          const roomSettings = cardSettings[roomSettingsKey] || cardSettings[showRoomModal] || {};
          return (
            <ModalSuspense>
              <RoomModal
                show={true}
                onClose={() => setShowRoomModal(null)}
                settings={roomSettings}
                entities={entities}
                conn={conn}
                callService={(domain, service, data) => callService(domain, service, data)}
                t={t}
              />
            </ModalSuspense>
          );
        })()}

        {showWeatherModal && (() => {
          const settingsKey = getCardSettingsKey(showWeatherModal);
          const settings = cardSettings[settingsKey] || cardSettings[showWeatherModal] || {};
          const weatherEntity = settings.weatherId ? entities[settings.weatherId] : null;
          const tempEntity = settings.tempId ? entities[settings.tempId] : null;
          if (!weatherEntity) return null;

          return (
            <ModalSuspense>
              <WeatherModal
                show={true}
                onClose={() => setShowWeatherModal(null)}
                conn={conn}
                weatherEntity={weatherEntity}
                tempEntity={tempEntity}
                t={t}
              />
            </ModalSuspense>
          );
        })()}

        {showPersonModal && (
          <ModalSuspense>
            <PersonModal
          show={!!showPersonModal}
          onClose={() => setShowPersonModal(null)}
          personId={showPersonModal}
          entity={showPersonModal ? entities[showPersonModal] : null}
          entities={entities}
          customName={showPersonModal ? customNames[showPersonModal] : null}
          getEntityImageUrl={getEntityImageUrl}
          conn={conn}
          t={t}
          settings={showPersonModal ? (cardSettings[getCardSettingsKey(showPersonModal, 'header')] || cardSettings[showPersonModal] || {}) : {}}
            />
          </ModalSuspense>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { config } = useConfig();
  const [showOnboarding, setShowOnboarding] = useState(() => !config.token);

  const haConfig = showOnboarding
    ? { ...config, token: '' }
    : config;

  return (
    <HomeAssistantProvider config={haConfig}>
      <AppContent
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
      />
    </HomeAssistantProvider>
  );
}