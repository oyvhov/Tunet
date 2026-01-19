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
  BarChart3
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
const OYVIND_BAT_LEVEL = "sensor.pixel_9_pro_xl_battery_level";
const OYVIND_BAT_STATE = "sensor.pixel_9_pro_xl_battery_state";
const LEAF_CLIMATE = "climate.leaf_climate";
const LEAF_LOCATION = "device_tracker.leaf_location";
const LEAF_PLUGGED = "binary_sensor.leaf_plugged_in";
const LEAF_CHARGING = "binary_sensor.leaf_charging";
const LEAF_UPDATE = "button.leaf_update_data";
const LEAF_RANGE = "sensor.leaf_range_ac_off";
const LEAF_LAST_UPDATED = "sensor.leaf_last_updated";
const LEAF_INTERNAL_TEMP = "sensor.leaf_internal_temperature";

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
      <div className="flex justify-between items-center mb-6 p-8 rounded-3xl border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)'}}>
        <div><p className="text-xs tracking-widest text-gray-500 uppercase font-bold mb-1">Tidspunkt</p><p className="text-2xl font-medium text-white">{activePoint.time}</p></div>
        <div className="text-right"><p className="text-xs tracking-widest uppercase font-bold mb-1" style={{color: getDotColor(activePoint.val)}}>Pris Midttunet</p><p className="text-4xl font-light text-white italic leading-none tracking-tighter">{activePoint.val.toFixed(2)} <span className="text-sm text-gray-600 not-italic ml-1">øre</span></p></div>
      </div>
      <div className="relative h-80 w-full" onMouseLeave={() => setHoverIndex(null)}>
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

