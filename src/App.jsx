import { useState, useEffect, useMemo, useRef } from 'react';
import { en, nn } from './i18n';
import {
  Zap,
  Hash,
  Wind,
  Car,
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  User,
  UserCheck,
  MapPin,
  X,
  TrendingUp,
  Clock,
  Edit2,
  GripVertical,
  Check,
  Fan,
  ArrowUpDown,
  ArrowLeftRight,
  Plus,
  Minus,
  Lightbulb,
  RefreshCw,
  BatteryCharging,
  Navigation,
  Thermometer,
  DoorOpen,
  Snowflake,
  Battery,
  AlertCircle,
  TrendingDown,
  BarChart3,
  Eye,
  EyeOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Clapperboard,
  Server,
  HardDrive,
  Tv,
  Coins,
  Speaker,
  Sofa,
  Utensils,
  AirVent,
  LampDesk,
  LayoutGrid,
  Trash2,
  Workflow,
  Home,
  Bed,
  Bath,
  ShowerHead,
  Droplets,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Power,
  Wifi,
  Lock,
  Unlock,

  Video,
  Camera,
  Bell,
  Volume2,
  Mic,
  Radio,
  Gamepad2,
  Laptop,
  Smartphone,
  Watch,
  Coffee,
  Beer,
  Armchair,
  ShoppingCart,
  Calendar,
  Activity,
  Heart,
  Star,
  AlertTriangle,
  Warehouse,
  Columns,
  Bot,
  Shuffle,
  Repeat,
  Repeat1,
  VolumeX,
  Volume1,
  Link,
  Unlink,
  Search,
  Palette,
  Download,
  ArrowRight,
  CloudSun,
  AlarmClock,
  Archive,
  Award,
  Book,
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  Bus,
  Cpu,
  Database,
  DollarSign,
  Feather,
  Gift,
  Globe,
  Key,
  Leaf,
  Monitor,
  Paintbrush,
  PenTool,
  Plug,
  Puzzle,
  Rocket,
  Router,
  Siren,
  Sprout,
  Sunrise,
  Sunset,
  Truck,
  Wrench,
  ToggleLeft,
  ToggleRight,
  Maximize2,
  Minimize2
} from './icons';
import {
  CalendarCard,
  EmbyLogo,
  EnergyPowerCard,
  GenericAndroidTVCard,
  GenericClimateCard,
  GenericEnergyCostCard,
  JellyfinLogo,
  M3Slider,
  ModernDropdown,
  NRKLogo,
  PageNavigation,
  SensorCard,
  SettingsMenu,
  SonosPage,
  SparkLine,
  WeatherGraph,
  WeatherTempCard,
  getServerInfo
} from './components';
import {
  AddPageModal,
  CameraModal,
  ConfigModal,
  EditCardModal,
  EditPageModal,
  GenericAndroidTVModal,
  GenericClimateModal,
  LeafModal,
  LightModal,
  MediaModal,
  PowerModal,
  RockyModal,
  SensorModal,
  UpdateModal
} from './modals';
import { Header, StatusBar } from './layouts';


import {
  HomeAssistantProvider,
  useConfig,
  useHomeAssistant,
  usePages
} from './contexts';

import { themes } from './themes';
import { useEnergyData } from './hooks';
import { formatDuration } from './utils';
import { ICON_MAP } from './iconMap';
import { buildOnboardingSteps, validateUrl } from './onboarding';
import { callService as haCallService, getForecast, getHistory, getStatistics } from './services';
import { createDragAndDropHandlers } from './dragAndDrop';
import {
  NORDPOOL_ID,
  TIBBER_ID,
  LEAF_ID,
  WEATHER_ENTITY,
  OUTSIDE_TEMP_ID,
  OYVIND_ID,
  TUVA_ID,
  LIGHT_KJOKKEN,
  LIGHT_STOVA,
  LIGHT_STUDIO,
  REFRIGERATOR_ID,
  EILEV_DOOR_ID,
  OLVE_DOOR_ID,
  STUDIO_PRESENCE_ID,
  ROCKY_ID,
  ROCKY_ROOM_ID,
  PORTEN_MOTION_ID,
  GARAGE_DOOR_ID,
  CAMERA_PORTEN_ID,
  OYVIND_BAT_LEVEL,
  OYVIND_BAT_STATE,

  LEAF_CLIMATE,
  COST_TODAY_ID,
  COST_MONTH_ID,
  BIBLIOTEK_SESSIONS_ID,
  MEDIA_PLAYER_IDS,
  SONOS_IDS,
  LEAF_LOCATION,
  LEAF_PLUGGED,
  LEAF_CHARGING,
  LEAF_UPDATE,
  LEAF_RANGE,
  LEAF_LAST_UPDATED,
  LEAF_INTERNAL_TEMP
} from './constants';



