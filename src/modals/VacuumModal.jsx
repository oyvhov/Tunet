import { useMemo, useCallback, useEffect, useState } from 'react';
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
import { getRelatedEntityIds } from '../services/haClient';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

const isValidStateValue = (value) =>
  value != null && value !== '' && value !== 'unavailable' && value !== 'unknown';

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

function formatRawValueWithUnit(value, unit) {
  if (value == null || value === '' || value === 'unknown' || value === 'unavailable') return '--';
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue)
    ? Number.isInteger(numericValue)
      ? String(numericValue)
      : String(Number(numericValue.toFixed(1)))
    : String(value);
  if (unit) return `${displayValue} ${unit}`;
  return displayValue;
}

function getVacuumStateLabel(state, battery, t) {
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('vacuum.unknown');

  if (normalized === 'cleaning' || normalized === 'vacuuming') return t('vacuum.cleaning');
  if (normalized === 'returning' || normalized === 'going_home' || normalized === 'return_to_base') {
    return t('vacuum.returning') || t('room.vacuumStatus.goingHome') || normalized;
  }
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100) {
    return t('vacuum.docked');
  }
  if (normalized === 'docked') return t('vacuum.charging');
  if (normalized === 'idle' || normalized === 'ready') return t('vacuum.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('vacuum.pause');
  if (normalized === 'error') return t('room.vacuumStatus.error') || 'Error';
  if (normalized === 'stopped') return t('room.vacuumStatus.stopped') || 'Stopped';
  return state;
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
  const modalTitleId = `vacuum-modal-title-${(vacuumId || 'vacuum').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  // --- Current room: try attribute first, then find sensor.*current_room ---
  const roomFromAttr =
    show && vacuumId ? getA(vacuumId, 'current_room') || getA(vacuumId, 'room') : null;

  // Build a helper that finds a related sensor entity value by keyword(s)
  const vacuumName = vacuumId ? vacuumId.split('.')[1] || '' : '';
  const vacuumFriendlyName =
    (vacuumId && entities?.[vacuumId]?.attributes?.friendly_name?.toLowerCase()) || '';
  const vacuumNameTokens = useMemo(() => {
    if (!vacuumName) return [];
    return vacuumName
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter((token) => token.length > 2)
      .filter((token) => !['vacuum', 'robot', 'cleaner'].includes(token));
  }, [vacuumName]);

  const settings = useMemo(() => vacuumSettings || {}, [vacuumSettings]);
  const [registryRelatedSensorIds, setRegistryRelatedSensorIds] = useState([]);
  const [registryRelatedSelectIds, setRegistryRelatedSelectIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) setRegistryRelatedSensorIds([]);
        return;
      }
      try {
        const relatedIds = await getRelatedEntityIds(conn, vacuumId, { domains: ['sensor'] });
        if (!cancelled) setRegistryRelatedSensorIds(Array.isArray(relatedIds) ? relatedIds : []);
      } catch {
        if (!cancelled) setRegistryRelatedSensorIds([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) setRegistryRelatedSelectIds([]);
        return;
      }
      try {
        const relatedIds = await getRelatedEntityIds(conn, vacuumId, {
          domains: ['select', 'input_select'],
        });
        if (!cancelled) setRegistryRelatedSelectIds(Array.isArray(relatedIds) ? relatedIds : []);
      } catch {
        if (!cancelled) setRegistryRelatedSelectIds([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  const getMappedSensorWithUnit = useCallback(
    (settingKey) => {
      const sensorId = settings?.[settingKey];
      if (!sensorId) return null;
      const entity = entities?.[sensorId];
      const value = entity?.state;
      if (!isValidStateValue(value)) return null;
      return {
        value,
        unit: entity?.attributes?.unit_of_measurement || null,
        sensorId,
      };
    },
    [settings, entities]
  );

  const getMappedSensorValue = useCallback(
    (settingKey) => getMappedSensorWithUnit(settingKey)?.value ?? null,
    [getMappedSensorWithUnit]
  );

  const relatedSensors = useMemo(() => {
    if (!entities || !vacuumName) return {};
    const found = {};

    if (registryRelatedSensorIds.length > 0) {
      for (const sensorId of registryRelatedSensorIds) {
        if (!sensorId?.startsWith('sensor.')) continue;
        const sensorEntity = entities[sensorId];
        if (sensorEntity) found[sensorId] = sensorEntity;
      }
      return found;
    }

    for (const [eid, ent] of Object.entries(entities)) {
      if (!eid.startsWith('sensor.')) continue;
      const lowerId = eid.toLowerCase();
      const friendly = (ent?.attributes?.friendly_name || '').toLowerCase();
      const matchesVacuumName = lowerId.includes(vacuumName.toLowerCase());
      const matchesFriendlyName = vacuumFriendlyName && friendly.includes(vacuumFriendlyName);
      const matchesToken = vacuumNameTokens.some(
        (token) => lowerId.includes(token) || friendly.includes(token)
      );

      if (!matchesVacuumName && !matchesFriendlyName && !matchesToken) continue;
      found[eid] = ent;
    }
    return found;
  }, [entities, vacuumName, vacuumFriendlyName, vacuumNameTokens, registryRelatedSensorIds]);

  const findSensorValue = (keywords) => {
    const loweredKeywords = keywords.map((kw) => String(kw).toLowerCase());
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      const haystack = `${eid.toLowerCase()} ${(ent?.attributes?.friendly_name || '').toLowerCase()}`;
      if (loweredKeywords.every((kw) => haystack.includes(kw))) {
        const value = ent?.state;
        if (isValidStateValue(value)) return value;
      }
    }
    return null;
  };

  /** Find a sensor and return { value, unit } */
  const findSensorWithUnit = (keywords) => {
    const loweredKeywords = keywords.map((kw) => String(kw).toLowerCase());
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      const haystack = `${eid.toLowerCase()} ${(ent?.attributes?.friendly_name || '').toLowerCase()}`;
      if (loweredKeywords.every((kw) => haystack.includes(kw))) {
        const value = ent?.state;
        if (isValidStateValue(value)) {
          return { value, unit: ent?.attributes?.unit_of_measurement };
        }
      }
    }
    return null;
  };

  const roomSensorValue = useMemo(() => {
    if (roomFromAttr) return null;
    const mappedRoom = getMappedSensorValue('currentRoomSensorId');
    if (mappedRoom) return mappedRoom;
    if (!entities || !vacuumId) return null;
    for (const [eid, ent] of Object.entries(entities)) {
      if (
        eid.startsWith('sensor.') &&
        eid.includes('current_room') &&
        (eid.includes(vacuumName) || eid.includes('roborock') || eid.includes('vacuum'))
      ) {
        return isValidStateValue(ent?.state) ? ent.state : null;
      }
    }
    return null;
  }, [entities, vacuumId, roomFromAttr, vacuumName, getMappedSensorValue]);

  const room = roomFromAttr || roomSensorValue;
  const roomScripts = useMemo(
    () =>
      Array.isArray(settings.roomScripts) ? settings.roomScripts.filter((script) => script.entityId) : [],
    [settings.roomScripts]
  );

  if (!show) return null;
  if (!vacuumId || !entities?.[vacuumId]) return null;

  const entity = entities[vacuumId];
  const attrs = entity?.attributes || {};
  const state = entity?.state;
  const isCleaning = state === 'cleaning';
  const isReturning = state === 'returning';
  const isError = state === 'error';
  const supportedFeatures = Number(attrs.supported_features);
  const hasSupportedFeatures = Number.isFinite(supportedFeatures) && supportedFeatures > 0;
  const hasAnyFeature = (bits) =>
    hasSupportedFeatures && bits.some((bit) => (supportedFeatures & bit) === bit);

  const battery = toFiniteNumber(
    getA(vacuumId, 'battery_level') ??
      getMappedSensorValue('batterySensorId') ??
      findSensorValue(['battery_level']) ??
      findSensorValue(['battery']) ??
      findSensorValue(['soc'])
  );
  const fanSpeed = getA(vacuumId, 'fan_speed');
  const mopIntensity = getA(vacuumId, 'mop_intensity');
  const mopControlEntityId = (() => {
    const mapped = settings?.mopIntensityControlEntityId;
    if (mapped && entities?.[mapped]) return mapped;
    if (!Array.isArray(registryRelatedSelectIds) || registryRelatedSelectIds.length === 0) return null;

    const keywordRegex = /(mop|water|intensity|wet|scrub)/i;
    const match = registryRelatedSelectIds.find((entityId) => {
      const lowerId = String(entityId).toLowerCase();
      const friendly = String(entities?.[entityId]?.attributes?.friendly_name || '').toLowerCase();
      return keywordRegex.test(lowerId) || keywordRegex.test(friendly);
    });

    return match || null;
  })();
  const mopControlEntity = mopControlEntityId ? entities?.[mopControlEntityId] : null;
  const mopControlOptions = Array.isArray(mopControlEntity?.attributes?.options)
    ? mopControlEntity.attributes.options
    : [];
  const mopControlCurrent = mopControlEntity?.state;
  const canPause = hasAnyFeature([2, 4]) || !hasSupportedFeatures;
  const canStop = hasAnyFeature([4, 8]) || !hasSupportedFeatures;
  const canReturnToBase = hasAnyFeature([8, 16]) || !hasSupportedFeatures;
  const canLocate = hasAnyFeature([64, 256, 1024]) || !hasSupportedFeatures;
  const hasFanControls =
    (Array.isArray(attrs.fan_speed_list) && attrs.fan_speed_list.length > 0) ||
    isValidStateValue(fanSpeed);
  const canSetFanSpeed = hasFanControls || hasAnyFeature([16, 32]);
  const hasMopControls =
    (Array.isArray(attrs.mop_intensity_list) && attrs.mop_intensity_list.length > 0) ||
    isValidStateValue(mopIntensity) ||
    mopControlOptions.length > 0 ||
    Object.keys(attrs).some((key) => key.startsWith('mop_') || key.startsWith('water_'));
  const canSetMopIntensity = hasMopControls;

  // --- Cleaning statistics (attributes first, then related sensor entities) ---
  // Current session time
  const mappedCleaningTime = getMappedSensorWithUnit('cleaningTimeSensorId');
  const cleaningTimeRaw =
    mappedCleaningTime?.value ?? attrs.cleaning_time ?? attrs.current_clean_time ?? attrs.clean_time ?? null;
  const cleaningTimeSensor =
    cleaningTimeRaw == null
      ? (findSensorWithUnit(['cleaning_time']) ?? findSensorWithUnit(['clean_time']))
      : null;
  const cleaningTime = cleaningTimeRaw ?? cleaningTimeSensor?.value ?? null;
  const cleaningTimeUnit = mappedCleaningTime?.unit ?? cleaningTimeSensor?.unit ?? null;

  // Current session area
  const mappedCleanedArea = getMappedSensorWithUnit('cleanedAreaSensorId');
  const cleanedAreaRaw =
    mappedCleanedArea?.value ?? attrs.cleaned_area ?? attrs.current_clean_area ?? attrs.clean_area ?? null;
  const cleanedAreaSensor =
    cleanedAreaRaw == null
      ? (findSensorWithUnit(['cleaning_area']) ??
        findSensorWithUnit(['cleaned_area']) ??
        findSensorWithUnit(['clean_area']))
      : null;
  const cleanedArea = cleanedAreaRaw ?? cleanedAreaSensor?.value ?? null;
  const cleanedAreaUnit =
    mappedCleanedArea?.unit ??
    cleanedAreaSensor?.unit ??
    attrs.cleaned_area_unit ??
    attrs.current_clean_area_unit ??
    attrs.clean_area_unit ??
    null;

  // Total duration
  const mappedTotalCleanTime = getMappedSensorWithUnit('totalCleanTimeSensorId');
  const totalTimeRaw =
    mappedTotalCleanTime?.value ??
    attrs.total_cleaning_time ??
    attrs.total_clean_time ??
    attrs.total_duration ??
    null;
  const totalTimeSensor =
    totalTimeRaw == null
      ? (findSensorWithUnit(['total', 'cleaning_time']) ??
        findSensorWithUnit(['total', 'clean_time']) ??
        findSensorWithUnit(['total', 'duration']))
      : null;
  const totalCleanTime = totalTimeRaw ?? totalTimeSensor?.value ?? null;
  const totalCleanTimeUnit = mappedTotalCleanTime?.unit ?? totalTimeSensor?.unit ?? null;

  // Total area
  const mappedTotalCleanArea = getMappedSensorWithUnit('totalCleanAreaSensorId');
  const totalCleanAreaRaw =
    mappedTotalCleanArea?.value ?? attrs.total_clean_area ?? attrs.total_cleaned_area ?? null;
  const totalCleanAreaSensor =
    totalCleanAreaRaw == null
      ? (findSensorWithUnit(['total', 'clean_area']) ??
        findSensorWithUnit(['total', 'cleaned_area']))
      : null;
  const totalCleanArea = totalCleanAreaRaw ?? totalCleanAreaSensor?.value ?? null;
  const totalCleanAreaUnit =
    mappedTotalCleanArea?.unit ??
    totalCleanAreaSensor?.unit ??
    attrs.total_clean_area_unit ??
    attrs.total_cleaned_area_unit ??
    null;
  const totalCleanCount =
    getMappedSensorValue('totalCleanCountSensorId') ??
    attrs.total_clean_count ??
    attrs.clean_count ??
    findSensorValue(['total', 'clean_count']) ??
    findSensorValue(['clean_count']);
  const lastCleanStart =
    getMappedSensorValue('lastCleanStartSensorId') ??
    attrs.last_clean_start ??
    attrs.last_run_start ??
    findSensorValue(['last_clean_start']) ??
    findSensorValue(['last_run_start']);
  const lastCleanEnd =
    getMappedSensorValue('lastCleanEndSensorId') ??
    attrs.last_clean_end ??
    attrs.last_run_end ??
    findSensorValue(['last_clean_end']) ??
    findSensorValue(['last_run_end']) ??
    findSensorValue(['last_clean_time']);
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
  const fanSpeedList =
    Array.isArray(attrs.fan_speed_list) && attrs.fan_speed_list.length > 0
      ? attrs.fan_speed_list
      : ['Silent', 'Standard', 'Strong', 'Turbo'];
  const mopIntensityList =
    Array.isArray(attrs.mop_intensity_list) && attrs.mop_intensity_list.length > 0
      ? attrs.mop_intensity_list
      : ['Low', 'Medium', 'High'];
  const effectiveMopOptions = mopControlOptions.length > 0 ? mopControlOptions : mopIntensityList;
  const effectiveMopCurrent = mopControlOptions.length > 0 ? mopControlCurrent : mopIntensity;

  const setMopIntensity = (value) => {
    if (mopControlEntityId && mopControlOptions.length > 0) {
      const domain = mopControlEntityId.split('.')[0];
      if (domain === 'select' || domain === 'input_select') {
        callService(domain, 'select_option', {
          entity_id: mopControlEntityId,
          option: value,
        });
        return;
      }
    }
    callService('vacuum', 'set_mop_intensity', {
      entity_id: vacuumId,
      mop_intensity: value,
    });
  };
  const handlePrimaryAction = () => {
    if (isCleaning) {
      if (canPause) {
        callService('vacuum', 'pause', { entity_id: vacuumId });
        return;
      }
      if (canStop) {
        callService('vacuum', 'stop', { entity_id: vacuumId });
        return;
      }
    }
    callService('vacuum', 'start', { entity_id: vacuumId });
  };
  const primaryActionLabel = isCleaning
    ? canPause
      ? t('vacuum.pause')
      : t('vacuum.stop') || 'Stop'
    : t('vacuum.start');

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
  const stateLabel = getVacuumStateLabel(state, battery, t);

  return (
    <AccessibleModalShell
      open={show && !!vacuumId && !!entities?.[vacuumId]}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
          aria-label={t('common.close')}
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
              id={modalTitleId}
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
                {t('status.statusLabel')}: {stateLabel}
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
                  onClick={handlePrimaryAction}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all active:scale-[0.98] ${isCleaning ? 'hover:bg-[var(--glass-bg-hover)]' : 'hover:opacity-90'}`}
                  style={
                    isCleaning
                      ? { backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }
                      : { backgroundColor: 'var(--accent-color)', color: '#fff' }
                  }
                >
                  {isCleaning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {primaryActionLabel}
                </button>
                {canReturnToBase && (
                  <button
                    onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
                    className="flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                  >
                    <Home className="h-5 w-5" />
                    {t('vacuum.home')}
                  </button>
                )}
              </div>

              {/* Secondary Status Grid */}
              <div className={`grid w-full gap-4 ${canLocate ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Battery */}
                <div
                  className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <Battery
                    className={`h-6 w-6 ${battery != null && battery < 20 ? 'text-red-400' : 'text-green-400'}`}
                  />
                  <span className="text-xl font-light">
                    {battery != null ? `${Math.round(battery)}%` : '--'}
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
                {canLocate && (
                  <button
                    onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
                    className="group flex flex-col items-center gap-2 rounded-2xl p-4 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-[0.98]"
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
                )}
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
                        {formatRawValueWithUnit(cleaningTime, cleaningTimeUnit)}
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
                        {formatRawValueWithUnit(cleanedArea, cleanedAreaUnit)}
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
                        className="group flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-medium transition-all hover:bg-[var(--glass-bg-hover)] active:scale-[0.98]"
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
          <div className="flex flex-col justify-start space-y-6 py-2 font-sans italic lg:col-span-2">
            {canSetFanSpeed && (
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
            )}

            {canSetMopIntensity && (
              <ModernDropdown
                label={t('vacuum.mopIntensity')}
                icon={Droplets}
                options={effectiveMopOptions}
                current={effectiveMopCurrent}
                onChange={setMopIntensity}
                placeholder={t('vacuum.mopIntensity')}
                map={{}}
              />
            )}


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
                    {formatRawValueWithUnit(totalCleanTime, totalCleanTimeUnit)}
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
                    {formatRawValueWithUnit(totalCleanArea, totalCleanAreaUnit)}
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
        </>
      )}
    </AccessibleModalShell>
  );
}
