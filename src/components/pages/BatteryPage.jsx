import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Battery, BatteryCharging, Search, ArrowUpDown, X, ChevronDown, AlertTriangle, WifiOff } from '../../icons';
import { getIconComponent } from '../../icons';
import { getAreas } from '../../services/haClient';

const LOW_BATTERY_THRESHOLD = 20;

const SORT_OPTIONS = [
  { key: 'level', icon: '▾' },
  { key: 'name-az', icon: 'A→Z' },
  { key: 'name-za', icon: 'Z→A' },
  { key: 'area', icon: '⌂' },
  { key: 'unavailable', icon: '⚠' },
];

const FILTER_OPTIONS = [
  { key: 'all' },
  { key: 'low' },
  { key: 'ok' },
  { key: 'unavailable' },
];

/** Get battery level as a number 0–100, or null if unavailable. */
function getBatteryLevel(entity) {
  const state = parseFloat(entity.state);
  if (isNaN(state)) return null;
  return Math.max(0, Math.min(100, Math.round(state)));
}

/** Color for battery bar based on level. */
function getBatteryColor(level) {
  if (level === null) return 'var(--text-muted)';
  if (level <= 10) return '#ef4444';   // red
  if (level <= 20) return '#f97316';   // orange
  if (level <= 50) return '#eab308';   // yellow
  return '#22c55e';                     // green
}

/** Status key for sorting / filtering. */
function getBatteryStatus(entity) {
  if (entity.state === 'unavailable' || entity.state === 'unknown') return 'unavailable';
  const level = getBatteryLevel(entity);
  if (level === null) return 'unavailable';
  if (level <= LOW_BATTERY_THRESHOLD) return 'low';
  return 'ok';
}

// ── Individual Battery Tile ──────────────────────────────────────────────

const BatteryTile = memo(function BatteryTile({ entity, areaName, t }) {
  const { entity_id, state, attributes } = entity;
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const name = attributes?.friendly_name || entity_id.split('.')[1];
  const level = getBatteryLevel(entity);
  const color = getBatteryColor(level);
  const isCharging = attributes?.is_charging === true ||
    (attributes?.charging !== undefined && attributes.charging) ||
    entity_id.includes('charging');
  const isLow = level !== null && level <= LOW_BATTERY_THRESHOLD;

  const iconName = attributes?.icon;
  const Icon = iconName
    ? getIconComponent(iconName) || (isCharging ? BatteryCharging : Battery)
    : isCharging ? BatteryCharging : Battery;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-5 font-sans transition-all duration-500 ${
        isUnavailable ? 'opacity-50' : ''
      } ${isLow && !isUnavailable ? 'animate-pulse-subtle' : ''}`}
      style={{
        background: isLow && !isUnavailable
          ? `linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, var(--card-bg) 100%)`
          : 'var(--card-bg)',
        borderColor: isLow && !isUnavailable
          ? 'rgba(239, 68, 68, 0.3)'
          : 'var(--glass-border)',
      }}
    >
      {/* Name + icon row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500"
            style={{
              backgroundColor: isUnavailable ? undefined : `color-mix(in srgb, ${color} 15%, transparent)`,
              color: isUnavailable ? 'var(--text-muted)' : color,
            }}
            {...(!isUnavailable ? {} : { className: 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-muted)] transition-all duration-500' })}
          >
            <Icon className="h-5 w-5 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isUnavailable
                ? (t('status.unavailable') || 'Unavailable')
                : isCharging
                  ? (t('battery.charging') || 'Charging')
                  : isLow
                    ? (t('battery.low') || 'Low')
                    : (t('battery.ok') || 'OK')}
              {areaName && <span className="opacity-60"> · {areaName}</span>}
            </p>
          </div>
        </div>

        {/* Level badge */}
        <div
          className="flex h-10 min-w-[2.75rem] flex-shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold"
          style={{
            backgroundColor: isUnavailable ? 'var(--glass-bg)' : `color-mix(in srgb, ${color} 15%, transparent)`,
            color: isUnavailable ? 'var(--text-muted)' : color,
          }}
        >
          {isUnavailable ? <WifiOff className="h-4 w-4" /> : `${level}%`}
        </div>
      </div>

      {/* Battery bar */}
      {!isUnavailable && level !== null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--glass-bg)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${level}%`,
              backgroundColor: color,
              boxShadow: isLow ? `0 0 8px ${color}` : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
});

