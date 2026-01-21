import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Wind, 
  Car, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
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
  Maximize,
  Minimize,
  Columns,
  Shuffle,
  Repeat,
  Repeat1,
  VolumeX,
  Volume1,
  Link,
  Unlink
} from 'lucide-react';

const CLIMATE_ID = "climate.varmepumpe";
const NORDPOOL_ID = "sensor.nordpool_kwh_no3_nok_1_10_025";
const TIBBER_ID = "sensor.tibber_strom_pris";
const LEAF_ID = "sensor.leaf_battery_level";
const OYVIND_ID = "person.oyvind";
const TUVA_ID = "person.tuva";
const LIGHT_KJOKKEN = "light.kjokken";
const LIGHT_STOVA = "light.stova";
const LIGHT_STUDIO = "light.studioet_kontorpult";
const REFRIGERATOR_ID = "binary_sensor.kjoleskap";
const EILEV_DOOR_ID = "binary_sensor.dorsensor_eilev_opening_2";
const OLVE_DOOR_ID = "binary_sensor.kleven_dor_sensor_contact";
const STUDIO_PRESENCE_ID = "binary_sensor.studioet_opphld_presence";
const PORTEN_MOTION_ID = "binary_sensor.bevegelsessensor_porten";
const GARAGE_DOOR_ID = "binary_sensor.garasjeport_contact";
const CAMERA_PORTEN_ID = "camera.porten";
const OYVIND_BAT_LEVEL = "sensor.pixel_9_pro_xl_battery_level";
const OYVIND_BAT_STATE = "sensor.pixel_9_pro_xl_battery_state";
const LEAF_CLIMATE = "climate.leaf_climate";
const COST_TODAY_ID = "sensor.tibber_forbruk_kroner";
const COST_MONTH_ID = "sensor.monthly_cost_midttunet";
const BIBLIOTEK_SESSIONS_ID = "sensor.bibliotek_sessions";
const MEDIA_PLAYER_IDS = [
  "media_player.bibliotek_sander_tv_65",
  "media_player.bibliotek_hilde_tv",
  "media_player.bibliotek_stue",
  "media_player.bibliotek_gaute_tv",
  "media_player.bibliotek_shield_tv",
  "media_player.bibliotek_google_chrome_windows_3",
  "media_player.midttunet_shield_tv_2",
  "media_player.midttunet_pixel_9_pro_xl",
  "media_player.bibliotek_oyvind_sin_tab_a9",
  "media_player.bibliotek_galaxy_tab_s7",
  "media_player.bibliotek_desktop_9ubckf5",
  "media_player.bibliotek_oneplus_nord2_5g",
  "media_player.bibliotek_chromecast",
  "media_player.bibliotek_chromecast_2",
  "media_player.bibliotek_google_tv_3",
  "media_player.bibliotek_google_chrome_windows",
  "media_player.bibliotek_google_chrome_windows_2",
  "media_player.bibliotek_telia_box",
  "media_player.bibliotek_bibliotek",
  "media_player.bibliotek_samsung_tv_vindheim",
  "media_player.bibliotek_pixel_9a",
  "media_player.bibliotek_chromecast_3",
  "media_player.bibliotek_familiestue",
  "media_player.bibliotek_get_box_asbjorn",
  "media_player.bibliotek_chromecast_4",
  "media_player.bibliotek_chromecast_5",
  "media_player.midttunet_android",
  "media_player.bibliotek_eple",
  "media_player.midttunet_pixel_9_pro_xl_2",
  "media_player.bibliotek_android_2"
];
const SONOS_IDS = [
  "media_player.sonos_play_1",
  "media_player.sonos_lydplanke",
  "media_player.sonos_kjokken",
  "media_player.sonos_platespelar"
];
const LEAF_LOCATION = "device_tracker.leaf_location";
const LEAF_PLUGGED = "binary_sensor.leaf_plugged_in";
const LEAF_CHARGING = "binary_sensor.leaf_charging";
const LEAF_UPDATE = "button.leaf_update_data";
const LEAF_RANGE = "sensor.leaf_range_ac_off";
const LEAF_LAST_UPDATED = "sensor.leaf_last_updated";
const LEAF_INTERNAL_TEMP = "sensor.leaf_internal_temperature";

