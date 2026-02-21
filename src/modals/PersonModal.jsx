import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Battery } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { getEffectiveUnitMode, inferUnitKind, getDisplayUnitForKind, convertValueByKind, formatUnitValue } from '../utils';

export default function PersonModal({
  show,
  onClose,
  personId,
  entity,
  entities,
  customName,
  getEntityImageUrl,
  _conn,
  t,
  settings
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const name = customName || entity?.attributes?.friendly_name || personId;
  const picture = getEntityImageUrl ? getEntityImageUrl(entity?.attributes?.entity_picture) : null;

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
  const phoneBatteryEntityId = settings?.phoneBatteryEntity || manualBatteryId || null;
  const watchBatteryEntityId = settings?.watchBatteryEntity || null;
  const personExtraSensorIds = Array.isArray(settings?.personExtraSensors)
    ? settings.personExtraSensors.filter((id) => typeof id === 'string')
    : [];

  const getBatteryInfo = (stateObj, fallbackLabel) => {
    if (!stateObj) return null;
    const attrLevel = parseFloat(stateObj?.attributes?.battery_level);
    const stateLevel = parseFloat(stateObj?.state);
    const level = Number.isFinite(attrLevel) ? attrLevel : (Number.isFinite(stateLevel) ? stateLevel : null);
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
      const unit = typeof sensor?.attributes?.unit_of_measurement === 'string'
        ? sensor.attributes.unit_of_measurement
        : '';
      const state = sensor?.state;
      const numericState = state !== null && state !== undefined && !Number.isNaN(parseFloat(state))
        ? parseFloat(state)
        : null;
      const inferredKind = inferUnitKind(sensor?.attributes?.device_class, unit);
      const convertedNumeric = numericState !== null && inferredKind
        ? convertValueByKind(numericState, {
          kind: inferredKind,
          fromUnit: unit,
          unitMode: effectiveUnitMode,
        })
        : numericState;
      const displayUnit = numericState !== null && inferredKind
        ? getDisplayUnitForKind(inferredKind, effectiveUnitMode)
        : unit;
      const stateText = numericState !== null
        ? `${formatUnitValue(convertedNumeric, { fallback: '--' })}${displayUnit ? ` ${displayUnit}` : ''}`
        : String(state ?? '-');
      return {
        id: sensorId,
        label: sensor?.attributes?.friendly_name || sensorId,
        value: stateText,
      };
    })
    .filter(Boolean);

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

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);


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
              mapInstanceRef.current.setView([currentLat, currentLon]);
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

         map.setView([currentLat, currentLon], 14);

    }, 200); // Slight delay for modal animation

    return () => clearTimeout(timer);
  }, [show, currentLat, currentLon, tileUrl]);

  useEffect(() => {
     if (!show && mapInstanceRef.current) {
         mapInstanceRef.current.remove();
         mapInstanceRef.current = null;
         markerRef.current = null;
         tileLayerRef.current = null;
     }
  }, [show]);

  const hasSensors = !!phoneBatteryInfo || !!watchBatteryInfo || personExtraSensors.length > 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
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
      <div className="border w-full max-w-5xl max-h-[85vh] rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans overflow-y-auto backdrop-blur-xl popup-anim custom-scrollbar"
           style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
           onClick={(e) => e.stopPropagation()}>
        
        <div className="absolute top-6 right-6 md:top-10 md:right-10 flex gap-3 z-20">
            <button onClick={onClose} className="modal-close"><X className="w-4 h-4" /></button>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg border border-[var(--glass-border)] relative group">
            {picture ? (
               <img src={picture} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
               <div className="w-full h-full flex items-center justify-center bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                 <span className="text-xl font-bold">{name?.charAt(0)}</span>
               </div>
            )}
          </div>
          <div>
            <h3 className="text-3xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
              {name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
               <div className={`px-3 py-1 rounded-full inline-flex items-center gap-2 transition-all duration-500 border border-[var(--glass-border)] ${
                    currentState === 'home' ? 'bg-green-500/10 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
               }`}>
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold italic tracking-widest">
                    {currentState === 'home' ? t('status.home') : currentState === 'not_home' ? t('status.notHome') : currentState}
                  </span>
               </div>
               {phoneBatteryInfo && (
                   <div className={`px-3 py-1 rounded-full inline-flex items-center gap-2 border border-[var(--glass-border)] ${
                        phoneBatteryInfo.level < 20 ? 'bg-red-500/10 text-red-400' : 'bg-[var(--glass-bg)] text-gray-500'
                   }`}>
                      <Battery className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">{Math.round(phoneBatteryInfo.level)}%</span>
                   </div>
               )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start font-sans h-full">
           
           {/* Left Column - Map (Span 3) */}
           <div className={`${hasSensors ? 'lg:col-span-3' : 'lg:col-span-5'} h-full min-h-[300px]`}>
              {currentLat && currentLon ? (
                <div className="w-full h-[clamp(20rem,35vw,30rem)] rounded-2xl overflow-hidden relative group border border-[var(--glass-border)] bg-[var(--glass-bg)] z-0 shadow-inner">
                  <div ref={mapRef} className="w-full h-full z-0 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-md bg-black/60 shadow-lg flex items-center gap-2 pointer-events-none z-[1000]">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white">
                         {t('map.lastSeenHere')}
                      </span>
                  </div>
                </div>
              ) : (
                <div className="h-[clamp(20rem,35vw,30rem)] flex flex-col items-center justify-center p-6 rounded-2xl border border-[var(--glass-border)] text-center bg-[var(--glass-bg)]/50">
                    <MapPin className="w-16 h-16 opacity-20 mb-4" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">{t('map.locationUnknown')}</span>
                </div>
              )}
           </div>

           {/* Right Column - Stats (Span 2) */}
           <div className="lg:col-span-2 space-y-4">
              
              {/* Primary Battery Status */}
              {phoneBatteryInfo && (
                 <div className="p-6 rounded-2xl popup-surface flex flex-col items-center gap-2 transition-all border border-[var(--glass-border)]/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">{phoneBatteryInfo.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-light italic ${
                            phoneBatteryInfo.level < 20 ? 'text-red-400' : 'text-[var(--text-primary)]'
                        }`}>
                          {Math.round(phoneBatteryInfo.level)}
                        </span>
                        <span className="text-xl text-gray-500 font-medium">%</span>
                    </div>
                    <div className="w-full bg-gray-700/30 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${
                                phoneBatteryInfo.level < 20 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, phoneBatteryInfo.level))}%` }} 
                        />
                    </div>
                 </div>
              )}

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {watchBatteryInfo && (
                    <div className="p-4 rounded-2xl popup-surface flex flex-col items-center justify-center gap-1 border border-[var(--glass-border)]/50">
                        <div className="flex items-center gap-2 mb-1 opacity-70">
                             <span className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em]">{watchBatteryInfo.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-light text-[var(--text-primary)]">{Math.round(watchBatteryInfo.level)}</span>
                           <span className="text-xs text-gray-500 font-bold">%</span>
                        </div>
                    </div>
                 )}
                 
                 {personExtraSensors.map((sensor) => (
                    <div key={sensor.id} className="p-4 rounded-2xl popup-surface flex flex-col items-center justify-center gap-1 border border-[var(--glass-border)]/50 text-center">
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mb-1 truncate w-full">{sensor.label}</span>
                        <span className="text-xl font-light text-[var(--text-primary)]">{sensor.value}</span>
                    </div>
                 ))}
              </div>

           </div>
        
        </div>
      </div>
    </div>
  );
}
