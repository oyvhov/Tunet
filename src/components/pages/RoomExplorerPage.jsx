import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Search, X, ChevronDown, ChevronLeft, ArrowUpDown,
  Lightbulb, Thermometer, Power, WifiOff, Zap,
  Play, Pause, SkipForward, SkipBack,
  Lock, Unlock, DoorOpen, Fan, Camera, Bot, Speaker,
  Home, Eye, Activity,
} from '../../icons';
import { getIconComponent } from '../../icons';
import M3Slider from '../ui/M3Slider';
import { getAreas, getEntitiesForArea } from '../../services/haClient';

const SLIDER_DEBOUNCE_MS = 200;

const SORT_OPTIONS = [
  { key: 'name-az', icon: 'A→Z' },
  { key: 'name-za', icon: 'Z→A' },
  { key: 'entity-count', icon: '#' },
  { key: 'active-count', icon: '●' },
];

/** Domain display order */
const DOMAIN_ORDER = [
  'light', 'climate', 'media_player', 'cover', 'fan', 'lock',
  'switch', 'vacuum', 'automation', 'scene', 'script',
  'sensor', 'binary_sensor', 'camera', 'person',
];

function getDomainPriority(domain) {
  const idx = DOMAIN_ORDER.indexOf(domain);
  return idx === -1 ? 999 : idx;
}

