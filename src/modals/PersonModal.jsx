import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Clock, Smartphone, Watch, Activity, Navigation } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import {
  getEffectiveUnitMode,
  inferUnitKind,
  getDisplayUnitForKind,
  convertValueByKind,
  formatUnitValue,
  formatRelativeTime,
} from '../utils';

function getBatteryTone(level) {
  if (level < 20) return 'text-[var(--status-error-fg)]';
  if (level < 50) return 'text-[var(--status-warning-fg)]';
  return 'text-[var(--status-success-fg)]';
}
function BatteryMeter({ info, icon: Icon, compact = false }) {
  const level = Math.round(info.level);
  const tone = getBatteryTone(level);

  return (
    <div className="popup-surface rounded-2xl border border-[var(--glass-border)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-4 w-4 flex-shrink-0 ${tone}`} />
          <span className="truncate text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            {info.label}
          </span>
        </div>
        <span className={`text-sm font-bold ${tone}`}>{level}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--glass-bg)]">
        <div
          className={`h-full rounded-full ${
            level < 20
              ? 'bg-[var(--status-error-fg)]'
              : level < 50
                ? 'bg-[var(--status-warning-fg)]'
                : 'bg-[var(--status-success-fg)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
      </div>
      {!compact && info.batteryState && (
        <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{info.batteryState}</p>
      )}
    </div>
  );
}

export default function PersonModal({
  show,
  onClose,
  personId,
  entity,
  entities,
  customName,
  getEntityImageUrl,
  conn: _conn,
  t,
  settings,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const name = customName || entity?.attributes?.friendly_name || personId;
  const picture = getEntityImageUrl ? getEntityImageUrl(entity?.attributes?.entity_picture) : null;
  const [pictureFailed, setPictureFailed] = useState(false);
  const modalTitleId = `person-modal-title-${(personId || 'person').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  useEffect(() => {
    setPictureFailed(false);
  }, [picture]);

  // Settings overrides
  const manualTrackerId = settings?.deviceTracker;
  const manualBatteryId = settings?.batteryEntity;

  // Determine best entity for tracking
  let trackedEntityId = personId;
  let currentLat = entity?.attributes?.latitude;
  let currentLon = entity?.attributes?.longitude;

  // 1. Check for manual Device Tracker override
  if (manualTrackerId && entities?.[manualTrackerId]) {
    const tracker = entities[manualTrackerId];
    trackedEntityId = manualTrackerId; // Use this for history
    if (tracker.attributes.latitude && tracker.attributes.longitude) {
      currentLat = tracker.attributes.latitude;
      currentLon = tracker.attributes.longitude;
    }
  }
  // 2. Check for linked Source (e.g. device_tracker from person attributes)
  // This usually provides better GPS history than the person entity itself
  else if (entity?.attributes?.source && entities?.[entity.attributes.source]) {
    trackedEntityId = entity.attributes.source;
    const sourceEntity = entities[entity.attributes.source];
    // Prefer source location if person entity location is missing (rare) or identical
    if (!currentLat) {
      currentLat = sourceEntity.attributes.latitude;
      currentLon = sourceEntity.attributes.longitude;
    }
  }

  // 3. Fallback: Automatic Discovery (if no location yet)
  if ((!currentLat || !currentLon) && entities && trackedEntityId === personId) {
    // ... same fallback logic, but make sure we update trackedEntityId ...
    const personName = entity?.attributes?.friendly_name || '';
    const nameParts = personName.toLowerCase().split(' ');
    const candidate = Object.values(entities).find((e) => {
      if (!e.entity_id.startsWith('device_tracker.')) return false;
      if (!e.attributes.latitude) return false;
      const tName = (e.attributes.friendly_name || '').toLowerCase();
      const tId = e.entity_id.toLowerCase();
      return nameParts.some(
        (part) => part.length > 2 && (tName.includes(part) || tId.includes(part))
      );
    });
    if (candidate) {
      currentLat = candidate.attributes.latitude;
      currentLon = candidate.attributes.longitude;
      trackedEntityId = candidate.entity_id;
    }
  }

  // Resolve Battery
  const currentState = entity?.state;
  let batteryLevel = entity?.attributes?.battery_level;
  const phoneBatteryEntityId = settings?.phoneBatteryEntity || manualBatteryId || null;
  const watchBatteryEntityId = settings?.watchBatteryEntity || null;
  const personExtraSensorIds = Array.isArray(settings?.personExtraSensors)
    ? settings.personExtraSensors.filter((id) => typeof id === 'string')
    : [];

  const getBatteryInfo = (stateObj, fallbackLabel) => {
    if (!stateObj) return null;
    const attrLevel = parseFloat(stateObj?.attributes?.battery_level);
    const stateLevel = parseFloat(stateObj?.state);
    const level = Number.isFinite(attrLevel)
      ? attrLevel
      : Number.isFinite(stateLevel)
        ? stateLevel
        : null;
    if (!Number.isFinite(level)) return null;
    return {
      label: fallbackLabel,
      level,
      batteryState: stateObj?.attributes?.battery_state,
    };
  };

  const phoneBatteryInfo = phoneBatteryEntityId
    ? getBatteryInfo(
        entities?.[phoneBatteryEntityId],
        entities?.[phoneBatteryEntityId]?.attributes?.friendly_name || t('person.phoneBattery')
      )
    : null;

  const watchBatteryInfo = watchBatteryEntityId
    ? getBatteryInfo(
        entities?.[watchBatteryEntityId],
        entities?.[watchBatteryEntityId]?.attributes?.friendly_name || t('person.watchBattery')
      )
    : null;

  const personExtraSensors = personExtraSensorIds
    .map((sensorId) => {
      const sensor = entities?.[sensorId];
      if (!sensor) return null;
      const unit =
        typeof sensor?.attributes?.unit_of_measurement === 'string'
          ? sensor.attributes.unit_of_measurement
          : '';
      const state = sensor?.state;
      const numericState =
        state !== null && state !== undefined && !Number.isNaN(parseFloat(state))
          ? parseFloat(state)
          : null;
      const inferredKind = inferUnitKind(sensor?.attributes?.device_class, unit);
      const convertedNumeric =
        numericState !== null && inferredKind
          ? convertValueByKind(numericState, {
              kind: inferredKind,
              fromUnit: unit,
              unitMode: effectiveUnitMode,
            })
          : numericState;
      const displayUnit =
        numericState !== null && inferredKind
          ? getDisplayUnitForKind(inferredKind, effectiveUnitMode)
          : unit;
      const stateText =
        numericState !== null
          ? `${formatUnitValue(convertedNumeric, { fallback: '--' })}${displayUnit ? ` ${displayUnit}` : ''}`
          : String(state ?? '-');
      return {
        id: sensorId,
        label: sensor?.attributes?.friendly_name || sensorId,
        value: stateText,
      };
    })
    .filter(Boolean);

  const isLightTheme =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  const tileUrl = isLightTheme
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // 1. Manual Override
  if (manualBatteryId && entities?.[manualBatteryId]) {
    const batEntity = entities[manualBatteryId];
    const val = parseInt(batEntity.state);
    if (!isNaN(val)) {
      batteryLevel = val;
    } else if (batEntity.attributes.battery_level !== undefined) {
      batteryLevel = batEntity.attributes.battery_level;
    }
  }
  // 2. Automatic Discovery
  else if (batteryLevel === undefined && entities) {
    const source = entity?.attributes?.source;
    if (source && entities[source]?.attributes?.battery_level !== undefined) {
      batteryLevel = entities[source].attributes.battery_level;
    } else {
      const personName = entity?.attributes?.friendly_name || '';
      const nameParts = personName.toLowerCase().split(' ');
      const candidate = Object.values(entities).find((e) => {
        if (
          e.entity_id.startsWith('sensor.') &&
          e.attributes.device_class === 'battery' &&
          nameParts.some((part) => e.entity_id.includes(part))
        )
          return true;
        if (
          e.attributes.battery_level !== undefined &&
          nameParts.some((part) => e.entity_id.includes(part))
        )
          return true;
        return false;
      });
      if (candidate) {
        if (candidate.entity_id.startsWith('sensor.')) {
          const val = parseInt(candidate.state);
          if (!isNaN(val)) batteryLevel = val;
        } else {
          batteryLevel = candidate.attributes.battery_level;
        }
      }
    }
  }

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const mapTimerRef = useRef(null);

  // Map Initialization & Updates
  useEffect(() => {
    if (!show || !currentLat || !currentLon) return undefined;

    let cancelled = false;

    // Leaflet is only needed when the map is actually opened, so it is loaded
    // on demand instead of shipping in the main bundle.
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      const timer = setTimeout(() => {
        if (cancelled || !mapRef.current) return;

        // Init Map
        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
          }).setView([currentLat, currentLon], 14);

          tileLayerRef.current = L.tileLayer(tileUrl, {
            subdomains: 'abcd',
            maxZoom: 19,
          }).addTo(map);

          mapInstanceRef.current = map;
          // Invalidate size to ensure it fills container
          setTimeout(() => map.invalidateSize(), 100);
        } else {
          const hasDifferentLayer = tileLayerRef.current?._url !== tileUrl;
          if (hasDifferentLayer) {
            tileLayerRef.current?.remove();
            tileLayerRef.current = L.tileLayer(tileUrl, {
              subdomains: 'abcd',
              maxZoom: 19,
            }).addTo(mapInstanceRef.current);
          }
          mapInstanceRef.current.setView([currentLat, currentLon]);
        }

        const map = mapInstanceRef.current;

        // Current Position Marker
        if (markerRef.current) markerRef.current.remove();

        const icon = L.divIcon({
          className: 'custom-person-marker',
          html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59,130,246,0.6);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        markerRef.current = L.marker([currentLat, currentLon], { icon }).addTo(map);

        map.setView([currentLat, currentLon], 14);
      }, 200); // Slight delay for modal animation

      mapTimerRef.current = timer;
    };

    initMap().catch((error) => {
      if (!cancelled) console.warn('Failed to load person map:', error);
    });

    return () => {
      cancelled = true;
      if (mapTimerRef.current) {
        clearTimeout(mapTimerRef.current);
        mapTimerRef.current = null;
      }
    };
  }, [show, currentLat, currentLon, tileUrl]);

  useEffect(() => {
    if (!show && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    }
  }, [show]);

  const isHome = currentState === 'home';
  const statusLabel =
    currentState === 'home'
      ? t('status.home')
      : currentState === 'not_home'
        ? t('status.notHome')
        : currentState || t('common.unknown');
  const sourceEntity = trackedEntityId ? entities?.[trackedEntityId] : null;
  const lastUpdated =
    sourceEntity?.last_updated ||
    sourceEntity?.last_changed ||
    entity?.last_updated ||
    entity?.last_changed;
  const lastUpdatedText = formatRelativeTime(lastUpdated, t);
  const trackerLabel =
    sourceEntity?.attributes?.friendly_name ||
    (trackedEntityId && trackedEntityId !== personId ? trackedEntityId : null);
  const hasSensors = !!phoneBatteryInfo || !!watchBatteryInfo || personExtraSensors.length > 0;

  if (!show) return null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim custom-scrollbar relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border p-4 font-sans shadow-2xl backdrop-blur-xl sm:max-h-[85vh] sm:p-6 md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            .leaflet-container { font-family: inherit; }
          `}</style>
          <div className="absolute top-4 right-4 z-20 flex gap-3 sm:top-6 sm:right-6 md:top-10 md:right-10">
            <button onClick={onClose} className="modal-close" aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-3 pr-12 sm:mb-6 sm:gap-4">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg sm:h-16 sm:w-16">
              {picture && !pictureFailed ? (
                <img
                  src={picture}
                  alt={name}
                  className={`h-full w-full object-cover transition-transform duration-700 hover:scale-110 ${isHome ? '' : 'opacity-75 grayscale'}`}
                  onError={() => setPictureFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--text-secondary)]">
                  {name?.charAt(0)}
                </div>
              )}
              <div
                className="absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--card-bg)]"
                style={{ backgroundColor: isHome ? 'var(--status-success-fg)' : '#71717a' }}
              />
            </div>
            <div className="min-w-0">
              <h3
                id={modalTitleId}
                className="truncate text-xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic sm:text-3xl"
              >
                {name}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                    isHome
                      ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase italic">
                    {statusLabel}
                  </span>
                </div>
                {lastUpdated && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">
                      {lastUpdatedText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid h-full grid-cols-1 items-start gap-3 sm:gap-6 lg:grid-cols-5">
            <section className="min-w-0 lg:col-span-3">
              {currentLat && currentLon ? (
                <div className="group relative z-0 h-52 w-full overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-inner sm:h-[clamp(20rem,35vw,30rem)]">
                  <div
                    ref={mapRef}
                    className="z-0 h-full w-full opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="pointer-events-none absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)]/85 px-4 py-2 shadow-lg backdrop-blur-md">
                    <Navigation className="h-3 w-3 text-[var(--accent-color)]" />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                        {t('map.lastSeenHere')}
                      </span>
                      {trackerLabel && (
                        <span className="block max-w-[16rem] truncate text-xs text-[var(--text-primary)]">
                          {trackerLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/50 p-4 text-center sm:h-[clamp(20rem,35vw,30rem)] sm:p-6">
                  <MapPin className="mb-4 h-16 w-16 opacity-20" />
                  <span className="text-xs font-bold tracking-widest uppercase opacity-50">
                    {t('map.locationUnknown')}
                  </span>
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:col-span-2">
              <div className="popup-surface rounded-2xl border border-[var(--glass-border)]/50 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-primary)]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      {t('person.lastUpdated')}
                    </p>
                    <p className="truncate text-lg font-semibold text-[var(--text-primary)]">
                      {lastUpdatedText}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                    <p className="text-[9px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      {t('person.currentStatus')}
                    </p>
                    <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {statusLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                    <p className="text-[9px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      {t('person.deviceTracker')}
                    </p>
                    <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {trackerLabel || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {phoneBatteryInfo && <BatteryMeter info={phoneBatteryInfo} icon={Smartphone} />}
              {watchBatteryInfo && <BatteryMeter info={watchBatteryInfo} icon={Watch} compact />}

              {hasSensors && personExtraSensors.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {personExtraSensors.map((sensor) => (
                    <div
                      key={sensor.id}
                      className="popup-surface rounded-2xl border border-[var(--glass-border)] p-4"
                    >
                      <span className="block truncate text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                        {sensor.label}
                      </span>
                      <span className="mt-2 block truncate text-2xl font-light text-[var(--text-primary)]">
                        {sensor.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
