import { useMemo } from 'react';
import {
  X,
  Bot,
  MapPin,
  Battery,
  Play,
  Pause,
  Home,
  Fan,
  Droplets,
  Sparkles,
  Clock,
  Maximize2,
  Activity,
  Calendar,
} from '../icons';
import ModernDropdown from '../components/ui/ModernDropdown';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

/**
 * Format a duration value into a human-readable string.
 * Automatically detects seconds vs minutes:
 *   - If unit is 's' or 'seconds', converts from seconds.
 *   - If value > 10000 and no unit hint, assumes seconds.
 *   - Otherwise treats as minutes.
 */
function formatDuration(value, t, unit) {
  if (value == null || isNaN(value)) return '--';
  let mins;
  const num = Number(value);
  const isSeconds = unit === 's' || unit === 'seconds' || unit === 'sec' || (!unit && num > 10000);
  if (isSeconds) {
    mins = Math.round(num / 60);
  } else {
    mins = Math.round(num);
  }
  if (mins < 1) return `< 1 ${t('vacuum.statsMinutes') || 'min'}`;
  if (mins < 60) return `${mins} ${t('vacuum.statsMinutes') || 'min'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} ${t('vacuum.statsHours') || 'h'}`;
  return `${h} ${t('vacuum.statsHours') || 'h'} ${m} ${t('vacuum.statsMinutes') || 'min'}`;
}

/**
 * Format area (m²) with one decimal.
 */
function formatArea(value) {
  if (value == null || isNaN(value)) return '--';
  const num = Number(value);
  if (num === 0) return '0 m²';
  return `${num.toFixed(num >= 100 ? 0 : 1)} m²`;
}

/**
 * Format a timestamp string to a readable relative or absolute string.
 */
function formatLastCleaned(timestamp, t) {
  if (!timestamp) return '--';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('vacuum.statsJustNow') || 'Just now';
    if (diffMins < 60) return `${diffMins} ${t('vacuum.statsMinutesAgo') || 'min ago'}`;
    if (diffHours < 24) return `${diffHours} ${t('vacuum.statsHoursAgo') || 'h ago'}`;
    if (diffDays < 7) return `${diffDays} ${t('vacuum.statsDaysAgo') || 'd ago'}`;
    return date.toLocaleDateString();
  } catch {
    return String(timestamp);
  }
}

/**
 * VacuumModal - Modal for vacuum robot information and controls
 */
