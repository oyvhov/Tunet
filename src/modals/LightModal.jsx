import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Lightbulb,
  Utensils,
  Sofa,
  LampDesk,
  Palette,
  Thermometer,
  Sun,
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import { getIconComponent } from '../icons';

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
  t,
}) {
  const activeLightId = String(lightId || '');

  const entity = entities[activeLightId];
  const isUnavailable = entity?.state === 'unavailable' || entity?.state === 'unknown' || !entity;
  const isOn = entity?.state === 'on';

  // --- Feature Detection ---
  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : (entity?.attributes?.supported_features & 1) === 1;

  const colorModes = entity?.attributes?.supported_color_modes || [];
  const supportsColorTemp =
    colorModes.includes('color_temp') || colorModes.includes('color_temp_kelvin');
  const supportsColor = colorModes.some((mode) => ['hs', 'rgb', 'xy'].includes(mode));
  const showPills = isDimmable && (supportsColorTemp || supportsColor);
  const groupedEntityIds = activeLightId ? getA(activeLightId, 'entity_id', []) : [];
  const showRightPanel = isDimmable || groupedEntityIds.length > 0;

  // --- Icon ---
  let DefaultIcon = Lightbulb;
  if (activeLightId.includes('kjokken') || activeLightId.includes('kitchen'))
    DefaultIcon = Utensils;
  else if (activeLightId.includes('stova') || activeLightId.includes('living')) DefaultIcon = Sofa;
  else if (activeLightId.includes('studio') || activeLightId.includes('office'))
    DefaultIcon = LampDesk;
  const lightIconName = customIcons[activeLightId] || entities[activeLightId]?.attributes?.icon;
  const LightIcon = lightIconName ? getIconComponent(lightIconName) || DefaultIcon : DefaultIcon;

  // --- Values & Ranges ---
  const minKelvin =
    entity?.attributes?.min_color_temp_kelvin ||
    (entity?.attributes?.max_mireds ? Math.round(1000000 / entity.attributes.max_mireds) : 2000);
  const maxKelvin =
    entity?.attributes?.max_color_temp_kelvin ||
    (entity?.attributes?.min_mireds ? Math.round(1000000 / entity.attributes.min_mireds) : 6500);

  // Current values from Entity
  const remoteKelvin =
    entity?.attributes?.color_temp_kelvin ||
    (entity?.attributes?.color_temp
      ? Math.round(1000000 / entity.attributes.color_temp)
      : Math.round((minKelvin + maxKelvin) / 2));
  const remoteHue = entity?.attributes?.hs_color?.[0] ?? 0;

  // --- Local State for Optimistic UI ---
  const [activeTab, setActiveTab] = useState('brightness');
  const [localKelvin, setLocalKelvin] = useState(remoteKelvin);
  const [localHue, setLocalHue] = useState(remoteHue);
  const isDraggingRef = useRef(false);

  // Reset tab on open
  useEffect(() => {
    if (show) setActiveTab('brightness');
  }, [show]);

  // Sync remote -> local when NOT dragging
  useEffect(() => {
    if (!isDraggingRef.current && remoteKelvin) {
      setLocalKelvin(remoteKelvin);
    }
  }, [remoteKelvin]);

  useEffect(() => {
    if (!isDraggingRef.current && remoteHue !== undefined) {
      setLocalHue(remoteHue);
    }
  }, [remoteHue]);

  // --- Handlers ---
  const handleTempChange = (e) => {
    if (!activeLightId) return;
    const val = parseInt(e.target.value, 10);
    setLocalKelvin(val);
    callService('light', 'turn_on', { entity_id: activeLightId, color_temp_kelvin: val });
  };

  const handleHueChange = (e) => {
    if (!activeLightId) return;
    const val = parseInt(e.target.value, 10);
    setLocalHue(val);
    callService('light', 'turn_on', { entity_id: activeLightId, hs_color: [val, 100] });
  };

  // Determine glow color
  const getGlowColor = () => {
    if (!isOn) return 'transparent';
    if (activeTab === 'color' && supportsColor) {
      return `hsl(${localHue}, 100%, 50%)`;
    }
    if (activeTab === 'warmth' && supportsColorTemp) {
      if (localKelvin < 3000) return '#f59e0b'; // Warm/Orange
      if (localKelvin > 5000) return '#93c5fd'; // Cool/Blue
      return '#fbbf24'; // Neutral
    }
    return '#fbbf24'; // Default amber
  };

  if (!show || !activeLightId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className={`w-full border ${showRightPanel ? 'max-w-5xl' : 'max-w-xl'} flex flex-col overflow-hidden rounded-3xl md:rounded-[3rem] ${showRightPanel ? 'lg:grid lg:grid-cols-5' : ''} popup-anim relative max-h-[90vh] shadow-2xl backdrop-blur-xl md:min-h-[550px]`}
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Row (Mobile & Desktop) */}
        <div className="absolute top-6 right-6 z-50 md:top-10 md:right-10">
          <button onClick={onClose} className="modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visuals & Ambient (3 cols) */}
        <div
          className={`${showRightPanel ? 'border-b lg:col-span-3 lg:border-r lg:border-b-0' : 'h-full w-full flex-1'} relative flex shrink-0 flex-col justify-between overflow-hidden p-4 md:p-10`}
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {/* Dynamic Ambient Glow - Subtler */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[100px] transition-all duration-1000"
            style={{ backgroundColor: getGlowColor() }}
          />

          {/* Header */}
          <div className="relative z-10 mb-6 flex shrink-0 items-center gap-4">
            <div
              className={`rounded-2xl p-4 transition-all duration-500 ${isUnavailable ? 'bg-red-500/10 text-red-400' : isOn ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
            >
              <LightIcon className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
                {getA(activeLightId, 'friendly_name', t('common.light'))}
              </h2>
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isUnavailable ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${isUnavailable ? 'bg-red-400' : isOn ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`}
                />
                <span className="text-[10px] font-bold tracking-widest uppercase italic">
                  {isUnavailable
                    ? t('status.unavailable')
                    : isOn
                      ? t('common.on')
                      : t('common.off')}
                </span>
                {isOn && (
                  <span className="border-l border-[var(--glass-border)] pl-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase italic">
                    {Math.round(
                      ((optimisticLightBrightness[activeLightId] ??
                        (getA(activeLightId, 'brightness') || 0)) /
                        255) *
                        100
                    )}
                    %
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Centerpiece Icon - Toggle Button */}
          <div className="relative z-10 my-4 flex min-h-[100px] flex-1 items-center justify-center md:my-0 md:min-h-0">
            <button
              onClick={() =>
                !isUnavailable && callService('light', 'toggle', { entity_id: activeLightId })
              }
              disabled={isUnavailable}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-700 md:h-36 md:w-36 ${
                isUnavailable
                  ? 'cursor-not-allowed bg-red-500/5 text-red-500'
                  : isOn
                    ? 'cursor-pointer bg-[var(--glass-bg)] text-[var(--text-primary)] shadow-2xl active:scale-95'
                    : 'cursor-pointer bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] active:scale-95'
              } border border-[var(--glass-border)]`}
              style={{
                // Dimmed glow behind icon (lower opacity on hex color or lower radius)
                boxShadow: isOn ? `0 0 60px -10px ${getGlowColor()}15` : 'none',
              }}
            >
              {isUnavailable ? (
                <AlertTriangle className="h-8 w-8 md:h-10 md:w-10" />
              ) : (
                <LightIcon className="h-10 w-10 stroke-[1.5px] md:h-16 md:w-16" />
              )}

              {/* Subtle inner ring */}
              {isOn && (
                <div className="absolute inset-0 rounded-full border border-white/10 opacity-30" />
              )}
            </button>
          </div>

          {/* Tabs / Mode Switcher - Sleek Segmented Control */}
          <div className="relative z-10 mx-auto w-full max-w-sm shrink-0">
            {showPills && (
              <div className="flex w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1">
                <button
                  onClick={() => setActiveTab('brightness')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'brightness' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>{t('light.brightness')}</span>
                </button>
                {supportsColorTemp && (
                  <button
                    onClick={() => setActiveTab('warmth')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'warmth' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Thermometer className="h-3.5 w-3.5" />
                    <span>{t('light.warmth')}</span>
                  </button>
                )}
                {supportsColor && (
                  <button
                    onClick={() => setActiveTab('color')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'color' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>{t('light.color')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Controls (2 cols) */}
        {showRightPanel && (
          <div className="flex h-full flex-col lg:col-span-2">
            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 md:space-y-8 md:p-8 lg:pt-16">
              {/* Dynamic Control Area - Simplified */}
              {isDimmable && (
                <div className="flex min-h-[100px] flex-col justify-center md:min-h-[140px]">
                  {/* Brightness Slider */}
                  {activeTab === 'brightness' && (
                    <div className="space-y-2 md:space-y-4">
                      <div className="flex items-end justify-between px-1">
                        <label className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                          {t('light.brightness')}
                        </label>
                        <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                          {Math.round(
                            ((optimisticLightBrightness[activeLightId] ??
                              (getA(activeLightId, 'brightness') || 0)) /
                              255) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-10">
                        <M3Slider
                          min={0}
                          max={255}
                          step={1}
                          value={
                            optimisticLightBrightness[activeLightId] ??
                            (getA(activeLightId, 'brightness') || 0)
                          }
                          disabled={isUnavailable}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setOptimisticLightBrightness((prev) => ({
                              ...prev,
                              [activeLightId]: val,
                            }));
                            callService('light', 'turn_on', {
                              entity_id: activeLightId,
                              brightness: val,
                            });
                          }}
                          colorClass="bg-amber-500"
                          variant="fat" // Keep fat for touch, but in smaller container
                        />
                      </div>
                    </div>
                  )}

                  {/* Warmth Slider - Re-styled */}
                  {activeTab === 'warmth' && (
                    <div className="space-y-2 md:space-y-4">
                      <div className="flex items-end justify-between px-1">
                        <label className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                          {t('light.colorTemperature')}
                        </label>
                        <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                          {localKelvin}K
                        </span>
                      </div>
                      <div className="relative h-10 w-full touch-none overflow-hidden rounded-xl shadow-inner">
                        <input
                          type="range"
                          min={minKelvin}
                          max={maxKelvin}
                          step={50}
                          value={localKelvin}
                          disabled={isUnavailable}
                          onPointerDown={() => (isDraggingRef.current = true)}
                          onPointerUp={() => (isDraggingRef.current = false)}
                          onChange={handleTempChange}
                          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                        />
                        {/* Gradient Background */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(90deg, #ffb14e 0%, #fffbe6 50%, #9cb8ff 100%)',
                          }}
                        />
                        {/* Thumb Indicator */}
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 w-1.5 border-x border-[var(--glass-border)] bg-black/40 backdrop-blur-sm transition-transform duration-75"
                          style={{
                            left: `${((localKelvin - minKelvin) / (maxKelvin - minKelvin)) * 100}%`,
                            transform: 'translateX(-50%)', // Fixed transform
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Color Slider - Re-styled */}
                  {activeTab === 'color' && (
                    <div className="space-y-2 md:space-y-4">
                      <div className="flex items-end justify-between px-1">
                        <label className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                          {t('light.hue')}
                        </label>
                        {/* Color Preview Dot */}
                        <div
                          className="h-6 w-6 rounded-full border border-[var(--glass-border)] shadow-sm"
                          style={{ backgroundColor: `hsl(${localHue}, 100%, 50%)` }}
                        />
                      </div>
                      <div className="relative h-10 w-full touch-none overflow-hidden rounded-xl shadow-inner">
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={localHue}
                          disabled={isUnavailable}
                          onPointerDown={() => (isDraggingRef.current = true)}
                          onPointerUp={() => (isDraggingRef.current = false)}
                          onChange={handleHueChange}
                          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(90deg, #ef4444 0%, #f59e0b 16%, #facc15 32%, #22c55e 48%, #06b6d4 64%, #6366f1 80%, #d946ef 100%)',
                          }}
                        />
                        {/* Thumb Indicator */}
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 w-1.5 bg-white/80 shadow-sm backdrop-blur-sm transition-transform duration-75"
                          style={{
                            left: `${(localHue / 360) * 100}%`,
                            transform: 'translateX(-50%)', // Center the thin line
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub Entities - Cleaner list */}
              {groupedEntityIds.length > 0 && (
                <div className="border-t border-[var(--glass-border)] pt-4 md:pt-6">
                  <h3 className="mb-2 pl-1 text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase md:mb-4">
                    {t('light.roomLights')}
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    {groupedEntityIds.map((cid) => {
                      const subEnt = entities[cid];
                      const subName =
                        subEnt?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ');
                      const subIsOn = subEnt?.state === 'on';
                      const subUnavail = subEnt?.state === 'unavailable';
                      const subBrightness =
                        optimisticLightBrightness[cid] ?? (subEnt?.attributes?.brightness || 0);

                      return (
                        <div key={cid} className="flex items-end gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-end justify-between px-1">
                              <span className="truncate text-xs font-bold text-[var(--text-secondary)] opacity-90">
                                {subName}
                              </span>
                            </div>
                            <div className="relative h-8 w-full overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                              {/* Mini Progress Bar for Brightness */}
                              <div
                                className={`absolute top-0 left-0 h-full transition-all duration-300 ${subIsOn ? 'bg-amber-500 opacity-80' : 'bg-black/20 opacity-30'}`}
                                style={{ width: `${(subBrightness / 255) * 100}%` }}
                              />
                              {/* Invisible Slider overlay */}
                              <input
                                type="range"
                                min="0"
                                max="255"
                                step="1"
                                value={subBrightness}
                                disabled={subUnavail}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setOptimisticLightBrightness((prev) => ({ ...prev, [cid]: val }));
                                  callService('light', 'turn_on', {
                                    entity_id: cid,
                                    brightness: val,
                                  });
                                }}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                              />
                            </div>
                          </div>

                          {/* Toggle Button - Aligned to bottom (items-end on parent) */}
                          <button
                            onClick={() => callService('light', 'toggle', { entity_id: cid })}
                            className={`flex h-8 w-12 items-center justify-center rounded-xl border transition-all ${subIsOn ? 'border-amber-500/30 bg-amber-500/20 text-amber-400' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full transition-all ${subIsOn ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-[var(--text-secondary)] opacity-50'}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer (Right Column) - Removed redundant toggle */}
          </div>
        )}
      </div>
    </div>
  );
}
