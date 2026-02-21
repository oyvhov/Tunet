import React, { useMemo, useState } from 'react';
import { X, Lightbulb, Thermometer, Eye, Droplets, Flame, Power, ChevronRight } from 'lucide-react';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode, inferUnitKind } from '../utils';

/**
 * RoomModal – Detailed view of a room / area.
 * Shows all entities grouped by domain with quick controls.
 */
export default function RoomModal({
  show,
  onClose,
  settings,
  entities,
  conn,
  callService,
  t,
}) {
  const [filter, setFilter] = useState('all');
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);

  const areaName = settings?.areaName || t('room.defaultName');
  const roomEntityIdList = Array.isArray(settings?.entityIds) ? settings.entityIds : [];
  const roomEntityIds = useMemo(() => {
    // Only show "key" entities in modal if the user requested simplified view
    // Filtering logic: Light, Climate, Switch, Cover, Media Player.
    // Skip sensors and binary_sensors usually, unless configured otherwise?
    // The user said "Modalen skal ikkje vise alle enitetane i rommet".
    // Let's filter out diagnostic/config sensors if they are too generic. 
    // For now, let's keep it simple: Show 'control' domains + basic Temp/Motion.
    const all = roomEntityIdList;
    
    // Simple filter: Include only interesting domains
    const interestingDomains = ['light', 'climate', 'switch', 'cover', 'fan', 'media_player', 'vacuum', 'lock'];
    
    // Also include 'user selected' sensors (Temp/Humidity) if explicitly needed?
    // But usually sensors are just informational. The user probably means "don't list 50 sensors".
    // Let's create two lists: Controls and "Key Sensors"
    
     return all.filter(id => {
       const domain = id.split('.')[0];
       // Always show controls
       if (interestingDomains.includes(domain)) return true;
       // Show sensors if they seem important (temp, humidity, motion, occupancy, illuminance)
       if (domain === 'sensor') {
         const deviceClass = entities[id]?.attributes?.device_class;
         return ['temperature', 'humidity', 'illuminance', 'power', 'energy', 'battery'].includes(deviceClass);
       }
       if (domain === 'binary_sensor') {
         const deviceClass = entities[id]?.attributes?.device_class;
         return ['motion', 'occupancy', 'opening', 'presence', 'door', 'window', 'garage_door'].includes(deviceClass);
       }
       return false;
     });
  }, [roomEntityIdList, entities]);

  // Group entities by domain
  const grouped = useMemo(() => {
    const groups = {};
    roomEntityIds.forEach(id => {
      const entity = entities[id];
      if (!entity) return;
      const domain = id.split('.')[0];
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push({ id, entity });
    });
    return groups;
  }, [roomEntityIds, entities]);

  const domainLabels = {
    light: { label: t('room.domain.light'), icon: Lightbulb, color: 'text-amber-400' },
    sensor: { label: t('room.domain.sensor'), icon: Thermometer, color: 'text-[var(--accent-color)]' },
    binary_sensor: { label: t('room.domain.binarySensor'), icon: Eye, color: 'text-green-400' },
    climate: { label: t('room.domain.climate'), icon: Flame, color: 'text-red-400' },
    switch: { label: t('room.domain.switch'), icon: Power, color: 'text-purple-400' },
    cover: { label: t('room.domain.cover'), icon: ChevronRight, color: 'text-teal-400' },
    fan: { label: t('room.domain.fan'), icon: Droplets, color: 'text-cyan-400' },
  };

  const domains = Object.keys(grouped).sort((a, b) => {
    const order = ['light', 'climate', 'switch', 'sensor', 'binary_sensor', 'cover', 'fan'];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const filteredDomains = filter === 'all' ? domains : domains.filter(d => d === filter);

  if (!show) return null;

  // Count lights on
  const lightEntities = grouped['light'] || [];
  const lightsOn = lightEntities.filter(e => e.entity.state === 'on').length;

  const handleToggleEntity = (entityId, domain) => {
    if (!conn || !callService) return;
    const entity = entities[entityId];
    if (!entity) return;
    const isOn = entity.state === 'on';
    if (['light', 'switch', 'fan', 'cover'].includes(domain)) {
      callService(domain, isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
    }
  };

  const handleToggleAllLights = () => {
    if (!conn || !callService) return;
    const service = lightsOn > 0 ? 'turn_off' : 'turn_on';
    lightEntities.forEach(({ id }) => {
      callService('light', service, { entity_id: id });
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-xl max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-light mb-2 text-[var(--text-primary)] text-center uppercase tracking-widest italic">
          {areaName}
        </h3>

        {/* Quick stats */}
        {lightEntities.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleToggleAllLights}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${lightsOn > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {lightsOn > 0
                  ? `${lightsOn} ${t('room.lightsOn')} — ${t('room.turnOffAll')}`
                  : t('room.turnOnAll')}
              </span>
            </button>
          </div>
        )}

        {/* Domain filter pills */}
        {domains.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border ${filter === 'all' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent'}`}
            >
              {t('room.filterAll')}
            </button>
            {domains.map(d => {
              const info = domainLabels[d] || { label: d, color: 'text-[var(--text-secondary)]' };
              return (
                <button
                  key={d}
                  onClick={() => setFilter(d)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border ${filter === d ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent'}`}
                >
                  {info.label} ({grouped[d].length})
                </button>
              );
            })}
          </div>
        )}

        {/* Entity list */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {filteredDomains.map(domain => {
            const info = domainLabels[domain] || { label: domain, icon: Power, color: 'text-[var(--text-secondary)]' };
            const DomainIcon = info.icon || Power;
            const items = grouped[domain];

            return (
              <div key={domain}>
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <DomainIcon className={`w-4 h-4 ${info.color}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {info.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(({ id, entity }) => {
                    const name = entity.attributes?.friendly_name || id;
                    const state = entity.state;
                    const unit = entity.attributes?.unit_of_measurement || '';
                    const inferredUnitKind = inferUnitKind(entity.attributes?.device_class, unit);
                    const isToggleable = ['light', 'switch', 'fan', 'cover'].includes(domain);
                    const isOn = state === 'on';
                    const isNumeric = /^\s*-?\d+(\.\d+)?\s*$/.test(state);
                    const convertedNumericValue = isNumeric && inferredUnitKind
                      ? convertValueByKind(parseFloat(state), {
                        kind: inferredUnitKind,
                        fromUnit: unit,
                        unitMode: effectiveUnitMode,
                      })
                      : (isNumeric ? parseFloat(state) : null);
                    const displayUnit = isNumeric && inferredUnitKind
                      ? getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode)
                      : unit;

                    return (
                      <div
                        key={id}
                        className="popup-surface rounded-2xl p-3 flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{id}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold uppercase tracking-widest ${isOn ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                            {isNumeric ? `${formatUnitValue(convertedNumericValue, { fallback: '--' })}${displayUnit}` : state}
                          </span>
                          {isToggleable && (
                            <button
                              onClick={() => handleToggleEntity(id, domain)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${isOn ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isOn ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {roomEntityIds.length === 0 && (
            <div className="text-center py-10 text-[var(--text-muted)]">
              <p className="text-sm">{t('room.noEntities')}</p>
              <p className="text-xs mt-1">{t('room.editToAdd')}</p>
            </div>
          )}
        </div>

        <div className="pt-5 mt-4 border-t border-[var(--glass-border)]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
