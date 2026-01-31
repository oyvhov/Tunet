import { X, AlertTriangle, Lightbulb, Zap, Utensils, Sofa, LampDesk } from '../icons';
import M3Slider from '../components/M3Slider';
import { getIconComponent } from '../iconMap';

/**
 * LightModal - Modal for controlling lights with brightness, warmth, and color
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {string} props.lightId - Light entity ID
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getA - Function to get entity attribute
 * @param {Object} props.optimisticLightBrightness - Optimistic brightness state
 * @param {Function} props.setOptimisticLightBrightness - Set optimistic brightness
 * @param {Object} props.customIcons - Custom icon map
 * @param {Function} props.t - Translation function
 */
export default function LightModal({
  show,
  onClose,
  lightId,
  entities,
  callService,
  getA,
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  customIcons,
  t
}) {
  if (!show || !lightId) return null;

  const entity = entities[lightId];
  const isUnavailable = entity?.state === 'unavailable' || entity?.state === 'unknown' || !entity;
  const colorModes = entity?.attributes?.supported_color_modes || [];
  const supportsColorTemp = colorModes.includes('color_temp') || colorModes.includes('color_temp_kelvin');
  const supportsColor = colorModes.some((mode) => ['hs', 'rgb', 'xy'].includes(mode));
  const showPills = supportsColorTemp || supportsColor;
  
  // Determine default icon based on light ID
  let DefaultIcon = Lightbulb;
  if (lightId.includes('kjokken') || lightId.includes('kitchen')) DefaultIcon = Utensils;
  else if (lightId.includes('stova') || lightId.includes('living')) DefaultIcon = Sofa;
  else if (lightId.includes('studio') || lightId.includes('office')) DefaultIcon = LampDesk;
  
  const lightIconName = customIcons[lightId] || entities[lightId]?.attributes?.icon;
  const LightIcon = lightIconName ? (getIconComponent(lightIconName) || DefaultIcon) : DefaultIcon;

  // State for active tab
  const [lightControlTab, setLightControlTab] = React.useState('brightness');
  
  React.useEffect(() => {
    if (show) setLightControlTab('brightness');
  }, [show]);

  const activeTab = (lightControlTab === 'warmth' && !supportsColorTemp)
    ? 'brightness'
    : (lightControlTab === 'color' && !supportsColor)
      ? 'brightness'
      : lightControlTab;

  const minKelvin = entity?.attributes?.min_color_temp_kelvin
    || (entity?.attributes?.max_mireds ? Math.round(1000000 / entity.attributes.max_mireds) : 2000);
  const maxKelvin = entity?.attributes?.max_color_temp_kelvin
    || (entity?.attributes?.min_mireds ? Math.round(1000000 / entity.attributes.min_mireds) : 6500);
  const currentKelvin = entity?.attributes?.color_temp_kelvin
    || (entity?.attributes?.color_temp ? Math.round(1000000 / entity.attributes.color_temp) : Math.round((minKelvin + maxKelvin) / 2));
  const currentHue = entity?.attributes?.hs_color?.[0] ?? 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-xl rounded-3xl md:rounded-[2.5rem] p-6 font-sans relative max-h-[80vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .light-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 10px;
            border-radius: 999px;
            outline: none;
            touch-action: none;
          }
          .light-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2px solid rgba(255,255,255,0.6);
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            cursor: pointer;
          }
          .light-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2px solid rgba(255,255,255,0.6);
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            cursor: pointer;
          }
        `}</style>
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <div 
              className="p-4 rounded-2xl" 
              style={{
                backgroundColor: isUnavailable 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'rgba(217, 119, 6, 0.15)', 
                color: isUnavailable ? '#ef4444' : '#fbbf24'
              }}
            >
              {isUnavailable ? <AlertTriangle className="w-8 h-8" /> : <LightIcon className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
                {String(getA(lightId, "friendly_name", t('common.light')))}
              </h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1.5 opacity-60">
                {isUnavailable ? t('status.unavailable') : t('status.lighting')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => !isUnavailable && callService("light", "toggle", { entity_id: lightId })} 
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all border" 
              style={{
                backgroundColor: isUnavailable 
                  ? 'var(--glass-bg)' 
                  : (entity?.state === 'on' ? 'rgba(217, 119, 6, 0.2)' : 'var(--glass-bg)'), 
                borderColor: isUnavailable 
                  ? 'var(--glass-border)' 
                  : (entity?.state === 'on' ? 'rgba(217, 119, 6, 0.3)' : 'var(--glass-border)'), 
                color: isUnavailable 
                  ? '#6b7280' 
                  : (entity?.state === 'on' ? '#fbbf24' : '#9ca3af'), 
                cursor: isUnavailable ? 'not-allowed' : 'pointer'
              }}
            >
              {isUnavailable ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Zap className="w-5 h-5" fill={entity?.state === 'on' ? "currentColor" : "none"} />
              )}
            </button>
            <button onClick={onClose} className="modal-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {showPills && (
            <div className="flex items-center gap-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1 rounded-full">
              <button
                onClick={() => setLightControlTab('brightness')}
                className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'brightness' 
                    ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' 
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Lysstyrke
              </button>
              {supportsColorTemp && (
                <button
                  onClick={() => setLightControlTab('warmth')}
                  className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === 'warmth' 
                      ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' 
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Varme
                </button>
              )}
              {supportsColor && (
                <button
                  onClick={() => setLightControlTab('color')}
                  className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === 'color' 
                      ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' 
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Farge
                </button>
              )}
            </div>
          )}

          {(!showPills || activeTab === 'brightness') && (
            <div className="space-y-3 min-h-[96px]">
              <div className="flex justify-between items-end px-1">
                <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>
                  Hovudstyrke
                </p>
                <p className="text-sm font-bold text-gray-300">
                  {isUnavailable 
                    ? '--' 
                    : (entity?.state === 'on' 
                      ? Math.round((((optimisticLightBrightness[lightId] ?? (getA(lightId, "brightness") || 0)) / 255) * 100)) 
                      : 0)}%
                </p>
              </div>
              <M3Slider 
                min={0} 
                max={255} 
                step={1} 
                value={optimisticLightBrightness[lightId] ?? (getA(lightId, "brightness") || 0)} 
                disabled={entity?.state !== 'on' || isUnavailable} 
                onChange={(e) => { 
                  const val = parseInt(e.target.value); 
                  setOptimisticLightBrightness(prev => ({ ...prev, [lightId]: val })); 
                  callService("light", "turn_on", { entity_id: lightId, brightness: val }); 
                }} 
                colorClass="bg-amber-500" 
              />
            </div>
          )}

          {showPills && activeTab === 'warmth' && supportsColorTemp && (
            <div className="space-y-3 min-h-[96px]">
              <div className="flex justify-between items-end px-1">
                <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>
                  Varme
                </p>
                <p className="text-sm font-bold text-gray-300">
                  {isUnavailable ? '--' : `${currentKelvin}K`}
                </p>
              </div>
              <input
                type="range"
                min={minKelvin}
                max={maxKelvin}
                step={50}
                value={currentKelvin}
                disabled={entity?.state !== 'on' || isUnavailable}
                onChange={(e) => callService(
                  "light", 
                  "turn_on", 
                  { entity_id: lightId, color_temp_kelvin: parseInt(e.target.value, 10) }
                )}
                className="light-slider"
                style={{
                  background: 'linear-gradient(90deg, #f59e0b 0%, #fde68a 50%, #93c5fd 100%)'
                }}
              />
            </div>
          )}

          {showPills && activeTab === 'color' && supportsColor && (
            <div className="space-y-3 min-h-[96px]">
              <div className="flex justify-between items-end px-1">
                <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>
                  Farge
                </p>
                <p className="text-sm font-bold text-gray-300">
                  {isUnavailable ? '--' : `${Math.round(currentHue)}°`}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={currentHue}
                disabled={entity?.state !== 'on' || isUnavailable}
                onChange={(e) => callService(
                  "light", 
                  "turn_on", 
                  { entity_id: lightId, hs_color: [parseInt(e.target.value, 10), 100] }
                )}
                className="light-slider"
                style={{
                  background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 16%, #facc15 32%, #22c55e 48%, #06b6d4 64%, #6366f1 80%, #d946ef 100%)'
                }}
              />
            </div>
          )}

          {getA(lightId, "entity_id", []).length > 0 && (
            <div 
              className="space-y-4 pt-6 border-t" 
              style={{borderColor: 'var(--glass-border)'}}
            >
              <p 
                className="text-xs text-gray-400 uppercase font-bold ml-1 mb-2" 
                style={{letterSpacing: '0.2em'}}
              >
                {t('light.roomLights')}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {getA(lightId, "entity_id", []).map(cid => {
                  const subEnt = entities[cid];
                  const subUnavail = subEnt?.state === 'unavailable' || 
                                     subEnt?.state === 'unknown' || !subEnt;
                  return (
                    <div 
                      key={cid} 
                      className={`px-3 py-2 rounded-xl bg-[var(--glass-bg)]/20 flex items-center gap-3 transition-all ${
                        subUnavail ? 'opacity-50' : 'hover:bg-[var(--glass-bg)]/35'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-300 w-1/3 truncate">
                        {subEnt?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ')}
                      </span>
                      <div className="flex-grow">
                        <M3Slider 
                          min={0} 
                          max={255} 
                          step={1} 
                          value={(optimisticLightBrightness[cid] ?? (subEnt?.attributes?.brightness || 0))} 
                          disabled={subEnt?.state !== 'on' || subUnavail} 
                          onChange={(e) => { 
                            const val = parseInt(e.target.value); 
                            setOptimisticLightBrightness(prev => ({ ...prev, [cid]: val })); 
                            callService("light", "turn_on", { entity_id: cid, brightness: val }); 
                          }} 
                          colorClass="bg-amber-500" 
                        />
                      </div>
                      <button 
                        onClick={() => !subUnavail && callService("light", "toggle", { entity_id: cid })} 
                        className="w-10 h-6 rounded-full relative transition-all flex-shrink-0" 
                        style={{
                          backgroundColor: subUnavail 
                            ? 'var(--glass-bg)' 
                            : (subEnt?.state === 'on' ? 'rgba(217, 119, 6, 0.4)' : 'var(--glass-bg)'), 
                          cursor: subUnavail ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <div 
                          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" 
                          style={{
                            left: subEnt?.state === 'on' ? 'calc(100% - 4px - 16px)' : '4px', 
                            backgroundColor: subUnavail 
                              ? '#6b7280' 
                              : (subEnt?.state === 'on' ? '#fbbf24' : '#9ca3af')
                          }} 
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add React import at the top if not using new JSX transform
import React from 'react';
