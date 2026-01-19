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
  Battery
} from 'lucide-react';

/** * KONSTANTAR FOR ENTITETAR */
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

// TELEFON-SENSORAR ØYVIND
const OYVIND_BAT_LEVEL = "sensor.pixel_9_pro_xl_battery_level";
const OYVIND_BAT_STATE = "sensor.pixel_9_pro_xl_battery_state";

// LEAF SPESIFIKKE IDar
const LEAF_CLIMATE = "climate.leaf_climate";
const LEAF_LOCATION = "device_tracker.leaf_location";
const LEAF_PLUGGED = "binary_sensor.leaf_plugged_in";
const LEAF_CHARGING = "binary_sensor.leaf_charging";
const LEAF_UPDATE = "button.leaf_update_data";
const LEAF_RANGE = "sensor.leaf_range_ac_off";
const LEAF_LAST_UPDATED = "sensor.leaf_last_updated";
const LEAF_INTERNAL_TEMP = "sensor.leaf_internal_temperature";

/**
 * HJELPEFUNKSJON FOR RELATIV TID
 */
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

/**
 * M3 EXPRESSIVE SLIDER
 * Handterer hopping ved å pause system-oppdateringar i 1 sekund etter interaksjon.
 */
const M3Slider = ({ min, max, step, value, onChange, colorClass = "bg-blue-500", disabled = false }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isInteracting) setInternalValue(value);
  }, [value, isInteracting]);

  const percentage = ((internalValue - min) / (max - min)) * 100;
  
  return (
    <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="absolute w-full h-5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        <div 
          className={`h-full transition-all duration-150 ease-out ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
          style={{ width: `${percentage}%` }}
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
      <div className="absolute w-1 h-8 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-transform duration-200 pointer-events-none group-active:scale-y-110" style={{ left: `calc(${percentage}% - 2px)` }} />
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

  return (
    <div className="mt-2 relative opacity-80 group-hover:opacity-100 transition-all duration-700">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="cardAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
        </defs>
        <path d={areaData} fill="url(#cardAreaGrad)" />
        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="3" fill="#3b82f6" className="animate-pulse" />
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

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 bg-white/[0.03] p-8 rounded-[2rem] border border-white/[0.05] shadow-inner font-sans">
        <div><p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase font-bold mb-1">Tidspunkt</p><p className="text-2xl font-medium text-white">{activePoint.time}</p></div>
        <div className="text-right font-sans"><p className="text-[10px] tracking-[0.3em] text-blue-400 uppercase font-bold mb-1">Pris Midttunet</p><p className="text-4xl font-light text-white italic leading-none tracking-tighter">{activePoint.val.toFixed(2)} <span className="text-sm text-gray-600 not-italic ml-1">øre</span></p></div>
      </div>
      <div className="relative h-[300px] w-full" onMouseLeave={() => setHoverIndex(null)}>
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-600 font-bold py-1 pointer-events-none"><span>{max.toFixed(0)}</span><span>{min.toFixed(0)}</span></div>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair font-sans" onMouseMove={handleMouseMove} onTouchMove={(e) => handleMouseMove(e.touches[0])}>
          <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" /><stop offset="100%" stopColor="rgba(59, 130, 246, 0)" /></linearGradient></defs>
          <path d={areaData} fill="url(#areaGrad)" /><path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {activePoint && <><line x1={activePoint.x} y1="0" x2={activePoint.x} y2={height} stroke="#3b82f6" strokeWidth="1" opacity="0.3" /><circle cx={activePoint.x} cy={activePoint.y} r="4" fill="#3b82f6" /><circle cx={activePoint.x} cy={activePoint.y} r="10" fill="#3b82f6" fillOpacity="0.1" /></>}
        </svg>
      </div>
    </div>
  );
};

const ModernDropdown = ({ label, icon: Icon, options, current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full font-sans" ref={dropdownRef}>
      <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase font-bold mb-3 ml-1 font-sans">{label}</p>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-all group">
        <div className="flex items-center gap-3 font-sans"><Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" /><span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 italic">{String(current || "Ikkje valt")}</span></div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-[110] bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-48 overflow-y-auto scrollbar-hide">
            {(options || []).map((option) => (
              <button key={option} onClick={() => { onChange(option); setIsOpen(false); }} className={`w-full text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${current === option ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>{String(option)}</button>
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cardOrder, setCardOrder] = useState(['power', 'climate', 'light_kjokken', 'light_stova', 'light_studio', 'car']);
  
  const [config, setConfig] = useState({
    url: typeof window !== 'undefined' ? localStorage.getItem('ha_url') || '' : '',
    token: typeof window !== 'undefined' ? localStorage.getItem('ha_token') || '' : ''
  });

  useEffect(() => {
    const savedOrder = localStorage.getItem('midttunet_card_order');
    if (savedOrder) { try { setCardOrder(JSON.parse(savedOrder).filter(id => id !== 'people')); } catch (e) {} }
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

  // Klima status
  const hvacAction = getA(CLIMATE_ID, "hvac_action", "idle");
  const hvacState = entities[CLIMATE_ID]?.state || "off";
  const isHeating = hvacAction === 'heating' || hvacAction === 'heat' || hvacState === 'heat';
  const isCooling = hvacAction === 'cooling' || hvacAction === 'cool' || hvacState === 'cool';

  const personStatus = (id) => {
    const isHome = entities[id]?.state === 'home';
    const statusText = getS(id);
    const name = id === OYVIND_ID ? "Øyvind" : "Tuva";
    const Icon = id === OYVIND_ID ? User : UserCheck;
    
    const batLevel = id === OYVIND_ID ? parseInt(entities[OYVIND_BAT_LEVEL]?.state) || 0 : null;
    const batState = id === OYVIND_ID ? entities[OYVIND_BAT_STATE]?.state : null;
    const isCharging = batState === 'charging' || batState === 'ac' || batState === 'wireless';
    const batLow = batLevel !== null && batLevel < 20;

    return (
      <div key={id} className={`flex items-center gap-2.5 px-3 py-1.5 bg-white/[0.01] backdrop-blur-md rounded-2xl transition-all duration-300 border border-white/[0.01] ${isHome ? 'text-blue-400' : 'text-gray-500'}`}>
        <div className={`p-1.5 rounded-xl transition-colors ${isHome ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/5 text-purple-400/20 opacity-30'}`}><Icon className="w-4 h-4 stroke-[1.8px]" /></div>
        <div className="flex flex-col font-sans">
          <div className="flex items-center gap-2 leading-none mb-0.5">
            <span className="text-[8px] tracking-[0.2em] text-gray-400 uppercase font-bold leading-tight">{name}</span>
            {id === OYVIND_ID && batLevel !== null && (
              <div className={`flex items-center gap-1 px-1 rounded-md bg-white/5 border border-white/5 ${batLow ? 'text-red-500' : 'text-gray-500'}`}>
                {isCharging ? <Zap className="w-2 h-2 fill-current" /> : <Battery className="w-2 h-2" />}
                <span className="text-[7px] font-black">{batLevel}%</span>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-widest leading-tight ${isHome ? 'text-gray-200' : 'text-gray-500/30 italic'}`}>{String(statusText)}</span>
        </div>
      </div>
    );
  };

  const renderCard = (cardId, index) => {
    const commonClass = `bg-[#0d0d0f]/60 backdrop-blur-md border ${editMode ? 'border-dashed border-blue-500/40 shadow-lg' : 'border-white/[0.04]'} p-7 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] max-h-[220px] transition-all duration-500 hover:border-white/[0.1] hover:bg-[#111113] group relative overflow-hidden font-sans`;
    const dragProps = { draggable: editMode, onDragStart: (e) => e.dataTransfer.setData('cardIndex', index), onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
        const sourceIndex = parseInt(e.dataTransfer.getData('cardIndex'));
        const newOrder = [...cardOrder];
        const movedItem = newOrder.splice(sourceIndex, 1)[0];
        newOrder.splice(index, 0, movedItem);
        setCardOrder(newOrder);
        localStorage.setItem('midttunet_card_order', JSON.stringify(newOrder));
    }};

    switch(cardId) {
      case 'power':
        return (
          <div key="power" {...dragProps} onClick={() => !editMode && setShowPowerModal(true)} className={`${commonClass} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}>
            <div className="flex justify-between items-start font-sans"><div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform duration-500"><Zap className="w-5 h-5 stroke-[1.5px]" /></div><div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05]"><span className="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-bold">Billig</span></div></div>
            <div className="mt-2"><p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">Straumpris</p><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(getS(TIBBER_ID))}</span><span className="text-gray-600 font-medium text-base ml-1">øre</span></div><SparkLine data={fullPriceData} currentIndex={currentPriceIndex} /></div>
          </div>
        );
      case 'climate':
        const curT = getA(CLIMATE_ID, "current_temperature", "--");
        const tarT = getA(CLIMATE_ID, "temperature", 21);
        const clTheme = isCooling ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : (isHeating ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-gray-400 bg-white/5 border-white/10');
        const statusLabel = isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : hvacAction === 'idle' ? 'VENTAR' : hvacState === 'off' ? 'AV' : 'KLIMA';
        return (
          <div key="climate" {...dragProps} onClick={() => !editMode && setShowClimateModal(true)} className={`${commonClass} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}>
            <div className="flex justify-between items-start"><div className={`p-3 rounded-2xl transition-all duration-500 ${clTheme}`}>{isCooling ? <Snowflake className="w-5 h-5 stroke-[1.5px]" /> : <Wind className="w-5 h-5 stroke-[1.5px]" />}</div><div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500 ${clTheme}`}><span className="text-[9px] tracking-[0.3em] uppercase font-bold">{statusLabel}</span></div></div>
            <div className="mt-2"><p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-1 font-bold opacity-60 leading-none">Varmepumpe</p><div className="flex items-center justify-between mb-3"><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(curT)}</span><span className="text-gray-600 font-medium text-base ml-0.5">°c</span></div><span className={`text-[10px] font-black uppercase tracking-widest italic opacity-70 mb-1 ${isCooling ? 'text-blue-400/60' : (isHeating ? 'text-orange-400/60' : 'text-gray-500')}`}>Mål: {String(tarT)}°</span></div><M3Slider min={16} max={30} step={0.5} value={tarT} onChange={(e) => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : (isHeating ? 'bg-orange-500' : 'bg-white/20')} /></div>
          </div>
        );
      case 'light_kjokken':
      case 'light_stova':
      case 'light_studio':
        let currentLId = cardId === 'light_kjokken' ? LIGHT_KJOKKEN : cardId === 'light_stova' ? LIGHT_STOVA : LIGHT_STUDIO;
        const isOn = entities[currentLId]?.state === "on";
        const br = getA(currentLId, "brightness") || 0;
        return (
          <div key={cardId} {...dragProps} onClick={() => !editMode && setShowLightModal(currentLId)} className={`${commonClass} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}>
            <div className="flex justify-between items-start font-sans"><button onClick={(e) => { e.stopPropagation(); callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} className={`p-3 rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-600'}`}><Lightbulb className={`w-5 h-5 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} /></button><div className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border transition-all ${isOn ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>{isOn ? 'PÅ' : 'AV'}</div></div>
            <div className="mt-2 font-sans"><p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">{String(getA(currentLId, "friendly_name"))}</p><div className="flex items-baseline gap-1 leading-none mb-3"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{isOn ? Math.round((br / 255) * 100) : "0"}</span><span className="text-gray-600 font-medium text-base ml-1">%</span></div><M3Slider min={0} max={255} step={1} value={br} disabled={!isOn} onChange={(e) => callService("light", "turn_on", { entity_id: currentLId, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" /></div>
          </div>
        );
      case 'car':
        const isHtg = getA(LEAF_CLIMATE, "hvac_action") !== 'off';
        return (
          <div key="car" {...dragProps} onClick={() => !editMode && setShowLeafModal(true)} className={`${commonClass} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isHtg ? 'bg-orange-500/[0.08] border-orange-500/30' : ''}`}>
            <div className="flex justify-between items-start font-sans"><div className={`p-3 rounded-2xl transition-all ${isHtg ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-green-500/10 text-green-400'}`}><Car className="w-5 h-5 stroke-[1.5px]" /></div><div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isHtg ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-white/[0.02] border-white/[0.05] text-gray-500'}`}><span className="text-[9px] tracking-[0.2em] font-black uppercase">{isHtg ? 'Varmar' : 'Parkert'}</span></div></div>
            <div className="flex justify-between items-end"><div><p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase mb-1 font-bold opacity-60">Nissan Leaf</p><div className="flex items-baseline gap-2 leading-none font-sans"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(getS(LEAF_ID))}%</span><span className="text-gray-600 font-medium text-base ml-1">{String(getS(LEAF_RANGE))}km</span></div></div><div className="flex items-center gap-1 bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5 font-sans"><Thermometer className="w-3 h-3 text-gray-500" /><span className="text-sm font-bold text-gray-200">{String(getS(LEAF_INTERNAL_TEMP))}°</span></div></div>
          </div>
        );
      default: return null;
    }
  };

  const reStatus = () => {
    if (entities[REFRIGERATOR_ID]?.state !== 'on') return null;
    return ( <div className="flex items-center gap-2.5 px-3 py-1.5 bg-orange-500/[0.02] backdrop-blur-md rounded-2xl border border-orange-500/[0.01] animate-pulse font-sans"><div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-400"><RefrigeratorIcon className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-[8px] text-gray-500 uppercase font-bold leading-tight">VARSAL</span><span className="text-[10px] font-medium uppercase tracking-widest text-orange-200/50 italic">Kjøleskap ope</span></div></div> );
  };

  const drStatus = (id, label) => {
    if (entities[id]?.state !== 'on') return null;
    return ( <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/[0.01] backdrop-blur-md rounded-2xl border border-white/[0.01] font-sans"><div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400"><DoorOpen className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-[8px] text-gray-500 uppercase font-bold leading-tight">{label}</span><span className="text-[10px] font-medium uppercase tracking-widest text-gray-300/50 italic">Ope</span></div></div> );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#050505] to-[#0d0d0f]" /><div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] bg-blue-900/10 blur-[150px] rounded-full" /><div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] bg-purple-900/5 blur-[150px] rounded-full" /></div>
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
          <div className="flex flex-col gap-6 font-sans">
            <div><h1 className="text-5xl md:text-6xl font-light tracking-[0.8em] uppercase text-white/60 leading-none select-none">Midttunet</h1><p className="text-gray-500 font-medium tracking-[0.6em] uppercase text-[10px] leading-none mt-4 opacity-50">{now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
            <div className="flex flex-wrap gap-2.5 mt-2 font-sans">{personStatus(OYVIND_ID)}{personStatus(TUVA_ID)}{reStatus()}{drStatus(EILEV_DOOR_ID, "Eilev si dør")}{drStatus(OLVE_DOOR_ID, "Olve si dør")}</div>
          </div>
          <div className="flex flex-col items-end gap-5 leading-none">
            <div className={`flex items-center justify-center h-8 w-8 bg-white/[0.01] border border-white/[0.04] rounded-full transition-all ${connected ? 'border-green-500/20' : 'border-red-500/20'}`}><div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} /></div>
            <div className="flex items-center gap-6 font-sans"><button onClick={() => setEditMode(!editMode)} className={`group flex items-center gap-2 text-[11px] font-bold uppercase transition-all ${editMode ? 'text-green-400' : 'text-gray-700 hover:text-white'}`}>{editMode ? 'Ferdig' : 'Rediger'}</button><button onClick={() => setShowConfigModal(true)} className="group flex items-center gap-2 text-[11px] font-bold uppercase text-gray-700 hover:text-white transition-all font-sans"><Settings className="w-4 h-4" /> System</button></div>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 font-sans">
          {cardOrder.map((id, index) => renderCard(id, index))}
        </div>
        
        {/* MODALER */}
        {showConfigModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/70 font-sans"><div className="bg-[#0d0d0f] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl relative font-sans"><button onClick={() => setShowConfigModal(false)} className="absolute top-10 right-10 p-5 bg-white/5 rounded-full"><X className="w-8 h-8" /></button><h3 className="text-3xl font-light mb-10 text-white text-center uppercase tracking-[0.3em] italic">System</h3><div className="space-y-8 font-sans"><div className="space-y-2"><label className="text-[10px] uppercase font-bold text-gray-500 ml-4">HA URL</label><input type="text" className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-white" value={config.url} onChange={(e) => setConfig({...config, url: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] uppercase font-bold text-gray-500 ml-4 font-sans">Token</label><textarea className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-white h-48" value={config.token} onChange={(e) => setConfig({...config, token: e.target.value})} /></div></div><button onClick={() => setShowConfigModal(false)} className="w-full mt-10 py-5 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-blue-400 font-black uppercase tracking-[0.3em] font-sans">Lagre og kople til</button></div></div>
        )}

        {showClimateModal && entities[CLIMATE_ID] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/70 font-sans"><div className={`bg-[#0d0d0f] border border-white/10 w-full max-w-4xl rounded-[4rem] p-12 max-h-[95vh] flex flex-col ${isHeating ? 'bg-orange-500/[0.01]' : isCooling ? 'bg-blue-500/[0.01]' : ''}`}><button onClick={() => setShowClimateModal(false)} className="absolute top-10 right-10 p-5 bg-white/5 rounded-full font-sans"><X className="w-8 h-8" /></button><div className="flex items-center gap-8 mb-12 font-sans"><div className={`p-6 rounded-[2.5rem] transition-all duration-500 ${isCooling ? 'bg-blue-500/10 text-blue-400' : (isHeating ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-gray-400')}`}>{isCooling ? <Snowflake className="w-12 h-12" /> : <Wind className="w-12 h-12" />}</div><div><h3 className="text-4xl font-light tracking-tight text-white uppercase italic leading-none font-sans font-sans">Varmepumpe</h3><div className={`mt-3 px-4 py-1.5 rounded-full border inline-block transition-all duration-500 ${isCooling ? 'bg-blue-500/10 text-blue-400' : (isHeating ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-gray-400')} border-current/20 font-sans`}><p className="text-[11px] tracking-[0.4em] uppercase font-bold italic font-sans">Status: {isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : 'VENTAR'}</p></div></div></div><div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center font-sans font-sans"><div className="lg:col-span-3 space-y-10 bg-black/20 p-10 rounded-[3.5rem] border border-white/5 shadow-inner font-sans"><div className="text-center font-sans"><div className="flex justify-between items-center mb-6 px-4 italic font-sans"><p className="text-[10px] tracking-[0.5em] text-gray-400 uppercase font-bold font-sans">Innetemperatur</p><span className={`text-[10px] tracking-[0.3em] uppercase font-bold font-sans font-sans ${isCooling ? 'text-blue-400' : (isHeating ? 'text-orange-400' : 'text-gray-400')}`}>{String(getA(CLIMATE_ID, "current_temperature"))}°C</span></div><div className="flex items-center justify-center gap-4 mb-10 font-sans font-sans"><span className={`text-9xl font-light italic text-white tracking-tighter leading-none select-none drop-shadow-2xl font-sans ${isHeating ? 'text-orange-50' : isCooling ? 'text-blue-50' : 'text-white'}`}>{String(getA(CLIMATE_ID, "temperature"))}</span><span className="text-5xl font-medium text-gray-700 leading-none mt-10 italic font-sans">°C</span></div><div className="flex items-center gap-8 px-4 font-sans font-sans"><button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) - 0.5 })} className={`p-6 bg-white/[0.03] border border-white/10 rounded-full transition-all active:scale-90 shadow-lg font-sans font-sans ${isHeating ? 'hover:bg-orange-500/20' : isCooling ? 'hover:bg-blue-500/20' : ''}`}><Minus className="w-8 h-8 stroke-[3px] font-sans" /></button><div className="flex-grow font-sans font-sans"><M3Slider min={16} max={30} step={0.5} value={getA(CLIMATE_ID, "temperature") || 21} onChange={(e) => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : (isHeating ? 'bg-orange-500' : 'bg-white/20')} /></div><button onClick={() => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: (getA(CLIMATE_ID, "temperature") || 21) + 0.5 })} className={`p-6 bg-white/[0.03] border border-white/10 rounded-full transition-all active:scale-90 shadow-lg font-sans font-sans ${isHeating ? 'hover:bg-orange-500/20' : isCooling ? 'hover:bg-blue-500/20' : ''}`}><Plus className="w-8 h-8 stroke-[3px]" /></button></div></div></div><div className="lg:col-span-2 space-y-10 py-4 italic font-sans font-sans font-sans"><ModernDropdown label="Viftestyrke" icon={Fan} options={getA(CLIMATE_ID, "fan_modes", [])} current={getA(CLIMATE_ID, "fan_mode")} onChange={(m) => callService("climate", "set_fan_mode", { entity_id: CLIMATE_ID, fan_mode: m })} /><ModernDropdown label="Sving" icon={ArrowUpDown} options={getA(CLIMATE_ID, "swing_modes", [])} current={getA(CLIMATE_ID, "swing_mode")} onChange={(m) => callService("climate", "set_swing_mode", { entity_id: CLIMATE_ID, swing_mode: m })} /></div></div></div></div>
        )}

        {showLightModal && entities[showLightModal] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500 backdrop-blur-3xl bg-black/70 font-sans"><div className="bg-[#0d0d0f] border border-white/10 w-full max-w-5xl rounded-[4rem] p-14 shadow-2xl relative max-h-[95vh] overflow-y-auto scrollbar-hide font-sans font-sans font-sans"><button onClick={() => setShowLightModal(null)} className="absolute top-10 right-10 p-5 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-20 shadow-lg font-sans font-sans"><X className="w-8 h-8 font-sans" /></button><div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-20 md:pr-24 font-sans font-sans font-sans"><div className="flex items-center gap-8 font-sans font-sans font-sans font-sans"><div className={`p-8 rounded-[2.5rem] transition-all font-sans font-sans font-sans font-sans ${entities[showLightModal].state === 'on' ? 'bg-amber-500/20 text-amber-400 shadow-lg' : 'bg-white/5 text-gray-700 font-sans'}`}><Lightbulb className="w-14 h-14 stroke-[1.2px]" /></div><div><h3 className="text-5xl font-light tracking-tight text-white uppercase italic leading-none font-sans font-sans font-sans">{String(getA(showLightModal, "friendly_name"))}</h3><p className="text-[12px] tracking-[0.4em] text-gray-500 uppercase font-bold mt-4 italic opacity-80 font-sans">Sentral Lysstyring • Midttunet</p></div></div><button onClick={() => callService("light", entities[showLightModal].state === 'on' ? "turn_off" : "turn_on", { entity_id: showLightModal })} className={`px-12 py-6 rounded-3xl text-[12px] font-bold uppercase transition-all border shadow-xl font-sans font-sans ${entities[showLightModal].state === 'on' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500 font-sans'}`}>{entities[showLightModal].state === 'on' ? 'Slå av alt' : 'Slå på alt'}</button></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-20 font-sans font-sans font-sans"><div className="space-y-16 p-10 bg-white/[0.01] rounded-[3rem] border border-white/[0.03] shadow-inner font-sans font-sans font-sans"><div><p className="text-[11px] tracking-[0.5em] text-gray-500 uppercase font-bold mb-8 font-sans font-sans font-sans">Hovudstyrke</p><div className="flex items-baseline gap-3 mb-10 leading-none font-sans font-sans font-sans font-sans font-sans font-sans"><span className="text-8xl font-light text-white italic tracking-tighter font-sans">{Math.round((getA(showLightModal, "brightness") / 255) * 100)}</span><span className="text-3xl text-gray-700 italic font-sans font-sans font-sans">%</span></div><M3Slider min={0} max={255} step={1} value={getA(showLightModal, "brightness") || 0} onChange={(e) => callService("light", "turn_on", { entity_id: showLightModal, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" /></div></div><div className="space-y-8 italic font-sans font-sans font-sans"><p className="text-[11px] tracking-[0.5em] text-gray-500 uppercase font-bold ml-4 not-italic font-sans font-sans font-sans">Lamper i rommet</p><div className="space-y-6 font-sans font-sans">{(getA(showLightModal, "entity_id", []) || []).map(cid => (<div key={cid} className="p-8 bg-white/[0.01] border border-white/[0.06] rounded-[2rem] flex flex-col gap-6 hover:bg-white/[0.03] transition-all shadow-inner font-sans font-sans font-sans"><div className="flex items-center justify-between font-sans"><span className="text-[12px] font-bold uppercase tracking-[0.2em] text-gray-300 font-sans font-sans">{cid.split('.')[1].replace('_', ' ')}</span><button onClick={() => callService("light", entities[cid]?.state === 'on' ? "turn_off" : "turn_on", { entity_id: cid })} className={`w-14 h-8 rounded-full transition-all relative font-sans ${entities[cid]?.state === 'on' ? 'bg-amber-500/40' : 'bg-white/10'}`}><div className={`absolute top-1.5 w-5 h-5 rounded-full transition-all font-sans ${entities[cid]?.state === 'on' ? 'right-1.5 bg-amber-400' : 'left-1.5 bg-gray-600'}`} /></button></div><M3Slider min={0} max={255} step={1} value={getA(cid, "brightness") || 0} disabled={entities[cid]?.state !== 'on'} onChange={(e) => callService("light", "turn_on", { entity_id: cid, brightness: parseInt(e.target.value) })} colorClass="bg-amber-400/80" /></div>))}</div></div></div></div></div>
        )}
      </div>
    </div>
  );
}