import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Battery, Clock } from '../icons';
import { getHistory } from '../services';

export default function PersonModal({
  show,
  onClose,
  personId,
  entity,
  entities,
  customName,
  getEntityImageUrl,
  conn,
  t,
  settings
}) {
  const name = customName || entity?.attributes?.friendly_name || personId;
  const picture = getEntityImageUrl ? getEntityImageUrl(entity?.attributes?.entity_picture) : null;
  const showHistory = settings?.showHistory || false;
  const showLastUpdated = settings?.showLastUpdated !== false;
  const showTrackerTelemetry = settings?.showTrackerTelemetry !== false;
  const showDistanceFromHome = settings?.showDistanceFromHome !== false;
  const emphasizeZone = settings?.emphasizeZone !== false;

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
      const candidate = Object.values(entities).find(e => {
          if (!e.entity_id.startsWith('device_tracker.')) return false;
          if (!e.attributes.latitude) return false;
          const tName = (e.attributes.friendly_name || '').toLowerCase();
          const tId = e.entity_id.toLowerCase();
          return nameParts.some(part => part.length > 2 && (tName.includes(part) || tId.includes(part)));
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
  let batteryState = entity?.attributes?.battery_state;
  const trackedEntity = entities?.[trackedEntityId];
  const gpsAccuracy = trackedEntity?.attributes?.gps_accuracy;
  const speed = trackedEntity?.attributes?.speed;
  const heading = trackedEntity?.attributes?.course ?? trackedEntity?.attributes?.heading;
  const speedUnit = trackedEntity?.attributes?.unit_of_measurement || 'km/h';
  const lastUpdatedRaw = trackedEntity?.last_updated || entity?.last_updated;

  const homeLat = entities?.['zone.home']?.attributes?.latitude;
  const homeLon = entities?.['zone.home']?.attributes?.longitude;

  const distanceFromHomeKm = useMemo(() => {
    if (!showDistanceFromHome || !currentLat || !currentLon || !homeLat || !homeLon) return null;

    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latDelta = toRadians(homeLat - currentLat);
    const lonDelta = toRadians(homeLon - currentLon);
    const fromLat = toRadians(currentLat);
    const toLat = toRadians(homeLat);

    const a = (Math.sin(latDelta / 2) ** 2)
      + (Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }, [showDistanceFromHome, currentLat, currentLon, homeLat, homeLon]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdatedRaw) return null;
    const parsed = new Date(lastUpdatedRaw);
    if (Number.isNaN(parsed.getTime())) return null;

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  }, [lastUpdatedRaw]);

  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  const tileUrl = isLightTheme
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // 1. Manual Override
  if (manualBatteryId && entities?.[manualBatteryId]) {
      const batEntity = entities[manualBatteryId];
      const val = parseInt(batEntity.state);
      if (!isNaN(val)) {
          batteryLevel = val;
          batteryState = batEntity.attributes?.battery_state;
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
            const candidate = Object.values(entities).find(e => {
               if (e.entity_id.startsWith('sensor.') && e.attributes.device_class === 'battery' && nameParts.some(part => e.entity_id.includes(part))) return true;
               if (e.attributes.battery_level !== undefined && nameParts.some(part => e.entity_id.includes(part))) return true;
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

  // History Fetching
  const [historyPoints, setHistoryPoints] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  
  useEffect(() => {
    if (!show || !showHistory || !conn || !trackedEntityId) return;
    
    // Reset history when modal opens
    setHistoryPoints([]);

    const fetchHistory = async () => {
        const start = new Date();
        start.setHours(start.getHours() - 24);
        const end = new Date();
        
        try {
            const history = await getHistory(conn, { 
                start, 
                end, 
                entityId: trackedEntityId, 
                minimal_response: false, 
                no_attributes: false 
            });
            // Filter points
            const points = history.filter(pt => pt.attributes?.latitude && pt.attributes?.longitude);
            // Reverse for list display (newest first), but keep order for map lines if needed by sorting
            points.sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated));
            setHistoryPoints(points);
        } catch (e) {
            console.error("History fetch error", e);
        }
    };
    fetchHistory();
  }, [show, showHistory, conn, trackedEntityId]);


  // Map Initialization & Updates
  useEffect(() => {
    if (!show || !currentLat || !currentLon) return;

    const timer = setTimeout(() => {
       if (!mapRef.current) return;

       // Init Map
       if (!mapInstanceRef.current) {
           const map = L.map(mapRef.current, {
               zoomControl: false,
               attributionControl: false
           }).setView([currentLat, currentLon], 14);
           
           tileLayerRef.current = L.tileLayer(tileUrl, {
               subdomains: 'abcd',
               maxZoom: 19
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
                maxZoom: 19
              }).addTo(mapInstanceRef.current);
            }
            // Only update view if we are not fitting bounds to history
            if (!showHistory || historyPoints.length === 0) {
                 mapInstanceRef.current.setView([currentLat, currentLon]);
            }
       }

       const map = mapInstanceRef.current;

       // Current Position Marker
       if (markerRef.current) markerRef.current.remove();
       
       const icon = L.divIcon({
           className: 'custom-person-marker',
           html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59,130,246,0.6);"></div>`,
           iconSize: [14, 14],
           iconAnchor: [7, 7]
       });
       
       markerRef.current = L.marker([currentLat, currentLon], { icon }).addTo(map);

       // History Path
       if (pathRef.current) pathRef.current.remove();
       
       if (showHistory && historyPoints.length > 0) {
           const latlngs = historyPoints.map(pt => [pt.attributes.latitude, pt.attributes.longitude]);
           latlngs.push([currentLat, currentLon]); // Add current pos as last point
           
           pathRef.current = L.polyline(latlngs, {
               color: '#3b82f6', 
               weight: 3, 
               opacity: 0.6,
               dashArray: '5, 10',
               lineCap: 'round'
           }).addTo(map);

           // Fit bounds to show history + current
           if (latlngs.length > 1) {
               try {
                  const bounds = L.latLngBounds(latlngs);
                  map.fitBounds(bounds, { padding: [40, 40] });
               } catch(e) { console.error("Map bounds error", e); }
           }
       } else {
           // Reset view to current if no history
           map.setView([currentLat, currentLon], 14);
       }

    }, 200); // Slight delay for modal animation

    return () => clearTimeout(timer);
  }, [show, currentLat, currentLon, showHistory, historyPoints, tileUrl]);

  useEffect(() => {
     if (!show && mapInstanceRef.current) {
         mapInstanceRef.current.remove();
         mapInstanceRef.current = null;
         markerRef.current = null;
         pathRef.current = null;
         tileLayerRef.current = null;
     }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
         style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
         onClick={onClose}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .dynamic-map { height: min(52vh, 460px); min-height: 260px; }
        @media (min-width: 640px) { .dynamic-map { min-height: 320px; } }
        @media (min-width: 1024px) { .dynamic-map { height: min(58vh, 520px); min-height: 420px; } }
        .leaflet-container { font-family: inherit; }
      `}</style>
      {/* Compact Container */}
      <div className="border w-full max-w-[1240px] max-h-[82vh] rounded-3xl shadow-2xl relative font-sans flex flex-col overflow-hidden popup-anim"
           style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-black/10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
                {picture ? (
                  <img src={picture} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                    {name.substring(0, 1)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none truncate">{name}</h3>
              <div className={`mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2 ${emphasizeZone ? 'text-[11px]' : 'text-[10px]'}`} style={{ backgroundColor: emphasizeZone ? 'var(--glass-bg-hover)' : 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
                <MapPin className="w-3 h-3" />
                <span className={`uppercase font-bold italic tracking-widest ${emphasizeZone ? 'text-[11px]' : 'text-[10px]'}`}>
                  {currentState === 'home' ? t('status.home') : currentState === 'not_home' ? t('status.notHome') : currentState}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-start">
            <div className="space-y-4 lg:col-span-3 lg:max-h-[58vh] lg:overflow-y-auto custom-scrollbar lg:pr-2">
              {batteryLevel !== undefined && (
                <div className="px-4 py-3 rounded-xl popup-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Battery className={`w-4 h-4 ${batteryLevel < 20 ? 'text-red-400' : 'text-green-400'}`} />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('person.battery')}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{batteryLevel}%</span>
                    {batteryState && <span className="text-[10px] text-gray-400 font-mono">({batteryState})</span>}
                  </div>
                </div>
              )}

              {showLastUpdated && formattedLastUpdated && (
                <div className="px-4 py-3 rounded-xl popup-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('person.lastUpdated')}</span>
                  </div>
                  <span className="text-xs text-[var(--text-primary)] font-mono">
                    {formattedLastUpdated}
                  </span>
                </div>
              )}

              {showTrackerTelemetry && (gpsAccuracy !== undefined || speed !== undefined || heading !== undefined) && (
                <div className="px-4 py-3 rounded-xl popup-surface">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">{t('person.trackerTelemetry')}</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {gpsAccuracy !== undefined && <div><span className="text-[var(--text-secondary)]">{t('person.gpsAccuracy')}: </span><span className="font-semibold">{gpsAccuracy} m</span></div>}
                    {speed !== undefined && <div><span className="text-[var(--text-secondary)]">{t('person.speed')}: </span><span className="font-semibold">{speed} {speedUnit}</span></div>}
                    {heading !== undefined && <div><span className="text-[var(--text-secondary)]">{t('person.heading')}: </span><span className="font-semibold">{heading}°</span></div>}
                  </div>
                </div>
              )}

              {showDistanceFromHome && Number.isFinite(distanceFromHomeKm) && (
                <div className="px-4 py-3 rounded-xl popup-surface flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('person.distanceFromHome')}</span>
                  <span className="text-sm font-semibold">{distanceFromHomeKm < 1 ? `${Math.round(distanceFromHomeKm * 1000)} m` : `${distanceFromHomeKm.toFixed(1)} km`}</span>
                </div>
              )}

              {showHistory && historyPoints.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {t('person.historyTitle')}
                  </h4>
                  <div className="space-y-1">
                    {historyPoints.map((pt, i) => (
                      <div key={pt.last_updated || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                        <span className="text-xs font-mono text-gray-400">{new Date(pt.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-gray-300 truncate">
                          {pt.state === 'home' ? t('status.home') : pt.state === 'not_home' ? t('status.notHome') : pt.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-9">
              {currentLat && currentLon ? (
                <div className="w-full dynamic-map rounded-xl overflow-hidden relative group border border-[var(--glass-border)] bg-[var(--glass-bg)] z-0">
                  <div ref={mapRef} className="w-full h-full z-0" />
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-[var(--glass-border)] text-center text-sm text-[var(--text-secondary)] italic">
                  {t('map.locationUnknown')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