const ModernDropdown = ({ label, icon: Icon, options, current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <p className="text-xs uppercase font-bold mb-3 ml-1" style={{color: 'rgba(107, 114, 128, 1)', letterSpacing: '0.2em'}}>{label}</p>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl hover:transition-all group border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-3"><Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" /><span className="text-xs font-bold uppercase tracking-widest text-gray-300 italic">{String(current || "Ikkje valt")}</span></div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 border rounded-2xl overflow-hidden shadow-2xl" style={{backgroundColor: '#121214', borderColor: 'rgba(255,255,255,0.1)'}}>
          <div className="max-h-48 overflow-y-auto">
            {(options || []).map((option) => (
              <button key={option} onClick={() => { onChange(option); setIsOpen(false); }} className={`w-full text-left px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${current === option ? 'text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`} style={{backgroundColor: current === option ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}}>{String(option)}</button>
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
    const isHome = entities[id]?.state === 'home';
    const statusText = getS(id);
    const name = id === OYVIND_ID ? "Øyvind" : "Tuva";
    const Icon = id === OYVIND_ID ? User : UserCheck;
    
    const batLevel = id === OYVIND_ID ? parseInt(entities[OYVIND_BAT_LEVEL]?.state) || 0 : null;
    const batState = id === OYVIND_ID ? entities[OYVIND_BAT_STATE]?.state : null;
    const isCharging = batState === 'charging' || batState === 'ac' || batState === 'wireless';
    const batLow = batLevel !== null && batLevel < 20;

    return (
      <div key={id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all duration-300 border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)', color: isHome ? '#60a5fa' : '#9ca3af'}}>
        <div className="p-1.5 rounded-xl transition-colors" style={{backgroundColor: isHome ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.05)', color: isHome ? '#60a5fa' : 'rgba(192, 132, 250, 0.2)'}}><Icon className="w-4 h-4" style={{strokeWidth: 1.8}} /></div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 leading-none mb-0.5">
            <span className="text-xs uppercase font-bold text-gray-400 leading-tight" style={{letterSpacing: '0.2em'}}>{name}</span>
            {id === OYVIND_ID && batLevel !== null && (
              <div className={`flex items-center gap-1 px-1 rounded-md border ${batLow ? 'text-red-500' : 'text-gray-500'}`} style={{backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)'}}>
                {isCharging ? <Zap className="w-2 h-2 fill-current" /> : <Battery className="w-2 h-2" />}
                <span className="text-xs font-black">{batLevel}%</span>
              </div>
            )}
          </div>
          <span className="text-xs font-medium uppercase tracking-widest leading-tight" style={{color: isHome ? '#e5e7eb' : 'rgba(107, 114, 128, 0.3)'}}>{String(statusText)}</span>
        </div>
      </div>
    );
  };

  const renderCard = (cardId, index) => {
    const dragProps = { draggable: editMode, onDragStart: (e) => e.dataTransfer.setData('cardIndex', index), onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
        const sourceIndex = parseInt(e.dataTransfer.getData('cardIndex'));
        const newOrder = [...cardOrder];
        const movedItem = newOrder.splice(sourceIndex, 1)[0];
        newOrder.splice(index, 0, movedItem);
        setCardOrder(newOrder);
        localStorage.setItem('midttunet_card_order', JSON.stringify(newOrder));
    }};

    const cardStyle = {
      backgroundColor: 'rgba(13, 13, 15, 0.6)',
      borderColor: editMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(16px)',
      minHeight: '220px',
      maxHeight: '220px'
    };

    switch(cardId) {
      case 'power':
        return (
          <div key="power" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowPowerModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
            <div className="flex justify-between items-start"><div className="p-3 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform duration-500" style={{backgroundColor: 'rgba(217, 119, 6, 0.1)'}}><Zap className="w-5 h-5" style={{strokeWidth: 1.5}} /></div><div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}><span className="text-xs tracking-widest text-gray-400 uppercase font-bold">Billig</span></div></div>
            <div className="mt-2"><p className="text-gray-500 text-xs uppercase mb-0.5 font-bold opacity-60 leading-none" style={{letterSpacing: '0.2em'}}>Straumpris</p><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(getS(TIBBER_ID))}</span><span className="text-gray-600 font-medium text-base ml-1">øre</span></div><SparkLine data={fullPriceData} currentIndex={currentPriceIndex} /></div>
          </div>
        );
      case 'climate':
        const curT = getA(CLIMATE_ID, "current_temperature", "--");
        const tarT = getA(CLIMATE_ID, "temperature", 21);
        const clTheme = isCooling ? 'blue' : (isHeating ? 'orange' : 'gray');
        const statusLabel = isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : hvacAction === 'idle' ? 'VENTAR' : hvacState === 'off' ? 'AV' : 'KLIMA';
        return (
          <div key="climate" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowClimateModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl transition-all duration-500" style={{backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : '#9ca3af'}}>
                {isCooling ? <Snowflake className="w-5 h-5" style={{strokeWidth: 1.5}} /> : <Wind className="w-5 h-5" style={{strokeWidth: 1.5}} />}
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500" style={{backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', borderColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.1)', color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : '#9ca3af'}}>
                <span className="text-xs uppercase font-bold" style={{letterSpacing: '0.3em'}}>{statusLabel}</span>
              </div>
            </div>
            <div className="mt-2"><p className="text-gray-500 text-xs uppercase mb-1 font-bold opacity-60 leading-none" style={{letterSpacing: '0.2em'}}>Varmepumpe</p><div className="flex items-center justify-between mb-3"><div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(curT)}</span><span className="text-gray-600 font-medium text-base ml-0.5">°C</span></div><span className="text-xs font-black uppercase tracking-widest italic opacity-70 mb-1" style={{color: isCooling ? 'rgba(96, 165, 250, 0.6)' : isHeating ? 'rgba(251, 146, 60, 0.6)' : '#9ca3af'}}>Mål: {String(tarT)}°</span></div><M3Slider min={16} max={30} step={0.5} value={tarT} onChange={(e) => callService("climate", "set_temperature", { entity_id: CLIMATE_ID, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : (isHeating ? 'bg-orange-500' : 'bg-white/20')} /></div>
          </div>
        );
      case 'light_kjokken':
      case 'light_stova':
      case 'light_studio':
        let currentLId = cardId === 'light_kjokken' ? LIGHT_KJOKKEN : cardId === 'light_stova' ? LIGHT_STOVA : LIGHT_STUDIO;
        const isOn = entities[currentLId]?.state === "on";
        const br = getA(currentLId, "brightness") || 0;
        const subEntities = getA(currentLId, "entity_id", []);
        const activeCount = subEntities.filter(id => entities[id]?.state === 'on').length;

        return (
          <div key={cardId} {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLightModal(currentLId); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
            <div className="flex justify-between items-start"><button onClick={(e) => { e.stopPropagation(); callService("light", isOn ? "turn_off" : "turn_on", { entity_id: currentLId }); }} className="p-3 rounded-2xl transition-all duration-500" style={{backgroundColor: isOn ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.05)', color: isOn ? '#fbbf24' : '#4b5563'}}><Lightbulb className="w-5 h-5" style={{strokeWidth: 1.5, fill: isOn ? 'rgba(251, 191, 36, 0.2)' : 'none'}} /></button><div className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all" style={{backgroundColor: isOn ? 'rgba(217, 119, 6, 0.1)' : 'rgba(255,255,255,0.05)', borderColor: isOn ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.1)', color: isOn ? '#f59e0b' : '#9ca3af'}}>{subEntities.length > 0 ? `${activeCount}/${subEntities.length}` : (isOn ? 'PÅ' : 'AV')}</div></div>
            <div className="mt-2">
              <div className="flex justify-between items-end mb-0.5"><p className="text-gray-500 text-xs uppercase font-bold opacity-60 leading-none" style={{letterSpacing: '0.2em'}}>{String(getA(currentLId, "friendly_name"))}</p></div>
              <div className="flex items-baseline gap-1 leading-none mb-3"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{isOn ? Math.round((br / 255) * 100) : "0"}</span><span className="text-gray-600 font-medium text-base ml-1">%</span></div>
              <M3Slider min={0} max={255} step={1} value={br} disabled={!isOn} onChange={(e) => callService("light", "turn_on", { entity_id: currentLId, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
            </div>
          </div>
        );
      case 'car':
        const isHtg = getA(LEAF_CLIMATE, "hvac_action") !== 'off';
        return (
          <div key="car" {...dragProps} onClick={(e) => { e.stopPropagation(); if (!editMode) setShowLeafModal(true); }} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.08)' : 'rgba(13, 13, 15, 0.6)', borderColor: isHtg ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.04)'}}>
            <div className="flex justify-between items-start"><div className="p-3 rounded-2xl transition-all" style={{backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.2)' : 'rgba(34, 197, 94, 0.1)', color: isHtg ? '#fb923c' : '#22c55e', animation: isHtg ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}}><Car className="w-5 h-5" style={{strokeWidth: 1.5}} /></div><div className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all" style={{backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.02)', borderColor: isHtg ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)', color: isHtg ? '#fb923c' : '#9ca3af'}}><span className="text-xs tracking-widest font-black uppercase">{isHtg ? 'Varmar' : 'Parkert'}</span></div></div>
            <div className="flex justify-between items-end"><div><p className="text-gray-500 text-xs uppercase mb-1 font-bold opacity-60" style={{letterSpacing: '0.3em'}}>Nissan Leaf</p><div className="flex items-baseline gap-2 leading-none"><span className="text-4xl font-normal tracking-tighter text-white italic leading-none">{String(getS(LEAF_ID))}%</span><span className="text-gray-600 font-medium text-base ml-1">{String(getS(LEAF_RANGE))}km</span></div></div><div className="flex items-center gap-1 px-3 py-1.5 rounded-xl border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}><Thermometer className="w-3 h-3 text-gray-500" /><span className="text-sm font-bold text-gray-200">{String(getS(LEAF_INTERNAL_TEMP))}°</span></div></div>
          </div>
        );
      default: return null;
    }
  };

  const reStatus = () => {
    if (entities[REFRIGERATOR_ID]?.state !== 'on') return null;
    return <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border animate-pulse" style={{backgroundColor: 'rgba(249, 115, 22, 0.02)', borderColor: 'rgba(249, 115, 22, 0.01)'}}><div className="p-1.5 rounded-xl text-orange-400" style={{backgroundColor: 'rgba(249, 115, 22, 0.1)'}}><AlertCircle className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">VARSAL</span><span className="text-xs font-medium uppercase tracking-widest text-orange-200/50 italic">Kjøleskap ope</span></div></div>;
  };

  const drStatus = (id, label) => {
    if (entities[id]?.state !== 'on') return null;
    return <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.01)'}}><div className="p-1.5 rounded-xl text-blue-400" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}><DoorOpen className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase font-bold leading-tight">{label}</span><span className="text-xs font-medium uppercase tracking-widest text-gray-300/50 italic">Ope</span></div></div>;
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-x-hidden" style={{backgroundColor: '#050505'}}>
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, #0a0a0c, #050505, #0d0d0f)'}} /><div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)'}} /><div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(88, 28, 135, 0.05)', filter: 'blur(150px)'}} /></div>
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
          <div className="flex flex-col gap-6 font-sans">
            <div><h1 className="text-5xl md:text-6xl font-light uppercase leading-none select-none" style={{letterSpacing: '0.8em', color: 'rgba(255,255,255,0.6)'}}>Midttunet</h1><p className="text-gray-500 font-medium uppercase text-xs leading-none mt-4 opacity-50" style={{letterSpacing: '0.6em'}}>{now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
            <div className="flex flex-wrap gap-2.5 mt-2 font-sans">{personStatus(OYVIND_ID)}{personStatus(TUVA_ID)}{reStatus()}{drStatus(EILEV_DOOR_ID, "Eilev si dør")}{drStatus(OLVE_DOOR_ID, "Olve si dør")}</div>
          </div>
          <div className="flex flex-col items-end gap-5 leading-none">
            <div className="flex items-center justify-center h-8 w-8 rounded-full transition-all border" style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: connected ? '#22c55e' : '#ef4444', boxShadow: connected ? '0_0_10px_rgba(34,197,94,0.6)' : 'none', animation: connected ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}} /></div>
            <div className="flex items-center gap-6 font-sans"><button onClick={() => setEditMode(!editMode)} className={`group flex items-center gap-2 text-xs font-bold uppercase transition-all ${editMode ? 'text-green-400' : 'text-gray-700 hover:text-white'}`}>{editMode ? 'Ferdig' : 'Rediger'}</button><button onClick={() => setShowConfigModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-gray-700 hover:text-white transition-all"><Settings className="w-4 h-4" /> System</button></div>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 font-sans">
          {cardOrder.map((id, index) => renderCard(id, index))}
        </div>
        
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}}><div className="border w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl relative font-sans" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}}><button onClick={() => setShowConfigModal(false)} className="absolute top-10 right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button><h3 className="text-3xl font-light mb-10 text-white text-center uppercase tracking-widest italic">System</h3><div className="space-y-8 font-sans"><div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4">HA URL</label><input type="text" className="w-full px-6 py-5 text-white rounded-2xl border" style={{backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)'}} value={config.url} onChange={(e) => setConfig({...config, url: e.target.value})} /></div><div className="space-y-2"><label className="text-xs uppercase font-bold text-gray-500 ml-4">Token</label><textarea className="w-full px-6 py-5 text-white h-48 rounded-2xl border" style={{backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)'}} value={config.token} onChange={(e) => setConfig({...config, token: e.target.value})} /></div></div><button onClick={() => setShowConfigModal(false)} className="w-full mt-10 py-5 rounded-2xl text-blue-400 font-black uppercase tracking-widest" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid'}}>Lagre og kople til</button></div></div>
        )}

        {showPowerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowPowerModal(false)}>
            <div className="border w-full max-w-4xl rounded-[3rem] p-12 font-sans relative max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowPowerModal(false)} className="absolute top-10 right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              <div className="flex items-center gap-6 mb-10">
                <div className="p-6 rounded-3xl" style={{backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#fbbf24'}}><Zap className="w-10 h-10" /></div>
                <h3 className="text-4xl font-light tracking-tight text-white uppercase italic">Straumpris</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-6 rounded-3xl border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                   <div className="flex items-center gap-2 mb-2">
                     <BarChart3 className="w-4 h-4 text-purple-400" />
                     <p className="text-xs text-gray-500 uppercase font-bold" style={{letterSpacing: '0.1em'}}>Snitt</p>
                   </div>
                   <p className="text-2xl font-light text-white">{priceStats.avg.toFixed(2)}</p>
                </div>
                <div className="p-6 rounded-3xl border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                   <div className="flex items-center gap-2 mb-2">
                     <TrendingDown className="w-4 h-4 text-blue-400" />
                     <p className="text-xs text-gray-500 uppercase font-bold" style={{letterSpacing: '0.1em'}}>Låg</p>
                   </div>
                   <p className="text-2xl font-light text-blue-400">{priceStats.min.toFixed(2)}</p>
                </div>
                <div className="p-6 rounded-3xl border" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                   <div className="flex items-center gap-2 mb-2">
                     <TrendingUp className="w-4 h-4 text-red-400" />
                     <p className="text-xs text-gray-500 uppercase font-bold" style={{letterSpacing: '0.1em'}}>Høg</p>
                   </div>
                   <p className="text-2xl font-light text-red-400">{priceStats.max.toFixed(2)}</p>
                </div>
              </div>
              <InteractivePowerGraph data={fullPriceData} currentIndex={currentPriceIndex} />
            </div>
          </div>
        )}

        {showClimateModal && entities[CLIMATE_ID] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowClimateModal(false)}>
            <div className="border w-full max-w-5xl rounded-[3rem] p-12 font-sans relative max-h-[90vh] overflow-y-auto" style={{backgroundColor: isHeating ? 'rgba(249, 115, 22, 0.01)' : isCooling ? 'rgba(59, 130, 246, 0.01)' : '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowClimateModal(false)} className="absolute top-10 right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              <div className="flex items-center gap-8 mb-12 font-sans">
                <div className="p-6 rounded-3xl transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>
                  {isCooling ? <Snowflake className="w-12 h-12" /> : <Wind className="w-12 h-12" />}
                </div>
                <div>
                  <h3 className="text-4xl font-light tracking-tight text-white uppercase italic leading-none">Varmepumpe</h3>
                  <div className="mt-3 px-4 py-1.5 rounded-full border inline-block transition-all duration-500" style={{backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.1)' : isHeating ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', borderColor: isCooling ? 'rgba(59, 130, 246, 0.2)' : isHeating ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.1)', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>
                    <p className="text-xs uppercase font-bold italic tracking-widest">Status: {isHeating ? 'VARMAR' : isCooling ? 'KJØLER' : 'VENTAR'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
                <div className="lg:col-span-3 space-y-10 p-10 rounded-3xl border shadow-inner" style={{backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)'}}>
                  <div className="text-center font-sans">
                    <div className="flex justify-between items-center mb-6 px-4 italic">
                      <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.5em'}}>Innetemperatur</p>
                      <span className="text-xs uppercase font-bold" style={{letterSpacing: '0.3em', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af'}}>{String(getA(CLIMATE_ID, "current_temperature"))}°C</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-10">
                      <span className="text-9xl font-light italic text-white tracking-tighter leading-none select-none" style={{textShadow: '0 10px 25px rgba(0,0,0,0.8)', color: isHeating ? '#fef2f2' : isCooling ? '#f0f9ff' : '#ffffff'}}>
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
                  <ModernDropdown label="Viftestyrke" icon={Fan} options={getA(CLIMATE_ID, "fan_modes", [])} current={getA(CLIMATE_ID, "fan_mode")} onChange={(m) => callService("climate", "set_fan_mode", { entity_id: CLIMATE_ID, fan_mode: m })} />
                  <ModernDropdown label="Sving" icon={ArrowUpDown} options={getA(CLIMATE_ID, "swing_modes", [])} current={getA(CLIMATE_ID, "swing_mode")} onChange={(m) => callService("climate", "set_swing_mode", { entity_id: CLIMATE_ID, swing_mode: m })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {showLightModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowLightModal(null)}>
            <div className="border w-full max-w-xl rounded-[2.5rem] p-8 font-sans relative max-h-[85vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl" style={{backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24'}}><Lightbulb className="w-8 h-8" /></div>
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
                        <div key={cid} className="p-4 rounded-2xl border flex flex-col gap-3 transition-all" style={{backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)'}}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">{entities[cid]?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ')}</span>
                            <button onClick={() => callService("light", "toggle", { entity_id: cid })} className="w-10 h-6 rounded-full relative transition-all" style={{backgroundColor: entities[cid]?.state === 'on' ? 'rgba(217, 119, 6, 0.4)' : 'rgba(255,255,255,0.1)'}}>
                              <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{left: entities[cid]?.state === 'on' ? 'calc(100% - 4px - 16px)' : '4px', backgroundColor: entities[cid]?.state === 'on' ? '#fbbf24' : '#9ca3af'}} />
                            </button>
                          </div>
                          <M3Slider min={0} max={255} step={1} value={entities[cid]?.attributes?.brightness || 0} disabled={entities[cid]?.state !== 'on'} onChange={(e) => callService("light", "turn_on", { entity_id: cid, brightness: parseInt(e.target.value) })} colorClass="bg-amber-500" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{backdropFilter: 'blur(48px)', backgroundColor: 'rgba(0,0,0,0.7)'}} onClick={() => setShowLeafModal(false)}>
            <div className="border w-full max-w-4xl rounded-[3rem] p-12 font-sans relative max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.1)'}} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowLeafModal(false)} className="absolute top-10 right-10 p-5 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}><X className="w-8 h-8" /></button>
              
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
                <button 
                  onClick={() => callService("button", "press", { entity_id: LEAF_UPDATE })}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest transition-all hover:bg-white/5 active:scale-95" 
                  style={{backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                >
                  <RefreshCw className="w-4 h-4" /> Oppdater
                </button>
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
                <div className="p-8 rounded-3xl border cursor-pointer hover:bg-white/5 transition-colors" 
                     style={{backgroundColor: getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(0,0,0,0.3)', borderColor: getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255,255,255,0.05)'}}
                     onClick={() => callService("climate", getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? "turn_off" : "turn_on", { entity_id: LEAF_CLIMATE })}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs uppercase font-bold" style={{letterSpacing: '0.2em', color: getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? '#fb923c' : '#9ca3af'}}>Klima</p>
                    <Fan className={`w-4 h-4 ${getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? 'text-orange-400 animate-spin' : 'text-gray-600'}`} />
                  </div>
                  <p className="text-2xl font-light italic text-white">{getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? 'PÅ' : 'AV'}</p>
                  <p className="text-xs mt-2 opacity-60">{getA(LEAF_CLIMATE, "hvac_action") !== 'off' ? 'Trykk for å stoppe' : 'Trykk for å starte'}</p>
                </div>
              </div>

              {getA(LEAF_LOCATION, "latitude") && getA(LEAF_LOCATION, "longitude") && (
                <div className="w-full h-80 rounded-3xl overflow-hidden border relative group" style={{borderColor: 'rgba(255,255,255,0.1)'}}>
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
      </div>
    </div>
  );
}
