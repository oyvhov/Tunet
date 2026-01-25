import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
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
  Shield,
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
  Maximize,
  Minimize,
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
  Wrench
} from 'lucide-react';
import M3Slider from './components/M3Slider';
import ModernDropdown from './components/ModernDropdown';
import InteractivePowerGraph from './components/InteractivePowerGraph';
import SparkLine from './components/SparkLine';
import WeatherGraph from './components/WeatherGraph';
import { themes } from './themes';
import EnergyPowerCard from './components/EnergyPowerCard';
import EnergyCostCard from './components/EnergyCostCard';
import ClimateCard from './components/ClimateCard';
import useEnergyData from './hooks/useEnergyData';
import useClimateInfo from './hooks/useClimateInfo';
import { callService as haCallService, getHistory, getStatistics, getForecast } from './services/haClient';
import {
  CLIMATE_ID,
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
  SHIELD_ID,
  SHIELD_REMOTE_ID,
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
  LEAF_INTERNAL_TEMP,
  HVAC_MAP,
  FAN_MAP,
  SWING_MAP
} from './constants';

const ICON_MAP = {
  Zap, Wind, Car, Settings, Flame, User, UserCheck, MapPin, TrendingUp, Clock, 
  Edit2, Check, Fan, ArrowUpDown, ArrowLeftRight, Plus, Minus, Lightbulb, 
  RefreshCw, BatteryCharging, Navigation, Thermometer, DoorOpen, Snowflake, 
  Battery, AlertCircle, TrendingDown, BarChart3, Eye, EyeOff, Play, Pause, 
  SkipBack, SkipForward, Music, Clapperboard, Server, HardDrive, Tv, Coins,
  Speaker, Sofa, Utensils, AirVent, LampDesk, LayoutGrid, Trash2, Workflow,
  Home, Bed, Bath, ShowerHead, Droplets, Sun, Moon, Cloud, CloudRain, Power,
  Wifi, Lock, Unlock, Shield, Video, Camera, Bell, Volume2, Mic, Radio, Warehouse,
  Gamepad2, Laptop, Smartphone, Watch, Coffee, Beer, Armchair, ShoppingCart, Bot,
  Calendar, Activity, Heart, Star, AlertTriangle,
  AlarmClock, Archive, Award, Book, BookOpen, Bookmark, Briefcase, Building2,
  Bus, Cpu, Database, DollarSign, Feather, Gift, Globe, Key, Leaf, Monitor,
  Paintbrush, PenTool, Plug, Puzzle, Rocket, Router, Siren, Sprout, Sunrise,
  Sunset, Truck, Wrench
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp || timestamp === "unavailable" || timestamp === "unknown" || timestamp === "--") return "--";
  try {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "akkurat no";
    if (diffMins < 60) return `for ${diffMins} min sidan`;
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (remainingMins === 0) return `for ${diffHours} timar sidan`;
    return `for ${diffHours}t ${remainingMins}m sidan`;
  } catch (e) {
    return "ukjend tid";
  }
};

const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
    .replace(/\n/g, '<br />');
};

const EmbyLogo = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11,2L6,7L7,8L2,13L7,18L8,17L13,22L18,17L17,16L22,11L17,6L16,7L11,2M10,8.5L16,12L10,15.5V8.5Z" />
  </svg>
);

const JellyfinLogo = (props) => (
  <svg viewBox="0 0 512 512" {...props}>
    <defs>
      <linearGradient id="jellyfin-grad" x1="126.15" y1="219.32" x2="457.68" y2="410.73" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#aa5cc3" />
        <stop offset="100%" stopColor="#00a4dc" />
      </linearGradient>
    </defs>
    <path d="M190.56 329.07c8.63 17.3 122.4 17.12 130.93 0 8.52-17.1-47.9-119.78-65.46-119.8-17.57 0-74.1 102.5-65.47 119.8z" fill="url(#jellyfin-grad)" />
    <path d="M58.75 417.03c25.97 52.15 368.86 51.55 394.55 0S308.93 56.08 256.03 56.08c-52.92 0-223.25 308.8-197.28 360.95zm68.04-45.25c-17.02-34.17 94.6-236.5 129.26-236.5 34.67 0 146.1 202.7 129.26 236.5-16.83 33.8-241.5 34.17-258.52 0z" fill="url(#jellyfin-grad)" />
  </svg>
);