/** Friendly domain label */
function domainLabel(domain, t) {
  const key = `roomExplorer.domain.${domain}`;
  const translated = t(key);
  return translated !== key ? translated : domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Domain icon component */
function getDomainIcon(domain) {
  switch (domain) {
    case 'light': return Lightbulb;
    case 'climate': return Thermometer;
    case 'media_player': return Speaker;
    case 'cover': return DoorOpen;
    case 'lock': return Lock;
    case 'fan': return Fan;
    case 'switch': case 'input_boolean': return Power;
    case 'automation': return Zap;
    case 'vacuum': return Bot;
    case 'camera': return Camera;
    case 'sensor': return Activity;
    case 'binary_sensor': return Eye;
    case 'scene': case 'script': return Play;
    default: return null;
  }
}

/** Domain accent color for section headers and badges */
function getDomainColor(domain) {
  switch (domain) {
    case 'light': return '#eab308';
    case 'climate': return '#3b82f6';
    case 'media_player': return '#a855f7';
    case 'cover': return '#06b6d4';
    case 'lock': return '#6366f1';
    case 'fan': return '#14b8a6';
    case 'switch': case 'input_boolean': return '#f59e0b';
    case 'automation': return '#f97316';
    case 'vacuum': return '#10b981';
    case 'camera': return '#ef4444';
    case 'sensor': return '#8b5cf6';
    case 'binary_sensor': return '#06b6d4';
    default: return 'var(--text-muted)';
  }
}

// ── Sort Dropdown (ModernDropdown style) ────────────────────────────────

const SortDropdown = memo(function SortDropdown({ sortMode, onSort, t, sortOptions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="popup-surface popup-surface-hover flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[11px] font-bold italic tracking-widest text-[var(--text-secondary)] uppercase transition-all active:scale-95"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {t(`roomExplorer.sort.${sortMode}`) || sortMode}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-[var(--glass-border)] py-1 shadow-2xl"
          style={{ background: 'var(--modal-bg)' }}
        >
          {sortOptions.map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => { onSort(key); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-semibold tracking-wider transition-colors ${
                sortMode === key
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              <span className="w-5 text-center text-sm opacity-60">{icon}</span>
              {t(`roomExplorer.sort.${key}`) || key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Entity Row with inline controls ─────────────────────────────────────

const EntityRow = memo(function EntityRow({ entityId, entity, callService, conn, t }) {
  const [optimisticBrightness, setOptimisticBrightness] = useState(null);
  const debounceRef = useRef(null);

  const attrs = useMemo(() => entity?.attributes || {}, [entity]);
  const domain = entityId.split('.')[0];
  const name = attrs.friendly_name || entityId.split('.')[1]?.replace(/_/g, ' ');
  const state = entity?.state;
  const isOn = state === 'on';
  const isUnavailable = state === 'unavailable' || state === 'unknown';

  const handleToggle = useCallback(() => {
    if (!conn || !callService || isUnavailable) return;
    const svc = isOn ? 'turn_off' : 'turn_on';
    callService(domain, svc, { entity_id: entityId });
  }, [conn, callService, domain, entityId, isOn, isUnavailable]);

  const handleBrightness = useCallback((val) => {
    if (!conn || !callService) return;
    setOptimisticBrightness(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val <= 0) {
        callService('light', 'turn_off', { entity_id: entityId });
      } else {
        callService('light', 'turn_on', { entity_id: entityId, brightness_pct: val });
      }
      setOptimisticBrightness(null);
    }, SLIDER_DEBOUNCE_MS);
  }, [conn, callService, entityId]);

  const brightness = attrs.brightness || 0;
  const brightnessPercent = Math.round(((optimisticBrightness != null ? (optimisticBrightness / 100) * 255 : brightness) / 255) * 100);
  const supportedColorModes = attrs.supported_color_modes;
  const isDimmable = domain === 'light' && supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : false;

  // Light color extraction
  const lightColor = useMemo(() => {
    if (domain !== 'light' || !isOn) return null;
    if (attrs.rgb_color) return `${attrs.rgb_color[0]}, ${attrs.rgb_color[1]}, ${attrs.rgb_color[2]}`;
    if (attrs.color_temp_kelvin) {
      const k = attrs.color_temp_kelvin;
      if (k <= 2700) return '255, 166, 60';
      if (k <= 3500) return '255, 195, 110';
      if (k <= 4500) return '255, 220, 170';
      return '210, 225, 255';
    }
    return '255, 183, 77';
  }, [domain, isOn, attrs]);

  // Climate info
  const currentTemp = attrs.current_temperature;
  const targetTemp = attrs.temperature;
  const hvacAction = attrs.hvac_action || state;
  const isHeating = hvacAction === 'heating';
  const isCooling = hvacAction === 'cooling';

  // Media info
  const mediaTitle = attrs.media_title;
  const mediaArtist = attrs.media_artist;

  // Entity-specific icon
  const IconComp = useMemo(() => {
    const iconName = attrs.icon;
    if (iconName) {
      const Comp = getIconComponent(iconName);
      if (Comp) return Comp;
    }
    return getDomainIcon(domain);
  }, [attrs.icon, domain]);

  if (!entity) return null;

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
        isUnavailable ? 'opacity-40' : ''
      }`}
      style={{
        background: domain === 'light' && isOn && lightColor
          ? `linear-gradient(135deg, rgba(${lightColor}, 0.08) 0%, var(--card-bg) 100%)`
          : domain === 'climate' && isHeating
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, var(--card-bg) 100%)'
            : domain === 'climate' && isCooling
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, var(--card-bg) 100%)'
              : 'var(--card-bg)',
        borderColor: domain === 'light' && isOn && lightColor
          ? `rgba(${lightColor}, 0.2)`
          : isOn || state === 'playing' || state === 'cleaning'
            ? 'var(--accent-color)'
            : 'var(--glass-border)',
      }}
    >
      {/* Entity icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
        isUnavailable ? 'bg-gray-500/10 text-gray-500' :
        isOn || state === 'playing' || state === 'cleaning'
          ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]'
          : state === 'locked'
            ? 'bg-blue-500/15 text-blue-400'
            : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
      }`}
        style={domain === 'light' && isOn && lightColor ? {
          background: `rgba(${lightColor}, 0.15)`,
          color: `rgb(${lightColor})`,
        } : undefined}
      >
        {IconComp && <IconComp className="h-4 w-4" />}
      </div>

      {/* Name + state */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          {domain === 'sensor' || domain === 'binary_sensor'
            ? `${state}${attrs.unit_of_measurement ? ` ${attrs.unit_of_measurement}` : ''}`
            : domain === 'climate'
              ? (() => {
                  const tempUnit = attrs.temperature_unit || '\u00b0';
                  const cur = currentTemp != null ? `${currentTemp}${tempUnit}` : '';
                  const tgt = targetTemp != null ? ` \u2192 ${targetTemp}${tempUnit}` : '';
                  return `${cur}${tgt} ${hvacAction}`;
                })()
              : domain === 'media_player' && (mediaTitle || mediaArtist)
                ? `${mediaArtist ? `${mediaArtist} \u2013 ` : ''}${mediaTitle || ''}`
                : domain === 'light' && isOn && isDimmable
                  ? `${brightnessPercent}%`
                  : t(`roomExplorer.state.${state}`) || state
          }
        </p>
      </div>

      {/* Inline controls by domain */}
      {domain === 'light' && !isUnavailable && (
        <div className="flex items-center gap-2">
          {isDimmable && isOn && (
            <div className="w-24">
              <M3Slider
                value={brightnessPercent}
                onChange={handleBrightness}
                min={0}
                max={100}
                size="small"
              />
            </div>
          )}
          <button
            onClick={handleToggle}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90 ${
              isOn
                ? 'text-white shadow-md'
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
            }`}
            style={isOn && lightColor ? {
              background: `rgb(${lightColor})`,
              boxShadow: `0 4px 12px rgba(${lightColor}, 0.3)`,
            } : isOn ? {
              background: 'var(--accent-color)',
              boxShadow: '0 4px 12px rgba(var(--accent-color), 0.3)',
            } : undefined}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      )}

      {(domain === 'switch' || domain === 'fan' || domain === 'input_boolean' || domain === 'automation') && !isUnavailable && (
        <button
          onClick={handleToggle}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90 ${
            isOn
              ? 'bg-[var(--accent-color)] text-white shadow-md shadow-[var(--accent-color)]/30'
              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
          }`}
        >
          <Power className="h-4 w-4" />
        </button>
      )}

      {domain === 'cover' && !isUnavailable && (
        <div className="flex items-center gap-1">
          {[
            { svc: 'open_cover', label: '▲' },
            { svc: 'stop_cover', label: '■' },
            { svc: 'close_cover', label: '▼' },
          ].map(({ svc, label }) => (
            <button
              key={svc}
              onClick={() => callService('cover', svc, { entity_id: entityId })}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all active:scale-90 ${
                (svc === 'open_cover' && state === 'open') || (svc === 'close_cover' && state === 'closed')
                  ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]'
                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {domain === 'lock' && !isUnavailable && (
        <button
          onClick={() => callService('lock', state === 'locked' ? 'unlock' : 'lock', { entity_id: entityId })}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-90 ${
            state === 'locked'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-orange-500/20 text-orange-400'
          }`}
        >
          {state === 'locked' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          <span className="text-[10px] tracking-wider uppercase">
            {state === 'locked' ? t('roomExplorer.state.locked') || 'Locked' : t('roomExplorer.state.unlocked') || 'Unlocked'}
          </span>
        </button>
      )}

      {domain === 'media_player' && !isUnavailable && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => callService('media_player', 'media_previous_track', { entity_id: entityId })}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--glass-bg)] text-[var(--text-muted)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-secondary)] active:scale-90"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => callService('media_player', state === 'playing' ? 'media_pause' : 'media_play', { entity_id: entityId })}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-90 ${
              state === 'playing'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
            }`}
          >
            {state === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => callService('media_player', 'media_next_track', { entity_id: entityId })}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--glass-bg)] text-[var(--text-muted)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-secondary)] active:scale-90"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {domain === 'vacuum' && !isUnavailable && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => callService('vacuum', state === 'cleaning' ? 'pause' : 'start', { entity_id: entityId })}
            className={`flex h-8 items-center justify-center rounded-lg px-3 text-[10px] font-bold tracking-wider uppercase transition-all active:scale-90 ${
              state === 'cleaning'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
            }`}
          >
            {state === 'cleaning' ? t('roomExplorer.vacuum.pause') : t('roomExplorer.vacuum.start')}
          </button>
          <button
            onClick={() => callService('vacuum', 'return_to_base', { entity_id: entityId })}
            className="flex h-8 items-center justify-center rounded-lg bg-[var(--glass-bg)] px-3 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-90"
          >
            {t('roomExplorer.vacuum.dock')}
          </button>
        </div>
      )}

      {(domain === 'scene' || domain === 'script') && !isUnavailable && (
        <button
          onClick={() => callService(domain, 'turn_on', { entity_id: entityId })}
          className="flex h-8 items-center justify-center rounded-lg bg-[var(--accent-color)]/15 px-3 text-[10px] font-bold tracking-wider text-[var(--accent-color)] uppercase transition-all hover:bg-[var(--accent-color)]/25 active:scale-90"
        >
          {t('roomExplorer.run') || 'Run'}
        </button>
      )}

      {(domain === 'button' || domain === 'input_button') && !isUnavailable && (
        <button
          onClick={() => callService(domain, 'press', { entity_id: entityId })}
          className="flex h-8 items-center justify-center rounded-lg bg-[var(--glass-bg)] px-3 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-90"
        >
          {t('roomExplorer.press') || 'Press'}
        </button>
      )}
    </div>
  );
});

// ── Room Card (overview) ────────────────────────────────────────────────

const RoomCard = memo(function RoomCard({ area, entityStats, onSelect, onToggleLights, t }) {
  const { lightsOn, lightsTotal, activeCount, totalCount, temperature, humidity, unavailableCount } = entityStats;
  const hasActivity = lightsOn > 0 || activeCount > 0;

  // HA area icon
  const AreaIcon = useMemo(() => {
    if (area.icon) {
      const Comp = getIconComponent(area.icon);
      if (Comp) return Comp;
    }
    return Home;
  }, [area.icon]);

  return (
    <button
      onClick={onSelect}
      className="group relative w-full overflow-hidden rounded-3xl border border-[var(--glass-border)] p-5 text-left transition-all duration-300 hover:border-[var(--text-muted)] hover:shadow-lg active:scale-[0.97]"
      style={{ background: 'var(--card-bg)' }}
    >
      {/* Activity glow */}
      {hasActivity && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse at top right, var(--accent-color), transparent 70%)' }}
        />
      )}

      {/* Room icon + name */}
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
          hasActivity
            ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]'
            : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
        }`}>
          <AreaIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">{area.name}</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            {totalCount} {t('roomExplorer.entities') || 'entities'}
          </p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="flex flex-wrap gap-1.5">
        {lightsOn > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}
            onClick={(e) => { e.stopPropagation(); onToggleLights?.(); }}
          >
            <Lightbulb className="h-3 w-3" /> {lightsOn}/{lightsTotal}
          </span>
        )}
        {temperature != null && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
          >
            <Thermometer className="h-3 w-3" /> {temperature}°
          </span>
        )}
        {humidity != null && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}
          >
            💧 {humidity}%
          </span>
        )}
        {activeCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
          >
            <Zap className="h-3 w-3" /> {activeCount}
          </span>
        )}
        {unavailableCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
          >
            <WifiOff className="h-3 w-3" /> {unavailableCount}
          </span>
        )}
      </div>
    </button>
  );
});

// ── Collapsible Domain Section ──────────────────────────────────────────

const DomainSection = memo(function DomainSection({ domain, items, callService, conn, t }) {
  const [collapsed, setCollapsed] = useState(false);
  const DomainIcon = getDomainIcon(domain);
  const color = getDomainColor(domain);
  const activeInDomain = items.filter(({ entity }) => {
    const s = entity?.state;
    return s === 'on' || s === 'playing' || s === 'cleaning' || s === 'open';
  }).length;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center gap-3 py-1"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}20` }}
        >
          {DomainIcon && <DomainIcon className="h-3.5 w-3.5" style={{ color }} />}
        </div>
        <h3 className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {domainLabel(domain, t)}
        </h3>
        {activeInDomain > 0 && (
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${color}20`, color }}>
            {activeInDomain}
          </span>
        )}
        <div className="h-px flex-1 bg-[var(--glass-border)]" />
        <span className="text-[11px] text-[var(--text-muted)]">{items.length}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div className="space-y-1.5 pl-1">
          {items.map(({ id, entity }) => (
            <EntityRow
              key={id}
              entityId={id}
              entity={entity}
              callService={callService}
              conn={conn}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Room Summary Bar (toggle all lights) ────────────────────────────────

const RoomSummaryBar = memo(function RoomSummaryBar({ entityIds, entities, callService, t }) {
  const stats = useMemo(() => {
    let lightsOn = 0, lightsTotal = 0;
    for (const id of entityIds) {
      const e = entities[id];
      if (!e) continue;
      if (id.startsWith('light.')) { lightsTotal++; if (e.state === 'on') lightsOn++; }
    }
    return { lightsOn, lightsTotal };
  }, [entityIds, entities]);

  if (stats.lightsTotal === 0) return null;

  const toggleAllLights = () => {
    if (!callService) return;
    const svc = stats.lightsOn > 0 ? 'turn_off' : 'turn_on';
    for (const id of entityIds) {
      if (id.startsWith('light.') && entities[id]) {
        callService('light', svc, { entity_id: id });
      }
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] px-4 py-3" style={{ background: 'var(--card-bg)' }}>
      <Lightbulb className="h-4 w-4 text-amber-400" />
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {stats.lightsOn}/{stats.lightsTotal} {t('roomExplorer.lightsOn') || 'lights on'}
      </span>
      <div className="flex-1" />
      <button
        onClick={toggleAllLights}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all active:scale-90 ${
          stats.lightsOn > 0
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
        }`}
      >
        <Power className="h-3 w-3" />
        {stats.lightsOn > 0 ? t('roomExplorer.allOff') || 'All off' : t('roomExplorer.allOn') || 'All on'}
      </button>
    </div>
  );
});

