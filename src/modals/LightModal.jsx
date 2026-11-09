import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Lightbulb,
  Utensils,
  Sofa,
  LampDesk,
  Palette,
  Thermometer,
  Sun,
  Power,
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Segmented from '../components/ui/Segmented';
import { getIconComponent } from '../icons';
import { HUE_GRADIENT, getLightColor, hsToCss, kelvinToRgb } from '../utils/lightColor';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';

const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

/** One light's brightness in a group: its own debounce, so moving the next light loses nothing. */
function RoomLightBrightnessSlider({
  entityId,
  brightness,
  label,
  disabled,
  callService,
  setOptimisticLightBrightness,
}) {
  const commitBrightness = useDebouncedCommit((value) =>
    callService('light', 'turn_on', { entity_id: entityId, brightness: value })
  );

  return (
    <input
      type="range"
      min="0"
      max="255"
      step="1"
      value={brightness}
      aria-label={label}
      disabled={disabled}
      onChange={(e) => {
        const val = parseInt(e.target.value);
        setOptimisticLightBrightness((prev) => ({ ...prev, [entityId]: val }));
        commitBrightness(val);
      }}
      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
    />
  );
}

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
  const supportsColor = colorModes.some((mode) => COLOR_MODES.includes(mode));
  const showPills = isDimmable && (supportsColorTemp || supportsColor);
  const groupedEntityIds = activeLightId ? getA(activeLightId, 'entity_id', []) : [];
  const showRightPanel = isDimmable || groupedEntityIds.length > 0;
  const modalTitleId = `light-modal-title-${activeLightId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

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
  const remoteSaturation = entity?.attributes?.hs_color?.[1] ?? 100;
  // A white light (saturation 0) would ignore the hue slider, so it starts from full colour.
  const hueSaturation = remoteSaturation > 0 ? remoteSaturation : 100;

  // --- Local State for Optimistic UI ---
  const [activeTab, setActiveTab] = useState('brightness');
  const [localKelvin, setLocalKelvin] = useState(remoteKelvin);
  const [localHue, setLocalHue] = useState(remoteHue);
  const isDraggingRef = useRef(false);
  const [localSaturation, setLocalSaturation] = useState(remoteSaturation);

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

  useEffect(() => {
    setLocalSaturation(remoteSaturation);
  }, [remoteSaturation]);

  // --- Handlers ---
  const commitBrightness = useDebouncedCommit(({ entityId, brightness }) =>
    callService('light', 'turn_on', { entity_id: entityId, brightness })
  );
  const commitKelvin = useDebouncedCommit((kelvin) =>
    callService('light', 'turn_on', { entity_id: activeLightId, color_temp_kelvin: kelvin })
  );
  const commitHue = useDebouncedCommit((hue) =>
    callService('light', 'turn_on', { entity_id: activeLightId, hs_color: [hue, hueSaturation] })
  );

  const handleTempChange = (e) => {
    if (!activeLightId) return;
    const val = parseInt(e.target.value, 10);
    setLocalKelvin(val);
    commitKelvin(val);
  };

  const handleHueChange = (e) => {
    if (!activeLightId) return;
    const val = parseInt(e.target.value, 10);
    setLocalHue(val);
    setLocalSaturation(hueSaturation);
    commitHue(val);
  };

  const kelvinGradient = `linear-gradient(90deg, ${[0, 25, 50, 75, 100]
    .map((p) => `${kelvinToRgb(minKelvin + ((maxKelvin - minKelvin) * p) / 100)} ${p}%`)
    .join(', ')})`;

  const iconColor = getLightColor(entity);
  const getGlowColor = () => (isOn ? iconColor || '#fbbf24' : 'transparent');

  if (!show || !activeLightId) return null;

  const brightnessPercent = Math.round(
    ((optimisticLightBrightness[activeLightId] ?? (getA(activeLightId, 'brightness') || 0)) / 255) *
      100
  );
  const tabOptions = [
    { value: 'brightness', label: t('light.brightness'), icon: <Sun /> },
    ...(supportsColorTemp
      ? [{ value: 'warmth', label: t('light.warmth'), icon: <Thermometer /> }]
      : []),
    ...(supportsColor ? [{ value: 'color', label: t('light.color'), icon: <Palette /> }] : []),
  ];

  return (
    <AccessibleModalShell
      open={show && !!activeLightId}
      onClose={onClose}
      titleId={modalTitleId}
      size={showRightPanel ? 'l' : 'm'}
    >
      {() => (
        <>
          <ModalHeader
            title={getA(activeLightId, 'friendly_name', t('common.light'))}
            closeLabel={t('common.close')}
            onClose={onClose}
            iconTestId="light-modal-icon"
            icon={<LightIcon />}
            iconStyle={
              iconColor
                ? {
                    backgroundColor: `color-mix(in srgb, ${iconColor} 12%, var(--glass-bg))`,
                    color: `color-mix(in srgb, ${iconColor} 50%, var(--text-primary))`,
                  }
                : undefined
            }
            iconClassName={
              isUnavailable
                ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
                : iconColor
                  ? ''
                  : isOn
                    ? 'bg-amber-500/15 text-amber-400'
                    : ''
            }
            status={
              <StatusChip
                tone={isUnavailable ? 'error' : isOn ? 'on' : 'neutral'}
                label={
                  isUnavailable ? t('status.unavailable') : isOn ? t('common.on') : t('common.off')
                }
                detail={isOn && isDimmable ? `${brightnessPercent}%` : null}
              />
            }
          />

          <ModalBody className={showRightPanel ? 'grid gap-6 lg:grid-cols-5' : ''}>
            {/* Visual: power button and mode switcher */}
            <div
              className={`popup-surface relative flex min-h-[240px] flex-col items-center justify-between gap-6 overflow-hidden rounded-[var(--modal-surface-radius)] p-6 ${showRightPanel ? 'lg:col-span-3 lg:min-h-[360px]' : ''}`}
            >
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[100px] transition-all duration-1000"
                style={{ backgroundColor: getGlowColor() }}
              />

              <div className="relative z-10 flex flex-1 items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    !isUnavailable && callService('light', 'toggle', { entity_id: activeLightId })
                  }
                  aria-label={t('light.toggle') || t('common.toggle')}
                  disabled={isUnavailable}
                  className={`relative flex h-24 w-24 items-center justify-center rounded-full border border-[var(--glass-border)] transition-all duration-500 md:h-32 md:w-32 ${
                    isUnavailable
                      ? 'cursor-not-allowed bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
                      : isOn
                        ? 'cursor-pointer bg-[var(--glass-bg-hover)] text-[var(--text-primary)] active:scale-95'
                        : 'cursor-pointer bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] active:scale-95'
                  }`}
                >
                  {isUnavailable ? (
                    <AlertTriangle className="h-8 w-8 md:h-10 md:w-10" />
                  ) : (
                    <Power className="h-10 w-10 stroke-[1.5px] md:h-14 md:w-14" />
                  )}
                </button>
              </div>

              {showPills && (
                <Segmented
                  className="relative z-10"
                  ariaLabel={t('light.brightness')}
                  value={activeTab}
                  onChange={setActiveTab}
                  options={tabOptions}
                />
              )}
            </div>

            {showRightPanel && (
              <div className="flex flex-col gap-6 lg:col-span-2">
                {isDimmable && (
                  <div className="flex flex-col justify-center">
                    {/* Brightness Slider */}
                    {activeTab === 'brightness' && (
                      <div className="space-y-2 md:space-y-4">
                        <div className="flex items-end justify-between px-1">
                          <label className="modal-section-label">{t('light.brightness')}</label>
                          <span className="text-lg font-medium text-[var(--text-primary)] tabular-nums">
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
                              commitBrightness({ entityId: activeLightId, brightness: val });
                            }}
                            ariaLabel={t('light.brightness')}
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
                          <label className="modal-section-label">
                            {t('light.colorTemperature')}
                          </label>
                          <span className="text-lg font-medium text-[var(--text-primary)] tabular-nums">
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
                            aria-label={t('light.colorTemperature')}
                            aria-valuetext={`${localKelvin}K`}
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
                              background: kelvinGradient,
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
                          <label className="modal-section-label">{t('light.hue')}</label>
                          {/* Color Preview Dot */}
                          <div
                            className="h-6 w-6 rounded-full border border-[var(--glass-border)] shadow-sm"
                            style={{ backgroundColor: hsToCss(localHue, localSaturation) }}
                          />
                        </div>
                        <div className="relative h-10 w-full touch-none overflow-hidden rounded-xl shadow-inner">
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={localHue}
                            aria-label={t('light.hue')}
                            aria-valuetext={`${localHue} degrees`}
                            disabled={isUnavailable}
                            onPointerDown={() => (isDraggingRef.current = true)}
                            onPointerUp={() => (isDraggingRef.current = false)}
                            onChange={handleHueChange}
                            className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: HUE_GRADIENT,
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
                  <div className={isDimmable ? 'border-t border-[var(--glass-border)] pt-6' : ''}>
                    <h3 className="modal-section-label mb-3">{t('light.roomLights')}</h3>
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
                                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                  {subName}
                                </span>
                              </div>
                              <div className="relative h-8 w-full overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                                {/* Mini Progress Bar for Brightness */}
                                <div
                                  className={`absolute top-0 left-0 h-full transition-all duration-300 ${subIsOn ? 'bg-amber-500 opacity-80' : 'bg-black/20 opacity-30'}`}
                                  style={{ width: `${(subBrightness / 255) * 100}%` }}
                                />
                                {!subIsOn && (
                                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                                    {subUnavail ? t('status.unavailable') : t('common.off')}
                                  </span>
                                )}
                                {/* Invisible Slider overlay */}
                                <RoomLightBrightnessSlider
                                  entityId={cid}
                                  brightness={subBrightness}
                                  label={`${subName} ${t('light.brightness')}`}
                                  disabled={subUnavail}
                                  callService={callService}
                                  setOptimisticLightBrightness={setOptimisticLightBrightness}
                                />
                              </div>
                            </div>

                            {/* Toggle Button - Aligned to bottom (items-end on parent) */}
                            <button
                              type="button"
                              onClick={() => callService('light', 'toggle', { entity_id: cid })}
                              aria-label={`${subName} ${t('common.toggle')}`}
                              role="switch"
                              aria-checked={subIsOn}
                              disabled={subUnavail}
                              className={`relative h-8 w-12 rounded-full border transition-all ${subUnavail ? 'cursor-not-allowed border-[var(--glass-border)] bg-[var(--glass-bg)] opacity-40' : subIsOn ? 'border-amber-500/30 bg-amber-500/25' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]'}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`absolute top-1 left-1 h-5 w-5 rounded-full border transition-all duration-200 ${subIsOn ? 'translate-x-5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'translate-x-0 border-[var(--glass-border)] bg-[var(--text-secondary)] opacity-70'}`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
