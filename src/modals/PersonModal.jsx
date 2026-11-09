import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin, Smartphone, Watch, Navigation } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
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
function getBatteryStateLabel(batteryState, t) {
  const normalized = String(batteryState || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'charging') return t('battery.charging');
  if (normalized === 'not_charging' || normalized === 'discharging')
    return t('person.batteryNotCharging');
  if (normalized === 'full') return t('person.batteryFull');
  return batteryState;
}

// Home Assistant transliterates names in entity ids (Øyvind -> oyvind), so both sides are
// normalised the same way before comparing.
const nameTokens = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

// Matches the first name only, and whole words only: a surname is shared with relatives,
// and a substring would let "Ola" claim "nikolas_phone".
function createPersonNameMatcher(friendlyName) {
  const firstName = nameTokens(
    String(friendlyName || '')
      .trim()
      .split(/\s+/)[0]
  );
  if (firstName.length === 0) return () => false;
  return (entityId, label) => {
    const tokens = new Set([...nameTokens(entityId), ...nameTokens(label)]);
    return firstName.every((part) => tokens.has(part) || tokens.has(`${part}s`));
  };
}

function BatteryMeter({ info, icon: Icon, compact = false, t }) {
  const level = Math.round(info.level);
  const tone = getBatteryTone(level);

  return (
    <div className="popup-surface rounded-2xl border border-[var(--glass-border)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-4 w-4 flex-shrink-0 ${tone}`} />
          <span className="modal-section-label truncate" title={info.sourceName || undefined}>
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
        <p className="mt-2 truncate text-xs text-[var(--text-muted)]">
          {getBatteryStateLabel(info.batteryState, t)}
        </p>
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

  const matchesPersonName = createPersonNameMatcher(entity?.attributes?.friendly_name);
  const trackersOfOtherPeople = new Set(
    Object.entries(entities || {})
      .filter(([id]) => id.startsWith('person.') && id !== personId)
      .flatMap(([, other]) => other?.attributes?.device_trackers || [])
  );

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
    const candidate = Object.values(entities).find((e) => {
      if (!e.entity_id.startsWith('device_tracker.')) return false;
      if (!e.attributes.latitude) return false;
      if (trackersOfOtherPeople.has(e.entity_id)) return false;
      return matchesPersonName(e.entity_id, e.attributes.friendly_name);
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

  const getBatteryInfo = (stateObj, label) => {
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
      label,
      sourceName: stateObj?.attributes?.friendly_name || null,
      level,
      batteryState: stateObj?.attributes?.battery_state,
    };
  };

  const phoneBatteryInfo = phoneBatteryEntityId
    ? getBatteryInfo(entities?.[phoneBatteryEntityId], t('person.phoneBattery'))
    : null;

  const watchBatteryInfo = watchBatteryEntityId
    ? getBatteryInfo(entities?.[watchBatteryEntityId], t('person.watchBattery'))
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
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

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
      const candidate = Object.values(entities).find((e) => {
        if (trackersOfOtherPeople.has(e.entity_id)) return false;
        if (!matchesPersonName(e.entity_id)) return false;
        return (
          (e.entity_id.startsWith('sensor.') && e.attributes.device_class === 'battery') ||
          e.attributes.battery_level !== undefined
        );
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
            attributionControl: true,
          }).setView([currentLat, currentLon], 14);

          tileLayerRef.current = L.tileLayer(tileUrl, {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
        : currentState === 'unavailable'
          ? t('status.unavailable')
          : currentState && currentState !== 'unknown'
            ? currentState
            : t('common.unknown');
  const sourceEntity = trackedEntityId ? entities?.[trackedEntityId] : null;
  const lastUpdated =
    sourceEntity?.last_updated ||
    sourceEntity?.last_changed ||
    entity?.last_updated ||
    entity?.last_changed;
  const lastUpdatedText = formatRelativeTime(lastUpdated, t);
  // The person entity itself is not a device, so it gets no tracker label.
  const trackerLabel =
    trackedEntityId && trackedEntityId !== personId
      ? sourceEntity?.attributes?.friendly_name || trackedEntityId
      : null;
  const discoveredBatteryLevel = parseFloat(batteryLevel);
  const discoveredBatteryInfo =
    !phoneBatteryEntityId && Number.isFinite(discoveredBatteryLevel)
      ? { label: t('person.battery'), sourceName: null, level: discoveredBatteryLevel }
      : null;
  const hasSensors =
    !!phoneBatteryInfo ||
    !!discoveredBatteryInfo ||
    !!watchBatteryInfo ||
    personExtraSensors.length > 0;
  const hasAside = hasSensors || !!trackerLabel;

  if (!show) return null;

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <style>{`
            .leaflet-container { font-family: inherit; }
            .person-map[data-map-theme='dark'] .leaflet-tile-pane {
              filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);
            }
          `}</style>
          <ModalHeader
            title={name}
            closeLabel={t('common.close')}
            onClose={onClose}
            iconStyle={{ borderRadius: '9999px', overflow: 'hidden' }}
            icon={
              picture && !pictureFailed ? (
                <img
                  src={picture}
                  alt={name}
                  className={`h-full w-full object-cover ${isHome ? '' : 'opacity-75 grayscale'}`}
                  onError={() => setPictureFailed(true)}
                />
              ) : (
                <span className="text-lg font-bold text-[var(--text-secondary)]">
                  {name?.charAt(0)}
                </span>
              )
            }
            status={
              <StatusChip
                tone={isHome ? 'on' : 'neutral'}
                label={statusLabel}
                detail={lastUpdated ? lastUpdatedText : null}
              />
            }
          />

          <ModalBody
            className={`grid grid-cols-1 items-start gap-4 sm:gap-6 ${hasAside ? 'lg:grid-cols-5' : ''}`}
          >
            <section className={`min-w-0 ${hasAside ? 'lg:col-span-3' : ''}`}>
              {currentLat && currentLon ? (
                <div className="group relative z-0 h-52 w-full overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-inner sm:h-[clamp(20rem,35vw,30rem)]">
                  <div
                    ref={mapRef}
                    data-map-theme={isLightTheme ? 'light' : 'dark'}
                    className="person-map z-0 h-full w-full opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="pointer-events-none absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)]/85 px-4 py-2 shadow-lg backdrop-blur-md">
                    <Navigation className="h-3 w-3 text-[var(--accent-color)]" />
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
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
                  <span className="modal-section-label">{t('map.locationUnknown')}</span>
                </div>
              )}
            </section>

            {hasAside && (
              <aside className="space-y-4 lg:col-span-2">
                {trackerLabel && (
                  <div className="popup-surface rounded-2xl border border-[var(--glass-border)] p-4">
                    <p className="modal-section-label">{t('person.deviceTracker')}</p>
                    <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {trackerLabel}
                    </p>
                  </div>
                )}

                {phoneBatteryInfo && (
                  <BatteryMeter info={phoneBatteryInfo} icon={Smartphone} t={t} />
                )}
                {discoveredBatteryInfo && (
                  <BatteryMeter info={discoveredBatteryInfo} icon={Smartphone} t={t} />
                )}
                {watchBatteryInfo && (
                  <BatteryMeter info={watchBatteryInfo} icon={Watch} compact t={t} />
                )}

                {hasSensors && personExtraSensors.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {personExtraSensors.map((sensor) => (
                      <div
                        key={sensor.id}
                        className="popup-surface rounded-2xl border border-[var(--glass-border)] p-4"
                      >
                        <span className="modal-section-label block truncate">{sensor.label}</span>
                        <span className="mt-2 block truncate text-2xl font-light text-[var(--text-primary)]">
                          {sensor.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