// ── Main Page ───────────────────────────────────────────────────────────

function RoomExplorerPage({ entities, callService, conn, pageSettings, pageId, savePageSetting, t }) {
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [areaEntityIds, setAreaEntityIds] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState(() => pageSettings?.[pageId]?.roomSort || 'name-az');
  const [domainFilter, setDomainFilter] = useState('all');
  const searchRef = useRef(null);

  // Fetch areas on mount
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    (async () => {
      try {
        const areaList = await getAreas(conn);
        if (!cancelled) setAreas(areaList);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [conn]);

  // Fetch entity IDs for each area
  useEffect(() => {
    if (!conn || areas.length === 0) return;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(
        areas.map(async (area) => {
          try {
            const ids = await getEntitiesForArea(conn, area.area_id);
            map[area.area_id] = ids;
          } catch {
            map[area.area_id] = [];
          }
        })
      );
      if (!cancelled) setAreaEntityIds(map);
    })();
    return () => { cancelled = true; };
  }, [conn, areas]);

  // Compute stats for each area
  const areaStats = useMemo(() => {
    const stats = {};
    for (const area of areas) {
      const ids = areaEntityIds[area.area_id] || [];
      let lightsOn = 0, lightsTotal = 0, activeCount = 0, unavailableCount = 0;
      let temperature = null, humidity = null;
      for (const id of ids) {
        const entity = entities[id];
        if (!entity) continue;
        const domain = id.split('.')[0];
        if (entity.state === 'unavailable' || entity.state === 'unknown') {
          unavailableCount++;
          continue;
        }
        if (domain === 'light') {
          lightsTotal++;
          if (entity.state === 'on') lightsOn++;
        }
        if (['on', 'playing', 'cleaning', 'open'].includes(entity.state)) activeCount++;
        if (domain === 'sensor' && entity.attributes?.device_class === 'temperature' && temperature === null) {
          const val = parseFloat(entity.state);
          if (!isNaN(val)) temperature = Math.round(val * 10) / 10;
        }
        if (domain === 'sensor' && entity.attributes?.device_class === 'humidity' && humidity === null) {
          const val = parseFloat(entity.state);
          if (!isNaN(val)) humidity = Math.round(val);
        }
      }
      stats[area.area_id] = { lightsOn, lightsTotal, activeCount, totalCount: ids.length, temperature, humidity, unavailableCount };
    }
    return stats;
  }, [areas, areaEntityIds, entities]);

  // Sort areas
  const sortedAreas = useMemo(() => {
    const sorted = [...areas];
    switch (sortMode) {
      case 'name-az': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name-za': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'entity-count': sorted.sort((a, b) => (areaStats[b.area_id]?.totalCount || 0) - (areaStats[a.area_id]?.totalCount || 0)); break;
      case 'active-count': sorted.sort((a, b) => (areaStats[b.area_id]?.activeCount || 0) - (areaStats[a.area_id]?.activeCount || 0)); break;
    }
    return sorted;
  }, [areas, sortMode, areaStats]);

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    if (!searchTerm && !selectedAreaId) return sortedAreas;
    if (selectedAreaId) return sortedAreas;
    const term = searchTerm.toLowerCase();
    return sortedAreas.filter(a => a.name?.toLowerCase().includes(term));
  }, [sortedAreas, searchTerm, selectedAreaId]);

  // Selected area data
  const selectedArea = areas.find(a => a.area_id === selectedAreaId);
  const selectedEntityIds = useMemo(
    () => areaEntityIds[selectedAreaId] || [],
    [areaEntityIds, selectedAreaId],
  );

  // Group entities by domain for selected area
  const domainGroups = useMemo(() => {
    if (!selectedAreaId) return [];
    const groups = {};
    for (const id of selectedEntityIds) {
      const entity = entities[id];
      if (!entity) continue;
      const domain = id.split('.')[0];
      // Apply search filter in detail view
      if (searchTerm) {
        const name = entity.attributes?.friendly_name || id;
        if (!name.toLowerCase().includes(searchTerm.toLowerCase()) && !id.toLowerCase().includes(searchTerm.toLowerCase())) continue;
      }
      // Apply domain filter
      if (domainFilter !== 'all' && domain !== domainFilter) continue;
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push({ id, entity });
    }
    return Object.entries(groups).sort((a, b) => getDomainPriority(a[0]) - getDomainPriority(b[0]));
  }, [selectedAreaId, selectedEntityIds, entities, searchTerm, domainFilter]);

  // Available domains for filter pills
  const availableDomains = useMemo(() => {
    if (!selectedAreaId) return [];
    const domains = new Set();
    for (const id of selectedEntityIds) {
      if (entities[id]) domains.add(id.split('.')[0]);
    }
    return [...domains].sort((a, b) => getDomainPriority(a) - getDomainPriority(b));
  }, [selectedAreaId, selectedEntityIds, entities]);

  // Count totals for detail view
  const detailTotalEntities = domainGroups.reduce((sum, [, items]) => sum + items.length, 0);

  const handleSortChange = useCallback((key) => {
    setSortMode(key);
    savePageSetting?.(pageId, 'roomSort', key);
  }, [pageId, savePageSetting]);

  const handleSelectArea = useCallback((areaId) => {
    setSelectedAreaId(areaId);
    setSearchTerm('');
    setDomainFilter('all');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedAreaId(null);
    setSearchTerm('');
    setDomainFilter('all');
  }, []);

  const handleToggleRoomLights = useCallback((areaId) => {
    if (!callService) return;
    const ids = areaEntityIds[areaId] || [];
    const lightIds = ids.filter(id => id.startsWith('light.'));
    const anyOn = lightIds.some(id => entities[id]?.state === 'on');
    const svc = anyOn ? 'turn_off' : 'turn_on';
    lightIds.forEach(id => callService('light', svc, { entity_id: id }));
  }, [areaEntityIds, entities, callService]);

  // Summary stats
  const totalAreas = areas.length;
  const totalActiveDevices = Object.values(areaStats).reduce((s, v) => s + v.activeCount, 0);
  const totalLightsOn = Object.values(areaStats).reduce((s, v) => s + v.lightsOn, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-24 pt-4 sm:px-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {selectedAreaId && (
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {selectedArea ? selectedArea.name : t('roomExplorer.title') || 'Rooms'}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            {selectedArea
              ? `${detailTotalEntities} ${t('roomExplorer.entities') || 'entities'}`
              : `${totalAreas} ${t('roomExplorer.rooms') || 'rooms'} · ${totalLightsOn > 0 ? `${totalLightsOn} ${t('roomExplorer.lightsOn') || 'lights on'} · ` : ''}${totalActiveDevices} ${t('roomExplorer.active') || 'active'}`
            }
          </p>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={selectedAreaId
              ? t('roomExplorer.searchEntities') || 'Search entities...'
              : t('roomExplorer.searchRooms') || 'Search rooms...'
            }
            className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2.5 pl-9 pr-9 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)]"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort (only in overview) */}
        {!selectedAreaId && (
          <SortDropdown sortMode={sortMode} onSort={handleSortChange} t={t} sortOptions={SORT_OPTIONS} />
        )}
      </div>

      {/* ── Domain filter pills (detail view) ──────────────────────── */}
      {selectedAreaId && availableDomains.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDomainFilter('all')}
            className={`rounded-2xl border px-3 py-2 text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
              domainFilter === 'all'
                ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
            }`}
          >
            {t('roomExplorer.filter.all') || 'All'}
          </button>
          {availableDomains.map(domain => {
            const DIcon = getDomainIcon(domain);
            const count = selectedEntityIds.filter(id => id.startsWith(`${domain}.`) && entities[id]).length;
            return (
              <button
                key={domain}
                onClick={() => setDomainFilter(domainFilter === domain ? 'all' : domain)}
                className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                  domainFilter === domain
                    ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                }`}
              >
                {DIcon && <DIcon className="h-3 w-3" />}
                {domainLabel(domain, t)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Room Overview Grid ─────────────────────────────────────── */}
      {!selectedAreaId && (
        filteredAreas.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredAreas.map(area => (
              <RoomCard
                key={area.area_id}
                area={area}
                entityStats={areaStats[area.area_id] || { lightsOn: 0, lightsTotal: 0, activeCount: 0, totalCount: 0, temperature: null, humidity: null, unavailableCount: 0 }}
                onSelect={() => handleSelectArea(area.area_id)}
                onToggleLights={() => handleToggleRoomLights(area.area_id)}
                t={t}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <Search className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('roomExplorer.noResults') || 'No rooms match your search'}
            </p>
          </div>
        ) : (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <Home className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('roomExplorer.noRooms') || 'No rooms found in Home Assistant'}
            </p>
          </div>
        )
      )}

      {/* ── Room Detail (entities by domain) ───────────────────────── */}
      {selectedAreaId && (
        <>
          {/* Summary bar with all-lights toggle */}
          <RoomSummaryBar
            entityIds={selectedEntityIds}
            entities={entities}
            callService={callService}
            t={t}
          />

          {domainGroups.length > 0 ? (
            <div className="space-y-5">
              {domainGroups.map(([domain, items]) => (
                <DomainSection
                  key={domain}
                  domain={domain}
                  items={items}
                  callService={callService}
                  conn={conn}
                  t={t}
                />
              ))}
            </div>
          ) : searchTerm || domainFilter !== 'all' ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <Search className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('roomExplorer.noResults') || 'No entities match your filter'}
            </p>
          </div>
        ) : (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <Home className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('roomExplorer.noEntities') || 'No entities in this room'}
            </p>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default memo(RoomExplorerPage);