const ICON_MAP = {
  Zap, Wind, Car, Settings, Flame, User, UserCheck, MapPin, TrendingUp, Clock, 
  Edit2, Check, Fan, ArrowUpDown, ArrowLeftRight, Plus, Minus, Lightbulb, 
  RefreshCw, BatteryCharging, Navigation, Thermometer, DoorOpen, Snowflake, 
  Battery, AlertCircle, TrendingDown, BarChart3, Eye, EyeOff, Play, Pause, 
  SkipBack, SkipForward, Music, Clapperboard, Server, HardDrive, Tv, Coins,
  Speaker, Sofa, Utensils, AirVent, LampDesk, LayoutGrid, Trash2, Workflow,
  Home, Bed, Bath, ShowerHead, Droplets, Sun, Moon, Cloud, CloudRain, Power,
  Wifi, Lock, Unlock, Shield, Video, Camera, Bell, Volume2, Mic, Radio, Warehouse,
  Gamepad2, Laptop, Smartphone, Watch, Coffee, Beer, Armchair, ShoppingCart,
  Calendar, Activity, Heart, Star, AlertTriangle
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

const getServerInfo = (id) => {
  if (!id || typeof id !== 'string') return { name: 'Media', icon: HardDrive, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
  if (id.includes('midttunet')) return { name: 'Jellyfin', icon: Clapperboard, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (id.includes('bibliotek')) return { name: 'Emby', icon: Server, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  return { name: 'Media', icon: HardDrive, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
};

const M3Slider = ({ min, max, step, value, onChange, colorClass = "bg-blue-500", disabled = false, variant = "default" }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isInteracting) setInternalValue(value);
  }, [value, isInteracting]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const percentage = max === min ? 0 : Math.min(100, Math.max(0, ((internalValue - min) / (max - min)) * 100));
  
  if (variant === "thin") {
    return (
      <div className={`relative w-full h-4 flex items-center group cursor-pointer ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all duration-300">
          <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
          onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className="absolute w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{ left: `calc(${percentage}% - 6px)` }} />
      </div>
    );
  }

  if (variant === "volume") {
    return (
      <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-full bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          <div className={`h-full transition-all duration-150 ease-out ${colorClass} opacity-90`} style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
          onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="absolute w-full h-5 rounded-full overflow-hidden border" style={{backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.05)'}}>
        <div 
          className={`h-full transition-all duration-150 ease-out ${colorClass}`}
          style={{ width: `${percentage}%`, boxShadow: '0_0_15px_rgba(0,0,0,0.2)' }}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
        onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
        onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
        onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
        onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
        onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
        className="absolute w-full h-10 opacity-0 cursor-pointer z-10"
      />
      <div className="absolute w-1 h-8 bg-white rounded-full transition-transform duration-200 pointer-events-none group-active:scale-y-110" style={{ left: `calc(${percentage}% - 2px)`, boxShadow: '0_0_15px_rgba(255,255,255,0.4)' }} />
    </div>
  );
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

const SparkLine = ({ data, currentIndex }) => {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 300;
  const height = 40;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height
  }));
  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
  const currentPoint = points[currentIndex] || points[0];

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return "#ef4444";
    if (t > 0.3) return "#eab308";
    return "#3b82f6";
  };

  return (
    <div className="mt-2 relative opacity-80 group-hover:opacity-100 transition-all duration-700">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="cardAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="50%" stopColor="#eab308" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" /></linearGradient>
          <linearGradient id="cardLineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
        </defs>
        <path d={areaData} fill="url(#cardAreaGrad)" />
        <path d={pathData} fill="none" stroke="url(#cardLineGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="3" fill={getDotColor(values[currentIndex])} className="animate-pulse" />
      </svg>
    </div>
  );
};

const InteractivePowerGraph = ({ data, currentIndex }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 800;
  const height = 300;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height,
    val: v,
    time: new Date(data[i].start).toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })
  }));
  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((x / width) * (values.length - 1));
    if (idx >= 0 && idx < values.length) setHoverIndex(idx);
  };
  const activePoint = (hoverIndex !== null ? points[hoverIndex] : points[currentIndex]) || points[0];

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return "#ef4444";
    if (t > 0.3) return "#eab308";
    return "#3b82f6";
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4 px-2">
        <div><p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-0.5">Tidspunkt</p><p className="text-xl font-medium text-white">{activePoint.time}</p></div>
        <div className="text-right"><p className="text-[10px] tracking-widest uppercase font-bold mb-0.5" style={{color: getDotColor(activePoint.val)}}>Pris</p><p className="text-3xl font-light text-white italic leading-none tracking-tighter">{activePoint.val.toFixed(2)} <span className="text-sm text-gray-600 not-italic ml-1">øre</span></p></div>
      </div>
      <div className="relative h-60 w-full" onMouseLeave={() => setHoverIndex(null)}>
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 font-bold py-1 pointer-events-none"><span>{max.toFixed(0)}</span><span>{min.toFixed(0)}</span></div>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onTouchMove={(e) => handleMouseMove(e.touches[0])}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="50%" stopColor="#eab308" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" /></linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
          </defs>
          <path d={areaData} fill="url(#areaGrad)" /><path d={pathData} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {activePoint && <><line x1={activePoint.x} y1="0" x2={activePoint.x} y2={height} stroke={getDotColor(activePoint.val)} strokeWidth="1" opacity="0.3" /><circle cx={activePoint.x} cy={activePoint.y} r="4" fill={getDotColor(activePoint.val)} /><circle cx={activePoint.x} cy={activePoint.y} r="10" fill={getDotColor(activePoint.val)} fillOpacity="0.1" /></>}
        </svg>
      </div>
    </div>
  );
};

const HVAC_MAP = {
  'off': 'Av',
  'heat_cool': 'Auto',
  'cool': 'Kjøling',
  'dry': 'Tørking',
  'fan_only': 'Vifte',
  'heat': 'Varme'
};

const FAN_MAP = {
  'Auto': 'Auto',
  'Low': 'Låg',
  'LowMid': 'Låg-Middels',
  'Mid': 'Middels',
  'HighMid': 'Høg-Middels',
  'High': 'Høg'
};

const SWING_MAP = {
  'Auto': 'Auto',
  'Up': 'Opp',
  'UpMid': 'Opp-Middels',
  'Mid': 'Middels',
  'DownMid': 'Ned-Middels',
  'Down': 'Ned',
  'Swing': 'Sving'
};

const ModernDropdown = ({ label, icon: Icon, options, current, onChange, map }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (val) => (map && map[val]) ? map[val] : val;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <p className="text-xs uppercase font-bold mb-3 ml-1" style={{color: 'rgba(107, 114, 128, 1)', letterSpacing: '0.2em'}}>{label}</p>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl hover:transition-all group border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-3"><Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" /><span className="text-xs font-bold uppercase tracking-widest text-gray-300 italic">{String(getLabel(current) || "Ikkje valt")}</span></div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 border rounded-2xl overflow-hidden shadow-2xl" style={{backgroundColor: '#121214', borderColor: 'rgba(255,255,255,0.1)'}}>
          <div className="max-h-48 overflow-y-auto">
            {(options || []).map((option) => (
              <button key={option} onClick={() => { onChange(option); setIsOpen(false); }} className={`w-full text-left px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${current === option ? 'text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`} style={{backgroundColor: current === option ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}}>{String(getLabel(option))}</button>
            ))}
          </div>
        </div>
      )}
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
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(null);
  const [customNames, setCustomNames] = useState({});
  const [customIcons, setCustomIcons] = useState({});
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [pagesConfig, setPagesConfig] = useState({
    home: ['power', 'energy_cost', 'climate', 'light_kjokken', 'light_stova', 'light_studio', 'car', 'media_player', 'sonos'],
    lights: ['light_kjokken', 'light_stova', 'light_studio'],
    automations: [
      { id: 'col0', title: 'Kolonne 1', cards: [] },
      { id: 'col1', title: 'Kolonne 2', cards: [] },
      { id: 'col2', title: 'Kolonne 3', cards: [] }
    ]
  });
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [hiddenCards, setHiddenCards] = useState([]);
  const [activeMediaId, setActiveMediaId] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gridColumns, setGridColumns] = useState(3);
  const [headerScale, setHeaderScale] = useState(1);
  const dragSourceRef = useRef(null);
  
  const [config, setConfig] = useState({
    url: typeof window !== 'undefined' ? localStorage.getItem('ha_url') || '' : '',
    token: typeof window !== 'undefined' ? localStorage.getItem('ha_token') || '' : ''
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem('midttunet_pages_config');
    if (savedConfig) { 
      try { 
        const parsed = JSON.parse(savedConfig);
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
        }
        setPagesConfig(parsed);
      } catch (e) {} 
    } else {
      // Migration fallback
      const savedOrder = localStorage.getItem('midttunet_card_order');
      if (savedOrder) {
        try {
           const parsed = JSON.parse(savedOrder).filter(id => id !== 'people');
           setPagesConfig(prev => ({ ...prev, home: parsed }));
        } catch (e) {}
      }
    }
    
    const savedHidden = localStorage.getItem('midttunet_hidden_cards');
    if (savedHidden) { try { setHiddenCards(JSON.parse(savedHidden)); } catch (e) {} }

    const savedNames = localStorage.getItem('midttunet_custom_names');
    if (savedNames) { try { setCustomNames(JSON.parse(savedNames)); } catch (e) {} }

    const savedIcons = localStorage.getItem('midttunet_custom_icons');
    if (savedIcons) { try { setCustomIcons(JSON.parse(savedIcons)); } catch (e) {} }

    const savedCols = localStorage.getItem('midttunet_grid_columns');
    if (savedCols) setGridColumns(parseInt(savedCols));

    const savedScale = localStorage.getItem('midttunet_header_scale');
    if (savedScale) setHeaderScale(parseFloat(savedScale));
  }, []);

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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
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
    const { createConnection, createLongLivedTokenAuth, subscribeEntities } = window.HAWS;
    async function connect() {
      try {
        const auth = createLongLivedTokenAuth(config.url, config.token);
        connection = await createConnection({ auth });
        setConn(connection);
        setConnected(true);
        localStorage.setItem('ha_url', config.url);
        localStorage.setItem('ha_token', config.token);
        subscribeEntities(connection, (updatedEntities) => setEntities(updatedEntities));
      } catch (err) { setConnected(false); }
    }
    connect();
    return () => { if (connection) connection.close(); };
  }, [libLoaded, config.url, config.token]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    if (!conn) return;
    
    const fetchHistory = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 10);
      start.setHours(0, 0, 0, 0);
      
      try {
        const res = await conn.sendMessagePromise({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          entity_ids: [COST_TODAY_ID],
          minimal_response: false,
          no_attributes: true
        });
        
        // Handle both object (keyed by entity_id) and array response formats
        let historyData = res && res[COST_TODAY_ID];
        if (!historyData && Array.isArray(res) && res.length > 0) {
            historyData = res[0];
        }

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
           
           setCostHistory(result);
        } else {
           console.warn("No history data found or unexpected format", res);
        }
      } catch (err) { console.error("History fetch error", err); }
    };
    fetchHistory();
  }, [conn]);

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
    if (state === "not_home") return "Ikkje heime";
    return state.charAt(0).toUpperCase() + state.slice(1);
  };
  const getA = (id, attr, fallback = null) => entities[id]?.attributes?.[attr] ?? fallback;
  const callService = (domain, service, data) => { if (conn) conn.sendMessagePromise({ type: "call_service", domain, service, service_data: data }); };

  const rawToday = getA(NORDPOOL_ID, "raw_today", []);
  const rawTomorrow = getA(NORDPOOL_ID, "raw_tomorrow", []);
  const tomorrowValid = getA(NORDPOOL_ID, "tomorrow_valid", false);
  const fullPriceData = useMemo(() => (tomorrowValid && rawTomorrow.length > 0) ? [...rawToday, ...rawTomorrow] : rawToday, [rawToday, rawTomorrow, tomorrowValid]);
  const currentPriceIndex = useMemo(() => {
    if (!rawToday.length) return -1;
    const nowTime = now.getTime();
    return rawToday.findIndex(d => {
      const start = new Date(d.start).getTime();
      const end = new Date(d.end).getTime();
      return nowTime >= start && nowTime < end;
    });
  }, [rawToday, now]);

  const priceStats = useMemo(() => {
    if (!fullPriceData.length) return { min: 0, max: 0, avg: 0 };
    const values = fullPriceData.map(d => d.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [fullPriceData]);

  const hvacAction = getA(CLIMATE_ID, "hvac_action", "idle");
  const hvacState = entities[CLIMATE_ID]?.state || "off";
  const isHeating = hvacAction === 'heating' || hvacAction === 'heat' || hvacState === 'heat';
  const isCooling = hvacAction === 'cooling' || hvacAction === 'cool' || hvacState === 'cool';

  const personStatus = (id) => {
    const entity = entities[id];
    const isHome = entity?.state === 'home';
    const statusText = getS(id);
    const name = id === OYVIND_ID ? "Øyvind" : "Tuva";
    const baseUrl = config.url.replace(/\/$/, '');
    const picture = entity?.attributes?.entity_picture ? `${baseUrl}${entity.attributes.entity_picture}` : null;

    return (
      <div key={id} className="group relative flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full transition-all duration-500 hover:bg-white/5" 
           style={{
             backgroundColor: 'rgba(255,255,255,0.02)', 
             boxShadow: isHome ? '0 0 20px rgba(34, 197, 94, 0.05)' : 'none'
           }}>
        
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-500" 
               style={{borderColor: isHome ? '#22c55e' : 'rgba(255,255,255,0.1)', filter: isHome ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.7)'}}>
            {picture ? (
              <img src={picture} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                {name.substring(0, 1)}
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#050505] transition-colors duration-500" 
               style={{backgroundColor: isHome ? '#22c55e' : '#52525b'}}></div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white leading-none tracking-wide">{name}</span>
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
  ];

  useEffect(() => {
    if (showAddCardModal) setAddCardTargetPage(activePage);
  }, [showAddCardModal, activePage]);

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

  const removeCard = (cardId) => {
    const newConfig = { ...pagesConfig };
    if (newConfig[activePage]) {
      if (activePage === 'automations') {
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

  // --- CARD RENDERERS ---
  
  const renderLightCard = (cardId, dragProps, getControls, cardStyle) => {
    let currentLId = cardId;
    
    if (cardId === 'light_kjokken') currentLId = LIGHT_KJOKKEN;
    else if (cardId === 'light_stova') currentLId = LIGHT_STOVA;
    else if (cardId === 'light_studio') currentLId = LIGHT_STUDIO;
    
    let DefaultIcon = Lightbulb;
    if (currentLId === LIGHT_KJOKKEN) DefaultIcon = Utensils;
    else if (currentLId === LIGHT_STOVA) DefaultIcon = Sofa;
    else if (currentLId === LIGHT_STUDIO) DefaultIcon = LampDesk;
    
    const LightIcon = customIcons[currentLId] ? ICON_MAP[customIcons[currentLId]] : DefaultIcon;
    const isOn = entities[currentLId]?.state === "on";
    const br = getA(currentLId, "brightness") || 0;
    const subEntities = getA(currentLId, "entity_id", []);
    const activeCount = subEntities.filter(id => entities[id]?.state === 'on').length;
    const name = customNames[currentLId] || getA(currentLId, "friendly_name");

    return (
      <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLightModal(currentLId); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
        {getControls(currentLId)}
        <div className="flex justify-between items-start"><button onClick={(e) => { e.stopPropagation(); callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} className="p-3 rounded-2xl transition-all duration-500" style={{backgroundColor: isOn ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.05)', color: isOn ? '#fbbf24' : '#4b5563'}}><LightIcon className="w-5 h-5" style={{strokeWidth: 1.5, fill: isOn ? 'rgba(251, 191, 36, 0.2)' : 'none'}} /></button><div className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all" style={{backgroundColor: isOn ? 'rgba(217, 119, 6, 0.1)' : 'rgba(255,255,255,0.05)', borderColor: isOn ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.1)', color: isOn ? '#f59e0b' : '#9ca3af'}}>{subEntities.length > 0 ? `${activeCount}/${subEntities.length}` : (isOn ? 'PÅ' : 'AV')}</div></div>
        <div className="mt-2">
          <div className="flex justify-between items-end mb-0.5"><div className="flex items-center gap-2"><p className="text-gray-500 text-xs uppercase font-bold opacity-60 leading-none" style={{letterSpacing: '0.05em'}}>{String(name)}</p></div></div>
          <div className="flex items-baseline gap-1 leading-none mb-3"><span className="text-4xl font-medium text-white leading-none">{isOn ? Math.round((br / 255) * 100) : "0"}</span><span className="text-gray-600 font-medium text-base ml-1">%</span></div>
          <M3Slider min={0} max={255} step={1} value={br} disabled={!isOn} onChange={(e) => callService("light", "turn_on", { entity_id: currentLId, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
        </div>
      </div>
    );
  };

  const renderAutomationCard = (cardId, dragProps, getControls, cardStyle) => {
    const isOn = entities[cardId]?.state === 'on';
    const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
    const Icon = customIcons[cardId] ? ICON_MAP[customIcons[cardId]] : Workflow;
    
    return (
      <div key={cardId} {...dragProps} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans mb-3 break-inside-avoid ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isOn ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.6)', borderColor: isOn ? 'rgba(59, 130, 246, 0.3)' : (editMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.04)')}} onClick={(e) => { if(!editMode) callService("automation", "toggle", { entity_id: cardId }); }}>
        {getControls(cardId)}
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-all ${isOn ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}><Icon className="w-4 h-4" /></div>
          <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-sm font-bold text-white leading-tight">{friendlyName}</span></div><span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">{isOn ? 'Aktiv' : 'Avslått'}</span></div>
        </div>
        <div className={`w-10 h-6 rounded-full relative transition-all ${isOn ? 'bg-blue-500' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'left-[calc(100%-20px)]' : 'left-1'}`} /></div>
      </div>
    );
  };

  const renderPowerCard = (dragProps, getControls, cardStyle) => {
    const name = customNames['power'] || 'Straumpris';
    const Icon = customIcons['power'] ? ICON_MAP[customIcons['power']] : Zap;
    return (
      <div key="power" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowPowerModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
        {getControls('power')}
        <div className="flex justify-between items-start"><div className="p-3 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform duration-500" style={{backgroundColor: 'rgba(217, 119, 6, 0.1)'}}><Icon className="w-5 h-5" style={{strokeWidth: 1.5}} /></div><div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}><span className="text-xs tracking-widest text-gray-400 uppercase font-bold">Billig</span></div></div>
        <div className="mt-2"><div className="flex items-center gap-2"><p className="text-gray-500 text-xs uppercase mb-0.5 font-bold opacity-60 leading-none" style={{letterSpacing: '0.05em'}}>{name}</p></div><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-medium text-white leading-none">{String(getS(TIBBER_ID))}</span><span className="text-gray-600 font-medium text-base ml-1">øre</span></div><SparkLine data={fullPriceData} currentIndex={currentPriceIndex} /></div>
      </div>
    );
  };

  const renderEnergyCostCard = (dragProps, getControls, cardStyle) => {
    const name = customNames['energy_cost'] || 'Kostnad';
    const Icon = customIcons['energy_cost'] ? ICON_MAP[customIcons['energy_cost']] : Coins;
    return (
      <div key="energy_cost" {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
        {getControls('energy_cost')}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50 pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <div className="p-3 rounded-2xl transition-all duration-500" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399'}}><Icon className="w-5 h-5" style={{strokeWidth: 1.5}} /></div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', color: '#9ca3af'}}><div className="flex items-center gap-2"><span className="text-xs tracking-widest font-bold uppercase">{name}</span></div></div>
        </div>
        <div className="flex flex-col gap-1 relative z-10 mt-2">
           <p className="text-gray-500 text-xs uppercase font-bold opacity-60 leading-none tracking-widest">I dag</p>
           <div className="flex items-baseline gap-1 leading-none"><span className="text-5xl font-light text-white tracking-tight">{String(getS(COST_TODAY_ID))}</span><span className="text-gray-500 font-medium text-lg">kr</span></div>
        </div>
        <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
           <div className="flex justify-between items-center"><span className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-80">Denne månaden</span><div className="flex items-baseline gap-1"><span className="text-xl font-medium text-white">{String(getS(COST_MONTH_ID))}</span><span className="text-xs text-gray-500">kr</span></div></div>
        </div>
      </div>
    );
  };

  const renderClimateCard = (dragProps, getControls, cardStyle) => {
    const curT = getA(CLIMATE_ID, "current_temperature", "--");
    const tarT = getA(CLIMATE_ID, "temperature", 21);
    const fanMode = getA(CLIMATE_ID, "fan_mode", "Auto");
    const clTheme = isCooling ? 'blue' : (isHeating ? 'orange' : 'gray');
    const fanSpeedLevel = ['Low', 'LowMid', 'Mid', 'HighMid', 'High'].indexOf(fanMode) + 1;
    const name = customNames['climate'] || 'Varmepumpe';
    const DefaultIcon = isCooling ? Snowflake : AirVent;
    const Icon = customIcons['climate'] ? ICON_MAP[customIcons['climate']] : DefaultIcon;
    
    return (
      <div key="climate" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowClimateModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
        {getControls('climate')}
        <div className="flex justify-between items-start">
          <div className="p-3 rounded-2xl transition-all duration-500" style={{backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : '#9ca3af'}}>
            <Icon className="w-5 h-5" style={{strokeWidth: 1.5}} />
          </div>
        </div>
        <div className="absolute top-7 right-7 flex flex-col items-end">
           <span className="text-xs uppercase font-bold opacity-60 mb-1" style={{letterSpacing: '0.05em', color: '#9ca3af'}}>Inne</span>
           <div className="flex items-baseline gap-0.5"><span className="text-2xl font-medium text-white leading-none">{String(curT)}</span><span className="text-sm text-gray-500 font-medium">°</span></div>
        </div>
        <div className="mt-2">
           <div className="flex items-center gap-2 mb-3"><p className="text-gray-500 text-xs uppercase font-bold opacity-60 leading-none" style={{letterSpacing: '0.05em'}}>{name}</p></div>
           <div className="flex items-stretch gap-3">
              <div className="flex items-center justify-between rounded-2xl p-1 border flex-1" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)'}}>
              <button onClick={(e) => { e.stopPropagation(); callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (tarT || 21) - 0.5 }); }} className="w-6 h-8 flex items-center justify-center rounded-xl transition-colors text-gray-400 hover:text-white active:scale-90 hover:bg-white/5"><Minus className="w-4 h-4" /></button>
              <div className="flex flex-col items-center"><span className="text-lg font-bold text-white leading-none">{String(tarT)}°</span></div>
              <button onClick={(e) => { e.stopPropagation(); callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (tarT || 21) + 0.5 }); }} className="w-6 h-8 flex items-center justify-center rounded-xl transition-colors text-gray-400 hover:text-white active:scale-90 hover:bg-white/5"><Plus className="w-4 h-4" /></button>
           </div>
              <div className="flex items-center justify-center rounded-2xl border w-20 gap-2 pr-2" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)'}}>
              <Fan className="w-4 h-4 text-gray-500" />
              {fanSpeedLevel === 0 ? (<span className="text-[10px] font-bold text-gray-500 tracking-wider">AUTO</span>) : (<div className="flex items-end gap-[2px] h-4">{[1, 2, 3, 4, 5].map((level) => (<div key={level} className={`w-1 rounded-sm transition-all duration-300 ${level <= fanSpeedLevel ? (clTheme === 'blue' ? 'bg-blue-400' : clTheme === 'orange' ? 'bg-orange-400' : 'bg-white') : 'bg-white/10'}`} style={{height: `${30 + (level * 14)}%`}} />))}</div>)}
              </div>
        </div>
      </div>
      </div>
    );
  };

  const renderCarCard = (dragProps, getControls, cardStyle) => {
    const isHtg = entities[LEAF_CLIMATE]?.state === 'heat_cool';
    const isCharging = entities[LEAF_CHARGING]?.state === 'on';
    const name = customNames['car'] || 'Nissan Leaf';
    const Icon = customIcons['car'] ? ICON_MAP[customIcons['car']] : Car;
    
    return (
      <div key="car" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLeafModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.08)' : 'rgba(15, 23, 42, 0.6)', borderColor: editMode ? 'rgba(59, 130, 246, 0.6)' : (isHtg ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.04)')}}>
        {getControls('car')}
        <div className="flex justify-between items-start font-sans">
          <div className={`p-3 rounded-2xl transition-all ${isHtg ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-green-500/10 text-green-400'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white/[0.02] border-white/[0.05] text-gray-500"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{getS(LEAF_LOCATION)}</span></div>
            {isHtg && <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse"><Flame className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">Varmar</span></div>}
          </div>
        </div>
        <div className="flex justify-between items-end"><div><div className="flex items-center gap-2 mb-1"><p className="text-gray-500 text-xs tracking-widest uppercase font-bold opacity-60">{name}</p></div><div className="flex items-baseline gap-2 leading-none font-sans"><span className={`text-4xl font-normal tracking-tighter italic leading-none ${isCharging ? 'text-green-400' : 'text-white'}`}>{String(getS(LEAF_ID))}%</span>{isCharging && <Zap className="w-5 h-5 text-green-400 animate-pulse -ml-1 mb-1" fill="currentColor" />}<span className="text-gray-600 font-medium text-base ml-1">{String(getS(LEAF_RANGE))}km</span></div></div><div className="flex items-center gap-1 bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5 font-sans"><Thermometer className="w-3 h-3 text-gray-500" /><span className="text-sm font-bold text-gray-200">{String(getS(LEAF_INTERNAL_TEMP))}°</span></div></div>
      </div>
    );
  };

  const renderCard = (cardId, index, colIndex) => {
    const isHidden = hiddenCards.includes(cardId);
    if (isHidden && !editMode) return null;
    const isDragging = draggingId === cardId;

    const handleTouchStart = (e) => {
      if (!editMode) return;
      dragSourceRef.current = { index, cardId, colIndex };
      setDraggingId(cardId);
    };

    const handleTouchMove = (e) => {
      if (!editMode || !dragSourceRef.current) return;
      if (e.cancelable) e.preventDefault();
    };

    const handleTouchEnd = (e) => {
      if (!editMode || !dragSourceRef.current) return;
      
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardElement = target?.closest('[data-card-id]');
      
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
          }
      }
      
      setDraggingId(null);
      dragSourceRef.current = null;
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
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      'data-card-id': cardId,
      'data-index': index,
      'data-col-index': colIndex
    };

    const cardStyle = {
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      borderColor: isDragging ? 'rgba(59, 130, 246, 0.8)' : (editMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.04)'),
      backdropFilter: 'blur(16px)',
      borderStyle: editMode ? 'dashed' : 'solid',
      borderWidth: editMode ? '2px' : '1px',
      opacity: isHidden && editMode ? 0.4 : 1,
      filter: isHidden && editMode ? 'grayscale(100%)' : 'none',
      transform: isDragging ? 'scale(0.98)' : 'none',
      touchAction: editMode ? 'none' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const isHidden = hiddenCards.includes(cardId);
      return ( 
      <div className="absolute top-2 right-2 z-50 flex gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowEditCardModal(editId); }}
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
        {!['power', 'energy_cost', 'climate', 'light_kjokken', 'light_stova', 'light_studio', 'car', 'media_player', 'sonos'].includes(cardId) && (
          <button 
            onClick={(e) => { e.stopPropagation(); removeCard(cardId); }}
            className="p-2 rounded-full transition-colors hover:bg-red-500/80 text-white border border-white/20 shadow-lg bg-black/60"
            title="Fjern kort"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      );
    };

    // Handle lights (both legacy IDs and entity IDs)
    if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
        return renderLightCard(cardId, dragProps, getControls, cardStyle);
    }

    if (cardId.startsWith('automation.')) {
        return renderAutomationCard(cardId, dragProps, getControls, cardStyle);
    }

    switch(cardId) {
      case 'power':
        return renderPowerCard(dragProps, getControls, cardStyle);
      case 'energy_cost':
        return renderEnergyCostCard(dragProps, getControls, cardStyle);
      case 'climate':
        return renderClimateCard(dragProps, getControls, cardStyle);
      case 'media_player':
        const mediaEntities = MEDIA_PLAYER_IDS.map(id => entities[id]).filter(Boolean);
        const activeMediaEntities = mediaEntities.filter(isMediaActive);

        if (!editMode && activeMediaEntities.length === 0) return null;

        const pool = (editMode && activeMediaEntities.length === 0) ? mediaEntities : activeMediaEntities;
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
        const mpPicture = currentMp.attributes?.entity_picture 
          ? `${config.url.replace(/\/$/, '')}${currentMp.attributes.entity_picture}`
          : null;
        
        const sessions = getA(BIBLIOTEK_SESSIONS_ID, 'sessions', []);
        const mpFriendlyName = getA(mpId, 'friendly_name', '');
        const activeSession = Array.isArray(sessions) ? sessions.find(s => s.device_name && mpFriendlyName.toLowerCase().includes(s.device_name.toLowerCase())) : null;
        const activeUser = activeSession?.user_name;
        const mpName = customNames[mpId] || getA(mpId, 'friendly_name', 'Media Player').replace(/^(Midttunet|Bibliotek)\s*/i, '');

        const cyclePlayers = (e) => {
            e.stopPropagation();
            const list = playingCount > 1 ? playingEntities : pool;
            const idx = list.findIndex(e => e.entity_id === mpId);
            const next = list[(idx + 1) % list.length];
            setActiveMediaId(next.entity_id);
        };

        const indicator = (!editMode && playingCount >= 2) ? (<button onClick={cyclePlayers} className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors backdrop-blur-md"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs font-bold">{playingCount}</span><ArrowLeftRight className="w-3 h-3 ml-0.5" /></button>) : null;

        if (isIdle) {
          return (
            <div key="media_player" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setActiveMediaModal('media'); }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
              {getControls(mpId)}
              {indicator}
              <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                <Music className="w-8 h-8 text-gray-600" />
              </div>
              <div className="text-center w-full px-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 opacity-60">Ingen media</p>
                <div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-gray-600 opacity-40 truncate">{mpName}</p></div>
              </div>
            </div>
          );
        }

        return (
          <div key="media_player" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setActiveMediaModal('media'); }} className={`p-7 rounded-3xl flex flex-col justify-end transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
            {getControls(mpId)}
            {indicator}
            
            {mpPicture ? (
              <div className="absolute inset-0 z-0">
                <img src={mpPicture} alt="" className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
            ) : (
               <div className="absolute inset-0 z-0 flex items-center justify-center bg-white/5">
                  {isChannel ? <Tv className="w-20 h-20 text-gray-700" /> : <Music className="w-20 h-20 text-gray-700" />}
               </div>
            )}
            
            <div className="relative z-10 flex flex-col">
                {activeUser ? (
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate shadow-black drop-shadow-md">{activeUser}</p>
                    <span className="text-white/40 text-[10px]">•</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 truncate shadow-black drop-shadow-md">{mpApp || 'Media'}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1 truncate shadow-black drop-shadow-md">{mpApp || 'Media'}</p>
                )}
                <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2 mb-1 shadow-black drop-shadow-lg">{mpTitle || 'Ukjend'}</h3>
                <p className="text-sm text-gray-200 truncate font-medium shadow-black drop-shadow-md">{mpSeries || ''}</p>
            </div>
          </div>
        );
      case 'sonos':
        const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
        const activeSonos = sonosEntities.filter(isSonosActive);
        const sonosCount = activeSonos.length;
        
        let currentSonos = sonosEntities.find(e => e.entity_id === activeMediaId);
        
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
        const sArtist = isTV ? 'Stue' : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
        const sPicture = !isTV && currentSonos.attributes?.entity_picture 
          ? `${config.url.replace(/\/$/, '')}${currentSonos.attributes.entity_picture}`
          : null;
        const sName = customNames[sId] || getA(sId, 'friendly_name', 'Sonos').replace(/^(Sonos)\s*/i, '');

        const cycleSonos = (e) => {
            e.stopPropagation();
            const list = sonosCount > 1 ? activeSonos : sonosEntities;
            const idx = list.findIndex(e => e.entity_id === sId);
            const next = list[(idx + 1) % list.length];
            setActiveMediaId(next.entity_id);
        };

        const sIndicator = (!editMode && sonosCount >= 2) ? (<button onClick={cycleSonos} className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors backdrop-blur-md"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs font-bold">{sonosCount}</span><ArrowLeftRight className="w-3 h-3 ml-0.5" /></button>) : null;

        if (!sIsActive) {
          return (
            <div key="sonos" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setActiveMediaModal('sonos'); }} className={`p-7 rounded-3xl flex flex-col justify-center items-center transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
              {getControls(sId)}
              {sIndicator}
              <div className="p-5 rounded-full mb-4" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}><Speaker className="w-8 h-8 text-gray-600" /></div>
              <div className="text-center w-full px-4"><p className="text-xs font-bold uppercase tracking-widest text-gray-500 opacity-60">Ingen musikk</p><div className="flex items-center justify-center gap-2 mt-1"><p className="text-xs uppercase tracking-widest text-gray-600 opacity-40 truncate">{sName}</p></div></div>
            </div>
          );
        }

        return (
          <div key="sonos" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setActiveMediaModal('sonos'); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-[200px] xl:h-[220px] ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
            {getControls(sId)}
            {sIndicator}
            {sPicture && (<div className="absolute inset-0 z-0 opacity-20 pointer-events-none"><img src={sPicture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${sIsPlaying ? 'scale-[1.7]' : 'scale-150'}`} /><div className="absolute inset-0 bg-black/20" /></div>)}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent opacity-50 animate-pulse pointer-events-none" />}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/40 via-transparent to-transparent animate-pulse pointer-events-none" />}
            {sPicture && (<div className="absolute inset-0 z-0 opacity-20 pointer-events-none"><img src={sPicture} alt="" className={`w-full h-full object-cover blur-xl scale-150 transition-transform duration-[10s] ease-in-out ${sIsPlaying ? 'scale-[1.6]' : 'scale-150'}`} /><div className="absolute inset-0 bg-black/20" /></div>)}
            {sIsPlaying && <div className="absolute inset-0 z-0 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent pointer-events-none" />}
            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-white/5 shadow-lg">{sPicture ? <img src={sPicture} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isTV ? <Tv className="w-8 h-8 text-gray-500" /> : <Speaker className="w-8 h-8 text-gray-500" />}</div>}</div>
              <div className="flex flex-col overflow-hidden pt-1"><div className="flex items-center gap-2 mb-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-400 truncate">{sName}</p></div><h3 className="text-lg font-bold text-white leading-tight truncate mb-0.5">{sTitle || 'Ukjend'}</h3><p className="text-xs text-gray-400 truncate font-medium">{sArtist || ''}</p></div>
            </div>
            <div className="relative z-10 flex items-center justify-center gap-8 mt-2"><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_previous_track", { entity_id: sId }); }} className="text-gray-400 hover:text-white transition-colors p-2 active:scale-90"><SkipBack className="w-6 h-6" /></button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_play_pause", { entity_id: sId }); }} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">{sIsPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button><button onClick={(e) => { e.stopPropagation(); callService("media_player", "media_next_track", { entity_id: sId }); }} className="text-gray-400 hover:text-white transition-colors p-2 active:scale-90"><SkipForward className="w-6 h-6" /></button></div>
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
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border animate-pulse" style={{backgroundColor: 'rgba(249, 115, 22, 0.02)', borderColor: 'rgba(249, 115, 22, 0.01)'}}><div className="p-1.5 rounded-xl text-orange-400" style={{backgroundColor: 'rgba(249, 115, 22, 0.1)'}}><AlertCircle className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">VARSAL</span><span className="text-xs font-medium uppercase tracking-widest text-orange-200/50 italic">Kjøleskap ope</span></div></div>
    );
  };

  const stStatus = () => {
    if (entities[STUDIO_PRESENCE_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-emerald-400" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)'}}><Activity className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">Studioet</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">I bruk</span></div></div>
    );
  };

  const poStatus = () => {
    if (entities[PORTEN_MOTION_ID]?.state !== 'on') return null;
    return (
      <button onClick={() => setShowCameraModal(true)} className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all hover:bg-white/5 active:scale-95" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-amber-400" style={{backgroundColor: 'rgba(251, 191, 36, 0.1)'}}><Activity className="w-4 h-4" /></div><div className="flex flex-col items-start"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">Porten</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">Bevegelse</span></div></button>
    );
  };

  const gaStatus = () => {
    if (entities[GARAGE_DOOR_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-red-400" style={{backgroundColor: 'rgba(248, 113, 113, 0.1)'}}><Warehouse className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">Garasje</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">Ope</span></div></div>
    );
  };

  const embyStatus = () => {
    const activePlayers = MEDIA_PLAYER_IDS
      .map(id => entities[id])
      .filter(Boolean)
      .filter(e => isMediaActive(e) && (e.entity_id.includes('midttunet') || e.entity_id.includes('bibliotek')));
    
    const count = activePlayers.length;
    
    if (count === 0) return null;

    return (
      <button onClick={() => setActiveMediaModal('media')} className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all hover:bg-white/5 active:scale-95" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-green-400" style={{backgroundColor: 'rgba(74, 222, 128, 0.1)'}}><Clapperboard className="w-4 h-4 animate-pulse" /></div><div className="flex flex-col items-start"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">Emby</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">{count} {count === 1 ? 'spelar' : 'spelar'}</span></div></button>
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
    const sArtist = isTV ? 'Stue' : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
    const sPicture = !isTV && currentSonos.attributes?.entity_picture ? `${config.url.replace(/\/$/, '')}${currentSonos.attributes.entity_picture}` : null;
    const isPlaying = currentSonos.state === 'playing';

    return (
      <button onClick={() => setActiveMediaModal('sonos')} className="flex items-center gap-3 px-2 py-1.5 rounded-2xl border transition-all hover:bg-white/5 active:scale-95" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 relative flex-shrink-0">{sPicture ? <img src={sPicture} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-400"><Music className="w-4 h-4" /></div>}{isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}</div><div className="flex flex-col items-start max-w-[120px]"><span className="text-xs text-white font-bold leading-tight truncate w-full">{sTitle || 'Ukjend'}</span><span className="text-[10px] font-medium uppercase tracking-widest text-gray-400 truncate w-full">{sArtist || ''}</span></div></button>
    );
  };

  const drStatus = (id, label) => {
    if (entities[id]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-blue-400" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}><DoorOpen className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">{label}</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">Ope</span></div></div>
    );
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-x-hidden" style={{backgroundColor: '#02040a'}}>
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, #0f172a, #02040a, #0a0a0c)'}} /><div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(150px)'}} /><div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)'}} /></div>
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-20 py-6 md:py-10">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in-anim {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `}</style>
        <header className="relative mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
          <div className="absolute top-0 right-0 hidden md:block">
             <h2 className="font-light tracking-[0.1em] text-white/60 leading-none select-none" style={{ fontSize: `calc(3.75rem * ${headerScale})` }}>{now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}</h2>
          </div>
          <div className="absolute top-0 right-0 md:hidden">
             <h2 className="font-light tracking-[0.1em] text-white/60 leading-none select-none" style={{ fontSize: `calc(3rem * ${headerScale})` }}>{now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}</h2>
          </div>

          <div className="flex flex-col gap-3 font-sans w-full">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="font-light uppercase leading-none select-none tracking-[0.2em] md:tracking-[0.8em]" style={{color: 'rgba(255,255,255,0.6)', fontSize: `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`}}>Midttunet</h1>
                {editMode && (<div className="flex flex-col gap-1 z-50"><button onClick={() => updateHeaderScale(Math.min(headerScale + 0.1, 2))} className="p-1 bg-white/10 rounded hover:bg-white/20"><ChevronUp className="w-4 h-4" /></button><button onClick={() => updateHeaderScale(Math.max(headerScale - 0.1, 0.5))} className="p-1 bg-white/10 rounded hover:bg-white/20"><ChevronDown className="w-4 h-4" /></button></div>)}
              </div>
              <p className="text-gray-500 font-medium uppercase text-[10px] md:text-xs leading-none mt-2 opacity-50 tracking-[0.2em] md:tracking-[0.6em]">{now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-0 font-sans">{personStatus(OYVIND_ID)}{personStatus(TUVA_ID)}{reStatus()}{stStatus()}{poStatus()}{gaStatus()}{embyStatus()}{sonosStatus()}{drStatus(EILEV_DOOR_ID, "Eilev si dør")}{drStatus(OLVE_DOOR_ID, "Olve si dør")}</div>
          </div>
        </header>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold uppercase tracking-widest text-xs whitespace-nowrap border ${activePage === page.id ? 'bg-white/10 text-white border-white/10' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'}`}
              >
                <page.icon className="w-4 h-4" />
                {page.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6 flex-shrink-0 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto justify-end">
            {editMode && <button onClick={() => setShowAddCardModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Plus className="w-4 h-4" /> Legg til</button>}
            {editMode && <button onClick={() => { const newCols = gridColumns === 3 ? 4 : 3; setGridColumns(newCols); localStorage.setItem('midttunet_grid_columns', newCols); }} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Columns className="w-4 h-4" /> {gridColumns === 3 ? '4' : '3'} Kolonner</button>}
            <button onClick={() => setEditMode(!editMode)} className={`group flex items-center gap-2 text-xs font-bold uppercase transition-all whitespace-nowrap ${editMode ? 'text-green-400' : 'text-gray-700 hover:text-white'}`}><Edit2 className="w-4 h-4" /> {editMode ? 'Ferdig' : 'Rediger'}</button>
            <button onClick={() => setShowConfigModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-gray-700 hover:text-white transition-all whitespace-nowrap"><Settings className="w-4 h-4" /> System</button>
            <button onClick={toggleFullScreen} className="group flex items-center gap-2 text-xs font-bold uppercase text-gray-700 hover:text-white transition-all whitespace-nowrap">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />} Fullskjerm</button>
            <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0`} style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: connected ? '#22c55e' : '#ef4444', boxShadow: connected ? '0_0_10px_rgba(34,197,94,0.6)' : 'none', animation: connected ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}} /></div>
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
                    <input type="text" className="bg-transparent border-b border-white/20 w-full text-xs font-bold uppercase tracking-widest text-gray-500 focus:text-white focus:border-blue-500 outline-none pb-1" value={col.title} onChange={(e) => saveColumnTitle(colIndex, e.target.value)} />
                  ) : (
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{col.title}</h3>
                  )}
                </div>
                {col.cards.map((id, index) => renderCard(id, index, colIndex))}
              </div>
            ))}
          </div>
        ) : (
          <div key={activePage} className={`grid grid-cols-1 md:grid-cols-2 ${gridColumns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8 font-sans fade-in-anim`}>
            {(pagesConfig[activePage] || []).map((id, index) => renderCard(id, index))}
          </div>
        )}
        
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}}><div className="border w-full max-w-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}}><button onClick={() => setShowConfigModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button><h3 className="text-3xl font-light mb-10 text-white text-center uppercase tracking-widest italic">System</h3><div className="space-y-8 font-sans"><div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4">HA URL</label><input type="text" className="w-full px-6 py-5 text-white rounded-2xl border" style={{backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)'}} value={config.url} onChange={(e) => setConfig({...config, url: e.target.value})} /></div><div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4">Token</label><textarea className="w-full px-6 py-5 text-white h-48 rounded-2xl border" style={{backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)'}} value={config.token} onChange={(e) => setConfig({...config, token: e.target.value})} /></div></div><button onClick={() => setShowConfigModal(false)} className="w-full mt-10 py-5 rounded-2xl text-blue-400 font-black uppercase tracking-widest" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid'}}>Lagre og kople til</button></div></div>
        )}

        {showPowerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowPowerModal(false)}>
            <div className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[80vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowPowerModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              <div className="flex items-center gap-6 mb-6">
                <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#fbbf24'}}><Zap className="w-10 h-10" /></div>
                <h3 className="text-4xl font-light tracking-tight text-white uppercase italic">Straumpris</h3>
              </div>
              <div className="flex justify-around items-center mb-8 px-4 py-4 rounded-2xl border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Snitt</span>
                    <span className="text-xl font-light text-white">{priceStats.avg.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-8 bg-white/10"></div>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Låg</span>
                    <span className="text-xl font-light text-blue-400">{priceStats.min.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-8 bg-white/10"></div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowClimateModal(false)}>
            <div className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[90vh] overflow-y-auto" style={{backgroundColor: isHeating ? 'rgba(249, 115, 22, 0.01)' : isCooling ? 'rgba(59, 130, 246, 0.01)' : '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowClimateModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <div className="flex items-center gap-8 mb-12 font-sans">
                <div className="p-6 rounded-3xl transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>
                  {isCooling ? <Snowflake className="w-12 h-12" /> : <AirVent className="w-12 h-12" />}
                  
                </div>
                <div>
                  <h3 className="text-4xl font-light tracking-tight text-white uppercase italic leading-none">Varmepumpe</h3>
                  <div className="mt-3 px-4 py-1.5 rounded-full border inline-block transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', borderColor: isCooling ? 'rgba(59, 130, 246, 0.2)' : isHeating ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.1)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>
                    <p className="text-xs uppercase font-bold italic tracking-widest">Status: {isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : 'VENTAR'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
                <div className="lg:col-span-3 space-y-10 p-6 md:p-10 rounded-3xl border shadow-inner" style={{backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)'}}>
                  <div className="text-center font-sans">
                    <div className="flex justify-between items-center mb-6 px-4 italic">
                      <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.5em'}}>Innetemperatur</p>
                      <span className="text-xs uppercase font-bold" style={{letterSpacing: '0.3em', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>{String(getA(CLIMATE_ID, "current_temperature"))}°C</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-10">
                      <span className="text-6xl md:text-9xl font-light italic text-white tracking-tighter leading-none select-none" style={{textShadow: '0 10px 25px rgba(0,0,0,0.8)', color: isHeating ? '#fef2f2' : isCooling ? '#f0f9ff' : '#ffffff'}}>
                        {String(getA(CLIMATE_ID, "temperature"))}
                      </span>
                      <span className="text-5xl font-medium leading-none mt-10 italic text-gray-700">°C</span>
                    </div>
                    <div className="flex items-center gap-8 px-4">
                      <button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) - 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)'}}>
                        <Minus className="w-8 h-8" style={{strokeWidth: 3}} />
                      </button>
                      <div className="flex-grow font-sans">
                        <M3Slider min={16} max={30} step={0.5} value={getA(CLIMATE_ID, "temperature") || 21} onChange={(e) => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : isHeating ? 'bg-orange-500' : 'bg-white/20'} />
                      </div>
                      <button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) + 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)'}}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowLightModal(null)}>
            <div className="border w-full max-w-xl rounded-3xl md:rounded-[2.5rem] p-6 font-sans relative max-h-[80vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl" style={{backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24'}}>
                    {(() => {
                      let Icon = Lightbulb;
                      if (showLightModal === LIGHT_KJOKKEN) Icon = Utensils;
                      if (showLightModal === LIGHT_STOVA) Icon = Sofa;
                      if (showLightModal === LIGHT_STUDIO) Icon = LampDesk;
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-light tracking-tight text-white uppercase italic leading-none">{String(getA(showLightModal, "friendly_name", "Lys"))}</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1.5 opacity-60">Lysstyring</p>
                  </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => callService("light", "toggle", { entity_id: showLightModal })} className="w-12 h-12 rounded-full flex items-center justify-center transition-all border" style={{backgroundColor: entities[showLightModal]?.state === 'on' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: entities[showLightModal]?.state === 'on' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(255,255,255,0.1)', color: entities[showLightModal]?.state === 'on' ? '#fbbf24' : '#9ca3af'}}>
                      <Zap className="w-5 h-5" fill={entities[showLightModal]?.state === 'on' ? "currentColor" : "none"} />
                   </button>
                   <button onClick={() => setShowLightModal(null)} className="w-12 h-12 rounded-full flex items-center justify-center transition-all border hover:bg-white/10" style={{backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af'}}><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>Hovudstyrke</p>
                    <p className="text-sm font-bold text-gray-300">{entities[showLightModal]?.state === 'on' ? Math.round(((getA(showLightModal, "brightness") || 0) / 255) * 100) : 0}%</p>
                  </div>
                  <M3Slider min={0} max={255} step={1} value={getA(showLightModal, "brightness") || 0} disabled={entities[showLightModal]?.state !== 'on'} onChange={(e) => callService("light", "turn_on", { entity_id: showLightModal, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
                </div>

                {getA(showLightModal, "entity_id", []).length > 0 && (
                  <div className="space-y-4 pt-6 border-t" style={{borderColor: 'rgba(255,255,255,0.1)'}}>
                    <p className="text-xs text-gray-400 uppercase font-bold ml-1 mb-2" style={{letterSpacing: '0.2em'}}>Lamper i rommet</p>
                    <div className="grid grid-cols-1 gap-3">
                      {getA(showLightModal, "entity_id", []).map(cid => (
                        <div key={cid} className="p-4 rounded-2xl border flex items-center gap-4 transition-all" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-300 w-1/3 truncate">{entities[cid]?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ')}</span>
                          <div className="flex-grow">
                            <M3Slider min={0} max={255} step={1} value={entities[cid]?.attributes?.brightness || 0} disabled={entities[cid]?.state !== 'on'} onChange={(e) => callService("light", "turn_on", { entity_id: cid, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
                          </div>
                          <button onClick={() => callService("light", "toggle", { entity_id: cid })} className="w-10 h-6 rounded-full relative transition-all flex-shrink-0" style={{backgroundColor: entities[cid]?.state === 'on' ? 'rgba(217, 119, 6, 0.4)' : 'rgba(255,255,255,0.1)'}}>
                            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{left: entities[cid]?.state === 'on' ? 'calc(100% - 4px - 16px)' : '4px', backgroundColor: entities[cid]?.state === 'on' ? '#fbbf24' : '#9ca3af'}} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showLeafModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowLeafModal(false)}>
            <div className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[85vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                <div className="flex items-center gap-6">
                  <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e'}}><Car className="w-10 h-10" /></div>
                  <div>
                    <h3 className="text-4xl font-light tracking-tight text-white uppercase italic">Nissan Leaf</h3>
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
                    style={{backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                  >
                    <RefreshCw className="w-4 h-4" /> Oppdater
                  </button>
                  <button onClick={() => setShowLeafModal(false)} className="p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.05)'}}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>Batteri</p>
                    {entities[LEAF_CHARGING]?.state === 'on' && <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-white">{String(getS(LEAF_ID))}</span><span className="text-gray-500 font-medium">%</span></div>
                  <p className="text-xs text-gray-500 mt-2 font-medium opacity-60">{entities[LEAF_PLUGGED]?.state === 'on' ? 'Plugga i' : 'Ikkje plugga i'}</p>
                </div>
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.05)'}}>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>Rekkevidde</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-white">{String(getS(LEAF_RANGE))}</span><span className="text-gray-500 font-medium">km</span></div>
                </div>
                <div className="p-8 rounded-3xl border" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.05)'}}>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>Temp inne</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-light italic text-white">{String(getS(LEAF_INTERNAL_TEMP))}</span><span className="text-gray-500 font-medium">°C</span></div>
                </div>
                <div className="p-6 rounded-3xl border flex flex-col justify-between" 
                     style={{backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(0,0,0,0.3)', borderColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255,255,255,0.05)'}}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs uppercase font-bold" style={{letterSpacing: '0.2em', color: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? '#fb923c' : '#9ca3af'}}>Klima</p>
                      <p className="text-2xl font-light italic text-white mt-1">{entities[LEAF_CLIMATE]?.state === 'heat_cool' ? 'PÅ' : 'AV'}</p>
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

        {showAddCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowAddCardModal(false)}>
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
            <div className="border w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAddCardModal(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              <h3 className="text-3xl font-light mb-8 text-white text-center uppercase tracking-widest italic">Legg til kort</h3>
              
              <div className="mb-8">
                <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">Legg til på side</p>
                <div className="flex gap-2">
                  {pages.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setAddCardTargetPage(p.id)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${addCardTargetPage === p.id ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{addCardTargetPage === 'automations' ? 'Tilgjengelege automasjonar' : 'Tilgjengelege lys'}</p>
                  <div className="space-y-3">
                    {Object.keys(entities)
                      .filter(id => {
                        if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                        return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                      })
                      .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                      .map(id => (
                        <button key={id} onClick={() => { const newConfig = { ...pagesConfig }; if(addCardTargetPage === 'automations') newConfig.automations[0].cards.push(id); else newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), id]; setPagesConfig(newConfig); localStorage.setItem('midttunet_pages_config', JSON.stringify(newConfig)); setShowAddCardModal(false); }} className="w-full text-left p-4 rounded-2xl border transition-all hover:bg-white/5 flex items-center justify-between group" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                          <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{entities[id].attributes?.friendly_name || id}</span>
                          <div className="p-2 rounded-full bg-white/5 group-hover:bg-green-500/20 transition-colors">
                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-green-400" />
                          </div>
                        </button>
                      ))}
                      {Object.keys(entities).filter(id => {
                        if (addCardTargetPage === 'automations') return id.startsWith('automation.') && !pagesConfig.automations.some(c => c.cards.includes(id));
                        return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
                      }).length === 0 && (
                        <p className="text-gray-500 italic text-sm text-center py-4">Ingen fleire {addCardTargetPage === 'automations' ? 'automasjonar' : 'lys'} å legge til</p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditCardModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowEditCardModal(null)}>
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
            <div className="border w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowEditCardModal(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              <h3 className="text-3xl font-light mb-8 text-white text-center uppercase tracking-widest italic">Rediger kort</h3>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-4">Navn</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 text-white rounded-2xl border bg-black/40 border-white/10 focus:border-blue-500/50 outline-none transition-colors" 
                    defaultValue={customNames[showEditCardModal] || (entities[showEditCardModal]?.attributes?.friendly_name || '')}
                    onBlur={(e) => saveCustomName(showEditCardModal, e.target.value)}
                    placeholder="Standard navn"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-4">Vel ikon</label>
                  <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    <button onClick={() => saveCustomIcon(showEditCardModal, null)} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${!customIcons[showEditCardModal] ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`} title="Standard ikon"><RefreshCw className="w-5 h-5" /></button>
                    {Object.keys(ICON_MAP).map(iconName => {
                      const Icon = ICON_MAP[iconName];
                      return (
                        <button key={iconName} onClick={() => saveCustomIcon(showEditCardModal, iconName)} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${customIcons[showEditCardModal] === iconName ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`} title={iconName}><Icon className="w-5 h-5" /></button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCameraModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowCameraModal(false)}>
            <div className="border w-full max-w-4xl rounded-[3rem] p-4 shadow-2xl relative font-sans overflow-hidden" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowCameraModal(false)} className="absolute top-6 right-6 p-4 rounded-full z-10" style={{backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'}}><X className="w-6 h-6 text-white" /></button>
              <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black relative">
                 {entities[CAMERA_PORTEN_ID] ? (
                   <img src={`${config.url.replace(/\/$/, '')}${entities[CAMERA_PORTEN_ID].attributes.entity_picture}`} alt="Kamera Porten" className="w-full h-full object-cover" />
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
            <div className="bg-[#0d0d0f] border border-white/10 w-full max-w-5xl rounded-3xl md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative max-h-[95vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-12" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setActiveMediaModal(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-5 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-20 shadow-lg"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              
              {(() => {
                const isSonos = activeMediaModal === 'sonos';
                const mediaEntities = (isSonos ? SONOS_IDS : MEDIA_PLAYER_IDS).map(id => entities[id]).filter(Boolean);
                
                // For Sonos viser vi alle, for andre kun aktive
                const listPlayers = isSonos ? mediaEntities : mediaEntities.filter(isMediaActive);
                
                let currentMp = mediaEntities.find(e => e.entity_id === activeMediaId);
                if (!currentMp) {
                    // Fallback logic
                    const activePlayers = mediaEntities.filter(e => isSonos ? isSonosActive(e) : isMediaActive(e));
                    if (activePlayers.length > 0) currentMp = activePlayers[0];
                    else currentMp = mediaEntities[0];
                }
                
                if (!currentMp) return <div className="text-white">Ingen mediaspelar funnen</div>;

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
                if (isTV) mpSeries = 'Stue';

                const mpApp = getA(mpId, 'app_name');
                const mpPicture = !isTV && currentMp.attributes?.entity_picture ? `${config.url.replace(/\/$/, '')}${currentMp.attributes.entity_picture}` : null;
                const duration = getA(mpId, 'media_duration');
                const position = getA(mpId, 'media_position');
                const serverInfo = getServerInfo(mpId);
                const ServerIcon = serverInfo.icon;
                
                // Sonos spesifikke attributter
                const volume = getA(mpId, 'volume_level', 0);
                const isMuted = getA(mpId, 'is_volume_muted', false);
                const shuffle = getA(mpId, 'shuffle', false);
                const repeat = getA(mpId, 'repeat', 'off');
                const rawMembers = getA(mpId, 'group_members');
                const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];

                return (
                  <>
                    <div className="flex-1 flex flex-col justify-center relative z-10">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border self-start mb-8 ${isSonos ? 'bg-white/5 border-white/10' : (serverInfo.bg + ' ' + serverInfo.border)}`}>
                        {isSonos ? <Music className="w-4 h-4 text-white" /> : <ServerIcon className={`w-4 h-4 ${serverInfo.color}`} />}
                        <span className={`text-xs font-bold uppercase tracking-widest ${isSonos ? 'text-white' : serverInfo.color}`}>{isSonos ? 'SONOS' : serverInfo.name}</span>
                      </div>

                      <div className="flex flex-col gap-6">
                        <div className={`${isSonos ? 'h-64 w-64 mx-auto' : 'aspect-video w-full'} rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 relative group`}>
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
                                <button onClick={() => callService("media_player", "shuffle_set", { entity_id: mpId, shuffle: !shuffle })} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}><Shuffle className="w-4 h-4" /></button>
                                
                                <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><SkipBack className="w-5 h-5 text-gray-300" /></button>
                                <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-3 bg-white text-black hover:bg-gray-200 rounded-full transition-colors active:scale-95 shadow-lg shadow-white/10">
                                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                                </button>
                                <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"><SkipForward className="w-5 h-5 text-gray-300" /></button>
                                
                                <button onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService("media_player", "repeat_set", { entity_id: mpId, repeat: nextMode }); }} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}>
                                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-3 px-2 pt-2 border-t border-white/5">
                                <button onClick={() => callService("media_player", "volume_mute", { entity_id: mpId, is_volume_muted: !isMuted })} className="text-gray-400 hover:text-white">
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : (volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)}
                                </button>
                                <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService("media_player", "volume_set", { entity_id: mpId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-8 pt-2">
                              <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-4 hover:bg-white/10 rounded-full transition-colors active:scale-95"><SkipBack className="w-8 h-8 text-gray-300" /></button>
                              <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-6 bg-white text-black hover:bg-gray-200 rounded-full transition-colors active:scale-95 shadow-lg shadow-white/10">
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                              </button>
                              <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-4 hover:bg-white/10 rounded-full transition-colors active:scale-95"><SkipForward className="w-8 h-8 text-gray-300" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-24 pl-0 md:pl-12 flex flex-col gap-6 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">{isSonos ? 'Sonos Spelarar' : 'Aktive spelarar'}</h3>
                        {isSonos && listPlayers.length > 1 && (
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
                           const pPic = p.attributes?.entity_picture ? `${config.url.replace(/\/$/, '')}${p.attributes.entity_picture}` : null;
                           const isSelected = p.entity_id === mpId;
                           const isMember = groupMembers.includes(p.entity_id);
                           const isSelf = p.entity_id === mpId;

                           return (
                             <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 border-transparent'}`}>
                               <button onClick={() => setActiveMediaId(p.entity_id)} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                                 <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative">
                                 {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isSonos ? <Speaker className="w-5 h-5 text-gray-600" /> : <Music className="w-5 h-5 text-gray-600" />}</div>}
                                 {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                               </div>
                               <div className="overflow-hidden">
                                 <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{(p.attributes.friendly_name || '').replace(/^(Midttunet|Bibliotek|Sonos)\s*/i, '')}</p>
                                 <p className="text-[10px] text-gray-600 truncate mt-0.5">{getA(p.entity_id, 'media_title', 'Ukjend')}</p>
                               </div>
                               </button>
                               {isSonos && !isSelf && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (isMember) {
                                       callService("media_player", "unjoin", { entity_id: p.entity_id });
                                     } else {
                                       callService("media_player", "join", { entity_id: mpId, group_members: [p.entity_id] });
                                     }
                                   }}
                                   className={`p-2.5 rounded-full transition-all ${isMember ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                                   title={isMember ? "Fjern frå gruppe" : "Legg til i gruppe"}
                                 >
                                   {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                 </button>
                               )}
                               {isSonos && isSelf && groupMembers.length > 1 && (
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
         