export default function VacuumModal({
  show,
  onClose,
  entities,
  callService,
  getA,
  t,
  vacuumId,
  vacuumSettings,
  conn,
}) {
  // --- Current room: try attribute first, then find sensor.*current_room ---
  const roomFromAttr =
    show && vacuumId ? getA(vacuumId, 'current_room') || getA(vacuumId, 'room') : null;

  // Build a helper that finds a related sensor entity value by keyword(s)
  const vacuumName = vacuumId ? vacuumId.split('.')[1] || '' : '';
  const relatedSensors = useMemo(() => {
    if (!entities || !vacuumName) return {};
    const found = {};
    for (const [eid, ent] of Object.entries(entities)) {
      if (!eid.startsWith('sensor.') || !eid.includes(vacuumName)) continue;
      found[eid] = ent;
    }
    return found;
  }, [entities, vacuumName]);

  const findSensorValue = (keywords) => {
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      if (keywords.every((kw) => eid.includes(kw))) {
        const v = ent?.state;
        if (v != null && v !== '' && v !== 'unavailable' && v !== 'unknown') return v;
      }
    }
    return null;
  };

  /** Find a sensor and return { value, unit } */
  const findSensorWithUnit = (keywords) => {
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      if (keywords.every((kw) => eid.includes(kw))) {
        const v = ent?.state;
        if (v != null && v !== '' && v !== 'unavailable' && v !== 'unknown') {
          return { value: v, unit: ent?.attributes?.unit_of_measurement };
        }
      }
    }
    return null;
  };

  const roomSensorValue = useMemo(() => {
    if (roomFromAttr) return null;
    if (!entities || !vacuumId) return null;
    for (const [eid, ent] of Object.entries(entities)) {
      if (
        eid.startsWith('sensor.') &&
        eid.includes('current_room') &&
        (eid.includes(vacuumName) || eid.includes('roborock') || eid.includes('vacuum'))
      ) {
        return ent?.state;
      }
    }
    return null;
  }, [entities, vacuumId, roomFromAttr, vacuumName]);

  if (!show) return null;
  if (!vacuumId || !entities?.[vacuumId]) return null;

  const entity = entities[vacuumId];
  const attrs = entity?.attributes || {};
  const state = entity?.state;
  const isCleaning = state === 'cleaning';
  const isReturning = state === 'returning';
  const isError = state === 'error';

  const room = roomFromAttr || roomSensorValue;

  const battery = getA(vacuumId, 'battery_level');
  const fanSpeed = getA(vacuumId, 'fan_speed');
  const mopIntensity = getA(vacuumId, 'mop_intensity');

  // --- Cleaning statistics (attributes first, then related sensor entities) ---
  // Current session time
  const cleaningTimeRaw =
    attrs.cleaning_time ?? attrs.current_clean_time ?? attrs.clean_time ?? null;
  const cleaningTimeSensor =
    cleaningTimeRaw == null
      ? (findSensorWithUnit(['cleaning_time']) ?? findSensorWithUnit(['clean_time']))
      : null;
  const cleaningTime = cleaningTimeRaw ?? cleaningTimeSensor?.value ?? null;
  const cleaningTimeUnit = cleaningTimeSensor?.unit ?? null;

  // Current session area
  const cleanedArea =
    attrs.cleaned_area ??
    attrs.current_clean_area ??
    attrs.clean_area ??
    findSensorValue(['cleaning_area']) ??
    findSensorValue(['cleaned_area']) ??
    findSensorValue(['clean_area']);

  // Total duration
  const totalTimeRaw =
    attrs.total_cleaning_time ?? attrs.total_clean_time ?? attrs.total_duration ?? null;
  const totalTimeSensor =
    totalTimeRaw == null
      ? (findSensorWithUnit(['total', 'cleaning_time']) ??
        findSensorWithUnit(['total', 'clean_time']) ??
        findSensorWithUnit(['total', 'duration']))
      : null;
  const totalCleanTime = totalTimeRaw ?? totalTimeSensor?.value ?? null;
  const totalCleanTimeUnit = totalTimeSensor?.unit ?? null;

  // Total area
  const totalCleanArea =
    attrs.total_clean_area ??
    attrs.total_cleaned_area ??
    findSensorValue(['total', 'clean_area']) ??
    findSensorValue(['total', 'cleaned_area']);
  const totalCleanCount =
    attrs.total_clean_count ??
    attrs.clean_count ??
    findSensorValue(['total', 'clean_count']) ??
    findSensorValue(['clean_count']);
  const lastCleanStart =
    attrs.last_clean_start ??
    attrs.last_run_start ??
    findSensorValue(['last_clean_start']) ??
    findSensorValue(['last_run_start']);
  const lastCleanEnd =
    attrs.last_clean_end ??
    attrs.last_run_end ??
    findSensorValue(['last_clean_end']) ??
    findSensorValue(['last_run_end']) ??
    findSensorValue(['last_clean_time']);

  // Room scripts from resolved settings
  const settings = vacuumSettings || {};
  const roomScripts = Array.isArray(settings.roomScripts)
    ? settings.roomScripts.filter((s) => s.entityId)
    : [];

  const startRoomCleaning = async (scriptEntityId) => {
    if (!conn && !callService) return;
    try {
      if (conn) {
        await conn.sendMessagePromise({
          type: 'call_service',
          domain: 'script',
          service: 'turn_on',
          service_data: { entity_id: scriptEntityId },
        });
      } else {
        callService('script', 'turn_on', { entity_id: scriptEntityId });
      }
    } catch (_e) {
      // silently handle
    }
  };

  // Dynamic lists from attributes or defaults
  const fanSpeedList = attrs.fan_speed_list || ['Silent', 'Standard', 'Strong', 'Turbo'];
  const mopIntensityList = attrs.mop_intensity_list || ['Low', 'Medium', 'High'];

  // Status Color Logic
  const statusColor = isCleaning
    ? '#60a5fa'
    : isReturning
      ? '#c084fc'
      : isError
        ? '#ef4444'
        : 'var(--text-secondary)';
  const statusBg = isCleaning
    ? 'rgba(59, 130, 246, 0.1)'
    : isReturning
      ? 'rgba(192, 132, 252, 0.1)'
      : isError
        ? 'rgba(239, 68, 68, 0.1)'
        : 'var(--glass-bg)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Section */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            <Bot className={`h-8 w-8${isCleaning ? ' animate-pulse' : ''}`} />
          </div>
          <div>
            <h3
              className="text-2xl leading-none font-light tracking-tight uppercase italic"
              style={{ color: 'var(--text-primary)' }}
            >
              {getDisplayName(entity, vacuumId)}
            </h3>
            <div
              className="mt-2 inline-block rounded-full px-3 py-1 transition-all duration-500"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              <p className="text-[10px] font-bold tracking-widest uppercase italic">
                {t('status.statusLabel')}: {state}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 font-sans lg:grid-cols-5">
          {/* Left Column - Main Controls & Status (Span 3) */}
          <div className="space-y-6 lg:col-span-3">
            <div className="popup-surface flex flex-col items-center justify-center gap-8 rounded-3xl p-8">
              {/* Primary Actions */}
              <div className="flex w-full gap-4">
                <button
                  onClick={() =>
                    callService('vacuum', isCleaning ? 'pause' : 'start', { entity_id: vacuumId })
                  }
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all"
                  style={
                    isCleaning
                      ? { backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }
                      : { backgroundColor: 'var(--accent-color)', color: '#fff' }
                  }
                >
                  {isCleaning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isCleaning ? t('vacuum.pause') : t('vacuum.start')}
                </button>
                <button
                  onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                >
                  <Home className="h-5 w-5" />
                  {t('vacuum.home')}
                </button>
              </div>

              {/* Secondary Status Grid */}
              <div className="grid w-full grid-cols-3 gap-4">
                {/* Battery */}
                <div
                  className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <Battery
                    className={`h-6 w-6 ${battery !== undefined && battery < 20 ? 'text-red-400' : 'text-green-400'}`}
                  />
                  <span className="text-xl font-light">
                    {battery !== undefined ? `${battery}%` : '--'}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('vacuum.battery')}
                  </span>
                </div>

                {/* Room */}
                <div
                  className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <MapPin className="h-6 w-6" style={{ color: 'var(--accent-color)' }} />
                  <span className="max-w-full truncate px-2 text-xl font-light" title={room}>
                    {room || '--'}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('vacuum.room')}
                  </span>
                </div>

                {/* Locate Button */}
                <button
                  onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <Bot className="h-6 w-6 text-purple-400" />
                  <span className="text-xl font-light">{t('vacuum.find')}</span>
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Click
                  </span>
                </button>
              </div>

              {/* Current Session Stats */}
              <div className="w-full space-y-3">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('vacuum.statsCurrentSession') || 'Current session'}
                </p>
                <div className="grid w-full grid-cols-2 gap-3">
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                    style={{ backgroundColor: 'var(--glass-bg)' }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: isCleaning
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--glass-bg)',
                        color: isCleaning ? '#60a5fa' : 'var(--text-secondary)',
                      }}
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg leading-tight font-light">
                        {formatDuration(cleaningTime, t, cleaningTimeUnit)}
                      </p>
                      <p
                        className="text-[10px] font-bold tracking-widest uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t('vacuum.statsTime') || 'Time'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                    style={{ backgroundColor: 'var(--glass-bg)' }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: isCleaning
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--glass-bg)',
                        color: isCleaning ? '#60a5fa' : 'var(--text-secondary)',
                      }}
                    >
                      <Maximize2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg leading-tight font-light">
                        {formatArea(cleanedArea)}
                      </p>
                      <p
                        className="text-[10px] font-bold tracking-widest uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t('vacuum.statsArea') || 'Area'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Scripts */}
              {roomScripts.length > 0 && (
                <div className="w-full space-y-3">
                  <p
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('vacuum.cleanRooms') || 'Clean rooms'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {roomScripts.map((script, index) => (
                      <button
                        key={index}
                        onClick={() => startRoomCleaning(script.entityId)}
                        className="group flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Sparkles
                          className="h-4 w-4 transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        />
                        {script.label || script.entityId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Modes/Settings & Lifetime Stats (Span 2) */}
          <div className="flex flex-col justify-start space-y-10 py-4 font-sans italic lg:col-span-2">
            <ModernDropdown
              label={t('vacuum.suction')}
              icon={Fan}
              options={fanSpeedList}
              current={fanSpeed}
              onChange={(value) =>
                callService('vacuum', 'set_fan_speed', { entity_id: vacuumId, fan_speed: value })
              }
              placeholder={t('vacuum.suction')}
              map={{}}
            />

            <ModernDropdown
              label={t('vacuum.mopIntensity')}
              icon={Droplets}
              options={mopIntensityList}
              current={mopIntensity}
              onChange={(value) =>
                callService('vacuum', 'set_mop_intensity', {
                  entity_id: vacuumId,
                  mop_intensity: value,
                })
              }
              placeholder={t('vacuum.mopIntensity')}
              map={{}}
            />

            {/* Lifetime / History Stats */}
            <div className="not-italic">
              <p
                className="mb-3 ml-1 text-xs font-bold uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}
              >
                {t('vacuum.statsHistory') || 'History'}
              </p>
              <div
                className="space-y-0 overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--modal-surface, var(--glass-bg))',
                  boxShadow: 'var(--modal-surface-shadow, 0 10px 24px rgba(0,0,0,0.25))',
                }}
              >
                <div
                  className="flex items-center gap-3 border-b px-5 py-3.5"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <Activity
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: 'var(--accent-color)' }}
                  />
                  <span
                    className="flex-1 text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('vacuum.statsTotalCleans') || 'Total cleans'}
                  </span>
                  <span className="text-sm font-light" style={{ color: 'var(--text-primary)' }}>
                    {totalCleanCount ?? '--'}
                  </span>
                </div>
                <div
                  className="flex items-center gap-3 border-b px-5 py-3.5"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <Clock
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: 'var(--accent-color)' }}
                  />
                  <span
                    className="flex-1 text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('vacuum.statsTotalTime') || 'Total time'}
                  </span>
                  <span className="text-sm font-light" style={{ color: 'var(--text-primary)' }}>
                    {formatDuration(totalCleanTime, t, totalCleanTimeUnit)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-3 border-b px-5 py-3.5"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <Maximize2
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: 'var(--accent-color)' }}
                  />
                  <span
                    className="flex-1 text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('vacuum.statsTotalArea') || 'Total area'}
                  </span>
                  <span className="text-sm font-light" style={{ color: 'var(--text-primary)' }}>
                    {formatArea(totalCleanArea)}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <Calendar
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: 'var(--accent-color)' }}
                  />
                  <span
                    className="flex-1 text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('vacuum.lastCleaned')}
                  </span>
                  <span className="text-sm font-light" style={{ color: 'var(--text-primary)' }}>
                    {formatLastCleaned(lastCleanEnd || lastCleanStart, t)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