function AppContent({ showOnboarding, setShowOnboarding }) {
  const {
    currentTheme,
    setCurrentTheme,
    toggleTheme,
    language,
    setLanguage,
    inactivityTimeout,
    setInactivityTimeout,
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
    headerScale,
    updateHeaderScale,
    headerTitle,
    updateHeaderTitle,
    persistCardSettings
  } = usePages();

  const {
    entities,
    connected,
    haUnavailable,
    haUnavailableVisible,
    conn,
    activeUrl
  } = useHomeAssistant();
  const [now, setNow] = useState(new Date());
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [activeClimateEntityModal, setActiveClimateEntityModal] = useState(null);
  const [showLightModal, setShowLightModal] = useState(null);
  const [showLeafModal, setShowLeafModal] = useState(false);

  const [showAndroidTVModal, setShowAndroidTVModal] = useState(null);
  const [showRockyModal, setShowRockyModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState('connection');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingUrlError, setOnboardingUrlError] = useState('');
  const [onboardingTokenError, setOnboardingTokenError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPageIcon, setNewPageIcon] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState({});
  const [showEditCardModal, setShowEditCardModal] = useState(null);
  const [showSensorInfoModal, setShowSensorInfoModal] = useState(null);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState(null);
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeMediaGroupKey, setActiveMediaGroupKey] = useState(null);
  const [mediaTick, setMediaTick] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [addCardType, setAddCardType] = useState('sensor');
  const [activeMediaId, setActiveMediaId] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [gridColCount, setGridColCount] = useState(1);
  const dragSourceRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const gearMenuRef = useRef(null);
  const gearButtonRef = useRef(null);
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
  const [optimisticLightBrightness, setOptimisticLightBrightness] = useState({});
  const [tempHistoryById, setTempHistoryById] = useState({});
  const resetToHome = () => {
    const isHome = activePage === 'home';
    const noModals = !showPowerModal && !activeClimateEntityModal && !showLightModal && !showLeafModal && !showAndroidTVModal && !showRockyModal && !showAddCardModal && !showCameraModal && !showConfigModal && !showUpdateModal && !showEditCardModal && !showSensorInfoModal && !activeMediaModal && !editingPage && !editMode;
    
    if (!isHome || !noModals) {
        setActivePage('home');
        setShowPowerModal(false);
        setActiveClimateEntityModal(null);
        setShowLightModal(null);
        setShowLeafModal(false);

        setShowRockyModal(false);
        setShowAddCardModal(false);
        setShowCameraModal(false);
        setShowConfigModal(false);
        setShowUpdateModal(false);
        setShowEditCardModal(null);
        setShowSensorInfoModal(null);
        setEditCardSettingsKey(null);
        setActiveMediaModal(null);
        setActiveMediaGroupKey(null);
        setEditingPage(null);
        setEditMode(false);
        setExpandedUpdate(null);
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
    if (!showMenu) return;
    const handler = (e) => {
      if (gearMenuRef.current && gearMenuRef.current.contains(e.target)) return;
      if (gearButtonRef.current && gearButtonRef.current.contains(e.target)) return;
      setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!showAddCardModal) setSearchTerm('');
  }, [showAddCardModal]);

  useEffect(() => {
    document.title = headerTitle || "Midttunet";
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
  }, [headerTitle]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeMediaModal) return;
    setMediaTick(Date.now());
    const intervalId = setInterval(() => setMediaTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [activeMediaModal]);

  useEffect(() => {
    // Clear optimistic updates when actual state comes back
    const timeout = setTimeout(() => {
      setOptimisticLightBrightness({});
    }, 500);
    return () => clearTimeout(timeout);
  }, [entities]);

  useEffect(() => {
    if (!config.token && !showOnboarding && !showConfigModal) {
      setShowOnboarding(true);
      setOnboardingStep(0);
      setConfigTab('connection');
    }
  }, [config.token, showOnboarding, showConfigModal]);


  const translations = useMemo(() => ({ en, nn }), []);
  const t = (key) => translations[language]?.[key] || translations.nn[key] || key;
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

  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    
    const fetchHistory = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 10);
      start.setHours(0, 0, 0, 0);
      
      try {
        const historyData = await getHistory(conn, { start, end, entityId: COST_TODAY_ID, minimal_response: false, no_attributes: true });
        if (historyData && Array.isArray(historyData)) {
           const daily = {};
           historyData.forEach(pt => {
              const s = pt.s !== undefined ? pt.s : pt.state;
              const lu = pt.lu !== undefined ? pt.lu : pt.last_updated;
              const val = parseFloat(s);
              if (isNaN(val)) return;
              const d = (typeof lu === 'number' ? new Date(lu * 1000) : new Date(lu)).toLocaleDateString('en-CA');
              if (!daily[d] || val > daily[d]) daily[d] = val;
           });
           
           // Ensure we have exactly the last 7 days filled
           const result = [];
           const today = new Date();
           for (let i = 6; i >= 0; i--) {
             const d = new Date(today);
             d.setDate(d.getDate() - i);
             const dateStr = d.toLocaleDateString('en-CA');
             const dayName = d.toLocaleDateString('nn-NO', { weekday: 'short' });
             const dayDate = d.toLocaleDateString('nn-NO', { day: 'numeric', month: 'numeric' });
             result.push({
                value: daily[dateStr] || 0,
                label: `${dayName} ${dayDate}`,
                date: dateStr
             });
           }
           
           if (!cancelled) setCostHistory(result);
        } else {
           console.warn("No history data found or unexpected format", res);
        }
      } catch (err) { if (!cancelled) console.error("History fetch error", err); }
    };
    fetchHistory();

    const fetchTempHistory = async () => {
      const end = new Date();
      const start = new Date();
      start.setHours(start.getHours() - 12);
      try {
        const stats = await getStatistics(conn, { start, end, statisticId: OUTSIDE_TEMP_ID, period: '5minute' });
        if (stats.length > 0) {
          const mapped = stats.map(s => ({ state: s.mean !== null ? s.mean : s.state, last_updated: s.start }));
          if (!cancelled) setTempHistory(mapped);
        } else {
          const historyData = await getHistory(conn, { start, end, entityId: OUTSIDE_TEMP_ID, minimal_response: false, no_attributes: true });
          if (historyData && !cancelled) setTempHistory(historyData);
        }
      } catch (e) { if (!cancelled) console.error("Temp history fetch error", e); }
    };
    fetchTempHistory();

    const fetchForecast = async () => {
        try {
           const hourly = await getForecast(conn, { entityId: WEATHER_ENTITY, type: 'hourly' });
           if (hourly.length > 0) {
             if (!cancelled) setWeatherForecast(hourly);
           } else {
             const daily = await getForecast(conn, { entityId: WEATHER_ENTITY, type: 'daily' });
             if (daily.length > 0 && !cancelled) setWeatherForecast(daily);
           }
        } catch (e) { if (!cancelled) console.error("Forecast fetch error", e); }
    };
    fetchForecast();

    // Refresh all data every 10 minutes
    const refreshInterval = setInterval(() => {
      if (!cancelled) {
        fetchHistory();
        fetchTempHistory();
        fetchForecast();
      }
    }, 600000);

    return () => { 
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [conn]);

  const fetchReleaseNotes = async (id) => {
    if (releaseNotes[id]) return;
    try {
        const res = await conn.sendMessagePromise({
            type: "update/release_notes",
            entity_id: id
        });
        setReleaseNotes(prev => ({ ...prev, [id]: res }));
    } catch (e) { console.error("Error fetching release notes", e); }
  };

  const isSonosActive = (entity) => {
    if (!entity || !entity.state) return false;
    if (entity.state === 'playing') return true;
    if (entity.state === 'paused') {
      const lastUpdated = new Date(entity.last_updated).getTime();
      const nowTime = now.getTime();
      return (nowTime - lastUpdated) < 120000;
    }
    return false;
  };

  const isMediaActive = (entity) => {
    if (!entity || !entity.state) return false;
    if (entity.state === 'playing') return true;
    const lastUpdated = new Date(entity.last_updated).getTime();
    const nowTime = now.getTime();
    return (nowTime - lastUpdated) < 30000;
  };

  const isMediaRecentlyPlaying = (entity) => {
    if (!entity || !entity.state) return false;
    if (entity.state === 'playing') return true;
    const lastChanged = new Date(entity.last_changed || entity.last_updated).getTime();
    const nowTime = now.getTime();
    return (nowTime - lastChanged) < 30000;
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
  const callService = (domain, service, data) => { if (conn) haCallService(conn, domain, service, data); };

  const nordpoolEntity = entities[NORDPOOL_ID];
  const { fullPriceData, currentPriceIndex, priceStats, currentPrice } = useEnergyData(nordpoolEntity || null, now);

  const personStatus = (id) => {
    const entity = entities[id];
    if (!entity && !editMode) return null;
    
    const isHome = entity?.state === 'home';
    const statusText = getS(id);
    const name = customNames[id] || entity?.attributes?.friendly_name || id;
    const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
    const headerSettingsKey = getCardSettingsKey(id, 'header');
    const headerSettings = cardSettings[headerSettingsKey] || {};
    const personDisplay = headerSettings.personDisplay || 'photo';
    const useIcon = personDisplay === 'icon';
    const PersonIcon = customIcons[id] ? ICON_MAP[customIcons[id]] : User;

    return (
      <div key={id} className="group relative flex items-center gap-2 sm:gap-3 pl-1.5 pr-2 sm:pr-5 py-1.5 rounded-full transition-all duration-500 hover:bg-[var(--glass-bg)]" 
           style={{
             backgroundColor: 'rgba(255, 255, 255, 0.02)', 
             boxShadow: isHome ? '0 0 20px rgba(34, 197, 94, 0.05)' : 'none',
             cursor: editMode ? 'pointer' : 'default'
           }}>
        
        {editMode && (
          <div className="absolute -top-2 -right-2 z-50 flex gap-1">
             <button onClick={(e) => { e.stopPropagation(); setShowEditCardModal(id); setEditCardSettingsKey(getCardSettingsKey(id, 'header')); }} className="p-1 rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"><Edit2 className="w-3 h-3" /></button>
             <button onClick={(e) => { e.stopPropagation(); removeCard(id, 'header'); }} className="p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"><X className="w-3 h-3" /></button>
          </div>
        )}
        
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden transition-all duration-500 bg-gray-800" 
            style={{filter: isHome ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.7)'}}>
            {useIcon ? (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                <PersonIcon className="w-5 h-5" />
              </div>
            ) : (
              picture ? (
                <img src={picture} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                  {name.substring(0, 1)}
                </div>
              )
            )}
          </div>
          
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#050505] transition-colors duration-500" 
            style={{backgroundColor: isHome ? '#22c55e' : '#52525b', borderColor: 'var(--bg-primary)'}}></div>
           </div>

        <div className="hidden sm:flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)] leading-none tracking-wide">{name}</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-1 transition-colors duration-300" style={{color: isHome ? '#4ade80' : 'rgba(156, 163, 175, 0.5)'}}>
            {String(statusText)}
          </span>
        </div>
      </div>
    );
  };

  const pageDefaults = {
    home: { label: t('page.home'), icon: LayoutGrid },
    lights: { label: t('page.lights'), icon: Lightbulb }
  };
  const pages = (pagesConfig.pages || []).map(id => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid
  }));

  useEffect(() => {
    if (showAddCardModal) setAddCardTargetPage(activePage);
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
    }
  }, [showAddCardModal]);

  useEffect(() => {
    if (!showAddCardModal) return;
    if (isSonosPage(addCardTargetPage)) {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'header' || addCardTargetPage === 'automations' || addCardTargetPage === 'settings') {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'lights') {
      setAddCardType('light');
      return;
    }
    setAddCardType('entity');
  }, [showAddCardModal, addCardTargetPage]);

  const getAddCardAvailableLabel = () => {
    if (addCardTargetPage === 'header') return t('addCard.available.people');
    if (addCardTargetPage === 'automations') return t('addCard.available.automations');
    if (addCardTargetPage === 'settings') return t('addCard.available.allEntities');
    if (addCardType === 'vacuum') return t('addCard.available.vacuums');
    if (addCardType === 'climate') return t('addCard.available.climates');
    if (addCardType === 'cost') return t('addCard.available.costs');
    if (addCardType === 'media') return t('addCard.available.players');
    if (addCardType === 'toggle') return t('addCard.available.toggles');
    if (addCardType === 'entity') return t('addCard.available.entities');
    return t('addCard.available.lights');
  };

  const getAddCardNoneLeftLabel = () => {
    const itemKey = addCardTargetPage === 'header'
      ? 'addCard.item.people'
      : addCardTargetPage === 'automations'
        ? 'addCard.item.automations'
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
              : addCardType === 'toggle'
                ? 'addCard.item.toggles'
                : addCardType === 'entity'
                  ? 'addCard.item.entities'
                  : 'addCard.item.lights';

    return t('addCard.noneLeft').replace('{item}', t(itemKey));
  };

  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    const tempIds = Object.keys(cardSettings)
      .filter(key => key.includes('::weather_temp_'))
      .map(key => cardSettings[key]?.tempId)
      .filter(Boolean);

    const uniqueIds = Array.from(new Set(tempIds));

    const fetchHistoryFor = async (tempId) => {
      const end = new Date();
      const start = new Date();
      start.setHours(start.getHours() - 12);
      try {
        const stats = await getStatistics(conn, { start, end, statisticId: tempId, period: '5minute' });
        if (!cancelled && Array.isArray(stats) && stats.length > 0) {
          const mapped = stats.map(s => ({ state: s.mean !== null ? s.mean : s.state, last_updated: s.start }));
          setTempHistoryById(prev => ({ ...prev, [tempId]: mapped }));
          return;
        }
        const historyData = await getHistory(conn, { start, end, entityId: tempId, minimal_response: false, no_attributes: true });
        if (!cancelled && historyData) {
          setTempHistoryById(prev => ({ ...prev, [tempId]: historyData }));
        }
      } catch (e) {
        if (!cancelled) console.error("Temp history fetch error", e);
      }
    };

    // Fetch all temperature histories immediately
    uniqueIds.forEach((tempId) => {
      if (tempId !== OUTSIDE_TEMP_ID) {
        fetchHistoryFor(tempId);
      }
    });

    // Refresh every 5 minutes (300000ms)
    const refreshInterval = setInterval(() => {
      if (!cancelled) {
        uniqueIds.forEach((tempId) => {
          if (tempId !== OUTSIDE_TEMP_ID) {
            fetchHistoryFor(tempId);
          }
        });
      }
    }, 300000);

    return () => { 
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [conn, cardSettings]);

  const activeGridColumns = pageSettings[activePage]?.gridColumns ?? gridColumns;

  useEffect(() => {
    const updateGridCols = () => {
      const width = window.innerWidth;
      if (width >= 1024) setGridColCount(activeGridColumns === 4 ? 4 : 3);
      else if (width >= 768) setGridColCount(2);
      else setGridColCount(1);
    };

    updateGridCols();
    window.addEventListener('resize', updateGridCols);
    return () => window.removeEventListener('resize', updateGridCols);
  }, [activeGridColumns]);

  const getCardSettingsKey = (cardId, pageId = activePage) => `${pageId}::${cardId}`;

  const isCardRemovable = (cardId, pageId = activePage) => {
    if (pageId === 'header') return cardId.startsWith('person.');
    if (pageId === 'settings') {
      if (['power', 'car'].includes(cardId)) return false;
      if (cardId.startsWith('media_player') || cardId.startsWith('sonos')) return false;
      return true;
    }
    const settingsKey = getCardSettingsKey(cardId, pageId);
    const typeSetting = cardSettings[settingsKey]?.type || cardSettings[cardId]?.type;
    if (typeSetting === 'entity' || typeSetting === 'toggle' || typeSetting === 'sensor') return true;
    if (cardId.startsWith('light_')) return true;
    if (cardId.startsWith('light.')) return true;
    if (cardId.startsWith('vacuum.')) return true;
    if (cardId.startsWith('media_player.')) return true;
    if (cardId.startsWith('media_group_')) return true;
    if (cardId.startsWith('weather_temp_')) return true;
    if (cardId.startsWith('calendar_card_')) return true;
    if (cardId.startsWith('climate_card_')) return true;
    if (cardId.startsWith('cost_card_')) return true;
    if (cardId.startsWith('androidtv_card_')) return true;
    return false;
  };

  const isCardHiddenByLogic = (cardId) => {
    if (cardId === 'media_player') {
      const sonosHomeKey = getCardSettingsKey('sonos', 'home');
      const selectedSonosId = cardSettings[sonosHomeKey]?.activeId || cardSettings['sonos']?.activeId;
      const lydplankeSelected = selectedSonosId === 'media_player.sonos_lydplanke';

      const mediaIds = Object.keys(entities).filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'));
      const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
      const otherPlaying = mediaEntities.some(entity => entity?.state === 'playing');

      let lydplankeIsTV = false;
      if (lydplankeSelected) {
        const lydplanke = entities['media_player.sonos_lydplanke'];
        const lydplankeIsPlaying = lydplanke?.state === 'playing';
        const lydplankeSource = (lydplanke?.attributes?.source || '').toLowerCase();
        const lydplankeTitle = (lydplanke?.attributes?.media_title || '').toLowerCase();
        lydplankeIsTV = lydplankeIsPlaying && (lydplankeSource === 'tv' || lydplankeTitle === 'tv');
      }

      if (lydplankeIsTV && !otherPlaying) return true;
      return false;
    }

    if (cardId.startsWith('media_group_')) {
      const settingsKey = getCardSettingsKey(cardId);
      const groupSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
      const selectedIds = Array.isArray(groupSettings.mediaIds) ? groupSettings.mediaIds : [];
      const mediaEntities = selectedIds.map(id => entities[id]).filter(Boolean);

      const lydplankeSelected = selectedIds.includes('media_player.sonos_lydplanke');
      let lydplankeIsTV = false;
      if (lydplankeSelected) {
        const lydplanke = entities['media_player.sonos_lydplanke'];
        const lydplankeIsPlaying = lydplanke?.state === 'playing';
        const lydplankeSource = (lydplanke?.attributes?.source || '').toLowerCase();
        const lydplankeTitle = (lydplanke?.attributes?.media_title || '').toLowerCase();
        lydplankeIsTV = lydplankeIsPlaying && (lydplankeSource === 'tv' || lydplankeTitle === 'tv');
      }

      const otherSelectedPlaying = mediaEntities
        .filter(entity => entity?.entity_id !== 'media_player.sonos_lydplanke')
        .some(entity => entity?.state === 'playing');

      if (lydplankeIsTV && !otherSelectedPlaying) return true;
      return false;
    }

    if (cardId === 'sonos') {
      const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
      return sonosEntities.length === 0;
    }

    if (activePage === 'settings' && !['power', 'energy_cost', 'rocky', 'car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      if (activePage === 'settings' && !['power', 'rocky', 'car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
        return !entities[cardId];
      }
    }

    return false;
  };

  const saveColumnTitle = (colIndex, title) => {
    const newConfig = { ...pagesConfig };
    newConfig.automations[colIndex].title = title;
    persistConfig(newConfig);
  };

  const isSonosPage = (pageId) => {
    if (!pageId) return false;
    const settings = pageSettings[pageId];
    return settings?.type === 'sonos' || pageId.startsWith('sonos');
  };

  const isToggleEntity = (id) => {
    const domain = id?.split('.')?.[0];
    const toggleDomains = ['automation', 'switch', 'input_boolean', 'script', 'fan'];
    return toggleDomains.includes(domain);
  };

  const removeCard = (cardId, listName = activePage) => {
    const newConfig = { ...pagesConfig };
    if (listName === 'header') {
        newConfig.header = (newConfig.header || []).filter(id => id !== cardId);
        persistConfig(newConfig);
    } else if (newConfig[activePage]) {
      if (activePage === 'automations' && listName !== 'header') {
        newConfig.automations.forEach(col => {
          col.cards = col.cards.filter(id => id !== cardId);
        });
      } else {
        newConfig[activePage] = newConfig[activePage].filter(id => id !== cardId);
      }
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

  const createSonosPage = () => {
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

    const slugBase = baseLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sonos';
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
    savePageSetting(pageId, 'type', 'sonos');

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

  const handleAddSelected = () => {
    const newConfig = { ...pagesConfig };
    if (addCardTargetPage === 'header') {
      newConfig.header = [...(newConfig.header || []), ...selectedEntities];
      persistConfig(newConfig);
      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardTargetPage === 'automations') {
      newConfig.automations[0].cards.push(...selectedEntities);
      persistConfig(newConfig);
      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'weather') {
      if (!selectedWeatherId) return;
      const cardId = `weather_temp_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      persistConfig(newConfig);

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), weatherId: selectedWeatherId, tempId: selectedTempId || null } };
      persistCardSettings(newSettings);

      setSelectedWeatherId(null);
      setSelectedTempId(null);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'calendar') {
        const cardId = selectedEntities.length === 1 && selectedEntities[0].startsWith('calendar_card_') 
            ? selectedEntities[0] 
            : `calendar_card_${Date.now()}`;
            
        newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
        persistConfig(newConfig);
        
        setShowAddCardModal(false);
        return;
    }

    if (addCardType === 'media') {
      if (selectedEntities.length === 0) return;
      const cardId = `media_group_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      persistConfig(newConfig);

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), mediaIds: selectedEntities } };
      persistCardSettings(newSettings);

      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'climate') {
      if (selectedEntities.length === 0) return;
      
      const newCardIds = [];
      const newSettings = { ...cardSettings };
      
      selectedEntities.forEach((entityId) => {
        const cardId = `climate_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newCardIds.push(cardId);
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), climateId: entityId };
      });
      
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...newCardIds];
      persistConfig(newConfig);
      
      persistCardSettings(newSettings);

      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'androidtv') {
      if (!selectedAndroidTVMediaId) return;
      const cardId = `androidtv_card_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      persistConfig(newConfig);

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = {
        ...cardSettings,
        [settingsKey]: { 
          ...(cardSettings[settingsKey] || {}), 
          mediaPlayerId: selectedAndroidTVMediaId,
          remoteId: selectedAndroidTVRemoteId || null
        }
      };
      persistCardSettings(newSettings);

      setSelectedAndroidTVMediaId(null);
      setSelectedAndroidTVRemoteId(null);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'cost') {
      if (!selectedCostTodayId || !selectedCostMonthId) return;
      const cardId = `cost_card_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      persistConfig(newConfig);

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = {
        ...cardSettings,
        [settingsKey]: {
          ...(cardSettings[settingsKey] || {}),
          todayId: selectedCostTodayId,
          monthId: selectedCostMonthId
        }
      };
      persistCardSettings(newSettings);

      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'entity' || addCardType === 'toggle' || addCardType === 'sensor') {
      const newSettings = { ...cardSettings };
      selectedEntities.forEach((id) => {
        const settingsKey = getCardSettingsKey(id, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), type: addCardType, size: newSettings[settingsKey]?.size || 'large' };
      });
      persistCardSettings(newSettings);
    }

    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...selectedEntities];
    persistConfig(newConfig);
    setSelectedEntities([]);
    setShowAddCardModal(false);
  };


  const renderSensorCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const entity = entities[cardId];
    if (!entity) return null;
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const name = customNames[cardId] || getA(cardId, 'friendly_name', cardId);
    const domain = cardId.split('.')[0];
    const defaultIcons = { sensor: Activity, input_number: Hash, input_boolean: ToggleRight, switch: Power, default: Activity };
    const DefaultIcon = defaultIcons[domain] || defaultIcons.default;
    const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : DefaultIcon;

    const handleControl = (action) => {
      if (domain === 'input_number') {
        if (action === 'increment') callService('input_number', 'increment', { entity_id: cardId });
        if (action === 'decrement') callService('input_number', 'decrement', { entity_id: cardId });
      }
      if (domain === 'input_boolean' || domain === 'switch' || domain === 'light' || domain === 'automation') {
         if (action === 'toggle') callService(domain, 'toggle', { entity_id: cardId });
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
        onOpen={() => { if (!editMode) setShowSensorInfoModal(cardId); }}
      />
    );
  };

  // --- CARD RENDERERS ---
  
  const renderLightCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    let currentLId = cardId;
    
    if (cardId === 'light_kjokken') currentLId = LIGHT_KJOKKEN;
    else if (cardId === 'light_stova') currentLId = LIGHT_STOVA;
    else if (cardId === 'light_studio') currentLId = LIGHT_STUDIO;
    
    let DefaultIcon = Lightbulb;
    if (currentLId === LIGHT_KJOKKEN) DefaultIcon = Utensils;
    else if (currentLId === LIGHT_STOVA) DefaultIcon = Sofa;
    else if (currentLId === LIGHT_STUDIO) DefaultIcon = LampDesk;
    
    const LightIcon = customIcons[currentLId] ? ICON_MAP[customIcons[currentLId]] : DefaultIcon;
    const entity = entities[currentLId];
    const state = entity?.state;
    const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
    const isOn = state === "on";
    const br = getA(currentLId, "brightness") || 0;
    const subEntities = getA(currentLId, "entity_id", []);
    const activeCount = subEntities.filter(id => entities[id]?.state === 'on').length;
    const totalCount = subEntities.length;
    const name = customNames[currentLId] || getA(currentLId, "friendly_name");

    const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size || cardSettings[currentLId]?.size;
    const isSmall = sizeSetting === 'small';

    if (isSmall) {
      return (
        <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLightModal(currentLId); }} className={`p-4 pl-5 rounded-3xl flex items-center gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={cardStyle}>
          {getControls(currentLId)}
          
          <button 
            onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} 
            className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'}`} 
            disabled={isUnavailable}
          >
            <LightIcon className={`w-6 h-6 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} />
          </button>

          <div className="flex-1 flex flex-col gap-3 min-w-0 justify-center h-full pt-1">
            <div className="flex justify-between items-baseline pr-1">
              <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none">{String(name || t('common.light'))}</p>
              <span className={`text-xs uppercase font-bold tracking-widest leading-none transition-colors ${isOn ? 'text-amber-400' : 'text-[var(--text-secondary)] opacity-50'}`}>{isOn ? `${Math.round(((optimisticLightBrightness[currentLId] ?? br) / 255) * 100)}%` : t('common.off')}</span>
            </div>
            <div className="w-full">
               <M3Slider variant="thinLg" min={0} max={255} step={1} value={optimisticLightBrightness[currentLId] ?? br} disabled={!isOn || isUnavailable} onChange={(e) => { const val = parseInt(e.target.value); setOptimisticLightBrightness(prev => ({ ...prev, [currentLId]: val })); callService("light", "turn_on", { entity_id: currentLId, brightness: val }); }} colorClass="bg-amber-500" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLightModal(currentLId); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={cardStyle}>
        {getControls(currentLId)}
        <div className="flex justify-between items-start"><button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} className={`p-3 rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`} disabled={isUnavailable}><LightIcon className={`w-5 h-5 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} /></button><div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isUnavailable ? 'bg-red-500/10 border-red-500/20 text-red-500' : (isOn ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]')}`}><span className="text-xs tracking-widest uppercase font-bold">{isUnavailable ? t('status.unavailable') : (totalCount > 0 ? (activeCount > 0 ? `${activeCount}/${totalCount}` : t('common.off')) : (isOn ? t('common.on') : t('common.off')))}</span></div></div>
        <div className="mt-2 font-sans"><p className="text-[var(--text-secondary)] text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">{String(name || t('common.light'))}</p><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{isUnavailable ? "--" : (isOn ? Math.round(((optimisticLightBrightness[currentLId] ?? br) / 255) * 100) : "0")}</span><span className="text-[var(--text-muted)] font-medium text-base ml-1">%</span></div><M3Slider min={0} max={255} step={1} value={optimisticLightBrightness[currentLId] ?? br} disabled={!isOn || isUnavailable} onChange={(e) => { const val = parseInt(e.target.value); setOptimisticLightBrightness(prev => ({ ...prev, [currentLId]: val })); callService("light", "turn_on", { entity_id: currentLId, brightness: val }); }} colorClass="bg-amber-500" /></div>
      </div>
    );
  };

  const renderAutomationCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const isSmall = settings.size === 'small';
    const isOn = entities[cardId]?.state === 'on';
    const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
    const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : Workflow;
    
    return (
      <div key={cardId} {...dragProps} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans mb-3 break-inside-avoid ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isOn ? 'rgba(59, 130, 246, 0.03)' : 'rgba(15, 23, 42, 0.6)', borderColor: isOn ? 'rgba(59, 130, 246, 0.15)' : (editMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.04)')}} onClick={(e) => { if(!editMode) callService("automation", "toggle", { entity_id: cardId }); }}>
        {getControls(cardId)}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
          <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-sm font-bold text-[var(--text-primary)] leading-tight">{friendlyName}</span></div><span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mt-0.5">{isOn ? t('status.active') : t('status.off')}</span></div>
        </div>
        <div className={`w-10 h-6 rounded-full relative transition-all ${isOn ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'left-[calc(100%-20px)]' : 'left-1'}`} /></div>
      </div>
    );
  };


  const renderCarCard = (dragProps, getControls, cardStyle) => {
    const isHtg = entities[LEAF_CLIMATE]?.state === 'heat_cool';
    const isCharging = entities[LEAF_CHARGING]?.state === 'on';
    const name = customNames['car'] || 'Nissan Leaf';
    const Icon = customIcons['car'] ? ICON_MAP[customIcons['car']] : Car;
    
    return (
      <div key="car" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLeafModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (isHtg ? 'rgba(249, 115, 22, 0.3)' : 'var(--card-border)')}}>
        {getControls('car')}
        <div className="flex justify-between items-start font-sans">
          <div className={`p-3 rounded-2xl transition-all ${isHtg ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-green-500/10 text-green-400'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{getS(LEAF_LOCATION)}</span></div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><Thermometer className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{String(getS(LEAF_INTERNAL_TEMP))}°</span></div>
            {isHtg && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse"><Flame className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">Varmar</span></div>}
          </div>
        </div>
        <div className="flex justify-between items-end"><div><p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p><div className="flex items-baseline gap-2 leading-none font-sans"><span className={`text-2xl font-medium leading-none ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>{String(getS(LEAF_ID))}%</span>{isCharging && <Zap className="w-5 h-5 text-green-400 animate-pulse -ml-1 mb-1" fill="currentColor" />}<span className="text-[var(--text-muted)] font-medium text-base ml-1">{String(getS(LEAF_RANGE))}km</span></div></div></div>
      </div>
    );
  };

  const renderSonosPageCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
    if (sonosEntities.length === 0) return null;

    const activeSonos = sonosEntities.filter(isSonosActive);
    const localActiveId = cardSettings[settingsKey]?.activeId;
    let currentSonos = sonosEntities.find(e => e.entity_id === localActiveId) || activeSonos.find(e => e.state === 'playing') || activeSonos[0] || sonosEntities[0];
    if (!currentSonos) return null;

    const sId = currentSonos.entity_id;
    const sIsPlaying = currentSonos.state === 'playing';
    const isLydplanke = sId === 'media_player.sonos_lydplanke';
    const isTV = isLydplanke && (currentSonos.attributes?.source === 'TV' || currentSonos.attributes?.media_title === 'TV');
    const sTitle = isTV ? t('media.tvAudio') : getA(sId, 'media_title');
    const sArtist = isTV ? t('media.livingRoom') : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
    const sPicture = !isTV ? getEntityImageUrl(currentSonos.attributes?.entity_picture) : null;
    const sName = customNames[sId] || getA(sId, 'friendly_name', 'Sonos').replace(/^(Sonos)\s*/i, '');

    const volume = getA(sId, 'volume_level', 0);
    const isMuted = getA(sId, 'is_volume_muted', false);
    const shuffle = getA(sId, 'shuffle', false);
    const repeat = getA(sId, 'repeat', 'off');
    const rawMembers = getA(sId, 'group_members');
    const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];
    const playlists = Array.isArray(getA(sId, 'source_list')) ? getA(sId, 'source_list') : [];
    const currentSource = cardSettings[settingsKey]?.playlist || getA(sId, 'source');

    const listPlayers = sonosEntities
      .slice()
      .sort((a, b) => {
        const aActive = isSonosActive(a);
        const bActive = isSonosActive(b);
        if (aActive !== bActive) return aActive ? -1 : 1;
        return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
      });

    return (
      <div key={cardId} {...dragProps} className={`p-7 rounded-3xl flex flex-col transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer' : 'cursor-move'}`} style={cardStyle}>
        {getControls(cardId)}
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                  <Speaker className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)]">SONOS</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{sName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
                <span className="text-xs tracking-widest uppercase font-bold">{sIsPlaying ? t('status.playing') : t('status.off')}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-56 h-56 rounded-3xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)] relative">
                {sPicture ? (
                  <img src={sPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isTV ? <Tv className="w-12 h-12 text-gray-600" /> : <Speaker className="w-12 h-12 text-gray-600" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-300 truncate">{sArtist || ''}</p>
                  <h3 className="text-lg font-bold text-white truncate">{sTitle || t('common.unknown')}</h3>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-center gap-6">
                  <button onClick={() => callService('media_player', 'shuffle_set', { entity_id: sId, shuffle: !shuffle })} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Shuffle className="w-4 h-4" /></button>

                  <button onClick={() => callService('media_player', 'media_previous_track', { entity_id: sId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipBack className="w-5 h-5 text-[var(--text-secondary)]" /></button>
                  <button onClick={() => callService('media_player', 'media_play_pause', { entity_id: sId })} className="w-12 h-12 flex items-center justify-center rounded-full transition-colors active:scale-95 shadow-lg" style={{backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)'}}>
                    {sIsPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <button onClick={() => callService('media_player', 'media_next_track', { entity_id: sId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipForward className="w-5 h-5 text-[var(--text-secondary)]" /></button>

                  <button onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService('media_player', 'repeat_set', { entity_id: sId, repeat: nextMode }); }} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                    {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-3 px-2 pt-2 border-t border-[var(--glass-border)]">
                  <button onClick={() => callService('media_player', 'volume_mute', { entity_id: sId, is_volume_muted: !isMuted })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : (volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)}
                  </button>
                  <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService('media_player', 'volume_set', { entity_id: sId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
                </div>

                {playlists.length > 0 ? (
                  <div className="pt-2 border-t border-[var(--glass-border)]">
                    <ModernDropdown
                      label={t('sonos.playlist')}
                      icon={Music}
                      options={playlists}
                      current={currentSource}
                      onChange={(value) => {
                        saveCardSetting(settingsKey, 'playlist', value);
                        callService('media_player', 'select_source', { entity_id: sId, source: value });
                      }}
                      placeholder={t('sonos.playlistPlaceholder')}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">{t('sonos.noPlaylists')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[var(--glass-border)] pt-6 lg:pt-0 lg:pl-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{t('media.group.sonosPlayers')}</h3>
              {listPlayers.length > 1 && (
                <button
                  onClick={() => {
                    const allIds = listPlayers.map(p => p.entity_id);
                    const unjoined = allIds.filter(id => !groupMembers.includes(id));
                    if (unjoined.length > 0) {
                      callService('media_player', 'join', { entity_id: sId, group_members: unjoined });
                    } else {
                      const others = groupMembers.filter(id => id !== sId);
                      others.forEach(id => callService('media_player', 'unjoin', { entity_id: id }));
                    }
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                >
                  {listPlayers.every(p => groupMembers.includes(p.entity_id)) ? t('sonos.ungroupAll') : t('sonos.groupAll')}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {listPlayers.length === 0 && <p className="text-gray-600 italic text-sm">{t('media.noPlayersFound')}</p>}
              {listPlayers.map((p, idx) => {
                const pPic = getEntityImageUrl(p.attributes?.entity_picture);
                const isSelected = p.entity_id === sId;
                const isMember = groupMembers.includes(p.entity_id);
                const isSelf = p.entity_id === sId;
                const isActivePlayer = isSonosActive(p);
                const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));

                return (
                  <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'hover:bg-[var(--glass-bg)] border-transparent'} ${isActivePlayer ? '' : 'opacity-70'}`}>
                    <button onClick={() => saveCardSetting(settingsKey, 'activeId', p.entity_id)} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0 relative">
                        {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Speaker className="w-5 h-5 text-gray-600" /></div>}
                        {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{(p.attributes?.friendly_name || '').replace(/^(Sonos)\s*/i, '')}</p>
                        <p className="text-[10px] text-gray-600 truncate mt-0.5">{pTitle}</p>
                      </div>
                    </button>
                    {!isSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMember) {
                            callService('media_player', 'unjoin', { entity_id: p.entity_id });
                          } else {
                            callService('media_player', 'join', { entity_id: sId, group_members: [p.entity_id] });
                          }
                        }}
                        className={`p-2.5 rounded-full transition-all ${isMember ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                        title={isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')}
                      >
                        {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    )}
                    {isSelf && groupMembers.length > 1 && (
                      <div className="p-2.5 rounded-full bg-blue-500/20 text-blue-400" title="Linka">
                        <Link className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRockyCard = (dragProps, getControls, cardStyle) => {
    const state = entities[ROCKY_ID]?.state;
    const battery = getA(ROCKY_ID, "battery_level");
    const room = entities[ROCKY_ROOM_ID]?.state;
    const isCleaning = state === "cleaning";
    const isReturning = state === "returning";
    const isDocked = state === "docked";
    const statusText = isCleaning ? t('vacuum.cleaning') : isReturning ? t('vacuum.returning') : isDocked ? t('vacuum.charging') : state;
    const name = customNames['rocky'] || 'Rocky';
    const Icon = customIcons['rocky'] ? ICON_MAP[customIcons['rocky']] : Bot;
    
    return (
      <div key="rocky" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowRockyModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isCleaning ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (isCleaning ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)')}}>
        {getControls('rocky')}
        <div className="flex justify-between items-start font-sans">
           <div className={`p-3 rounded-2xl transition-all ${isCleaning ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
           <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{room || t('vacuum.unknown')}</span></div>
             {battery && <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><Battery className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{battery}%</span></div>}
           </div>
        </div>
        
        <div className="flex justify-between items-end">
           <div>
             <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p>
             <h3 className="text-2xl font-medium text-[var(--text-primary)] leading-none">{statusText}</h3>
           </div>
           <div className="flex gap-2">
             <button onClick={(e) => { e.stopPropagation(); callService("vacuum", isCleaning ? "pause" : "start", { entity_id: ROCKY_ID }); }} className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-primary)] active:scale-95">
               {isCleaning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
             </button>
             <button onClick={(e) => { e.stopPropagation(); callService("vacuum", "return_to_base", { entity_id: ROCKY_ID }); }} className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95">
               <Home className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>
    );
  };

  const renderVacuumCard = (vacuumId, dragProps, getControls, cardStyle, settingsKey) => {
    const entity = entities[vacuumId];
    if (!entity) return null;

    const settings = cardSettings[settingsKey] || cardSettings[vacuumId] || {};
    const isSmall = settings.size === 'small';
    const state = entity?.state;
    const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
    const battery = getA(vacuumId, "battery_level");
    const room = getA(vacuumId, "current_room") || getA(vacuumId, "room");
    const name = customNames[vacuumId] || getA(vacuumId, "friendly_name", t('vacuum.name'));
    const Icon = customIcons[vacuumId] ? ICON_MAP[customIcons[vacuumId]] : Bot;
    const statusText = (() => {
      if (state === "cleaning") return t('vacuum.cleaning');
      if (state === "returning") return t('vacuum.returning');
      if ((state === "charging" || state === "docked") && battery === 100) return t('vacuum.docked');
      if (state === "docked") return t('vacuum.charging');
      if (state === "idle") return t('vacuum.idle');
      return state || t('vacuum.unknown');
    })();

    const showRoom = !!room;
    const showBattery = typeof battery === 'number';

    if (isSmall) {
      return (
        <div key={vacuumId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowRockyModal(true); }} className={`p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={{...cardStyle, backgroundColor: state === "cleaning" ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (state === "cleaning" ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)'), containerType: 'inline-size'}}>
          {getControls(vacuumId)}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${state === "cleaning" ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
              <Icon className="w-6 h-6 stroke-[1.5px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{statusText}</span>
                {showBattery && <span className="text-xs text-[var(--text-secondary)]">{battery}%</span>}
              </div>
            </div>
          </div>
          <div className="vacuum-card-controls shrink-0">
            <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", state === "cleaning" ? "pause" : "start", { entity_id: vacuumId }); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-primary)] active:scale-95">
              {state === "cleaning" ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", "return_to_base", { entity_id: vacuumId }); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95">
              <Home className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={vacuumId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowRockyModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={{...cardStyle, backgroundColor: state === "cleaning" ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (state === "cleaning" ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)')}}>
        {getControls(vacuumId)}
        <div className="flex justify-between items-start font-sans">
           <div className={`p-3 rounded-2xl transition-all ${state === "cleaning" ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
           <div className="flex flex-col items-end gap-2">
             {showRoom && (
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{room}</span></div>
             )}
             {showBattery && (
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><Battery className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{battery}%</span></div>
             )}
           </div>
        </div>
        
        <div className="flex justify-between items-end">
           <div>
             <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p>
             <h3 className="text-2xl font-medium text-[var(--text-primary)] leading-none">{statusText}</h3>
           </div>
           <div className="flex gap-2">
             <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", state === "cleaning" ? "pause" : "start", { entity_id: vacuumId }); }} className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-primary)] active:scale-95">
               {state === "cleaning" ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
             </button>
             <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", "return_to_base", { entity_id: vacuumId }); }} className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95">
               <Home className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>
    );
  };

  const renderMediaPlayerCard = (mpId, dragProps, getControls, cardStyle) => {
    const entity = entities[mpId];
    if (!entity) return null;

    const mpState = entity?.state;
    const isPlaying = mpState === 'playing';
    const isActive = isMediaActive(entity);
    const name = customNames[mpId] || getA(mpId, 'friendly_name', 'Media Player');
    const title = getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMedia'));
    const subtitle = getA(mpId, 'media_artist') || getA(mpId, 'media_series_title') || getA(mpId, 'media_album_name') || '';
    const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
    const isChannel = getA(mpId, 'media_content_type') === 'channel';

    if (!isActive) {
      return (
        <div key={mpId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: 'var(--text-primary)'}}>
          {getControls(mpId)}
          <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'var(--glass-bg)'}}>
            {isChannel ? <Tv className="w-8 h-8 text-[var(--text-secondary)]" /> : <Speaker className="w-8 h-8 text-[var(--text-secondary)]" />}
          </div>
          <div className="text-center w-full px-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{t('media.noneMusic')}</p>
            <div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-[var(--text-muted)] opacity-40 truncate">{name}</p></div>
          </div>
        </div>
      );
    }

    return (
      <div key={mpId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: picture ? 'white' : 'var(--text-primary)'}}>
        {getControls(mpId)}
        {picture && (
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <img src={picture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${isPlaying ? 'scale-[1.6]' : 'scale-150'}`} />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        <div className="relative z-10 flex gap-4 items-start">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg">
            {picture ? <img src={picture} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isChannel ? <Tv className="w-8 h-8 text-[var(--text-secondary)]" /> : <Speaker className="w-8 h-8 text-[var(--text-secondary)]" />}</div>}
          </div>
          <div className="flex flex-col overflow-hidden pt-1">
            <div className="flex items-center gap-2 mb-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate">{name}</p></div>
            <h3 className="text-lg font-bold leading-tight truncate mb-0.5">{title || t('common.unknown')}</h3>
            {subtitle && <p className={`${picture ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs truncate font-medium`}>{subtitle}</p>}
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center gap-8 mt-2">
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_previous_track", { entity_id: mpId }); }} className={`${picture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipBack className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_play_pause", { entity_id: mpId }); }} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button>
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_next_track", { entity_id: mpId }); }} className={`${picture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipForward className="w-6 h-6" /></button>
        </div>
      </div>
    );
  };

  const renderMediaGroupCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const groupSettings = cardSettings[settingsKey] || {};
    const mediaIds = Array.isArray(groupSettings.mediaIds) ? groupSettings.mediaIds : [];
    const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);

    if (mediaEntities.length === 0) return null;

    const activeEntities = mediaEntities.filter(isMediaActive);
    const playingEntities = mediaEntities.filter(e => e.state === 'playing');
    const pool = activeEntities.length > 0 ? activeEntities : mediaEntities;
    const cyclePool = playingEntities.length > 1 ? playingEntities : (activeEntities.length > 1 ? activeEntities : pool);

    let currentMp = pool.find(e => e.entity_id === groupSettings.activeId);
    if (!currentMp) currentMp = (playingEntities[0] || pool[0]);

    if (!currentMp) return null;

    const mpId = currentMp.entity_id;
    const mpState = currentMp.state;
    const isPlaying = mpState === 'playing';
    const isActive = activeEntities.length > 0;
    const name = customNames[cardId] || getA(mpId, 'friendly_name', 'Musikk');
    const title = getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMusic'));
    const subtitle = getA(mpId, 'media_artist') || getA(mpId, 'media_series_title') || getA(mpId, 'media_album_name') || '';
    const picture = getEntityImageUrl(currentMp.attributes?.entity_picture);
    const isChannel = getA(mpId, 'media_content_type') === 'channel';

    const cyclePlayers = (e) => {
      e.stopPropagation();
      if (cyclePool.length < 2) return;
      const idx = cyclePool.findIndex(e => e.entity_id === mpId);
      const next = cyclePool[(idx + 1) % cyclePool.length];
      saveCardSetting(settingsKey, 'activeId', next.entity_id);
    };

    if (!isActive) {
      return (
        <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaGroupKey(settingsKey); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: 'var(--text-primary)'}}>
          {getControls(cardId)}
          <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'var(--glass-bg)'}}>
            {isChannel ? <Tv className="w-8 h-8 text-[var(--text-secondary)]" /> : <Speaker className="w-8 h-8 text-[var(--text-secondary)]" />}
          </div>
          <div className="text-center w-full px-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{t('media.noneMusic')}</p>
            <div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-[var(--text-muted)] opacity-40 truncate">{name}</p></div>
          </div>
        </div>
      );
    }

    return (
      <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaGroupKey(settingsKey); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: picture ? 'white' : 'var(--text-primary)'}}>
        {getControls(cardId)}
        {cyclePool.length > 1 && (
          <button onClick={cyclePlayers} className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold">{cyclePool.length}</span>
            <ArrowLeftRight className="w-3 h-3 ml-0.5" />
          </button>
        )}
        {isPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent opacity-50 animate-pulse pointer-events-none" />}
        {isPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/40 via-transparent to-transparent animate-pulse pointer-events-none" />}
        {picture && (
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <img src={picture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${isPlaying ? 'scale-[1.6]' : 'scale-150'}`} />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        <div className="relative z-10 flex gap-4 items-start">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg">
            {picture ? <img src={picture} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isChannel ? <Tv className="w-8 h-8 text-[var(--text-secondary)]" /> : <Speaker className="w-8 h-8 text-[var(--text-secondary)]" />}</div>}
          </div>
          <div className="flex flex-col overflow-hidden pt-1">
            <div className="flex items-center gap-2 mb-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate">{name}</p></div>
            <h3 className="text-lg font-bold leading-tight truncate mb-0.5">{title || t('common.unknown')}</h3>
            {subtitle && <p className={`${picture ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs truncate font-medium`}>{subtitle}</p>}
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center gap-8 mt-2">
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_previous_track", { entity_id: mpId }); }} className={`${picture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipBack className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_play_pause", { entity_id: mpId }); }} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button>
          <button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_next_track", { entity_id: mpId }); }} className={`${picture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipForward className="w-6 h-6" /></button>
        </div>
      </div>
    );
  };




  const renderWeatherTempCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => (
    <WeatherTempCard
      cardId={cardId}
      dragProps={dragProps}
      getControls={getControls}
      cardStyle={cardStyle}
      settingsKey={settingsKey}
      cardSettings={cardSettings}
      entities={entities}
      tempHistory={tempHistory}
      tempHistoryById={tempHistoryById}
      outsideTempId={OUTSIDE_TEMP_ID}
      weatherEntityId={WEATHER_ENTITY}
      editMode={editMode}
      t={t}
    />
  );

  const renderGenericClimateCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const entityId = settings.climateId;
    const entity = entityId ? entities[entityId] : null;

    if (!entity || !entityId) return null;

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
        t={t}
      />
    );
  };



  const renderGenericAndroidTVCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const mediaPlayerId = settings.mediaPlayerId;
    const remoteId = settings.remoteId;
    
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
        getA={getA}
        getEntityImageUrl={getEntityImageUrl}
        onOpen={() => setShowAndroidTVModal(cardId)}
        customNames={customNames}
        t={t}
      />
    );
  };

  const resolveLightId = (cardId) => {
    if (cardId === 'light_kjokken') return LIGHT_KJOKKEN;
    if (cardId === 'light_stova') return LIGHT_STOVA;
    if (cardId === 'light_studio') return LIGHT_STUDIO;
    return cardId;
  };

  const getCardGridSpan = (cardId) => {
    if (cardId.startsWith('automation.')) {
      const settingsKey = getCardSettingsKey(cardId);
      const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
      const typeSetting = settings.type;
      if (typeSetting === 'sensor' || typeSetting === 'entity' || typeSetting === 'toggle') {
        const sizeSetting = settings.size;
        return sizeSetting === 'small' ? 1 : 2;
      }
      return 1;
    }

    if (cardId.startsWith('calendar_card_')) return 4;

    if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
      const resolvedId = resolveLightId(cardId);
      const settingsKey = getCardSettingsKey(cardId);
      const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size || cardSettings[resolvedId]?.size;
      return sizeSetting === 'small' ? 1 : 2;
    }

    const settingsKey = getCardSettingsKey(cardId);
    const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
    if (sizeSetting === 'small') return 1;

    if (cardId.startsWith('weather_temp_')) return 2;

    if (activePage === 'settings' && !['power', 'energy_cost', 'shield', 'car'].includes(cardId) && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      if (activePage === 'settings' && !['power', 'shield', 'car'].includes(cardId) && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
        return 1;
      }
    }

    return 2;
  };

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

  const buildGridLayout = (ids, columns) => {
    if (!columns || columns < 1) return {};
    const occupancy = [];
    const positions = {};

    const ensureRow = (row) => {
      if (!occupancy[row]) occupancy[row] = Array(columns).fill(false);
    };

    const canPlace = (row, col, span) => {
      for (let r = row; r < row + span; r += 1) {
        ensureRow(r);
        if (occupancy[r][col]) return false;
      }
      return true;
    };

    const place = (row, col, span) => {
      for (let r = row; r < row + span; r += 1) {
        ensureRow(r);
        occupancy[r][col] = true;
      }
    };

    const placeSingle = (id, span) => {
      let placed = false;
      let row = 0;
      while (!placed) {
        ensureRow(row);
        for (let col = 0; col < columns; col += 1) {
          if (canPlace(row, col, span)) {
            place(row, col, span);
            positions[id] = { row: row + 1, col: col + 1, span };
            placed = true;
            break;
          }
        }
        if (!placed) row += 1;
      }
    };

    const placePair = (firstId, secondId) => {
      let placed = false;
      let row = 0;
      while (!placed) {
        ensureRow(row);
        for (let col = 0; col < columns; col += 1) {
          if (canPlace(row, col, 2)) {
            place(row, col, 2);
            positions[firstId] = { row: row + 1, col: col + 1, span: 1 };
            positions[secondId] = { row: row + 2, col: col + 1, span: 1 };
            placed = true;
            break;
          }
        }
        if (!placed) row += 1;
      }
    };

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const span = getCardGridSpan(id);
      const nextId = ids[i + 1];
      const nextSpan = nextId ? getCardGridSpan(nextId) : null;

      if (span === 1 && nextSpan === 1) {
        placePair(id, nextId);
        i += 1;
        continue;
      }

      placeSingle(id, span);
    }

    return positions;
  };

  const gridLayout = useMemo(() => {
    const ids = pagesConfig[activePage] || [];
    const visibleIds = editMode ? ids : ids.filter(id => !(hiddenCards.includes(id) || isCardHiddenByLogic(id)));
    return buildGridLayout(visibleIds, gridColCount);
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
    const cardStyle = getCardStyle({ cardId, isHidden, isDragging });

    const settingsKey = getCardSettingsKey(cardId);

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
      const settings = cardSettings[settingsKey] || cardSettings[editId] || {};
      const canToggleSize = (editId.startsWith('light_') || editId.startsWith('light.') || editId.startsWith('vacuum.') || editId.startsWith('automation.') || editId.startsWith('climate_card_') || editId.startsWith('cost_card_') || editId.startsWith('weather_temp_') || settings.type === 'entity' || settings.type === 'toggle' || settings.type === 'sensor');
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
            className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
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
              onClick={(e) => { e.stopPropagation(); saveCardSetting(settingsKey, 'size', (cardSettings[settingsKey]?.size === 'small') ? 'large' : 'small'); }}
              className="p-2 rounded-full transition-colors hover:bg-purple-500/80 text-white border border-white/20 shadow-lg"
              style={{backgroundColor: cardSettings[settingsKey]?.size === 'small' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(0, 0, 0, 0.6)'}}
              title={cardSettings[settingsKey]?.size === 'small' ? t('tooltip.largeSize') : t('tooltip.smallSize')}
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
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto"
          >
            <GripVertical className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('drag.move')}</span>
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
      return (
        <CalendarCard 
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
           onClick={(e) => { e.stopPropagation(); if (editMode) { setShowEditCardModal(cardId); setEditCardSettingsKey(settingsKey); } }}
        />
      );
    }

    if (cardId.startsWith('climate_card_')) {
      return renderGenericClimateCard(cardId, dragProps, getControls, cardStyle, settingsKey);
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

    const genericSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    if (genericSettings.type === 'sensor' || genericSettings.type === 'entity' || genericSettings.type === 'toggle') {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (activePage === 'settings' && !['power', 'rocky', 'shield', 'car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    switch(cardId) {
      case 'power':
        return (
          <EnergyPowerCard
            dragProps={dragProps}
            controls={getControls('power')}
            cardStyle={cardStyle}
            editMode={editMode}
            name={customNames['power'] || t('power.title')}
            Icon={customIcons['power'] ? ICON_MAP[customIcons['power']] : Zap}
            priceDisplay={getS(TIBBER_ID)}
            currentPrice={currentPrice}
            priceStats={priceStats}
            fullPriceData={fullPriceData}
            currentPriceIndex={currentPriceIndex}
            onOpen={() => setShowPowerModal(true)}
            t={t}
          />
        );
      case 'rocky':
        return renderRockyCard(dragProps, getControls, cardStyle);

      case 'weather':
        return renderWeatherTempCard('weather', dragProps, getControls, cardStyle, 'weather');
      case 'media_player':
        const embyIds = Object.keys(entities).filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'));
        const mediaEntities = embyIds.map(id => entities[id]).filter(Boolean);
        const sessions = getA(BIBLIOTEK_SESSIONS_ID, 'sessions', []);
        const sessionActiveEntities = Array.isArray(sessions)
          ? mediaEntities.filter((entity) => {
              if (!isMediaActive(entity)) return false;
              const name = (entity.attributes?.friendly_name || '').toLowerCase();
              return sessions.some((s) => {
                const device = (s?.device_name || '').toLowerCase();
                if (!device) return false;
                return name.includes(device) || device.includes(name);
              });
            })
          : [];
        const activeMediaEntities = sessionActiveEntities.length > 0 ? sessionActiveEntities : mediaEntities.filter(isMediaActive);
        const activeCount = activeMediaEntities.length;

        if (!editMode && activeCount === 0) return null;

        const pool = (editMode && activeCount === 0) ? mediaEntities : (activeCount > 0 ? activeMediaEntities : mediaEntities);
        const playingEntities = pool.filter(e => e.state === 'playing');
        const playingCount = playingEntities.length;
        
        let currentMp = pool.find(e => e.entity_id === activeMediaId);
        
        if (!currentMp) {
            if (playingCount > 0) currentMp = playingEntities[0];
            else currentMp = pool[0];
        } else if (playingCount > 0 && currentMp.state !== 'playing' && !activeMediaId) {
             currentMp = playingEntities[0];
        }
        
        if (!currentMp) return null;

        const mpId = currentMp.entity_id;
        const mpState = currentMp.state;
        const contentType = getA(mpId, 'media_content_type');
        const isChannel = contentType === 'channel';
        const isPlaying = mpState === 'playing';
        const isIdle = mpState === 'idle' || mpState === 'off' || mpState === 'unavailable' || !mpState || mpState === 'standby';
        const mpTitle = getA(mpId, 'media_title');
        
        let mpSeries = getA(mpId, 'media_series_title');
        if (contentType === 'episode') {
             const season = getA(mpId, 'media_season');
             if (mpSeries && season) mpSeries = `${mpSeries} • ${season}`;
             else if (!mpSeries && season) mpSeries = season;
        }
        if (!mpSeries) mpSeries = getA(mpId, 'media_artist') || getA(mpId, 'media_season');

        const mpApp = getA(mpId, 'app_name');
        const mpPicture = getEntityImageUrl(currentMp.attributes?.entity_picture);
        
        const mpFriendlyName = getA(mpId, 'friendly_name', '');
        const activeSession = Array.isArray(sessions) ? sessions.find(s => s.device_name && mpFriendlyName.toLowerCase().includes(s.device_name.toLowerCase())) : null;
        const activeUser = activeSession?.user_name;
        const mpName = customNames[mpId] || getA(mpId, 'friendly_name', 'Media Player').replace(/^(Midttunet|Bibliotek)\s*/i, '');

        const cyclePlayers = (e) => {
          e.stopPropagation();
          const list = activeCount > 1 ? activeMediaEntities : (playingEntities.length > 1 ? playingEntities : pool);
          const idx = list.findIndex(e => e.entity_id === mpId);
          const next = list[(idx + 1) % list.length];
          setActiveMediaId(next.entity_id);
        };

        const indicator = (!editMode && activeCount >= 2) ? (<button onClick={cyclePlayers} className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors backdrop-blur-md"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs font-bold">{activeCount}</span><ArrowLeftRight className="w-3 h-3 ml-0.5" /></button>) : null;

            if (isIdle) {
          return (
            <div key="media_player" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaGroupKey('__emby__'); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: 'var(--text-primary)'}}>
              {getControls(mpId)}
              {indicator}
              <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'var(--glass-bg)'}}>
                <Tv className="w-8 h-8 text-[var(--text-secondary)]" />
              </div>
              <div className="text-center w-full px-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{t('media.noneMedia')}</p>
                <div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-[var(--text-muted)] opacity-40 truncate">{mpName}</p></div>
              </div>
            </div>
          );
        }

        return (
          <div key="media_player" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(mpId); setActiveMediaGroupKey('__emby__'); setActiveMediaModal('media'); } }} className={`p-7 rounded-3xl flex flex-col justify-end transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: mpPicture ? 'white' : 'var(--text-primary)'}}>
            {getControls(mpId)}
            {indicator}
            
            {mpPicture ? (
              <div className="absolute inset-0 z-0">
                <img src={mpPicture} alt="" className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
            ) : (
               <div className="absolute inset-0 z-0 flex items-center justify-center bg-[var(--glass-bg)]">
                  {isChannel ? <Tv className="w-20 h-20 text-[var(--text-muted)]" /> : <Music className="w-20 h-20 text-[var(--text-muted)]" />}
               </div>
            )}
            
            <div className="relative z-10 flex flex-col">
                {activeUser ? (
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate shadow-black drop-shadow-md">{activeUser}</p>
                    <span className="text-white/40 text-[10px]">•</span>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${mpPicture ? 'text-gray-300' : 'text-[var(--text-secondary)]'} truncate shadow-black drop-shadow-md`}>{mpApp || t('addCard.type.media')}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1 truncate shadow-black drop-shadow-md">{mpApp || t('addCard.type.media')}</p>
                )}
                <h3 className="text-2xl font-bold leading-tight line-clamp-2 mb-1 shadow-black drop-shadow-lg">{mpTitle || t('common.unknown')}</h3>
                <p className={`text-sm ${mpPicture ? 'text-gray-200' : 'text-[var(--text-secondary)]'} truncate font-medium shadow-black drop-shadow-md`}>{mpSeries || ''}</p>
            </div>
          </div>
        );
      case 'sonos':
        const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
        const activeSonos = sonosEntities.filter(isSonosActive);
        const sonosCount = activeSonos.length;
        const sonosSettingsKey = settingsKey;
        const localActiveSonosId = cardSettings[sonosSettingsKey]?.activeId;
        
        let currentSonos = sonosEntities.find(e => e.entity_id === localActiveSonosId) || sonosEntities.find(e => e.entity_id === activeMediaId);
        
        if (!currentSonos) {
            if (sonosCount > 0) currentSonos = activeSonos[0];
            else currentSonos = sonosEntities[0];
        } else if (sonosCount > 0 && !isSonosActive(currentSonos) && !activeMediaId) {
             currentSonos = activeSonos[0];
        }
        
        if (!currentSonos) return null;

        const sId = currentSonos.entity_id;
        const sIsActive = isSonosActive(currentSonos);
        const sIsPlaying = currentSonos.state === 'playing';
        
        const isLydplanke = sId === 'media_player.sonos_lydplanke';
        const isTV = isLydplanke && (currentSonos.attributes?.source === 'TV' || currentSonos.attributes?.media_title === 'TV');

        const sTitle = isTV ? t('media.tvAudio') : getA(sId, 'media_title');
        const sArtist = isTV ? t('media.livingRoom') : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
        const sPicture = !isTV ? getEntityImageUrl(currentSonos.attributes?.entity_picture) : null;
        const sName = customNames[sId] || getA(sId, 'friendly_name', 'Sonos').replace(/^(Sonos)\s*/i, '');

        const cycleSonos = (e) => {
          e.stopPropagation();
          const list = sonosCount > 1 ? activeSonos : sonosEntities;
          const idx = list.findIndex(e => e.entity_id === sId);
          const next = list[(idx + 1) % list.length];
          saveCardSetting(sonosSettingsKey, 'activeId', next.entity_id);
        };

        const sIndicator = (!editMode && sonosCount >= 2) ? (<button onClick={cycleSonos} className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors backdrop-blur-md"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs font-bold">{sonosCount}</span><ArrowLeftRight className="w-3 h-3 ml-0.5" /></button>) : null;

        if (!sIsActive) {
          return (
            <div key="sonos" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(sId); setActiveMediaModal('sonos'); } }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: 'var(--text-primary)'}}>
              {getControls(sId)}
              {sIndicator}
              <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'var(--glass-bg)'}}><Speaker className="w-8 h-8 text-[var(--text-secondary)]" /></div>
              <div className="text-center w-full px-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{t('media.noneMusic')}</p><div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-[var(--text-muted)] opacity-40 truncate">{sName}</p></div></div>
            </div>
          );
        }

        return (
          <div key="sonos" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) { setActiveMediaId(sId); setActiveMediaModal('sonos'); } }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, color: sPicture ? 'white' : 'var(--text-primary)'}}>
            {getControls(sId)}
            {sIndicator}
            {sPicture && (<div className="absolute inset-0 z-0 opacity-20 pointer-events-none"><img src={sPicture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${sIsPlaying ? 'scale-[1.7]' : 'scale-150'}`} /><div className="absolute inset-0 bg-black/20" /></div>)}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent opacity-50 animate-pulse pointer-events-none" />}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/40 via-transparent to-transparent animate-pulse pointer-events-none" />}
            {sPicture && (<div className="absolute inset-0 z-0 opacity-20 pointer-events-none"><img src={sPicture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${sIsPlaying ? 'scale-[1.6]' : 'scale-150'}`} /><div className="absolute inset-0 bg-black/20" /></div>)}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent pointer-events-none" />}
            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg">{sPicture ? <img src={sPicture} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isTV ? <Tv className="w-8 h-8 text-[var(--text-secondary)]" /> : <Speaker className="w-8 h-8 text-[var(--text-secondary)]" />}</div>}</div>
              <div className="flex flex-col overflow-hidden pt-1"><div className="flex items-center gap-2 mb-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate">{sName}</p></div><h3 className="text-lg font-bold leading-tight truncate mb-0.5">{sTitle || t('common.unknown')}</h3><p className={`text-xs ${sPicture ? 'text-gray-400' : 'text-[var(--text-secondary)]'} truncate font-medium`}>{sArtist || ''}</p></div>
            </div>
            <div className="relative z-10 flex items-center justify-center gap-8 mt-2"><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_previous_track", { entity_id: sId }); }} className={`${sPicture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipBack className="w-6 h-6" /></button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_play_pause", { entity_id: sId }); }} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">{sIsPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_next_track", { entity_id: sId }); }} className={`${sPicture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipForward className="w-6 h-6" /></button></div>
          </div>
        );
      case 'car':
        return renderCarCard(dragProps, getControls, cardStyle);
      default: return null;
    }
  };

  const editSettingsKey = showEditCardModal ? (editCardSettingsKey || getCardSettingsKey(showEditCardModal)) : null;
  const editSettings = editSettingsKey ? (cardSettings[editSettingsKey] || cardSettings[showEditCardModal] || {}) : {};
  const editId = showEditCardModal;
  const editEntity = editId ? entities[editId] : null;
  const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
  const isEditCalendar = !!editId && editId.startsWith('calendar_card_');
  const isEditCost = !!editId && editId.startsWith('cost_card_');
  const isEditVacuum = !!editId && editId.startsWith('vacuum.');
  const isEditAutomation = !!editId && editId.startsWith('automation.');
  const isEditGenericType = !!editSettings?.type && (editSettings.type === 'entity' || editSettings.type === 'toggle' || editSettings.type === 'sensor') || isEditVacuum || isEditAutomation;
  const isEditSensor = !!editSettings?.type && editSettings.type === 'sensor';
  const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');
  const canEditName = !!editId && !isEditWeatherTemp && editId !== 'media_player' && editId !== 'sonos';
  const canEditIcon = !!editId && (isEditLight || editId.startsWith('automation.') || editId.startsWith('vacuum.') || editId.startsWith('climate_card_') || editId.startsWith('cost_card_') || !!editEntity || ['power', 'car', 'shield', 'rocky', 'weather'].includes(editId));
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
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, var(--bg-gradient-from), var(--bg-primary), var(--bg-gradient-to))'}} /><div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(150px)'}} /><div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)'}} /></div>
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
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-20 py-6 md:py-10">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes popupIn {
            0% { opacity: 0; transform: scale(0.95) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .popup-anim {
            animation: popupIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .fade-in-anim {
            animation: fadeIn 0.4s ease-out forwards;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .vacuum-card-controls {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }
          .card-controls--temp {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }
          .card-controls--temp .control-plus {
            order: 0;
          }
          .card-controls--temp .control-minus {
            order: 1;
          }
          .sensor-card-controls {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }
          .sensor-card-controls .control-on {
            order: 0;
          }
          .sensor-card-controls .control-off {
            order: 1;
          }
          @container (min-width: 248px) {
            .vacuum-card-controls {
              flex-direction: row;
            }
            .card-controls--temp {
              flex-direction: row;
            }
            .card-controls--temp .control-plus {
              order: 1;
            }
            .card-controls--temp .control-minus {
              order: 0;
            }
            .sensor-card-controls {
              flex-direction: row;
            }
            .sensor-card-controls .control-on {
              order: 1;
            }
            .sensor-card-controls .control-off {
              order: 0;
            }
          }
          .popup-surface {
            background: linear-gradient(145deg,
              color-mix(in srgb, var(--glass-bg) 85%, transparent),
              color-mix(in srgb, var(--glass-bg) 55%, transparent)
            );
            border: none;
            box-shadow:
              0 10px 24px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
          }
          .popup-surface-hover:hover {
            background: linear-gradient(145deg,
              color-mix(in srgb, var(--glass-bg-hover) 90%, transparent),
              color-mix(in srgb, var(--glass-bg) 45%, transparent)
            );
            border: none;
            box-shadow:
              0 14px 28px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }
          .popup-surface-divider {
            background: color-mix(in srgb, var(--glass-border) 35%, transparent);
          }
          .modal-close {
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: color-mix(in srgb, var(--glass-bg) 85%, transparent);
            color: var(--text-secondary);
            border: none;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            transition: transform 150ms ease, background 150ms ease, color 150ms ease;
          }
          .modal-close:hover {
            background: color-mix(in srgb, var(--glass-bg-hover) 90%, transparent);
            color: var(--text-primary);
            transform: translateY(-1px);
          }
          .modal-close:active {
            transform: scale(0.96);
          }
          .modal-close-dark {
            background: rgba(0, 0, 0, 0.55);
            color: #ffffff;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          .modal-close-dark:hover {
            background: rgba(0, 0, 0, 0.7);
          }
        `}</style>
        <Header
          now={now}
          headerTitle={headerTitle}
          headerScale={headerScale}
          editMode={editMode}
          updateHeaderScale={updateHeaderScale}
          updateHeaderTitle={updateHeaderTitle}
          t={t}
        >
          <div className="flex items-center justify-between w-full mt-0 font-sans">
            <div className="flex flex-wrap gap-2.5 items-center min-w-0">
              {(pagesConfig.header || []).map(id => personStatus(id))}
              <div className="w-px h-8 bg-[var(--glass-border)] mx-2"></div>
            </div>
            <div className="flex-1 min-w-0">
              <StatusBar
                entities={entities}
                now={now}
                setShowCameraModal={setShowCameraModal}
                setActiveMediaId={setActiveMediaId}
                setActiveMediaGroupKey={setActiveMediaGroupKey}
                setActiveMediaModal={setActiveMediaModal}
                setShowUpdateModal={setShowUpdateModal}
                t={t}
                isSonosActive={isSonosActive}
                isMediaActive={isMediaActive}
                getA={getA}
                getEntityImageUrl={getEntityImageUrl}
              />
            </div>
          </div>
        </Header>

        {haUnavailableVisible && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <div className="text-sm font-semibold">
              Home Assistant er utilgjengeleg akkurat no. Data kan vere utdaterte, men korta blir viste.
            </div>
          </div>
        )}

        <div className="flex flex-nowrap items-center justify-between gap-4 mb-6">
          <PageNavigation
            pages={pages}
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
              {editMode && <button onClick={() => { const currentCols = pageSettings[activePage]?.gridColumns ?? gridColumns; const newCols = currentCols === 3 ? 4 : 3; savePageSetting(activePage, 'gridColumns', newCols); }} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Columns className="w-4 h-4" /> {(pageSettings[activePage]?.gridColumns ?? gridColumns) === 3 ? '4' : '3'} {t('nav.columns')}</button>}
            {editMode && (
              <button onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(false);
              }} className="group flex items-center gap-2 text-xs font-bold uppercase text-green-400 hover:text-white transition-all whitespace-nowrap">
                <Check className="w-4 h-4" /> {t('nav.done')}
              </button>
            )}
            
            <SettingsMenu
              menuRef={gearMenuRef}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              editMode={editMode}
              setEditMode={setEditMode}
              setShowConfigModal={setShowConfigModal}
              setShowOnboarding={setShowOnboarding}
              toggleTheme={toggleTheme}
              currentTheme={currentTheme}
              activePage={activePage}
              pageSettings={pageSettings}
              t={t}
            />
            <button ref={gearButtonRef} onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors group ${showMenu ? 'bg-[var(--glass-bg)]' : ''}`}><Settings className={`w-5 h-5 transition-all duration-500 ${showMenu ? 'rotate-90 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} /></button>
            {!connected && <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0`} style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: '#ef4444'}} /></div>}
          </div>
        </div>

        {isSonosPage(activePage) ? (
          <div key={activePage} className="fade-in-anim">
            <SonosPage
              pageId={activePage}
              entities={entities}
              sonosIds={SONOS_IDS}
              pageSettings={pageSettings}
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
        ) : activePage === 'automations' ? (
          <div key={activePage} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-sans fade-in-anim items-start">
            {pagesConfig.automations.map((col, colIndex) => (
              <div 
                key={col.id} 
                className="flex flex-col w-full min-h-[200px]"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                   e.preventDefault();
                   const rawData = e.dataTransfer.getData('dragData');
                   if (!rawData) return;
                   const source = JSON.parse(rawData);
                   if (source.colIndex === colIndex) return; // Already in this column, handled by card drop
                   
                   const newConfig = { ...pagesConfig };
                   const [movedItem] = newConfig.automations[source.colIndex].cards.splice(source.index, 1);
                   newConfig.automations[colIndex].cards.push(movedItem);
                   persistConfig(newConfig);
                }}
              >
                <div className="mb-4 px-2">
                  {editMode ? (
                    <input type="text" className="bg-transparent border-b border-[var(--glass-border)] w-full text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:border-blue-500 outline-none pb-1" value={col.title} onChange={(e) => saveColumnTitle(colIndex, e.target.value)} />
                  ) : (
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{col.title}</h3>
                  )}
                </div>
                {col.cards.map((id, index) => {
                  const settingsKey = getCardSettingsKey(id);
                  const heading = cardSettings[settingsKey]?.heading;
                  const cardContent = renderCard(id, index, colIndex);
                  if (!cardContent) return null;
                  if (!heading) return cardContent;
                  return (
                    <div key={`${id}-${index}`} className="relative">
                      <div className="absolute -top-4 left-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-secondary)]">
                        {heading}
                      </div>
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div key={activePage} className="grid gap-8 font-sans fade-in-anim items-start" style={{ gridAutoRows: '100px', gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))` }}>
            {(pagesConfig[activePage] || []).map((id, index) => {
              const placement = gridLayout[id];
              const isCalendarCard = id.startsWith('calendar_card_');
              const forcedSpan = isCalendarCard ? 4 : placement?.span;
              const settingsKey = getCardSettingsKey(id);
              const heading = cardSettings[settingsKey]?.heading;

              if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;
              if (!placement) return null;

              const cardContent = renderCard(id, index);
              if (!cardContent) return null;

              return (
                <div
                  key={`${id}-${index}`}
                  className="h-full relative"
                  style={{
                    gridRowStart: placement.row,
                    gridColumnStart: placement.col,
                    gridRowEnd: `span ${forcedSpan}`,
                    minHeight: isCalendarCard ? '496px' : undefined
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
          onClose={() => setShowConfigModal(false)}
          onFinishOnboarding={() => { setShowOnboarding(false); setShowConfigModal(false); }}
        />

        <PowerModal
          show={showPowerModal}
          onClose={() => setShowPowerModal(false)}
          fullPriceData={fullPriceData}
          currentPriceIndex={currentPriceIndex}
          priceStats={priceStats}
          t={t}
          language={language}
        />

        {activeClimateEntityModal && entities[activeClimateEntityModal] && (
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
        )}

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



        {showAndroidTVModal && (() => {
          const settings = cardSettings[getCardSettingsKey(showAndroidTVModal)] || {};
          return (
            <GenericAndroidTVModal
              show={true}
              onClose={() => setShowAndroidTVModal(null)}
              entities={entities}
              mediaPlayerId={settings.mediaPlayerId}
              remoteId={settings.remoteId}
              callService={callService}
              getA={getA}
              getEntityImageUrl={getEntityImageUrl}
              customNames={customNames}
              t={t}
            />
          );
        })()}

        <RockyModal
          show={showRockyModal}
          onClose={() => setShowRockyModal(false)}
          entities={entities}
          callService={callService}
          getA={getA}
          t={t}
          constants={{ ROCKY_ID, ROCKY_ROOM_ID }}
        />

        <LeafModal
          show={showLeafModal}
          onClose={() => setShowLeafModal(false)}
          entities={entities}
          callService={callService}
          getS={getS}
          getA={getA}
          t={t}
          constants={{
            LEAF_ID,
            LEAF_CLIMATE,
            LEAF_LOCATION,
            LEAF_CHARGING,
            LEAF_PLUGGED,
            LEAF_RANGE,
            LEAF_INTERNAL_TEMP,
            LEAF_LAST_UPDATED,
            LEAF_UPDATE
          }}
        />

        <UpdateModal
          show={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          entities={entities}
          callService={callService}
          getEntityImageUrl={getEntityImageUrl}
          expandedUpdate={expandedUpdate}
          setExpandedUpdate={setExpandedUpdate}
          releaseNotes={releaseNotes}
          fetchReleaseNotes={fetchReleaseNotes}
          t={t}
        />

        {showAddCardModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={() => setShowAddCardModal(false)}>
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.25);
              }
            `}</style>
            <div className="border w-full max-w-xl lg:max-w-4xl max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAddCardModal(false)} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"><X className="w-4 h-4" /></button>
              <h3 className="text-xl font-light mb-5 text-[var(--text-primary)] text-center uppercase tracking-widest italic">{t('modal.addCard.title')}</h3>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {(addCardTargetPage !== 'header' && addCardTargetPage !== 'automations') && (
                <div className="mb-4 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" placeholder={t('addCard.search')} className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-11 pr-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              )}
              
              {(addCardTargetPage !== 'header' && addCardTargetPage !== 'automations' && addCardTargetPage !== 'settings') && (
                <div className="mb-5">
                  <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.cardType')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAddCardType('sensor')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'sensor' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Activity className="w-4 h-4" /> Sensor
                    </button>
                    <button
                      onClick={() => setAddCardType('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'light' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Lightbulb className="w-4 h-4" /> {t('addCard.type.light')}
                    </button>
                    <button
                      onClick={() => setAddCardType('vacuum')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'vacuum' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Bot className="w-4 h-4" /> {t('addCard.type.vacuum')}
                    </button>
                    <button
                      onClick={() => setAddCardType('climate')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'climate' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Thermometer className="w-4 h-4" /> {t('addCard.type.climate')}
                    </button>
                    <button
                      onClick={() => setAddCardType('androidtv')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'androidtv' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Gamepad2 className="w-4 h-4" /> Android TV
                    </button>
                    <button
                      onClick={() => setAddCardType('cost')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'cost' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Coins className="w-4 h-4" /> {t('addCard.type.cost')}
                    </button>
                    <button
                      onClick={() => setAddCardType('media')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'media' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Music className="w-4 h-4" /> {t('addCard.type.media')}
                    </button>
                    <button
                      onClick={() => setAddCardType('weather')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'weather' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <CloudSun className="w-4 h-4" /> {t('addCard.type.weather')}
                    </button>
                    <button
                      onClick={() => setAddCardType('calendar')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${addCardType === 'calendar' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Calendar className="w-4 h-4" /> {t('addCard.type.calendar') || 'Calendar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {addCardType === 'weather' ? (
                  <div className="space-y-8">
                    <div>
                        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.weatherRequired')}</p>
                      <div className="space-y-3">
                        {Object.keys(entities)
                          .filter(id => id.startsWith('weather.'))
                          .filter(id => {
                            if (!searchTerm) return true;
                            const lowerTerm = searchTerm.toLowerCase();
                            const name = entities[id].attributes?.friendly_name || id;
                            return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                          })
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedWeatherId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedWeatherId(prev => prev === id ? null : id)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                        {Object.keys(entities).filter(id => id.startsWith('weather.')).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noWeatherSensors')}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">Temperatursensor (valfri)</p>
                      <div className="space-y-3">
                        <button type="button" onClick={() => setSelectedTempId(null)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${!selectedTempId ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                          <div className="flex flex-col overflow-hidden mr-4">
                            <span className={`text-sm font-bold transition-colors truncate ${!selectedTempId ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t('addCard.useWeatherTemp')}</span>
                            <span className={`text-[11px] font-medium truncate ${!selectedTempId ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>weather.temperature</span>
                          </div>
                          <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedTempId ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                            {!selectedTempId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </div>
                        </button>
                        {Object.keys(entities)
                          .filter(id => {
                            if (!id.startsWith('sensor.')) return false;
                            const deviceClass = entities[id].attributes?.device_class;
                            const lowerId = id.toLowerCase();
                            return deviceClass === 'temperature' || lowerId.includes('temperature') || lowerId.includes('temp');
                          })
                          .filter(id => {
                            if (!searchTerm) return true;
                            const lowerTerm = searchTerm.toLowerCase();
                            const name = entities[id].attributes?.friendly_name || id;
                            return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                          })
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedTempId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedTempId(prev => prev === id ? null : id)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                        {Object.keys(entities).filter(id => {
                          if (!id.startsWith('sensor.')) return false;
                          const deviceClass = entities[id].attributes?.device_class;
                          const lowerId = id.toLowerCase();
                          return deviceClass === 'temperature' || lowerId.includes('temperature') || lowerId.includes('temp');
                        }).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noTempSensors')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : addCardType === 'androidtv' ? (
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">Media Player (påkrevd)</p>
                      <div className="space-y-3">
                        {Object.keys(entities)
                          .filter(id => id.startsWith('media_player.'))
                          .filter(id => {
                            if (!searchTerm) return true;
                            const lowerTerm = searchTerm.toLowerCase();
                            const name = entities[id].attributes?.friendly_name || id;
                            return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                          })
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedAndroidTVMediaId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedAndroidTVMediaId(prev => prev === id ? null : id)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                        {Object.keys(entities).filter(id => id.startsWith('media_player.')).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noMediaPlayers')}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">Fjernkontroll (valfri)</p>
                      <div className="space-y-3">
                        <button type="button" onClick={() => setSelectedAndroidTVRemoteId(null)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${!selectedAndroidTVRemoteId ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                          <div className="flex flex-col overflow-hidden mr-4">
                            <span className={`text-sm font-bold transition-colors truncate ${!selectedAndroidTVRemoteId ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>Ingen fjernkontroll</span>
                            <span className={`text-[11px] font-medium truncate ${!selectedAndroidTVRemoteId ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>(berre media kontroll)</span>
                          </div>
                          <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedAndroidTVRemoteId ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                            {!selectedAndroidTVRemoteId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </div>
                        </button>
                        {Object.keys(entities)
                          .filter(id => id.startsWith('remote.'))
                          .filter(id => {
                            if (!searchTerm) return true;
                            const lowerTerm = searchTerm.toLowerCase();
                            const name = entities[id].attributes?.friendly_name || id;
                            return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                          })
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedAndroidTVRemoteId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedAndroidTVRemoteId(prev => prev === id ? null : id)} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-700">
                      <button 
                        onClick={() => handleAddSelected()}
                        disabled={!selectedAndroidTVMediaId}
                        className="w-full px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('addCard.add')}
                      </button>
                    </div>
                  </div>
                ) : addCardType === 'calendar' ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <div className="p-4 rounded-full bg-blue-500/10 text-blue-400">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <p className="text-gray-400 max-w-xs text-sm">{t('addCard.calendarDescription') || 'Add a calendar card. You can select calendars after adding the card.'}</p>
                    <button 
                      onClick={() => handleAddSelected()}
                      className="px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      {t('addCard.add')}
                    </button>
                  </div>
                ) : (
                  <div>
                    {addCardType === 'cost' && (
                      <div className="mb-5">
                        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.costPickTarget')}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setCostSelectionTarget('today')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'today' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                          >
                            <Coins className="w-4 h-4" /> {t('addCard.costToday')}
                          </button>
                          <button
                            onClick={() => setCostSelectionTarget('month')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'month' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                          >
                            <Coins className="w-4 h-4" /> {t('addCard.costMonth')}
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                          <span className={`px-3 py-1 rounded-full border ${selectedCostTodayId ? 'border-emerald-500/30 text-emerald-400' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                            {t('addCard.costToday')}: {selectedCostTodayId ? (entities[selectedCostTodayId]?.attributes?.friendly_name || selectedCostTodayId) : t('common.missing')}
                          </span>
                          <span className={`px-3 py-1 rounded-full border ${selectedCostMonthId ? 'border-emerald-500/30 text-emerald-400' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                            {t('addCard.costMonth')}: {selectedCostMonthId ? (entities[selectedCostMonthId]?.attributes?.friendly_name || selectedCostMonthId) : t('common.missing')}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{getAddCardAvailableLabel()}</p>
                    <div className="space-y-3">
                      {Object.keys(entities)
                        .filter(id => {
                          if (addCardTargetPage === 'header') return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
                          if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                          if (addCardTargetPage === 'settings') {
                             const isNotAdded = !(pagesConfig.settings || []).includes(id);
                             if (!isNotAdded) return false;
                             return true;
                          }
                          if (addCardType === 'vacuum') {
                            return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          if (addCardType === 'climate') {
                            return id.startsWith('climate.');
                          }
                          if (addCardType === 'androidtv') {
                            return id.startsWith('media_player.') || id.startsWith('remote.');
                          }
                          if (addCardType === 'cost') {
                            return (id.startsWith('sensor.') || id.startsWith('input_number.'));
                          }
                          if (addCardType === 'media') {
                            return id.startsWith('media_player.');
                          }
                          if (addCardType === 'sensor') {
                              return (id.startsWith('sensor.') || id.startsWith('input_number.') || id.startsWith('input_boolean.') || id.startsWith('binary_sensor.') || id.startsWith('switch.') || id.startsWith('automation.')) && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          if (addCardType === 'toggle') {
                            return isToggleEntity(id) && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          if (addCardType === 'entity') {
                            return !id.startsWith('person.') && !id.startsWith('update.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                        })
                        .filter(id => {
                          if (!searchTerm) return true;
                          const lowerTerm = searchTerm.toLowerCase();
                          const name = entities[id].attributes?.friendly_name || id;
                          return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                        })
                        .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                        .slice(0, addCardTargetPage === 'settings' ? 100 : undefined) // Limit settings list for performance
                        .map(id => {
                          const isSelected = addCardType === 'cost'
                            ? (selectedCostTodayId === id || selectedCostMonthId === id)
                            : selectedEntities.includes(id);
                          const isSelectedToday = selectedCostTodayId === id;
                          const isSelectedMonth = selectedCostMonthId === id;
                          return (
                          <button type="button" key={id} onClick={() => {
                              if (addCardType === 'cost') {
                                if (costSelectionTarget === 'today') {
                                  setSelectedCostTodayId(prev => (prev === id ? null : id));
                                } else {
                                  setSelectedCostMonthId(prev => (prev === id ? null : id));
                                }
                                return;
                              }
                              if (selectedEntities.includes(id)) setSelectedEntities(prev => prev.filter(e => e !== id));
                              else setSelectedEntities(prev => [...prev, id]);
                          }} className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'popup-surface popup-surface-hover'}`}>
                            <div className="flex flex-col overflow-hidden mr-4">
                              <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                              <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                            </div>
                            {addCardType === 'cost' ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isSelectedToday && (
                                  <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400">{t('addCard.costToday')}</span>
                                )}
                                {isSelectedMonth && (
                                  <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400">{t('addCard.costMonth')}</span>
                                )}
                                {!isSelected && (
                                  <div className="p-2 rounded-full transition-colors bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </div>
                            )}
                          </button>
                        );})}
                        {Object.keys(entities).filter(id => {
                          if (addCardTargetPage === 'header') return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
                          if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                          if (addCardTargetPage === 'settings') return !(pagesConfig.settings || []).includes(id);
                          if (addCardType === 'vacuum') return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          if (addCardType === 'climate') return id.startsWith('climate.');
                          if (addCardType === 'androidtv') return id.startsWith('media_player.') || id.startsWith('remote.');
                          if (addCardType === 'cost') return (id.startsWith('sensor.') || id.startsWith('input_number.'));
                          if (addCardType === 'media') return id.startsWith('media_player.');
                          if (addCardType === 'sensor') {
                            return (id.startsWith('sensor.') || id.startsWith('input_number.') || id.startsWith('input_boolean.') || id.startsWith('binary_sensor.') || id.startsWith('switch.') || id.startsWith('automation.')) && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          if (addCardType === 'toggle') return isToggleEntity(id) && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          if (addCardType === 'entity') return !id.startsWith('person.') && !id.startsWith('update.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                        }).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">{getAddCardNoneLeftLabel()}</p>
                        )}
                    </div>
                  </div>
                )}
              </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[var(--glass-border)] flex flex-col gap-3">
                {addCardType !== 'weather' && addCardType !== 'cost' && selectedEntities.length > 0 && (
                  <button onClick={handleAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {addCardType === 'media' ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.players')}` : `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cards')}`}
                  </button>
                )}
                {addCardType === 'cost' && selectedCostTodayId && selectedCostMonthId && (
                  <button onClick={handleAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {t('addCard.costCard')}
                  </button>
                )}
                {addCardType === 'weather' && selectedWeatherId && (
                  <button onClick={handleAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {t('addCard.weatherCard')}
                  </button>
                )}
                <button onClick={() => setShowAddCardModal(false)} className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors">OK</button>
              </div>
            </div>
          </div>
        )}

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

        <AddPageModal 
          isOpen={showAddPageModal} 
          onClose={() => setShowAddPageModal(false)} 
          t={t}
          newPageLabel={newPageLabel}
          setNewPageLabel={setNewPageLabel}
          newPageIcon={newPageIcon}
          setNewPageIcon={setNewPageIcon}
          onCreate={createPage}
          onCreateSonos={createSonosPage}
        />

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
          isEditCost={isEditCost}
          isEditGenericType={isEditGenericType}
          isEditSensor={isEditSensor}
          editSettingsKey={editSettingsKey}
          editSettings={editSettings}
          customNames={customNames}
          saveCustomName={saveCustomName}
          customIcons={customIcons}
          saveCustomIcon={saveCustomIcon}
          saveCardSetting={saveCardSetting}
          hiddenCards={hiddenCards}
          toggleCardVisibility={toggleCardVisibility}
        />

        <SensorModal 
          isOpen={!!showSensorInfoModal}
          onClose={() => setShowSensorInfoModal(null)}
          entityId={showSensorInfoModal}
          entity={entities[showSensorInfoModal]}
          customName={customNames[showSensorInfoModal]}
          conn={conn}
          t={t}
        />

        <CameraModal
          show={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          entities={entities}
          getEntityImageUrl={getEntityImageUrl}
          t={t}
          cameraEntityId={CAMERA_PORTEN_ID}
        />

        <MediaModal
          show={!!activeMediaModal}
          onClose={() => setActiveMediaModal(null)}
          activeMediaModal={activeMediaModal}
          activeMediaGroupKey={activeMediaGroupKey}
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
          EmbyLogo={EmbyLogo}
          JellyfinLogo={JellyfinLogo}
          SONOS_IDS={SONOS_IDS}
          BIBLIOTEK_SESSIONS_ID={BIBLIOTEK_SESSIONS_ID}
        />
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