const getServerInfo = (id) => {
  if (!id || typeof id !== 'string') return { name: 'Media', icon: HardDrive, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
  if (id.includes('midttunet')) return { name: 'Jellyfin', icon: JellyfinLogo, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (id.includes('bibliotek')) return { name: 'Emby', icon: EmbyLogo, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  return { name: 'Media', icon: HardDrive, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
};

const BarGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const normalizedData = data.map(d => (typeof d === 'object' ? d : { value: d, label: '' }));
  
  // Ensure we always show 7 bars to maintain layout
  const paddedData = [...Array(Math.max(0, 7 - normalizedData.length)).fill({ value: 0, label: '' }), ...normalizedData];
  const max = Math.max(...paddedData.map(d => d.value)) * 1.1 || 1;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end gap-[2px] px-0 opacity-90 pointer-events-none">
      {paddedData.map((d, i) => (
        <div key={i} className="flex-1 flex items-end h-full group relative pointer-events-auto">
           <div className={`w-full rounded-t-sm transition-all duration-1000 ${i === paddedData.length - 1 ? 'bg-emerald-400' : 'bg-emerald-500/30 group-hover:bg-emerald-500/60'}`} style={{ height: `${(d.value/max)*100}%` }}></div>
           {d.value > 0 && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-[#121214] border border-white/10 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl flex flex-col items-center pointer-events-none">
               <span className="font-bold text-emerald-400 text-xs">{d.value.toFixed(0)} kr</span>
               <span className="text-gray-500 font-medium uppercase tracking-wider">{d.label}</span>
             </div>
           )}
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [entities, setEntities] = useState({});
  const [connected, setConnected] = useState(false);
  const [libLoaded, setLibLoaded] = useState(false);
  const [conn, setConn] = useState(null);
  const [now, setNow] = useState(new Date());
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [showClimateModal, setShowClimateModal] = useState(false);
  const [showLightModal, setShowLightModal] = useState(null);
  const [showLeafModal, setShowLeafModal] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [showRockyModal, setShowRockyModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState({});
  const [showEditCardModal, setShowEditCardModal] = useState(null);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState(null);
  const [customNames, setCustomNames] = useState({});
  const [customIcons, setCustomIcons] = useState({});
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeMediaGroupKey, setActiveMediaGroupKey] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [pagesConfig, setPagesConfig] = useState({
    header: [OYVIND_ID, TUVA_ID],
    home: ['power', 'energy_cost', 'climate', 'light_kjokken', 'light_stova', 'light_studio', 'car', 'media_player', 'sonos', 'shield'],
    lights: ['light_kjokken', 'light_stova', 'light_studio'],
    automations: [
      { id: 'col0', title: 'Kolonne 1', cards: [] },
      { id: 'col1', title: 'Kolonne 2', cards: [] },
      { id: 'col2', title: 'Kolonne 3', cards: [] }
    ]
  });
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [addCardType, setAddCardType] = useState('light');
  const [hiddenCards, setHiddenCards] = useState([]);
  const [activeMediaId, setActiveMediaId] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [gridColumns, setGridColumns] = useState(3);
  const [gridColCount, setGridColCount] = useState(1);
  const [headerScale, setHeaderScale] = useState(1);
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
  const [pageSettings, setPageSettings] = useState({});
  const [editingPage, setEditingPage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedWeatherId, setSelectedWeatherId] = useState(null);
  const [selectedTempId, setSelectedTempId] = useState(null);
  const [tempHistoryById, setTempHistoryById] = useState({});
  const [cardSettings, setCardSettings] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('midttunet_theme');
      return (saved && themes[saved]) ? saved : 'dark';
    }
    return 'dark';
  });
  
  const [config, setConfig] = useState({
    url: typeof window !== 'undefined' ? localStorage.getItem('ha_url') || '' : '',
    fallbackUrl: typeof window !== 'undefined' ? localStorage.getItem('ha_fallback_url') || '' : '',
    token: typeof window !== 'undefined' ? localStorage.getItem('ha_token') || '' : ''
  });
  const [activeUrl, setActiveUrl] = useState(config.url);

  const resetToHome = () => {
    const isHome = activePage === 'home';
    const noModals = !showPowerModal && !showClimateModal && !showLightModal && !showLeafModal && !showShieldModal && !showRockyModal && !showAddCardModal && !showCameraModal && !showConfigModal && !showUpdateModal && !showEditCardModal && !activeMediaModal && !editingPage && !editMode;
    
    if (!isHome || !noModals) {
        setActivePage('home');
        setShowPowerModal(false);
        setShowClimateModal(false);
        setShowLightModal(null);
        setShowLeafModal(false);
        setShowShieldModal(false);
        setShowRockyModal(false);
        setShowAddCardModal(false);
        setShowCameraModal(false);
        setShowConfigModal(false);
        setShowUpdateModal(false);
        setShowEditCardModal(null);
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
      inactivityTimer = setTimeout(() => {
        if (resetToHomeRef.current) resetToHomeRef.current();
      }, 60000);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

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
    const savedConfig = localStorage.getItem('midttunet_pages_config');
    if (savedConfig) { 
      try { 
        const parsed = JSON.parse(savedConfig);
        let modified = false;
        // Migrate legacy flat automations array to columns
        if (parsed.automations && Array.isArray(parsed.automations) && (parsed.automations.length === 0 || typeof parsed.automations[0] === 'string')) {
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
        
        // Remove legacy static rocky card
        if (parsed.home && parsed.home.includes('rocky')) {
          parsed.home = parsed.home.filter(id => id !== 'rocky');
          modified = true;
        }
        
        if (parsed.home && !parsed.home.includes('shield')) {
            parsed.home.push('shield');
            modified = true;
        }

        if (parsed.home && parsed.home.includes('weather')) {
          parsed.home = parsed.home.filter(id => id !== 'weather');
          modified = true;
        }
        
        if (!parsed.header) {
            parsed.header = [OYVIND_ID, TUVA_ID];
            modified = true;
        }

        setPagesConfig(parsed);
        if (modified) {
            localStorage.setItem('midttunet_pages_config', JSON.stringify(parsed));
        }
      } catch (e) {} 
    } else {
      // Migration fallback
      const savedOrder = localStorage.getItem('midttunet_card_order');
      if (savedOrder) {
        try {
           const raw = JSON.parse(savedOrder).filter(id => id !== 'people');
           const parsed = [...new Set([...raw, 'shield'])];
           setPagesConfig(prev => ({ ...prev, home: parsed }));
        } catch (e) {}
      }
    }
    
    const savedHidden = localStorage.getItem('midttunet_hidden_cards');
    if (savedHidden) { try { setHiddenCards(JSON.parse(savedHidden)); } catch (e) {} }
    if (savedHidden) { 
        try { 
            const hidden = JSON.parse(savedHidden);
            // Ensure weather is not hidden by default/accident
            const filteredHidden = hidden.filter(id => id !== 'weather');
            setHiddenCards(filteredHidden); 
        } catch (e) {} 
    }

    const savedNames = localStorage.getItem('midttunet_custom_names');
    if (savedNames) { try { setCustomNames(JSON.parse(savedNames)); } catch (e) {} }

    const savedIcons = localStorage.getItem('midttunet_custom_icons');
    if (savedIcons) { try { setCustomIcons(JSON.parse(savedIcons)); } catch (e) {} }

    const savedCols = localStorage.getItem('midttunet_grid_columns');
    if (savedCols) setGridColumns(parseInt(savedCols));

    const savedScale = localStorage.getItem('midttunet_header_scale');
    if (savedScale) setHeaderScale(parseFloat(savedScale));

    const savedPageSettings = localStorage.getItem('midttunet_page_settings');
    if (savedPageSettings) { try { setPageSettings(JSON.parse(savedPageSettings)); } catch (e) {} }

    const savedCardSettings = localStorage.getItem('midttunet_card_settings');
    if (savedCardSettings) { try { setCardSettings(JSON.parse(savedCardSettings)); } catch (e) {} }
  }, []);

  useEffect(() => {
    if (!showAddCardModal) setSearchTerm('');
  }, [showAddCardModal]);

  useEffect(() => {
    document.title = "Midttunet";
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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    if (window.HAWS) { setLibLoaded(true); return; }
    const script = document.createElement('script');
    script.src = "https://unpkg.com/home-assistant-js-websocket@latest/dist/haws.umd.js";
    script.async = true;
    script.onload = () => setLibLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!libLoaded || !config.url || !config.token) { if (!config.token) setShowConfigModal(true); return; }
    let connection;
    let cancelled = false;
    const { createConnection, createLongLivedTokenAuth, subscribeEntities } = window.HAWS;

    const persistConfig = (urlUsed) => {
      localStorage.setItem('ha_url', urlUsed);
      localStorage.setItem('ha_token', config.token);
      if (config.fallbackUrl) localStorage.setItem('ha_fallback_url', config.fallbackUrl);
    };

    async function connectWith(url) {
      const auth = createLongLivedTokenAuth(url, config.token);
      const connInstance = await createConnection({ auth });
      if (cancelled) { connInstance.close(); return null; }
      connection = connInstance;
      setConn(connInstance);
      setConnected(true);
      setActiveUrl(url);
      persistConfig(url);
      subscribeEntities(connInstance, (updatedEntities) => { if (!cancelled) setEntities(updatedEntities); });
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
          } catch (e) {}
        }
        if (!cancelled) setConnected(false); 
      }
    }

    connect();
    return () => { cancelled = true; if (connection) connection.close(); };
  }, [libLoaded, config.url, config.fallbackUrl, config.token]);

  useLayoutEffect(() => {
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const theme = themes[themeKey].colors;
    for (const key in theme) {
      document.documentElement.style.setProperty(key, theme[key]);
    }
    document.documentElement.style.backgroundColor = theme['--bg-primary'];
    document.body.style.backgroundColor = theme['--bg-primary'];
    document.documentElement.style.colorScheme = themeKey === 'dark' ? 'dark' : 'light';
    
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme['--bg-primary'];
    
    localStorage.setItem('midttunet_theme', themeKey);
  }, [currentTheme]);

  const toggleTheme = () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  };

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

    return () => { cancelled = true; };
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

  const getS = (id, fallback = "--") => {
    const state = entities[id]?.state;
    if (!state || state === "unavailable" || state === "unknown") return fallback;
    if (state === "home") return "Heime";
    if (state === "not_home") return "Borte";
    return state.charAt(0).toUpperCase() + state.slice(1);
  };
  const getA = (id, attr, fallback = null) => entities[id]?.attributes?.[attr] ?? fallback;
  const getEntityImageUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return `${activeUrl.replace(/\/$/, '')}${rawUrl}`;
  };
  const callService = (domain, service, data) => { if (conn) haCallService(conn, domain, service, data); };

  const { fullPriceData, currentPriceIndex, priceStats, currentPrice } = useEnergyData(entities, now);
  const { hvacAction, hvacState, isHeating, isCooling, currentTemp: climateCurrentTemp, targetTemp: climateTargetTemp, fanMode } = useClimateInfo(entities);

  const personStatus = (id) => {
    const entity = entities[id];
    if (!entity && !editMode) return null;
    
    const isHome = entity?.state === 'home';
    const statusText = getS(id);
    const name = customNames[id] || entity?.attributes?.friendly_name || id;
    const picture = getEntityImageUrl(entity?.attributes?.entity_picture);

    return (
      <div key={id} className="group relative flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full transition-all duration-500 hover:bg-[var(--glass-bg)]" 
           style={{
             backgroundColor: 'var(--glass-bg)', 
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
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-500 bg-gray-800" 
               style={{borderColor: isHome ? '#22c55e' : 'var(--glass-border)', filter: isHome ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.7)'}}>
            {picture ? (
              <img src={picture} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                {name.substring(0, 1)}
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#050505] transition-colors duration-500" 
               style={{backgroundColor: isHome ? '#22c55e' : '#52525b', borderColor: 'var(--bg-primary)'}}></div>
        </div>

        <div className="flex flex-col justify-center">
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

  const pages = [
    { id: 'home', label: 'HEIM', icon: LayoutGrid },
    { id: 'lights', label: 'Lys', icon: Lightbulb },
    { id: 'automations', label: 'Automasjonar', icon: Workflow },
    { id: 'settings', label: 'Innstillingar', icon: Settings },
  ];

  useEffect(() => {
    if (showAddCardModal) setAddCardTargetPage(activePage);
  }, [showAddCardModal, activePage]);

  useEffect(() => {
    if (showAddCardModal) setSelectedEntities([]);
    if (showAddCardModal) {
      setSelectedWeatherId(null);
      setSelectedTempId(null);
    }
  }, [showAddCardModal]);

  useEffect(() => {
    if (!showAddCardModal) return;
    if (addCardTargetPage === 'header' || addCardTargetPage === 'automations' || addCardTargetPage === 'settings') {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'lights') {
      setAddCardType('light');
      return;
    }
    setAddCardType('light');
  }, [showAddCardModal, addCardTargetPage]);

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

    uniqueIds.forEach((tempId) => {
      if (!tempHistoryById[tempId] && tempId !== OUTSIDE_TEMP_ID) {
        fetchHistoryFor(tempId);
      }
    });

    return () => { cancelled = true; };
  }, [conn, cardSettings, tempHistoryById]);

  useEffect(() => {
    const updateGridCols = () => {
      const width = window.innerWidth;
      if (width >= 1024) setGridColCount(gridColumns === 4 ? 4 : 3);
      else if (width >= 768) setGridColCount(2);
      else setGridColCount(1);
    };

    updateGridCols();
    window.addEventListener('resize', updateGridCols);
    return () => window.removeEventListener('resize', updateGridCols);
  }, [gridColumns]);

  const toggleCardVisibility = (cardId) => {
    const newHidden = hiddenCards.includes(cardId) 
      ? hiddenCards.filter(id => id !== cardId)
      : [...hiddenCards, cardId];
    setHiddenCards(newHidden);
    localStorage.setItem('midttunet_hidden_cards', JSON.stringify(newHidden));
  };

  const saveCustomName = (id, name) => {
    const newNames = { ...customNames, [id]: name };
    setCustomNames(newNames);
    localStorage.setItem('midttunet_custom_names', JSON.stringify(newNames));
  };

  const saveCustomIcon = (id, iconName) => {
    const newIcons = { ...customIcons, [id]: iconName };
    setCustomIcons(newIcons);
    localStorage.setItem('midttunet_custom_icons', JSON.stringify(newIcons));
  };

  const getCardSettingsKey = (cardId, pageId = activePage) => `${pageId}::${cardId}`;

  const isCardRemovable = (cardId, pageId = activePage) => {
    if (pageId === 'header') return cardId.startsWith('person.');
    if (pageId === 'automations') return cardId.startsWith('automation.');
    if (pageId === 'settings') {
      if (['power', 'energy_cost', 'climate', 'shield', 'car'].includes(cardId)) return false;
      if (cardId.startsWith('media_player') || cardId.startsWith('sonos')) return false;
      return true;
    }
    if (cardId.startsWith('light_')) return true;
    if (cardId.startsWith('light.')) return true;
    if (cardId.startsWith('vacuum.')) return true;
    if (cardId.startsWith('media_player.')) return true;
    if (cardId.startsWith('media_group_')) return true;
    if (cardId.startsWith('weather_temp_')) return true;
    return false;
  };

  const isCardHiddenByLogic = (cardId) => {
    if (cardId === 'media_player') {
      const mediaIds = Object.keys(entities).filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'));
      const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
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
      return activeMediaEntities.length === 0;
    }

    if (cardId === 'sonos') {
      const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
      return sonosEntities.length === 0;
    }

    if (activePage === 'settings' && !['power', 'energy_cost', 'climate', 'rocky', 'shield', 'car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      return !entities[cardId];
    }

    return false;
  };

  const saveCardSetting = (id, setting, value) => {
    const newSettings = { ...cardSettings, [id]: { ...cardSettings[id], [setting]: value } };
    setCardSettings(newSettings);
    localStorage.setItem('midttunet_card_settings', JSON.stringify(newSettings));
  };

  const saveColumnTitle = (colIndex, title) => {
    const newConfig = { ...pagesConfig };
    newConfig.automations[colIndex].title = title;
    setPagesConfig(newConfig);
    localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
  };

  const updateHeaderScale = (newScale) => {
    setHeaderScale(newScale);
    localStorage.setItem('midttunet_header_scale', newScale);
  };

  const removeCard = (cardId, listName = activePage) => {
    const newConfig = { ...pagesConfig };
    if (listName === 'header') {
        newConfig.header = (newConfig.header || []).filter(id => id !== cardId);
        setPagesConfig(newConfig);
        localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
    } else if (newConfig[activePage]) {
      if (activePage === 'automations' && listName !== 'header') {
        newConfig.automations.forEach(col => {
          col.cards = col.cards.filter(id => id !== cardId);
        });
      } else {
        newConfig[activePage] = newConfig[activePage].filter(id => id !== cardId);
      }
      setPagesConfig(newConfig);
      localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
    }
  };

  const handleAddSelected = () => {
    const newConfig = { ...pagesConfig };
    if (addCardTargetPage === 'header') {
      newConfig.header = [...(newConfig.header || []), ...selectedEntities];
      setPagesConfig(newConfig);
      localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardTargetPage === 'automations') {
      newConfig.automations[0].cards.push(...selectedEntities);
      setPagesConfig(newConfig);
      localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'weather') {
      if (!selectedWeatherId) return;
      const cardId = `weather_temp_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      setPagesConfig(newConfig);
      localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), weatherId: selectedWeatherId, tempId: selectedTempId || null } };
      setCardSettings(newSettings);
      localStorage.setItem('midttunet_card_settings', JSON.stringify(newSettings));

      setSelectedWeatherId(null);
      setSelectedTempId(null);
      setShowAddCardModal(false);
      return;
    }

    if (addCardType === 'media') {
      if (selectedEntities.length === 0) return;
      const cardId = `media_group_${Date.now()}`;
      newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
      setPagesConfig(newConfig);
      localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));

      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), mediaIds: selectedEntities } };
      setCardSettings(newSettings);
      localStorage.setItem('midttunet_card_settings', JSON.stringify(newSettings));

      setSelectedEntities([]);
      setShowAddCardModal(false);
      return;
    }

    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...selectedEntities];
    setPagesConfig(newConfig);
    localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
    setSelectedEntities([]);
    setShowAddCardModal(false);
  };

  const renderEntityCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const entity = entities[cardId];
    if (!entity) return null;
    
    const name = customNames[cardId] || entity.attributes.friendly_name || cardId;
    const state = getS(cardId);
    const lastChanged = entity.last_changed;
    const domain = cardId.split('.')[0];
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    const showStatus = settings.showStatus !== false;
    const showLastChanged = settings.showLastChanged !== false;
    
    let Icon = Activity;
    if (customIcons[cardId]) Icon = ICON_MAP[customIcons[cardId]];
    else if (domain === 'binary_sensor') Icon = Activity;
    else if (domain === 'sensor') Icon = TrendingUp;
    else if (domain === 'switch' || domain === 'input_boolean') Icon = Power;
    
    return (
      <div key={cardId} {...dragProps} className={`p-5 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, color: 'var(--text-primary)'}}>
        {getControls(cardId)}
        <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl text-[var(--text-secondary)]" style={{backgroundColor: 'var(--glass-bg)'}}><Icon className="w-5 h-5" /></div>
            {showLastChanged && <div className="flex flex-col items-end"><span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">{formatRelativeTime(lastChanged)}</span></div>}
        </div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-0.5 truncate">{name}</p>{showStatus && <p className="text-xl font-light truncate" style={{color: 'var(--text-primary)'}}>{String(state)}</p>}</div>
      </div>
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
               <p className="text-[var(--text-secondary)] text-[10px] tracking-[0.2em] uppercase font-bold opacity-60 truncate leading-none">{String(name || 'Lys')}</p>
               <span className={`text-[10px] uppercase font-bold tracking-widest leading-none transition-colors ${isOn ? 'text-amber-400' : 'text-[var(--text-secondary)] opacity-50'}`}>{isOn ? `${Math.round((br / 255) * 100)}%` : 'AV'}</span>
            </div>
            <div className="w-full">
               <M3Slider variant="thin" min={0} max={255} step={1} value={br} disabled={!isOn || isUnavailable} onChange={(e) => callService("light", "turn_on", { entity_id: currentLId, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLightModal(currentLId); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={cardStyle}>
        {getControls(currentLId)}
        <div className="flex justify-between items-start"><button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} className={`p-3 rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`} disabled={isUnavailable}><LightIcon className={`w-5 h-5 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} /></button><div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isUnavailable ? 'bg-red-500/10 border-red-500/20 text-red-500' : (isOn ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]')}`}><span className="text-xs tracking-widest uppercase font-bold">{isUnavailable ? 'N/A' : (totalCount > 0 ? (activeCount > 0 ? `${activeCount}/${totalCount}` : 'AV') : (isOn ? 'PÅ' : 'AV'))}</span></div></div>
        <div className="mt-2 font-sans"><p className="text-[var(--text-secondary)] text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">{String(name || 'Lys')}</p><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{isUnavailable ? "--" : (isOn ? Math.round((br / 255) * 100) : "0")}</span><span className="text-[var(--text-muted)] font-medium text-base ml-1">%</span></div><M3Slider min={0} max={255} step={1} value={br} disabled={!isOn || isUnavailable} onChange={(e) => callService("light", "turn_on", { entity_id: currentLId, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" /></div>
      </div>
    );
  };

  const renderAutomationCard = (cardId, dragProps, getControls, cardStyle) => {
    const isOn = entities[cardId]?.state === 'on';
    const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
    const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : Workflow;
    
    return (
      <div key={cardId} {...dragProps} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans mb-3 break-inside-avoid ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isOn ? 'rgba(59, 130, 246, 0.03)' : 'rgba(15, 23, 42, 0.6)', borderColor: isOn ? 'rgba(59, 130, 246, 0.15)' : (editMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.04)')}} onClick={(e) => { if(!editMode) callService("automation", "toggle", { entity_id: cardId }); }}>
        {getControls(cardId)}
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-all ${isOn ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-4 h-4" /></div>
          <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-sm font-bold text-[var(--text-primary)] leading-tight">{friendlyName}</span></div><span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mt-0.5">{isOn ? 'Aktiv' : 'Avslått'}</span></div>
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-[10px] tracking-widest font-bold uppercase">{getS(LEAF_LOCATION)}</span></div>
            {isHtg && <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse"><Flame className="w-3 h-3" /><span className="text-[10px] tracking-widest font-bold uppercase">Varmar</span></div>}
          </div>
        </div>
        <div className="flex justify-between items-end"><div><p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p><div className="flex items-baseline gap-2 leading-none font-sans"><span className={`text-2xl font-medium leading-none ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>{String(getS(LEAF_ID))}%</span>{isCharging && <Zap className="w-5 h-5 text-green-400 animate-pulse -ml-1 mb-1" fill="currentColor" />}<span className="text-[var(--text-muted)] font-medium text-base ml-1">{String(getS(LEAF_RANGE))}km</span></div></div><div className="flex items-center gap-1 bg-[var(--glass-bg)] px-3 py-1.5 rounded-xl border border-[var(--glass-border)] font-sans"><Thermometer className="w-3 h-3 text-[var(--text-secondary)]" /><span className="text-sm font-bold text-[var(--text-primary)]">{String(getS(LEAF_INTERNAL_TEMP))}°</span></div></div>
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
    const statusText = isCleaning ? "Støvsuger" : isReturning ? "Returnerer" : isDocked ? "Ladar" : state;
    const name = customNames['rocky'] || 'Rocky';
    const Icon = customIcons['rocky'] ? ICON_MAP[customIcons['rocky']] : Bot;
    
    return (
      <div key="rocky" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowRockyModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isCleaning ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (isCleaning ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)')}}>
        {getControls('rocky')}
        <div className="flex justify-between items-start font-sans">
           <div className={`p-3 rounded-2xl transition-all ${isCleaning ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
           <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{room || "Ukjend"}</span></div>
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

  const renderVacuumCard = (vacuumId, dragProps, getControls, cardStyle) => {
    const entity = entities[vacuumId];
    if (!entity) return null;

    const state = entity?.state;
    const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
    const battery = getA(vacuumId, "battery_level");
    const room = getA(vacuumId, "current_room") || getA(vacuumId, "room");
    const name = customNames[vacuumId] || getA(vacuumId, "friendly_name", "Støvsugar");
    const Icon = customIcons[vacuumId] ? ICON_MAP[customIcons[vacuumId]] : Bot;
    const statusText = (() => {
      if (state === "cleaning") return "Støvsuger";
      if (state === "returning") return "Returnerer";
      if (state === "docked") return "Ladar";
      if (state === "idle") return "Klar";
      return state || "Ukjend";
    })();

    const showRoom = !!room;
    const showBattery = typeof battery === 'number';

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
    const title = getA(mpId, 'media_title') || (isActive ? 'Aktiv' : 'Ingen media');
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
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Ingen musikk</p>
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
            <h3 className="text-lg font-bold leading-tight truncate mb-0.5">{title || 'Ukjend'}</h3>
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
    const title = getA(mpId, 'media_title') || (isActive ? 'Aktiv' : 'Ingen musikk');
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
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Ingen musikk</p>
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
            <h3 className="text-lg font-bold leading-tight truncate mb-0.5">{title || 'Ukjend'}</h3>
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

  const renderShieldCard = (dragProps, getControls, cardStyle) => {
    const entity = entities[SHIELD_ID];
    const state = entity?.state;
    const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
    const isOn = state !== 'off' && !isUnavailable;
    const isPlaying = state === 'playing';
    const appName = getA(SHIELD_ID, 'app_name');
    const title = getA(SHIELD_ID, 'media_title');
    const picture = getEntityImageUrl(entity?.attributes?.entity_picture);

    return (
      <div key="shield" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowShieldModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={{...cardStyle, color: picture ? 'white' : 'var(--text-primary)'}}>
        {getControls('shield')}
        
        <div className="flex justify-between items-start relative z-10">
           <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Gamepad2 className="w-5 h-5" /></div>
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isOn ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}><span className="text-[10px] font-bold uppercase tracking-widest">{isOn ? (isPlaying ? 'SPELAR' : 'PÅ') : 'AV'}</span></div>
        </div>

        <div className="relative z-10">
           <p className={`${picture ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs tracking-widest uppercase mb-1 font-bold opacity-60`}>Shield TV</p>
           <h3 className="text-2xl font-medium leading-none line-clamp-2 mb-1">{appName || (isOn ? 'Heimskjerm' : 'Avslått')}</h3>
           {title && <p className={`text-xs ${picture ? 'text-gray-300' : 'text-[var(--text-muted)]'} line-clamp-1 font-medium`}>{title}</p>}
        </div>

        {picture && (<div className="absolute inset-0 z-0 opacity-40"><img src={picture} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" /></div>)}
      </div>
    );
  };

  const getWeatherInfo = (state) => {
    const weatherMap = {
      'sunny': { label: 'Sol', icon: 'clear-day' },
      'clear-night': { label: 'Klart', icon: 'clear-night' },
      'partlycloudy': { label: 'Delvis skya', icon: 'partly-cloudy-day' },
      'cloudy': { label: 'Skya', icon: 'cloudy' },
      'rainy': { label: 'Regn', icon: 'rain' },
      'pouring': { label: 'Pøsregn', icon: 'thunderstorms-rain' },
      'snowy': { label: 'Snø', icon: 'snow' },
      'fog': { label: 'Tåke', icon: 'fog' },
      'hail': { label: 'Hagl', icon: 'hail' },
      'lightning': { label: 'Lyn', icon: 'thunderstorms' },
      'windy': { label: 'Vind', icon: 'wind' },
      'exceptional': { label: 'Ekstremt', icon: 'warning' }
    };
    return weatherMap[state] || { label: state || 'Ukjend', icon: 'cloudy' };
  };

  const renderWeatherTempCard = (cardId, dragProps, getControls, cardStyle, settingsKey) => {
    const settings = cardSettings[settingsKey] || {};
    const weatherId = settings.weatherId;
    const tempId = settings.tempId;
    const weatherEntity = weatherId ? entities[weatherId] : null;
    const tempEntity = tempId ? entities[tempId] : null;
    if (!weatherEntity) return null;

    const state = weatherEntity?.state;
    const info = getWeatherInfo(state);
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/production/fill/all/${info.icon}.svg`;
    const tempValueRaw = tempEntity?.state ?? weatherEntity?.attributes?.temperature;
    const tempValue = parseFloat(tempValueRaw);
    const currentTemp = Number.isFinite(tempValue) ? tempValue : NaN;
    const history = tempId
      ? (tempId === OUTSIDE_TEMP_ID ? tempHistory : (tempHistoryById[tempId] || []))
      : (weatherId === WEATHER_ENTITY ? tempHistory : []);

    return (
      <div key={cardId} {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
        {getControls(cardId)}
        <div className="flex justify-between items-start relative z-10">
          <div className="w-24 h-24 -ml-4 -mt-4 filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
            <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
               <span className="text-xs tracking-widest uppercase font-bold">{info.label}</span>
             </div>
             <span className="text-4xl font-medium text-[var(--text-primary)] leading-none mt-2">{Number.isFinite(currentTemp) ? currentTemp : '--'}°</span>
          </div>
        </div>
        <div className="h-32 mt-auto relative z-0 -mb-7 -mx-7 opacity-80 overflow-hidden rounded-b-3xl">
            <WeatherGraph history={history} currentTemp={currentTemp} />
        </div>
      </div>
    );
  };

  const renderWeatherCard = (dragProps, getControls, cardStyle) => {
    const weatherEntity = entities[WEATHER_ENTITY];
    const tempEntity = entities[OUTSIDE_TEMP_ID];
    const currentTemp = parseFloat(tempEntity?.state);
    const state = weatherEntity?.state;
    const name = customNames['weather'] || 'Været';
    // Bruk henta prognose, eller fall tilbake til attributt (for eldre HA)
    const forecastData = weatherForecast.length > 0 ? weatherForecast : weatherEntity?.attributes?.forecast;

    const info = getWeatherInfo(state);
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/production/fill/all/${info.icon}.svg`;
    const CustomIcon = customIcons['weather'] ? ICON_MAP[customIcons['weather']] : null;
    
    return (
      <div key="weather" {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
        {getControls('weather')}
        <div className="flex justify-between items-start relative z-10">
          <div className="w-24 h-24 -ml-4 -mt-4 filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
            {CustomIcon ? (
               <div className="p-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)]"><CustomIcon className="w-8 h-8" /></div>
            ) : (
               <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
               <span className="text-xs tracking-widest uppercase font-bold">{info.label}</span>
             </div>
             <span className="text-4xl font-medium text-[var(--text-primary)] leading-none mt-2">{!isNaN(currentTemp) ? currentTemp : '--'}°</span>
          </div>
        </div>
        <div className="h-32 mt-auto relative z-0 -mb-7 -mx-7 opacity-80 overflow-hidden rounded-b-3xl">
            <WeatherGraph history={tempHistory} currentTemp={currentTemp} />
        </div>
      </div>
    );
  };

  const resolveLightId = (cardId) => {
    if (cardId === 'light_kjokken') return LIGHT_KJOKKEN;
    if (cardId === 'light_stova') return LIGHT_STOVA;
    if (cardId === 'light_studio') return LIGHT_STUDIO;
    return cardId;
  };

  const getCardGridSpan = (cardId) => {
    if (cardId.startsWith('automation.')) return 1;

    if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
      const resolvedId = resolveLightId(cardId);
      const settingsKey = getCardSettingsKey(cardId);
      const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size || cardSettings[resolvedId]?.size;
      return sizeSetting === 'small' ? 1 : 2;
    }

    if (cardId.startsWith('weather_temp_')) return 2;

    if (activePage === 'settings' && !['power', 'energy_cost', 'climate', 'shield', 'car'].includes(cardId) && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      return 1;
    }

    return 2;
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

    ids.forEach((id) => {
      const span = getCardGridSpan(id);
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
    });

    return positions;
  };

  const gridLayout = useMemo(() => {
    const ids = pagesConfig[activePage] || [];
    const visibleIds = editMode ? ids : ids.filter(id => !(hiddenCards.includes(id) || isCardHiddenByLogic(id)));
    return buildGridLayout(visibleIds, gridColCount);
  }, [pagesConfig, activePage, gridColCount, cardSettings, hiddenCards, editMode, entities]);

  const renderCard = (cardId, index, colIndex) => {
    const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
    if (isHidden && !editMode) return null;
    const isDragging = draggingId === cardId;

    const startTouchDrag = (x, y) => {
      if (!editMode) return;
      if (navigator.vibrate) navigator.vibrate(50);
      dragSourceRef.current = { index, cardId, colIndex };
      touchTargetRef.current = null;
      setTouchPath({ startX: x, startY: y, x, y });
      setTouchTargetId(null);
      setDraggingId(cardId);
    };

    const updateTouchDrag = (x, y) => {
      if (!editMode || !dragSourceRef.current) return;
      setTouchPath((prev) => (prev ? { ...prev, x, y } : { startX: x, startY: y, x, y }));
      const el = document.elementFromPoint(x, y);
      const cardEl = el?.closest?.('[data-card-id]');

      if (cardEl) {
        const targetId = cardEl.getAttribute('data-card-id');
        const targetIndex = parseInt(cardEl.getAttribute('data-index'));
        const targetColIndexStr = cardEl.getAttribute('data-col-index');
        const targetColIndex = targetColIndexStr ? parseInt(targetColIndexStr) : undefined;

        if (targetId && targetId !== dragSourceRef.current.cardId) {
          touchTargetRef.current = { targetId, targetIndex, targetColIndex };
          setTouchTargetId(targetId);

          const now = Date.now();
          if (now - touchSwapCooldownRef.current > 150) {
            touchSwapCooldownRef.current = now;
            const source = dragSourceRef.current;
            const newConfig = { ...pagesConfig };

            if (activePage === 'automations') {
              const cols = newConfig.automations;
              const sourceColIdx = source.colIndex !== undefined ? source.colIndex : 0;
              const targetColIdx = targetColIndex !== undefined ? targetColIndex : sourceColIdx;

              if (cols[sourceColIdx] && cols[targetColIdx]) {
                const [movedItem] = cols[sourceColIdx].cards.splice(source.index, 1);
                cols[targetColIdx].cards.splice(targetIndex, 0, movedItem);
                source.index = targetIndex;
                source.colIndex = targetColIdx;
              }
            } else {
              const currentList = [...(newConfig[activePage] || [])];
              const [movedItem] = currentList.splice(source.index, 1);
              currentList.splice(targetIndex, 0, movedItem);
              newConfig[activePage] = currentList;
              source.index = targetIndex;
            }

            dragSourceRef.current = source;
            setPagesConfig(newConfig);
            localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
            if (navigator.vibrate) navigator.vibrate(10);
          }
        }
      }
    };

    const performTouchDrop = (x, y) => {
      // Magnetic drop: Find nearest card if dropped in gap
      const cards = Array.from(document.querySelectorAll('[data-card-id]'));
      let cardElement = cards.find(card => {
          const rect = card.getBoundingClientRect();
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      });

      if (!cardElement) {
        let minDist = Infinity;
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist < 220 && dist < minDist) { minDist = dist; cardElement = card; }
        });
      }

      if (!cardElement && touchTargetRef.current) {
        cardElement = cards.find(card => card.getAttribute('data-card-id') === touchTargetRef.current.targetId);
      }

      if (cardElement) {
          const targetId = cardElement.getAttribute('data-card-id');
          const targetIndex = parseInt(cardElement.getAttribute('data-index'));
          const targetColIndexStr = cardElement.getAttribute('data-col-index');
          const targetColIndex = targetColIndexStr ? parseInt(targetColIndexStr) : undefined;
          
          if (targetId && targetId !== dragSourceRef.current.cardId) {
              const source = dragSourceRef.current;
              const newConfig = { ...pagesConfig };

              if (activePage === 'automations') {
                 const cols = newConfig.automations;
                 const sourceColIdx = source.colIndex !== undefined ? source.colIndex : 0;
                 const targetColIdx = targetColIndex !== undefined ? targetColIndex : sourceColIdx;
                 
                 const [movedItem] = cols[sourceColIdx].cards.splice(source.index, 1);
                 cols[targetColIdx].cards.splice(targetIndex, 0, movedItem);
              } else {
                 const currentList = [...(newConfig[activePage] || [])];
                 const movedItem = currentList.splice(source.index, 1)[0];
                 currentList.splice(targetIndex, 0, movedItem);
                 newConfig[activePage] = currentList;
              }

              setPagesConfig(newConfig);
              localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
              if (navigator.vibrate) navigator.vibrate(20);
          }
      }
    };

    const handleTouchEnd = (e) => {
      if (!editMode || !dragSourceRef.current) return;
      
      const touch = e.changedTouches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      performTouchDrop(x, y);
      
      setDraggingId(null);
      dragSourceRef.current = null;
      touchTargetRef.current = null;
      setTouchTargetId(null);
      setTouchPath(null);
    };

    const handleTouchCancel = (e) => {
      if (!editMode || !dragSourceRef.current) return;
      if (e.cancelable) e.preventDefault();
      const x = touchPath?.x;
      const y = touchPath?.y;
      if (typeof x === 'number' && typeof y === 'number') {
        performTouchDrop(x, y);
      }
      setDraggingId(null);
      dragSourceRef.current = null;
      touchTargetRef.current = null;
      setTouchTargetId(null);
      setTouchPath(null);
    };

    const dragProps = { 
      draggable: editMode, 
      onDragStart: (e) => {
        e.dataTransfer.setData('dragData', JSON.stringify({ index, cardId, colIndex }));
        e.dataTransfer.effectAllowed = "move";
        // Set dragging ID with a tiny delay so the browser captures the full-opacity element as the drag image
        setTimeout(() => setDraggingId(cardId), 0);
      },
      onDragEnd: () => setDraggingId(null),
      onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, 
      onDrop: (e) => {
        e.stopPropagation();
        const rawData = e.dataTransfer.getData('dragData');
        if (!rawData) return;
        const source = JSON.parse(rawData);
        const newConfig = { ...pagesConfig };

        if (activePage === 'automations') {
           const cols = newConfig.automations;
           const sourceColIdx = source.colIndex !== undefined ? source.colIndex : 0; // Fallback
           const targetColIdx = colIndex !== undefined ? colIndex : sourceColIdx;
           
           const [movedItem] = cols[sourceColIdx].cards.splice(source.index, 1);
           cols[targetColIdx].cards.splice(index, 0, movedItem);
        } else {
           const currentList = [...(newConfig[activePage] || [])];
           const movedItem = currentList.splice(source.index, 1)[0];
           currentList.splice(index, 0, movedItem);
           newConfig[activePage] = currentList;
        }

        setPagesConfig(newConfig);
        localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
        setDraggingId(null);
      },
      onTouchStart: (e) => {
        if (ignoreTouchRef.current) return;
        if (!editMode) return;
        if (!e.target.closest('[data-drag-handle]')) return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        startTouchDrag(touch.clientX, touch.clientY);
      },
      onTouchMove: (e) => {
        if (ignoreTouchRef.current) return;
        if (!editMode || !dragSourceRef.current) return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        updateTouchDrag(touch.clientX, touch.clientY);
      },
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      'data-card-id': cardId,
      'data-index': index,
      'data-col-index': colIndex
    };

    const isTouchTarget = !!touchTargetId && touchTargetId === cardId;

    const cardStyle = {
      backgroundColor: isDragging ? 'rgba(30, 58, 138, 0.6)' : 'var(--card-bg)',
      borderColor: isDragging ? 'rgba(96, 165, 250, 1)' : (editMode ? 'rgba(59, 130, 246, 0.6)' : 'var(--card-border)'),
      backdropFilter: 'blur(16px)',
      borderStyle: editMode ? 'dashed' : 'solid',
      borderWidth: editMode ? '2px' : '1px',
      opacity: isHidden && editMode ? 0.4 : 1,
      filter: isHidden && editMode ? 'grayscale(100%)' : 'none',
      transform: isDragging ? 'scale(1.08)' : 'none',
      boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : (isTouchTarget ? '0 0 0 2px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.35)' : 'none'),
      touchAction: editMode ? 'none' : 'auto',
      userSelect: editMode ? 'none' : 'auto',
      WebkitUserSelect: editMode ? 'none' : 'auto',
      zIndex: isDragging ? 50 : 1,
      pointerEvents: isDragging ? 'none' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const settingsKey = getCardSettingsKey(cardId);

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
      return ( 
      <>
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowEditCardModal(editId); setEditCardSettingsKey(settingsKey); }}
            className="p-2 rounded-full transition-colors hover:bg-blue-500/80 text-white border border-white/20 shadow-lg bg-black/60"
            title="Rediger kort"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCardVisibility(cardId); }}
            className="p-2 rounded-full transition-colors hover:bg-white/20 text-white border border-white/20 shadow-lg"
            style={{backgroundColor: isHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 0, 0, 0.6)'}}
            title={isHidden ? "Vis kort" : "Skjul kort"}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {isCardRemovable(cardId) && (
            <button 
              onClick={(e) => { e.stopPropagation(); removeCard(cardId); }}
              className="p-2 rounded-full transition-colors hover:bg-red-500/80 text-white border border-white/20 shadow-lg bg-black/60"
              title="Fjern kort"
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
              startTouchDrag(e.clientX, e.clientY);
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
              setDraggingId(null);
              dragSourceRef.current = null;
              touchTargetRef.current = null;
              setTouchTargetId(null);
              setTouchPath(null);
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
              setDraggingId(null);
              dragSourceRef.current = null;
              touchTargetRef.current = null;
              setTouchTargetId(null);
              setTouchPath(null);
            }}
            style={{ touchAction: 'none' }}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto"
          >
            <GripVertical className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Flytt</span>
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
        return renderAutomationCard(cardId, dragProps, getControls, cardStyle);
    }

    if (cardId.startsWith('vacuum.')) {
      return renderVacuumCard(cardId, dragProps, getControls, cardStyle);
    }

    if (cardId.startsWith('media_player.')) {
      return renderMediaPlayerCard(cardId, dragProps, getControls, cardStyle);
    }

    if (cardId.startsWith('media_group_')) {
      return renderMediaGroupCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (cardId.startsWith('weather_temp_')) {
      return renderWeatherTempCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    if (activePage === 'settings' && !['power', 'energy_cost', 'climate', 'rocky', 'shield', 'car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player') && !cardId.startsWith('sonos')) {
      return renderEntityCard(cardId, dragProps, getControls, cardStyle, settingsKey);
    }

    switch(cardId) {
      case 'power':
        return (
          <EnergyPowerCard
            dragProps={dragProps}
            controls={getControls('power')}
            cardStyle={cardStyle}
            editMode={editMode}
            name={customNames['power'] || 'Straumpris'}
            Icon={customIcons['power'] ? ICON_MAP[customIcons['power']] : Zap}
            priceDisplay={getS(TIBBER_ID)}
            currentPrice={currentPrice}
            priceStats={priceStats}
            fullPriceData={fullPriceData}
            currentPriceIndex={currentPriceIndex}
            onOpen={() => setShowPowerModal(true)}
          />
        );
      case 'energy_cost':
        return (
          <EnergyCostCard
            dragProps={dragProps}
            controls={getControls('energy_cost')}
            cardStyle={cardStyle}
            editMode={editMode}
            name={customNames['energy_cost'] || 'Kostnad'}
            Icon={customIcons['energy_cost'] ? ICON_MAP[customIcons['energy_cost']] : Coins}
            todayValue={getS(COST_TODAY_ID)}
            monthValue={!isNaN(parseFloat(entities[COST_MONTH_ID]?.state)) ? Math.round(parseFloat(entities[COST_MONTH_ID]?.state)) : String(getS(COST_MONTH_ID))}
          />
        );
      case 'climate':
        return (
          <ClimateCard
            dragProps={dragProps}
            controls={getControls('climate')}
            cardStyle={cardStyle}
            editMode={editMode}
            name={customNames['climate'] || 'Varmepumpe'}
            Icon={customIcons['climate'] ? ICON_MAP[customIcons['climate']] : null}
            currentTemp={climateCurrentTemp}
            targetTemp={climateTargetTemp}
            fanMode={fanMode}
            isCooling={isCooling}
            isHeating={isHeating}
            onOpen={() => setShowClimateModal(true)}
            onSetTemperature={(temp) => callService('climate', 'set_temperature', { entity_id: CLIMATE_ID, temperature: temp })}
          />
        );
      case 'rocky':
        return renderRockyCard(dragProps, getControls, cardStyle);
      case 'shield':
        return renderShieldCard(dragProps, getControls, cardStyle);
      case 'weather':
        return renderWeatherCard(dragProps, getControls, cardStyle);
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
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Ingen media</p>
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
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${mpPicture ? 'text-gray-300' : 'text-[var(--text-secondary)]'} truncate shadow-black drop-shadow-md`}>{mpApp || 'Media'}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1 truncate shadow-black drop-shadow-md">{mpApp || 'Media'}</p>
                )}
                <h3 className="text-2xl font-bold leading-tight line-clamp-2 mb-1 shadow-black drop-shadow-lg">{mpTitle || 'Ukjend'}</h3>
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

        const sTitle = isTV ? 'TV-lyd' : getA(sId, 'media_title');
        const sArtist = isTV ? 'Stova' : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
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
              <div className="text-center w-full px-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Ingen musikk</p><div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-[var(--text-muted)] opacity-40 truncate">{sName}</p></div></div>
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
              <div className="flex flex-col overflow-hidden pt-1"><div className="flex items-center gap-2 mb-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate">{sName}</p></div><h3 className="text-lg font-bold leading-tight truncate mb-0.5">{sTitle || 'Ukjend'}</h3><p className={`text-xs ${sPicture ? 'text-gray-400' : 'text-[var(--text-secondary)]'} truncate font-medium`}>{sArtist || ''}</p></div>
            </div>
            <div className="relative z-10 flex items-center justify-center gap-8 mt-2"><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_previous_track", { entity_id: sId }); }} className={`${sPicture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipBack className="w-6 h-6" /></button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_play_pause", { entity_id: sId }); }} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">{sIsPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_next_track", { entity_id: sId }); }} className={`${sPicture ? 'text-gray-400 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} transition-colors p-2 active:scale-90`}><SkipForward className="w-6 h-6" /></button></div>
          </div>
        );
      case 'car':
        return renderCarCard(dragProps, getControls, cardStyle);
      default: return null;
    }
  };

  const reStatus = () => {
    if (entities[REFRIGERATOR_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl animate-pulse" style={{backgroundColor: 'rgba(249, 115, 22, 0.02)'}}><div className="p-1.5 rounded-xl text-orange-400" style={{backgroundColor: 'rgba(249, 115, 22, 0.1)'}}><AlertCircle className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">VARSAL</span><span className="text-xs font-medium uppercase tracking-widest text-orange-200/50 italic">Kjøleskap ope</span></div></div>
    );
  };

  const stStatus = () => {
    if (entities[STUDIO_PRESENCE_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" style={{backgroundColor: 'var(--glass-bg)'}}><div className="p-1.5 rounded-xl text-emerald-400" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)'}}><Activity className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">Studioet</span><span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">I bruk</span></div></div>
    );
  };

  const poStatus = () => {
    if (entities[PORTEN_MOTION_ID]?.state !== 'on') return null;
    return (
      <button onClick={() => setShowCameraModal(true)} className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" style={{backgroundColor: 'var(--glass-bg)'}}><div className="p-1.5 rounded-xl text-amber-400" style={{backgroundColor: 'rgba(251, 191, 36, 0.1)'}}><Activity className="w-4 h-4" /></div><div className="flex flex-col items-start"><span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">Porten</span><span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">Bevegelse</span></div></button>
    );
  };

  const gaStatus = () => {
    if (entities[GARAGE_DOOR_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" style={{backgroundColor: 'var(--glass-bg)'}}><div className="p-1.5 rounded-xl text-red-400" style={{backgroundColor: 'rgba(248, 113, 113, 0.1)'}}><Warehouse className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">Garasje</span><span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">Ope</span></div></div>
    );
  };

  const embyStatus = () => {
    const activePlayers = Object.keys(entities)
      .filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'))
      .map(id => entities[id])
      .filter(Boolean)
      .filter(e => isMediaActive(e));
    
    const count = activePlayers.length;
    
    if (count === 0) return null;

    return (
      <button onClick={() => {
        const firstActive = activePlayers[0]?.entity_id;
        if (firstActive) setActiveMediaId(firstActive);
        setActiveMediaGroupKey('__emby__');
        setActiveMediaModal('media');
      }} className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" style={{backgroundColor: 'var(--glass-bg)'}}><div className="p-1.5 rounded-xl text-green-400" style={{backgroundColor: 'rgba(74, 222, 128, 0.1)'}}><Clapperboard className="w-4 h-4 animate-pulse" /></div><div className="flex flex-col items-start"><span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">Emby</span><span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">{count} {count === 1 ? 'spelar' : 'spelar'}</span></div></button>
    );
  };

  const sonosStatus = () => {
    const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
    const activeSonos = sonosEntities.filter(isSonosActive);
    
    if (activeSonos.length === 0) return null;

    let currentSonos = activeSonos.find(e => e.state === 'playing');
    if (!currentSonos) currentSonos = activeSonos[0];

    const sId = currentSonos.entity_id;
    const isLydplanke = sId === 'media_player.sonos_lydplanke';
    const isTV = isLydplanke && (currentSonos.attributes?.source === 'TV' || currentSonos.attributes?.media_title === 'TV');

    const sTitle = isTV ? 'TV-lyd' : getA(sId, 'media_title');
    const sArtist = isTV ? 'Stova' : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
    const sPicture = !isTV ? getEntityImageUrl(currentSonos.attributes?.entity_picture) : null;
    const isPlaying = currentSonos.state === 'playing';

    return (
      <button onClick={() => setActiveMediaModal('sonos')} className="flex items-center gap-3 px-2 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" style={{backgroundColor: 'var(--glass-bg)'}}><div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--glass-bg)] relative flex-shrink-0">{sPicture ? <img src={sPicture} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-400"><Music className="w-4 h-4" /></div>}</div><div className="flex flex-col items-start max-w-[120px]"><span className="text-xs text-[var(--text-primary)] font-bold leading-tight truncate w-full">{sTitle || 'Ukjend'}</span><span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)] truncate w-full">{sArtist || ''}</span></div></button>
    );
  };

  const drStatus = (id, label) => {
    if (entities[id]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" style={{backgroundColor: 'var(--glass-bg)'}}><div className="p-1.5 rounded-xl text-blue-400" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}><DoorOpen className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">{label}</span><span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">Ope</span></div></div>
    );
  };

  const updateStatus = () => {
    const updates = Object.keys(entities).filter(id => id.startsWith('update.') && entities[id].state === 'on');
    const count = updates.length;
    if (count === 0) return null;

    return (
      <button onClick={() => setShowUpdateModal(true)} className="relative flex items-center justify-center p-2 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" style={{backgroundColor: 'var(--glass-bg)'}}>
        <div className="p-2 rounded-xl text-blue-400" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>
          <Download className="w-6 h-6" />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center border-[3px] border-[var(--bg-primary)] shadow-lg">
            {count}
        </div>
      </button>
    );
  };

  const editSettingsKey = showEditCardModal ? (editCardSettingsKey || getCardSettingsKey(showEditCardModal)) : null;
  const editSettings = editSettingsKey ? (cardSettings[editSettingsKey] || cardSettings[showEditCardModal] || {}) : {};
  const editId = showEditCardModal;
  const editEntity = editId ? entities[editId] : null;
  const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
  const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');
  const canEditName = !!editId && !isEditWeatherTemp && editId !== 'media_player' && editId !== 'sonos';
  const canEditIcon = !!editId && (isEditLight || editId.startsWith('automation.') || editId.startsWith('vacuum.') || !!editEntity || ['power', 'energy_cost', 'climate', 'car', 'shield', 'rocky', 'weather'].includes(editId));
  const canEditStatus = !!editEntity && !!editSettingsKey && editSettingsKey.startsWith('settings::');

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
        `}</style>
        <header className="relative mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
          <div className="absolute top-0 right-0 hidden md:block">
             <h2 className="font-light tracking-[0.1em] leading-none select-none" style={{ fontSize: `calc(3.75rem * ${headerScale})`, color: 'var(--text-muted)' }}>{now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}</h2>
          </div>
          <div className="absolute top-0 right-0 md:hidden">
             <h2 className="font-light tracking-[0.1em] leading-none select-none" style={{ fontSize: `calc(3rem * ${headerScale})`, color: 'var(--text-muted)' }}>{now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}</h2>
          </div>

          <div className="flex flex-col gap-3 font-sans w-full">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="font-light uppercase leading-none select-none tracking-[0.2em] md:tracking-[0.8em]" style={{color: 'var(--text-muted)', fontSize: `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`}}>Midttunet</h1>
                {editMode && (<div className="flex flex-col gap-1 z-50"><button onClick={() => updateHeaderScale(Math.min(headerScale + 0.1, 2))} className="p-1 bg-white/10 rounded hover:bg-white/20"><ChevronUp className="w-4 h-4" /></button><button onClick={() => updateHeaderScale(Math.max(headerScale - 0.1, 0.5))} className="p-1 bg-white/10 rounded hover:bg-white/20"><ChevronDown className="w-4 h-4" /></button></div>)}
              </div>
              <p className="text-gray-500 font-medium uppercase text-[10px] md:text-xs leading-none mt-2 opacity-50 tracking-[0.2em] md:tracking-[0.6em]">{now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-0 font-sans items-center">
              {(pagesConfig.header || []).map(id => personStatus(id))}
              <div className="w-px h-8 bg-[var(--glass-border)] mx-2"></div>
              {reStatus()}{stStatus()}{poStatus()}{gaStatus()}{embyStatus()}{sonosStatus()}{drStatus(EILEV_DOOR_ID, "Eilev si dør")}{drStatus(OLVE_DOOR_ID, "Olve si dør")}{updateStatus()}
            </div>
          </div>
        </header>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
            {pages.map(page => {
              const settings = pageSettings[page.id] || {};
              const label = settings.label || page.label;
              const isHidden = settings.hidden;
              const Icon = settings.icon ? ICON_MAP[settings.icon] : page.icon;
              if (!editMode && isHidden) return null;
              return (
              <button
                key={page.id}
                onClick={() => editMode ? setEditingPage(page.id) : setActivePage(page.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${activePage === page.id ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'} ${editMode && isHidden ? 'opacity-50 border-dashed border-gray-500' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {editMode && <Settings className="w-3 h-3 ml-1 opacity-50" />}
              </button>
            )})}
          </div>
          <div className="relative flex items-center gap-6 flex-shrink-0 overflow-visible pb-2 w-full md:w-auto justify-end">
            {editMode && <button onClick={() => setShowAddCardModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Plus className="w-4 h-4" /> Legg til</button>}
            {editMode && <button onClick={() => { const newCols = gridColumns === 3 ? 4 : 3; setGridColumns(newCols); localStorage.setItem('midttunet_grid_columns', newCols); }} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Columns className="w-4 h-4" /> {gridColumns === 3 ? '4' : '3'} Kolonner</button>}
            {editMode && (
              <button onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(false);
              }} className="group flex items-center gap-2 text-xs font-bold uppercase text-green-400 hover:text-white transition-all whitespace-nowrap">
                <Check className="w-4 h-4" /> Ferdig
              </button>
            )}
            
            <div ref={gearMenuRef} className={`absolute right-0 top-12 z-50 flex flex-col items-stretch gap-3 p-5 min-w-[200px] w-fit max-w-[280px] rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-500 ease-in-out ${showMenu ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
              {!editMode && (
                <button onClick={() => {
                  setEditMode(true);
                  setShowMenu(false);
                }} className="group flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]">
                  <Edit2 className="w-4 h-4" /> Rediger
                </button>
              )}
              {!editMode && <button onClick={() => { setShowConfigModal(true); setShowMenu(false); }} className="group flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]"><Settings className="w-4 h-4" /> System</button>}
              {!editMode && (
                <button onClick={() => { toggleTheme(); setShowMenu(false); }} className="flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]" title="Bytt tema">
                  {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Tema
                </button>
              )}
              {!editMode && (
                <button onClick={() => { toggleFullscreen(); setShowMenu(false); }} className="flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]" title="Fullskjerm">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  Fullskjerm
                </button>
              )}
            </div>
            <button ref={gearButtonRef} onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors group ${showMenu ? 'bg-[var(--glass-bg)]' : ''}`}><Settings className={`w-5 h-5 transition-all duration-500 ${showMenu ? 'rotate-90 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} /></button>
            {!connected && <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0`} style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: '#ef4444'}} /></div>}
          </div>
        </div>

        {activePage === 'automations' ? (
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
                   setPagesConfig(newConfig);
                   localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig));
                }}
              >
                <div className="mb-4 px-2">
                  {editMode ? (
                    <input type="text" className="bg-transparent border-b border-[var(--glass-border)] w-full text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:border-blue-500 outline-none pb-1" value={col.title} onChange={(e) => saveColumnTitle(colIndex, e.target.value)} />
                  ) : (
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{col.title}</h3>
                  )}
                </div>
                {col.cards.map((id, index) => renderCard(id, index, colIndex))}
              </div>
            ))}
          </div>
        ) : (
          <div key={activePage} className="grid gap-8 font-sans fade-in-anim items-start" style={{ gridAutoRows: '100px', gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))` }}>
            {(pagesConfig[activePage] || []).map((id, index) => {
              const placement = gridLayout[id];

              if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;
              if (!placement) return null;

              return (
                <div
                  key={`${id}-${index}`}
                  className="h-full"
                  style={{
                    gridRowStart: placement.row,
                    gridColumnStart: placement.col,
                    gridRowEnd: `span ${placement.span}`
                  }}
                >
                  {renderCard(id, index)}
                </div>
              );
            })}
          </div>
        )}
        
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}}><div className="border w-full max-w-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}}><button onClick={() => setShowConfigModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button><h3 className="text-3xl font-light mb-10 text-center uppercase tracking-widest italic" style={{color: 'var(--text-primary)'}}>System</h3>
          <div className="space-y-8 font-sans">
            <div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4 flex items-center gap-2">HA URL (Primær){connected && activeUrl === config.url && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">TILKOBLA</span>}</label><input type="text" className="w-full px-6 py-5 rounded-2xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} value={config.url} onChange={(e) => setConfig({...config, url: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4 flex items-center gap-2">HA URL (Fallback/Lokal){connected && activeUrl === config.fallbackUrl && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">TILKOBLA</span>}</label><input type="text" className="w-full px-6 py-5 rounded-2xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} value={config.fallbackUrl} onChange={(e) => setConfig({...config, fallbackUrl: e.target.value})} placeholder="Valfritt" /></div>
            <div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4">Token</label><textarea className="w-full px-6 py-5 h-48 rounded-2xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} value={config.token} onChange={(e) => setConfig({...config, token: e.target.value})} /></div>
            <div className="space-y-2"><ModernDropdown label="Utsjånad" icon={Palette} options={Object.keys(themes)} current={currentTheme} onChange={setCurrentTheme} map={{ dark: 'Mørk', light: 'Lys' }} /></div>
          </div>
          <button onClick={() => setShowConfigModal(false)} className="w-full mt-10 py-5 rounded-2xl text-blue-400 font-black uppercase tracking-widest" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid'}}>Lagre og kople til</button></div></div>
        )}

        {showPowerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowPowerModal(false)}>
            <div className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[80vh] overflow-y-auto" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowPowerModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
              <div className="flex items-center gap-6 mb-6">
                <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#fbbf24'}}><Zap className="w-10 h-10" /></div>
                <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">Straumpris</h3>
              </div>
              <div className="flex justify-around items-center mb-8 px-4 py-4 rounded-2xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Snitt</span>
                    <span className="text-xl font-light text-[var(--text-primary)]">{priceStats.avg.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-8 bg-[var(--glass-border)]"></div>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Låg</span>
                    <span className="text-xl font-light text-blue-400">{priceStats.min.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-8 bg-[var(--glass-border)]"></div>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Høg</span>
                    <span className="text-xl font-light text-red-400">{priceStats.max.toFixed(2)}</span>
                 </div>
              </div>
              <InteractivePowerGraph data={fullPriceData} currentIndex={currentPriceIndex} />
            </div>
          </div>
        )}

        {showClimateModal && entities[CLIMATE_ID] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowClimateModal(false)}>
            <div className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[90vh] overflow-y-auto" style={{backgroundColor: isHeating ? 'rgba(249, 115, 22, 0.01)' : isCooling ? 'rgba(59, 130, 246, 0.01)' : 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowClimateModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <div className="flex items-center gap-8 mb-12 font-sans">
                <div className="p-6 rounded-3xl transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : 'var(--text-secondary)'}}>
                  {isCooling ? <Snowflake className="w-12 h-12" /> : <AirVent className="w-12 h-12" />}
                  
                </div>
                <div>
                  <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">Varmepumpe</h3>
                  <div className="mt-3 px-4 py-1.5 rounded-full border inline-block transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)', borderColor: isCooling ? 'rgba(59, 130, 246, 0.2)' : isHeating ? 'rgba(249, 115, 22, 0.2)' : 'var(--glass-border)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : 'var(--text-secondary)'}}>
                    <p className="text-xs uppercase font-bold italic tracking-widest">Status: {isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : 'VENTAR'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
                <div className="lg:col-span-3 space-y-10 p-6 md:p-10 rounded-3xl border shadow-inner" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                  <div className="text-center font-sans">
                    <div className="flex justify-between items-center mb-6 px-4 italic">
                      <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.5em'}}>Innetemperatur</p>
                      <span className="text-xs uppercase font-bold" style={{letterSpacing: '0.3em', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>{String(getA(CLIMATE_ID, "current_temperature"))}°C</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-10">
                      <span className="text-6xl md:text-9xl font-light italic text-[var(--text-primary)] tracking-tighter leading-none select-none" style={{textShadow: '0 10px 25px rgba(0,0,0,0.1)', color: isHeating ? '#fef2f2' : isCooling ? '#f0f9ff' : 'var(--text-primary)'}}>
                        {String(getA(CLIMATE_ID, "temperature"))}
                      </span>
                      <span className="text-5xl font-medium leading-none mt-10 italic text-gray-700">°C</span>
                    </div>
                    <div className="flex items-center gap-8 px-4">
                      <button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) - 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                        <Minus className="w-8 h-8" style={{strokeWidth: 3}} />
                      </button>
                      <div className="flex-grow font-sans">
                        <M3Slider min={16} max={30} step={0.5} value={getA(CLIMATE_ID, "temperature") || 21} onChange={(e) => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : isHeating ? 'bg-orange-500' : 'bg-white/20'} />
                      </div>
                      <button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) + 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                        <Plus className="w-8 h-8" style={{strokeWidth: 3}} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-10 py-4 italic font-sans">
                  <ModernDropdown label="Modus" icon={Flame} options={getA(CLIMATE_ID, "hvac_modes", [])} current={entities[CLIMATE_ID]?.state} onChange={(m) => callService("climate", "set_hvac_mode", { entity_id: CLIMATE_ID, hvac_mode: m })} map={HVAC_MAP} />
                  <ModernDropdown label="Viftestyrke" icon={Fan} options={getA(CLIMATE_ID, "fan_modes", [])} current={getA(CLIMATE_ID, "fan_mode")} onChange={(m) => callService("climate", "set_fan_mode", { entity_id: CLIMATE_ID, fan_mode: m })} map={FAN_MAP} />
                  <ModernDropdown label="Sving" icon={ArrowUpDown} options={getA(CLIMATE_ID, "swing_modes", [])} current={getA(CLIMATE_ID, "swing_mode")} onChange={(m) => callService("climate", "set_swing_mode", { entity_id: CLIMATE_ID, swing_mode: m })} map={SWING_MAP} />
                </div>
              </div>
            </div>
          </div>
        )}

        {showLightModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowLightModal(null)}>
            <div className="border w-full max-w-xl rounded-3xl md:rounded-[2.5rem] p-6 font-sans relative max-h-[80vh] overflow-y-auto" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              
              {(() => {
                const entity = entities[showLightModal];
                const isUnavailable = entity?.state === 'unavailable' || entity?.state === 'unknown' || !entity;
                
                return (
                  <>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl" style={{backgroundColor: isUnavailable ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 119, 6, 0.15)', color: isUnavailable ? '#ef4444' : '#fbbf24'}}>
                    {(() => {
                      let Icon = Lightbulb;
                      if (showLightModal === LIGHT_KJOKKEN) Icon = Utensils;
                      if (showLightModal === LIGHT_STOVA) Icon = Sofa;
                      if (showLightModal === LIGHT_STUDIO) Icon = LampDesk;
                      return isUnavailable ? <AlertTriangle className="w-8 h-8" /> : <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">{String(getA(showLightModal, "friendly_name", "Lys"))}</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1.5 opacity-60">{isUnavailable ? 'Utilgjengelig' : 'Lysstyring'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => !isUnavailable && callService("light", "toggle", { entity_id: showLightModal })} className="w-12 h-12 rounded-full flex items-center justify-center transition-all border" style={{backgroundColor: isUnavailable ? 'var(--glass-bg)' : (entity?.state === 'on' ? 'rgba(217, 119, 6, 0.2)' : 'var(--glass-bg)'), borderColor: isUnavailable ? 'var(--glass-border)' : (entity?.state === 'on' ? 'rgba(217, 119, 6, 0.3)' : 'var(--glass-border)'), color: isUnavailable ? '#6b7280' : (entity?.state === 'on' ? '#fbbf24' : '#9ca3af'), cursor: isUnavailable ? 'not-allowed' : 'pointer'}}>
                      {isUnavailable ? <AlertTriangle className="w-5 h-5" /> : <Zap className="w-5 h-5" fill={entity?.state === 'on' ? "currentColor" : "none"} />}
                   </button>
                   <button onClick={() => setShowLightModal(null)} className="w-12 h-12 rounded-full flex items-center justify-center transition-all border hover:bg-[var(--glass-bg-hover)]" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: '#9ca3af'}}><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>Hovudstyrke</p>
                    <p className="text-sm font-bold text-gray-300">{isUnavailable ? '--' : (entity?.state === 'on' ? Math.round(((getA(showLightModal, "brightness") || 0) / 255) * 100) : 0)}%</p>
                  </div>
                  <M3Slider min={0} max={255} step={1} value={getA(showLightModal, "brightness") || 0} disabled={entity?.state !== 'on' || isUnavailable} onChange={(e) => callService("light", "turn_on", { entity_id: showLightModal, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
                </div>

                {getA(showLightModal, "entity_id", []).length > 0 && (
                  <div className="space-y-4 pt-6 border-t" style={{borderColor: 'var(--glass-border)'}}>
                    <p className="text-xs text-gray-400 uppercase font-bold ml-1 mb-2" style={{letterSpacing: '0.2em'}}>Lamper i rommet</p>
                    <div className="grid grid-cols-1 gap-3">
                      {getA(showLightModal, "entity_id", []).map(cid => {
                        const subEnt = entities[cid];
                        const subUnavail = subEnt?.state === 'unavailable' || subEnt?.state === 'unknown' || !subEnt;
                        return (
                        <div key={cid} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${subUnavail ? 'opacity-50' : ''}`} style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-300 w-1/3 truncate">{subEnt?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ')}</span>
                          <div className="flex-grow">
                            <M3Slider min={0} max={255} step={1} value={subEnt?.attributes?.brightness || 0} disabled={subEnt?.state !== 'on' || subUnavail} onChange={(e) => callService("light", "turn_on", { entity_id: cid, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
                          </div>
                          <button onClick={() => !subUnavail && callService("light", "toggle", { entity_id: cid })} className="w-10 h-6 rounded-full relative transition-all flex-shrink-0" style={{backgroundColor: subUnavail ? 'var(--glass-bg)' : (subEnt?.state === 'on' ? 'rgba(217, 119, 6, 0.4)' : 'var(--glass-bg)'), cursor: subUnavail ? 'not-allowed' : 'pointer'}}>
                            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{left: subEnt?.state === 'on' ? 'calc(100% - 4px - 16px)' : '4px', backgroundColor: subUnavail ? '#6b7280' : (subEnt?.state === 'on' ? '#fbbf24' : '#9ca3af')}} />
                          </button>
                        </div>
                      )})}
                    </div>
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {showShieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowShieldModal(false)}>
            <div className="border w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative font-sans" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
               <button onClick={() => setShowShieldModal(false)} className="absolute top-6 right-6 p-4 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]"><X className="w-6 h-6" /></button>
               
               <div className="flex flex-col items-center gap-8 mt-4">
                  <div className="flex items-center gap-4 mb-4">
                     <div className={`p-4 rounded-2xl ${entities[SHIELD_ID]?.state !== 'off' ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Gamepad2 className="w-8 h-8" /></div>
                     <div><h3 className="text-2xl font-light text-[var(--text-primary)] uppercase italic tracking-widest">Shield</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{entities[SHIELD_ID]?.state === 'playing' ? 'Spelar no' : (entities[SHIELD_ID]?.state !== 'off' ? 'På' : 'Avslått')}</p></div>
                  </div>

                  <div className="bg-[var(--glass-bg)] p-6 rounded-[2.5rem] border border-[var(--glass-border)] relative">
                     <div className="grid grid-cols-3 gap-4 items-center justify-items-center">
                        <div />
                        <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "DPAD_UP" })} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all"><ChevronUp className="w-6 h-6" /></button>
                        <div />
                        <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "DPAD_LEFT" })} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all"><ChevronLeft className="w-6 h-6" /></button>
                        <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "DPAD_CENTER" })} className="p-6 rounded-full bg-[var(--glass-bg-hover)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all border border-[var(--glass-border)]"><div className="w-4 h-4 rounded-full bg-white/50" /></button>
                        <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "DPAD_RIGHT" })} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all"><ChevronRight className="w-6 h-6" /></button>
                        <div />
                        <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "DPAD_DOWN" })} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all"><ChevronDown className="w-6 h-6" /></button>
                        <div />
                     </div>
                  </div>

                  <div className="flex gap-6 w-full justify-center"><button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "BACK" })} className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all font-bold uppercase tracking-widest text-xs text-gray-400">Tilbake</button><button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "HOME" })} className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all font-bold uppercase tracking-widest text-xs text-gray-400">Heim</button></div>

                  <div className="flex gap-4 w-full pt-4 border-t border-[var(--glass-border)]">
                     <button onClick={() => callService("media_player", "toggle", { entity_id: SHIELD_ID })} className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${entities[SHIELD_ID]?.state !== 'off' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}><Power className="w-4 h-4" /> {entities[SHIELD_ID]?.state !== 'off' ? 'Slå av' : 'Slå på'}</button>
                     <button onClick={() => callService("remote", "send_command", { entity_id: SHIELD_REMOTE_ID, command: "MEDIA_PLAY_PAUSE" })} className="flex-1 py-4 rounded-2xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Spel/Pause</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {showRockyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowRockyModal(false)}>
            <div className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[85vh] overflow-y-auto" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowRockyModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}><Bot className="w-10 h-10" /></div>
                <div>
                  <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">Rocky</h3>
                  <p className="text-xs text-gray-500 uppercase font-bold mt-2" style={{letterSpacing: '0.1em'}}>Status: {entities[ROCKY_ID]?.state}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>Sist vaska</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-[var(--text-primary)]">{getA(ROCKY_ID, "squareMeterCleanArea", 0)}</span><span className="text-gray-500 font-medium">m²</span></div>
                  <p className="text-xs text-gray-500 mt-2 font-medium opacity-60">Tid: {Math.round(getA(ROCKY_ID, "cleanTime", 0) / 60)} min</p>
                </div>
                <div className="p-8 rounded-3xl border flex flex-col justify-center gap-4" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                   <button onClick={() => callService("vacuum", entities[ROCKY_ID]?.state === "cleaning" ? "pause" : "start", { entity_id: ROCKY_ID })} className="w-full py-4 rounded-2xl bg-blue-500/20 text-blue-400 font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2">{entities[ROCKY_ID]?.state === "cleaning" ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}</button>
                   <div className="flex gap-4">
                     <button onClick={() => callService("vacuum", "return_to_base", { entity_id: ROCKY_ID })} className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Heim</button>
                     <button onClick={() => callService("vacuum", "locate", { entity_id: ROCKY_ID })} className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors flex items-center justify-center gap-2"><MapPin className="w-4 h-4" /> Finn</button>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                 <ModernDropdown label="Sugekraft" icon={Fan} options={getA(ROCKY_ID, "fan_speed_list", [])} current={getA(ROCKY_ID, "fan_speed")} onChange={(val) => callService("vacuum", "set_fan_speed", { entity_id: ROCKY_ID, fan_speed: val })} />
                 {getA(ROCKY_ID, "mop_intensity_list") && (
                   <ModernDropdown label="Mopp Intensitet" icon={Droplets} options={getA(ROCKY_ID, "mop_intensity_list", [])} current={getA(ROCKY_ID, "mop_intensity")} onChange={(val) => callService("vacuum", "send_command", { entity_id: ROCKY_ID, command: "set_mop_mode", params: { mop_mode: val } })} />
                 )}
              </div>
            </div>
          </div>
        )}

        {showLeafModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowLeafModal(false)}>
            <div className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[85vh] overflow-y-auto" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                <div className="flex items-center gap-6">
                  <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e'}}><Car className="w-10 h-10" /></div>
                  <div>
                    <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">Nissan Leaf</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <p className="text-xs text-gray-500 uppercase font-bold" style={{letterSpacing: '0.1em'}}>Oppdatert: {formatRelativeTime(entities[LEAF_LAST_UPDATED]?.state)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => callService("button", "press", { entity_id: LEAF_UPDATE })}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest transition-all hover:bg-white/5 active:scale-95" 
                    style={{backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)'}}
                  >
                    <RefreshCw className="w-4 h-4" /> Oppdater
                  </button>
                  <button onClick={() => setShowLeafModal(false)} className="p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>Batteri</p>
                    {entities[LEAF_CHARGING]?.state === 'on' && <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-[var(--text-primary)]">{String(getS(LEAF_ID))}</span><span className="text-gray-500 font-medium">%</span></div>
                  <p className="text-xs text-gray-500 mt-2 font-medium opacity-60">{entities[LEAF_PLUGGED]?.state === 'on' ? 'Plugga i' : 'Ikkje plugga i'}</p>
                </div>
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>Rekkevidde</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-[var(--text-primary)]">{String(getS(LEAF_RANGE))}</span><span className="text-gray-500 font-medium">km</span></div>
                </div>
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>Temp inne</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-[var(--text-primary)]">{String(getS(LEAF_INTERNAL_TEMP))}</span><span className="text-gray-500 font-medium">°C</span></div>
                </div>
                <div className="p-6 rounded-3xl border flex flex-col justify-between" 
                     style={{backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)', borderColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'rgba(249, 115, 22, 0.3)' : 'var(--glass-border)'}}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs uppercase font-bold" style={{letterSpacing: '0.2em', color: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? '#fb923c' : '#9ca3af'}}>Klima</p>
                      <p className="text-2xl font-light italic text-[var(--text-primary)] mt-1">{entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'PÅ' : 'AV'}</p>
                    </div>
                    <button onClick={() => callService("climate", entities[LEAF_CLIMATE]?.state === 'heat_cool' ? "turn_off" : "turn_on", { entity_id: LEAF_CLIMATE })} className="w-12 h-7 rounded-full relative transition-all" style={{backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255,255,255,0.1)'}}>
                      <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{left: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'calc(100% - 5px - 20px)' : '4px', backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? '#fbbf24' : '#9ca3af'}} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                       <p className="text-[10px] uppercase font-bold opacity-60">Mål: {getA(LEAF_CLIMATE, "temperature", 20)}°C</p>
                    </div>
                    <M3Slider min={16} max={30} step={0.5} value={getA(LEAF_CLIMATE, "temperature") || 20} onChange={(e) => callService("climate", "set_temperature", { entity_id: LEAF_CLIMATE, temperature: parseFloat(e.target.value) })} colorClass={entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'bg-orange-500' : 'bg-white/20'} />
                  </div>
                </div>
              </div>

              {getA(LEAF_LOCATION, "latitude") && getA(LEAF_LOCATION, "longitude") && (
                <div className="w-full h-64 rounded-3xl overflow-hidden border relative group" style={{borderColor: 'rgba(255,255,255,0.1)'}}>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${getA(LEAF_LOCATION, "longitude")-0.005}%2C${getA(LEAF_LOCATION, "latitude")-0.005}%2C${getA(LEAF_LOCATION, "longitude")+0.005}%2C${getA(LEAF_LOCATION, "latitude")+0.005}&layer=mapnik&marker=${getA(LEAF_LOCATION, "latitude")}%2C${getA(LEAF_LOCATION, "longitude")}`} 
                    style={{filter: 'invert(0.9) grayscale(0.8) contrast(1.2) brightness(0.8)'}}
                    className="opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  ></iframe>
                  <div className="absolute bottom-4 left-4 px-4 py-2 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 flex items-center gap-2 pointer-events-none">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Sist sett her</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showUpdateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => { setShowUpdateModal(false); setExpandedUpdate(null); }}>
            <div className="border w-full max-w-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans max-h-[85vh] overflow-y-auto" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowUpdateModal(false); setExpandedUpdate(null); }} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
              <h3 className="text-3xl font-light mb-8 text-[var(--text-primary)] text-center uppercase tracking-widest italic">Oppdateringar</h3>
              
              <div className="space-y-4">
                {Object.keys(entities).filter(id => id.startsWith('update.') && entities[id].state === 'on').map(id => {
                    const entity = entities[id];
                    const attr = entity.attributes;
                    const picture = getEntityImageUrl(attr.entity_picture);
                    const inProgress = attr.in_progress;
                    const isExpanded = expandedUpdate === id;
                    
                    return (
                        <div key={id} className="rounded-3xl border overflow-hidden transition-all duration-300" style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
                            <div 
                                className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer"
                                onClick={() => {
                                    if (isExpanded) setExpandedUpdate(null);
                                    else {
                                        setExpandedUpdate(id);
                                        fetchReleaseNotes(id);
                                    }
                                }}
                            >
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0">
                                    {picture ? <img src={picture} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><RefreshCw className="w-6 h-6 text-[var(--text-secondary)]" /></div>}
                                </div>
                                <div className="flex-grow text-center md:text-left">
                                    <h4 className="text-base font-bold text-[var(--text-primary)]">{attr.title || attr.friendly_name}</h4>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mt-0.5 text-xs">
                                        <span className="text-[var(--text-secondary)]">{attr.installed_version}</span>
                                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                                        <span className="text-green-400 font-bold">{attr.latest_version}</span>
                                    </div>
                                    {!isExpanded && attr.release_summary && <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">{attr.release_summary}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); callService("update", "install", { entity_id: id }); }}
                                        disabled={inProgress}
                                        className={`px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all ${inProgress ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'}`}
                                    >
                                        {inProgress ? 'Oppdaterer...' : 'Oppdater'}
                                    </button>
                                    <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-0 border-t border-[var(--glass-border)]">
                                    <div className="pt-3 text-xs text-[var(--text-secondary)] leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(releaseNotes[id] || attr.release_summary || "Ingen detaljar tilgjengeleg.") }} />
                                    {attr.release_url && (
                                        <a href={attr.release_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                                            Les meir <ArrowRight className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {Object.keys(entities).filter(id => id.startsWith('update.') && entities[id].state === 'on').length === 0 && (
                    <p className="text-center text-[var(--text-secondary)] py-10">Ingen oppdateringar tilgjengeleg</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showAddCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowAddCardModal(false)}>
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
            <div className="border w-full max-w-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAddCardModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
              <h3 className="text-2xl font-light mb-8 text-[var(--text-primary)] text-center uppercase tracking-widest italic">Legg til kort</h3>
              
              {addCardTargetPage === 'settings' && (
                <div className="mb-6 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" placeholder="Søk etter entitet..." className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-12 pr-4 py-3 text-[var(--text-primary)] outline-none focus:border-blue-500/50 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                </div>
              )}
              
              {(addCardTargetPage !== 'header' && addCardTargetPage !== 'automations' && addCardTargetPage !== 'settings') && (
                <div className="mb-8">
                  <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">Korttype</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAddCardType('light')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${addCardType === 'light' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Lightbulb className="w-4 h-4" /> Lys
                    </button>
                    <button
                      onClick={() => setAddCardType('vacuum')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${addCardType === 'vacuum' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Bot className="w-4 h-4" /> Støvsuger
                    </button>
                    <button
                      onClick={() => setAddCardType('media')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${addCardType === 'media' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Music className="w-4 h-4" /> Musikk
                    </button>
                    <button
                      onClick={() => setAddCardType('weather')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${addCardType === 'weather' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    >
                      <CloudSun className="w-4 h-4" /> Vær/Temp
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {addCardType === 'weather' ? (
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">Værsensor (påkravd)</p>
                      <div className="space-y-3">
                        {Object.keys(entities)
                          .filter(id => id.startsWith('weather.'))
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedWeatherId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedWeatherId(prev => prev === id ? null : id)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>{id}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                        {Object.keys(entities).filter(id => id.startsWith('weather.')).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">Ingen værsensorar funne</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">Temperatursensor (valfri)</p>
                      <div className="space-y-3">
                        <button type="button" onClick={() => setSelectedTempId(null)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group entity-item ${!selectedTempId ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}>
                          <div className="flex flex-col overflow-hidden mr-4">
                            <span className={`text-sm font-bold transition-colors truncate ${!selectedTempId ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>Bruk temperatur frå vær</span>
                            <span className={`text-[10px] font-mono truncate ${!selectedTempId ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>weather.temperature</span>
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
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(id => {
                            const isSelected = selectedTempId === id;
                            return (
                              <button type="button" key={id} onClick={() => setSelectedTempId(prev => prev === id ? null : id)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}>
                                <div className="flex flex-col overflow-hidden mr-4">
                                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                                  <span className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>{id}</span>
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
                          <p className="text-gray-500 italic text-sm text-center py-4">Ingen temperatursensorar funne</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{addCardTargetPage === 'header' ? 'Tilgjengelege personar' : (addCardTargetPage === 'automations' ? 'Tilgjengelege automasjonar' : (addCardTargetPage === 'settings' ? 'Alle entitetar' : (addCardType === 'vacuum' ? 'Tilgjengelege støvsugarar' : (addCardType === 'media' ? 'Tilgjengelege spelarar' : 'Tilgjengelege lys'))))}</p>
                    <div className="space-y-3">
                      {Object.keys(entities)
                        .filter(id => {
                          if (addCardTargetPage === 'header') return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
                          if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                          if (addCardTargetPage === 'settings') {
                             const isNotAdded = !(pagesConfig.settings || []).includes(id);
                             if (!isNotAdded) return false;
                             if (searchTerm) {
                               const lowerTerm = searchTerm.toLowerCase();
                               const name = entities[id].attributes?.friendly_name || id;
                               return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
                             }
                             return true;
                          }
                          if (addCardType === 'vacuum') {
                            return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          }
                          if (addCardType === 'media') {
                            return id.startsWith('media_player.');
                          }
                          return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                        })
                        .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                        .slice(0, addCardTargetPage === 'settings' ? 100 : undefined) // Limit settings list for performance
                        .map(id => {
                          const isSelected = selectedEntities.includes(id);
                          return (
                          <button type="button" key={id} onClick={() => {
                              if (selectedEntities.includes(id)) setSelectedEntities(prev => prev.filter(e => e !== id));
                              else setSelectedEntities(prev => [...prev, id]);
                          }} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group entity-item ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}>
                            <div className="flex flex-col overflow-hidden mr-4">
                              <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                              <span className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>{id}</span>
                            </div>
                            <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                          </button>
                        );})}
                        {Object.keys(entities).filter(id => {
                          if (addCardTargetPage === 'header') return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
                          if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                          if (addCardTargetPage === 'settings') return !(pagesConfig.settings || []).includes(id);
                          if (addCardType === 'vacuum') return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                          if (addCardType === 'media') return id.startsWith('media_player.');
                          return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                        }).length === 0 && (
                          <p className="text-gray-500 italic text-sm text-center py-4">Ingen fleire {addCardTargetPage === 'header' ? 'personar' : (addCardTargetPage === 'automations' ? 'automasjonar' : (addCardTargetPage === 'settings' ? 'entitetar' : (addCardType === 'vacuum' ? 'støvsugarar' : (addCardType === 'media' ? 'spelarar' : 'lys'))))} å legge til</p>
                        )}
                    </div>
                  </div>
                )}
              </div>
              
                {addCardType !== 'weather' && selectedEntities.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
                  <button onClick={handleAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {addCardType === 'media' ? `Legg til ${selectedEntities.length} spelarar` : `Legg til ${selectedEntities.length} ${selectedEntities.length === 1 ? 'kort' : 'kort'}`}
                    </button>
                </div>
              )}
              {addCardType === 'weather' && selectedWeatherId && (
                <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
                  <button onClick={handleAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Legg til værkort
                  </button>
                </div>
              )}
              <div className="mt-4">
                <button onClick={() => setShowAddCardModal(false)} className="w-full py-3 rounded-2xl border border-[var(--glass-border)] text-[var(--text-secondary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors">OK</button>
              </div>
            </div>
          </div>
        )}

        {editingPage && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setEditingPage(null)}>
            <div className="border w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
               <button onClick={() => setEditingPage(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-8 h-8" /></button>
               <h3 className="text-2xl font-light mb-6 text-[var(--text-primary)] uppercase tracking-widest italic">Rediger side</h3>
               
               <div className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-xs uppercase font-bold text-gray-500 ml-4">Navn</label>
                   <input 
                     type="text" 
                     className="w-full px-6 py-4 text-[var(--text-primary)] rounded-2xl border bg-[var(--glass-bg)] border-[var(--glass-border)] focus:border-blue-500/50 outline-none transition-colors"
                     value={pageSettings[editingPage]?.label || pages.find(p => p.id === editingPage)?.label}
                     onChange={(e) => {
                        const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], label: e.target.value } };
                        setPageSettings(newSettings);
                        localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
                     }}
                   />
                 </div>
                 
                 <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-4">Vel ikon</label>
                  <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    <button onClick={() => {
                        const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], icon: null } };
                        setPageSettings(newSettings);
                        localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
                    }} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${!pageSettings[editingPage]?.icon ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-gray-500 hover:bg-[var(--glass-bg-hover)]'}`} title="Standard ikon"><RefreshCw className="w-5 h-5" /></button>
                    {Object.keys(ICON_MAP).map(iconName => {
                      const Icon = ICON_MAP[iconName];
                      const isSelected = pageSettings[editingPage]?.icon === iconName;
                      return (
                        <button key={iconName} onClick={() => {
                            const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], icon: iconName } };
                            setPageSettings(newSettings);
                            localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
                        }} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-gray-500 hover:bg-[var(--glass-bg-hover)]'}`} title={iconName}><Icon className="w-5 h-5" /></button>
                      );
                    })}
                  </div>
                </div>
                 
                 <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Skjul side</span>
                    <button 
                      onClick={() => {
                        const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], hidden: !pageSettings[editingPage]?.hidden } };
                        setPageSettings(newSettings);
                        localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${pageSettings[editingPage]?.hidden ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pageSettings[editingPage]?.hidden ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {showEditCardModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => { setShowEditCardModal(null); setEditCardSettingsKey(null); }}>
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
            <div className="border w-full max-w-lg rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowEditCardModal(null); setEditCardSettingsKey(null); }} className="absolute top-5 right-5 md:top-7 md:right-7 p-4 rounded-full" style={{backgroundColor: 'var(--glass-bg)'}}><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-light mb-6 text-[var(--text-primary)] text-center uppercase tracking-widest italic">Rediger kort</h3>
              
              <div className="space-y-8">
                {canEditName && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-4">Navn</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-3 text-[var(--text-primary)] rounded-2xl border bg-[var(--glass-bg)] border-[var(--glass-border)] focus:border-blue-500/50 outline-none transition-colors" 
                      defaultValue={customNames[showEditCardModal] || (entities[showEditCardModal]?.attributes?.friendly_name || '')}
                      onBlur={(e) => saveCustomName(showEditCardModal, e.target.value)}
                      placeholder="Standard navn"
                    />
                  </div>
                )}

                {canEditIcon && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-4">Vel ikon</label>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      <button onClick={() => saveCustomIcon(showEditCardModal, null)} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${!customIcons[showEditCardModal] ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-gray-500 hover:bg-[var(--glass-bg-hover)]'}`} title="Standard ikon"><RefreshCw className="w-5 h-5" /></button>
                      {Object.keys(ICON_MAP).map(iconName => {
                        const Icon = ICON_MAP[iconName];
                        return (
                          <button key={iconName} onClick={() => saveCustomIcon(showEditCardModal, iconName)} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${customIcons[showEditCardModal] === iconName ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-gray-500 hover:bg-[var(--glass-bg-hover)]'}`} title={iconName}><Icon className="w-5 h-5" /></button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isEditLight && (
                  <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Liten versjon</span>
                    <button
                      onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'size', (editSettings.size === 'small') ? 'large' : 'small')}
                      className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.size === 'small' ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.size === 'small' ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                )}

                {canEditStatus && (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Vis status</span>
                        <button 
                          onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                          className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Vis sist endra</span>
                        <button 
                          onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                          className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showCameraModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'var(--modal-backdrop)'}} onClick={() => setShowCameraModal(false)}>
            <div className="border w-full max-w-4xl rounded-[3rem] p-4 shadow-2xl relative font-sans overflow-hidden" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowCameraModal(false)} className="absolute top-6 right-6 p-4 rounded-full z-10" style={{backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'}}><X className="w-6 h-6 text-white" /></button>
              <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black relative">
                 {entities[CAMERA_PORTEN_ID] ? (
                   <img src={getEntityImageUrl(entities[CAMERA_PORTEN_ID].attributes.entity_picture)} alt="Kamera Porten" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-500">Kamera ikkje tilgjengeleg</div>
                 )}
                 <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-2xl font-bold text-white">Porten</h3>
                    <p className="text-sm text-gray-400">Direktebilde</p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeMediaModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-3xl bg-black/70 font-sans" onClick={() => setActiveMediaModal(null)}>
            <div className="w-full max-w-5xl rounded-3xl md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative max-h-[95vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-12" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)', borderWidth: '1px'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setActiveMediaModal(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-5 rounded-full transition-colors z-20 shadow-lg" style={{backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)'}}><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              
              {(() => {
                const isSonos = activeMediaModal === 'sonos';
                const allMediaIds = Object.keys(entities).filter(id => id.startsWith('media_player.'));
                const fallbackId = allMediaIds.map(id => entities[id]).find(isMediaActive)?.entity_id;
                const groupSettings = activeMediaGroupKey ? cardSettings[activeMediaGroupKey] : null;
                const embyIds = Object.keys(entities).filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'));
                const isEmbyGroup = !isSonos && activeMediaGroupKey === '__emby__';
                const groupIds = isEmbyGroup
                  ? embyIds
                  : (Array.isArray(groupSettings?.mediaIds) ? groupSettings.mediaIds : []);
                const mediaIds = isSonos ? SONOS_IDS : (groupIds.length > 0 ? groupIds : (activeMediaId ? [activeMediaId] : (fallbackId ? [fallbackId] : [])));
                const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
                
                // For Sonos viser vi alle, for andre: berre valde spelarar
                const listPlayers = mediaEntities
                  .filter((p) => (isEmbyGroup ? isMediaActive(p) : true))
                  .slice()
                  .sort((a, b) => {
                    const aActive = isSonos ? isSonosActive(a) : isMediaActive(a);
                    const bActive = isSonos ? isSonosActive(b) : isMediaActive(b);
                    if (aActive !== bActive) return aActive ? -1 : 1;
                    return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
                  });
                
                let currentMp = mediaEntities.find(e => e.entity_id === activeMediaId);
                if (!currentMp) {
                    // Fallback logic
                    const activePlayers = mediaEntities.filter(e => isSonos ? isSonosActive(e) : isMediaActive(e));
                    if (activePlayers.length > 0) currentMp = activePlayers[0];
                    else currentMp = mediaEntities[0];
                }
                
                if (!currentMp) return <div className="text-[var(--text-primary)]">Ingen mediaspelar funnen</div>;

                const mpId = currentMp.entity_id;
                const mpState = currentMp.state;
                const isLydplanke = mpId === 'media_player.sonos_lydplanke';
                const isTV = isLydplanke && (currentMp.attributes?.source === 'TV' || currentMp.attributes?.media_title === 'TV');
                const contentType = getA(mpId, 'media_content_type');
                const isChannel = contentType === 'channel' || isTV;
                const isPlaying = mpState === 'playing';
                
                let mpTitle = getA(mpId, 'media_title');
                if (isTV) mpTitle = 'TV-lyd';
                
                const sessions = getA(BIBLIOTEK_SESSIONS_ID, 'sessions', []);
                const mpFriendlyName = getA(mpId, 'friendly_name', '');
                const activeSession = Array.isArray(sessions) ? sessions.find(s => s.device_name && mpFriendlyName.toLowerCase().includes(s.device_name.toLowerCase())) : null;
                const activeUser = activeSession?.user_name;

                let mpSeries = getA(mpId, 'media_series_title');
                if (contentType === 'episode') {
                     const season = getA(mpId, 'media_season');
                     if (mpSeries && season) mpSeries = `${mpSeries} • ${season}`;
                     else if (!mpSeries && season) mpSeries = season;
                }
                if (!mpSeries) mpSeries = getA(mpId, 'media_artist') || getA(mpId, 'media_season');
        if (isTV) mpSeries = 'Stova';

                const mpApp = getA(mpId, 'app_name');
                const mpPicture = !isTV ? getEntityImageUrl(currentMp.attributes?.entity_picture) : null;
                const duration = getA(mpId, 'media_duration');
                const position = getA(mpId, 'media_position');
                const serverInfo = getServerInfo(mpId);
                const ServerIcon = serverInfo.icon;
                const isMidttunet = mpId.includes('midttunet');
                const serverLabel = isMidttunet ? 'Jellyfin' : 'Emby';
                const ServerBadgeIcon = isMidttunet ? JellyfinLogo : EmbyLogo;
                
                // Sonos spesifikke attributter
                const volume = getA(mpId, 'volume_level', 0);
                const isMuted = getA(mpId, 'is_volume_muted', false);
                const shuffle = getA(mpId, 'shuffle', false);
                const repeat = getA(mpId, 'repeat', 'off');
                const rawMembers = getA(mpId, 'group_members');
                const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];
                const canGroup = isSonos;

                return (
                  <>
                    <div className="flex-1 flex flex-col justify-center relative z-10">
                      {!isSonos && (
                        <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-gray-500 mb-4">{serverLabel}</h3>
                      )}
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border self-start mb-8 ${isSonos ? 'bg-[var(--glass-bg)] border-[var(--glass-border)]' : (serverInfo.bg + ' ' + serverInfo.border)}`}>
                        {isSonos ? <Music className="w-4 h-4 text-[var(--text-primary)]" /> : <ServerBadgeIcon className={`w-4 h-4 ${serverInfo.color}`} />}
                        <span className={`text-xs font-bold uppercase tracking-widest ${isSonos ? 'text-[var(--text-primary)]' : serverInfo.color}`}>{isSonos ? 'SONOS' : serverLabel}</span>
                      </div>

                      <div className="flex flex-col gap-6">
                        <div className={`${isSonos ? 'h-64 w-64 mx-auto' : 'aspect-video w-full'} rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-2xl bg-[var(--glass-bg)] relative group`}>
                          {mpPicture ? <img src={mpPicture} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isChannel ? <Tv className="w-20 h-20 text-gray-700" /> : (isSonos ? <Speaker className="w-20 h-20 text-gray-700" /> : <Music className="w-20 h-20 text-gray-700" />)}</div>}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                          <div className="absolute bottom-0 left-0 w-full p-8">
                             {activeUser ? (
                               <div className="flex items-center gap-2 mb-2">
                                 <p className="text-sm font-bold uppercase tracking-widest text-blue-400 truncate">{activeUser}</p>
                                 <span className="text-white/40 text-xs">•</span>
                                 <p className="text-sm font-bold uppercase tracking-widest text-gray-400 truncate">{mpApp || 'Media'}</p>
                               </div>
                             ) : (
                               <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-2">{mpApp || 'Media'}</p>
                             )}
                             <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-2 line-clamp-2">{mpTitle || 'Ukjend'}</h2>
                             <p className="text-xl text-gray-300 font-medium">{mpSeries}</p>
                          </div>
                        </div>

                        <div className="space-y-4 mt-6">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-500 tracking-widest px-1">
                            <span>{formatDuration(position)}</span>
                            <span>{formatDuration(duration)}</span>
                          </div>
                          <M3Slider variant="thin" min={0} max={duration || 100} step={1} value={position || 0} disabled={!duration} onChange={(e) => callService("media_player", "media_seek", { entity_id: mpId, seek_position: parseFloat(e.target.value) })} colorClass="bg-white" />
                          
                          {isSonos ? (
                            <div className="flex flex-col gap-4 pt-2">
                              <div className="flex items-center justify-center gap-6">
                                <button onClick={() => callService("media_player", "shuffle_set", { entity_id: mpId, shuffle: !shuffle })} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Shuffle className="w-4 h-4" /></button>
                                
                                <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipBack className="w-5 h-5 text-[var(--text-secondary)]" /></button>
                                <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-3 rounded-full transition-colors active:scale-95 shadow-lg" style={{backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)'}}>
                                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                                </button>
                                <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipForward className="w-5 h-5 text-[var(--text-secondary)]" /></button>
                                
                                <button onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService("media_player", "repeat_set", { entity_id: mpId, repeat: nextMode }); }} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-3 px-2 pt-2 border-t border-[var(--glass-border)]">
                                <button onClick={() => callService("media_player", "volume_mute", { entity_id: mpId, is_volume_muted: !isMuted })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : (volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)}
                                </button>
                                <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService("media_player", "volume_set", { entity_id: mpId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-8 pt-2">
                              <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipBack className="w-8 h-8 text-[var(--text-secondary)]" /></button>
                              <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-6 rounded-full transition-colors active:scale-95 shadow-lg" style={{backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)'}}>
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                              </button>
                              <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipForward className="w-8 h-8 text-[var(--text-secondary)]" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--glass-border)] pt-6 md:pt-24 pl-0 md:pl-12 flex flex-col gap-6 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">{isSonos ? 'Sonos Spelarar' : (isEmbyGroup ? 'Aktive spelarar' : 'Valde spelarar')}</h3>
                        {canGroup && listPlayers.length > 1 && (
                          <button 
                            onClick={() => {
                              const allIds = listPlayers.map(p => p.entity_id);
                              const unjoined = allIds.filter(id => !groupMembers.includes(id));
                              if (unjoined.length > 0) {
                                callService("media_player", "join", { entity_id: mpId, group_members: unjoined });
                              } else {
                                const others = groupMembers.filter(id => id !== mpId);
                                others.forEach(id => callService("media_player", "unjoin", { entity_id: id }));
                              }
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                          >
                            {listPlayers.every(p => groupMembers.includes(p.entity_id)) ? 'Ungrupper alle' : 'Grupper alle'}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-4">
                        {listPlayers.length === 0 && <p className="text-gray-600 italic text-sm">Ingen spelarar funnen</p>}
                        {listPlayers.map((p, idx) => {
                          const pPic = getEntityImageUrl(p.attributes?.entity_picture);
                           const isSelected = p.entity_id === mpId;
                           const isMember = groupMembers.includes(p.entity_id);
                           const isSelf = p.entity_id === mpId;
                           const isActivePlayer = isSonos ? isSonosActive(p) : isMediaActive(p);
                           const pTitle = getA(p.entity_id, 'media_title', 'Ukjend');
                           const pUser = (() => {
                             const s = Array.isArray(sessions) ? sessions.find(s => s.device_name && (p.attributes?.friendly_name || '').toLowerCase().includes(s.device_name.toLowerCase())) : null;
                             return s?.user_name || '';
                           })();

                           return (
                             <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'hover:bg-[var(--glass-bg)] border-transparent'} ${isActivePlayer ? '' : 'opacity-70'}`}>
                               <button onClick={() => setActiveMediaId(p.entity_id)} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                                 <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0 relative">
                                 {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isSonos ? <Speaker className="w-5 h-5 text-gray-600" /> : <Music className="w-5 h-5 text-gray-600" />}</div>}
                                 {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                               </div>
                               <div className="overflow-hidden">
                                 <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{(p.attributes.friendly_name || '').replace(/^(Midttunet|Bibliotek|Sonos)\s*/i, '')}</p>
                                 <p className="text-[10px] text-gray-600 truncate mt-0.5">{pTitle}</p>
                                 {pUser && <p className="text-[10px] text-gray-500 truncate">{pUser}</p>}
                               </div>
                               </button>
                               {canGroup && isSonos && !isSelf && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (isMember) {
                                       callService("media_player", "unjoin", { entity_id: p.entity_id });
                                     } else {
                                       callService("media_player", "join", { entity_id: mpId, group_members: [p.entity_id] });
                                     }
                                   }}
                                   className={`p-2.5 rounded-full transition-all ${isMember ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                                   title={isMember ? "Fjern frå gruppe" : "Legg til i gruppe"}
                                 >
                                   {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                 </button>
                               )}
                               {canGroup && isSonos && isSelf && groupMembers.length > 1 && (
                                 <div className="p-2.5 rounded-full bg-blue-500/20 text-blue-400" title="Linka">
                                   <Link className="w-4 h-4" />
                                 </div>
                               )}
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}