// ── Sort Dropdown ────────────────────────────────────────────────────────

const SortDropdown = memo(function SortDropdown({ sortMode, onSortChange, options, prefix, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = options.find((o) => o.key === sortMode) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group popup-surface popup-surface-hover flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all active:scale-95"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-color)]" />
        <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase italic">
          {t(`${prefix}.${current.key}`) || current.key}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border shadow-2xl"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }}
        >
          {options.map(({ key }) => {
            const active = key === sortMode;
            return (
              <button
                key={key}
                onClick={() => { onSortChange(key); setOpen(false); }}
                className={`w-full px-5 py-3 text-left text-xs font-bold tracking-widest uppercase transition-all ${
                  active
                    ? 'text-[var(--accent-color)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                }`}
                style={{ backgroundColor: active ? 'var(--accent-bg)' : 'transparent' }}
              >
                {t(`${prefix}.${key}`) || key}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Main Battery Page ────────────────────────────────────────────────────

function BatteryPage({ entities, callService, conn, pageSettings, pageId, savePageSetting, t }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState(
    () => pageSettings?.[pageId]?.batterySort || 'level'
  );
  const [filterMode, setFilterMode] = useState(
    () => pageSettings?.[pageId]?.batteryFilter || 'all'
  );
  const [areas, setAreas] = useState([]);

  // Fetch areas for grouping
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    getAreas(conn)
      .then((result) => { if (!cancelled) setAreas(result); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conn]);

  // Build area lookup
  const areaMap = useMemo(() => {
    const map = new Map();
    areas.forEach((a) => map.set(a.area_id, a.name || a.area_id));
    return map;
  }, [areas]);

  // Persist sort preference
  const handleSortChange = useCallback((mode) => {
    setSortMode(mode);
    if (savePageSetting && pageId) {
      savePageSetting(pageId, 'batterySort', mode);
    }
  }, [savePageSetting, pageId]);

  // Persist filter preference
  const handleFilterChange = useCallback((mode) => {
    setFilterMode(mode);
    if (savePageSetting && pageId) {
      savePageSetting(pageId, 'batteryFilter', mode);
    }
  }, [savePageSetting, pageId]);

  // Get area name for a battery entity
  const getAreaName = useCallback((entity) => {
    const a = entity.attributes || {};
    if (a.area_id && areaMap.has(a.area_id)) return areaMap.get(a.area_id);
    if (a.area_name) return a.area_name;
    return null;
  }, [areaMap]);

  // All battery entities — sensors with device_class battery
  const allBatteries = useMemo(() => {
    return Object.values(entities).filter((e) => {
      const dc = e.attributes?.device_class;
      if (dc === 'battery') return true;
      // Also match binary sensors with battery class
      if (e.entity_id.startsWith('binary_sensor.') && dc === 'battery') return true;
      return false;
    });
  }, [entities]);

  // Counts
  const lowCount = useMemo(
    () => allBatteries.filter((e) => getBatteryStatus(e) === 'low').length,
    [allBatteries]
  );
  const unavailableCount = useMemo(
    () => allBatteries.filter((e) => getBatteryStatus(e) === 'unavailable').length,
    [allBatteries]
  );

  // Filter
  const filteredBatteries = useMemo(() => {
    let base = allBatteries;
    // status filter
    if (filterMode !== 'all') {
      base = base.filter((e) => getBatteryStatus(e) === filterMode);
    }
    // search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      base = base.filter((e) => {
        const name = (e.attributes?.friendly_name || e.entity_id).toLowerCase();
        const area = (getAreaName(e) || '').toLowerCase();
        return name.includes(term) || area.includes(term) || e.entity_id.toLowerCase().includes(term);
      });
    }
    return base;
  }, [allBatteries, filterMode, searchTerm, getAreaName]);

  // Sort
  const sortedBatteries = useMemo(() => {
    const list = [...filteredBatteries];
    const sorters = {
      'level': (a, b) => {
        const aLevel = getBatteryLevel(a) ?? -1;
        const bLevel = getBatteryLevel(b) ?? -1;
        if (aLevel !== bLevel) return aLevel - bLevel; // lowest first
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      'name-az': (a, b) => {
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      'name-za': (a, b) => {
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return bName.localeCompare(aName);
      },
      'area': (a, b) => {
        const aArea = getAreaName(a) || '\uffff';
        const bArea = getAreaName(b) || '\uffff';
        if (aArea !== bArea) return aArea.localeCompare(bArea);
        const aLevel = getBatteryLevel(a) ?? -1;
        const bLevel = getBatteryLevel(b) ?? -1;
        return aLevel - bLevel;
      },
      'unavailable': (a, b) => {
        const aUn = getBatteryStatus(a) === 'unavailable' ? 0 : 1;
        const bUn = getBatteryStatus(b) === 'unavailable' ? 0 : 1;
        if (aUn !== bUn) return aUn - bUn;
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
    };
    list.sort(sorters[sortMode] || sorters['level']);
    return list;
  }, [filteredBatteries, sortMode, getAreaName]);

  // Group by area when sort mode is 'area'
  const areaGroups = useMemo(() => {
    if (sortMode !== 'area') return null;
    const groups = new Map();
    sortedBatteries.forEach((e) => {
      const area = getAreaName(e) || (t('battery.noArea') || 'Other');
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area).push(e);
    });
    return groups;
  }, [sortMode, sortedBatteries, getAreaName, t]);

  const totalCount = filteredBatteries.length;

  const renderTile = (entity) => (
    <BatteryTile
      key={entity.entity_id}
      entity={entity}
      areaName={getAreaName(entity)}
      t={t}
    />
  );

  const renderGrid = (batteries) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {batteries.map(renderTile)}
    </div>
  );

  return (
    <div className="animate-in fade-in zoom-in px-4 pb-8 duration-500">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase">
            {t('battery.pageTitle') || 'Batteries'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {lowCount > 0 && (
              <span className="font-semibold text-orange-400">
                {lowCount} {(t('battery.low') || 'Low').toLowerCase()}
              </span>
            )}
            {lowCount > 0 && ' · '}
            {allBatteries.length} {t('battery.total') || 'total'}
            {unavailableCount > 0 && (
              <span className="text-[var(--text-muted)]">
                {' '}· {unavailableCount} {(t('battery.offline') || 'offline').toLowerCase()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Toolbar: search + sort + filters ────────────────────────── */}
      {allBatteries.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('battery.search') || 'Search batteries...'}
              className="popup-surface w-full rounded-2xl py-2.5 pr-9 pl-10 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                aria-label={t('common.close') || 'Clear'}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <SortDropdown
            sortMode={sortMode}
            onSortChange={handleSortChange}
            options={SORT_OPTIONS}
            prefix="battery.sort"
            t={t}
          />

          {/* Filter pills */}
          {FILTER_OPTIONS.map(({ key }) => {
            const active = filterMode === key;
            const count = key === 'all' ? allBatteries.length
              : key === 'low' ? lowCount
              : key === 'unavailable' ? unavailableCount
              : allBatteries.length - lowCount - unavailableCount;
            if (key !== 'all' && count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                  active
                    ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                }`}
              >
                {key === 'low' && <AlertTriangle className="h-3 w-3" />}
                {key === 'unavailable' && <WifiOff className="h-3 w-3" />}
                {t(`battery.filter.${key}`) || key} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {totalCount > 0 ? (
        areaGroups ? (
          // Area-grouped layout
          <div className="space-y-6">
            {[...areaGroups.entries()].map(([areaName, batteries]) => (
              <div key={areaName}>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    {areaName}
                  </h3>
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {batteries.filter((e) => getBatteryStatus(e) === 'low').length > 0 && (
                      <span className="mr-1 text-orange-400">
                        {batteries.filter((e) => getBatteryStatus(e) === 'low').length} low
                      </span>
                    )}
                    {batteries.length}
                  </span>
                </div>
                {renderGrid(batteries)}
              </div>
            ))}
          </div>
        ) : (
          renderGrid(sortedBatteries)
        )
      ) : searchTerm ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Search className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">
            {t('battery.noResults') || 'No batteries match your search'}
          </p>
        </div>
      ) : filterMode !== 'all' ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Battery className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">
            {t('battery.noneInFilter') || 'No batteries in this filter'}
          </p>
        </div>
      ) : (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Battery className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">
            {t('battery.noBatteries') || 'No battery sensors found'}
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(BatteryPage);
